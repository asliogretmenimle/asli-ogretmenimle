import { useRef, useState, type ReactNode } from 'react'
import { useFrame } from '../../kit'

/* ───────────── Renkler ───────────── */

export const CABIN_COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316']
const SHIRTS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#6366f1']
const SKIN = ['#f6c9a0', '#e0a878', '#c68a5c', '#8d5a3b', '#f3d2b3']
const HAIR = ['#3b2414', '#111827', '#7c4a1e', '#d6a54a', '#5b3417']

export const VB_W = 800
export const VB_H = 480
export const WHEEL = { cx: 255, cy: 196, r: 148 }

/* ───────────── Dönme açısı ───────────── */

/**
 * Dolabın dönme açısı. idle: boşta derece/sn. target verilirse o açıya hızla döner.
 */
export function useWheelAngle(idle = 7, speed = 220) {
  const [rot, setRot] = useState(0)
  const cur = useRef(0)
  const target = useRef<number | null>(null)
  const spd = useRef(speed)
  const onArrive = useRef<(() => void) | null>(null)
  const idleRef = useRef(idle)
  idleRef.current = idle
  useFrame((dt) => {
    const t = target.current
    if (t === null) {
      if (!idleRef.current) return
      cur.current += idleRef.current * dt
    } else {
      const step = spd.current * dt
      if (Math.abs(t - cur.current) <= step) {
        cur.current = t
        target.current = null
        const cb = onArrive.current
        onArrive.current = null
        if (cb) setTimeout(cb, 0)
      } else cur.current += Math.sign(t - cur.current) * step
    }
    setRot(cur.current)
  }, true)
  return {
    rot,
    /** Açıyı ileri doğru delta kadar döndür; bitince done */
    spin: (delta: number, opts?: { speed?: number; done?: () => void }) => {
      target.current = (target.current ?? cur.current) + delta
      spd.current = opts?.speed ?? speed
      onArrive.current = opts?.done ?? null
    },
    set: (a: number) => {
      target.current = null
      cur.current = a
      setRot(a)
    },
  }
}

/* ───────────── Sahne ───────────── */

