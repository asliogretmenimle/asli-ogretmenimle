import { useMemo, useState, type ReactNode } from 'react'
import { Delete, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Nudge, Scene, StrategyPicker, useSolutions } from '../../games/kit2'
import { DragPoint, Plane, usePlane } from '../../interactive/Plane'
import { useTracker } from '../../lib/trackerContext'
import { NextButton, Panel, TopBar, fmtN, fmtQ, q, qAdd, qDiv, qEq, qMul, qNum, qPow, qSub, useLook, type Look, type Q } from '../islem-zinciri/kit'

/**
 * 35. Sonsuz Çözüm Atölyesi
 *  Tek bir hedef sayı (24, ¾, −6, 64…) ve üç istasyon:
 *   - İşlem: serbest ifade yazıcı (kesir, ondalık, negatif, üs, parantez) — canlı değer
 *   - Model: dizilim / onluk bloklar / kesir şeridi / yüzlük kare / sayma pulları / kare-küp
 *   - Sayı doğrusu: başlangıç noktası (sürüklenebilir) + eşit sıçramalar
 *  Her farklı yol galeriye kategori rozetiyle eklenir. Görevler: 3 yol → 3 istasyon → farklı işlemler → karma işlem.
 */

type Station = 'islem' | 'model' | 'dogru'
interface Sol { key: string; label: string; cat: string; st: Station; target: string }

// ───────────────────────── İfade ayrıştırıcı ─────────────────────────

