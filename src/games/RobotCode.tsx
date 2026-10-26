import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bug, Compass, CornerUpLeft, CornerUpRight, Crosshair, Lightbulb, Play, Repeat, RotateCcw, Route, SkipForward, StepForward, Trash2, Undo2, X, type LucideIcon } from 'lucide-react'
import type { Grade } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { useTracker } from '../lib/trackerContext'
import { starsFor, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useSolutions } from './kit2'

/**
 * Robot Kodlama (Van de Walle): kodlama bir problem çözme ortamıdır.
 *  - Yol bul: aynı yıldıza giden farklı yollar (useSolutions), uzunluk karşılaştırma
 *  - Hatalı programı düzelt: çalıştır, izle, hatalı komutu bul ve değiştir
 *  - Tahmin et: programı çalıştırmadan robotun duracağı kareyi (ve yönünü) tahmin et
 *  - Ölçme: yürünen kare sayısı (uzunluk), çeyrek dönüş, derece
 * Süre, can ve ceza yok; başarısız bir çalıştırma bilgi demektir.
 */

type Basic = 'U' | 'D' | 'L' | 'R' | 'F' | 'TL' | 'TR'
interface Block { body: Basic[]; n: number }
type Cmd = Basic | Block
type Dir = 0 | 1 | 2 | 3
type Pt = [number, number]
type Kind = 'build' | 'multi' | 'debug' | 'predict'

const DX = [0, 1, 0, -1]
const DY = [-1, 0, 1, 0]
const ABS: Partial<Record<Basic, Dir>> = { U: 0, R: 1, D: 2, L: 3 }
const FACING = ['yukarı', 'sağa', 'aşağı', 'sola']
const FACE_ICON: LucideIcon[] = [ArrowUp, ArrowRight, ArrowDown, ArrowLeft]
const LABEL: Record<Basic, string> = { U: 'Yukarı', D: 'Aşağı', L: 'Sola', R: 'Sağa', F: 'İleri', TL: 'Sola dön', TR: 'Sağa dön' }
const WORD: Partial<Record<Basic, string>> = { U: 'yukarı', D: 'aşağı', L: 'sola', R: 'sağa' }
const ICON: Record<Basic, LucideIcon> = { U: ArrowUp, D: ArrowDown, L: ArrowLeft, R: ArrowRight, F: ArrowUp, TL: CornerUpLeft, TR: CornerUpRight }
const STEP_MS = 430
const CELL = 60

const SIZE: Record<number, number> = { 1: 4, 2: 5, 3: 5, 4: 6 }
const PLAN: Record<number, Kind[]> = {
  1: ['predict', 'build', 'debug', 'multi', 'predict', 'debug'],
  2: ['build', 'predict', 'multi', 'debug', 'multi', 'debug'],
  3: ['predict', 'build', 'debug', 'multi', 'predict', 'debug'],
  4: ['predict', 'build', 'debug', 'multi', 'predict', 'debug'],
}
const KIND_INFO: Record<Kind, { label: string; Icon: LucideIcon; cls: string }> = {
  build: { label: 'Yol bul', Icon: Route, cls: 'bg-blue-50 text-blue-800 ring-blue-200' },
  multi: { label: 'İki farklı yol', Icon: Route, cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  debug: { label: 'Hatayı bul', Icon: Bug, cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
  predict: { label: 'Tahmin et', Icon: Crosshair, cls: 'bg-violet-50 text-violet-800 ring-violet-200' },
}

interface Board {
  n: number
  start: Pt
  /** Tahmin bölümlerinde yıldız yok */
  goal: Pt | null
  face: Dir
  blocks: Map<string, string>
}
interface Measure { q: string; answer: number; choices: number[]; unit: string; hint: string }
interface Level extends Board {
  kind: Kind
  /** En kısa program (oyuncunun birimiyle) */
  best: number
  /** En kısa yolun kareleri (ipucu için) */
  path: Pt[]
  /** Hatalı / tahmin programı */
  given: Cmd[]
  bugIdx: number
  measure?: Measure
}

const key = (x: number, y: number) => `${x},${y}`
const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1]
const isBlock = (c: Cmd): c is Block => typeof c !== 'string'
const expand = (prog: Cmd[]) => prog.flatMap((c, i) => (isBlock(c) ? Array.from({ length: c.n }, () => c.body).flat() : [c]).map((b) => ({ b, i })))
const blockCount = (prog: Cmd[]) => prog.reduce((s, c) => s + (isBlock(c) ? 1 + c.body.length : 1), 0)
const isTurn = (b: Basic) => b === 'TL' || b === 'TR'

function freeCell(b: Board, x: number, y: number) {
  return x >= 0 && y >= 0 && x < b.n && y < b.n && !b.blocks.has(key(x, y))
}

/** BFS: yıldıza en kısa komut dizisi ve geçtiği kareler */
function solve(b: Board, rel: boolean): { prog: Basic[]; path: Pt[] } | null {
  if (!b.goal) return null
  const n = b.n
  const id = (x: number, y: number, f: number) => (y * n + x) * 4 + f
  const prev = new Int32Array(n * n * 4).fill(-1)
  const via: Basic[] = []
  const s0 = id(b.start[0], b.start[1], b.face)
  prev[s0] = s0
  const q = [s0]
  for (let h = 0; h < q.length; h++) {
    const s = q[h]
    const f = s % 4
    const c = (s - f) / 4
    const x = c % n
    const y = (c - x) / n
    if (x === b.goal[0] && y === b.goal[1]) {
      const prog: Basic[] = []
      const path: Pt[] = []
      for (let v = s; v !== s0; v = prev[v]) {
        prog.unshift(via[v])
        const cc = (v - (v % 4)) / 4
        path.unshift([cc % n, (cc - (cc % n)) / n])
      }
      path.unshift(b.start)
      return { prog, path: path.filter((p, i) => i === 0 || !same(p, path[i - 1])) }
    }
    const next: [number, number, number, Basic][] = rel
      ? [[x + DX[f], y + DY[f], f, 'F'], [x, y, (f + 3) % 4, 'TL'], [x, y, (f + 1) % 4, 'TR']]
      : shuffle([[x, y - 1, f, 'U'], [x + 1, y, f, 'R'], [x, y + 1, f, 'D'], [x - 1, y, f, 'L']] as [number, number, number, Basic][])
    for (const [nx, ny, nf, cmd] of next) {
      if (!freeCell(b, nx, ny)) continue
      const k = id(nx, ny, nf)
      if (prev[k] >= 0) continue
      prev[k] = s
      via[k] = cmd
      q.push(k)
    }
  }
  return null
}

/** Başlangıçtan yıldıza kaç farklı en kısa kare yolu var (en çok 10) */
function pathCount(b: Board): number {
  if (!b.goal) return 0
  const n = b.n
  const dist = new Array<number>(n * n).fill(-1)
  const cnt = new Array<number>(n * n).fill(0)
  const s = b.start[1] * n + b.start[0]
  dist[s] = 0
  cnt[s] = 1
  const q = [s]
  for (let h = 0; h < q.length; h++) {
    const c = q[h]
    const x = c % n
    const y = (c - x) / n
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d]
      if (!freeCell(b, nx, ny)) continue
      const k = ny * n + nx
      if (dist[k] < 0) {
        dist[k] = dist[c] + 1
        q.push(k)
      }
      if (dist[k] === dist[c] + 1) cnt[k] = Math.min(10, cnt[k] + cnt[c])
    }
  }
  return cnt[b.goal[1] * n + b.goal[0]]
}