/** Lunapark sahnesi: gökyüzü, tepeler, hız treni silueti, bayraklar, zemin */
export function ParkSvg({ children, label, night = false, tent = true, className = '' }: { children?: ReactNode; label: string; night?: boolean; tent?: boolean; className?: string }) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={`block h-auto w-full select-none ${className}`} style={{ touchAction: 'none' }} role="img" aria-label={label}>
      <defs>
        <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
          {night ? (
            <>
              <stop offset="0" stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#7c3aed" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#7dd3fc" />
              <stop offset=".7" stopColor="#e0f2fe" />
              <stop offset="1" stopColor="#fef3c7" />
            </>
          )}
        </linearGradient>
        <linearGradient id="lp-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="lp-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#fcd34d" />
        </linearGradient>
        <radialGradient id="lp-hub" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#c026d3" />
        </radialGradient>
      </defs>
      <rect width={VB_W} height={VB_H} fill="url(#lp-sky)" />
      {night ? (
        Array.from({ length: 26 }, (_, i) => <circle key={i} cx={(i * 137) % 800} cy={(i * 53) % 220 + 10} r={i % 3 ? 1.2 : 2} fill="#fff" opacity={0.8} />)
      ) : (
        <>
          <circle cx="720" cy="62" r="34" fill="#fde047" opacity=".9" />
          <circle cx="720" cy="62" r="48" fill="#fde047" opacity=".25" />
        </>
      )}
      <Cloud x={470} y={50} s={1} dur={70} />
      <Cloud x={90} y={34} s={0.7} dur={95} />
      {/* uzak tepeler */}
      <path d="M0 330 Q120 270 240 320 T480 300 T800 290 V480 H0Z" fill={night ? '#312e81' : '#bbf7d0'} />
      {/* hız treni silueti */}
      <g opacity={night ? 0.55 : 0.9}>
        <path d="M470 330 C500 150 540 140 570 250 S640 330 660 210 S720 120 760 230 L790 330" fill="none" stroke="#f97316" strokeWidth="7" strokeLinecap="round" />
        <path d="M470 330 C500 150 540 140 570 250 S640 330 660 210 S720 120 760 230 L790 330" fill="none" stroke="#fed7aa" strokeWidth="2" strokeDasharray="4 8" />
        {[500, 530, 560, 600, 640, 680, 720, 760].map((x) => <line key={x} x1={x} x2={x} y1={330} y2={x < 560 ? 200 : x < 640 ? 270 : x < 700 ? 205 : 210} stroke="#fb923c" strokeWidth="2.5" opacity=".7" />)}
        <g>
          <rect x="-14" y="-9" width="28" height="14" rx="5" fill="#ef4444" />
          <circle cx="-7" cy="-11" r="4" fill="#fde68a" /><circle cx="7" cy="-11" r="4" fill="#bfdbfe" />
          <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" path="M470 330 C500 150 540 140 570 250 S640 330 660 210 S720 120 760 230 L790 330" />
        </g>
      </g>
      {/* çadır */}
      {tent && <g transform="translate(655 300)">
        <path d="M-58 50 L0 -10 L58 50Z" fill="#f43f5e" />
        <path d="M-58 50 L-29 50 L0 -10Z M0 -10 L29 50 L58 50Z" fill="#fff" opacity=".9" />
        <rect x="-50" y="50" width="100" height="44" fill="#fde68a" />
        <path d="M-50 50 h100 v8 q-12 10 -25 0 q-12 10 -25 0 q-12 10 -25 0 q-12 10 -25 0z" fill="#f43f5e" />
        <line x1="0" y1="-10" x2="0" y2="-30" stroke="#334155" strokeWidth="2" />
        <path d="M0 -30 L18 -24 L0 -18Z" fill="#facc15" />
      </g>}
      {/* bayraklar */}
      <Bunting y={14} />
      {/* zemin */}
      <path d="M0 392 Q400 378 800 392 V480 H0Z" fill="url(#lp-ground)" />
      <path d="M0 420 Q400 404 800 420 V480 H0Z" fill="url(#lp-path)" opacity=".95" />
      {children}
    </svg>
  )
}

function Cloud({ x, y, s, dur }: { x: number; y: number; s: number; dur: number }) {
  return (
    <g opacity=".95">
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx="0" cy="10" rx="44" ry="16" fill="#fff" />
        <ellipse cx="-18" cy="0" rx="22" ry="18" fill="#fff" />
        <ellipse cx="14" cy="-4" rx="26" ry="22" fill="#fff" />
      </g>
      <animateTransform attributeName="transform" type="translate" values="0 0; 60 0; 0 0" dur={`${dur}s`} repeatCount="indefinite" />
    </g>
  )
}

function Bunting({ y }: { y: number }) {
  const flags = Array.from({ length: 20 }, (_, i) => i)
  return (
    <g>
      <path d={`M0 ${y} Q400 ${y + 34} 800 ${y}`} fill="none" stroke="#64748b" strokeWidth="1.5" />
      {flags.map((i) => {
        const t = (i + 0.5) / flags.length
        const x = t * 800
        const yy = y + 2 * t * (1 - t) * 34
        return <path key={i} d={`M${x - 11} ${yy} L${x + 11} ${yy} L${x} ${yy + 18}Z`} fill={CABIN_COLORS[i % CABIN_COLORS.length]} />
      })}
    </g>
  )
}

/* ───────────── Dönme dolap ───────────── */

/**
 * Dönme dolap: kabinler dönerken dik kalır. filled[i] = i. kabinde oturan kişi sayısı.
 * Kabin i’nin açısı: rot − i·(360/N); rot = 90 + k·(360/N) iken k. kabin en altta (biniş yeri).
 */
