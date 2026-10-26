import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/* ───────────── Sürükle-bırak (fare + dokunma, dokun-dokun alternatifli) ───────────── */

/**
 * Basit işaretçi tabanlı sürükle-bırak: 8 px’ten az hareket → onTap, fazlası → onDrop(x, y).
 * Sürüklenen öğenin "hayaleti" parmağı izler. Öğelerde `data-handle` ve `touch-action: none` olmalı.
 */
export function useDragDrop<T>(opts: { onDrop: (item: T, x: number, y: number) => void; onTap?: (item: T) => void; ghost: (item: T) => ReactNode; onMove?: (item: T, x: number, y: number) => void }) {
  const [drag, setDrag] = useState<{ item: T; x: number; y: number } | null>(null)
  const ref = useRef(opts)
  ref.current = opts
  const start = useCallback((e: React.PointerEvent, item: T) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    const sx = e.clientX, sy = e.clientY, id = e.pointerId
    let moved = false
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) moved = true
      if (moved) {
        setDrag({ item, x: ev.clientX, y: ev.clientY })
        ref.current.onMove?.(item, ev.clientX, ev.clientY)
      }
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setDrag(null)
      if (ev.type === 'pointercancel') return
      if (moved) ref.current.onDrop(item, ev.clientX, ev.clientY)
      else ref.current.onTap?.(item)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [])
  const ghost = drag
    ? createPortal(
        <div style={{ position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%, -65%) scale(1.15)', pointerEvents: 'none', zIndex: 70, filter: 'drop-shadow(0 8px 10px rgb(0 0 0 / .25))' }}>{opts.ghost(drag.item)}</div>,
        document.body,
      )
    : null
  return { start, dragging: drag?.item ?? null, ghost }
}

/** Bırakma bölgesi bul: verilen öğelerden noktayı (pad payıyla) içeren ilk anahtar */
export function hitZone<K extends string | number>(zones: Map<K, Element | null>, x: number, y: number, pad = 18): K | null {
  for (const [k, el] of zones) {
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return k
  }
  return null
}

/* ───────────── Kurabiye ───────────── */

export type CookieTone = 'raw' | 'baked' | 'choc' | 'pink'

const CHIPS = [
  [[13, 14], [25, 12], [20, 24], [11, 25], [28, 25]],
  [[15, 11], [26, 17], [14, 24], [24, 27], [19, 18]],
  [[12, 18], [21, 11], [28, 21], [18, 27], [23, 20]],
]

/** Tek kurabiye (SVG). Degradeler <CookieDefs/> içinde bir kez tanımlıdır. */
export function Cookie({ size = 36, tone = 'baked', seed = 0, className = '' }: { size?: number; tone?: CookieTone; seed?: number; className?: string }) {
  const chips = CHIPS[Math.abs(seed) % 3]
  const chip = tone === 'choc' ? '#fff3e0' : tone === 'pink' ? '#be185d' : '#5b3417'
  const edge = tone === 'raw' ? '#d9b77a' : tone === 'choc' ? '#4a2a14' : tone === 'pink' ? '#e28aa8' : '#a3601f'
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <ellipse cx="20" cy="23" rx="17" ry="15.5" fill="rgb(80 40 10 / .18)" />
      <circle cx="20" cy="20" r="17" fill={`url(#kf-${tone})`} stroke={edge} strokeWidth="1.6" />
      <path d="M9 15 Q12 9 19 8" stroke="#fff" strokeOpacity=".35" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {chips.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={2.6} ry={2.1} transform={`rotate(${(i * 47 + seed * 13) % 180} ${x} ${y})`} fill={chip} opacity={tone === 'raw' ? 0.75 : 1} />
      ))}
    </svg>
  )
}

export function CookieDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <radialGradient id="kf-raw" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#fff3d6" /><stop offset="1" stopColor="#efd29b" /></radialGradient>
        <radialGradient id="kf-baked" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#f6c77d" /><stop offset=".7" stopColor="#dd9a48" /><stop offset="1" stopColor="#b8722c" /></radialGradient>
        <radialGradient id="kf-choc" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#9a6438" /><stop offset="1" stopColor="#5e341a" /></radialGradient>
        <radialGradient id="kf-pink" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#ffe1ec" /><stop offset="1" stopColor="#f6a9c4" /></radialGradient>
      </defs>
    </svg>
  )
}

/* ───────────── Fabrika şeridi: fırın, bant, şef ───────────── */