/** Sınıfa göre programı sıkıştır: 2. sınıf adım grupları, 4. sınıf ileri tekrarları */
function compress(prog: Basic[], grade: Grade): Cmd[] {
  if (grade !== 2 && grade !== 4) return prog
  const out: Cmd[] = []
  for (const b of prog) {
    const last = out[out.length - 1]
    if (grade === 2) {
      if (last && isBlock(last) && last.body[0] === b) last.n++
      else out.push({ body: [b], n: 1 })
    } else if (b === 'F' && last === 'F') {
      out[out.length - 1] = { body: ['F'], n: 2 }
    } else if (b === 'F' && last && isBlock(last) && last.body.length === 1 && last.body[0] === 'F') {
      last.n++
    } else out.push(b)
  }
  return out
}

const progLen = (prog: Cmd[], grade: Grade) => (grade === 4 ? blockCount(prog) : expand(prog).length)

interface Frame { x: number; y: number; rot: number; chip: number }
interface Trace {
  frames: Frame[]
  result: 'win' | 'bump' | 'short' | 'end'
  cells: Pt[]
  moves: number
  turns: number
  face: Dir
  bump?: { chip: number; what: string; face: Dir; afterTurn: boolean }
}

/** Programı baştan sona çalıştırıp her adımın karesini çıkarır */
function trace(b: Board, prog: Cmd[], rel: boolean): Trace {
  let [x, y] = b.start
  let f: Dir = b.face
  let rot = f * 90
  let moves = 0
  let turns = 0
  let lastTurn = false
  const cells: Pt[] = [[x, y]]
  const frames: Frame[] = [{ x, y, rot, chip: -1 }]
  for (const { b: c, i } of expand(prog)) {
    if (isTurn(c)) {
      f = ((f + (c === 'TL' ? 3 : 1)) % 4) as Dir
      rot += c === 'TL' ? -90 : 90
      turns++
      lastTurn = true
      frames.push({ x, y, rot, chip: i })
      continue
    }
    const d = rel ? f : ABS[c]!
    const nx = x + DX[d], ny = y + DY[d]
    const out = nx < 0 || ny < 0 || nx >= b.n || ny >= b.n
    const hit = out ? undefined : b.blocks.get(key(nx, ny))
    if (out || hit) {
      frames.push({ x: x + DX[d] * 0.3, y: y + DY[d] * 0.3, rot, chip: i })
      frames.push({ x, y, rot, chip: i })
      const what = out ? 'tahtanın kenarına' : hit === '🌳' ? 'ağaca' : 'kayaya'
      return { frames, result: 'bump', cells, moves, turns, face: f, bump: { chip: i, what, face: f, afterTurn: lastTurn } }
    }
    x = nx
    y = ny
    moves++
    lastTurn = false
    cells.push([x, y])
    frames.push({ x, y, rot, chip: i })
    if (b.goal && x === b.goal[0] && y === b.goal[1]) return { frames, result: 'win', cells, moves, turns, face: f }
  }
  return { frames, result: b.goal ? 'short' : 'end', cells, moves, turns, face: f }
}

function randomBoard(grade: Grade, nBlocks: number): Board {
  const n = SIZE[grade]
  const c = shuffle(Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as Pt))
  return {
    n,
    start: c[0],
    goal: c[1],
    face: (grade >= 3 ? randInt(0, 3) : 0) as Dir,
    blocks: new Map(c.slice(2, 2 + nBlocks).map(([x, y]) => [key(x, y), pick(['🪨', '🌳'])])),
  }
}

const BLOCKS: Record<number, [number, number]> = { 1: [2, 3], 2: [4, 6], 3: [4, 6], 4: [6, 9] }
const CAP: Record<number, number> = { 1: 7, 2: 9, 3: 12, 4: 16 }

function makeBuild(grade: Grade, multi: boolean): Level {
  const rel = grade >= 3
  for (let t = 0; t < 4000; t++) {
    const b = randomBoard(grade, randInt(...BLOCKS[grade]))
    const md = Math.abs(b.start[0] - b.goal![0]) + Math.abs(b.start[1] - b.goal![1])
    if (md < b.n - 1) continue
    const s = solve(b, rel)
    if (!s || s.prog.length > CAP[grade]) continue
    if (multi && pathCount(b) < 2) continue
    // Tek yol bölümünde engeller biraz dolaşmayı gerektirsin
    if (!multi && t < 2000 && s.path.length - 1 === md && grade >= 2) continue
    return { ...b, kind: multi ? 'multi' : 'build', best: progLen(compress(s.prog, grade), grade), path: s.path, given: [], bugIdx: -1 }
  }
  const b: Board = { n: SIZE[grade], start: [0, SIZE[grade] - 1], goal: [SIZE[grade] - 1, 0], face: 0, blocks: new Map() }
  const s = solve(b, rel)!
  return { ...b, kind: multi ? 'multi' : 'build', best: progLen(compress(s.prog, grade), grade), path: s.path, given: [], bugIdx: -1 }
}

/** Doğru programa tek bir hata yerleştir (sonuç kazanmamalı) */
function makeBug(b: Board, correct: Cmd[], grade: Grade): { prog: Cmd[]; idx: number } | null {
  const rel = grade >= 3
  const cands: { prog: Cmd[]; idx: number; pref: number }[] = []
  const put = (i: number, c: Cmd, pref: number) => cands.push({ prog: correct.map((x, j) => (j === i ? c : x)), idx: i, pref: pref + (i === 0 ? -3 : 0) })
  correct.forEach((c, i) => {
    if (!isBlock(c)) {
      if (rel) {
        if (isTurn(c)) put(i, c === 'TL' ? 'TR' : 'TL', grade === 3 ? 3 : 1)
      } else {
        for (const a of ['U', 'D', 'L', 'R'] as Basic[]) if (a !== c) put(i, a, 1)
      }
      return
    }
    for (const dn of [-1, 1]) if (c.n + dn >= 1) put(i, { ...c, n: c.n + dn }, grade === 4 ? 3 : 2)
    if (grade === 2) {
      const nb = [correct[i - 1], correct[i + 1]].map((x) => (x && isBlock(x) ? x.body[0] : null))
      for (const a of ['U', 'D', 'L', 'R'] as Basic[]) if (a !== c.body[0] && !nb.includes(a)) put(i, { body: [a], n: c.n }, 1)
    }
  })
  const sorted = shuffle(cands).sort((p, q) => q.pref - p.pref)
  for (const c of sorted) if (trace(b, c.prog, rel).result !== 'win') return { prog: c.prog, idx: c.idx }
  return null
}

