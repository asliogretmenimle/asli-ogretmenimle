import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CornerUpLeft, CornerUpRight, Play, Repeat, SkipForward, Trash2, Undo2, X, type LucideIcon } from 'lucide-react'
import type { Grade } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { Hud, Toast, starsFor, type GameProps } from './kit'

type Basic = 'U' | 'D' | 'L' | 'R' | 'F' | 'TL' | 'TR'
/** Tek komut ya da "Tekrarla" bloğu */
type Cmd = Basic | { body: Basic[]; n: number }
type Dir = 0 | 1 | 2 | 3
type Pt = [number, number]

const DX = [0, 1, 0, -1]
const DY = [-1, 0, 1, 0]
const ABS: Partial<Record<Basic, Dir>> = { U: 0, R: 1, D: 2, L: 3 }
const FACING = ['yukarı', 'sağa', 'aşağı', 'sola']
const LABEL: Record<Basic, string> = { U: 'İleri', D: 'Geri', L: 'Sol', R: 'Sağ', F: 'İleri', TL: 'Sola dön', TR: 'Sağa dön' }
const WORD: Partial<Record<Basic, string>> = { U: 'ileri', D: 'geri', L: 'sola', R: 'sağa' }
const ICON: Record<Basic, LucideIcon> = { U: ArrowUp, D: ArrowDown, L: ArrowLeft, R: ArrowRight, F: ArrowUp, TL: CornerUpLeft, TR: CornerUpRight }
const LEVELS = 5
const STEP_MS = 420
const CELL = 60

interface Level {
  n: number
  start: Pt
  goal: Pt
  face: Dir
  blocks: Map<string, string>
  gems: Pt[]
  /** best[maske]: o elmaslar toplanarak yıldıza giden en kısa program */
  best: number[]
}

const key = (x: number, y: number) => `${x},${y}`

/** BFS: her elmas maskesi için yıldıza en kısa komut sayısı */
function solve(lv: Omit<Level, 'best'>, rel: boolean): number[] {
  const { n } = lv
  const M = 1 << lv.gems.length
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && !lv.blocks.has(key(x, y))
  const id = (x: number, y: number, f: number, m: number) => ((y * n + x) * 4 + f) * M + m
  const dist = new Array<number>(n * n * 4 * M).fill(-1)
  const best = new Array<number>(M).fill(Infinity)
  const q: [number, number, number, number][] = [[lv.start[0], lv.start[1], lv.face, 0]]
  dist[id(lv.start[0], lv.start[1], lv.face, 0)] = 0
  for (let h = 0; h < q.length; h++) {
    const [x, y, f, m] = q[h]
    const d = dist[id(x, y, f, m)]
    if (x === lv.goal[0] && y === lv.goal[1]) {
      best[m] = Math.min(best[m], d)
      continue
    }
    const next: [number, number, number][] = rel
      ? [[x + DX[f], y + DY[f], f], [x, y, (f + 3) % 4], [x, y, (f + 1) % 4]]
      : [0, 1, 2, 3].map((k) => [x + DX[k], y + DY[k], f])
    for (const [nx, ny, nf] of next) {
      if (!free(nx, ny)) continue
      const g = lv.gems.findIndex(([gx, gy]) => gx === nx && gy === ny)
      const nm = g >= 0 ? m | (1 << g) : m
      const k = id(nx, ny, nf, nm)
      if (dist[k] < 0) {
        dist[k] = d + 1
        q.push([nx, ny, nf, nm])
      }
    }
  }
  return best
}

