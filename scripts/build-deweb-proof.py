#!/usr/bin/env python3
"""Build the single-file DeWEB proof page for draw #1.

Reads apps/web/public/proofs/1.json and writes deweb-proof/index.html.
No external fonts, scripts, styles, images, or links: the page is one file and
can pass the TapeKit 100%-on-chain check.
"""

from __future__ import annotations

import hashlib
import html
import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROOF = ROOT / "apps" / "web" / "public" / "proofs" / "1.json"
OUT = ROOT / "deweb-proof" / "index.html"


def okb(wei: str) -> str:
    value = Decimal(int(wei)) / Decimal(10**18)
    text = format(value, "f").rstrip("0").rstrip(".")
    return text or "0"


def when(unix: int) -> str:
    return datetime.fromtimestamp(unix, tz=timezone.utc).strftime("%b %-d, %Y · %H:%M UTC")


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def main() -> None:
    proof = json.loads(PROOF.read_text())
    draw = proof["draw"]
    rounds = proof["rounds"]
    winner = proof.get("winner") or "—"
    index = proof["winnerIndex"]
    count = draw["entryCount"]
    prize = okb(draw["prize"])
    processor = proof["circuit"]["processor"]
    circuit = proof["circuit"]["circuitId"]
    rounds_rows = "\n".join(
        f"""<tr>
          <td class="mono">R{r['round']}</td>
          <td class="mono">{esc(r['input'])}</td>
          <td class="mono">{esc(r['output'])}</td>
          <td class="mono">{esc(r['nineBit'])}</td>
          <td class="mono acc">{esc(r['accumulator'])}</td>
        </tr>"""
        for r in rounds
    )
    proof_rows = "\n".join(
        f"<div class='mono hash'>{esc(p)}</div>" for p in proof["merkleProof"]
    )
    final_acc = rounds[-1]["accumulator"] if rounds else "—"
    first = rounds[0] if rounds else {"input": "0x…", "output": "0x…"}

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ProofDrop · Draw #1 · First Silicon</title>
<meta name="description" content="A self-contained proof of the first ProofDrop draw through its own TapeOut circuit on X Layer.">

