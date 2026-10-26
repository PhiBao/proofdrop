use alloy::network::EthereumWallet;
use alloy::primitives::{Address, B256, U256};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::signers::local::PrivateKeySigner;
use alloy::sol;
use anyhow::{Context, Result};

sol! {
    #[sol(rpc)]
    contract ProofDropAbi {
        struct Draw {
            address creator;
            address committer;
            address winner;
            uint256 prize;
            uint64 closeTime;
            uint64 seedBlock;
            uint32 maxEntries;
            uint32 entryCount;
            uint32 winnerIndex;
            uint8 rounds;
            bool drawn;
            bool settled;
            bool refunded;
            bytes32 entriesRoot;
            bytes32 seed;
        }

        function nextId() external view returns (uint256);
        function feeFor(uint256 prize) external view returns (uint256);
        function feeBps() external view returns (uint16);
        function minFee() external view returns (uint256);
        function processor() external view returns (address);
        function circuitId() external view returns (uint256);
        function defaultRounds() external view returns (uint8);
        function getDraw(uint256 id) external view returns (Draw memory);
        function eval(uint256 circuitId, bytes calldata inputs) external view returns (bytes memory);
        function createDraw(uint256 prize, uint64 closeTime, uint32 maxEntries, address committer)
            external payable returns (uint256 id);
        function commitEntries(uint256 id, bytes32 root, uint32 count) external;
        function captureSeed(uint256 id) external;
        function draw(uint256 id) external;
        function settle(uint256 id, address winner, bytes32[] calldata proof) external;
        function claim() external;
        function refund(uint256 id) external;
    }
}

#[derive(Debug, Clone)]
pub struct ChainDraw {
    pub creator: Address,
    pub committer: Address,
    pub winner: Address,
    pub prize: U256,
    pub close_time: u64,
    pub seed_block: u64,
    pub max_entries: u32,
    pub entry_count: u32,
    pub winner_index: u32,
    pub rounds: u8,
    pub drawn: bool,
    pub settled: bool,
    pub refunded: bool,
    pub entries_root: B256,
    pub seed: B256,
}

pub fn provider(rpc_url: &str) -> Result<impl Provider + Clone> {
    let url = rpc_url.parse().context("invalid rpc url")?;
    Ok(ProviderBuilder::new().connect_http(url))
}

pub fn signing_provider(
    rpc_url: &str,
    signer: PrivateKeySigner,
) -> Result<impl Provider + Clone> {
    let url = rpc_url.parse().context("invalid rpc url")?;
    Ok(ProviderBuilder::new()
        .wallet(EthereumWallet::from(signer))
        .connect_http(url))
}

pub struct ChainConfig {
    pub fee_bps: u16,
    pub min_fee: U256,
    pub processor: Address,
    pub circuit_id: U256,
    pub rounds: u8,
}

pub async fn fetch_config(rpc_url: &str, contract: Address) -> Result<ChainConfig> {
    let url = rpc_url.parse().context("invalid rpc url")?;
    let provider = ProviderBuilder::new().connect_http(url);
    let c = ProofDropAbi::new(contract, &provider);
    let fee_bps = c.feeBps().call().await?;
    let min_fee = c.minFee().call().await?;
    let processor = c.processor().call().await?;
    let circuit_id = c.circuitId().call().await?;
    let rounds = c.defaultRounds().call().await?;
    Ok(ChainConfig {
        fee_bps,
        min_fee,
        processor,
        circuit_id,
        rounds,
    })
}

pub async fn fetch_block_number(rpc_url: &str) -> Result<u64> {
    let url = rpc_url.parse().context("invalid rpc url")?;
    let provider = ProviderBuilder::new().connect_http(url);
    Ok(provider.get_block_number().await?)
}

pub async fn fetch_next_id(rpc_url: &str, contract: Address) -> Result<u64> {
    let provider = provider(rpc_url)?;
    let c = ProofDropAbi::new(contract, &provider);
    let next = c.nextId().call().await?;
    Ok(next.to::<u64>())
}

pub async fn fetch_fee(rpc_url: &str, contract: Address, prize: U256) -> Result<U256> {
    let provider = provider(rpc_url)?;
    let c = ProofDropAbi::new(contract, &provider);
    Ok(c.feeFor(prize).call().await?)
}

