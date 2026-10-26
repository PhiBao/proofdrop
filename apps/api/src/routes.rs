use std::str::FromStr;
use std::time::Duration;

use alloy::primitives::{Address, Signature, B256, U256};
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::routing::{get, post};
use axum::{Json, Router};
use chrono::Utc;
use serde::Deserialize;
use serde_json::{json, Value};
use tower_http::cors::{Any, CorsLayer};

use crate::chain;
use crate::error::ApiError;
use crate::merkle::{self, MerkleTree};
use crate::models::*;
use crate::state::AppState;
use crate::sync;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/config", get(config))
        .route("/stats", get(stats))
        .route("/draws", get(list_draws))
        .route("/draws/{id}", get(get_draw))
        .route("/draws/{id}/entries", get(list_entries).post(enter))
        .route("/draws/{id}/metadata", post(metadata))
        .route("/draws/{id}/merkle", get(merkle_view))
        .route("/draws/{id}/commit", post(commit))
        .route("/draws/{id}/draw", post(draw))
        .route("/draws/{id}/proof", get(proof))
        .route("/admin/sync", post(admin_sync))
        .route("/admin/import", post(admin_import))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state)
}

async fn health(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let block = chain::fetch_block_number(&state.cfg.rpc_url)
        .await
        .ok();
    Ok(Json(json!({
        "status": "ok",
        "chainId": state.cfg.chain_id,
        "contract": format!("{:#x}", state.cfg.contract),
        "blockNumber": block,
        "demoMode": state.cfg.demo_mode,
    })))
}

async fn config(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let live = chain::fetch_config(&state.cfg.rpc_url, state.cfg.contract)
        .await
        .ok();
    let (fee_bps, min_fee, processor, circuit_id, rounds) = match live {
        Some(c) => (
            c.fee_bps,
            c.min_fee.to_string(),
            format!("{:#x}", c.processor),
            c.circuit_id.to_string(),
            c.rounds,
        ),
        None => (
            100,
            "1000000000000000".to_string(),
            format!("{:#x}", state.cfg.processor),
            state.cfg.circuit_id.to_string(),
            4,
        ),
    };

    Ok(Json(json!({
        "chainId": state.cfg.chain_id,
        "contract": format!("{:#x}", state.cfg.contract).to_lowercase(),
        "processor": processor.to_lowercase(),
        "circuitId": circuit_id,
        "rounds": rounds,
        "explorer": state.cfg.explorer,
        "publicBaseUrl": state.cfg.public_base_url,
        "currency": "OKB",
        "feeBps": fee_bps,
        "minFee": min_fee,
        "demoMode": state.cfg.demo_mode,
        "orchestrator": state.signer_address().map(|a| format!("{:#x}", a).to_lowercase()),
    })))
}

#[derive(Deserialize)]
struct ListQuery {
    limit: Option<i64>,
    offset: Option<i64>,
    status: Option<String>,
}