function evaluate(src: string): { v: Q; ops: string[]; lits: number; sqrt: boolean } | null {
  let i = 0
  const ops: string[] = []
  let lits = 0
  let sqrt = false
  const peek = () => src[i]
  const num = (): Q | null => {
    let s = ''
    while (i < src.length && /[0-9,]/.test(src[i])) s += src[i++]
    if (!s) return null
    let v = parseDec(s)
    if (!v) return null
    if (src[i] === '/') {
      i++
      let t = ''
      while (i < src.length && /[0-9]/.test(src[i])) t += src[i++]
      if (!t || Number(t) === 0) return null
      v = qDiv(v, q(Number(t)))
    }
    lits++
    return v
  }
  const primary = (): Q | null => {
    if (peek() === '(') {
      i++
      const v = expr()
      if (peek() !== ')') return null
      i++
      return v
    }
    if (peek() === '√') {
      i++
      sqrt = true
      const v = primary()
      if (!v || v.n < 0) return null
      const a = Math.round(Math.sqrt(v.n)), b = Math.round(Math.sqrt(v.d))
      return a * a === v.n && b * b === v.d ? q(a, b) : null
    }
    return num()
  }
  const unary = (): Q | null => {
    if (peek() === '−') {
      i++
      const v = unary()
      return v ? q(-v.n, v.d) : null
    }
    return primary()
  }
  const factor = (): Q | null => {
    const b = unary()
    if (!b) return null
    if (peek() === '^') {
      i++
      ops.push('^')
      const e = factor()
      if (!e || e.d !== 1 || Math.abs(e.n) > 20) return null
      return qPow(b, e.n)
    }
    return b
  }
  const term = (): Q | null => {
    let v = factor()
    while (v && (peek() === '×' || peek() === '÷')) {
      const o = src[i++]
      ops.push(o)
      const r = factor()
      if (!r) return null
      v = o === '×' ? qMul(v, r) : r.n === 0 ? null : qDiv(v, r)
    }
    return v
  }
  function expr(): Q | null {
    let v = term()
    while (v && (peek() === '+' || peek() === '−')) {
      const o = src[i++]
      ops.push(o)
      const r = term()
      if (!r) return null
      v = o === '+' ? qAdd(v, r) : qSub(v, r)
    }
    return v
  }
  const v = expr()
  if (!v || i !== src.length || !Number.isFinite(v.n)) return null
  return { v, ops, lits, sqrt }
}
function parseDec(s: string): Q | null {
  if (!/^\d+(,\d+)?$/.test(s)) return null
  const [a, b = ''] = s.split(',')
  return q(Number(a) * 10 ** b.length + (b ? Number(b) : 0), 10 ** b.length)
}
/** Yazılan ifadeyi MathText’e çevirir: 3/4 → [[3/4]], ^2 → ^{2}, √9 → √{9} */
function pretty(s: string): string {
  return s
    .replace(/(\d+(?:,\d+)?)\/(\d+)/g, '[[$1/$2]]')
    .replace(/\^(−?\d+)/g, '^{$1}')
    .replace(/√(\d+(?:,\d+)?|\[\[[^\]]+\]\])/g, '√{$1}')
    .replace(/([+−×÷])/g, ' $1 ')
    .replace(/\(\s/g, '(')
    .replace(/^\s*−\s/, '−')
    .replace(/\(\s?−\s/g, '(−')
}

const CAT_OP: Record<string, string> = { '+': 'Toplama', '−': 'Çıkarma', '×': 'Çarpma', '÷': 'Bölme', '^': 'Üslü ifade' }
const CAT_COLOR: Record<Station, string> = { islem: '#2563eb', model: '#16a34a', dogru: '#d97706' }
const ST_INFO: Record<Station, { label: string; emoji: string }> = { islem: { label: 'İşlem', emoji: '🧮' }, model: { label: 'Model', emoji: '🧱' }, dogru: { label: 'Sayı doğrusu', emoji: '📏' } }

// ───────────────────────── Görevler ─────────────────────────

type Goal = { kind: 'count'; n: number } | { kind: 'stations' } | { kind: 'opcats'; n: number } | { kind: 'karma' }
interface Task { title: string; target: Q; goal: Goal }

function tasksFor(grade: Grade): Task[] {
  const [A, B]: [Q, Q] =
    grade === 3 ? [q(24), q(50)] : grade === 4 ? [q(48), q(100)] : grade === 5 ? [q(3, 4), q(1)] : grade === 6 ? [q(3, 4), q(12, 5)] : grade === 7 ? [q(-6), q(0)] : [q(64), q(100)]
  const show = (x: Q) => fmtQ(x, grade === 5 ? 'frac' : 'dec')
  return [
    { title: `Hedef ${show(A)}: üç farklı yol bul!`, target: A, goal: { kind: 'count', n: 3 } },
    { title: `Hedef ${show(A)}: her istasyondan (işlem, model, sayı doğrusu) en az bir yol bul.`, target: A, goal: { kind: 'stations' } },
    { title: `Yeni hedef ${show(B)}: en az iki farklı işlem türüyle (toplama, çıkarma, çarpma…) yol bul.`, target: B, goal: { kind: 'opcats', n: 2 } },
    { title: `Hedef ${show(B)}: bir ifadede iki farklı işlemi birlikte kullan (karma işlem).`, target: B, goal: { kind: 'karma' } },
  ]
}

function goalMet(g: Goal, list: Sol[]): boolean {
  if (g.kind === 'count') return list.length >= g.n
  if (g.kind === 'stations') return new Set(list.map((s) => s.st)).size >= 3
  if (g.kind === 'opcats') return new Set(list.filter((s) => s.st === 'islem' && s.cat !== 'Karma işlem' && s.cat !== 'Farklı yazım').map((s) => s.cat)).size >= g.n
  return list.some((s) => s.cat === 'Karma işlem')
}
function goalText(g: Goal, list: Sol[]): string {
  if (g.kind === 'count') return `${Math.min(list.length, g.n)} / ${g.n} yol`
  if (g.kind === 'stations') return `${new Set(list.map((s) => s.st)).size} / 3 istasyon`
  if (g.kind === 'opcats') return `${new Set(list.filter((s) => s.st === 'islem' && s.cat !== 'Karma işlem' && s.cat !== 'Farklı yazım').map((s) => s.cat)).size} / ${g.n} işlem türü`
  return list.some((s) => s.cat === 'Karma işlem') ? 'Karma işlem bulundu' : 'Karma işlem bekleniyor'
}

// ───────────────────────── Küçük parçalar ─────────────────────────

function Num({ look, label, value, onChange, min, max, step = 1, show, big }: { look: Look; label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; show?: string; big?: boolean }) {
  const b = `grid h-12 min-w-11 place-items-center rounded-xl px-2 text-base font-black transition active:scale-95 disabled:opacity-30 ${look.key}`
  const r = (v: number) => Math.max(min, Math.min(max, Math.round(v * 1e6) / 1e6))
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-xs font-black tracking-wide uppercase ${look.muted}`}>{label}</span>
      <div className="flex items-center gap-1">
        {big && <button type="button" className={b} disabled={value - 10 * step < min - 1e-9} onClick={() => onChange(r(value - 10 * step))} aria-label={`${label} çok azalt`}>−{fmtN(10 * step)}</button>}
        <button type="button" className={b} disabled={value - step < min - 1e-9} onClick={() => onChange(r(value - step))} aria-label={`${label} azalt`}>−</button>
        <span className={`grid min-w-14 place-items-center text-2xl font-black tabular-nums ${look.strong}`}><MathText text={show ?? fmtN(value)} /></span>
        <button type="button" className={b} disabled={value + step > max + 1e-9} onClick={() => onChange(r(value + step))} aria-label={`${label} artır`}>+</button>
        {big && <button type="button" className={b} disabled={value + 10 * step > max + 1e-9} onClick={() => onChange(r(value + 10 * step))} aria-label={`${label} çok artır`}>+{fmtN(10 * step)}</button>}
      </div>
    </div>
  )
}

function Tabs<T extends string>({ look, value, onChange, items }: { look: Look; value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={value === it.id} onClick={() => onChange(it.id)} className={`${look.h} rounded-2xl px-4 text-[15px] font-extrabold transition ${value === it.id ? look.chipOn : look.chip}`}>{it.label}</button>
      ))}
    </div>
  )
}

// ───────────────────────── İstasyon: İşlem ─────────────────────────

function ExprStation({ look, grade, target, onAdd }: { look: Look; grade: Grade; target: Q; onAdd: (s: Omit<Sol, 'target'>) => string | null }) {
  const [s, setS] = useState('')
  const res = s ? evaluate(s) : null
  const frac = grade >= 5, dec = grade >= 5, par = grade >= 5, pow = grade >= 8
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', ...(dec ? [','] : []), ...(frac ? ['/'] : [])]
  const opsK = ['+', '−', '×', '÷', ...(pow ? ['^', '√'] : []), ...(par ? ['(', ')'] : [])]
  const push = (k: string) => setS((c) => (c.length > 24 ? c : c + k))
  const add = () => {
    if (!res) return
    const usedOps = [...new Set(res.ops)]
    const literal = res.lits === 1 && res.ops.length === 0 && !res.sqrt && !s.startsWith('−')
    let cat: string
    if (literal) cat = 'Farklı yazım'
    else if (usedOps.length > 1) cat = 'Karma işlem'
    else if (usedOps.length === 1) cat = CAT_OP[usedOps[0]]
    else cat = res.sqrt ? 'Karekök' : 'Farklı yazım'
    // değişme özelliği: a+b ile b+a aynı yol sayılır
    let key = s
    const m = /^([^+−×÷^()√]+)([+×])([^+−×÷^()√]+)$/.exec(s)
    if (m) key = [m[1], m[3]].sort().join(m[2])
    const err = onAdd({ key: `e:${key}`, label: pretty(s), cat, st: 'islem' })
    if (!err) setS('')
  }
  const ok = !!res && qEq(res.v, target)
  return (
    <div>
      <div className={`flex min-h-16 items-center justify-between gap-2 rounded-2xl px-4 text-2xl font-black sm:text-3xl ${look.dark ? 'bg-slate-900 text-white ring-1 ring-slate-700' : 'bg-white ring-2 ring-line'}`} aria-live="polite">
        <span className="min-w-0 break-all">{s ? <MathText text={pretty(s)} /> : <span className={`text-lg ${look.muted}`}>Bir ifade yaz…</span>}</span>
        {s && <span className={`shrink-0 text-xl ${ok ? 'text-emerald-500' : look.muted}`}>= {res ? <MathText text={fmtQ(res.v, grade === 5 ? 'frac' : 'dec')} /> : '…'}{ok && ' ✓'}</span>}
      </div>
      <div className="mt-3 grid grid-cols-[3fr_2fr] gap-2">
        <div className="grid grid-cols-3 gap-1.5">
          {keys.map((k) => <button key={k} type="button" onClick={() => push(k)} className={`h-12 rounded-xl text-xl font-black transition active:scale-95 ${look.key}`} aria-label={k === '/' ? 'Kesir çizgisi' : k === ',' ? 'Virgül' : k}>{k}</button>)}
        </div>
        <div className="grid grid-cols-2 content-start gap-1.5">
          {opsK.map((k) => <button key={k} type="button" onClick={() => push(k)} className={`h-12 rounded-xl text-xl font-black text-white transition active:scale-95`} style={{ background: k === '(' || k === ')' ? '#64748b' : '#2563eb' }} aria-label={k}>{k === '^' ? 'xⁿ' : k}</button>)}
          <button type="button" onClick={() => setS((c) => c.slice(0, -1))} className={`grid h-12 place-items-center rounded-xl ${look.key}`} aria-label="Sil"><Delete size={22} /></button>
          <button type="button" onClick={() => setS('')} className={`grid h-12 place-items-center rounded-xl ${look.key}`} aria-label="Temizle"><Trash2 size={20} /></button>
        </div>
      </div>
      <button type="button" onClick={add} disabled={!ok} className="btn-primary mt-3 min-h-14 w-full text-lg"><Sparkles size={20} />Galeriye ekle</button>
      {s && !res && <p className="mt-2 text-sm font-bold text-amber-600">İfade henüz tamamlanmadı.</p>}
    </div>
  )
}

// ───────────────────────── İstasyon: Model ─────────────────────────

type ModelKind = 'dizilim' | 'blok' | 'serit' | 'yuzluk' | 'pul' | 'kare'
function modelsFor(grade: Grade, target: Q): ModelKind[] {
  if (grade <= 4) return ['dizilim', 'blok']
  if (grade <= 6) return qNum(target) <= 1 ? ['serit', 'yuzluk'] : ['serit']
  if (grade === 7) return ['pul']
  return ['kare', 'dizilim']
}
const MODEL_LABEL: Record<ModelKind, string> = { dizilim: 'Dizilim', blok: 'Onluk bloklar', serit: 'Kesir şeridi', yuzluk: 'Yüzlük kare', pul: 'Sayma pulları', kare: 'Kare ve küp' }

function ModelStation({ look, grade, target, onAdd }: { look: Look; grade: Grade; target: Q; onAdd: (s: Omit<Sol, 'target'>) => string | null }) {
  const kinds = modelsFor(grade, target)
  const [kind, setKind] = useState<ModelKind>(kinds[0])
  const T = qNum(target)
  // durumlar
  const [rc, setRc] = useState({ r: 2, c: 3 })
  const [bl, setBl] = useState({ y: 0, o: 1, b: 4 })
  const [den, setDen] = useState(4)
  const [shade, setShade] = useState<number[]>([])
  const [hund, setHund] = useState(50)
  const [pul, setPul] = useState({ p: 2, n: 4 })
  const [kk, setKk] = useState({ cube: false, n: 4 })
  const wholes = Math.max(1, Math.ceil(T - 1e-9))

  let value = 0, viz: ReactNode = null, label = '', key = ''
  if (kind === 'dizilim') {
    value = rc.r * rc.c
    label = `Dizilim: ${rc.r} × ${rc.c}`
    key = `m:d:${Math.min(rc.r, rc.c)}x${Math.max(rc.r, rc.c)}`
    const cell = Math.min(22, 260 / Math.max(rc.c, 1))
    viz = (
      <svg viewBox={`0 0 ${rc.c * cell + 4} ${rc.r * cell + 4}`} className="mx-auto block max-h-56" style={{ width: Math.min(320, rc.c * cell + 4) }} aria-label={`${rc.r} satır ${rc.c} sütun`}>
        {Array.from({ length: rc.r }, (_, r) => Array.from({ length: rc.c }, (_, c) => <rect key={`${r}-${c}`} x={2 + c * cell} y={2 + r * cell} width={cell - 2} height={cell - 2} rx={3} fill="#f97316" opacity={0.75} />))}
      </svg>
    )
  } else if (kind === 'blok') {
    value = bl.y * 100 + bl.o * 10 + bl.b
    label = `Bloklar: ${[bl.y && `${bl.y} yüzlük`, bl.o && `${bl.o} onluk`, bl.b && `${bl.b} birlik`].filter(Boolean).join(' ')}`
    key = `m:b:${bl.y}-${bl.o}-${bl.b}`
    viz = (
      <div className="flex flex-wrap items-end justify-center gap-1" aria-hidden>
        {Array.from({ length: bl.y }, (_, i) => <span key={`y${i}`} className="size-16 rounded-[3px] bg-orange-400 bg-[linear-gradient(#0000_90%,#fff6_90%),linear-gradient(90deg,#0000_90%,#fff6_90%)] bg-[length:10%_10%] ring-1 ring-orange-600" />)}
        {Array.from({ length: bl.o }, (_, i) => <span key={`o${i}`} className="h-16 w-2.5 rounded-[2px] bg-green-500 bg-[linear-gradient(#0000_88%,#fff8_88%)] bg-[length:100%_10%] ring-1 ring-green-700" />)}
        <span className="grid grid-cols-5 gap-0.5">{Array.from({ length: bl.b }, (_, i) => <span key={`b${i}`} className="size-3 rounded-[2px] bg-yellow-400 ring-1 ring-yellow-600" />)}</span>
      </div>
    )
  } else if (kind === 'serit') {
    const k = shade.length
    value = k / den
    label = `Kesir şeridi: ${den}’lik parçalardan ${k} tane`
    key = `m:s:${k}/${den}`
    viz = (
      <div className="w-full space-y-2">
        {Array.from({ length: wholes }, (_, w) => (
          <div key={w} className="flex h-14 overflow-hidden rounded-xl ring-2 ring-teal-600">
            {Array.from({ length: den }, (_, i) => {
              const idx = w * den + i
              const on = shade.includes(idx)
              return <button key={i} type="button" onClick={() => setShade((s) => (on ? s.filter((x) => x !== idx) : [...s, idx]))} className={`flex-1 border-r-2 border-teal-600 text-xs font-black last:border-r-0 ${on ? 'bg-teal-500 text-white' : look.dark ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`} aria-label={`${w + 1}. bütünün ${i + 1}. parçası`} aria-pressed={on}><MathText text={`[[1/${den}]]`} /></button>
            })}
          </div>
        ))}
      </div>
    )
  } else if (kind === 'yuzluk') {
    value = hund / 100
    label = `Yüzlük kare: ${hund} kare boyalı`
    key = `m:y:${hund}`
    viz = (
      <svg viewBox="0 0 202 202" className="mx-auto block w-full max-w-[230px]" aria-label={`100 kareden ${hund} tanesi boyalı`}>
        {Array.from({ length: 100 }, (_, i) => <rect key={i} x={1 + (i % 10) * 20} y={1 + Math.floor(i / 10) * 20} width={19} height={19} rx={2} fill={i < hund ? '#0d9488' : look.dark ? '#1e293b' : '#f1f5f9'} />)}
      </svg>
    )
  } else if (kind === 'pul') {
    value = pul.p - pul.n
    label = `Pullar: ${pul.p} artı, ${pul.n} eksi`
    key = `m:p:${pul.p}-${pul.n}`
    const pairs = Math.min(pul.p, pul.n)
    viz = (
      <div className="flex flex-wrap justify-center gap-1.5" aria-hidden>
        {Array.from({ length: pul.p }, (_, i) => <span key={`p${i}`} className={`grid size-9 place-items-center rounded-full bg-yellow-400 text-lg font-black text-yellow-900 ring-2 ring-yellow-600 ${i < pairs ? 'opacity-40' : ''}`}>+</span>)}
        {Array.from({ length: pul.n }, (_, i) => <span key={`n${i}`} className={`grid size-9 place-items-center rounded-full bg-rose-500 text-lg font-black text-white ring-2 ring-rose-700 ${i < pairs ? 'opacity-40' : ''}`}>−</span>)}
      </div>
    )
  } else {
    value = kk.cube ? kk.n ** 3 : kk.n ** 2
    label = kk.cube ? `Küp: ${kk.n}^{3}` : `Kare: ${kk.n}^{2}`
    key = `m:k:${kk.cube ? 'c' : 's'}${kk.n}`
    const s = Math.min(18, 180 / kk.n)
    viz = kk.cube ? (
      <svg viewBox="0 0 220 200" className="mx-auto block w-full max-w-[240px]" aria-label={`Kenarı ${kk.n} olan küp`}>
        <polygon points="60,70 160,70 200,30 100,30" fill="#a5b4fc" stroke="#4338ca" strokeWidth={2} />
        <polygon points="60,70 160,70 160,170 60,170" fill="#818cf8" stroke="#4338ca" strokeWidth={2} />
        <polygon points="160,70 200,30 200,130 160,170" fill="#6366f1" stroke="#4338ca" strokeWidth={2} />
        {Array.from({ length: kk.n - 1 }, (_, i) => <line key={i} x1={60 + ((i + 1) * 100) / kk.n} x2={60 + ((i + 1) * 100) / kk.n} y1={70} y2={170} stroke="#4338ca" opacity={0.5} />)}
        {Array.from({ length: kk.n - 1 }, (_, i) => <line key={`h${i}`} y1={70 + ((i + 1) * 100) / kk.n} y2={70 + ((i + 1) * 100) / kk.n} x1={60} x2={160} stroke="#4338ca" opacity={0.5} />)}
        <text x={110} y={192} textAnchor="middle" fontSize={15} fontWeight={900} fill={look.dark ? '#e2e8f0' : '#1f2340'}>{kk.n} × {kk.n} × {kk.n}</text>
      </svg>
    ) : (
      <svg viewBox={`0 0 ${kk.n * s + 4} ${kk.n * s + 4}`} className="mx-auto block" style={{ width: Math.min(240, kk.n * s + 4) }} aria-label={`Kenarı ${kk.n} olan kare`}>
        {Array.from({ length: kk.n * kk.n }, (_, i) => <rect key={i} x={2 + (i % kk.n) * s} y={2 + Math.floor(i / kk.n) * s} width={s - 1.5} height={s - 1.5} rx={2} fill="#6366f1" opacity={0.75} />)}
      </svg>
    )
  }
  const ok = Math.abs(value - T) < 1e-9
  const add = () => {
    if (!ok) return
    onAdd({ key, label, cat: `Model: ${MODEL_LABEL[kind].toLocaleLowerCase('tr-TR')}`, st: 'model' })
  }
  const controls: Record<ModelKind, ReactNode> = {
    dizilim: <><Num look={look} label="Satır" value={rc.r} min={1} max={grade === 8 ? 20 : 12} onChange={(r) => setRc({ ...rc, r })} /><Num look={look} label="Sütun" value={rc.c} min={1} max={grade === 8 ? 25 : 12} onChange={(c) => setRc({ ...rc, c })} /></>,
    blok: <>{T >= 100 && <Num look={look} label="Yüzlük" value={bl.y} min={0} max={9} onChange={(y) => setBl({ ...bl, y })} />}<Num look={look} label="Onluk" value={bl.o} min={0} max={20} onChange={(o) => setBl({ ...bl, o })} /><Num look={look} label="Birlik" value={bl.b} min={0} max={50} big onChange={(b) => setBl({ ...bl, b })} /></>,
    serit: <Num look={look} label="Kaç eş parça?" value={den} min={2} max={12} onChange={(d) => { setDen(d); setShade([]) }} />,
    yuzluk: <Num look={look} label="Boyalı kare" value={hund} min={0} max={100} big onChange={setHund} />,
    pul: <><Num look={look} label="Artı pul" value={pul.p} min={0} max={20} onChange={(p) => setPul({ ...pul, p })} /><Num look={look} label="Eksi pul" value={pul.n} min={0} max={20} onChange={(n) => setPul({ ...pul, n })} /></>,
    kare: (
      <>
        <div className="flex gap-1.5">
          <button type="button" aria-pressed={!kk.cube} onClick={() => setKk({ ...kk, cube: false })} className={`min-h-12 rounded-xl px-4 font-extrabold ${!kk.cube ? look.chipOn : look.chip}`}>Kare</button>
          <button type="button" aria-pressed={kk.cube} onClick={() => setKk({ ...kk, cube: true })} className={`min-h-12 rounded-xl px-4 font-extrabold ${kk.cube ? look.chipOn : look.chip}`}>Küp</button>
        </div>
        <Num look={look} label="Kenar" value={kk.n} min={1} max={12} onChange={(n) => setKk({ ...kk, n })} />
      </>
    ),
  }
  return (
    <div>
      {kinds.length > 1 && <div className="mb-3"><Tabs look={look} value={kind} onChange={setKind} items={kinds.map((k) => ({ id: k, label: MODEL_LABEL[k] }))} /></div>}
      <div className={`grid min-h-40 place-items-center rounded-2xl p-3 ${look.dark ? 'bg-slate-900/60' : 'bg-white/80 ring-1 ring-line'}`}>{viz}</div>
      <p className={`mt-2 text-center text-xl font-black ${ok ? 'text-emerald-500' : look.strong}`}>
        <MathText text={`= ${grade <= 4 || grade >= 7 ? fmtN(value) : fmtQ(q(Math.round(value * 1e6), 1e6), grade === 5 ? 'frac' : 'dec')}${ok ? ' ✓' : ''}`} />
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-center gap-3">{controls[kind]}</div>
      {kind === 'pul' && <p className={`mt-2 text-center text-sm font-bold ${look.muted}`}>Soluk pullar sıfır çiftleri: bir artı ile bir eksi birbirini götürür.</p>}
      {kind === 'serit' && <p className={`mt-2 text-center text-sm font-bold ${look.muted}`}>Parçalara dokunarak boya.</p>}
      <button type="button" onClick={add} disabled={!ok} className="btn-primary mt-3 min-h-14 w-full text-lg"><Sparkles size={20} />Galeriye ekle</button>
    </div>
  )
}

// ───────────────────────── İstasyon: Sayı doğrusu ─────────────────────────

function Jumps({ start, size, count }: { start: number; size: number; count: number }) {
  const P = usePlane()
  const y = P.sy(0)
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = P.sx(start + i * size), b = P.sx(start + (i + 1) * size)
        const h = Math.min(46, Math.abs(b - a) / 1.6 + 8)
        return <path key={i} d={`M ${a} ${y - 6} Q ${(a + b) / 2} ${y - 6 - h} ${b} ${y - 6}`} fill="none" stroke="#d97706" strokeWidth={3} />
      })}
      <circle cx={P.sx(start + count * size)} cy={y} r={9} fill="#16a34a" stroke="#fff" strokeWidth={3} />
    </g>
  )
}

function LineStation({ look, grade, target, onAdd }: { look: Look; grade: Grade; target: Q; onAdd: (s: Omit<Sol, 'target'>) => string | null }) {
  const T = qNum(target)
  const sizes: number[] = grade === 5 ? [1 / 2, 1 / 4, 1 / 8, 1 / 12, 1] : grade === 6 ? [0.25, 0.1, 0.05, 0.2, 0.5, 1] : []
  const intStep = grade <= 4 || grade >= 7
  const [start, setStart] = useState(0)
  const [size, setSize] = useState(intStep ? (grade === 7 ? -2 : 4) : sizes[0])
  const [count, setCount] = useState(3)
  const end = start + count * size
  const ok = Math.abs(end - T) < 1e-9 && count >= 2
  const fmtS = (v: number) => (grade === 5 ? fmtQ(q(Math.round(v * 24), 24), 'frac') : fmtN(v, 3))
  const span = Math.max(Math.abs(T), 1)
  const pad = Math.max(0.25, span * 0.2)
  const view = { xMin: Math.min(0, T) - pad, xMax: Math.max(0, T) + pad, yMin: -1, yMax: 1 }
  const add = () => {
    if (!ok) return
    const cat = size < 0 ? 'Sayı doğrusu: geri sıçrama' : start === 0 ? 'Sayı doğrusu: eşit sıçramalar' : 'Sayı doğrusu: başka yerden başla'
    onAdd({ key: `n:${start}|${size}|${count}`, label: `${fmtS(start)} noktasından ${count} kez ${size < 0 ? '−' : '+'}${fmtS(Math.abs(size))}`, cat, st: 'dogru' })
  }
  const startStep = intStep ? 1 : grade === 5 ? 1 / 4 : 0.05
  return (
    <div>
      <Plane initial={view} mode="x" minSpan={0.2} maxSpan={400} label="Sıçramalı sayı doğrusu">
        <Jumps start={start} size={size} count={count} />
        <DragPoint x={start} y={0} color="#2563eb" label="başla" snapStep={startStep} constrain={(p) => ({ x: Math.max(-100, Math.min(200, p.x)), y: 0 })} onChange={(p) => setStart(Math.round(p.x / startStep) * startStep)} />
      </Plane>
      <p className={`mt-1 text-center text-xl font-black ${ok ? 'text-emerald-500' : look.strong}`}>
        <MathText text={`${fmtS(start)} ${size < 0 ? '−' : '+'} ${count} × ${fmtS(Math.abs(size))} = ${fmtS(end)}${ok ? ' ✓' : ''}`} />
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-center gap-3">
        <Num look={look} label="Başla" value={start} min={-100} max={200} step={startStep} big={intStep} onChange={setStart} show={fmtS(start)} />
        {intStep ? (
          <Num look={look} label="Sıçrama" value={size} min={grade === 7 ? -20 : grade >= 8 ? -50 : -20} max={50} onChange={(v) => setSize(v === 0 ? (v > size ? 1 : -1) : v)} show={(size > 0 ? '+' : '') + fmtN(size)} />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className={`text-xs font-black tracking-wide uppercase ${look.muted}`}>Sıçrama</span>
            <div className="flex flex-wrap justify-center gap-1">{sizes.map((z) => <button key={z} type="button" aria-pressed={size === z} onClick={() => setSize(z)} className={`min-h-12 min-w-12 rounded-xl px-2 text-base font-black ${size === z ? look.chipOn : look.chip}`}><MathText text={fmtS(z)} /></button>)}</div>
          </div>
        )}
        <Num look={look} label="Kaç sıçrama" value={count} min={1} max={60} onChange={setCount} />
      </div>
      <button type="button" onClick={add} disabled={!ok} className="btn-primary mt-3 min-h-14 w-full text-lg"><Sparkles size={20} />Galeriye ekle</button>
    </div>
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function SonsuzCozum({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const track = useTracker()
  const sols = useSolutions()
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [i, setI] = useState(0)
  const [st, setSt] = useState<Station>('islem')
  const [gallery, setGallery] = useState<Sol[]>([])
  const [say, setSay] = useState<{ q: string; tone?: 'ok'; k: number } | null>(null)
  const [phase, setPhase] = useState<'work' | 'strategy' | 'done'>('work')
  const t = tasks[i]
  const tKey = fmtQ(t.target)
  const list = gallery.filter((g) => g.target === tKey)
  const met = goalMet(t.goal, list)
  const nudge = (q: string, tone?: 'ok') => setSay((s) => ({ q, tone, k: (s?.k ?? 0) + 1 }))
  const show = (x: Q) => fmtQ(x, grade === 5 ? 'frac' : 'dec')

  const onAdd = (s: Omit<Sol, 'target'>): string | null => {
    if (s.cat === 'Farklı yazım' && s.label.replace(/\s/g, '') === show(t.target).replace(/\s/g, '')) {
      nudge(`Bu, hedefin kendisi! ${show(t.target)}’e ulaşan bir işlem, model ya da farklı bir yazım bul.`)
      return 'same'
    }
    if (list.some((g) => g.key === s.key)) {
      nudge(s.st === 'islem' ? 'Bu yolu zaten buldun. Sayıları değiştir ya da başka bir işlem dene. (4 × 6 ile 6 × 4 aynı yol sayılır.)' : 'Bu yolu zaten buldun. Başka bir biçim dene.')
      track.attempt(false)
      return 'dup'
    }
    track.attempt(true)
    sols.add(`${tKey}:${s.key}`, s.label)
    const ng = [...gallery, { ...s, target: tKey }]
    setGallery(ng)
    const nl = ng.filter((g) => g.target === tKey)
    const nowMet = goalMet(t.goal, nl)
    const newCat = !list.some((g) => g.cat === s.cat)
    if (nowMet && phase === 'work') {
      track.item(true)
      setPhase('strategy')
      nudge(`Görev tamam! ${show(t.target)}’e ${nl.length} farklı yoldan ulaştın. İstersen yeni yollar eklemeye devam edebilirsin.`, 'ok')
    } else nudge(newCat ? `Yeni bir rozet: ${s.cat}! ${goalText(t.goal, nl)}.` : `Eklendi! ${goalText(t.goal, nl)}. ${t.goal.kind === 'stations' ? 'Başka bir istasyonu dene.' : t.goal.kind === 'opcats' ? 'Başka bir işlem türü dene.' : t.goal.kind === 'karma' ? 'İki farklı işlemi bir arada kullan: ör. 5 × 4 + 4.' : ''}`, 'ok')
    return null
  }

  const next = () => {
    if (phase === 'work' && met) track.item(true)
    if (i + 1 < tasks.length) {
      setI(i + 1)
      setPhase('work')
      setSay(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const cats = new Set(gallery.map((g) => g.cat)).size
    onFinish({
      summary: `${gallery.length} farklı yol buldun, ${cats} farklı rozet topladın.`,
      insight: 'Bir sayı tek bir “cevap” değil, sayısız ilişkinin buluşma noktasıdır: aynı sayıya işlemlerle, modellerle ve sayı doğrusunda sıçramalarla ulaşılabilir.',
      stars: (gallery.length >= 12 ? 3 : gallery.length >= 8 ? 2 : 1) as 1 | 2 | 3,
    })
  }

  const cats = [...new Set(list.map((g) => g.cat))]
  return (
    <div>
      <TopBar look={look} step={i} total={tasks.length} title={t.title} emoji="♾️" />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <Scene grade={grade}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-lg font-black ${look.dark ? 'bg-slate-800 text-cyan-200 ring-1 ring-slate-600' : 'bg-white ring-1 ring-line'}`}>🎯 Hedef: <span className="text-3xl"><MathText text={show(t.target)} /></span></span>
            <Tabs look={look} value={st} onChange={setSt} items={(Object.keys(ST_INFO) as Station[]).map((s) => ({ id: s, label: `${ST_INFO[s].emoji} ${ST_INFO[s].label}` }))} />
          </div>
          {st === 'islem' && <ExprStation key={`e${i}`} look={look} grade={grade} target={t.target} onAdd={onAdd} />}
          {st === 'model' && <ModelStation key={`m${tKey}`} look={look} grade={grade} target={t.target} onAdd={onAdd} />}
          {st === 'dogru' && <LineStation key={`l${tKey}`} look={look} grade={grade} target={t.target} onAdd={onAdd} />}
        </Scene>
        <div className="space-y-3 lg:sticky lg:top-20">
          <Panel look={look} title={`Çözüm galerisi · ${goalText(t.goal, list)}`} icon={<span aria-hidden>🖼️</span>}>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(Object.keys(ST_INFO) as Station[]).map((s) => {
                const has = list.some((g) => g.st === s)
                return <span key={s} className={`chip px-2.5 py-1 text-sm ${has ? 'text-white' : look.dark ? 'bg-slate-700 text-slate-400' : 'bg-paper text-ink-soft'}`} style={has ? { background: CAT_COLOR[s] } : undefined}>{ST_INFO[s].emoji} {ST_INFO[s].label}{has ? ' ✓' : ''}</span>
              })}
            </div>
            {cats.length > 0 && <p className={`mb-2 text-xs font-black tracking-wide uppercase ${look.muted}`}>Rozetler: {cats.length}</p>}
            {list.length === 0 && <p className={`text-[15px] font-semibold ${look.muted}`}>Henüz yol yok. Bir istasyon seç ve hedefe ulaş!</p>}
            <ul className="max-h-[22rem] space-y-1.5 overflow-auto pr-1">
              {list.slice().reverse().map((g) => (
                <li key={g.key} className={`flex items-center gap-2 rounded-xl px-3 py-2 animate-fade-up ${look.dark ? 'bg-slate-900/60' : 'bg-white ring-1 ring-line'}`}>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black text-white" style={{ background: CAT_COLOR[g.st] }}>{g.cat}</span>
                  <span className="min-w-0 text-[15px] font-extrabold"><MathText text={g.label} /></span>
                </li>
              ))}
            </ul>
            {say && <Nudge key={say.k} question={say.q} tone={say.tone} onClose={() => setSay(null)} />}
            {phase === 'strategy' && <StrategyPicker question="En çok hangi yolu sevdin?" options={['Bir işlem', 'Bir model', 'Sayı doğrusu', 'Hepsi aynı fikri gösteriyor']} onPick={() => setPhase('done')} />}
            {phase === 'done' && <NextButton last={i === tasks.length - 1} onClick={next} />}
            {phase === 'work' && met && <NextButton last={i === tasks.length - 1} onClick={next} />}
            {!met && phase === 'work' && list.length > 0 && <p className={`mt-2 flex items-center gap-1 text-sm font-bold ${look.muted}`}><Plus size={14} />Devam et: {goalText(t.goal, list)}</p>}
          </Panel>
        </div>
      </div>
    </div>
  )
}