function makeDebug(grade: Grade): Level {
  const rel = grade >= 3
  for (let t = 0; t < 4000; t++) {
    const b = randomBoard(grade, randInt(...BLOCKS[grade]))
    const s = solve(b, rel)
    if (!s || s.prog.length > CAP[grade]) continue
    const correct = compress(s.prog, grade)
    if (grade === 1 && correct.length < 4) continue
    if (grade === 2 && correct.length < 3) continue
    if (grade === 3 && (s.prog.length < 5 || !s.prog.some(isTurn))) continue
    if (grade === 4 && (s.prog.length < 6 || !correct.some(isBlock) || !s.prog.some(isTurn))) continue
    const bug = makeBug(b, correct, grade)
    if (!bug) continue
    return { ...b, kind: 'debug', best: progLen(correct, grade), path: s.path, given: bug.prog, bugIdx: bug.idx }
  }
  // Yedek: basit bölüm
  const n = SIZE[grade]
  const b: Board = { n, start: [0, n - 1], goal: [n - 1, n - 1], face: (rel ? 1 : 0) as Dir, blocks: new Map() }
  const correct = compress(Array.from({ length: n - 1 }, () => (rel ? 'F' : 'R') as Basic), grade)
  const bug = makeBug(b, correct, grade) ?? { prog: correct.slice(0, -1), idx: 0 }
  return { ...b, kind: 'debug', best: progLen(correct, grade), path: [], given: bug.prog, bugIdx: bug.idx }
}

const opposite = (a: Basic, b: Basic) => (ABS[a]! + 2) % 4 === ABS[b]
const choicesFor = (ans: number, step: number) => {
  const set = new Set([ans])
  for (const d of shuffle([-1, 1, 2, -2, 3])) {
    const v = ans + d * step
    if (v > 0 && set.size < 4) set.add(v)
  }
  return [...set].sort((a, b) => a - b)
}

function predictProgram(grade: Grade): Cmd[] {
  if (grade === 1) {
    const out: Basic[] = []
    const len = randInt(3, 4)
    while (out.length < len) {
      const d = pick(['U', 'D', 'L', 'R'] as Basic[])
      if (out.length && opposite(out[out.length - 1], d)) continue
      out.push(d)
    }
    return out
  }
  if (grade === 2) {
    const out: Block[] = []
    const groups = randInt(2, 3)
    while (out.length < groups) {
      const d = pick(['U', 'D', 'L', 'R'] as Basic[])
      const last = out[out.length - 1]
      if (last && (last.body[0] === d || opposite(last.body[0], d))) continue
      out.push({ body: [d], n: randInt(1, 3) })
    }
    return out
  }
  if (grade === 3) {
    const turns = randInt(1, 3)
    const fs = randInt(3, 4)
    const out: Basic[] = ['F']
    let t = 0, f = 1
    while (t < turns || f < fs) {
      const canTurn = t < turns && !(isTurn(out[out.length - 1]) && isTurn(out[out.length - 2] ?? 'F'))
      if (canTurn && (f >= fs || Math.random() < 0.45)) {
        out.push(pick(['TL', 'TR'] as Basic[]))
        t++
      } else {
        out.push('F')
        f++
      }
    }
    if (isTurn(out[out.length - 1])) out.push('F')
    return out
  }
  return pick<Cmd[]>([
    [{ body: ['F', 'F', 'TR'], n: 4 }],
    [{ body: ['F', 'TL'], n: 4 }],
    [{ body: ['F', 'F', 'TL'], n: 2 }, 'F'],
    [{ body: ['F', 'TR', 'F', 'TL'], n: 2 }],
    [{ body: ['F', 'F', 'F', 'TR'], n: 2 }],
    ['F', { body: ['TR'], n: 2 }, 'F', 'F'],
    [{ body: ['F', 'TR'], n: 3 }],
  ])
}

function makePredict(grade: Grade): Level {
  const rel = grade >= 3
  const n = SIZE[grade]
  for (let t = 0; t < 3000; t++) {
    const prog = predictProgram(grade)
    const b: Board = { n, start: [randInt(0, n - 1), randInt(0, n - 1)], goal: null, face: (rel ? randInt(0, 3) : 0) as Dir, blocks: new Map() }
    const tr = trace(b, prog, rel)
    if (tr.result !== 'end' || tr.moves < 2) continue
    const end = tr.cells[tr.cells.length - 1]
    if (grade < 4 && same(end, b.start)) continue
    const free = shuffle(Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as Pt).filter((p) => !tr.cells.some((c) => same(c, p))))
    for (const [x, y] of free.slice(0, randInt(2, grade === 1 ? 2 : 4))) b.blocks.set(key(x, y), pick(['🪨', '🌳']))
    const measure: Measure =
      grade <= 2
        ? { q: 'Robot toplam kaç kare yürüdü?', answer: tr.moves, choices: choicesFor(tr.moves, 1), unit: 'kare', hint: grade === 1 ? 'Her ok robotu bir kare götürür. Okları tek tek say.' : 'Her gruptaki adımları topla: kaç adım, sonra kaç adım daha?' }
        : grade === 3
          ? { q: 'Robot kaç çeyrek dönüş yaptı?', answer: tr.turns, choices: choicesFor(tr.turns, 1), unit: 'çeyrek dönüş', hint: 'Her “Sola dön” ya da “Sağa dön” komutu bir çeyrek dönüştür. Dönüş komutlarını say.' }
          : { q: 'Robot toplam kaç derece döndü?', answer: tr.turns * 90, choices: choicesFor(tr.turns * 90, 90), unit: '°', hint: 'Bir çeyrek dönüş 90°. Tekrarla bloğundaki dönüşler kaç kez tekrarlanıyor?' }
    return { ...b, kind: 'predict', best: 0, path: [], given: prog, bugIdx: -1, measure }
  }
  const b: Board = { n, start: [0, n - 1], goal: null, face: 0, blocks: new Map() }
  const prog: Cmd[] = rel ? ['F', 'TR', 'F'] : ['U', 'R', 'R']
  const tr = trace(b, prog, rel)
  return { ...b, kind: 'predict', best: 0, path: [], given: prog, bugIdx: -1, measure: { q: 'Robot toplam kaç kare yürüdü?', answer: tr.moves, choices: choicesFor(tr.moves, 1), unit: 'kare', hint: 'Okları say.' } }
}

function makeLevels(grade: Grade): Level[] {
  return PLAN[grade].map((k) => (k === 'predict' ? makePredict(grade) : k === 'debug' ? makeDebug(grade) : makeBuild(grade, k === 'multi')))
}

const INSIGHT: Record<number, string> = {
  1: 'Her ok robotu bir kare götürdü. Önce kafanda yürütüp tahmin ettin, sonra çalıştırıp kontrol ettin. Hatayı bulup düzeltmek de kod yazmanın bir parçası!',
  2: 'Aynı yıldıza farklı yollardan gidilebilir. Adımları sayarak yolların uzunluğunu karşılaştırdın: uzunluk, yürünen karelerin sayısıdır.',
  3: '“Sağa dön” robotun kendi sağına göredir. Her dönüş bir çeyrek dönüş; iki çeyrek dönüş robotu tam ters yöne, dört çeyrek dönüş başladığı yöne çevirir.',
  4: 'Her çeyrek dönüş 90°. “İleri, sağa dön”ü 4 kez tekrarlayınca robot 360° döner ve bir kare çizer. Kodundaki tekrar eden örüntüler Tekrarla bloğuna dönüşür.',
}