export function FactoryBanner({ say, mood = 'idle' }: { say: string; mood?: 'idle' | 'happy' | 'think' }) {
  const chef = mood === 'happy' ? '🥳' : mood === 'think' ? '🤔' : '👩‍🍳'
  return (
    <div className="relative h-[92px] overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#fff1e0,#ffe4cc)] ring-1 ring-orange-200 sm:h-[104px]">
      <svg viewBox="0 0 800 104" preserveAspectRatio="xMinYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="kf-tiles" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#fff4e6" /><path d="M0 0H28V28" fill="none" stroke="#f6dcc0" strokeWidth="1.5" /></pattern>
          <linearGradient id="kf-oven" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#64748b" /><stop offset="1" stopColor="#334155" /></linearGradient>
          <radialGradient id="kf-fire" cx="50%" cy="80%" r="70%"><stop offset="0" stopColor="#fde047" /><stop offset=".5" stopColor="#fb923c" /><stop offset="1" stopColor="#7c2d12" /></radialGradient>
        </defs>
        <rect width="800" height="104" fill="url(#kf-tiles)" />
        {/* fırın */}
        <rect x="14" y="8" width="132" height="84" rx="14" fill="url(#kf-oven)" />
        <rect x="26" y="20" width="108" height="48" rx="9" fill="url(#kf-fire)">
          <animate attributeName="opacity" values="1;.82;1" dur="1.6s" repeatCount="indefinite" />
        </rect>
        <rect x="26" y="20" width="108" height="48" rx="9" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle cx="40" cy="80" r="5" fill="#f59e0b" /><circle cx="58" cy="80" r="5" fill="#ef4444" />
        <text x="118" y="84" textAnchor="end" fontSize="11" fontWeight="900" fill="#e2e8f0">FIRIN</text>
        {/* bacadan buhar */}
        <g opacity=".55">
          <circle cx="80" cy="4" r="5" fill="#fff"><animate attributeName="cy" values="8;-6" dur="2.4s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;0" dur="2.4s" repeatCount="indefinite" /></circle>
        </g>
        {/* bant */}
        <rect x="146" y="78" width="660" height="16" rx="8" fill="#475569" />
        <line x1="150" x2="804" y1="86" y2="86" stroke="#94a3b8" strokeWidth="3" strokeDasharray="10 12">
          <animate attributeName="stroke-dashoffset" values="0;-44" dur="1.2s" repeatCount="indefinite" />
        </line>
        {[170, 260, 350, 440, 530, 620, 710].map((x) => <circle key={x} cx={x} cy="98" r="5" fill="#334155" />)}
        {/* bantta ilerleyen kurabiyeler */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <circle cy="70" r="9" fill="#dd9a48" stroke="#a3601f" strokeWidth="1.5">
              <animate attributeName="cx" values="150;560" dur="6s" begin={`${i * 2}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>
      <div className="absolute inset-y-0 right-2 flex max-w-[64%] items-center gap-2 sm:right-3">
        <div className="relative rounded-2xl bg-white px-3 py-2 text-[13px] leading-snug font-extrabold text-ink shadow-md ring-1 ring-orange-200 sm:text-[15px]" aria-live="polite">
          {say}
          <span className="absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 rotate-45 bg-white ring-1 ring-orange-200 [clip-path:polygon(0_0,100%_0,100%_100%)]" />
        </div>
        <span className="text-5xl drop-shadow-sm sm:text-6xl" aria-hidden>{chef}</span>
      </div>
    </div>
  )
}

/* ───────────── Mini dizilim (gönderilen siparişler rafı) ───────────── */

export function MiniArray({ rows, cols, split }: { rows: number; cols: number; split?: { dir: 'r' | 'c'; k: number } }) {
  const s = Math.max(4, Math.min(9, Math.floor(64 / Math.max(rows, cols))))
  const g = 2
  return (
    <svg width={cols * (s + g) + 6 + (split?.dir === 'c' ? 4 : 0)} height={rows * (s + g) + 6 + (split?.dir === 'r' ? 4 : 0)} aria-hidden>
      <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#e2e8f0" />
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols), c = i % cols
        const second = split ? (split.dir === 'r' ? r >= split.k : c >= split.k) : false
        const ox = split?.dir === 'c' && c >= split.k ? 4 : 0
        const oy = split?.dir === 'r' && r >= split.k ? 4 : 0
        return <circle key={i} cx={3 + c * (s + g) + s / 2 + ox} cy={3 + r * (s + g) + s / 2 + oy} r={s / 2} fill={second ? '#7a4a2a' : '#dd9a48'} />
      })}
    </svg>
  )
}

/** Gönderilen siparişler rafı: her farklı çözüm bir paket */
export function OrderShelf({ orders, goal }: { orders: { key: string; label: string; rows?: number; cols?: number; split?: { dir: 'r' | 'c'; k: number } }[]; goal: number }) {
  return (
    <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-black">📦 Gönderilen siparişler</p>
        <span className="chip bg-amber-100 text-sm text-amber-800">{orders.length} / {goal}</span>
      </div>
      <div className="mb-2 flex gap-1" aria-hidden>
        {Array.from({ length: goal }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full transition-colors ${i < orders.length ? 'bg-amber-500' : 'bg-line'}`} />)}
      </div>
      {orders.length === 0 ? (
        <p className="text-sm font-bold text-ink-soft">Henüz sipariş yok. İlk düzenini kur!</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {orders.map((o) => (
            <div key={o.key} className="flex items-center gap-2 rounded-xl bg-amber-50 px-2 py-1.5 ring-1 ring-amber-200 animate-pop">
              {o.rows && o.cols ? <MiniArray rows={o.rows} cols={o.cols} split={o.split} /> : null}
              <span className="text-sm font-extrabold text-amber-900">{o.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