<style>
  :root {{ --paper:#f6f0e4; --ink:#171410; --muted:#756b5c; --line:#d8cdb9; --orange:#ff4d00; --green:#1f7a4c; }}
  * {{ box-sizing:border-box; }}
  html {{ background:var(--paper); color:var(--ink); }}
  body {{ margin:0; font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.5; background:var(--paper); }}
  .shell {{ width:min(100% - 40px, 980px); margin:0 auto; padding:38px 0 60px; }}
  .top {{ display:flex; justify-content:space-between; align-items:center; gap:20px; padding-bottom:18px; border-bottom:1px solid var(--line); }}
  .brand {{ display:flex; align-items:center; gap:10px; font-weight:700; letter-spacing:-.05em; }}
  .mark {{ width:30px; height:30px; }}
  .tag {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:10px; letter-spacing:.14em; color:var(--orange); text-transform:uppercase; }}
  .hero {{ padding:38px 0 26px; border-bottom:2px solid var(--ink); }}
  .eyebrow {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--orange); }}
  h1 {{ margin:8px 0 4px; font-size:clamp(42px,8vw,84px); line-height:.95; letter-spacing:-.065em; font-weight:600; }}
  .sub {{ color:var(--muted); font-size:16px; }}
  .summary {{ display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid var(--line); }}
  .summary > div {{ padding:20px 20px 20px 0; border-right:1px solid var(--line); }}
  .summary > div + div {{ padding-left:20px; }}
  .summary > div:last-child {{ border-right:0; }}
  .label {{ display:block; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:9px; letter-spacing:.12em; color:var(--muted); text-transform:uppercase; }}
  .summary strong {{ display:block; margin-top:7px; font-size:21px; font-weight:500; letter-spacing:-.03em; }}
  .section {{ padding:30px 0; border-bottom:1px solid var(--line); }}
  .section-head {{ display:flex; justify-content:space-between; align-items:baseline; gap:20px; margin-bottom:12px; }}
  .section-head .mono {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:10px; color:var(--muted); }}
  .lede {{ max-width:700px; color:#3a342c; font-size:14px; margin:0 0 16px; }}
  .data {{ display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--line); border:1px solid var(--line); }}
  .data .cell {{ background:var(--paper); padding:12px 14px; min-width:0; }}
  .data .wide {{ grid-column:1 / -1; }}
  .data .value {{ display:block; margin-top:5px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; word-break:break-all; }}
  .callout {{ border:1px solid var(--orange); background:#fff3ec; padding:12px 14px; margin:14px 0; }}
  .callout .mono {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; word-break:break-all; }}
  table {{ width:100%; border-collapse:collapse; border:1px solid var(--line); }}
  th, td {{ text-align:left; padding:9px 10px; border-bottom:1px solid var(--line); font-size:12px; }}
  th {{ background:var(--ink); color:var(--paper); font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:9px; letter-spacing:.08em; font-weight:500; }}
  .mono {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }}
  .acc {{ text-align:right; color:var(--muted); }}
  .decision {{ display:flex; align-items:center; gap:22px; flex-wrap:wrap; background:var(--ink); color:var(--paper); padding:16px; margin-top:14px; }}
  .decision .label {{ color:rgba(246,240,228,.55); }}
  .decision strong {{ display:block; margin-top:3px; font-size:28px; line-height:1; color:var(--orange); }}
  .decision .mono {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; color:rgba(246,240,228,.7); }}
  .hash {{ font-size:11px; word-break:break-all; padding:4px 0; }}
  .verify {{ background:var(--ink); color:var(--paper); padding:14px; overflow-wrap:anywhere; }}
  .verify code {{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; line-height:1.7; white-space:pre-wrap; }}
  .foot {{ display:flex; justify-content:space-between; gap:20px; padding-top:18px; color:var(--muted); font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:9px; letter-spacing:.06em; }}
  .badge {{ display:inline-flex; align-items:center; gap:6px; border:1px solid var(--green); color:var(--green); padding:3px 7px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:9px; }}
  .dot {{ width:6px; height:6px; border-radius:50%; background:var(--green); }}
  @media (max-width:700px) {{
    .summary {{ grid-template-columns:1fr 1fr; }}
    .summary > div:nth-child(2) {{ border-right:0; }}
    .summary > div:nth-child(n+3) {{ border-top:1px solid var(--line); }}
    .data {{ grid-template-columns:1fr; }}
    .data .wide {{ grid-column:auto; }}
    .foot {{ flex-direction:column; }}
  }}
