mod chain;
mod config;
mod db;
mod error;
mod merkle;
mod models;
mod routes;
mod state;
mod sync;

use std::time::Duration;

use tracing_subscriber::EnvFilter;

use crate::config::Config;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info,proofdrop_api=debug")),
        )
        .init();

    let cfg = Config::from_env()?;
    tracing::info!(
        chain = cfg.chain_id,
        contract = %cfg.contract,
        rpc = %cfg.rpc_url,
        "starting proofdrop api"
    );

    let pool = db::connect(&cfg.database_url).await?;
    let state = AppState::new(cfg.clone(), pool)?;

    if let Err(err) = sync::sync_all(&state).await {
        tracing::warn!(error = %err, "initial chain sync failed");
    }

    let background = state.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(5)).await;
            if let Err(err) = sync::sync_all(&background).await {
                tracing::warn!(error = %err, "background chain sync failed");
            }
        }
    });

    let app = routes::router(state).layer(tower_http::trace::TraceLayer::new_for_http());
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", cfg.port)).await?;
    tracing::info!(port = cfg.port, "listening");
    axum::serve(listener, app).await?;
    Ok(())
}
