import { useEffect, useRef, useState } from 'react'
import { useGesture } from '@use-gesture/react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Ruler, Search } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../data/types'
import { gcd, pick, randInt } from '../lib/random'
import { fmt } from '../lib/format'
import { sfx } from '../lib/feedback'
import { MathText } from '../components/MathText'
import { Plane, usePlane } from '../interactive/Plane'
import { fmtTick } from '../interactive/axis'
import { useTracker } from '../lib/trackerContext'
import { signed, type GameProps } from './kit'
import { LevelDots, Nudge, Scene, StrategyPicker, useAge } from './kit2'

/**
 * Sayı Doğrusu Tahmini (Van de Walle: referans sayılar, tahmin önce)
 *  1. Tahmin et: yalnızca uçları belli boş sayı doğrusunda sayının yerine iğne koy.
 *  2. Referansla düzelt: doğruyu eş parçalara böl (yarım, çeyrek…), yakınlaştır; iğneyi taşı.
 *  3. Karşılaştır: gerçek yer, ilk tahmin ve düzeltilmiş tahmin birlikte görünür; strateji sorulur.
 */

interface Item {
  /** MathText gösterimi: "37", "[[3/4]]", "√{50}" */
  label: string
  value: number
  /** Gerçek yerin yanında yazılan kısa değer */
  caption: string
  /** Gerçek yeri açıklayan düşünme notu (MathText) */
  hint: string
  /** Kesirse payda (yanılgı soruları için) */
  den?: number
  num?: number
}

interface Cfg {
  min: number
  max: number
  gen: () => Item
  /** Eş parçalara bölünen birim uzunluk */
  unit: number
  /** Bölme seçenekleri: kaç eş parça */
  parts: number[]
  partName: (p: number) => string
  tickLabel: (v: number, parts: number) => string
  /** Tahminden sonra sorulacak "referansı düşün" sorusu (yoksa null) */
  side: (it: Item, g: number) => { q: string; mis?: string } | null
  tool?: { tool: ManipulativeTool; config?: ManipulativeConfig; title: string }
  strategies: string[]
  insight: string
}

const ROUNDS = 6
const approx = (v: number, d = 2) => (Math.abs(v * 10 ** d - Math.round(v * 10 ** d)) < 1e-9 ? '' : '≈ ') + signed(fmt(v, d))
const intLabel = (v: number) => signed(fmt(Math.round(v * 100) / 100, 2))
const fracLabel = (v: number, parts: number) => {
  const n = Math.round(v * parts)
  if (n % parts === 0) return String(n / parts)
  const g = gcd(n, parts)
  return `[[${n / g}/${parts / g}]]`
}

// ─── Sayı üreteçleri ───────────────────────────────────────────────────────
const intItem = (max: number, near: number) => (): Item => {
  const edge = Math.max(1, Math.round(max * 0.04))
  const v = randInt(edge, max - edge)
  const mid = max / 2
  const a = Math.floor(v / near) * near
  const side = v === mid ? 'tam ortada' : `ortadaki ${fmt(mid)} sayısının ${v < mid ? 'solunda' : 'sağında'}`
  const between = v % near ? `; ${fmt(a)} ile ${fmt(a + near)} arasında` : ''
  return { label: fmt(v), value: v, caption: fmt(v), hint: `${fmt(v)}, ${side}${between}.` }
}

function fraction01(): Item {
  let d = 2, n = 1
  do {
    d = pick([2, 3, 4, 5, 6, 8, 10])
    n = randInt(1, d - 1)
  } while (gcd(n, d) !== 1)
  const f = `[[${n}/${d}]]`
  const hint = 2 * n === d
    ? `${f} tam ortadadır.`
    : 2 * n < d
      ? `${d} parçanın yarısı ${fmt(d / 2)} parça; ${n} bundan az. ${f} yarımdan küçük, sol yarıda.`
      : `${d} parçanın yarısı ${fmt(d / 2)} parça; ${n} bundan çok. ${f} yarımdan büyük${d - n === 1 ? `; 1’e yalnızca [[1/${d}]] var.` : ', sağ yarıda.'}`
  return { label: f, value: n / d, caption: approx(n / d), hint: `${hint} 1 bütünü ${d} eş parçaya bölüp ${n} parça sayabilirsin.`, den: d, num: n }
}

