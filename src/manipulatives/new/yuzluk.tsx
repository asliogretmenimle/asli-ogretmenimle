import { useRef, useState, type PointerEvent as RPE } from 'react'
import { Delete, Eraser, EyeOff, Footprints, Paintbrush, Shuffle, Trash2 } from 'lucide-react'
import type { ManipulativeConfig } from '../../data/types'
import { ek } from '../../lib/generators'
import { ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Yüzlük Tablo
 *  - Boya: renk seç, hücrelere dokun ya da parmağını kaydırarak boya (örüntüler: katlar, sütunlar, köşegenler).
 *    “Katlarını boya” kısayolu ve canlı örüntü çözümlemesi (fark, aynı sütun/satır, katlar).
 *  - Sakla: hücreleri kartla kapat; kapalı karta dokununca açılır ve komşusundan nasıl bulunacağı yazılır.
 *  - Zıpla: bir hücreden başla; komşu hücrelere (+1, −1, +10, −10) ya da uzak bir hücreye dokun.
 *    Oklar onluk (yeşil) ve birlik (turuncu) sıçramalara ayrılır; toplam sıçrama yazılır.
 *  - Sayfa: 1–100, 0–99, 101–200 (config.min: 1 | 0 | 101).
 *
 * Hedef biçimleri:
 *  { cells: number[] }                       → tam olarak bu sayıları boya (renk serbest)
 *  { hidden: number | number[], cover?: number[], answer?: number }
 *                                            → kapalı kart(lar)ın altındaki sayıyı yaz; `cover` ek boş kartlar
 *  { from, to, maxJumps? }                   → from’dan to’ya zıpla (isteğe bağlı en çok sıçrama)
 */
type V = { start: number; paint: Record<number, number>; cover: number[]; path: number[]; answers: Record<number, string> }
type Tool = 'boya' | 'sil' | 'sakla' | 'zipla'

const COLORS = ['#fb7185', '#60a5fa', '#4ade80', '#facc15', '#c084fc']
const COLOR_NAMES = ['pembe', 'mavi', 'yeşil', 'sarı', 'mor']
const TENS = '#16a34a', ONES = '#ea580c'

const hiddenOf = (t?: Record<string, unknown>): number[] => (!t ? [] : Array.isArray(t.hidden) ? (t.hidden as number[]) : typeof t.hidden === 'number' ? [t.hidden] : [])

/** a’dan b’ye: önce dikey (±10), sonra yatay (±1) adımlar */
function route(a: number, b: number, start: number): number[] {
  const ia = a - start, ib = b - start
  const out: number[] = []
  let cur = a
  const dr = Math.floor(ib / 10) - Math.floor(ia / 10)
  for (let k = 0; k < Math.abs(dr); k++) out.push((cur += dr > 0 ? 10 : -10))
  const dc = (ib % 10) - (ia % 10)
  for (let k = 0; k < Math.abs(dc); k++) out.push((cur += dc > 0 ? 1 : -1))
  return out
}

function describe(cells: number[]) {
  const s = [...cells].sort((a, b) => a - b)
  if (s.length < 2) return null
  const d = s[1] - s[0]
  const arith = d > 0 && s.every((x, i) => i === 0 || x - s[i - 1] === d)
  const out: string[] = []
  if (arith) {
    if (d === 1) out.push('Ardışık sayılar: her biri bir öncekinden 1 fazla')
    else out.push(`${ek(d, 'dist')} ${ek(d, 'dist')} artıyor${s[0] % d === 0 ? ` · hepsi ${ek(d, 'gen')} katı` : ` · her biri bir öncekinden ${d} fazla`}`)
    if (d === 10) out.push(`Hepsi aynı sütunda: birler basamağı ${s[0] % 10}`)
    if (d === 11) out.push('Sağ-aşağı köşegen: her adım 10 + 1')
    if (d === 9) out.push('Sol-aşağı köşegen: her adım 10 − 1')
  } else {
    const ones = new Set(s.map((x) => x % 10)), tens = new Set(s.map((x) => Math.floor(x / 10)))
    if (ones.size === 1) out.push(`Hepsinin birler basamağı ${[...ones][0]}`)
    if (tens.size === 1) out.push(`Hepsinin onlar basamağı ${[...tens][0]}`)
    const g = s.reduce((a, b) => { while (b) [a, b] = [b, a % b]; return a })
    if (g > 1 && ones.size > 1) out.push(`Hepsi ${ek(g, 'gen')} katı`)
  }
  return out
}

function signed(k: number) {
  return k >= 0 ? `+ ${k}` : `− ${-k}`
}

function JumpSummary({ path }: { path: number[] }) {
  if (path.length < 2) return <span>Başlangıç: {path[0]} · komşu hücrelere dokunarak zıpla</span>
  const steps = path.slice(1).map((x, i) => x - path[i])
  const tens = steps.filter((d) => Math.abs(d) === 10).reduce((a, b) => a + b, 0)
  const ones = steps.filter((d) => Math.abs(d) === 1).reduce((a, b) => a + b, 0)
  const total = path[path.length - 1] - path[0]
  const short = steps.length > 12
  return (
    <span className="block">
      <span className="block text-base">
        {path[0]}{' '}
        {short ? (
          <>
            {tens !== 0 && <span style={{ color: '#86efac' }}>{signed(tens)}</span>} {ones !== 0 && <span style={{ color: '#fdba74' }}>{signed(ones)}</span>}
          </>
        ) : (
          steps.map((d, i) => <span key={i} style={{ color: Math.abs(d) === 10 ? '#86efac' : '#fdba74' }}>{signed(d)} </span>)
        )}
        = {path[path.length - 1]}
      </span>
      <span className="mt-1 block text-sm text-white/75">
        {tens !== 0 && ones !== 0 ? <>onluklar <span style={{ color: '#86efac' }}>{signed(tens)}</span>, birlikler <span style={{ color: '#fdba74' }}>{signed(ones)}</span> → </> : ''}toplam {total >= 0 ? `+${total}` : `−${-total}`} · {steps.length} sıçrama
      </span>
    </span>
  )
}

function Arrows({ path, start }: { path: number[]; start: number }) {
  const pos = (v: number) => ({ x: (((v - start) % 10) + 0.5) * 100, y: (Math.floor((v - start) / 10) + 0.5) * 100 })
  return (
    <svg viewBox="0 0 1000 1000" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <marker id="yz-ten" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={TENS} /></marker>
        <marker id="yz-one" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={ONES} /></marker>
      </defs>
      {path.slice(1).map((b, i) => {
        const a = path[i]
        const p = pos(a), q = pos(b)
        const ten = Math.abs(b - a) === 10
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2
        const dx = q.x - p.x, dy = q.y - p.y
        const L = Math.hypot(dx, dy) || 1
        const bend = Math.min(30, L * 0.3)
        const cx = mx + (ten ? bend : 0), cy = my - (ten ? 0 : bend)
        const sh = 24 / L
        const P = { x: p.x + dx * sh, y: p.y + dy * sh }, Q = { x: q.x - dx * sh, y: q.y - dy * sh }
        return <path key={i} d={`M${P.x} ${P.y} Q${cx} ${cy} ${Q.x} ${Q.y}`} fill="none" stroke={ten ? TENS : ONES} strokeWidth={6} strokeLinecap="round" markerEnd={`url(#${ten ? 'yz-ten' : 'yz-one'})`} opacity={0.9} />
      })}
      {path.length > 0 && <circle cx={pos(path[0]).x} cy={pos(path[0]).y} r={40} fill="none" stroke="#1f2340" strokeWidth={7} strokeDasharray="12 9" />}
    </svg>
  )
}

function Component({ value, onChange, target, locked }: { value: V; onChange: (v: V) => void; config: ManipulativeConfig; target?: Record<string, unknown>; locked?: boolean }) {
  const hidden = hiddenOf(target)
  const jumpTask = !!target && typeof target.from === 'number'
  const answerTask = hidden.length > 0
  const paintTask = !!target && Array.isArray(target.cells)
  const [tool, setTool] = useState<Tool>(jumpTask ? 'zipla' : 'boya')
  const [color, setColor] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const [sel, setSel] = useState<number | null>(hidden[0] ?? null)
  const paintRef = useRef<{ mode: 'add' | 'del'; seen: Set<number>; paint: Record<number, number> } | null>(null)
  const { start } = value
  const nums = Array.from({ length: 100 }, (_, i) => start + i)
  const inPage = (v: number) => v >= start && v < start + 100
  const free = !target
  const covered = new Set([...value.cover, ...hidden])
  const last = value.path[value.path.length - 1]

  const set = (patch: Partial<V>) => !locked && onChange({ ...value, ...patch })

  const explainReveal = (v: number) => {
    const opts: string[] = []
    const vis = (x: number) => inPage(x) && !covered.has(x)
    const col = (v - start) % 10
    if (vis(v - 10)) opts.push(`Üstündeki ${ek(v - 10, 'abl')} 10 fazla`)
    if (col > 0 && vis(v - 1)) opts.push(`Solundaki ${ek(v - 1, 'abl')} 1 fazla`)
    if (vis(v + 10)) opts.push(`Altındaki ${ek(v + 10, 'abl')} 10 eksik`)
    if (col < 9 && vis(v + 1)) opts.push(`Sağındaki ${ek(v + 1, 'abl')} 1 eksik`)
    return `${v}: ${opts.slice(0, 2).join(' · ') || 'komşuları da kapalıydı!'}`
  }

  const tapCell = (v: number) => {
    if (locked) return
    if (answerTask) {
      if (hidden.includes(v)) setSel(v)
      return
    }
    if (tool === 'zipla') {
      if (!value.path.length) return set({ path: [v] })
      if (v === last) return set({ path: value.path.length > 1 ? value.path.slice(0, -1) : [] })
      return set({ path: [...value.path, ...route(last, v, start)] })
    }
    if (tool === 'sakla') {
      const cover = value.cover.includes(v) ? value.cover.filter((x) => x !== v) : [...value.cover, v]
      setNote(null)
      return set({ cover })
    }
    if (value.cover.includes(v)) {
      setNote(explainReveal(v))
      return set({ cover: value.cover.filter((x) => x !== v) })
    }
  }

  // ── boyama (dokun / kaydır) ──
  const paintAt = (v: number) => {
    const st = paintRef.current
    if (!st || st.seen.has(v) || !inPage(v) || covered.has(v)) return
    st.seen.add(v)
    if (st.mode === 'add') st.paint[v] = color
    else delete st.paint[v]
    onChange({ ...value, paint: { ...st.paint } })
  }
  const cellFrom = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-n]') as HTMLElement | null
    return el ? Number(el.dataset.n) : null
  }
  const painting = (tool === 'boya' || tool === 'sil') && !answerTask && !jumpTask && !locked
  const onDown = (e: RPE<HTMLDivElement>) => {
    if (!painting || e.button > 0) return
    const v = cellFrom(e.clientX, e.clientY)
    if (v === null || covered.has(v)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const mode = tool === 'sil' || value.paint[v] === color ? 'del' : 'add'
    paintRef.current = { mode, seen: new Set(), paint: { ...value.paint } }
    paintAt(v)
  }
  const onMove = (e: RPE<HTMLDivElement>) => {
    if (!paintRef.current) return
    const v = cellFrom(e.clientX, e.clientY)
    if (v !== null) paintAt(v)
  }
  const onUp = () => (paintRef.current = null)

  const fillMultiples = (k: number) => {
    const paint = { ...value.paint }
    nums.forEach((v) => { if (v % k === 0 && !covered.has(v)) paint[v] = color })
    set({ paint })
  }
  const randomHide = () => {
    const pool = nums.filter((v) => (v - start) % 10 !== 0 || Math.random() < 0.3)
    const pick = new Set<number>()
    while (pick.size < 8) pick.add(pool[Math.floor(Math.random() * pool.length)])
    setNote(null)
    set({ cover: [...pick] })
  }
  const type = (d: string) => {
    if (sel === null || locked) return
    const cur = value.answers[sel] ?? ''
    const next = d === '⌫' ? cur.slice(0, -1) : (cur + d).slice(0, 3)
    onChange({ ...value, answers: { ...value.answers, [sel]: next } })
  }

  const neighbors = tool === 'zipla' && last !== undefined && !locked ? { [last - 10]: '−10', [last + 10]: '+10', ...((last - start) % 10 > 0 ? { [last - 1]: '−1' } : {}), ...((last - start) % 10 < 9 ? { [last + 1]: '+1' } : {}) } : {}

  const groups = COLORS.map((_, ci) => Object.entries(value.paint).filter(([, c]) => c === ci).map(([k]) => Number(k))).map((cells, ci) => ({ ci, cells })).filter((g) => g.cells.length)

  return (
    <div className="flex flex-col items-center gap-3">
      {free && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {[1, 0, 101].map((s) => (
            <ToolButton key={s} active={start === s} onClick={() => onChange({ start: s, paint: {}, cover: [], path: [], answers: {} })}>{s === 1 ? '1–100' : s === 0 ? '0–99' : '101–200'}</ToolButton>
          ))}
        </div>
      )}
      {!answerTask && !jumpTask && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ToolButton active={tool === 'boya'} onClick={() => setTool('boya')}><Paintbrush size={16} />Boya</ToolButton>
          <ToolButton active={tool === 'sil'} onClick={() => setTool('sil')}><Eraser size={16} />Sil</ToolButton>
          {free && <ToolButton active={tool === 'sakla'} onClick={() => setTool('sakla')}><EyeOff size={16} />Sakla</ToolButton>}
          {free && <ToolButton active={tool === 'zipla'} onClick={() => setTool('zipla')}><Footprints size={16} />Zıpla</ToolButton>}
        </div>
      )}
      {(tool === 'boya' || tool === 'sil') && !answerTask && !jumpTask && (
        <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Renk">
          {COLORS.slice(0, paintTask ? 1 : COLORS.length).map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={color === i} aria-label={COLOR_NAMES[i]} onClick={() => { setColor(i); setTool('boya') }} className={`size-12 rounded-full ring-offset-2 transition active:scale-90 ${color === i && tool === 'boya' ? 'ring-4 ring-ink' : 'ring-1 ring-line'}`} style={{ background: c }} />
          ))}
        </div>
      )}

      <div className="relative w-full max-w-[640px]">
        <div
          className="grid grid-cols-10 overflow-hidden rounded-2xl border-2 border-ink bg-white"
          style={{ touchAction: painting ? 'none' : 'manipulation' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="grid"
          aria-label="Yüzlük tablo"
        >
          {nums.map((v, i) => {
            const pc = value.paint[v]
            const isCov = covered.has(v)
            const isHid = hidden.includes(v)
            const nb = neighbors[v]
            const onPath = value.path.includes(v)
            const ans = value.answers[v]
            return (
              <button
                key={v}
                type="button"
                data-n={v}
                onClick={(e) => { if (isCov) return tapCell(v); if (painting && e.detail !== 0) return; if (painting) { const paint = { ...value.paint }; if (paint[v] === color) delete paint[v]; else paint[v] = color; return set({ paint }) } tapCell(v) }}
                className={`relative flex aspect-square items-center justify-center text-[13px] font-black tabular-nums select-none sm:text-xl ${i % 10 < 9 ? 'border-r' : ''} ${i < 90 ? 'border-b' : ''} border-slate-300 ${(i % 10 === 4) ? 'border-r-2 border-r-slate-400' : ''} ${Math.floor(i / 10) === 4 ? 'border-b-2 border-b-slate-400' : ''}`}
                style={{ background: pc !== undefined && !isCov ? COLORS[pc] : onPath ? '#fef3c7' : undefined }}
                aria-label={isCov ? `kapalı kart${isHid && ans ? `, cevap ${ans}` : ''}` : String(v)}
              >
                {isCov ? (
                  <span className={`absolute inset-[3px] flex items-center justify-center rounded-lg text-white shadow-[0_2px_0_#7a1f43] ${isHid ? (sel === v ? 'bg-brand ring-4 ring-ink' : 'bg-brand') : 'bg-gradient-to-br from-[#e86a98] to-[#b8376a]'}`}>
                    {isHid ? (ans ? <span className="text-sm sm:text-2xl">{ans}</span> : '?') : locked && target ? v : ''}
                  </span>
                ) : (
                  <span className={pc !== undefined ? 'text-ink' : 'text-ink/85'}>{v}</span>
                )}
                {nb && !isCov && <span className="absolute -top-0.5 right-0.5 rounded px-0.5 text-[9px] font-black text-white sm:text-[11px]" style={{ background: nb.includes('10') ? TENS : ONES }}>{nb}</span>}
              </button>
            )
          })}
        </div>
        {value.path.length > 0 && <Arrows path={value.path} start={start} />}
      </div>

      {answerTask && !locked && (
        <div className="flex w-full max-w-md flex-col items-center gap-2">
          <p className="text-center text-sm font-bold text-ink-soft">{hidden.length > 1 ? 'Bir karta dokun, altındaki sayıyı yaz.' : 'Kartın altındaki sayıyı yaz. Komşularına bak!'}</p>
          <div className="grid w-full grid-cols-6 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'].map((d) => (
              <button key={d} type="button" onClick={() => type(d)} className={`min-h-12 rounded-xl bg-white text-xl font-black ring-1 ring-line active:scale-95 ${d === '⌫' ? 'col-span-2 grid place-items-center' : ''}`} aria-label={d === '⌫' ? 'Sil' : d}>
                {d === '⌫' ? <Delete size={22} /> : d}
              </button>
            ))}
          </div>
        </div>
      )}

      {tool === 'zipla' && !locked && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {([-10, -1, 1, 10] as const).map((d) => {
            const nx = last + d
            const ok = last !== undefined && inPage(nx) && !(Math.abs(d) === 1 && Math.floor((nx - start) / 10) !== Math.floor((last - start) / 10))
            return <ToolButton key={d} disabled={!ok} onClick={() => set({ path: [...value.path, nx] })}><span style={{ color: Math.abs(d) === 10 ? TENS : ONES }}>{d > 0 ? `+${d}` : `−${-d}`}</span></ToolButton>
          })}
          <ToolButton disabled={value.path.length < 2 || jumpTask && value.path.length < 2} onClick={() => set({ path: value.path.slice(0, -1) })}>Geri al</ToolButton>
          {!jumpTask && <ToolButton disabled={!value.path.length} onClick={() => set({ path: [] })}><Trash2 size={16} />Yolu sil</ToolButton>}
        </div>
      )}
      {tool === 'zipla' && !value.path.length && <p className="text-center text-sm font-bold text-ink-soft">Başlamak için bir sayıya dokun. Sonra komşulara ya da uzak bir sayıya dokun.</p>}

      {free && tool === 'boya' && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Katlarını boya</span>
          {[2, 3, 4, 5, 9, 10, 11].map((k) => <ToolButton key={k} onClick={() => fillMultiples(k)}>{k}</ToolButton>)}
          <ToolButton disabled={!groups.length} onClick={() => set({ paint: {} })}><Trash2 size={16} />Temizle</ToolButton>
        </div>
      )}
      {free && tool === 'sakla' && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ToolButton onClick={randomHide}><Shuffle size={16} />Rastgele 8 kart sakla</ToolButton>
          <ToolButton disabled={!value.cover.length} onClick={() => set({ cover: [] })}>Hepsini aç</ToolButton>
        </div>
      )}
      {free && tool === 'sakla' && <p className="text-center text-sm font-bold text-ink-soft">Kapatmak için hücreye dokun. Sonra “Boya”ya geç ve kapalı karta dokun: açılırken nasıl bulunacağı yazılır.</p>}
      {free && tool !== 'sakla' && value.cover.length > 0 && <p className="text-center text-sm font-bold text-ink-soft">Kapalı kartın altında hangi sayı var? Tahmin et, sonra karta dokun.</p>}

      {note && free && <div className="rounded-2xl bg-brand-soft px-4 py-2 text-center text-base font-extrabold text-brand-ink">{note}</div>}

      {(free || locked) && tool === 'zipla' && value.path.length > 0 && (
        <div className="mx-auto w-fit max-w-full rounded-2xl bg-ink px-4 py-2 text-center font-extrabold text-white tabular-nums"><JumpSummary path={value.path} /></div>
      )}
      {free && tool !== 'zipla' && groups.length > 0 && (
        <div className="w-full max-w-xl space-y-1.5 rounded-2xl bg-ink px-4 py-3 text-white">
          {groups.map(({ ci, cells }) => {
            const d = describe(cells)
            const s = [...cells].sort((a, b) => a - b)
            return (
              <div key={ci} className="flex items-start gap-2.5">
                <span className="mt-1 size-4 shrink-0 rounded-full" style={{ background: COLORS[ci] }} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white/80 tabular-nums">{s.length} sayı: {s.slice(0, 8).join(', ')}{s.length > 8 ? ', …' : ''}</div>
                  {d?.map((t) => <div key={t} className="text-base font-extrabold">{t}</div>)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const yuzluk: ToolDef<V> = {
  id: 'yuzluk',
  defaultConfig: { min: 1 },
  initial: (config, target) => {
    const start = [0, 1, 101].includes(config.min ?? 1) ? (config.min ?? 1) : 1
    const cover = target && Array.isArray(target.cover) ? (target.cover as number[]) : []
    const path = target && typeof target.from === 'number' ? [n(target, 'from')] : []
    return { start, paint: {}, cover, path, answers: {} }
  },
  check: (v, t) => {
    if (Array.isArray(t.cells)) {
      const want = new Set(t.cells as number[])
      const got = Object.keys(v.paint).map(Number)
      return got.length === want.size && got.every((x) => want.has(x))
    }
    const hid = hiddenOf(t)
    if (hid.length) {
      return hid.every((h) => {
        const exp = hid.length === 1 && typeof t.answer === 'number' ? n(t, 'answer') : h
        return Number(v.answers[h]) === exp && (v.answers[h] ?? '') !== ''
      })
    }
    if (typeof t.to === 'number') {
      const lastV = v.path[v.path.length - 1]
      if (lastV !== n(t, 'to') || v.path[0] !== n(t, 'from')) return false
      return typeof t.maxJumps !== 'number' || v.path.length - 1 <= n(t, 'maxJumps')
    }
    return false
  },
  Component,
}
