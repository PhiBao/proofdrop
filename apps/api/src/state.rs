use std::str::FromStr;

use alloy::signers::local::PrivateKeySigner;
use sqlx::SqlitePool;

use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub cfg: Config,
    pub db: SqlitePool,
    pub signer: Option<PrivateKeySigner>,
}

impl AppState {
    pub fn new(cfg: Config, db: SqlitePool) -> anyhow::Result<Self> {
        let signer = match &cfg.private_key {
            Some(key) => Some(
                PrivateKeySigner::from_str(key)
                    .map_err(|e| anyhow::anyhow!("invalid PRIVATE_KEY: {e}"))?,
            ),
            None => None,
        };
        Ok(Self { cfg, db, signer })
    }

    pub fn signer_address(&self) -> Option<alloy::primitives::Address> {
        self.signer.as_ref().map(|s| s.address())
    }

    pub fn require_signer(&self) -> Result<PrivateKeySigner, crate::error::ApiError> {
        self.signer.clone().ok_or_else(|| {
            crate::error::ApiError::Unauthorized(
                "orchestrator key is not configured on this deployment".into(),
            )
        })
    }
}