function fraction02(): Item {
  let d = 2, n = 1
  do {
    d = pick([2, 3, 4, 5, 6, 8])
    n = randInt(1, 2 * d - 1)
  } while (n === d || gcd(n, d) !== 1)
  const base = { value: n / d, caption: approx(n / d), den: d, num: n }
  if (n < d) return { ...base, label: `[[${n}/${d}]]`, hint: `[[${n}/${d}]] 1’den küçük: 0 ile 1 arasında. 0 ile 1 arasını ${d} eş parçaya böl.` }
  const mixed = `[[1 ${n - d}/${d}]]`
  return Math.random() < 0.5
    ? { ...base, label: mixed, hint: `${mixed}: 1 bütün ve [[${n - d}/${d}]]. 1’in sağında, 1 ile 2 arasında.` }
    : { ...base, label: `[[${n}/${d}]]`, hint: `Pay paydadan büyük, yani 1’den büyük: [[${n}/${d}]] = ${mixed}.` }
}

function decimalPercent(): Item {
  const kind = pick(['tenth', 'hundredth', 'percent'] as const)
  if (kind === 'tenth') {
    const t = randInt(1, 9)
    return { label: fmt(t / 10), value: t / 10, caption: fmt(t / 10), hint: `${fmt(t / 10)} = [[${t}/10]]: 1 bütünü 10 eş parçaya böl, ${t} parça say.` }
  }
  if (kind === 'hundredth') {
    let h = 5
    do h = randInt(5, 95)
    while (h % 10 === 0)
    const a = Math.floor(h / 10)
    return { label: fmt(h / 100, 2), value: h / 100, caption: fmt(h / 100, 2), hint: `${fmt(h / 100, 2)} = [[${h}/100]]; ${fmt(a / 10)} ile ${fmt((a + 1) / 10)} arasında.` }
  }
  const p = randInt(1, 19) * 5
  return { label: `%${p}`, value: p / 100, caption: `%${p} = ${fmt(p / 100, 2)}`, hint: `%${p} = [[${p}/100]] = ${fmt(p / 100, 2)}. Doğrunun tamamı %100 demektir.` }
}

function rational(): Item {
  const neg = Math.random() < 0.7
  const kind = pick(['int', 'half', 'frac'] as const)
  let v = 0
  let label = ''
  let extra = ''
  if (kind === 'int') {
    v = randInt(1, 9) * (neg ? -1 : 1)
    label = signed(String(v))
  } else if (kind === 'half') {
    v = ((randInt(0, 9) * 2 + 1) / 2) * (neg ? -1 : 1)
    label = signed(fmt(v))
  } else {
    const d = pick([2, 4])
    const n = randInt(0, d === 2 ? 9 : 19) * 2 + 1
    v = (n / d) * (neg ? -1 : 1)
    label = `${neg ? '−' : ''}[[${n}/${d}]]`
    extra = ` = ${signed(fmt(v, 2))}`
  }
  const side = `0’ın ${v < 0 ? 'solunda' : 'sağında'}`
  const rest = Number.isInteger(v) ? `0’a uzaklığı ${Math.abs(v)}.` : `${signed(String(Math.floor(v)))} ile ${signed(String(Math.ceil(v)))} arasında.`
  return { label, value: v, caption: signed(fmt(v, 2)), hint: `${label}${extra}: ${side}; ${rest}` }
}

function squareRoot(perfectOk: boolean): Item {
  let n = 2
  if (perfectOk && Math.random() < 0.15) n = pick([4, 9, 16, 25, 36, 49, 64, 81])
  else {
    do n = randInt(2, 99)
    while (Number.isInteger(Math.sqrt(n)))
  }
  const r = Math.sqrt(n)
  const a = Math.floor(r)
  const hint = a * a === n
    ? `${a} × ${a} = ${n}, yani √{${n}} = ${a}.`
    : `${a} × ${a} = ${a * a} ve ${a + 1} × ${a + 1} = ${(a + 1) ** 2}. √{${n}}, ${a} ile ${a + 1} arasında; ${n}, ${n - a * a < (a + 1) ** 2 - n ? a * a : (a + 1) ** 2} sayısına daha yakın.`
  return { label: `√{${n}}`, value: r, caption: approx(r), hint }
}

// ─── Yanılgı soruları ──────────────────────────────────────────────────────
const midSide = (mid: number) => (it: Item, g: number) =>
  (it.value - mid) * (g - mid) < 0 && Math.abs(it.value - mid) > mid * 0.04
    ? { q: `${it.label}, ortadaki ${fmt(mid)} sayısından büyük mü, küçük mü? İğnen hangi yarıda?` }
    : null

