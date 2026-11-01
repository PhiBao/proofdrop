#!/usr/bin/env python3
"""Generate and verify a 17-in / 9-out NAND-only draw mixer.

Circuit:
    s = (x XOR 1) & 0x1FFFF
    s ^= s << 7
    s ^= s >> 9
    s ^= s << 3
    y = s & 0x1FF

Every shift is an invertible GF(2) transform, so the full 17-bit map is a
permutation. A 9-bit projection of a permutation over 2^17 inputs is exactly
uniform: every output value 0..511 occurs exactly 256 times.

The BLIF uses one .model, .inputs, .outputs, .names, .end. It has no .latch,
no .subckt, and only 2-input NAND gates plus three output buffers. This is the
subset accepted by the Fab X / TapeOut canvas BLIF importer.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Circuit:
    def __init__(self) -> None:
        self.nands: list[tuple[str, str, str]] = []
        self.inverters: list[tuple[str, str]] = []
        self.buffers: list[tuple[str, str]] = []
        self._n = 0

    def nand(self, a: str, b: str, out: str | None = None) -> str:
        if out is None:
            out = f"n{self._n}"
            self._n += 1
        self.nands.append((a, b, out))
        return out

    def xor(self, a: str, b: str, out: str) -> str:
        # XOR2 from four NANDs.
        n1 = self.nand(a, b)
        n2 = self.nand(a, n1)
        n3 = self.nand(b, n1)
        return self.nand(n2, n3, out)


def model(x: int) -> tuple[int, int]:
    s = (x ^ 1) & 0x1FFFF
    s ^= (s << 7) & 0x1FFFF
    s ^= s >> 9
    s ^= (s << 3) & 0x1FFFF
    s &= 0x1FFFF
    return s, s & 0x1FF


def build() -> tuple[Circuit, list[str], list[str]]:
    c = Circuit()
    inputs = [f"x{i}" for i in range(17)]
    outputs = [f"y{i}" for i in range(9)]

    state = {i: inputs[i] for i in range(17)}
    c.inverters.append(("x0", "x0n"))  # NOT x0, avoids the all-zero fixed point
    state[0] = "x0n"

    nxt = dict(state)
    for i in range(7, 17):
        nxt[i] = c.xor(state[i], state[i - 7], f"a{i}")
    state = nxt

    nxt = dict(state)
    for i in range(0, 8):
        nxt[i] = c.xor(state[i], state[i + 9], f"b{i}")
    state = nxt

    nxt = dict(state)
    for i in range(3, 17):
        out = f"y{i}" if i <= 8 else f"c{i}"
        nxt[i] = c.xor(state[i], state[i - 3], out)
    state = nxt

    # y0..y2 are unchanged by the final shift. Buffer them so every output has
    # a driver. The canvas may count each buffer as two NANDs.
    for i in range(3):
        c.buffers.append((state[i], outputs[i]))

    return c, inputs, outputs


def write_blif(path: Path, c: Circuit, inputs: list[str], outputs: list[str]) -> None:
    lines = [
        "# ProofDrop draw mixer",
        "# 17 inputs, 9 outputs, NAND-only, combinational.",
        "# s = (x XOR 1); s ^= s << 7; s ^= s >> 9; s ^= s << 3; y = s[8:0]",
        "# The full 17-bit map is a permutation, so the 9-bit output is uniform.",
        ".model proofdrop_draw_mix",
        ".inputs " + " ".join(inputs),
        ".outputs " + " ".join(outputs),
        "",
    ]
    for src, out in c.inverters:
        lines += [
            f".names {src} {out}",
            "0 1",
        ]
    # The Fab X canvas reads a single output-0 row as the off-set and defaults
    # the unlisted patterns to 1. This is the compact NAND form it compiles to
    # a NAND cell; the three-cube on-set form costs 16 gates in the same tool.
    for a, b, out in c.nands:
        lines += [
            f".names {a} {b} {out}",
            "11 0",
        ]
    for src, out in c.buffers:
        lines += [
            f".names {src} {out}",
            "1 1",
        ]
    lines += ["", ".end"]
    path.write_text("\n".join(lines) + "\n")


def verify(c: Circuit) -> None:
    # Exhaustive proof over all 2^17 inputs.
    seen: set[int] = set()
    histogram = [0] * 512
    for x in range(1 << 17):
        full, out = model(x)
        if full in seen:
            raise SystemExit(f"full state is not injective at {x:#07x}")
        seen.add(full)
        histogram[out] += 1
    if len(seen) != 1 << 17:
        raise SystemExit("full state is not a permutation")
    if any(n != 1 << 8 for n in histogram):
        raise SystemExit(f"output is not uniform: {min(histogram)}..{max(histogram)}")

    # Evaluate the exact gate list for every input.
    for x in range(1 << 17):
        values = {f"x{i}": (x >> i) & 1 for i in range(17)}
        for src, out in c.inverters:
            values[out] = 1 - values[src]
        for a, b, out in c.nands:
            values[out] = 0 if (values[a] == 1 and values[b] == 1) else 1
        for src, out in c.buffers:
            values[out] = values[src]
        got = sum(values[f"y{i}"] << i for i in range(9))
        _, want = model(x)
        if got != want:
            raise SystemExit(f"netlist mismatch at {x:#07x}: got {got:#05x}, want {want:#05x}")

    print(f"verified 2^17 inputs; {len(c.nands)} NAND + {len(c.inverters)} NOT + {len(c.buffers)} buffers")


def main() -> None:
    c, inputs, outputs = build()
    write_blif(ROOT / "draw_mix.blif", c, inputs, outputs)
    verify(c)

    vectors = [
        (0x00000, "zero"),
        (0x00001, "bit 0 set"),
        (0x00002, "bit 1 set"),
        (0x00007, "low bits"),
        (0x000FF, "low byte"),
        (0x00100, "bit 8"),
        (0x01234, "mixed"),
        (0x07FFF, "low 15 bits"),
        (0x0AAAA, "alternating"),
        (0x10000, "bit 16"),
        (0x12345, "mixed"),
        (0x15555, "alternating"),
        (0x1FFFF, "all ones"),
    ]
    out = []
    for x, label in vectors:
        full, y = model(x)
        out.append({
            "label": label,
            "input": f"0x{x:05x}",
            "input_bits_lsb_first": "".join(str((x >> i) & 1) for i in range(17)),
            "state_17": f"0x{full:05x}",
            "output_9": f"0x{y:03x}",
            "output_bits_lsb_first": "".join(str((y >> i) & 1) for i in range(9)),
        })
    (ROOT / "draw_mix_vectors.json").write_text(json.dumps(out, indent=2) + "\n")

    (ROOT / "draw_mix.v").write_text(
        """// Reference model for circuit/draw_mix.blif.
// 17-bit xorshift, one-bit tweak, 9-bit output. NAND-only in the BLIF.
module proofdrop_draw_mix (
  input  wire [16:0] x,
  output wire [8:0]  y
);
  wire [16:0] a = x ^ 17'h1;
  wire [16:0] b = a ^ (a << 7);
  wire [16:0] c = b ^ (b >> 9);
  wire [16:0] d = c ^ (c << 3);
  assign y = d[8:0];
endmodule
"""
    )
    print("wrote draw_mix.blif, draw_mix_vectors.json, draw_mix.v")
    print("first rows:")
    print("\n".join((ROOT / "draw_mix.blif").read_text().splitlines()[:12]))


if __name__ == "__main__":
    main()
