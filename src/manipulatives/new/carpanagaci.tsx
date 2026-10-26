import { useState } from 'react'
import { Merge, Minus, Plus, RotateCcw, Shuffle, Sparkles } from 'lucide-react'
import type { ManipulativeConfig } from '../../data/types'
import { MathText } from '../../components/MathText'
import { ek } from '../../lib/generators'
import { ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Çarpan Ağacı
 *  - Bileşik bir yaprağa dokun → “k × ?” düğmelerinden biriyle iki çarpana ayır.
 *    Bölmeyen bir sayı seçilirse neden olmadığı yakın katlarla açıklanır (ör. 5 × 7 = 35, 5 × 8 = 40);
 *    1 seçilirse ağacın neden büyümediği açıklanır.
 *  - Asal yapraklar altın olur. Canlı okuma: yaprakların çarpımı her zaman köke eşittir.
 *  - Ağaç tamamlanınca galeriye eklenir. “Yeni ağaç” ile farklı bir ilk bölmeyle başla:
 *    farklı ağaçlar aynı asal çarpanlara ulaşır (aritmetiğin temel teoremi), üslü yazım: 2^{3} · 3.
 *  - Ara düğüme dokun → dallarını birleştir (geri al).
 *
 * Hedef biçimleri:
 *  { n }            → n için ağacı asal yapraklara kadar tamamla
 *  { n, trees: k }  → n için en az k farklı tamamlanmış ağaç yap
 */
type T = { n: number; k?: [T, T] }
type V = { root: number; tree: T; gallery: T[] }

const isPrime = (x: number) => {
  if (x < 2) return false
  for (let d = 2; d * d <= x; d++) if (x % d === 0) return false
  return true
}
const leaves = (t: T): number[] => (t.k ? [...leaves(t.k[0]), ...leaves(t.k[1])] : [t.n])
const depth = (t: T): number => (t.k ? 1 + Math.max(depth(t.k[0]), depth(t.k[1])) : 0)
const complete = (t: T) => leaves(t).every(isPrime)
const sig = (t: T): string => (t.k ? `(${t.n}:${[sig(t.k[0]), sig(t.k[1])].sort().join(',')})` : String(t.n))
const at = (t: T, path: string): T => (path === '' ? t : at(t.k![Number(path[0])], path.slice(1)))
const replace = (t: T, path: string, f: (x: T) => T): T => {
  if (path === '') return f(t)
  const i = Number(path[0])
  const k = t.k!.slice() as [T, T]
  k[i] = replace(k[i], path.slice(1), f)
  return { ...t, k }
}

function primeForm(x: number) {
  const ps: [number, number][] = []
  let r = x
  for (let p = 2; p * p <= r; p++) {
    let e = 0
    while (r % p === 0) { r /= p; e++ }
    if (e) ps.push([p, e])
  }
  if (r > 1) ps.push([r, 1])
  return ps
}
const expText = (x: number) => primeForm(x).map(([p, e]) => (e > 1 ? `${p}^{${e}}` : `${p}`)).join(' · ')

type Pos = { x: number; y: number; t: T; path: string }
function layoutTree(t: T, LW: number, LH: number) {
  const out: Pos[] = []
  let leaf = 0
  const walk = (node: T, d: number, path: string): number => {
    if (!node.k) {
      const x = (leaf++ + 0.5) * LW
      out.push({ x, y: 44 + d * LH, t: node, path })
      return x
    }
    const a = walk(node.k[0], d + 1, path + '0'), b = walk(node.k[1], d + 1, path + '1')
    const x = (a + b) / 2
    out.push({ x, y: 44 + d * LH, t: node, path })
    return x
  }
  walk(t, 0, '')
  return { nodes: out, width: Math.max(leaf, 1) * LW }
}

function TreeSvg({ tree, sel, onTap, mini }: { tree: T; sel?: string | null; onTap?: (path: string) => void; mini?: boolean }) {
  const LW = mini ? 64 : 92, LH = mini ? 70 : 92, R = mini ? 24 : 31
  const { nodes, width } = layoutTree(tree, LW, LH)
  const W = Math.max(width, mini ? 128 : 300)
  const off = (W - width) / 2
  const H = 44 + depth(tree) * LH + R + 14
  const byPath = new Map(nodes.map((p) => [p.path, p]))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full select-none" style={{ maxWidth: mini ? 260 : Math.max(320, W * 1.05), maxHeight: mini ? 200 : undefined }} role="img" aria-label={`Çarpan ağacı: ${tree.n} = ${leaves(tree).join(' × ')}`}>
      <defs>
        <radialGradient id="ca-gold" cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor="#fef9c3" /><stop offset="45%" stopColor="#facc15" /><stop offset="100%" stopColor="#ca8a04" /></radialGradient>
        <filter id="ca-sh" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1f2340" floodOpacity="0.22" /></filter>
      </defs>
      <g transform={`translate(${off} 0)`}>
        {nodes.filter((p) => p.t.k).map((p) => [0, 1].map((i) => {
          const c = byPath.get(p.path + i)!
          return <line key={p.path + i} x1={p.x} y1={p.y + R - 4} x2={c.x} y2={c.y - R + 4} stroke="#8b5e34" strokeWidth={mini ? 4 : 6} strokeLinecap="round" />
        }))}
        {nodes.map((p) => {
          const prime = !p.t.k && isPrime(p.t.n)
          const open = !p.t.k && !prime && p.t.n > 1
          const s = sel === p.path
          const fs = p.t.n >= 100 ? (mini ? 16 : 21) : mini ? 19 : 25
          return (
            <g key={p.path} transform={`translate(${p.x} ${p.y})`} onClick={onTap ? () => onTap(p.path) : undefined} style={{ cursor: onTap ? 'pointer' : 'default' }} role={onTap ? 'button' : undefined} aria-label={onTap ? `${p.t.n}${prime ? ', asal' : open ? ', ayrılabilir' : ''}` : undefined}>
              {onTap && <circle r={R + 10} fill="transparent" />}
              {s && <circle r={R + 7} fill="none" stroke="#d6457a" strokeWidth={4} />}
              <circle r={R} fill={prime ? 'url(#ca-gold)' : p.t.k ? '#fff' : '#fff'} stroke={prime ? '#a16207' : open ? '#d6457a' : '#1f2340'} strokeWidth={prime ? 2.5 : 3} strokeDasharray={open ? '7 5' : undefined} filter="url(#ca-sh)" />
              <text y={fs * 0.36} textAnchor="middle" fontSize={fs} fontWeight={900} fill={prime ? '#713f12' : '#1f2340'}>{p.t.n}</text>
              {prime && !mini && <text x={R * 0.62} y={-R * 0.55} fontSize={16}>✨</text>}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function near(nn: number, k: number) {
  const q = Math.floor(nn / k)
  return `${k} × ${q} = ${k * q}, ${k} × ${q + 1} = ${k * (q + 1)}`
}

function Component({ value, onChange, target, locked }: { value: V; onChange: (v: V) => void; config: ManipulativeConfig; target?: Record<string, unknown>; locked?: boolean }) {
  const free = !target
  const [sel, setSel] = useState<string | null>(value.tree.k ? null : '')
  const [msg, setMsg] = useState<{ text: string; tone: 'info' | 'warn' | 'ok' } | null>(null)
  const [other, setOther] = useState(13)
  const node = sel !== null ? at(value.tree, sel) : null
  const done = complete(value.tree)
  const ls = leaves(value.tree)

  const commit = (tree: T) => {
    let gallery = value.gallery
    if (complete(tree) && tree.k && !gallery.some((g) => sig(g) === sig(tree))) gallery = [...gallery, tree].slice(-4)
    onChange({ ...value, tree, gallery })
  }
  const tap = (path: string) => {
    if (locked) return
    const t = at(value.tree, path)
    if (t.k) { setSel(path); setMsg({ text: `${t.n} = ${t.k[0].n} × ${t.k[1].n}. Bu dalları birleştirmek ister misin?`, tone: 'info' }); return }
    if (isPrime(t.n)) { setSel(null); setMsg({ text: `${t.n} asal bir sayı: yalnızca 1’e ve kendisine bölünür. Bu dal burada biter.`, tone: 'ok' }); return }
    setSel(path)
    setMsg(null)
  }
  const split = (k: number) => {
    if (!node || sel === null || locked) return
    const x = node.n
    if (k === 1) return setMsg({ text: `1 × ${x} = ${x}, ama ağaç büyümez: aynı sayı tekrar çıkar. 1 asal değildir, çarpan ağacına yazılmaz.`, tone: 'warn' })
    if (k >= x) return setMsg({ text: `${k}, ${ek(x, 'abl')} küçük olmalı.`, tone: 'warn' })
    if (x % k !== 0) return setMsg({ text: `${x}, ${ek(k, 'dat')} tam bölünmez: ${near(x, k)}. ${x} bu ikisinin arasında kalıyor.`, tone: 'warn' })
    const a = k, b = x / k
    commit(replace(value.tree, sel, () => ({ n: x, k: [{ n: a }, { n: b }] })))
    setMsg({ text: `${x} = ${a} × ${b}${isPrime(a) && isPrime(b) ? ' — iki asal!' : ''}`, tone: 'ok' })
    const nextOpen = (() => {
      const t2 = replace(value.tree, sel, () => ({ n: x, k: [{ n: a }, { n: b }] }))
      const { nodes } = layoutTree(t2, 1, 1)
      return nodes.find((p) => !p.t.k && !isPrime(p.t.n) && p.t.n > 1)?.path ?? null
    })()
    setSel(nextOpen)
  }
  const merge = () => {
    if (sel === null || locked) return
    commit(replace(value.tree, sel, (t) => ({ n: t.n })))
    setMsg(null)
  }
  const setRoot = (r: number) => {
    const root = Math.max(4, Math.min(999, r))
    onChange({ root, tree: { n: root }, gallery: [] })
    setSel('')
    setMsg(null)
  }
  const newTree = () => { onChange({ ...value, tree: { n: value.root } }); setSel(''); setMsg(null) }

  const maxK = node ? Math.min(12, node.n - 1) : 0
  const sameAll = value.gallery.length >= 2

  return (
    <div className="flex flex-col items-center gap-3">
      {free && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Sayı</span>
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-line">
            <button type="button" onClick={() => setRoot(value.root - 1)} className="grid size-11 place-items-center rounded-xl hover:bg-paper" aria-label="Azalt"><Minus size={20} /></button>
            <span className="min-w-12 text-center text-xl font-black text-brand tabular-nums">{value.root}</span>
            <button type="button" onClick={() => setRoot(value.root + 1)} className="grid size-11 place-items-center rounded-xl hover:bg-paper" aria-label="Artır"><Plus size={20} /></button>
          </div>
          {[24, 36, 48, 60, 72, 90, 100, 120, 360].map((x) => <ToolButton key={x} active={value.root === x} onClick={() => setRoot(x)}>{x}</ToolButton>)}
          <ToolButton onClick={() => { const pool = [12, 18, 20, 28, 30, 40, 42, 45, 54, 56, 63, 64, 66, 75, 80, 84, 96, 98, 126, 150, 210]; setRoot(pool[Math.floor(Math.random() * pool.length)]) }}><Shuffle size={16} /><span className="sr-only">Rastgele</span></ToolButton>
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-3xl bg-gradient-to-b from-sky-50 to-emerald-50/60 p-3 ring-1 ring-line">
        <TreeSvg tree={value.tree} sel={sel} onTap={locked ? undefined : tap} />
      </div>

      {node && !node.k && !isPrime(node.n) && !locked && (
        <div className="w-full max-w-2xl rounded-2xl bg-white p-3 ring-2 ring-brand/40">
          <p className="mb-2 text-center text-base font-extrabold">{ek(node.n, 'acc')} iki çarpana ayır: <span className="text-brand">? × ?</span></p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: maxK }, (_, i) => i + 1).map((k) => (
              <button key={k} type="button" onClick={() => split(k)} className="min-h-12 min-w-14 rounded-xl bg-paper px-2 text-lg font-black ring-1 ring-line transition hover:bg-brand-soft active:scale-95">{k} ×</button>
            ))}
            {node.n > 13 && (
              <span className="flex items-center gap-1 rounded-xl bg-paper p-1 ring-1 ring-line">
                <button type="button" onClick={() => setOther(Math.max(13, other - 1))} className="grid size-10 place-items-center rounded-lg hover:bg-white" aria-label="Azalt"><Minus size={16} /></button>
                <span className="min-w-8 text-center text-lg font-black tabular-nums">{other}</span>
                <button type="button" onClick={() => setOther(Math.min(node.n - 1, other + 1))} className="grid size-10 place-items-center rounded-lg hover:bg-white" aria-label="Artır"><Plus size={16} /></button>
                <button type="button" onClick={() => split(other)} className="min-h-10 rounded-lg bg-white px-2 text-base font-black ring-1 ring-line active:scale-95">{other} ×</button>
              </span>
            )}
          </div>
        </div>
      )}
      {msg && (
        <div className={`flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-center text-base font-extrabold ${msg.tone === 'warn' ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : msg.tone === 'ok' ? 'bg-ok-soft text-[#166534]' : 'bg-brand-soft text-brand-ink'}`}>
          {msg.text}
          {node?.k && !locked && <ToolButton onClick={merge}><Merge size={16} />Birleştir</ToolButton>}
        </div>
      )}
      {!node && !done && !msg && <p className="text-center text-sm font-bold text-ink-soft">Kesikli çizgili bir sayıya dokun ve iki çarpana ayır.</p>}

      <div className="flex flex-wrap justify-center gap-2">
        {value.tree.k && !locked && <ToolButton onClick={newTree}><RotateCcw size={16} />{done ? 'Yeni ağaç: başka bir yoldan dene' : 'Baştan başla'}</ToolButton>}
      </div>

      {(free || locked) && (
        <div className="w-full max-w-2xl rounded-2xl bg-ink px-4 py-3 text-center text-white tabular-nums">
          <div className="text-xl font-black">
            {ls.length > 1 ? `${value.root} = ${ls.join(' × ')}` : done ? value.root : `${value.root}: ağaç henüz dallanmadı`}
          </div>
          {!done && ls.length > 1 && <div className="mt-1 text-sm font-bold text-white/70">Yaprakların çarpımı hâlâ {value.root}. Altın olmayan yaprakları ayırmaya devam et.</div>}
          {done && ls.length > 1 && (
            <div className="mt-1 text-lg font-extrabold text-amber-300">
              Asal çarpanlar: <span className="text-2xl"><MathText text={`${value.root} = ${expText(value.root)}`} /></span>
            </div>
          )}
          {done && ls.length === 1 && <div className="mt-1 text-base font-extrabold text-amber-300">{value.root} asal: ağacı tek yapraktan oluşur.</div>}
        </div>
      )}

      {value.gallery.length > 0 && (free || locked || n(target, 'trees') > 1) && (
        <div className="w-full">
          <div className="mb-2 flex items-center justify-center gap-2 text-sm font-extrabold text-ink-soft">
            <Sparkles size={16} className="text-amber-500" /> Tamamlanan ağaçlar ({value.gallery.length})
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {value.gallery.map((g, i) => (
              <div key={i} className="rounded-2xl bg-white p-2 ring-1 ring-line">
                <TreeSvg tree={g} mini />
                <div className="mt-1 text-center text-sm font-black text-ink tabular-nums">{[...leaves(g)].sort((a, b) => a - b).join(' · ')}</div>
              </div>
            ))}
          </div>
          {sameAll && (free || locked) && (
            <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-2 text-center text-base font-extrabold text-amber-900 ring-1 ring-amber-200">
              Farklı ağaçlar, aynı asal çarpanlar: <MathText text={expText(value.root)} />. Her sayının asal çarpanlarına ayrılışı tektir!
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export const carpanagaci: ToolDef<V> = {
  id: 'carpanagaci',
  defaultConfig: {},
  initial: (_c, target) => {
    const root = target ? Math.max(4, n(target, 'n', 24)) : 36
    return { root, tree: { n: root }, gallery: [] }
  },
  check: (v, t) => {
    const root = n(t, 'n')
    if (v.root !== root) return false
    if (typeof t.trees === 'number') return v.gallery.length >= n(t, 'trees')
    return complete(v.tree) && leaves(v.tree).reduce((a, b) => a * b, 1) === root
  },
  Component,
}
