#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a
. .secrets/deployer.env
set +a

RPC="${RPC:-https://rpc.xlayer.tech}"
PROCESSOR="${PROCESSOR:-0x87BFCa3494Aa228fF589ab9B642143A5e8c8F9a6}"
CIRCUIT_ID="${CIRCUIT_ID:-24}"

balance=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RPC")
echo "[mainnet] deployer $DEPLOYER_ADDRESS"
echo "[mainnet] balance   $balance wei"
# Deployment + one small draw + draw/settle gas fits comfortably under 0.008 OKB.
if [ "$balance" -lt 8000000000000000 ]; then
  echo "[mainnet] need at least 0.008 OKB on X Layer mainnet for a safe deployment + demo draw."
  echo "[mainnet] send OKB (chain 196) to $DEPLOYER_ADDRESS and re-run."
  exit 1
fi

cd contracts
export PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY"
export PROCESSOR="$PROCESSOR"
export CIRCUIT_ID="$CIRCUIT_ID"
export FEE_BPS="${FEE_BPS:-100}"
export MIN_FEE="${MIN_FEE:-1000000000000000}"
export ROUNDS="${ROUNDS:-4}"

forge script script/Deploy.s.sol --rpc-url "$RPC" --broadcast

address=$(jq -r '.transactions[] | select(.contractName=="ProofDrop") | .contractAddress' \
  "broadcast/Deploy.s.sol/196/run-latest.json" | tail -1)

printf 'MAINNET_CONTRACT_ADDRESS=%s\nMAINNET_PROCESSOR=%s\nMAINNET_CIRCUIT_ID=%s\n' \
  "$address" "$PROCESSOR" "$CIRCUIT_ID" > "$ROOT/.secrets/mainnet-contract.env"

echo "[mainnet] ProofDrop deployed at $address"
echo "[mainnet] next: update apps/api/.env and the web build to chain 196"
