use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow)]
pub struct DrawRow {
    pub id: i64,
    pub creator: String,
    pub committer: String,
    pub prize: String,
    pub fee: String,
    pub close_time: i64,
    pub max_entries: i64,
    pub entry_count: i64,
    pub rounds: i64,
    pub entries_root: Option<String>,
    pub seed_block: Option<i64>,
    pub seed: Option<String>,
    pub winner_index: Option<i64>,
    pub winner: Option<String>,
    pub drawn: i64,
    pub settled: i64,
    pub refunded: i64,
    pub title: String,
    pub description: String,
    pub image_url: Option<String>,
    pub creator_handle: Option<String>,
    pub tx_hash: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, FromRow)]
pub struct EntryRow {
    pub draw_id: i64,
    pub idx: i64,
    pub address: String,
    pub handle: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct EntryView {
    pub index: u32,
    pub address: String,
    pub handle: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DrawView {
    pub id: u64,
    pub creator: String,
    pub committer: String,
    pub prize: String,
    pub fee: String,
    pub close_time: i64,
    pub max_entries: u32,
    pub entry_count: u32,
    pub rounds: u8,
    pub entries_root: Option<String>,
    pub seed_block: Option<i64>,
    pub seed: Option<String>,
    pub winner_index: Option<u32>,
    pub winner: Option<String>,
    pub drawn: bool,
    pub settled: bool,
    pub refunded: bool,
    pub title: String,
    pub description: String,
    pub image_url: Option<String>,
    pub creator_handle: Option<String>,
    pub tx_hash: Option<String>,
    pub created_at: i64,
    pub status: &'static str,
}

impl From<DrawRow> for DrawView {
    fn from(row: DrawRow) -> Self {
        let status = if row.refunded != 0 {
            "refunded"
        } else if row.settled != 0 {
            "settled"
        } else if row.drawn != 0 {
            "drawn"
        } else if row.entries_root.is_some() {
            "locked"
        } else if row.close_time <= chrono::Utc::now().timestamp() {
            "closed"
        } else {
            "open"
        };

        Self {
            id: row.id as u64,
            creator: row.creator,
            committer: row.committer,
            prize: row.prize,
            fee: row.fee,
            close_time: row.close_time,
            max_entries: row.max_entries as u32,
            entry_count: row.entry_count as u32,
            rounds: row.rounds as u8,
            entries_root: row.entries_root,
            seed_block: row.seed_block,
            seed: row.seed,
            winner_index: row.winner_index.map(|v| v as u32),
            winner: row.winner,
            drawn: row.drawn != 0,
            settled: row.settled != 0,
            refunded: row.refunded != 0,
            title: row.title,
            description: row.description,
            image_url: row.image_url,
            creator_handle: row.creator_handle,
            tx_hash: row.tx_hash,
            created_at: row.created_at,
            status,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryRequest {
    pub address: String,
    pub signature: String,
    pub message: String,
    pub handle: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataRequest {
    pub creator: String,
    pub signature: String,
    pub message: String,
    pub payload: MetadataPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetadataPayload {
    pub title: String,
    pub description: String,
    pub image_url: Option<String>,
    pub handle: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DrawDetail {
    #[serde(flatten)]
    pub draw: DrawView,
    pub explorer_url: String,
    pub contract_url: String,
    pub entries: Vec<EntryView>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub draws: i64,
    pub open_draws: i64,
    pub settled_draws: i64,
    pub entries: i64,
    pub escrowed_wei: String,
    pub paid_wei: String,
}