pub async fn fetch_draw(rpc_url: &str, contract: Address, id: u64) -> Result<ChainDraw> {
    let provider = provider(rpc_url)?;
    let c = ProofDropAbi::new(contract, &provider);
    let d = c.getDraw(U256::from(id)).call().await?;
    Ok(ChainDraw {
        creator: d.creator,
        committer: d.committer,
        winner: d.winner,
        prize: d.prize,
        close_time: d.closeTime,
        seed_block: d.seedBlock,
        max_entries: d.maxEntries,
        entry_count: d.entryCount,
        winner_index: d.winnerIndex,
        rounds: d.rounds,
        drawn: d.drawn,
        settled: d.settled,
        refunded: d.refunded,
        entries_root: d.entriesRoot,
        seed: d.seed,
    })
}

pub async fn commit_entries(
    rpc_url: &str,
    signer: PrivateKeySigner,
    contract: Address,
    id: u64,
    root: B256,
    count: u32,
) -> Result<B256> {
    let address = signer.address();
    let provider = signing_provider(rpc_url, signer)?;
    let nonce = provider.get_transaction_count(address).await?;
    let c = ProofDropAbi::new(contract, &provider);
    let receipt = c
        .commitEntries(U256::from(id), root, count)
        .nonce(nonce)
        .send()
        .await?
        .get_receipt()
        .await?;
    Ok(receipt.transaction_hash)
}

pub async fn capture_seed(
    rpc_url: &str,
    signer: PrivateKeySigner,
    contract: Address,
    id: u64,
) -> Result<B256> {
    let address = signer.address();
    let provider = signing_provider(rpc_url, signer)?;
    let nonce = provider.get_transaction_count(address).await?;
    let c = ProofDropAbi::new(contract, &provider);
    let receipt = c
        .captureSeed(U256::from(id))
        .nonce(nonce)
        .send()
        .await?
        .get_receipt()
        .await?;
    Ok(receipt.transaction_hash)
}

pub async fn draw(
    rpc_url: &str,
    signer: PrivateKeySigner,
    contract: Address,
    id: u64,
) -> Result<B256> {
    let address = signer.address();
    let provider = signing_provider(rpc_url, signer)?;
    let nonce = provider.get_transaction_count(address).await?;
    let c = ProofDropAbi::new(contract, &provider);
    let receipt = c
        .draw(U256::from(id))
        .nonce(nonce)
        .send()
        .await?
        .get_receipt()
        .await?;
    Ok(receipt.transaction_hash)
}

pub async fn settle(
    rpc_url: &str,
    signer: PrivateKeySigner,
    contract: Address,
    id: u64,
    winner: Address,
    proof: Vec<B256>,
) -> Result<B256> {
    let address = signer.address();
    let provider = signing_provider(rpc_url, signer)?;
    let nonce = provider.get_transaction_count(address).await?;
    let c = ProofDropAbi::new(contract, &provider);
    let receipt = c
        .settle(U256::from(id), winner, proof)
        .nonce(nonce)
        .send()
        .await?
        .get_receipt()
        .await?;
    Ok(receipt.transaction_hash)
}

pub async fn claim(
    rpc_url: &str,
    signer: PrivateKeySigner,
    contract: Address,
) -> Result<B256> {
    let url = rpc_url.parse().context("invalid rpc url")?;
    let address = signer.address();
    let provider = ProviderBuilder::new()
        .wallet(EthereumWallet::from(signer))
        .connect_http(url);
    let c = ProofDropAbi::new(contract, &provider);
    let nonce = provider.get_transaction_count(address).await?;
    let receipt = c.claim().nonce(nonce).send().await?.get_receipt().await?;
    Ok(receipt.transaction_hash)
}

/// Call a TapeOut circuit directly. Used by the proof endpoint.
pub async fn eval(
    rpc_url: &str,
    processor: Address,
    circuit_id: U256,
    input: Vec<u8>,
) -> Result<Vec<u8>> {
    let url = rpc_url.parse().context("invalid rpc url")?;
    let provider = ProviderBuilder::new().connect_http(url);
    let c = ProofDropAbi::new(processor, &provider);
    let out = c
        .eval(circuit_id, alloy::primitives::Bytes::from(input))
        .call()
        .await?;
    Ok(out.to_vec())
}