function makeLevel(grade: Grade, idx: number): Level {
  const n = grade === 1 ? 4 : grade === 2 ? 5 : 6
  const rel = grade >= 3
  const nBlocks = [[2, 3, 3, 4, 4], [4, 5, 5, 6, 7], [6, 7, 8, 8, 9], [6, 7, 8, 9, 10]][grade - 1][idx]
  const nGems = grade === 1 ? (idx >= 2 ? 1 : 0) : grade === 2 ? (idx >= 1 ? 1 : 0) : idx >= 3 ? 2 : idx >= 1 ? 1 : 0
  const cap = grade === 1 ? 9 : grade === 2 ? 13 : 15
  const minMd = n === 4 ? 3 : n - 1 + Math.min(idx, 1)
  const cells: Pt[] = Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)])
  for (let t = 0; t < 3000; t++) {
    const strict = t < 1500
    const c = shuffle(cells)
    const [start, goal] = c
    const md = Math.abs(start[0] - goal[0]) + Math.abs(start[1] - goal[1])
    if (md < minMd) continue
    const base = {
      n, start, goal,
      face: (rel ? randInt(0, 3) : 0) as Dir,
      blocks: new Map(c.slice(2, 2 + nBlocks).map(([x, y]) => [key(x, y), pick(['🪨', '🌳'])])),
      gems: c.slice(2 + nBlocks, 2 + nBlocks + nGems),
    }
    const best = solve(base, rel)
    const any = Math.min(...best)
    const all = best[best.length - 1]
    if (!Number.isFinite(all) || all > cap) continue
    // Engeller dolaşmayı gerektirsin
    if (strict && idx >= 2 && !rel && any <= md) continue
    // Elmas yoldan çok uzak olmasın
    if (strict && nGems && all - any > 5) continue
    return { ...base, best }
  }
  // Yedek: engelsiz basit bölüm
  const base = { n, start: [0, n - 1] as Pt, goal: [n - 1, 0] as Pt, face: 0 as Dir, blocks: new Map<string, string>(), gems: [] as Pt[] }
  return { ...base, best: solve(base, rel) }
}

const expand = (prog: Cmd[]) => prog.flatMap((c, i) => (typeof c === 'string' ? [c] : Array.from({ length: c.n }, () => c.body).flat()).map((b) => ({ b, i })))
const blockCount = (prog: Cmd[]) => prog.reduce((s, c) => s + (typeof c === 'string' ? 1 : 1 + c.body.length), 0)

interface Frame { x: number; y: number; rot: number; chip: number; got: number[] }
interface Trace { frames: Frame[]; result: 'win' | 'bump' | 'short'; why?: string; got: number[] }

/** Programı baştan sona çalıştırıp her adımın karesini çıkarır */
function trace(lv: Level, prog: Cmd[], rel: boolean): Trace {
  let [x, y] = lv.start
  let f: Dir = lv.face
  let rot = f * 90
  const got: number[] = []
  const frames: Frame[] = [{ x, y, rot, chip: -1, got: [] }]
  for (const { b, i } of expand(prog)) {
    if (b === 'TL' || b === 'TR') {
      f = ((f + (b === 'TL' ? 3 : 1)) % 4) as Dir
      rot += b === 'TL' ? -90 : 90
      frames.push({ x, y, rot, chip: i, got: [...got] })
      continue
    }
    const d = rel ? f : ABS[b]!
    const nx = x + DX[d], ny = y + DY[d]
    const out = nx < 0 || ny < 0 || nx >= lv.n || ny >= lv.n
    const hit = out ? undefined : lv.blocks.get(key(nx, ny))
    if (out || hit) {
      // Çarpma: biraz ilerleyip geri sekiyor
      frames.push({ x: x + DX[d] * 0.3, y: y + DY[d] * 0.3, rot, chip: i, got: [...got] })
      frames.push({ x, y, rot, chip: i, got: [...got] })
      const what = out ? 'tahtanın kenarına' : hit === '🌳' ? 'ağaca' : 'kayaya'
      const why = rel ? `${i + 1}. komutta robot ${FACING[f]} bakıyordu, ileri gidince ${what} çarptı!` : `${i + 1}. komutta robot ${what} çarptı!`
      return { frames, result: 'bump', why, got }
    }
    x = nx
    y = ny
    const g = lv.gems.findIndex(([gx, gy]) => gx === x && gy === y)
    if (g >= 0 && !got.includes(g)) got.push(g)
    frames.push({ x, y, rot, chip: i, got: [...got] })
    if (x === lv.goal[0] && y === lv.goal[1]) return { frames, result: 'win', got }
  }
  return { frames, result: 'short', got }
}

const INSIGHT: Record<number, string> = {
  1: 'Robota “ileri, geri, sağ, sol” diyerek yol gösterdin. Sınıfta bir arkadaşını kapıya götüren komutları sen yazabilir misin?',
  2: 'Adımları sayıp grupladın: “3 adım sağa” gibi. Aynı yere daha az adımla giden başka bir yol var mıydı?',
  3: 'Robotun nereye baktığı, “sağa dön” komutunun sonucunu değiştirir. Robot sana doğru bakarken onun sağı senin hangi tarafın olur?',
  4: 'Tekrarla bloğu aynı komutları yeniden yazmaktan kurtarır. Kodunda örüntü gibi tekrar eden kısımları fark ettin mi?',
}

