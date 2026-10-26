use alloy::primitives::{Address, B256};
use anyhow::Result;
use chrono::Utc;

use crate::chain;
use crate::state::AppState;

pub async fn sync_all(state: &AppState) -> Result<usize> {
    let next = chain::fetch_next_id(&state.cfg.rpc_url, state.cfg.contract).await?;
    let mut count = 0;
    for id in 1..next {
        match sync_one(state, id).await {
            Ok(()) => count += 1,
            Err(err) => {
                tracing::warn!(draw = id, error = %err, "failed to sync draw");
            }
        }
    }
    Ok(count)
}

pub async fn sync_one(state: &AppState, id: u64) -> Result<()> {
    let draw = chain::fetch_draw(&state.cfg.rpc_url, state.cfg.contract, id).await?;
    let fee = chain::fetch_fee(&state.cfg.rpc_url, state.cfg.contract, draw.prize).await?;
    let offchain_entries: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM entries WHERE draw_id = ?")
            .bind(id as i64)
            .fetch_one(&state.db)
            .await?;
    let entry_count = if draw.entries_root == B256::ZERO {
        offchain_entries
    } else {
        draw.entry_count as i64
    };
    let now = Utc::now().timestamp();

    let entries_root = if draw.entries_root == B256::ZERO {
        None
    } else {
        Some(format!("{:#x}", draw.entries_root))
    };
    let seed = if draw.seed == B256::ZERO {
        None
    } else {
        Some(format!("{:#x}", draw.seed))
    };
    let winner = if draw.winner == Address::ZERO {
        None
    } else {
        Some(format!("{:#x}", draw.winner).to_lowercase())
    };

    sqlx::query(
        r#"
        INSERT INTO draws (
            id, creator, committer, prize, fee, close_time, max_entries, entry_count, rounds,
            entries_root, seed_block, seed, winner_index, winner, drawn, settled, refunded,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            creator = excluded.creator,
            committer = excluded.committer,
            prize = excluded.prize,
            fee = excluded.fee,
            close_time = excluded.close_time,
            max_entries = excluded.max_entries,
            entry_count = excluded.entry_count,
            rounds = excluded.rounds,
            entries_root = excluded.entries_root,
            seed_block = excluded.seed_block,
            seed = excluded.seed,
            winner_index = excluded.winner_index,
            winner = excluded.winner,
            drawn = excluded.drawn,
            settled = excluded.settled,
            refunded = excluded.refunded,
            updated_at = excluded.updated_at
        "#,
    )
    .bind(id as i64)
    .bind(format!("{:#x}", draw.creator).to_lowercase())
    .bind(format!("{:#x}", draw.committer).to_lowercase())
    .bind(draw.prize.to_string())
    .bind(fee.to_string())
    .bind(draw.close_time as i64)
    .bind(draw.max_entries as i64)
    .bind(entry_count)
    .bind(draw.rounds as i64)
    .bind(entries_root)
    .bind(draw.seed_block as i64)
    .bind(seed)
    .bind(draw.winner_index as i64)
    .bind(winner)
    .bind(draw.drawn as i64)
    .bind(draw.settled as i64)
    .bind(draw.refunded as i64)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok(())
}