/** Kuşbakışı robot (yukarı bakıyor) */
function RobotBot({ rel }: { rel: boolean }) {
  return (
    <g>
      <rect x={-25} y={-12} width={7} height={24} rx={3} fill="#1e293b" />
      <rect x={18} y={-12} width={7} height={24} rx={3} fill="#1e293b" />
      <rect x={-19} y={-18} width={38} height={36} rx={11} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={2.5} />
      <rect x={-13} y={-12} width={26} height={14} rx={6} fill="#dbeafe" />
      <circle cx={-6} cy={-6} r={3.6} fill="#1e3a8a" />
      <circle cx={6} cy={-6} r={3.6} fill="#1e3a8a" />
      <circle cx={-5} cy={-7.5} r={1.2} fill="#fff" />
      <circle cx={7} cy={-7.5} r={1.2} fill="#fff" />
      <rect x={-7} y={7} width={14} height={4} rx={2} fill="#93c5fd" />
      {rel ? <path d="M0 -33 L-8 -21 L8 -21 Z" fill="#f59e0b" stroke="#b45309" strokeWidth={1.5} strokeLinejoin="round" /> : <><line x1={0} y1={-18} x2={0} y2={-25} stroke="#1d4ed8" strokeWidth={2.5} /><circle cx={0} cy={-27} r={3.5} fill="#f59e0b" /></>}
    </g>
  )
}

interface Run { t: Trace; i: number; auto: boolean }
interface Say { k: number; q: string; tone: 'think' | 'ok'; mis?: string }