const CFG: Record<Grade, Cfg> = {
  1: {
    min: 0, max: 20, gen: intItem(20, 5), unit: 20, parts: [2, 4, 20],
    partName: (p) => (p === 2 ? 'Ortası' : p === 4 ? '5’ler' : '1’ler'), tickLabel: intLabel, side: midSide(10),
    tool: { tool: 'numberline', config: { min: 0, max: 20, step: 1 }, title: 'Sayı doğrusu' },
    strategies: ['Ortadaki 10’u düşündüm', '5’leri düşündüm', 'Uca yakın diye', 'Birer birer saydım'],
    insight: 'Ortadaki 10’u ve 5’leri aklında işaretleyince tahminlerin keskinleşti. 15 nerede olurdu?',
  },
  2: {
    min: 0, max: 100, gen: intItem(100, 10), unit: 100, parts: [2, 4, 10],
    partName: (p) => (p === 2 ? 'Ortası (50)' : p === 4 ? '25’ler' : '10’lar'), tickLabel: intLabel, side: midSide(50),
    tool: { tool: 'numberline', config: { min: 0, max: 100, step: 10 }, title: 'Sayı doğrusu' },
    strategies: ['Ortadaki 50’yi düşündüm', '25 ve 75’i düşündüm', 'Onluklarla saydım', 'Uca yakın diye'],
    insight: 'Önce ortadaki 50’yi, sonra onlukları düşününce sayının yerini daha kolay buldun. Ortayı bulmak neden bu kadar işe yarıyor?',
  },
  3: {
    min: 0, max: 1000, gen: intItem(1000, 100), unit: 1000, parts: [2, 4, 10],
    partName: (p) => (p === 2 ? 'Ortası (500)' : p === 4 ? '250’ler' : '100’ler'), tickLabel: intLabel, side: midSide(500),
    tool: { tool: 'numberline', config: { min: 0, max: 1000, step: 100 }, title: 'Sayı doğrusu' },
    strategies: ['Ortadaki 500’ü düşündüm', '250 ve 750’yi düşündüm', 'Yüzlüklerle saydım', 'Uca yakın diye'],
    insight: '500’ü ve yüzlükleri referans alınca büyük sayıları da yerleştirebiliyorsun. 250 ile 750 nerede olurdu?',
  },
  4: {
    min: 0, max: 1, gen: fraction01, unit: 1, parts: [2, 3, 4, 5, 6, 8, 10],
    partName: (p) => `${p} parça`, tickLabel: fracLabel,
    side: (it, g) => {
      if (!it.den || it.num === undefined || 2 * it.num === it.den) return null
      if ((it.value - 0.5) * (g - 0.5) >= 0) return null
      return {
        q: `${it.label} yarımdan büyük mü, küçük mü? ${it.den} parçanın yarısı kaç parça eder?`,
        mis: it.num === 1 && g > 0.5 ? 'Paydası büyük birim kesri daha büyük sandı (payda büyüdükçe parça küçülür).' : 'Kesrin yarımdan büyük ya da küçük olduğuna karar vermede zorlandı.',
      }
    },
    tool: { tool: 'kesirdogrusu', config: { min: 0, max: 1, dens: [2, 3, 4, 5, 6, 8, 10] }, title: 'Kesir sayı doğrusu' },
    strategies: ['Yarımla karşılaştırdım', 'Çeyrekleri düşündüm', '0’a ya da 1’e yakınlık', 'Eş parçalara böldüm'],
    insight: 'Kesri yarımla karşılaştırmak (pay, paydanın yarısından büyük mü?) yerini bulmanın güçlü bir yolu. Paydası büyüyen kesirlerin parçaları neden küçülüyor?',
  },
  5: {
    min: 0, max: 2, gen: fraction02, unit: 1, parts: [2, 3, 4, 5, 6, 8],
    partName: (p) => `Her bütün ${p} parça`, tickLabel: fracLabel,
    side: (it, g) => {
      if ((it.value - 1) * (g - 1) < 0)
        return { q: `${it.label} 1 bütünden büyük mü, küçük mü? Pay ile paydayı karşılaştır.`, mis: it.value > 1 ? 'Bileşik ya da tam sayılı kesri 1’den küçük sandı.' : undefined }
      return null
    },
    tool: { tool: 'kesirdogrusu', config: { min: 0, max: 2, dens: [2, 3, 4, 5, 6, 8] }, title: 'Kesir sayı doğrusu' },
    strategies: ['Önce 1’den büyük mü diye baktım', 'Yarımları düşündüm', 'Eş parçalara böldüm', 'Tam sayılı kesre çevirdim'],
    insight: 'Önce kesrin 1’den büyük mü küçük mü olduğuna bakmak işini kolaylaştırdı. Tam sayılı kesirle bileşik kesir aynı noktayı gösterebilir mi?',
  },
  6: {
    min: 0, max: 1, gen: decimalPercent, unit: 1, parts: [2, 4, 5, 10],
    partName: (p) => `${p} parça`, tickLabel: (v) => fmt(Math.round(v * 100) / 100, 2),
    side: (it, g) => {
      if ((it.value - 0.5) * (g - 0.5) >= 0 || Math.abs(it.value - 0.5) < 0.03) return null
      return { q: `${it.label} yarımdan (0,5 = %50) büyük mü, küçük mü? 0,5’i 0,50 diye de yazabilir misin?`, mis: /^\d,\d\d$/.test(it.label) && it.value < 0.5 ? 'Ondalık kısmı uzun olan sayıyı daha büyük sandı.' : undefined }
    },
    tool: { tool: 'kesirdogrusu', config: { min: 0, max: 1, dens: [2, 4, 5, 10] }, title: 'Ondalık sayı doğrusu' },
    strategies: ['Yarımı (0,5 = %50) düşündüm', 'Çeyrekleri (%25, %75) düşündüm', 'Onda birlere böldüm', 'Kesre çevirdim'],
    insight: 'Ondalık gösterim, kesir ve yüzde aynı sayının farklı yazılışlarıdır: %50 = 0,5 = yarım. Sence %25 ile 0,3 hangisi daha büyük?',
  },
  7: {
    min: -10, max: 10, gen: rational, unit: 10, parts: [2, 10, 20],
    partName: (p) => (p === 2 ? '5’ler' : p === 10 ? '1’ler' : 'Yarımlar'), tickLabel: intLabel,
    side: (it, g) => {
      if (it.value * g < 0) return { q: `${it.label} pozitif mi negatif mi? 0’ın hangi tarafında olmalı?`, mis: 'Negatif sayının işaretini göz ardı etti.' }
      if (it.value < -1.5 && g < 0 && Math.abs(g - (-10 - it.value)) < 1.2 && Math.abs(it.value + 5) > 1.5)
        return { q: `${it.label} ile 0 arasında kaç birim var? İğnen 0’dan kaç birim uzakta?`, mis: 'Negatif sayıların sırasını ters düşündü (ör. −7’yi −3’ten büyük sandı).' }
      return null
    },
    tool: { tool: 'numberline', config: { min: -10, max: 10, step: 1 }, title: 'Sayı doğrusu' },
    strategies: ['0’ı referans aldım', '−5 ve 5’i düşündüm', 'Tam sayılar arasına yerleştirdim', 'Uca yakın diye'],
    insight: 'Negatif sayılar 0’ın solundadır ve 0’dan uzaklaştıkça küçülür: −7, −2’den küçüktür. −3,5 hangi iki tam sayının arasında?',
  },
  8: {
    min: 0, max: 10, gen: () => squareRoot(true), unit: 10, parts: [2, 10, 20],
    partName: (p) => (p === 2 ? 'Ortası (5)' : p === 10 ? 'Tam sayılar' : 'Yarımlar'), tickLabel: intLabel,
    side: (it, g) => {
      if (Math.floor(g) === Math.floor(it.value) || Math.abs(g - it.value) < 0.5) return null
      const n = Math.round(it.value * it.value)
      return {
        q: `${it.label} hangi iki tam sayı arasında? Karesi ${n} sayısına en yakın olan tam sayıları düşün.`,
        mis: Math.abs(g - n / 2) < 0.6 ? 'Karekökü sayının yarısı sandı.' : undefined,
      }
    },
    strategies: ['En yakın tam kareleri düşündüm', 'Yarım noktaları düşündüm', 'Tam sayılar arasına yerleştirdim', 'Uca yakın diye'],
    insight: 'Kareköklü bir sayının yerini bulmak için en yakın tam karelere baktın: √50, 49 ile 64 arasında olduğundan 7 ile 8 arasındadır ve 7’ye daha yakındır.',
  },
}