export function FerrisWheel({ cabins, seats, rot, filled, night, glowBottom }: { cabins: number; seats: number; rot: number; filled?: number[]; night?: boolean; glowBottom?: boolean }) {
  const { cx, cy, r } = WHEEL
  const step = 360 / cabins
  const pts = Array.from({ length: cabins }, (_, i) => {
    const a = ((rot - i * step) * Math.PI) / 180
    return { i, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  const bulbs = Array.from({ length: 32 }, (_, i) => (i * 360) / 32)
  const rr = (rot * Math.PI) / 180
  return (
    <g>
      {/* ayaklar */}
      <path d={`M${cx} ${cy} L${cx - 92} 404 M${cx} ${cy} L${cx + 92} 404`} stroke="#475569" strokeWidth="11" strokeLinecap="round" />
      <path d={`M${cx - 62} 330 L${cx + 62} 330`} stroke="#64748b" strokeWidth="5" />
      {/* biniş platformu */}
      <rect x={cx - 70} y={386} width={140} height={20} rx={6} fill="#c026d3" />
      <rect x={cx - 70} y={386} width={140} height={6} rx={3} fill="#f0abfc" />
      {glowBottom && <ellipse cx={cx} cy={cy + r + 22} rx="34" ry="30" fill="#fde047" opacity=".35"><animate attributeName="opacity" values=".15;.45;.15" dur="1.2s" repeatCount="indefinite" /></ellipse>}
      {/* teller ve çember */}
      <g>
        {pts.map((p) => <line key={p.i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#94a3b8" strokeWidth="2.2" />)}
        {pts.map((p, j) => {
          const q = pts[(j + 1) % pts.length]
          return <line key={`c${p.i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#cbd5e1" strokeWidth="1.4" />
        })}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={night ? '#e879f9' : '#c026d3'} strokeWidth="6" />
        <circle cx={cx} cy={cy} r={r - 16} fill="none" stroke={night ? '#a78bfa' : '#f0abfc'} strokeWidth="3" />
        {bulbs.map((b, i) => {
          const a = rr + (b * Math.PI) / 180
          return (
            <circle key={i} cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={2.8} fill={i % 2 ? '#fde047' : '#fff'}>
              <animate attributeName="opacity" values={i % 2 ? '1;.35;1' : '.35;1;.35'} dur="1.4s" repeatCount="indefinite" />
            </circle>
          )
        })}
      </g>
      <circle cx={cx} cy={cy} r={16} fill="url(#lp-hub)" stroke="#86198f" strokeWidth="3" />
      {/* kabinler */}
      {pts.map((p) => (
        <Cabin key={p.i} x={p.x} y={p.y} seats={seats} n={filled?.[p.i] ?? 0} color={CABIN_COLORS[p.i % CABIN_COLORS.length]} />
      ))}
    </g>
  )
}

function Cabin({ x, y, seats, n, color }: { x: number; y: number; seats: number; n: number; color: string }) {
  const perRow = seats <= 4 ? seats : Math.ceil(seats / 2)
  const rows = seats <= 4 ? 1 : 2
  const w = Math.max(30, perRow * 9 + 10)
  const h = rows === 1 ? 22 : 30
  const top = y + 9
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={top} stroke="#334155" strokeWidth="2" />
      <circle cx={x} cy={y} r={3} fill="#334155" />
      <path d={`M${x - w / 2 - 2} ${top + 5} Q${x} ${top - 6} ${x + w / 2 + 2} ${top + 5}Z`} fill={color} />
      <rect x={x - w / 2} y={top + 4} width={w} height={h} rx={7} fill="#fff" stroke={color} strokeWidth="2.5" />
      <rect x={x - w / 2} y={top + 4 + h - 7} width={w} height={7} rx={3} fill={color} opacity=".85" />
      {Array.from({ length: seats }, (_, s) => {
        const row = Math.floor(s / perRow)
        const col = s % perRow
        const inRow = row === rows - 1 ? seats - perRow * (rows - 1) : perRow
        const sx = x - ((inRow - 1) * 9) / 2 + col * 9
        const sy = top + 12 + row * 9
        const full = s < n
        return full ? (
          <g key={s}>
            <circle cx={sx} cy={sy} r={3.6} fill={SKIN[(s + Math.round(x)) % SKIN.length]} />
            <path d={`M${sx - 3.6} ${sy - 1} a3.6 3.6 0 0 1 7.2 0z`} fill={HAIR[(s * 3 + Math.round(y)) % HAIR.length]} />
          </g>
        ) : (
          <circle key={s} cx={sx} cy={sy} r={3} fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
        )
      })}
    </g>
  )
}

/* ───────────── Kuyruk ───────────── */

/** Çocuk figürü (sol alt köşe 0,0 → ayak) */
export function Kid({ x, y, i, s = 1, ghost }: { x: number; y: number; i: number; s?: number; ghost?: boolean }) {
  const shirt = SHIRTS[i % SHIRTS.length]
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={ghost ? 0.3 : 1}>
      <rect x={-3.5} y={-9} width={3} height={9} rx={1.5} fill="#334155" />
      <rect x={0.5} y={-9} width={3} height={9} rx={1.5} fill="#334155" />
      <rect x={-5.5} y={-21} width={11} height={13} rx={4} fill={shirt} />
      <circle cx={0} cy={-26} r={5.4} fill={SKIN[(i * 7) % SKIN.length]} />
      <path d="M-5.4 -27 a5.4 5.4 0 0 1 10.8 0 q-5 -2 -10.8 0z" fill={HAIR[(i * 5) % HAIR.length]} />
    </g>
  )
}

/**
 * Zikzak kuyruk (biniş platformunun sağında). count kişi, perFig kişi = 1 figür.
 * Halatlı direkler ve “Sırada: …” tabelası.
 */
export function Queue({ count, perFig = 1, label = 'Sırada', bounce = true }: { count: number; perFig?: number; label?: string; bounce?: boolean }) {
  const figs = Math.ceil(count / perFig)
  const rows = [458, 434, 410]
  const x0 = 352, x1 = 784
  const per = 30
  const gap = (x1 - x0) / per
  const items = Array.from({ length: Math.min(figs, per * rows.length) }, (_, k) => {
    const row = Math.floor(k / per)
    const col = k % per
    const x = row % 2 === 0 ? x0 + col * gap + 6 : x1 - col * gap - 6
    return { k, x, y: rows[2 - row] + 8, part: k === figs - 1 && count % perFig !== 0 }
  })
  return (
    <g>
      {rows.map((ry, i) => (
        <g key={ry}>
          <line x1={x0} x2={x1} y1={ry + 13} y2={ry + 13} stroke="#be185d" strokeWidth="2.5" opacity=".55" />
          {[x0, (x0 + x1) / 2, x1].map((px) => <g key={px}><rect x={px - 2} y={ry - 2} width={4} height={17} fill="#94a3b8" /><circle cx={px} cy={ry - 3} r={3.5} fill="#fbbf24" /></g>)}
          {i < 2 && null}
        </g>
      ))}
      {items.map((it) => (
        <g key={it.k}>
          <Kid x={it.x} y={it.y} i={it.k} s={0.95} ghost={it.part} />
          {bounce && it.k < 3 && <animateTransform attributeName="transform" type="translate" values="0 0; 0 -2; 0 0" dur={`${0.6 + it.k * 0.1}s`} repeatCount="indefinite" />}
        </g>
      ))}
      <g transform={`translate(${x1 - 92} 352)`}>
        <rect width="100" height="44" rx="10" fill="#1e293b" opacity=".88" />
        <text x="50" y="17" textAnchor="middle" fontSize="11" fontWeight="900" fill="#f0abfc">{label}</text>
        <text x="50" y="37" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff">{count.toLocaleString('tr-TR')} kişi</text>
      </g>
      {perFig > 1 && (
        <g transform="translate(360 352)">
          <rect width="124" height="30" rx="9" fill="#fff" opacity=".92" stroke="#e9d5ff" />
          <Kid x={16} y={26} i={2} s={0.75} />
          <text x="30" y="20" fontSize="13" fontWeight="900" fill="#581c87">= {perFig} kişi</text>
        </g>
      )}
    </g>
  )
}
