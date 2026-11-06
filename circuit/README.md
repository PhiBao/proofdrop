# ProofDrop draw circuit

A 17-input, 9-output, NAND-only combinational mixer.

## Live deployment

| Item | Value |
|---|---|
| Processor | `0xfdbab05882fad8556e4f64f74e8532e95cce7cac` — “ProofDrop Draw” |
| Circuit ID | `1` |
| Supply | 10,000 transistors |
| Burned | 403 NAND |
| Tape-out tx | `0xdc323697f58d3f1d3c6836b8126fbb22dd3847dd9ba0f695137edbf90795c9ca` |
| Live escrow | `0x2D2d8bba04Ed8aF72d989b172725B447D4954eBb` |

On-chain raw outputs (input bytes LSB-first):

| Input | Raw output |
|---|---|
| `0x000000` | `0x8900` |
| `0x010000` | `0x0000` |
| `0x020000` | `0x9b01` |
| `0xffff01` | `0x0e01` |

The raw two-byte output packs `y0..y7` into the first byte and `y8` into bit 0 of the second. The escrow reads `out[0] << 8 | out[1]` and masks `0x1FF`, which is a permutation of the nine output bits; the distribution stays uniform. The canvas natural values are `0x089`, `0x000`, `0x19b`, and `0x10e`.

Files:

| File | Purpose |
|---|---|
| `draw_mix.blif` | The file to import into the Fab X / TapeOut canvas. |
| `draw_mix_vectors.json` | Test vectors, including LSB-first pin order. |
| `draw_mix.v` | Portable reference model for Yosys/Verilator comparison. |
| `draw_mix.hex` | Exact 2,821-byte netlist produced by the canvas import. |
| `generate_draw_mix.py` | Generator and exhaustive verifier. |

## Interface

- `x0..x16` — 17 input bits, LSB first.
- `y0..y8` — 9 output bits, LSB first.
- No latches, no state, no clock.
- The current ProofDrop escrow derives four 17-bit inputs per draw and reads the first two output bytes as a 9-bit value.

## Logic

```text
s = (x XOR 1) & 0x1FFFF
s ^= s << 7
s ^= s >> 9
s ^= s << 3
y = s & 0x1FF
```

Every shift is an invertible GF(2) transform, so the full 17-bit map is a permutation. A 9-bit projection of a permutation over 2^17 inputs is exactly uniform: every output value `0..511` appears exactly 256 times. The exhaustive generator verifies this over all 131,072 inputs, and verifies the generated NAND netlist gate-by-gate against the model.

This is a mixer, not a cryptographic hash. That is appropriate because the seed is a future X Layer block hash captured after the entrant list is committed. The circuit's job is deterministic, uniform reduction, not secrecy.

## Import result (verified in the Fab X canvas)

| Property | Value |
|---|---|
| Pins | 17 inputs / 9 outputs |
| Netlist gates | 385 NAND |
| Output buffers | +18 NAND (2 per output) |
| Transistors actually burned | 403 NAND |
| Bytes on chain | 2,821 B |
| State elements | 0 |
| Self-check | passed |

The imported circuit was also simulated in the canvas:

| Input | Output |
|---|---|
| `0x00000` | `0x089` |
| `0x00001` | `0x000` |
| `0x00002` | `0x19b` |

These match `draw_mix_vectors.json`.

## Why the BLIF looks unusual

The Fab X BLIF importer treats a `.names` row with output `0` as the off-set and defaults unlisted patterns to `1`. Therefore this compact form is a NAND in the canvas:

```
.names a b out
11 0
```

It imports as 3 netlist NANDs per gate. The conventional three-cube on-set form imports as 16 NANDs per gate and produces a 2,064-gate circuit. The compact form is deliberate and was validated by importing a single NAND and checking its truth table in the canvas.

The `.v` file is the portable reference. If you need a standard-tool BLIF, synthesize `draw_mix.v` with Yosys/ABC rather than feeding the compact canvas form into another tool.

## Creating the circuit

1. Open https://fabx.tech/en/canvas.
2. Choose **Import a BLIF netlist**.
3. Select `circuit/draw_mix.blif`.
4. Confirm the preview shows **17 inputs / 9 outputs, 385 NAND + 18 buffers = 403 NAND, 2,821 B**.
5. Import to canvas and use the canvas self-check.
6. Tape out on a processor with 403 NAND available.

### Processor history

The final deployment uses a processor we created: **ProofDrop Draw**, 10,000 transistor supply, mint price 0, on X Layer. It is registered with the official TapeOut factory. Circuit #1 burned 403 NAND.

The Fab X canvas default, **FAB-Genesis**, is sold out: `mint(0, 403)` reverts with `supply cap`. The free community processor `0x7335…308f` remains a fallback if a future circuit needs a different processor, but it is not used by the live app.

## Deployment status

The live escrow `0x2D2d8bba04Ed8aF72d989b172725B447D4954eBb` uses processor `0xfdbab05882fad8556e4f64f74e8532e95cce7cac` and circuit `1`. Draw #1, “First Silicon,” is settled and its proof page is live.

The older FabX circuit #24 proof is archived at [`docs/proofs/tapeout-24-draw-1.json`](../docs/proofs/tapeout-24-draw-1.json).
