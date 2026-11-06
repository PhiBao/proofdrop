import { useRef } from 'react'
import { Link } from 'react-router-dom'

const chapters = [
  { at: 0, label: 'The problem' },
  { at: 13, label: 'The live draw' },
  { at: 24, label: 'Create a draw' },
  { at: 32, label: 'Escrow transaction' },
  { at: 39, label: 'Free entry' },
  { at: 55, label: 'Lock and seed' },
  { at: 63, label: 'Circuit decision' },
  { at: 72, label: 'The receipt' },
  { at: 84, label: 'DeWEB copy' },
  { at: 90, label: 'Close' },
]

export function DemoPage() {
  const video = useRef<HTMLVideoElement>(null)

  function seek(seconds: number) {
    if (!video.current) return
    video.current.currentTime = seconds
    void video.current.play()
  }

  return (
    <div className="page demo-page">
      <div className="page-head">
        <div>
          <span className="eyebrow mono">DEMO · 1:40</span>
          <h1>The whole loop,<br />in one take.</h1>
          <p className="page-sub">
            A creator escrows a prize, a demo wallet enters the open draw, and a settled
            draw replays through its own circuit. Every transaction is on X Layer mainnet.
          </p>
        </div>
      </div>

      <div className="demo-frame">
        <video
          ref={video}
          className="demo-video"
          controls
          playsInline
          preload="metadata"
          poster="/demo/poster.jpg"
        >
          <source
            src="https://cdn.jsdelivr.net/gh/PhiBao/proofdrop@main/apps/web/public/demo/proofdrop-demo.mp4"
            type="video/mp4"
          />
          <source src="/demo/proofdrop-demo.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="demo-meta mono">
        <span>1920×1080 · 100 SECONDS · ENGLISH CAPTIONS</span>
        <span>RECORDED ON X LAYER MAINNET</span>
      </div>

      <div className="demo-grid">
        <section>
          <div className="section-head compact-head">
            <span className="eyebrow mono">CHAPTERS</span>
            <span className="mono">click to jump</span>
          </div>
          <div className="demo-chapters">
            {chapters.map((chapter) => (
              <button
                key={chapter.at}
                type="button"
                className="demo-chapter"
                onClick={() => seek(chapter.at)}
              >
                <span className="t">{formatTime(chapter.at)}</span>
                <span className="l">{chapter.label}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="demo-aside">
          <span className="mono-label">WHAT YOU ARE SEEING</span>
          <p>
            Draw #2 is the live open draw. The demo wallet signs a real entry, and the
            public list grows to four. Draw #1, “First Silicon,” is the settled proof:
            winner index 0, 0.001 OKB paid, and a replay command anyone can run.
          </p>
          <div className="demo-links">
            <Link to="/d/2" className="text-link">Enter the open draw →</Link>
            <Link to="/d/1/proof" className="text-link">Open the proof →</Link>
            <a href="https://1-2-413.tapekit.org" target="_blank" rel="noreferrer" className="text-link">
              DeWEB copy ↗
            </a>
            <a href="https://github.com/PhiBao/proofdrop" target="_blank" rel="noreferrer" className="text-link">
              Source ↗
            </a>
            <a href="/demo/proofdrop-demo.vtt" className="text-link">Captions (.vtt)</a>
          </div>
          <p className="demo-note mono">
            The entry is real and the draw is open until December 6, 2026. No transaction
            is staged for the camera.
          </p>
        </aside>
      </div>
    </div>
  )
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}
