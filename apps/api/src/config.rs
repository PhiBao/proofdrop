use std::env;

use alloy::primitives::Address;

#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub rpc_url: String,
    pub chain_id: u64,
    pub contract: Address,
    pub processor: Address,
    pub circuit_id: u64,
    pub explorer: String,
    pub cors_origins: Vec<String>,
    pub private_key: Option<String>,
    pub public_base_url: String,
    pub demo_mode: bool,
    pub admin_token: Option<String>,
}

fn env_or(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenvy::dotenv().ok();

        let contract = env_or("CONTRACT_ADDRESS", "0x79eE97a6CA733929eF65F708632b62683266B99b")
            .parse()
            .map_err(|_| anyhow::anyhow!("invalid CONTRACT_ADDRESS"))?;
        let processor = env_or("PROCESSOR_ADDRESS", "0xc3cFf081656A338a84Ce80F4463aA69B375841D9")
            .parse()
            .map_err(|_| anyhow::anyhow!("invalid PROCESSOR_ADDRESS"))?;

        Ok(Self {
            port: env_or("PORT", "8080").parse()?,
            database_url: env_or("DATABASE_URL", "sqlite://data/proofdrop.db?mode=rwc"),
            rpc_url: env_or("RPC_URL", "https://testrpc.xlayer.tech/terigon"),
            chain_id: env_or("CHAIN_ID", "1952").parse()?,
            contract,
            processor,
            circuit_id: env_or("CIRCUIT_ID", "24").parse()?,
            explorer: env_or(
                "EXPLORER_URL",
                "https://www.okx.com/web3/explorer/xlayer-test",
            ),
            cors_origins: env_or("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
                .split(',')
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(str::to_string)
                .collect(),
            private_key: env::var("PRIVATE_KEY").ok().filter(|s| !s.trim().is_empty()),
            public_base_url: env_or("PUBLIC_BASE_URL", "http://localhost:8080"),
            demo_mode: env_or("DEMO_MODE", "false").parse().unwrap_or(false),
            admin_token: env::var("ADMIN_TOKEN").ok().filter(|s| !s.trim().is_empty()),
        })
    }
}