function makeItems(cfg: Cfg): Item[] {
  const out: Item[] = []
  const span = cfg.max - cfg.min
  for (let i = 0; out.length < ROUNDS && i < 600; i++) {
    const it = cfg.gen()
    const gap = i < 300 ? 0.05 : 0.005
    if (out.some((o) => Math.abs(o.value - it.value) < span * gap || o.label === it.label)) continue
    out.push(it)
  }
  while (out.length < ROUNDS) out.push(cfg.gen())
  return out
}

type Phase = 'estimate' | 'refine' | 'reveal'

/** Sayı doğrusundaki her şey: çizgi, bölmeler, yakınlaştırma çentikleri, iğneler */
function Marks({ cfg, phase, parts, guess, first, item, onMove, onZoom }: { cfg: Cfg; phase: Phase; parts: number; guess: number | null; first: number | null; item: Item; onMove: (v: number) => void; onZoom: () => void }) {
  const P = usePlane()
  const y0 = P.sy(0)
  const span = cfg.max - cfg.min
  const vSpan = P.view.xMax - P.view.xMin
  const zoomed = vSpan < (span + span * 0.16) * 0.72
  useEffect(() => {
    if (zoomed) onZoom()
  }, [zoomed, onZoom])

  // Yakınlaştırınca beliren ince çentikler (tahmin aşamasında gizli)
  const zt: number[] = []
  const zStep = P.step
  if (zoomed && phase !== 'estimate') {
    const s = Math.max(cfg.min, Math.ceil(P.view.xMin / zStep) * zStep)
    for (let v = s, i = 0; v <= Math.min(cfg.max, P.view.xMax) + 1e-9 && i < 400; v = s + ++i * zStep) zt.push(Math.round(v * 1e6) / 1e6)
  }
  // Eş parçalar
  const pt: number[] = []
  if (parts && phase !== 'estimate') {
    const d = cfg.unit / parts
    for (let k = 0, v = cfg.min; v <= cfg.max + 1e-9; v = cfg.min + ++k * d) pt.push(Math.round(v * 1e6) / 1e6)
  }
  const pPx = parts ? (cfg.unit / parts) * P.unitPx : 0
  const endLab = (v: number) => cfg.tickLabel(v, parts || 1)
  const halfOnly = parts === 2

  return (
    <g>
      <line x1={P.sx(cfg.min)} x2={P.sx(cfg.max)} y1={y0} y2={y0} stroke="#1f2340" strokeWidth={4} strokeLinecap="round" />
      {zt.map((v) => (
        <g key={`z${v}`}>
          <line x1={P.sx(v)} x2={P.sx(v)} y1={y0 - 5} y2={y0 + 5} stroke="#8a8fb0" strokeWidth={1.2} />
          {zStep * P.unitPx > 38 && <text x={P.sx(v)} y={y0 - 10} textAnchor="middle" fontSize={11} fontWeight={800} fill="#8a8fb0" stroke="#fff" strokeWidth={3} paintOrder="stroke">{fmtTick(v, zStep)}</text>}
        </g>
      ))}
      {pt.map((v) => (
        <g key={`p${v}`} className="animate-fade-up">
          <line x1={P.sx(v)} x2={P.sx(v)} y1={y0 - 13} y2={y0 + 13} stroke="#0d9488" strokeWidth={halfOnly ? 3 : 2.2} strokeLinecap="round" />
          {pPx > 30 && v > cfg.min + 1e-9 && v < cfg.max - 1e-9 && (
            <foreignObject x={P.sx(v) - 26} y={y0 + 17} width={52} height={40}>
              <div className="flex h-full items-start justify-center text-[15px] leading-none font-black text-teal-700"><MathText text={cfg.tickLabel(v, parts)} /></div>
            </foreignObject>
          )}
        </g>
      ))}
      {[cfg.min, cfg.max].map((v) => (
        <g key={`e${v}`}>
          <line x1={P.sx(v)} x2={P.sx(v)} y1={y0 - 16} y2={y0 + 16} stroke="#1f2340" strokeWidth={4} strokeLinecap="round" />
          <foreignObject x={P.sx(v) - 30} y={y0 + 19} width={60} height={40}>
            <div className="flex h-full items-start justify-center text-[20px] leading-none font-black text-ink"><MathText text={endLab(v)} /></div>
          </foreignObject>
        </g>
      ))}
      {cfg.min < 0 && (
        <g>
          <line x1={P.sx(0)} x2={P.sx(0)} y1={y0 - 12} y2={y0 + 12} stroke="#1f2340" strokeWidth={3} />
          {(!parts || phase === 'estimate') && <text x={P.sx(0)} y={y0 + 36} textAnchor="middle" fontSize={18} fontWeight={900} fill="#1f2340">0</text>}
        </g>
      )}
      {phase === 'reveal' && guess !== null && (
        <rect x={Math.min(P.sx(guess), P.sx(item.value))} y={y0 - 4} width={Math.max(2, Math.abs(P.sx(guess) - P.sx(item.value)))} height={8} rx={4} fill="#f97316" fillOpacity={0.45} />
      )}
      {first !== null && phase !== 'estimate' && (
        <g pointerEvents="none" opacity={0.75}>
          <line x1={P.sx(first)} x2={P.sx(first)} y1={y0 - 26} y2={y0} stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 3" />
          <circle cx={P.sx(first)} cy={y0 - 30} r={6} fill="#fff" stroke="#94a3b8" strokeWidth={2.5} />
        </g>
      )}
      {phase === 'reveal' && (
        <g pointerEvents="none" className="animate-pop" style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}>
          <line x1={P.sx(item.value)} x2={P.sx(item.value)} y1={y0 - 62} y2={y0} stroke="#16a34a" strokeWidth={3} />
          <path d={`M${P.sx(item.value)} ${y0 - 62} l18 7 l-18 7 z`} fill="#22c55e" />
          <circle cx={P.sx(item.value)} cy={y0} r={6} fill="#16a34a" stroke="#fff" strokeWidth={2} />
        </g>
      )}
      {guess !== null && <Pin x={guess} y0={y0} locked={phase === 'reveal'} onMove={onMove} />}
    </g>
  )
}