export default function RobotCode({ grade, onFinish }: GameProps) {
  const rel = grade >= 3
  const [levels] = useState(() => Array.from({ length: LEVELS }, (_, i) => makeLevel(grade, i)))
  const [li, setLi] = useState(0)
  const [prog, setProg] = useState<Cmd[]>([])
  const [run, setRun] = useState<{ t: Trace; i: number } | null>(null)
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'bad' | 'info' } | null>(null)
  const [fails, setFails] = useState(0)
  const [won, setWon] = useState<string[] | null>(null)
  const [score, setScore] = useState(0)
  const stats = useRef({ solved: 0, gems: 0, over: false })
  const handled = useRef<Trace | null>(null)
  const lv = levels[li]
  const maxScore = levels.reduce((s, l) => s + 15 + l.gems.length * 5 + (grade === 4 ? 3 : 0), 0)
  const unit = grade === 2 ? 'adım' : grade === 4 ? 'blok' : 'komut'
  const len = grade === 4 ? blockCount(prog) : expand(prog).length
  const full = len >= (rel ? 22 : 24)
  const running = !!run && run.i < run.t.frames.length - 1

  // Robotu kare kare yürüt
  useEffect(() => {
    if (!run || run.i >= run.t.frames.length - 1) return
    const t = setTimeout(() => setRun((r) => r && { ...r, i: r.i + 1 }), STEP_MS)
    return () => clearTimeout(t)
  }, [run])

  // Program bitince sonucu değerlendir
  useEffect(() => {
    if (!run || run.i < run.t.frames.length - 1 || handled.current === run.t) return
    handled.current = run.t
    const t = run.t
    if (t.result !== 'win') {
      sfx.bad()
      setFails((f) => f + 1)
      setMsg({ text: t.result === 'bump' ? t.why! : 'Komutlar bitti ama robot yıldıza ulaşamadı. Yıldıza daha kaç adım var?', tone: 'bad' })
      return
    }
    sfx.ok()
    const target = lv.best[t.got.reduce((m, g) => m | (1 << g), 0)]
    const base = Math.max(4, 10 - fails * 2)
    const lines = [`⭐ Yıldıza ulaştın: +${base}`]
    let pts = base
    if (t.got.length) {
      pts += t.got.length * 5
      lines.push(`💎 ${t.got.length} elmas: +${t.got.length * 5}`)
    }
    if (len <= target) {
      pts += 5
      lines.push(`⚡ En kısa program (${len} ${unit}): +5`)
    } else {
      lines.push(`Senin programın ${len} ${unit}; ${target} ${unit} ile de olurdu.`)
    }
    if (grade === 4 && prog.some((c) => typeof c !== 'string')) {
      pts += 3
      lines.push('🔁 Tekrarla kullandın: +3')
    }
    setScore((s) => s + pts)
    stats.current.solved++
    stats.current.gems += t.got.length
    setWon(lines)
    setMsg(null)
  }, [run])

  const finish = () => {
    const s = stats.current
    if (s.over) return
    s.over = true
    onFinish({
      stars: starsFor(score / maxScore),
      score,
      summary: `${s.solved}/${LEVELS} bölümü tamamladın${s.gems ? `, ${s.gems} elmas topladın` : ''}.`,
      insight: INSIGHT[grade],
    })
  }

  const next = () => {
    if (li + 1 >= LEVELS) return finish()
    setLi(li + 1)
    setProg([])
    setRun(null)
    setMsg(null)
    setFails(0)
    setWon(null)
  }

  const edit = (p: Cmd[]) => {
    setProg(p)
    setRun(null)
    setMsg(null)
  }
  const add = (b: Basic) => {
    if (full) return setMsg({ text: 'Program doldu! Önce birkaç komut sil.', tone: 'info' })
    edit([...prog, b])
  }
  const last = prog[prog.length - 1]
  const prev = prog[prog.length - 2]
  const canRep2 = (typeof last === 'string' && typeof prev === 'string') || (last !== undefined && typeof last !== 'string' && last.body.length === 2)
  const repeat = (two: boolean) => {
    if (last === undefined) return
    if (typeof last !== 'string') return edit([...prog.slice(0, -1), { ...last, n: last.n >= 4 ? 2 : last.n + 1 }])
    if (full) return setMsg({ text: 'Program doldu! Önce birkaç komut sil.', tone: 'info' })
    if (!two) return edit([...prog.slice(0, -1), { body: [last], n: 2 }])
    if (typeof prev === 'string') edit([...prog.slice(0, -2), { body: [prev, last], n: 2 }])
  }
  const play = () => {
    if (!prog.length || running) return
    setMsg(null)
    setRun({ t: trace(lv, prog, rel), i: 0 })
  }

  const fr: Frame = run ? run.t.frames[run.i] : { x: lv.start[0], y: lv.start[1], rot: lv.face * 90, chip: -1, got: [] }
  const trail = run ? run.t.frames.slice(0, run.i + 1) : []

  // Program çipleri (2. sınıfta aynı yöndeki adımlar gruplanır)
  const chips: { k: string; label: ReactNode; aria: string; active: boolean; remove: () => void }[] = []
  if (grade === 2) {
    const groups: { b: Basic; from: number; to: number }[] = []
    prog.forEach((c, i) => {
      const g = groups[groups.length - 1]
      if (g && g.b === c && g.to === i - 1) g.to = i
      else groups.push({ b: c as Basic, from: i, to: i })
    })
    for (const g of groups) {
      const Icon = ICON[g.b]
      const text = `${g.to - g.from + 1} adım ${WORD[g.b]}`
      chips.push({ k: `${g.from}`, label: <><Icon size={16} />{text}</>, aria: `${text}: bir adım sil`, active: fr.chip >= g.from && fr.chip <= g.to, remove: () => edit(prog.filter((_, j) => j !== g.to)) })
    }
  } else {
    prog.forEach((c, i) => {
      const text = typeof c === 'string' ? LABEL[c] : `×${c.n}: ${c.body.map((b) => LABEL[b]).join(', ')}`
      const Icon = typeof c === 'string' ? ICON[c] : Repeat
      chips.push({ k: `${i}`, label: <><Icon size={16} />{text}</>, aria: `${i + 1}. komut, ${typeof c === 'string' ? text : `tekrarla ${text}`}: sil`, active: fr.chip === i, remove: () => edit(prog.filter((_, j) => j !== i)) })
    })
  }

  const pad: Basic[] = rel ? ['TL', 'F', 'TR'] : ['U', 'L', 'D', 'R']
  const cells = Array.from({ length: lv.n * lv.n }, (_, i) => [i % lv.n, Math.floor(i / lv.n)] as Pt)
  const mid = (v: number) => v * CELL + CELL / 2

  return (
    <div className="animate-fade-up">
      <Hud round={li + 1} rounds={LEVELS} score={score} extra={lv.gems.length > 0 ? <span className="chip bg-sky-50 px-3 py-1.5 text-sm text-sky-700 ring-1 ring-sky-200">💎 {fr.got.length}/{lv.gems.length}</span> : undefined} />
      <div className="mb-3 rounded-2xl bg-ink px-4 py-2.5 text-center text-white">
        <p className="text-lg font-black">Robotu ⭐ yıldıza götür!</p>
        <p className="text-sm font-bold text-white/75">
          {rel ? `Robot şu an ${FACING[lv.face]} bakıyor. ` : ''}
          {lv.gems.length ? 'Elmasları da toplarsan ek puan!' : rel ? '' : 'Ok düğmeleriyle program yaz.'}
        </p>
      </div>

      <svg viewBox={`0 0 ${lv.n * CELL} ${lv.n * CELL}`} className="mx-auto block w-full max-w-[360px] rounded-2xl bg-white ring-1 ring-sky-200 select-none" role="img" aria-label="Robotun oyun tahtası">
        {cells.map(([x, y]) => (
          <rect key={key(x, y)} x={x * CELL + 2} y={y * CELL + 2} width={CELL - 4} height={CELL - 4} rx={10} fill={x === lv.goal[0] && y === lv.goal[1] ? '#fef3c7' : (x + y) % 2 ? '#e0f2fe' : '#f0f9ff'} />
        ))}
        <text x={mid(lv.goal[0])} y={mid(lv.goal[1]) + 2} fontSize={34} textAnchor="middle" dominantBaseline="central">⭐</text>
        {[...lv.blocks].map(([k, e]) => {
          const [x, y] = k.split(',').map(Number)
          return <text key={k} x={mid(x)} y={mid(y) + 2} fontSize={34} textAnchor="middle" dominantBaseline="central">{e}</text>
        })}
        {lv.gems.map(([x, y], i) => !fr.got.includes(i) && <text key={i} x={mid(x)} y={mid(y) + 2} fontSize={28} textAnchor="middle" dominantBaseline="central">💎</text>)}
        {trail.length > 1 && <polyline points={trail.map((p) => `${mid(p.x)},${mid(p.y)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 9" opacity={0.6} />}
        <g key={li} style={{ transform: `translate(${fr.x * CELL}px, ${fr.y * CELL}px)`, transition: `transform ${STEP_MS - 100}ms ease-in-out` }}>
          <g transform={`translate(${CELL / 2} ${CELL / 2})`}>
            <g style={{ transform: `rotate(${fr.rot}deg)`, transition: 'transform 300ms ease-in-out' }}>
              <circle r={25} fill="#dbeafe" stroke="#2563eb" strokeWidth={2.5} />
              {rel && <path d="M0 -31 L-9 -18 L9 -18 Z" fill="#2563eb" />}
            </g>
            <text y={2} fontSize={30} textAnchor="middle" dominantBaseline="central">🤖</text>
          </g>
        </g>
      </svg>

      <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-line">
        <div className="mb-2 flex items-center justify-between text-xs font-extrabold tracking-wide text-ink-soft uppercase">
          <span>Program</span>
          {prog.length > 0 && <span className="normal-case">Toplam: {len} {unit}</span>}
        </div>
        {chips.length === 0 ? (
          <p className="py-2 text-center text-sm font-bold text-ink-soft">Aşağıdaki düğmelerle komut ekle.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <button key={c.k} type="button" onClick={c.remove} disabled={running || !!won} aria-label={c.aria} className={`chip min-h-11 gap-1 px-3 text-sm ring-1 transition ${c.active ? 'bg-blue-600 text-white ring-blue-600 animate-pop' : 'bg-blue-50 text-blue-800 ring-blue-200'}`}>
                <span className="text-[11px] opacity-60">{i + 1}.</span>
                {c.label}
                {!running && !won && <X size={12} className="opacity-50" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {msg && <Toast text={msg.text} tone={msg.tone} />}

      {won ? (
        <div className="card mt-3 p-4 text-center animate-pop">
          <p className="text-xl font-black">Bölüm tamam! 🎉</p>
          <ul className="mt-2 space-y-1 text-sm font-bold text-ink-soft">
            {won.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
          <button type="button" onClick={next} className="btn-primary mt-3 w-full">{li + 1 >= LEVELS ? 'Sonuçları gör' : 'Sonraki bölüm'}<SkipForward size={18} /></button>
        </div>
      ) : (
        <div className="mt-3">
          <div className="grid grid-cols-3 gap-2">
            {pad.map((b) => {
              const Icon = ICON[b]
              return (
                <button key={b} type="button" onClick={() => add(b)} disabled={running} className={`flex min-h-14 flex-col items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-blue-700 shadow-sm ring-1 ring-blue-200 transition active:scale-95 disabled:opacity-40 ${b === 'U' ? 'col-start-2' : b === 'L' ? 'col-start-1' : ''}`}>
                  <Icon size={22} strokeWidth={2.75} />{LABEL[b]}
                </button>
              )
            })}
          </div>
          {grade === 4 && (
            <>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => repeat(false)} disabled={running || !last} className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-2 text-sm font-extrabold text-amber-800 ring-1 ring-amber-200 transition active:scale-95 disabled:opacity-40">
                  <Repeat size={18} />Son komutu tekrarla
                </button>
                <button type="button" onClick={() => repeat(true)} disabled={running || !canRep2} className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-2 text-sm font-extrabold text-amber-800 ring-1 ring-amber-200 transition active:scale-95 disabled:opacity-40">
                  <Repeat size={18} />Son 2’yi tekrarla
                </button>
              </div>
              <p className="mt-1 text-center text-xs font-bold text-ink-soft">Tekrarla bloğuna yeniden dokunursan ×2 → ×3 → ×4 olur.</p>
            </>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => edit(prog.slice(0, -1))} disabled={running || !prog.length} className="btn-ghost px-3" aria-label="Son komutu geri al"><Undo2 size={20} /></button>
            <button type="button" onClick={() => edit([])} disabled={running || !prog.length} className="btn-ghost px-3" aria-label="Programı temizle"><Trash2 size={20} /></button>
            <button type="button" onClick={play} disabled={running || !prog.length} className="btn-primary flex-1"><Play size={18} fill="currentColor" />Çalıştır</button>
          </div>
          {fails >= 3 && !running && (
            <button type="button" onClick={next} className="mx-auto mt-3 block text-sm font-extrabold text-ink-soft underline underline-offset-4">Bu bölümü geç</button>
          )}
        </div>
      )}
    </div>
  )
}
