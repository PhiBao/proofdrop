# ProofDrop draw circuit

A 17-input, 9-output, NAND-only combinational mixer.

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

### Supply reality

The canvas defaults to **FAB-Genesis** (`0x87BFCa3494Aa228fF589ab9B642143A5e8c8F9a6`). Its transistor supply is sold out: a `mint(0, 403)` call reverts with `supply cap`. Importing works, but “Mint 403 and tape out” on FAB-Genesis will fail unless you acquire 403 NAND on the market.

A registered free processor with supply is:

```
processor   0x7335a50819d44402e3d5e00239bbb80a13e7308f
transistors 0xe45d5a9b01582204f597eb0be44d6e0a335ca6db
NAND id     0
mintPrice   0
protocolFee 0.00066 OKB
tapeoutFee  0.0013 OKB
nextId      4
```

Minting 403 NAND and taping out the above netlist costs roughly **0.002 OKB plus gas**. The exact payload is in `draw_mix.hex`; the processor ABI is the standard TapeOut `mint`, `tapeout(nl, nIn, nOut)`, and `eval`.

This processor is community-operated. It is registered with the X Layer TapeOut factory and its `eval` works, but it is less prestigious than FabX's own processor. Use it only if the FAB-Genesis market route is not viable.

## After tape-out

The current escrow's `processor` and `circuitId` are immutable. To make the new circuit live:

1. Deploy a new `ProofDrop` with `PROCESSOR` set to the chosen processor and `CIRCUIT_ID` to the new circuit ID.
2. Run a new draw through the new circuit.
3. Update the API env (`PROCESSOR_ADDRESS`, `CONTRACT_ADDRESS`, `CIRCUIT_ID`) and the web build.
4. Publish the new processor address, circuit ID, and proof page.

Do not claim the circuit is live until the tape-out transaction is confirmed and `eval(newCircuitId, input)` matches the vectors.