export default function RobotCode({ grade, onFinish }: GameProps) {
  const g = (Math.min(4, Math.max(1, grade)) as Grade)
  const rel = g >= 3
  const big = g <= 3
  const track = useTracker()
  const sol = useSolutions()
  const [levels] = useState(() => makeLevels(g))
  const [li, setLi] = useState(0)
  const lv = levels[li]
  const [prog, setProg] = useState<Cmd[]>(() => (lv.kind === 'debug' || lv.kind === 'predict' ? lv.given : []))
  const [run, setRun] = useState<Run | null>(null)
  const [say, setSay] = useState<Say | null>(null)
  const [predSay, setPredSay] = useState<Say | null>(null)
  const [done, setDone] = useState(false)
  const [fails, setFails] = useState(0)
  const [hints, setHints] = useState(0)
  const [lens, setLens] = useState<number[]>([])
  // Hata ayıklama
  const [observed, setObserved] = useState(false)
  const [edited, setEdited] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  // Tahmin
  const [guess, setGuess] = useState<Pt | null>(null)
  const [guessFace, setGuessFace] = useState<Dir | null>(null)
  const [pPhase, setPPhase] = useState<'guess' | 'run' | 'measure' | 'done'>('guess')
  const [predOk, setPredOk] = useState(false)
  const [measTries, setMeasTries] = useState(0)
  const [measPicked, setMeasPicked] = useState<number[]>([])
  const handled = useRef<Trace | null>(null)
  const usedStep = useRef(false)
  const stratLogged = useRef(new Set<string>())
  const sayK = useRef(0)
  const stats = useRef({ solved: 0, first: 0, paths: 0, bugs: 0, preds: 0, score: 0, over: false })

  const talk = (q: string, tone: 'think' | 'ok' = 'think', mis?: string) => setSay({ k: ++sayK.current, q, tone, mis })
  const unit = g === 4 ? 'blok' : g === 3 ? 'komut' : 'adım'
  const len = progLen(prog, g)
  const full = len >= (rel ? 22 : 24)
  const last = run ? run.t.frames.length - 1 : 0
  const running = !!run && run.auto && run.i < last
  const busy = running || done

  // Robotu kare kare yürüt
  useEffect(() => {
    if (!run || !run.auto || run.i >= run.t.frames.length - 1) return
    const t = setTimeout(() => setRun((r) => r && { ...r, i: r.i + 1 }), STEP_MS)
    return () => clearTimeout(t)
  }, [run])

  const completeLevel = (firstTry: boolean, pts: number) => {
    track.item(firstTry)
    stats.current.solved++
    if (firstTry) stats.current.first++
    stats.current.score += pts
    setDone(true)
  }

  // Program bitince değerlendir
  useEffect(() => {
    if (!run || run.i < run.t.frames.length - 1 || handled.current === run.t) return
    handled.current = run.t
    const t = run.t
    const logStrat = (name: string) => {
      if (stratLogged.current.has(name)) return
      stratLogged.current.add(name)
      track.strategy(name)
    }
    if (usedStep.current) logStrat('Adım adım çalıştırma')
    if (g === 4 && prog.some(isBlock) && lv.kind !== 'predict' && lv.kind !== 'debug') logStrat('Tekrarla bloğu ile örüntü')

    if (lv.kind === 'predict') {
      const end = t.cells[t.cells.length - 1]
      const cellOk = !!guess && same(guess, end)
      const faceOk = !rel || guessFace === t.face
      const ok = cellOk && faceOk
      track.attempt(ok)
      setPredOk(ok)
      setPPhase('measure')
      setSay(null)
      const pTalk = (q: string, tone: 'think' | 'ok' = 'think', mis?: string) => setPredSay({ k: ++sayK.current, q, tone, mis })
      if (ok) {
        sfx.ok()
        stats.current.preds++
        pTalk(rel ? `Tam tahmin! Robot tahmin ettiğin karede, ${FACING[t.face]} bakıyor.` : 'Tam tahmin! Robot tam tahmin ettiğin karede durdu.', 'ok')
      } else if (cellOk) {
        pTalk(`Kareyi doğru buldun! Ama robot ${FACING[t.face]} bakıyor. Hangi dönüş komutu robotu bu yöne çevirdi?`, 'think', 'Dönüşlerden sonra robotun baktığı yönü izleyemedi')
      } else {
        const off = guess ? Math.abs(guess[0] - end[0]) + Math.abs(guess[1] - end[1]) : 0
        pTalk(off === 1 ? 'Çok yakındın, yalnızca bir kare fark var! Hangi komutta bir kare kaydı? İzi takip et.' : 'Robot başka bir kareye gitti. İzi takip et: hangi komuttan sonra robot senin düşündüğünden ayrıldı?', 'think', rel ? 'Göreli komutlarla (ileri/dön) robotun konumunu izleyemedi' : undefined)
      }
      return
    }

    if (lv.kind === 'debug') {
      setObserved(true)
      if (t.result === 'win') {
        track.attempt(true)
        sfx.ok()
        stats.current.bugs++
        talk(`Hata düzeldi! Robot yıldıza ulaştı. Hatalı komut ${lv.bugIdx + 1}. komuttu. Robotun yoldan çıktığı yer ile hatalı komut aynı yer miydi?`, 'ok')
        completeLevel(fails === 0 && hints < 2, fails === 0 ? 12 : 8)
        return
      }
      if (edited) {
        track.attempt(false)
        setFails((f) => f + 1)
      }
      const where = t.result === 'bump' ? `${t.bump!.chip + 1}. komutta robot ${t.bump!.what} çarptı.` : 'Komutlar bitti ama robot yıldıza ulaşamadı.'
      talk(edited ? `Henüz değil: ${where} Robotu adım adım çalıştırıp her komuttan sonra “hâlâ doğru yolda mı?” diye sor.` : `${where} Hata bu komutta mı, yoksa daha önceki bir komut robotu yanlış yere mi götürdü? Hatalı olduğunu düşündüğün komuta dokun.`)
      return
    }

    // Yol bul / iki farklı yol
    if (t.result === 'win') {
      track.attempt(true)
      sfx.ok()
      const k = t.cells.map(([x, y]) => key(x, y)).join('>')
      if (lv.kind === 'multi') {
        if (sol.list.some((s) => s.key === k)) {
          talk('Bu yolu zaten buldun! Robot başka hangi karelerden geçerek yıldıza ulaşabilir?')
          return
        }
        sol.add(k, `${sol.list.length + 1}. yol: ${t.moves} adım`)
        stats.current.paths++
        const nl = [...lens, t.moves]
        setLens(nl)
        if (nl.length < 2) {
          talk(`Harika, 1. yol tamam: ${t.moves} adım! Şimdi programı temizle ve yıldıza başka bir yoldan git.`, 'ok')
          return
        }
        const [a, b] = nl
        talk(a === b ? `İki yol da ${a} adım! Farklı karelerden geçtiler ama aynı uzunlukta. Bu nasıl olabilir?` : `1. yol ${a} adım, 2. yol ${b} adım. Hangisi daha kısa, neden? Uzun yol nerede dolaştı?`, 'ok')
        completeLevel(fails === 0, 10 + 5)
        return
      }
      const shortest = len <= lv.best
      talk(shortest ? `Yıldıza ulaştın! Programın ${len} ${unit}; bu yoldan daha kısası yok.` : `Yıldıza ulaştın! Programın ${len} ${unit}. ${lv.best} ${unit} ile giden daha kısa bir yol var — nereden kısaltabilirsin?`, 'ok')
      completeLevel(fails === 0, shortest ? 12 : 9)
      return
    }
    track.attempt(false)
    setFails((f) => f + 1)
    if (t.result === 'bump') {
      const bp = t.bump!
      if (!rel) {
        talk(`${bp.chip + 1}. komutta robot ${bp.what} çarptı. Bu komuttan önce robot hangi karedeydi? Oradan yıldıza doğru hangi yöne gitmeli?`)
      } else if (bp.afterTurn) {
        talk(`${bp.chip + 1}. komutta robot ${FACING[bp.face]} bakıyordu ve ileri gidince ${bp.what} çarptı. Hemen önceki dönüşte robotun kendi sağı ile senin sağın aynı mıydı? Robotun yerine kendini koyup dön.`, 'think', 'Robotun kendi sağını-solunu kendi sağı-solu ile karıştırdı')
      } else {
        talk(`${bp.chip + 1}. komutta robot ${FACING[bp.face]} bakıyordu ve ileri gidince ${bp.what} çarptı. “İleri” robotun baktığı yöne gitmek demek. O anda robot nereye bakıyordu?`, 'think', bp.face !== 0 ? 'Robotun baktığı yönü hesaba katmadı' : undefined)
      }
    } else {
      const end = t.cells[t.cells.length - 1]
      const gd = lv.goal ? Math.abs(end[0] - lv.goal[0]) + Math.abs(end[1] - lv.goal[1]) : 0
      talk(`Komutlar bitti, robot yıldıza ulaşmadı. Robot şimdi nerede? Yıldıza kaç kare daha var, hangi yönde?`, 'think', gd === 1 ? 'Adımları bir eksik saydı' : undefined)
    }
  }, [run])

  const resetLevelState = (l: Level) => {
    setProg(l.kind === 'debug' || l.kind === 'predict' ? l.given : [])
    setRun(null)
    setSay(null)
    setPredSay(null)
    setDone(false)
    setFails(0)
    setHints(0)
    setLens([])
    setObserved(false)
    setEdited(false)
    setEditIdx(null)
    setGuess(null)
    setGuessFace(null)
    setPPhase('guess')
    setPredOk(false)
    setMeasTries(0)
    setMeasPicked([])
    usedStep.current = false
    stratLogged.current = new Set()
    handled.current = null
    sol.reset()
  }

  const finish = () => {
    const s = stats.current
    if (s.over) return
    s.over = true
    const L = levels.length
    const extras = [s.paths ? `${s.paths} farklı yol buldun` : '', s.bugs ? `${s.bugs} hatayı ayıkladın` : '', s.preds ? `${s.preds} tahminin tuttu` : ''].filter(Boolean)
    onFinish({
      stars: starsFor((s.first + s.solved) / (2 * L)),
      score: s.score,
      summary: `${L} görevin ${s.solved} tanesini tamamladın (${s.first} tanesi ilk denemede)${extras.length ? '; ' + extras.join(', ') : ''}.`,
      insight: INSIGHT[g],
    })
  }

  const next = () => {
    if (li + 1 >= levels.length) return finish()
    const nl = levels[li + 1]
    setLi(li + 1)
    resetLevelState(nl)
  }

  const skip = () => {
    track.item(false)
    next()
  }

  const edit = (p: Cmd[]) => {
    setProg(p)
    setRun(null)
    setSay(null)
  }
  const add = (b: Basic) => {
    if (busy) return
    if (full) return talk('Program doldu! Daha kısa bir yol düşünebilir misin? Önce birkaç komut sil.')
    if (g === 2) {
      const lastC = prog[prog.length - 1]
      if (lastC && isBlock(lastC) && lastC.body[0] === b) return edit([...prog.slice(0, -1), { ...lastC, n: lastC.n + 1 }])
      return edit([...prog, { body: [b], n: 1 }])
    }
    edit([...prog, b])
  }
  const undo = () => {
    const lastC = prog[prog.length - 1]
    if (!lastC) return
    if (g === 2 && isBlock(lastC) && lastC.n > 1) return edit([...prog.slice(0, -1), { ...lastC, n: lastC.n - 1 }])
    edit(prog.slice(0, -1))
  }
  const lastC = prog[prog.length - 1]
  const prevC = prog[prog.length - 2]
  const canRep2 = (typeof lastC === 'string' && typeof prevC === 'string') || (lastC !== undefined && isBlock(lastC) && lastC.body.length === 2)
  const repeat = (two: boolean) => {
    if (lastC === undefined || busy) return
    if (isBlock(lastC)) return edit([...prog.slice(0, -1), { ...lastC, n: lastC.n >= 5 ? 2 : lastC.n + 1 }])
    if (full) return talk('Program doldu! Önce birkaç komut sil.')
    if (!two) return edit([...prog.slice(0, -1), { body: [lastC], n: 2 }])
    if (typeof prevC === 'string') edit([...prog.slice(0, -2), { body: [prevC, lastC], n: 2 }])
  }

  const play = () => {
    if (!prog.length || running || done) return
    if (lv.kind === 'predict') {
      if (!guess) return talk(rel ? 'Önce robotun duracağı kareye dokun ve baktığı yönü seç.' : 'Önce robotun duracağı kareye dokun.')
      if (rel && guessFace === null) return talk('Robot en sonunda hangi yöne bakacak? Bir yön seç.')
      setPPhase('run')
    }
    if (run && !run.auto && run.i < last) {
      setRun({ ...run, auto: true })
      return
    }
    setSay(null)
    setEditIdx(null)
    setRun({ t: trace(lv, prog, rel), i: 0, auto: true })
  }
  const step = () => {
    if (!prog.length || running || done || lv.kind === 'predict') return
    usedStep.current = true
    setEditIdx(null)
    if (run && !run.auto && run.i < last) {
      setRun({ ...run, i: run.i + 1 })
      return
    }
    setSay(null)
    const t = trace(lv, prog, rel)
    setRun({ t, i: Math.min(1, t.frames.length - 1), auto: false })
  }

  // Hata ayıklama: komutu değiştir
  const tapDebugChip = (i: number) => {
    if (busy) return
    if (!observed) return talk('Önce “Çalıştır”a bas ve robotu izle: robot nerede yoldan çıkıyor?')
    setEditIdx(editIdx === i ? null : i)
  }
  const replace = (i: number, c: Cmd) => {
    const p = prog.map((x, j) => (j === i ? c : x))
    setProg(p)
    setRun(null)
    setEdited(true)
    setEditIdx(null)
    if (i !== lv.bugIdx) talk(`Robot ${i + 1}. komuttan sonra hâlâ doğru yolda mıydı? Önce çalıştırıp izle; istersen “Baştan” ile geri al.`)
    else setSay(null)
  }
  const restoreDebug = () => {
    setProg(lv.given)
    setRun(null)
    setEditIdx(null)
    setSay(null)
  }

  const hint = () => {
    track.hint()
    const h = hints + 1
    setHints(h)
    if (lv.kind === 'debug') {
      if (h === 1) talk('Robotu “Adım” düğmesiyle tek tek çalıştır. Her komuttan sonra sor: robot yıldıza giden yolda mı?')
      else talk(`Hata ${lv.bugIdx + 1}. komutta. Bu komut robotu nereye götürüyor, nereye götürmeli?`)
      return
    }
    talk(h === 1 ? 'Tahtada yıldıza giden bir yolu noktalarla gösterdim. Bu yolu komutlara çevirebilir misin?' : rel ? 'Her dönüşten önce kendini robotun yerine koy: robotun sağı hangi taraf?' : 'Yolu parçalara böl: önce kaç kare yukarı/aşağı, sonra kaç kare sağa/sola?')
  }

  // Ölçme sorusu
  const answerMeasure = (v: number) => {
    const m = lv.measure!
    if (pPhase !== 'measure' || measPicked.includes(v)) return
    setMeasPicked([...measPicked, v])
    const ok = v === m.answer
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      const loop = g === 4 && lv.given.some((c) => isBlock(c) && c.body.filter(isTurn).length * c.n === 4)
      const extra = g === 4 ? (m.answer === 360 ? ' 4 çeyrek dönüş = tam dönüş = 360°; robot yine başladığı yöne bakıyor!' : m.answer === 180 ? ' 2 çeyrek dönüş = yarım dönüş = 180°: robot ters yöne döndü.' : '') : g === 3 && m.answer === 2 ? ' İki çeyrek dönüş, yarım dönüştür.' : ''
      talk(`Evet, ${m.answer}${m.unit === '°' ? '°' : ' ' + m.unit}!${extra}${loop ? ' Bu program bir kare çizdi.' : ''}`, 'ok')
      setPPhase('done')
      completeLevel(predOk && measTries === 0, (predOk ? 6 : 3) + (measTries === 0 ? 6 : 3))
      return
    }
    const tries = measTries + 1
    setMeasTries(tries)
    if (tries >= 2) {
      talk(`Cevap ${m.answer}${m.unit === '°' ? '°' : ' ' + m.unit}. ${m.hint}`, 'think', g === 4 ? 'Dönüş miktarını dereceyle ilişkilendiremedi' : g === 3 ? 'Dönüşleri çeyrek dönüş olarak sayamadı' : undefined)
      setPPhase('done')
      completeLevel(false, predOk ? 6 : 3)
      return
    }
    talk(`Henüz değil. ${m.hint}`)
  }

  const fr: Frame = run ? run.t.frames[run.i] : { x: lv.start[0], y: lv.start[1], rot: lv.face * 90, chip: -1 }
  const trail = run ? run.t.frames.slice(0, run.i + 1).filter((_, i, a) => i === 0 || i === a.length - 1 || Number.isInteger(a[i].x + a[i].y)) : []
  const runEnded = !!run && run.i >= last

  // Program çipleri
  const chipLabel = (c: Cmd): ReactNode => {
    if (!isBlock(c)) {
      const Icon = ICON[c]
      return <><Icon size={18} strokeWidth={2.75} />{LABEL[c]}</>
    }
    if (g === 2) {
      const Icon = ICON[c.body[0]]
      return <><Icon size={18} strokeWidth={2.75} />{c.n} adım {WORD[c.body[0]]}</>
    }
    return <><Repeat size={17} /><b>×{c.n}</b>: {c.body.map((b) => LABEL[b]).join(', ')}</>
  }
  const chipAria = (c: Cmd, i: number) => `${i + 1}. komut: ${isBlock(c) ? (g === 2 ? `${c.n} adım ${WORD[c.body[0]]}` : `${c.n} kez tekrarla: ${c.body.map((b) => LABEL[b]).join(', ')}`) : LABEL[c]}`

  const pad: Basic[] = rel ? ['TL', 'F', 'TR'] : ['U', 'L', 'D', 'R']
  const cells = Array.from({ length: lv.n * lv.n }, (_, i) => [i % lv.n, Math.floor(i / lv.n)] as Pt)
  const mid = (v: number) => v * CELL + CELL / 2
  const showHintPath = lv.kind !== 'debug' && lv.kind !== 'predict' && hints >= 1 && !done
  const endCell = run && runEnded ? run.t.cells[run.t.cells.length - 1] : null
  const btnH = big ? 'min-h-14' : 'min-h-12'
  const info = KIND_INFO[lv.kind]

  const task =
    lv.kind === 'predict'
      ? `Çalıştırmadan önce düşün: bu program robotu hangi kareye götürür${rel ? ', robot en sonunda hangi yöne bakar' : ''}? Tahmin ettiğin kareye dokun.`
      : lv.kind === 'debug'
        ? 'Bu program robotu ⭐ yıldıza götürmeli ama bir komut hatalı. Çalıştır, izle, hatalı komuta dokunup düzelt.'
        : lv.kind === 'multi'
          ? `Yıldıza giden iki farklı yol bul!${rel ? ` Robot şu an ${FACING[lv.face]} bakıyor.` : ''}`
          : `Robotu ⭐ yıldıza götüren programı yaz.${rel ? ` Robot şu an ${FACING[lv.face]} bakıyor.` : ''}${g === 4 ? ' Tekrar eden komutları Tekrarla bloğuyla kısaltabilirsin.' : ''}`

  return (
    <Scene grade={grade}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={li} total={levels.length} />
        <span className={`chip px-3 py-1.5 text-sm ring-1 ${info.cls}`}><info.Icon size={15} />{info.label}</span>
      </div>
      <TaskCard step={li + 1} total={levels.length}>{task}</TaskCard>

      <div className="lg:grid lg:grid-cols-[1fr_310px] lg:items-start lg:gap-4">
        {/* Tahta */}
        <div>
          <svg viewBox={`0 0 ${lv.n * CELL} ${lv.n * CELL}`} className="mx-auto block w-full max-w-[440px] touch-manipulation rounded-3xl bg-white shadow-sm ring-1 ring-sky-200 select-none" role="img" aria-label="Robotun oyun tahtası">
            {cells.map(([x, y]) => {
              const isGoal = !!lv.goal && x === lv.goal[0] && y === lv.goal[1]
              const canTap = lv.kind === 'predict' && pPhase === 'guess' && !lv.blocks.has(key(x, y))
              return (
                <rect
                  key={key(x, y)}
                  x={x * CELL + 2}
                  y={y * CELL + 2}
                  width={CELL - 4}
                  height={CELL - 4}
                  rx={10}
                  fill={isGoal ? '#fef3c7' : (x + y) % 2 ? '#e0f2fe' : '#f0f9ff'}
                  className={canTap ? 'cursor-pointer hover:fill-violet-100' : ''}
                  onClick={canTap ? () => { setGuess([x, y]); setSay(null) } : undefined}
                  role={canTap ? 'button' : undefined}
                  aria-label={canTap ? `Satır ${y + 1}, sütun ${x + 1}: tahmin et` : undefined}
                />
              )
            })}
            {showHintPath && lv.path.slice(1, -1).map(([x, y], i) => <circle key={i} cx={mid(x)} cy={mid(y)} r={6} fill="#f59e0b" opacity={0.55} pointerEvents="none" />)}
            {lv.goal && <text x={mid(lv.goal[0])} y={mid(lv.goal[1]) + 2} fontSize={34} textAnchor="middle" dominantBaseline="central" pointerEvents="none">⭐</text>}
            {[...lv.blocks].map(([k, e]) => {
              const [x, y] = k.split(',').map(Number)
              return <text key={k} x={mid(x)} y={mid(y) + 2} fontSize={34} textAnchor="middle" dominantBaseline="central" pointerEvents="none">{e}</text>
            })}
            {/* Başlangıç işareti */}
            <rect x={lv.start[0] * CELL + 6} y={lv.start[1] * CELL + 6} width={CELL - 12} height={CELL - 12} rx={8} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" pointerEvents="none" />
            {trail.length > 1 && <polyline points={trail.map((p) => `${mid(p.x)},${mid(p.y)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 9" opacity={0.6} pointerEvents="none" />}
            {/* Tahmin işareti */}
            {guess && lv.kind === 'predict' && (
              <g transform={`translate(${mid(guess[0])} ${mid(guess[1])})`} pointerEvents="none">
                <circle r={25} fill="#ede9fe" fillOpacity={0.7} stroke="#7c3aed" strokeWidth={3} strokeDasharray="6 4" />
                {rel && guessFace !== null ? (
                  <g transform={`rotate(${guessFace * 90})`}><path d="M0 -20 L-9 -4 L-3 -4 L-3 12 L3 12 L3 -4 L9 -4 Z" fill="#7c3aed" /></g>
                ) : (
                  <text y={2} fontSize={22} fontWeight={900} textAnchor="middle" dominantBaseline="central" fill="#7c3aed">?</text>
                )}
              </g>
            )}
            {endCell && lv.kind === 'predict' && (
              <rect x={endCell[0] * CELL + 3} y={endCell[1] * CELL + 3} width={CELL - 6} height={CELL - 6} rx={10} fill="none" stroke={predOk ? '#16a34a' : '#f59e0b'} strokeWidth={4} pointerEvents="none" />
            )}
            <g key={li} style={{ transform: `translate(${fr.x * CELL}px, ${fr.y * CELL}px)`, transition: `transform ${STEP_MS - 100}ms ease-in-out` }} pointerEvents="none">
              <g transform={`translate(${CELL / 2} ${CELL / 2})`}>
                <g style={{ transform: `rotate(${rel ? fr.rot : 0}deg)`, transition: 'transform 300ms ease-in-out' }}>
                  <RobotBot rel={rel} />
                </g>
              </g>
            </g>
          </svg>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-sm font-extrabold">
            {rel && <span className="chip bg-white px-3 py-1 text-ink ring-1 ring-line"><Compass size={15} />Robot {FACING[run ? (((Math.round(fr.rot / 90) % 4) + 4) % 4) : lv.face]} bakıyor</span>}
            {run && runEnded && lv.kind !== 'predict' && <span className="chip bg-white px-3 py-1 text-ink ring-1 ring-line">Yürüdüğü yol: {run.t.moves} kare{rel ? ` · ${run.t.turns} çeyrek dönüş` : ''}</span>}
            {run && !run.auto && !runEnded && <span className="chip bg-amber-50 px-3 py-1 text-amber-800 ring-1 ring-amber-200">Adım adım: {run.i}/{last}</span>}
          </div>

          {lv.kind === 'predict' && rel && pPhase === 'guess' && (
            <div className="mt-3 rounded-2xl bg-white/90 p-3 ring-1 ring-line">
              <p className="mb-2 text-center text-sm font-black">Robot en sonunda hangi yöne bakar?</p>
              <div className="grid grid-cols-4 gap-2">
                {([0, 1, 2, 3] as Dir[]).map((d) => {
                  const Icon = FACE_ICON[d]
                  return (
                    <button key={d} type="button" onClick={() => setGuessFace(d)} aria-pressed={guessFace === d} className={`flex ${btnH} flex-col items-center justify-center rounded-2xl text-sm font-extrabold ring-2 transition active:scale-95 ${guessFace === d ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-violet-800 ring-violet-200'}`}>
                      <Icon size={22} strokeWidth={2.75} />{FACING[d]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Program ve kontroller */}
        <div className="mt-3 lg:mt-0">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-line">
            <div className="mb-2 flex items-center justify-between text-xs font-extrabold tracking-wide text-ink-soft uppercase">
              <span>{lv.kind === 'debug' ? 'Hatalı program' : 'Program'}</span>
              {prog.length > 0 && lv.kind !== 'predict' && <span className="normal-case">Toplam: {len} {unit}</span>}
            </div>
            {prog.length === 0 ? (
              <p className="py-2 text-center text-sm font-bold text-ink-soft">Aşağıdaki düğmelerle komut ekle.</p>
            ) : (
              <ol className="flex flex-wrap gap-1.5">
                {prog.map((c, i) => {
                  const active = !!run && !runEnded && fr.chip === i
                  const stopped = !!run && runEnded && fr.chip === i && !done
                  const editable = lv.kind === 'debug' && !busy
                  const removable = (lv.kind === 'build' || lv.kind === 'multi') && !busy
                  const pulse = lv.kind === 'debug' && hints >= 2 && i === lv.bugIdx && !done
                  return (
                    <li key={`${i}-${JSON.stringify(c)}`}>
                      <button
                        type="button"
                        disabled={!editable && !removable}
                        onClick={() => (editable ? tapDebugChip(i) : g === 2 && isBlock(c) && c.n > 1 ? edit(prog.map((x, j) => (j === i ? { ...c, n: c.n - 1 } : x))) : edit(prog.filter((_, j) => j !== i)))}
                        aria-label={`${chipAria(c, i)}${editable ? ', değiştir' : removable ? ', sil' : ''}`}
                        className={`chip ${big ? 'min-h-12' : 'min-h-11'} gap-1 px-3 text-sm ring-2 transition disabled:cursor-default ${editIdx === i ? 'bg-amber-100 text-amber-900 ring-amber-400' : active ? 'bg-blue-600 text-white ring-blue-600 animate-pop' : pulse ? 'bg-rose-50 text-rose-800 ring-rose-300 animate-pulse' : stopped ? 'bg-blue-100 text-blue-900 ring-blue-400' : 'bg-blue-50 text-blue-800 ring-blue-200'}`}
                      >
                        <span className="text-[11px] opacity-60">{i + 1}.</span>
                        {chipLabel(c)}
                        {removable && <X size={13} className="opacity-50" />}
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {/* Hatalı komutu değiştirme paneli */}
          {lv.kind === 'debug' && editIdx !== null && !busy && (() => {
            const c = prog[editIdx]
            const basics: Basic[] = rel ? ['F', 'TL', 'TR'] : ['U', 'D', 'L', 'R']
            return (
              <div className="mt-3 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200 animate-fade-up">
                <p className="mb-2 text-sm font-black text-amber-900">{editIdx + 1}. komutu neyle değiştirelim?</p>
                {(!isBlock(c) || g === 2) && (
                  <div className="flex flex-wrap gap-2">
                    {basics.map((b) => {
                      const cur = isBlock(c) ? c.body[0] : c
                      const Icon = ICON[b]
                      return (
                        <button key={b} type="button" disabled={b === cur} onClick={() => replace(editIdx, isBlock(c) ? { ...c, body: [b] } : b)} className={`flex ${btnH} items-center gap-1.5 rounded-2xl bg-white px-3 text-sm font-extrabold text-blue-800 ring-1 ring-blue-200 transition active:scale-95 disabled:opacity-40`}>
                          <Icon size={18} strokeWidth={2.75} />{LABEL[b]}
                        </button>
                      )
                    })}
                  </div>
                )}
                {isBlock(c) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-amber-900">{g === 2 ? 'Adım sayısı:' : 'Kaç kez?'}</span>
                    {[1, 2, 3, 4, 5].map((k) => (
                      <button key={k} type="button" disabled={k === c.n} onClick={() => replace(editIdx, { ...c, n: k })} className={`grid ${big ? 'size-14' : 'size-12'} place-items-center rounded-2xl bg-white text-lg font-black text-blue-800 ring-1 ring-blue-200 transition active:scale-95 disabled:bg-blue-600 disabled:text-white`}>
                        {g === 2 ? k : `×${k}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {predSay && <Nudge key={predSay.k} question={predSay.q} tone={predSay.tone} misconception={predSay.mis} />}
          {/* Ölçme sorusu */}
          {lv.kind === 'predict' && (pPhase === 'measure' || pPhase === 'done') && lv.measure && (
            <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-line animate-fade-up">
              <p className="mb-2 text-base font-black">📏 {lv.measure.q}</p>
              <div className="grid grid-cols-4 gap-2">
                {lv.measure.choices.map((v) => {
                  const picked = measPicked.includes(v)
                  const right = v === lv.measure!.answer
                  return (
                    <button key={v} type="button" onClick={() => answerMeasure(v)} disabled={pPhase !== 'measure' || picked} className={`grid ${btnH} place-items-center rounded-2xl text-lg font-black ring-2 transition active:scale-95 ${picked || (pPhase === 'done' && right) ? (right ? 'bg-ok-soft text-green-800 ring-green-300' : 'bg-slate-100 text-slate-400 ring-slate-200') : 'bg-white text-ink ring-line'}`}>
                      {v}{lv.measure!.unit === '°' ? '°' : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} />}

          {lv.kind === 'multi' && <SolutionList list={sol.list} goal={2} />}

          {done ? (
            <div className="mt-3">
              <StrategyPicker
                key={li}
                question={lv.kind === 'debug' ? 'Hatayı nasıl buldun?' : lv.kind === 'predict' ? 'Nasıl tahmin ettin?' : lv.kind === 'multi' ? 'İkinci yolu nasıl buldun?' : 'Nasıl düşündün?'}
                options={
                  lv.kind === 'debug'
                    ? ['Adım adım izledim', 'Robotun durduğu yere baktım', 'Komutları parmağımla takip ettim']
                    : lv.kind === 'predict'
                      ? ['Kafamda yürüttüm', 'Parmağımla takip ettim', rel ? 'Adımları ve dönüşleri saydım' : 'Adımları saydım']
                      : lv.kind === 'multi'
                        ? ['Engelin öbür yanından dolaştım', 'Önce diğer yöne gittim', 'Kareleri sayıp karşılaştırdım']
                        : rel
                          ? ['Robotun yerine kendimi koydum', 'Önce yolu parmağımla çizdim', 'Deneyip düzelttim']
                          : ['Önce yolu parmağımla çizdim', 'Kareleri saydım', 'Deneyip düzelttim']
                }
                onPick={() => {}}
              />
              <button type="button" onClick={next} className="btn-primary mt-3 w-full">{li + 1 >= levels.length ? 'Sonuçları gör' : 'Sonraki görev'}<SkipForward size={18} /></button>
            </div>
          ) : lv.kind === 'predict' ? (
            pPhase === 'guess' || pPhase === 'run' ? (
              <button type="button" onClick={play} disabled={running || !guess || (rel && guessFace === null)} className={`btn-primary mt-3 w-full ${btnH}`}><Play size={18} fill="currentColor" />Çalıştır ve kontrol et</button>
            ) : null
          ) : (
            <div className="mt-3">
              {lv.kind !== 'debug' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {pad.map((b) => {
                      const Icon = ICON[b]
                      return (
                        <button key={b} type="button" onClick={() => add(b)} disabled={running} aria-label={LABEL[b]} className={`flex ${big ? 'min-h-16' : 'min-h-14'} flex-col items-center justify-center rounded-2xl bg-white text-sm font-extrabold text-blue-700 shadow-sm ring-1 ring-blue-200 transition active:scale-95 disabled:opacity-40 ${b === 'U' ? 'col-start-2' : b === 'L' ? 'col-start-1' : ''}`}>
                          <Icon size={24} strokeWidth={2.75} />{LABEL[b]}
                        </button>
                      )
                    })}
                  </div>
                  {g === 4 && (
                    <>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => repeat(false)} disabled={running || !lastC} className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-2 text-sm font-extrabold text-amber-800 ring-1 ring-amber-200 transition active:scale-95 disabled:opacity-40">
                          <Repeat size={18} />Son komutu tekrarla
                        </button>
                        <button type="button" onClick={() => repeat(true)} disabled={running || !canRep2} className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-2 text-sm font-extrabold text-amber-800 ring-1 ring-amber-200 transition active:scale-95 disabled:opacity-40">
                          <Repeat size={18} />Son 2’yi tekrarla
                        </button>
                      </div>
                      <p className="mt-1 text-center text-xs font-bold text-ink-soft">Tekrarla bloğuna yeniden dokunursan ×2 → ×3 → ×4 → ×5 olur.</p>
                    </>
                  )}
                </>
              )}
              <div className="mt-3 flex gap-2">
                {lv.kind === 'debug' ? (
                  <button type="button" onClick={restoreDebug} disabled={running || !edited} className={`btn-ghost ${btnH} px-3`} aria-label="Baştan: hatalı programa dön"><RotateCcw size={20} /></button>
                ) : (
                  <>
                    <button type="button" onClick={undo} disabled={running || !prog.length} className={`btn-ghost ${btnH} px-3`} aria-label="Son komutu geri al"><Undo2 size={20} /></button>
                    <button type="button" onClick={() => edit([])} disabled={running || !prog.length} className={`btn-ghost ${btnH} px-3`} aria-label="Programı temizle"><Trash2 size={20} /></button>
                  </>
                )}
                <button type="button" onClick={step} disabled={running || !prog.length} className={`btn-ghost ${btnH} px-3`} aria-label="Bir komut çalıştır"><StepForward size={20} /><span className="max-sm:hidden">Adım</span></button>
                <button type="button" onClick={play} disabled={running || !prog.length} className={`btn-primary ${btnH} flex-1 px-3`}><Play size={18} fill="currentColor" />Çalıştır</button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                <button type="button" onClick={hint} disabled={running || hints >= 2} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold text-amber-700 disabled:opacity-40"><Lightbulb size={16} />İpucu</button>
                {fails >= 3 && !running && <button type="button" onClick={skip} className="min-h-12 px-3 text-sm font-extrabold text-ink-soft underline underline-offset-4">Bu görevi geç</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </Scene>
  )
}
