use std::path::Path;

use anyhow::Context;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;

pub async fn connect(database_url: &str) -> anyhow::Result<SqlitePool> {
    let raw = database_url
        .strip_prefix("sqlite://")
        .or_else(|| database_url.strip_prefix("sqlite:"))
        .unwrap_or(database_url);
    let path = raw.split('?').next().unwrap_or(raw);

    if path != ":memory:" {
        if let Some(parent) = Path::new(path).parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent)
                    .with_context(|| format!("creating database directory {}", parent.display()))?;
            }
        }
    }

    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .synchronous(sqlx::sqlite::SqliteSynchronous::Normal);

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .context("connecting to sqlite")?;

    migrate(&pool).await?;
    Ok(pool)
}

async fn migrate(pool: &SqlitePool) -> anyhow::Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS draws (
            id INTEGER PRIMARY KEY,
            creator TEXT NOT NULL,
            committer TEXT NOT NULL,
            prize TEXT NOT NULL,
            fee TEXT NOT NULL,
            close_time INTEGER NOT NULL,
            max_entries INTEGER NOT NULL,
            entry_count INTEGER NOT NULL DEFAULT 0,
            rounds INTEGER NOT NULL DEFAULT 4,
            entries_root TEXT,
            seed_block INTEGER,
            seed TEXT,
            winner_index INTEGER,
            winner TEXT,
            drawn INTEGER NOT NULL DEFAULT 0,
            settled INTEGER NOT NULL DEFAULT 0,
            refunded INTEGER NOT NULL DEFAULT 0,
            title TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            image_url TEXT,
            creator_handle TEXT,
            tx_hash TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS entries (
            draw_id INTEGER NOT NULL,
            idx INTEGER NOT NULL,
            address TEXT NOT NULL,
            handle TEXT,
            signature TEXT,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (draw_id, address),
            UNIQUE (draw_id, idx),
            FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_entries_draw_idx ON entries(draw_id, idx);
        "#,
    )
    .execute(pool)
    .await
    .context("running migrations")?;
    Ok(())
}