/** Sürüklenebilir tahmin iğnesi */
function Pin({ x, y0, locked, onMove }: { x: number; y0: number; locked: boolean; onMove: (v: number) => void }) {
  const P = usePlane()
  const ref = useRef<SVGGElement>(null)
  useGesture(
    {
      onDrag: ({ xy: [cx, cy], event }) => {
        event.stopPropagation()
        if (locked) return
        onMove(P.fromClient(cx, cy).x)
      },
    },
    { target: ref, eventOptions: { passive: false } },
  )
  const px = P.sx(x)
  return (
    <g ref={ref} data-handle style={{ cursor: locked ? 'default' : 'grab', touchAction: 'none' }}>
      <rect x={px - 24} y={y0 - 70} width={48} height={84} fill="transparent" />
      <line x1={px} x2={px} y1={y0 - 18} y2={y0} stroke="#ea580c" strokeWidth={3} />
      <path transform={`translate(${px} ${y0})`} d="M0 -14 C-11 -25 -13 -32 -13 -37 a13 13 0 0 1 26 0 c0 5 -2 12 -13 23z" fill="#f97316" stroke="#fff" strokeWidth={2.5} />
      <circle cx={px} cy={y0 - 37} r={4.5} fill="#fff" />
    </g>
  )
}

export default function NumberLineGuess({ grade, onFinish }: GameProps) {
  const cfg = CFG[grade]
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const track = useTracker()
  const [items] = useState(() => makeItems(cfg))
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>('estimate')
  const [guess, setGuess] = useState<number | null>(null)
  const [first, setFirst] = useState<number | null>(null)
  const [parts, setParts] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; mis?: string } | null>(null)
  const [picked, setPicked] = useState(false)
  const downOnButton = useRef(false)
  const stats = useRef({ firstErr: [] as number[], finalErr: [] as number[], benchRounds: 0, zoomed: false, usedParts: false, over: false })
  const item = items[round]
  const span = cfg.max - cfg.min
  const pad = span * 0.08
  const fine = span / (grade <= 3 ? cfg.max : 200)

  const clampV = (v: number) => Math.min(cfg.max, Math.max(cfg.min, Math.round(v / (span / 1000)) * (span / 1000)))
  const move = (v: number) => phase !== 'reveal' && setGuess(clampV(v))
  const onZoom = useRef(() => {
    if (!stats.current.zoomed) {
      stats.current.zoomed = true
      track.strategy('Yakınlaştırarak inceledi')
    }
  }).current

  const commitEstimate = () => {
    if (guess === null) return
    const e = Math.abs(guess - item.value) / span
    setFirst(guess)
    stats.current.firstErr.push(e)
    track.attempt(e <= 0.05)
    const s = cfg.side(item, guess)
    setNudge(s)
    setPhase('refine')
  }

  const choosePart = (p: number) => {
    setParts(p === parts ? 0 : p)
    if (p !== parts && !stats.current.usedParts) {
      stats.current.usedParts = true
      stats.current.benchRounds++
    }
  }

  const commitFinal = () => {
    if (guess === null) return
    const e = Math.abs(guess - item.value) / span
    stats.current.finalErr.push(e)
    track.item((stats.current.firstErr[round] ?? 1) <= 0.05)
    if (e <= 0.03) sfx.ok()
    setNudge(null)
    setPhase('reveal')
  }

  const next = () => {
    if (round + 1 >= ROUNDS) {
      const s = stats.current
      if (s.over) return
      s.over = true
      const close = (arr: number[]) => arr.reduce((a, e) => a + Math.max(0, 100 - e * 500), 0) / ROUNDS
      const fin = close(s.finalErr)
      const fst = close(s.firstErr)
      const better = s.finalErr.filter((e, i) => e < (s.firstErr[i] ?? 1) - 1e-9).length
      onFinish({
        stars: fin >= 85 ? 3 : fin >= 65 ? 2 : 1,
        score: Math.round(fin * 10 + fst * 5),
        summary: `İlk tahminlerin ortalama %${Math.round(fst)} isabetliydi; referanslarla düzelttikten sonra %${Math.round(fin)} oldu. ${better} sayıda tahminini iyileştirdin.`,
        insight: cfg.insight,
      })
      return
    }
    setRound(round + 1)
    setGuess(null)
    setFirst(null)
    setParts(0)
    setNudge(null)
    setPicked(false)
    stats.current.usedParts = false
    setPhase('estimate')
  }

  const e1 = first !== null ? Math.abs(first - item.value) : 0
  const e2 = guess !== null ? Math.abs(guess - item.value) : 0
  const dec = grade >= 4 ? 2 : 0
  const dist = (d: number) => (dec ? fmt(d, 2) : fmt(Math.round(d)))
  const quality = (d: number) => (d / span <= 0.02 ? 'Neredeyse tam üstünde! 🎯' : d / span <= 0.06 ? 'Çok yakın! 👏' : d / span <= 0.15 ? 'Yakın.' : 'Biraz uzakta.')
  const steps = ['Tahmin et', 'Referansla düzelt', 'Karşılaştır']
  const si = phase === 'estimate' ? 0 : phase === 'refine' ? 1 : 2
  const panel = dark ? 'bg-slate-800/90 ring-1 ring-slate-600 text-slate-100' : 'bg-white/95 ring-1 ring-line text-ink'

  return (
    <Scene grade={grade} className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <LevelDots current={round} total={ROUNDS} />
        <div className="flex gap-1">
          {steps.map((s, i) => (
            <span key={s} className={`chip px-2.5 py-1 text-xs ${i === si ? 'bg-teal-600 text-white' : i < si ? 'bg-teal-100 text-teal-800' : dark ? 'bg-slate-700 text-slate-300' : 'bg-white text-ink-soft ring-1 ring-line'}`}>{i + 1}. {s}</span>
          ))}
        </div>
      </div>

      <div className={`mb-3 flex items-center gap-4 rounded-2xl px-4 py-3 ${panel}`}>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-extrabold tracking-wide uppercase ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{phase === 'estimate' ? 'Önce tahmin et: bu sayı nerede?' : phase === 'refine' ? 'Referans noktalarıyla düzelt' : 'Gerçek yeri'}</p>
          <p className="text-sm font-bold">
            {phase === 'estimate' ? 'Doğruya dokun ya da iğneyi sürükle. Henüz ölçme; göz kararı karar ver.' : phase === 'refine' ? 'Doğruyu eş parçalara böl ya da iki parmakla yakınlaştır. İğneyi taşıyabilirsin.' : 'Yeşil bayrak gerçek yeri, gri halka ilk tahminini gösteriyor.'}
          </p>
        </div>
        <p key={round} className="shrink-0 rounded-2xl bg-teal-600 px-4 py-2 text-4xl font-black text-white animate-pop sm:text-5xl"><MathText text={item.label} /></p>
      </div>

      <div onPointerDownCapture={(e) => (downOnButton.current = !!(e.target as Element).closest('button'))}>
      <Plane
        key={`${round}-${phase === 'reveal'}`}
        mode="x"
        axes={false}
        labels={false}
        initial={{ xMin: cfg.min - pad, xMax: cfg.max + pad, yMin: -1, yMax: 1 }}
        minSpan={span / 200}
        maxSpan={span * 2}
        onTap={(p) => !downOnButton.current && move(p.x)}
        label={`Sayı doğrusu: ${cfg.min} ile ${cfg.max} arası`}
      >
        <Marks cfg={cfg} phase={phase} parts={parts} guess={guess} first={first} item={item} onMove={move} onZoom={onZoom} />
      </Plane>
      </div>

      {phase !== 'reveal' && guess !== null && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button type="button" onClick={() => move(guess - fine)} className={`grid ${age.big ? "size-14" : "size-12"} place-items-center rounded-xl bg-white text-ink ring-1 ring-line active:scale-95`} aria-label="İğneyi biraz sola taşı"><ChevronLeft size={22} /></button>
          <span className={`text-sm font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>İnce ayar</span>
          <button type="button" onClick={() => move(guess + fine)} className={`grid ${age.big ? "size-14" : "size-12"} place-items-center rounded-xl bg-white text-ink ring-1 ring-line active:scale-95`} aria-label="İğneyi biraz sağa taşı"><ChevronRight size={22} /></button>
        </div>
      )}

      {phase === 'estimate' && (
        <div className="mt-3 text-center">
          <button type="button" onClick={commitEstimate} disabled={guess === null} className="btn-primary min-w-60 text-lg"><Check size={20} />{guess === null ? 'Önce doğruya dokun' : 'Tahminim bu'}</button>
        </div>
      )}

      {phase === 'refine' && (
        <div className="mt-3">
          {nudge && <Nudge question={nudge.q} misconception={nudge.mis} tool={cfg.tool?.tool} toolConfig={cfg.tool?.config} toolTitle={cfg.tool?.title} onClose={() => setNudge(null)} />}
          <div className={`mt-3 rounded-2xl p-3 ${panel}`}>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-black"><Ruler size={16} className="text-teal-600" />Referans çentikleri: doğruyu kaç eş parçaya bölmek işine yarar?</p>
            <div className="flex flex-wrap gap-2">
              {cfg.parts.map((p) => (
                <button key={p} type="button" onClick={() => choosePart(p)} aria-pressed={parts === p} className={`min-h-12 rounded-xl px-3.5 text-sm font-extrabold ring-1 transition active:scale-95 ${parts === p ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-ink ring-line hover:bg-teal-50'}`}>
                  {cfg.partName(p)}
                </button>
              ))}
            </div>
            <p className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}><Search size={14} />Yakınlaştırınca daha ince çentikler belirir.</p>
          </div>
          <div className="mt-3 text-center">
            <button type="button" onClick={commitFinal} className="btn-primary min-w-60 text-lg"><Check size={20} />Son kararım</button>
          </div>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="mt-3 animate-fade-up">
          <div className={`rounded-2xl p-4 ${panel}`} aria-live="polite">
            <p className="text-lg font-black">
              <MathText text={item.label} /> {item.caption !== item.label && <span className="font-extrabold opacity-80">({item.caption})</span>} · {quality(e2)}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className={`rounded-xl p-2 ${dark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <p className="text-xs font-extrabold opacity-70">İlk tahminin uzaklığı</p>
                <p className="text-xl font-black tabular-nums">{dist(e1)}</p>
              </div>
              <div className={`rounded-xl p-2 ${e2 < e1 - 1e-9 ? 'bg-emerald-100 text-emerald-900' : dark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <p className="text-xs font-extrabold opacity-70">Düzeltilmiş tahmin</p>
                <p className="text-xl font-black tabular-nums">{dist(e2)}</p>
              </div>
            </div>
            <p className="mt-2 text-sm font-bold opacity-90"><MathText text={item.hint} /></p>
            {e2 < e1 - 1e-9 && <p className="mt-1 text-sm font-extrabold text-emerald-600">Referanslar tahminini {dist(e1 - e2)} yaklaştırdı.</p>}
          </div>
          {!picked && <StrategyPicker question="Tahmin ederken neyi referans aldın?" options={cfg.strategies} onPick={() => setPicked(true)} />}
          <div className="mt-3 text-center">
            <button type="button" onClick={next} className="btn-primary min-w-60 text-lg">{round + 1 >= ROUNDS ? 'Bitir' : 'Sonraki sayı'}<ArrowRight size={18} /></button>
          </div>
        </div>
      )}
    </Scene>
  )
}