async fn list_draws(
    State(state): State<AppState>,
    Query(q): Query<ListQuery>,
) -> Result<Json<Value>, ApiError> {
    let limit = q.limit.unwrap_or(50).clamp(1, 100);
    let offset = q.offset.unwrap_or(0).max(0);
    let rows = sqlx::query_as::<_, DrawRow>(
        "SELECT * FROM draws ORDER BY id DESC LIMIT ? OFFSET ?",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM draws")
        .fetch_one(&state.db)
        .await?;

    let mut draws: Vec<DrawView> = rows.into_iter().map(DrawView::from).collect();
    if let Some(status) = q.status {
        draws.retain(|d| d.status == status);
    }

    Ok(Json(json!({ "draws": draws, "total": total })))
}

async fn get_draw(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<Json<DrawDetail>, ApiError> {
    let _ = sync::sync_one(&state, id).await;
    let row = load_draw(&state, id).await?;
    let entries = sqlx::query_as::<_, EntryRow>(
        "SELECT * FROM entries WHERE draw_id = ? ORDER BY idx ASC LIMIT 500",
    )
    .bind(id as i64)
    .fetch_all(&state.db)
    .await?;

    let draw = DrawView::from(row);
    Ok(Json(DrawDetail {
        draw,
        explorer_url: format!("{}/address/{}", state.cfg.explorer, state.cfg.contract),
        contract_url: format!("{}/address/{}", state.cfg.explorer, state.cfg.contract),
        entries: entries
            .into_iter()
            .map(|e| EntryView {
                index: e.idx as u32,
                address: e.address,
                handle: e.handle,
            })
            .collect(),
    }))
}

#[derive(Deserialize)]
struct EntriesQuery {
    address: Option<String>,
}

async fn list_entries(
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Query(q): Query<EntriesQuery>,
) -> Result<Json<Value>, ApiError> {
    let rows = if let Some(address) = q.address {
        let normalized = format!("{:#x}", Address::from_str(&address)
            .map_err(|_| ApiError::BadRequest("invalid address".into()))?)
            .to_lowercase();
        sqlx::query_as::<_, EntryRow>(
            "SELECT * FROM entries WHERE draw_id = ? AND address = ? ORDER BY idx ASC LIMIT 1",
        )
        .bind(id as i64)
        .bind(normalized)
        .fetch_all(&state.db)
        .await?
    } else {
        sqlx::query_as::<_, EntryRow>(
            "SELECT * FROM entries WHERE draw_id = ? ORDER BY idx ASC LIMIT 10000",
        )
        .bind(id as i64)
        .fetch_all(&state.db)
        .await?
    };
    let entries: Vec<EntryView> = rows
        .into_iter()
        .map(|e| EntryView {
            index: e.idx as u32,
            address: e.address,
            handle: e.handle,
        })
        .collect();
    Ok(Json(json!({ "entries": entries, "count": entries.len() })))
}

fn entry_message(chain_id: u64, contract: Address, id: u64, entrant: Address) -> String {
    format!(
        "ProofDrop entry\nDraw: {id}\nChain: {chain_id}\nContract: {}\nEntrant: {}",
        format!("{:#x}", contract).to_lowercase(),
        format!("{:#x}", entrant).to_lowercase()
    )
}

fn metadata_message(
    chain_id: u64,
    contract: Address,
    id: u64,
    creator: Address,
    payload_hex: &str,
) -> String {
    format!(
        "ProofDrop metadata\nDraw: {id}\nChain: {chain_id}\nContract: {}\nCreator: {}\nPayload: {payload_hex}",
        format!("{:#x}", contract).to_lowercase(),
        format!("{:#x}", creator).to_lowercase()
    )
}

fn verify_signature(message: &str, signature: &str, expected: Address) -> Result<(), ApiError> {
    let sig = Signature::from_str(signature)
        .map_err(|_| ApiError::BadRequest("invalid signature encoding".into()))?;
    let recovered = sig
        .recover_address_from_msg(message)
        .map_err(|_| ApiError::BadRequest("signature could not be recovered".into()))?;
    if recovered != expected {
        return Err(ApiError::Unauthorized(
            "signature does not match the claimed address".into(),
        ));
    }
    Ok(())
}

fn normalize_address(raw: &str) -> Result<(Address, String), ApiError> {
    let address = Address::from_str(raw)
        .map_err(|_| ApiError::BadRequest("invalid address".into()))?;
    Ok((address, format!("{:#x}", address).to_lowercase()))
}

async fn enter(
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<EntryRequest>,
) -> Result<Json<Value>, ApiError> {
    let (address, address_lower) = normalize_address(&req.address)?;
    let expected = entry_message(state.cfg.chain_id, state.cfg.contract, id, address);
    if req.message.trim() != expected {
        return Err(ApiError::BadRequest(
            "signed message does not match this draw".into(),
        ));
    }
    verify_signature(&expected, &req.signature, address)?;

    let _ = sync::sync_one(&state, id).await;
    let draw = load_draw(&state, id).await?;
    let now = Utc::now().timestamp();
    if draw.refunded != 0 {
        return Err(ApiError::Conflict("draw was refunded".into()));
    }
    if draw.entries_root.is_some() {
        return Err(ApiError::Conflict("entries are already locked".into()));
    }
    if now >= draw.close_time {
        return Err(ApiError::Conflict("entries are closed".into()));
    }
    if draw.entry_count >= draw.max_entries {
        return Err(ApiError::Conflict("draw is full".into()));
    }

    if let Some(existing) = sqlx::query_as::<_, EntryRow>(
        "SELECT * FROM entries WHERE draw_id = ? AND address = ?",
    )
    .bind(id as i64)
    .bind(&address_lower)
    .fetch_optional(&state.db)
    .await?
    {
        return Ok(Json(json!({
            "entry": { "index": existing.idx, "address": existing.address, "handle": existing.handle },
            "duplicate": true,
            "message": expected,
        })));
    }

    let index: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(idx) + 1, 0) FROM entries WHERE draw_id = ?",
    )
    .bind(id as i64)
    .fetch_one(&state.db)
    .await?;
    if index >= draw.max_entries {
        return Err(ApiError::Conflict("draw is full".into()));
    }

    sqlx::query(
        "INSERT INTO entries (draw_id, idx, address, handle, signature, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(id as i64)
    .bind(index)
    .bind(&address_lower)
    .bind(req.handle.as_deref())
    .bind(&req.signature)
    .bind(now)
    .execute(&state.db)
    .await?;

    let _ = sync::sync_one(&state, id).await;

    Ok(Json(json!({
        "entry": { "index": index, "address": address_lower, "handle": req.handle },
        "duplicate": false,
        "message": expected,
    })))
}

async fn metadata(
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<MetadataRequest>,
) -> Result<Json<DrawView>, ApiError> {
    let (creator, creator_lower) = normalize_address(&req.creator)?;
    let payload_json = serde_json::to_vec(&req.payload)
        .map_err(|_| ApiError::BadRequest("invalid metadata".into()))?;
    let payload_hex = format!("0x{}", hex::encode(&payload_json));
    let expected =
        metadata_message(state.cfg.chain_id, state.cfg.contract, id, creator, &payload_hex);
    if req.message.trim() != expected {
        return Err(ApiError::BadRequest(
            "signed message does not match this payload".into(),
        ));
    }
    verify_signature(&expected, &req.signature, creator)?;

    let draw = load_draw(&state, id).await?;
    if draw.creator.to_lowercase() != creator_lower {
        return Err(ApiError::Unauthorized(
            "only the draw creator can set metadata".into(),
        ));
    }
    if draw.entries_root.is_some() {
        return Err(ApiError::Conflict(
            "metadata is frozen once the entrant list is locked".into(),
        ));
    }
    if req.payload.title.trim().is_empty() || req.payload.title.len() > 120 {
        return Err(ApiError::BadRequest(
            "title must be between 1 and 120 characters".into(),
        ));
    }
    if req.payload.description.len() > 2_000 {
        return Err(ApiError::BadRequest(
            "description must be at most 2000 characters".into(),
        ));
    }
    if let Some(url) = &req.payload.image_url {
        if !(url.starts_with("https://") || url.starts_with("ipfs://")) {
            return Err(ApiError::BadRequest(
                "imageUrl must be https:// or ipfs://".into(),
            ));
        }
    }

    let now = Utc::now().timestamp();
    sqlx::query(
        "UPDATE draws SET title = ?, description = ?, image_url = ?, creator_handle = ?, updated_at = ? WHERE id = ?",
    )
    .bind(req.payload.title.trim())
    .bind(req.payload.description.trim())
    .bind(req.payload.image_url.as_deref())
    .bind(req.payload.handle.as_deref())
    .bind(now)
    .bind(id as i64)
    .execute(&state.db)
    .await?;

    Ok(Json(DrawView::from(load_draw(&state, id).await?)))
}

fn tree_for(entries: &[EntryRow]) -> Result<MerkleTree, ApiError> {
    let mut pairs = Vec::with_capacity(entries.len());
    for e in entries {
        let addr = Address::from_str(&e.address)
            .map_err(|_| ApiError::Internal("invalid stored address".into()))?;
        pairs.push((e.idx as u32, addr));
    }
    Ok(MerkleTree::from_entries(&pairs))
}

async fn merkle_view(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<Json<Value>, ApiError> {
    let draw = load_draw(&state, id).await?;
    let entries = sqlx::query_as::<_, EntryRow>(
        "SELECT * FROM entries WHERE draw_id = ? ORDER BY idx ASC",
    )
    .bind(id as i64)
    .fetch_all(&state.db)
    .await?;
    if entries.is_empty() {
        return Err(ApiError::BadRequest("no entries".into()));
    }
    let tree = tree_for(&entries)?;
    let root = format!("{:#x}", tree.root());
    if let Some(committed) = &draw.entries_root {
        if committed.to_lowercase() != root.to_lowercase() {
            return Err(ApiError::Internal(
                "local entrant list does not match the committed root".into(),
            ));
        }
    }

    let leaves: Vec<Value> = entries
        .iter()
        .enumerate()
        .map(|(i, e)| {
            json!({
                "index": e.idx,
                "address": e.address,
                "leaf": format!("{:#x}", merkle::leaf(e.idx as u32, Address::from_str(&e.address).unwrap())),
                "proof": tree.proof(i).iter().map(|p| format!("{:#x}", p)).collect::<Vec<_>>(),
            })
        })
        .collect();

    Ok(Json(json!({
        "drawId": id,
        "root": root,
        "count": entries.len(),
        "committed": draw.entries_root.is_some(),
        "entries": leaves,
    })))
}

async fn commit(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<Json<Value>, ApiError> {
    let signer = state.require_signer()?;
    let _ = sync::sync_one(&state, id).await;
    let draw = load_draw(&state, id).await?;
    if draw.committer.to_lowercase() != format!("{:#x}", signer.address()).to_lowercase() {
        return Err(ApiError::Unauthorized(
            "this deployment is not the draw's committer".into(),
        ));
    }
    if draw.entries_root.is_some() {
        return Err(ApiError::Conflict("entries already committed".into()));
    }
    if Utc::now().timestamp() < draw.close_time {
        return Err(ApiError::Conflict("entries are still open".into()));
    }
    let entries = sqlx::query_as::<_, EntryRow>(
        "SELECT * FROM entries WHERE draw_id = ? ORDER BY idx ASC",
    )
    .bind(id as i64)
    .fetch_all(&state.db)
    .await?;
    if entries.is_empty() {
        return Err(ApiError::BadRequest("no entries to commit".into()));
    }
    let tree = tree_for(&entries)?;
    let root = tree.root();
    let count = entries.len() as u32;
    let tx = chain::commit_entries(
        &state.cfg.rpc_url,
        signer,
        state.cfg.contract,
        id,
        root,
        count,
    )
    .await
    .map_err(|e| ApiError::Chain(e.to_string()))?;
    let _ = sync::sync_one(&state, id).await;

    Ok(Json(json!({
        "txHash": format!("{:#x}", tx),
        "root": format!("{:#x}", root),
        "count": count,
    })))
}

async fn draw(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<Json<Value>, ApiError> {
    let signer = state.require_signer()?;
    let _ = sync::sync_one(&state, id).await;
    let mut draw = load_draw(&state, id).await?;

    if draw.refunded != 0 {
        return Err(ApiError::Conflict("draw was refunded".into()));
    }
    if draw.entries_root.is_none() {
        return Err(ApiError::BadRequest("entries are not committed yet".into()));
    }
    if draw.settled != 0 {
        return Ok(Json(json!({ "draw": DrawView::from(draw), "alreadySettled": true })));
    }

    let mut txs = Vec::new();

    if draw.seed.is_none() {
        let mut captured = false;
        for _ in 0..30 {
            let block = chain::fetch_block_number(&state.cfg.rpc_url)
                .await
                .map_err(|e| ApiError::Chain(e.to_string()))?;
            if block > draw.seed_block.unwrap_or(0) as u64 {
                match chain::capture_seed(
                    &state.cfg.rpc_url,
                    signer.clone(),
                    state.cfg.contract,
                    id,
                )
                .await
                {
                    Ok(tx) => {
                        txs.push(json!({ "kind": "captureSeed", "hash": format!("{:#x}", tx) }));
                        captured = true;
                        break;
                    }
                    Err(err) => {
                        let msg = err.to_string();
                        if msg.contains("SeedNotReady") {
                            tokio::time::sleep(Duration::from_secs(2)).await;
                            continue;
                        }
                        return Err(ApiError::Chain(msg));
                    }
                }
            }
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
        if !captured {
            return Err(ApiError::Chain(
                "seed block was not ready in time; retry in a few seconds".into(),
            ));
        }
        let _ = sync::sync_one(&state, id).await;
        draw = load_draw(&state, id).await?;
    }

    if draw.drawn == 0 {
        let tx = chain::draw(&state.cfg.rpc_url, signer.clone(), state.cfg.contract, id)
            .await
            .map_err(|e| ApiError::Chain(e.to_string()))?;
        txs.push(json!({ "kind": "draw", "hash": format!("{:#x}", tx) }));
        let _ = sync::sync_one(&state, id).await;
        draw = load_draw(&state, id).await?;
    }

    let winner_index = draw
        .winner_index
        .ok_or_else(|| ApiError::Chain("draw did not produce a winner index".into()))?
        as u32;

    let entries = sqlx::query_as::<_, EntryRow>(
        "SELECT * FROM entries WHERE draw_id = ? ORDER BY idx ASC",
    )
    .bind(id as i64)
    .fetch_all(&state.db)
    .await?;
    let tree = tree_for(&entries)?;
    let winner_entry = entries
        .iter()
        .find(|e| e.idx == winner_index as i64)
        .ok_or_else(|| ApiError::Internal("winner index is not in the entrant list".into()))?;
    let winner = Address::from_str(&winner_entry.address)
        .map_err(|_| ApiError::Internal("invalid winner address".into()))?;
    let proof = tree.proof(winner_index as usize);

    if draw.settled == 0 {
        match chain::settle(
            &state.cfg.rpc_url,
            signer.clone(),
            state.cfg.contract,
            id,
            winner,
            proof.clone(),
        )
        .await
        {
            Ok(tx) => {
                let _ = sqlx::query("UPDATE draws SET tx_hash = ? WHERE id = ?")
                    .bind(format!("{:#x}", tx))
                    .bind(id as i64)
                    .execute(&state.db)
                    .await;
                txs.push(json!({ "kind": "settle", "hash": format!("{:#x}", tx) }));
            }
            Err(err) => {
                // Some X Layer RPCs return a null receipt even after a
                // successful transaction. Re-read chain state before calling
                // this a failure.
                let _ = sync::sync_one(&state, id).await;
                let after = load_draw(&state, id).await?;
                if after.settled == 0 {
                    return Err(ApiError::Chain(format!(
                        "draw is final but settlement failed: {err}"
                    )));
                }
                txs.push(json!({ "kind": "settle", "hash": null, "note": "confirmed by state re-read" }));
            }
        }
        let _ = sync::sync_one(&state, id).await;
        draw = load_draw(&state, id).await?;
    }

    Ok(Json(json!({
        "draw": DrawView::from(draw),
        "winner": winner_entry.address,
        "winnerIndex": winner_index,
        "proof": proof.iter().map(|p| format!("{:#x}", p)).collect::<Vec<_>>(),
        "txs": txs,
    })))
}

async fn proof(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<Json<Value>, ApiError> {
    let _ = sync::sync_one(&state, id).await;
    let draw = load_draw(&state, id).await?;
    if draw.drawn == 0 {
        return Err(ApiError::BadRequest("draw has not been executed".into()));
    }
    let seed = draw
        .seed
        .clone()
        .ok_or_else(|| ApiError::Internal("missing seed".into()))?;
    let seed_b256 = B256::from_str(&seed)
        .map_err(|_| ApiError::Internal("invalid seed".into()))?;
    let winner_index = draw.winner_index.unwrap_or(0) as u32;

    let entries = sqlx::query_as::<_, EntryRow>(
        "SELECT * FROM entries WHERE draw_id = ? ORDER BY idx ASC",
    )
    .bind(id as i64)
    .fetch_all(&state.db)
    .await?;
    let tree = tree_for(&entries)?;
    if let Some(committed) = &draw.entries_root {
        if format!("{:#x}", tree.root()).to_lowercase() != committed.to_lowercase() {
            return Err(ApiError::Internal(
                "local entrant list does not match the committed root".into(),
            ));
        }
    }
    let winner_entry = entries.iter().find(|e| e.idx == winner_index as i64);
    let winner = winner_entry.map(|e| e.address.clone());
    let merkle_proof = tree
        .proof(winner_index as usize)
        .iter()
        .map(|p| format!("{:#x}", p))
        .collect::<Vec<_>>();

    let rounds = derive_rounds(&state, id, seed_b256, draw.rounds as u8)
        .await
        .unwrap_or_default();

    Ok(Json(json!({
        "drawId": id,
        "draw": DrawView::from(draw.clone()),
        "seed": seed,
        "seedBlock": draw.seed_block,
        "entriesRoot": draw.entries_root,
        "winnerIndex": winner_index,
        "winner": winner,
        "merkleProof": merkle_proof,
        "rounds": rounds,
        "circuit": {
            "processor": format!("{:#x}", state.cfg.processor).to_lowercase(),
            "circuitId": state.cfg.circuit_id.to_string(),
            "rounds": draw.rounds,
            "selection": "circuit eval -> per-round 9-bit outputs -> accumulator -> modulo entrant count",
        },
        "verify": {
            "rpc": state.cfg.rpc_url,
            "command": format!(
                "cast call {} \"eval(uint256,bytes)(bytes)\" {} 0x000000 --rpc-url {}",
                format!("{:#x}", state.cfg.processor),
                state.cfg.circuit_id,
                state.cfg.rpc_url
            )
        }
    })))
}

async fn derive_rounds(
    state: &AppState,
    draw_id: u64,
    seed: B256,
    rounds: u8,
) -> Result<Vec<Value>, ApiError> {
    let seed_u = U256::from_be_bytes(seed.0);
    let mut acc = U256::ZERO;
    let mut out = Vec::with_capacity(rounds as usize);
    for i in 0..rounds {
        let mut x = (seed_u >> (i as usize * 17))
            ^ (U256::from(draw_id) * U256::from(0x9E37_79B9_7F4A_7C15u64))
            ^ (U256::from(i) * U256::from(0x85EB_CA6Bu64));
        x &= U256::from(0x1_FFFFu64);
        let b0: u8 = (x & U256::from(0xffu64)).to::<u8>();
        let b1: u8 = ((x >> 8usize) & U256::from(0xffu64)).to::<u8>();
        let b2: u8 = ((x >> 16usize) & U256::from(0xffu64)).to::<u8>();
        let input = vec![b0, b1, b2];
        let output = chain::eval(
            &state.cfg.rpc_url,
            state.cfg.processor,
            U256::from(state.cfg.circuit_id),
            input.clone(),
        )
        .await
        .map_err(|e| ApiError::Chain(e.to_string()))?;
        let y = ((output[0] as u16) << 8 | output[1] as u16) & 0x1FF;
        acc = (acc << 9) | U256::from(y);
        out.push(json!({
            "round": i,
            "input": format!("0x{}", hex::encode(&input)),
            "output": format!("0x{}", hex::encode(&output)),
            "nineBit": y,
            "accumulator": acc.to_string(),
        }));
    }
    Ok(out)
}

async fn stats(State(state): State<AppState>) -> Result<Json<Stats>, ApiError> {
    let rows: Vec<(String, i64, i64)> =
        sqlx::query_as("SELECT prize, settled, refunded FROM draws")
            .fetch_all(&state.db)
            .await?;
    let mut escrowed = U256::ZERO;
    let mut paid = U256::ZERO;
    let mut settled = 0i64;
    for (prize, is_settled, is_refunded) in &rows {
        let value = U256::from_str(prize).unwrap_or(U256::ZERO);
        if *is_settled != 0 {
            paid += value;
            settled += 1;
        } else if *is_refunded == 0 {
            escrowed += value;
        }
    }
    let entries: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM entries")
        .fetch_one(&state.db)
        .await?;
    let open: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM draws WHERE settled = 0 AND refunded = 0",
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(Stats {
        draws: rows.len() as i64,
        open_draws: open,
        settled_draws: settled,
        entries,
        escrowed_wei: escrowed.to_string(),
        paid_wei: paid.to_string(),
    }))
}

async fn admin_sync(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let count = sync::sync_all(&state)
        .await
        .map_err(|e| ApiError::Chain(e.to_string()))?;
    Ok(Json(json!({ "synced": count })))
}


#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportRequest {
    draws: Vec<ImportDraw>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportDraw {
    id: u64,
    title: String,
    description: String,
    image_url: Option<String>,
    handle: Option<String>,
    tx_hash: Option<String>,
    entries: Vec<ImportEntry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportEntry {
    index: u32,
    address: String,
    handle: Option<String>,
}

/// Operational recovery endpoint for a lost or restored database. It is
/// disabled unless ADMIN_TOKEN is set. Entries are inserted idempotently and
/// the resulting Merkle root is checked against the committed root before the
/// transaction is allowed to commit.
async fn admin_import(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<ImportRequest>,
) -> Result<Json<Value>, ApiError> {
    let expected = state
        .cfg
        .admin_token
        .as_ref()
        .ok_or_else(|| ApiError::Unauthorized("admin import is disabled".into()))?;
    let supplied = headers
        .get("x-admin-token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if supplied != expected {
        return Err(ApiError::Unauthorized("invalid admin token".into()));
    }

    let mut tx = state.db.begin().await?;
    let now = Utc::now().timestamp();
    let mut imported = 0usize;

    for d in &req.draws {
        let row = sqlx::query_as::<_, DrawRow>("SELECT * FROM draws WHERE id = ?")
            .bind(d.id as i64)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(|| ApiError::NotFound(format!("draw {} not found", d.id)))?;

        sqlx::query(
            "UPDATE draws SET title = ?, description = ?, image_url = ?, creator_handle = ?, tx_hash = COALESCE(?, tx_hash), updated_at = ? WHERE id = ?",
        )
        .bind(d.title.trim())
        .bind(d.description.trim())
        .bind(d.image_url.as_deref())
        .bind(d.handle.as_deref())
        .bind(d.tx_hash.as_deref())
        .bind(now)
        .bind(d.id as i64)
        .execute(&mut *tx)
        .await?;

        for e in &d.entries {
            let (_, address_lower) = normalize_address(&e.address)?;
            sqlx::query(
                "INSERT OR IGNORE INTO entries (draw_id, idx, address, handle, signature, created_at) VALUES (?, ?, ?, ?, NULL, ?)",
            )
            .bind(d.id as i64)
            .bind(e.index as i64)
            .bind(&address_lower)
            .bind(e.handle.as_deref())
            .bind(now)
            .execute(&mut *tx)
            .await?;
            imported += 1;
        }

        let entries = sqlx::query_as::<_, EntryRow>(
            "SELECT * FROM entries WHERE draw_id = ? ORDER BY idx ASC",
        )
        .bind(d.id as i64)
        .fetch_all(&mut *tx)
        .await?;

        if let Some(committed) = &row.entries_root {
            let tree = tree_for(&entries)?;
            let root = format!("{:#x}", tree.root());
            if root.to_lowercase() != committed.to_lowercase() {
                return Err(ApiError::BadRequest(format!(
                    "draw {} entries do not match committed root",
                    d.id
                )));
            }
        }

        sqlx::query("UPDATE draws SET entry_count = ? WHERE id = ?")
            .bind(entries.len() as i64)
            .bind(d.id as i64)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;
    Ok(Json(json!({ "imported": imported })))
}

async fn load_draw(state: &AppState, id: u64) -> Result<DrawRow, ApiError> {
    sqlx::query_as::<_, DrawRow>("SELECT * FROM draws WHERE id = ?")
        .bind(id as i64)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| ApiError::NotFound(format!("draw {id} not found")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloy::signers::local::PrivateKeySigner;
    use alloy::signers::Signer;

    #[tokio::test]
    async fn entry_signature_binds_draw_chain_contract_and_entrant() {
        let signer = PrivateKeySigner::random();
        let address = signer.address();
        let message = entry_message(1952, Address::ZERO, 7, address);
        let signature = signer.sign_message(message.as_bytes()).await.unwrap();
        verify_signature(&message, &signature.to_string(), address).unwrap();

        let wrong = PrivateKeySigner::random().address();
        assert!(verify_signature(&message, &signature.to_string(), wrong).is_err());

        let other_draw = entry_message(1952, Address::ZERO, 8, address);
        assert!(verify_signature(&other_draw, &signature.to_string(), address).is_err());
    }

    #[test]
    fn metadata_payload_hex_is_stable() {
        let payload = MetadataPayload {
            title: "First Light".into(),
            description: "Three entrants, one circuit.".into(),
            image_url: None,
            handle: Some("@proofdrop".into()),
        };
        let json = serde_json::to_vec(&payload).unwrap();
        let hexed = hex::encode(&json);
        assert!(hexed.starts_with("7b227469746c65223a"));
        let decoded: MetadataPayload = serde_json::from_slice(&hex::decode(hexed).unwrap()).unwrap();
        assert_eq!(decoded.title, "First Light");
        assert_eq!(decoded.description, "Three entrants, one circuit.");
        assert_eq!(decoded.handle.as_deref(), Some("@proofdrop"));
    }
}
