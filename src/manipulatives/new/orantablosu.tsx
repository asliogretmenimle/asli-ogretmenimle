import { useEffect, useRef, useState } from 'react'
import { ChartScatter, Divide, PenLine, Plus, Trash2, X } from 'lucide-react'
import { Plane, usePlane } from '../../interactive/Plane'
import { MathText } from '../../components/MathText'
import { ek } from '../../lib/generators'
import { Stepper, ToolButton } from '../ui'
import { n, type ToolDef } from '../types'

/**
 * Oran Tablosu
 *  - İlk sütun bir oran (ör. 2 limon : 3 bardak su). Bir sütunu seç ve
 *      ×k / ÷k  → iki satır da aynı sayıyla çarpılır/bölünür (eşdeğer oran),
 *      Topla    → iki sütunun toplamı (2:3 + 4:6 = 6:9) yine eşdeğerdir,
 *      +k ikisine de → toplamsal ölçekleme (yaygın yanılgı) — sütun kırmızıyla işaretlenir.
 *  - Seçili sütunun şerit (bant) modeli: her kutu aynı değeri taşıyorsa oran korunmuştur.
 *  - İsteğe bağlı grafik: eşdeğer oranlar orijinden geçen bir doğru üzerindedir.
 *
 * Görev hedefi (target): { a, b, find: { a?: number, b?: number } }
 *   ör. { a: 2, b: 3, find: { a: 10 } } → tabloda a = 10 olan, 2:3’e eşdeğer bir sütun (10:15) oluşturulmalı.
 *   find içinde hem a hem b verilirse ikisi de tutmalı.
 */

type Col = { a: number; b: number; op?: string; src?: number; bad?: boolean }
type V = { cols: Col[]; sel: number; k: number; ctx: number; graph: boolean }

const CONTEXTS: [string, string][] = [
  ['Limon', 'Su (bardak)'],
  ['Kalem', 'Fiyat (TL)'],
  ['Yol (km)', 'Süre (dk)'],
  ['Kırmızı boya', 'Beyaz boya'],
  ['A', 'B'],
]
const C_A = { fill: '#d6457a', soft: '#fde8ef', ink: '#a92f5c' }
const C_B = { fill: '#0ea5e9', soft: '#e0f2fe', ink: '#0369a1' }

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const r2 = (v: number) => Math.round(v * 100) / 100
const fmt = (v: number) => r2(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 })
const clean = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6
const same = (c: Col, base: Col) => Math.abs(c.a * base.b - c.b * base.a) < 1e-6 * Math.max(1, c.a * base.b)
/** İlk sütunun en sade hâli (kutu sayıları) */
const simplest = (c: Col) => {
  const s = 100
  const A = Math.round(c.a * s), B = Math.round(c.b * s), g = gcd(A, B) || 1
  return { p: A / g, q: B / g }
}

function Tape({ col, base, max, labels }: { col: Col; base: Col; max: number; labels: [string, string] }) {
  const { p, q } = simplest(base)
  const W = 300
  const scale = (W - 4) / max
  const pa = col.a / p, pb = col.b / q
  const ok = Math.abs(pa - pb) < 1e-6
  const boxes = (count: number, each: number, y: number, c: typeof C_A) =>
    count <= 24 ? (
      Array.from({ length: count }).map((_, i) => (
        <g key={i}>
          <rect x={2 + i * each * scale} y={y} width={Math.max(1, each * scale)} height={30} rx={5} fill={c.fill} fillOpacity={0.85} stroke="#fff" strokeWidth={2} />
          {each * scale > 26 && <text x={2 + (i + 0.5) * each * scale} y={y + 20} textAnchor="middle" fontSize={12} fontWeight={900} fill="#fff">{fmt(each)}</text>}
        </g>
      ))
    ) : (
      <rect x={2} y={y} width={count * each * scale} height={30} rx={5} fill={c.fill} fillOpacity={0.85} />
    )
  return (
    <div className="w-full rounded-2xl bg-white p-3 ring-1 ring-line">
      <p className="mb-2 text-center text-sm font-extrabold text-ink-soft">
        Şerit modeli: {fmt(col.a)} : {fmt(col.b)} → {p} kutu : {q} kutu
      </p>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5">
        <span className="text-right text-xs font-black" style={{ color: C_A.ink }}>{labels[0]}</span>
        <svg viewBox={`0 0 ${W} 34`} className="block w-full">{boxes(p, pa, 2, C_A)}</svg>
        <span className="text-right text-xs font-black" style={{ color: C_B.ink }}>{labels[1]}</span>
        <svg viewBox={`0 0 ${W} 34`} className="block w-full">{boxes(q, pb, 2, C_B)}</svg>
      </div>
      <p className={`mt-2 text-center text-sm font-black ${ok ? 'text-ok' : 'text-bad'}`}>
        {ok
          ? `Her kutu ${fmt(pa)} → iki satır da aynı sayıyla büyüdü: oran korunuyor.`
          : `Üst kutular ${fmt(pa)}, alt kutular ${fmt(pb)} — kutular eşit değil, oran bozuldu.`}
      </p>
    </div>
  )
}