</style>
</head>
<body>
<div class="shell">
  <div class="top">
    <div class="brand">
      <svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="6" fill="#FF4D00"/><path d="M15 18h16.5c7.2 0 13 5.8 13 13s-5.8 13-13 13H15V18Z" fill="none" stroke="#15130F" stroke-width="5"/><path d="M15 25H7M15 39H7M44.5 32h12" stroke="#15130F" stroke-width="5"/><circle cx="44.5" cy="32" r="3.2" fill="#15130F"/></svg>
      PROOFDROP
    </div>
    <div class="tag">DeWEB · Proof of fairness</div>
  </div>

  <header class="hero">
    <div class="eyebrow">Draw #{str(draw['id']).zfill(4)} · X Layer mainnet</div>
    <h1>{esc(draw['title'] or 'Untitled draw')}</h1>
    <div class="sub">{esc(draw['description'])}</div>
  </header>

  <section class="summary">
    <div><span class="label">Prize</span><strong>{prize} OKB</strong></div>
    <div><span class="label">Winner</span><strong class="mono" style="font-size:14px">{esc(winner)}</strong></div>
    <div><span class="label">Winner index</span><strong>{index} <span class="label" style="display:inline">of {count}</span></strong></div>
    <div><span class="label">Closed</span><strong style="font-size:15px">{when(draw['closeTime'])}</strong></div>
  </section>

  <section class="section">
    <div class="section-head"><span class="label">01 · The seed</span><span class="mono">captured from X Layer</span></div>
    <p class="lede">The entrant list was committed before this block existed. Its hash is the only unpredictable input to the draw.</p>
    <div class="data">
      <div class="cell"><span class="label">Seed block</span><span class="value">{proof['seedBlock']}</span></div>
      <div class="cell"><span class="label">Entries</span><span class="value">{count}</span></div>
      <div class="cell wide"><span class="label">Block hash / seed</span><span class="value">{esc(proof['seed'])}</span></div>
      <div class="cell wide"><span class="label">Entrant root</span><span class="value">{esc(proof['entriesRoot'])}</span></div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><span class="label">02 · The circuit</span><span class="mono">TapeOut · eval()</span></div>
    <p class="lede">Four 17-bit inputs are derived from the seed and evaluated by ProofDrop Draw circuit #{circuit}. The first two output bytes are read as a 9-bit value.</p>
    <div class="callout">
      <span class="label">Live TapeOut call</span>
      <div class="mono">eval({circuit}, {esc(first['input'])}) → {esc(first['output'])}</div>
      <div class="mono" style="color:var(--muted);margin-top:4px">processor {esc(processor)}</div>
    </div>
    <table>
      <thead><tr><th>Round</th><th>Input (3 bytes)</th><th>Output (2 bytes)</th><th>9-bit</th><th style="text-align:right">Accumulator</th></tr></thead>
      <tbody>
        {rounds_rows}
      </tbody>
    </table>
    <div class="decision">
      <div><span class="label">36-bit accumulator</span><strong class="mono" style="font-size:14px;color:var(--paper)">{final_acc}</strong></div>
      <div class="mono">mod {count}</div>
      <div><span class="label">Winner index</span><strong>{index}</strong></div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><span class="label">03 · The list</span><span class="mono">index-bound Merkle proof</span></div>
    <p class="lede">Leaf = keccak256(abi.encodePacked(uint32(index), winner)). The escrow checks this proof against the committed root before crediting the prize.</p>
    <div class="data">
      <div class="cell wide"><span class="label">Winner</span><span class="value">{esc(winner)}</span></div>
      <div class="cell wide"><span class="label">Merkle proof</span>{proof_rows}</div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><span class="label">04 · Reproduce it</span><span class="mono">no ProofDrop server required</span></div>
    <p class="lede">Call the same processor with the same input from any X Layer RPC. The output bytes and the accumulator must match this page. The escrow and settlement transaction are on X Layer mainnet.</p>
    <div class="verify"><code>cast call {esc(processor)} "eval(uint256,bytes)(bytes)" {circuit} {esc(first['input'])} --rpc-url https://rpc.xlayer.tech</code></div>
    <div class="data" style="margin-top:14px">
      <div class="cell wide"><span class="label">Escrow</span><span class="value">0x2D2d8bba04Ed8aF72d989b172725B447D4954eBb</span></div>
      <div class="cell wide"><span class="label">Settlement tx</span><span class="value">{esc(draw.get('txHash') or '—')}</span></div>
    </div>
  </section>

  <footer class="foot">
    <span><span class="badge"><span class="dot"></span>100% ON-CHAIN</span></span>
    <span>PROOFDROP · DRAW #{str(draw['id']).zfill(4)} · X LAYER 196</span>
  </footer>
</div>
</body>
</html>
"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page)
    digest = hashlib.sha256(page.encode()).hexdigest()
    manifest = {
        "path": "index.html",
        "contentType": "text/html; charset=utf-8",
        "bytes": len(page.encode()),
        "sha256": "0x" + digest,
    }
    (OUT.parent / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
