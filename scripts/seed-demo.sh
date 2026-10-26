#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a
. .secrets/deployer.env
. .secrets/entrants.env
set +a

RPC="${RPC:-https://testrpc.xlayer.tech/terigon}"
API="${API:-http://localhost:8090}"
C="${CONTRACT_ADDRESS:-0xC56d61dcb12dDA7dfA87e90776F5c665Bf7E530a}"
CREATOR="$DEPLOYER_ADDRESS"
CREATOR_LOWER=$(echo "$CREATOR" | tr 'A-Z' 'a-z')

now=$(date +%s)

create_draw() {
  local prize_wei="$1" close="$2" max="$3" title="$4" desc="$5"
  local fee total
  fee=$(cast call "$C" "feeFor(uint256)(uint256)" "$prize_wei" --rpc-url "$RPC" | awk '{print $1}')
  total=$((prize_wei + fee))
  echo "[seed] creating '$title' prize=$prize_wei fee=$fee"
  cast send "$C" "createDraw(uint256,uint64,uint32,address)" \
    "$prize_wei" "$close" "$max" "$CREATOR" \
    --value "$total" --private-key "$DEPLOYER_PRIVATE_KEY" --rpc-url "$RPC" >/dev/null
  local id
  id=$(cast call "$C" "nextId()(uint256)" --rpc-url "$RPC" | awk '{print $1}')
  id=$((id - 1))
  echo "[seed] draw id=$id"

  local n=0
  for name in ALICE BOB CAROL; do
    local addr pk lower msg sig
    eval "addr=\$${name}_ADDRESS"
    eval "pk=\$${name}_PK"
    lower=$(echo "$addr" | tr 'A-Z' 'a-z')
    msg=$(printf 'ProofDrop entry\nDraw: %s\nChain: 1952\nContract: %s\nEntrant: %s' "$id" "$(echo "$C" | tr 'A-Z' 'a-z')" "$lower")
    sig=$(cast wallet sign --private-key "$pk" "$msg")
    curl -fsS -X POST "$API/draws/$id/entries" -H 'content-type: application/json' \
      -d "$(jq -n --arg a "$lower" --arg s "$sig" --arg m "$msg" '{address:$a,signature:$s,message:$m}')" >/dev/null
    n=$((n + 1))
  done
  echo "[seed] entries=$n"

  local payload hex msg sig
  payload=$(jq -cn --arg t "$title" --arg d "$desc" '{title:$t,description:$d,imageUrl:null,handle:"@proofdrop"}')
  hex=0x$(printf '%s' "$payload" | xxd -p | tr -d '\n')
  msg=$(printf 'ProofDrop metadata\nDraw: %s\nChain: 1952\nContract: %s\nCreator: %s\nPayload: %s' "$id" "$(echo "$C" | tr 'A-Z' 'a-z')" "$CREATOR_LOWER" "$hex")
  sig=$(cast wallet sign --private-key "$DEPLOYER_PRIVATE_KEY" "$msg")
  curl -fsS -X POST "$API/draws/$id/metadata" -H 'content-type: application/json' \
    -d "$(jq -n --arg c "$CREATOR_LOWER" --arg s "$sig" --arg m "$msg" --argjson p "$payload" '{creator:$c,signature:$s,message:$m,payload:$p}')" >/dev/null
  echo "[seed] metadata set"
  LAST_ID=$id
  LAST_CLOSE=$close
}

create_draw 20000000000000000 $((now + 7200)) 200 \
  'The Friday Five' \
  'A weekly 0.02 OKB drop for the timeline. One address, one entry, one circuit decision.'

create_draw 5000000000000000 $((now + 330)) 100 \
  'First Light' \
  'The first settled ProofDrop draw on X Layer testnet: three entrants, one circuit, and a proof page that replays the decision.'

echo "[seed] waiting for draw $LAST_ID to close (close=$LAST_CLOSE)..."
while [ "$(date +%s)" -lt "$LAST_CLOSE" ]; do sleep 10; done

echo "[seed] committing draw $LAST_ID"
curl -fsS -X POST "$API/draws/$LAST_ID/commit" || true
echo
echo "[seed] drawing and settling draw $LAST_ID"
curl -fsS -X POST "$API/draws/$LAST_ID/draw" || true
echo
echo "[seed] done"