function Points({ cols }: { cols: Col[] }) {
  const P = usePlane()
  const base = cols[0]
  const m = base.b / base.a
  const far = (P.view.xMax - P.view.xMin) * 4
  return (
    <g>
      <line x1={P.sx(0)} y1={P.sy(0)} x2={P.sx(far)} y2={P.sy(far * m)} stroke="#16a34a" strokeWidth={2.5} strokeDasharray="7 6" opacity={0.7} />
      <circle cx={P.sx(0)} cy={P.sy(0)} r={5} fill="#1f2340" />
      {cols.map((c, i) => {
        const ok = same(c, base)
        return (
          <g key={i}>
            <circle cx={P.sx(c.a)} cy={P.sy(c.b)} r={8} fill={ok ? '#16a34a' : '#e11d48'} stroke="#fff" strokeWidth={2.5} />
            <text x={P.sx(c.a) + 10} y={P.sy(c.b) - 8} fontSize={12} fontWeight={900} fill={ok ? '#166534' : '#be123c'}>({fmt(c.a)}; {fmt(c.b)})</text>
          </g>
        )
      })}
    </g>
  )
}

export const orantablosu: ToolDef<V> = {
  id: 'orantablosu',
  defaultConfig: {},
  initial: (_c, t) => ({ cols: [{ a: n(t, 'a', 2), b: n(t, 'b', 3) }], sel: 0, k: 2, ctx: t ? 4 : 0, graph: false }),
  check: (v, t) => {
    const base = { a: n(t, 'a'), b: n(t, 'b') }
    const f = (t.find ?? {}) as Record<string, unknown>
    return v.cols.some((c) => {
      if (!same(c, base)) return false
      if (typeof f.a === 'number' && Math.abs(c.a - f.a) > 1e-6) return false
      if (typeof f.b === 'number' && Math.abs(c.b - f.b) > 1e-6) return false
      return typeof f.a === 'number' || typeof f.b === 'number'
    })
  },
  Component: ({ value, onChange, target, locked }) => {
    const [pick, setPick] = useState<number | null>(null)
    const [typing, setTyping] = useState<{ a: string; b: string } | null>(null)
    const scroller = useRef<HTMLDivElement>(null)
    const nCols = value.cols.length
    useEffect(() => {
      const el = scroller.current
      if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
    }, [nCols])
    const task = !!target
    const reveal = !task || !!locked
    const { cols, sel, k } = value
    const base = cols[0]
    const cur = cols[Math.min(sel, cols.length - 1)]
    const labels = CONTEXTS[value.ctx] ?? CONTEXTS[4]
    const find = (target?.find ?? {}) as { a?: number; b?: number }
    const set = (p: Partial<V>) => onChange({ ...value, ...p })
    const add = (c: Col) => {
      if (cols.length >= 12) return
      onChange({ ...value, cols: [...cols, c], sel: cols.length })
    }
    const canDiv = clean(cur.a / k) && clean(cur.b / k)
    const maxVal = Math.max(...cols.map((c) => Math.max(c.a, c.b)), 1)
    const maxA = Math.max(...cols.map((c) => c.a), 1), maxB = Math.max(...cols.map((c) => c.b), 1)
    let xSpan = maxA * 1.3
    const ySpan = maxB * 1.3
    let aspect = ySpan / xSpan
    if (aspect > 0.8) { xSpan = ySpan / 0.8; aspect = 0.8 }
    if (aspect < 0.5) aspect = 0.5
    const bucket = `${Math.ceil(Math.log2(xSpan))}-${Math.ceil(Math.log2(ySpan))}`
    const tapCol = (i: number) => {
      if (locked) return
      if (pick !== null) {
        const o = cols[pick], c = cols[i]
        setPick(null)
        add({ a: r2(o.a + c.a), b: r2(o.b + c.b), op: `${pick + 1}. + ${i + 1}.`, src: pick })
        return
      }
      set({ sel: i })
    }

    return (
      <div className="flex flex-col items-center gap-4">
        {!task && (
          <div className="flex flex-wrap items-end justify-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-extrabold tracking-wide text-ink-soft uppercase">Durum</span>
              <div className="flex flex-wrap justify-center gap-1">
                {CONTEXTS.map((c, i) => <ToolButton key={i} active={value.ctx === i} onClick={() => set({ ctx: i })}>{c[0].split(' ')[0]} : {c[1].split(' ')[0]}</ToolButton>)}
              </div>
            </div>
            {cols.length === 1 && (
              <>
                <Stepper label={labels[0]} value={base.a} color={C_A.ink} onDec={() => set({ cols: [{ a: Math.max(1, base.a - 1), b: base.b }] })} onInc={() => set({ cols: [{ a: Math.min(20, base.a + 1), b: base.b }] })} />
                <Stepper label={labels[1]} value={base.b} color={C_B.ink} onDec={() => set({ cols: [{ a: base.a, b: Math.max(1, base.b - 1) }] })} onInc={() => set({ cols: [{ a: base.a, b: Math.min(20, base.b + 1) }] })} />
              </>
            )}
          </div>
        )}

        {/* Tablo */}
        <div ref={scroller} className="w-full max-w-4xl overflow-x-auto pb-1">
          <div className="mx-auto flex w-fit items-stretch gap-1.5 px-1 pt-7">
            <div className="sticky left-0 z-10 flex flex-col gap-1.5 bg-white pr-1">
              <div className="flex h-14 items-center justify-end rounded-xl px-2 text-right text-sm font-black" style={{ background: C_A.soft, color: C_A.ink }}>{labels[0]}</div>
              <div className="flex h-14 items-center justify-end rounded-xl px-2 text-right text-sm font-black" style={{ background: C_B.soft, color: C_B.ink }}>{labels[1]}</div>
            </div>
            {cols.map((c, i) => {
              const ok = same(c, base)
              const isSel = i === sel && pick === null
              const bad = reveal && !ok
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => tapCol(i)}
                  className={`relative flex w-[72px] shrink-0 flex-col gap-1.5 rounded-2xl p-1 transition active:scale-95 ${isSel ? 'bg-ink/5 ring-3 ring-brand' : pick !== null ? 'ring-2 ring-dashed ring-sky-400' : 'ring-1 ring-line'} ${bad ? 'bg-bad-soft' : ''}`}
                  aria-label={`${i + 1}. sütun: ${fmt(c.a)} ve ${fmt(c.b)}`}
                >
                  {c.op && (
                    <span className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-black text-white ${c.bad && reveal ? 'bg-bad' : 'bg-ink'}`}>
                      {c.op}
                    </span>
                  )}
                  <span className="flex h-12 items-center justify-center rounded-xl bg-white text-xl font-black tabular-nums ring-1 ring-line" style={{ color: C_A.ink }}>{fmt(c.a)}</span>
                  <span className="flex h-12 items-center justify-center rounded-xl bg-white text-xl font-black tabular-nums ring-1 ring-line" style={{ color: C_B.ink }}>{fmt(c.b)}</span>
                  {reveal && i > 0 && <span className={`text-center text-xs font-black ${ok ? 'text-ok' : 'text-bad'}`}>{ok ? '✓ eşdeğer' : '≠ değil'}</span>}
                </button>
              )
            })}
            {task && (find.a !== undefined || find.b !== undefined) && (
              <div className="flex w-[72px] shrink-0 flex-col gap-1.5 rounded-2xl border-2 border-dashed border-brand/50 p-1" aria-label="Aranan sütun">
                <span className="flex h-12 items-center justify-center rounded-xl text-xl font-black" style={{ color: C_A.ink }}>{find.a !== undefined ? fmt(find.a) : '?'}</span>
                <span className="flex h-12 items-center justify-center rounded-xl text-xl font-black" style={{ color: C_B.ink }}>{find.b !== undefined ? fmt(find.b) : '?'}</span>
              </div>
            )}
          </div>
        </div>

        {/* İşlemler */}
        {!locked && (
          <div className="flex w-full max-w-3xl flex-col items-center gap-2 rounded-2xl bg-paper p-3 ring-1 ring-line">
            {pick !== null ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="font-extrabold">{pick + 1}. sütuna eklenecek sütuna dokun.</span>
                <ToolButton onClick={() => setPick(null)}><X size={16} /> Vazgeç</ToolButton>
              </div>
            ) : typing ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <input inputMode="decimal" aria-label={labels[0]} value={typing.a} onChange={(e) => setTyping({ ...typing, a: e.target.value })} className="h-12 w-20 rounded-xl bg-white text-center text-xl font-black ring-2 ring-brand/40 outline-none focus:ring-brand" style={{ color: C_A.ink }} />
                <span className="text-xl font-black">:</span>
                <input inputMode="decimal" aria-label={labels[1]} value={typing.b} onChange={(e) => setTyping({ ...typing, b: e.target.value })} className="h-12 w-20 rounded-xl bg-white text-center text-xl font-black ring-2 ring-sky-300 outline-none focus:ring-sky-500" style={{ color: C_B.ink }} />
                <ToolButton
                  active
                  onClick={() => {
                    const a = Number(typing.a.replace(',', '.')), b = Number(typing.b.replace(',', '.'))
                    if (a > 0 && b > 0 && a < 1e5 && b < 1e5) add({ a: r2(a), b: r2(b), op: 'yazdım' })
                    setTyping(null)
                  }}
                >Ekle</ToolButton>
                <ToolButton onClick={() => setTyping(null)}><X size={16} /></ToolButton>
              </div>
            ) : (
              <>
                <p className="text-center text-sm font-extrabold text-ink-soft">Seçili: <b className="text-ink">{sel + 1}. sütun ({fmt(cur.a)} : {fmt(cur.b)})</b>
                  {reveal && sel > 0 && same(cur, base) && <span> = 1. sütun × {fmt(cur.a / base.a)}</span>}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Stepper label="Sayı" value={k} onDec={() => set({ k: Math.max(2, k - 1) })} onInc={() => set({ k: Math.min(12, k + 1) })} />
                  <div className="flex flex-wrap justify-center gap-1.5 self-end">
                    <ToolButton onClick={() => add({ a: r2(cur.a * k), b: r2(cur.b * k), op: `${sel + 1}. ×${k}`, src: sel })}><X size={15} />{k} ile çarp</ToolButton>
                    <ToolButton disabled={!canDiv} onClick={() => add({ a: r2(cur.a / k), b: r2(cur.b / k), op: `${sel + 1}. ÷${k}`, src: sel })}><Divide size={15} />{ek(k, 'dat')} böl</ToolButton>
                    <ToolButton disabled={cols.length < 2} onClick={() => setPick(sel)}><Plus size={15} /> Başka sütunla topla</ToolButton>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <ToolButton onClick={() => add({ a: r2(cur.a + k), b: r2(cur.b + k), op: `${sel + 1}. +${k} ikisine`, src: sel, bad: true })}>İkisine de {k} ekle</ToolButton>
                  <ToolButton onClick={() => setTyping({ a: '', b: '' })}><PenLine size={15} /> Kendin yaz</ToolButton>
                  <ToolButton disabled={sel === 0} onClick={() => onChange({ ...value, cols: cols.filter((_, i) => i !== sel), sel: Math.max(0, sel - 1) })}><Trash2 size={15} /> Sütunu sil</ToolButton>
                  {!task && <ToolButton active={value.graph} onClick={() => set({ graph: !value.graph })}><ChartScatter size={15} /> Grafik</ToolButton>}
                </div>
              </>
            )}
          </div>
        )}

        {reveal && (
          <div className="grid w-full max-w-4xl gap-3 md:grid-cols-2">
            <Tape col={cur} base={base} max={maxVal} labels={labels} />
            <div className="flex flex-col justify-center gap-2 rounded-2xl bg-ink p-3 text-white">
              <p className="text-center text-sm font-extrabold text-white/70">Birim oran</p>
              <p className="text-center text-lg font-black">
                1 {labels[0].toLocaleLowerCase('tr-TR')} başına <span className="inline-block align-middle text-xl"><MathText text={`[[${fmt(base.b)}/${fmt(base.a)}]]`} /></span> = {fmt(base.b / base.a)} {labels[1].toLocaleLowerCase('tr-TR')}
              </p>
              <p className="text-center text-sm font-bold text-white/80">
                {fmt(cur.a)} : {fmt(cur.b)} için <span className="inline-block align-middle text-base"><MathText text={`[[${fmt(cur.b)}/${fmt(cur.a)}]]`} /></span> = {fmt(cur.b / cur.a)} {same(cur, base) ? '— aynı birim oran ✓' : '— birim oran farklı ✗'}
              </p>
            </div>
          </div>
        )}

        {reveal && value.graph && (
          <div className="w-full max-w-2xl">
            <Plane key={bucket} initial={{ xMin: -xSpan * 0.08, xMax: xSpan * 0.92, yMin: -xSpan * aspect * 0.08, yMax: xSpan * aspect * 0.92 }} aspect={aspect} xLabel={labels[0]} yLabel={labels[1]} label="Oran grafiği">
              <Points cols={cols} />
            </Plane>
            <p className="mt-1 text-center text-sm font-extrabold text-ink-soft">Eşdeğer oranlar (yeşil) orijinden geçen aynı doğru üzerinde; kırmızılar doğrunun dışında.</p>
          </div>
        )}
        {!locked && <p className="text-center text-sm font-bold text-ink-soft">Bir sütuna dokunarak seç, sonra çarp, böl ya da başka bir sütunla topla.</p>}
      </div>
    )
  },
}
