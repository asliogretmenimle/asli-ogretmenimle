import { useRef, useState } from 'react'
import { useGesture } from '@use-gesture/react'
import { ArrowDown, ArrowUp, Check, Link2, PackagePlus, Scissors, Sprout, Undo2 } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import { DragPoint, Plane, usePlane } from '../../../interactive/Plane'
import { ek } from '../../../lib/generators'
import type { Ctl, MissionDef } from './mission'
import { CaveBox, Chip, Gem, GemCanvas, GEMS, Label, NumPad, Pick, Readout, Stepper, darkBtn, gemBtn, nf, padNum, type GemName } from './ui'
import { pick, useTask } from './shared'

/** SVG içinde üslü yazı: 2³ */
function SvgPow({ x, y, base, exp, size = 20, fill = '#fff', anchor = 'middle', pre = '', post = '' }: { x: number; y: number; base: string | number; exp: string | number; size?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; pre?: string; post?: string }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={900} fill={fill} textAnchor={anchor}>
      {pre}{base}<tspan dy={-size * 0.42} fontSize={size * 0.66}>{exp}</tspan>{post && <tspan dy={size * 0.42}>{post}</tspan>}
    </text>
  )
}

/* ═════════════ 1. Birleşen zincirler (a^m · a^n) ═════════════ */

function Chains({ ctl }: { ctl: Ctl }) {
  const [phase, setPhase] = useState<'merge' | 'exp' | 'split' | 'predict' | 'done'>('merge')
  const [drag, setDrag] = useState(0)
  const [e, setE] = useState(1)
  const [cut, setCut] = useState<number | null>(null)
  const [at, setAt] = useState(1)
  const [splits, setSplits] = useState<number[]>([])
  const [p, setP] = useState(1)
  const svgRef = useRef<SVGSVGElement>(null)
  const chainB = useRef<SVGGElement>(null)

  useTask(ctl, phase === 'merge'
    ? 'Bir kristal önce 3 gece ikiye bölündü (2^{3}), sonra 4 gece daha (2^{4}). Mor zinciri maviye sürükle ya da “Birleştir”e dokun.'
    : phase === 'exp' ? 'Birleşen zincirde kaç tane “× 2” var? 2^{3} · 2^{4} = 2^{?}'
    : phase === 'split' ? `2^{7} zincirini iki parçaya ayır: zincirde bir boşluğa dokun ya da ayırma yerini seç. Farklı ayırmaların hepsini bul (${splits.length}/3).`
    : phase === 'predict' ? 'Zincir çizmeden tahmin et: 5^{2} · 5^{6} = 5^{?}'
    : 'Çarpan zincirlerinin sırrını buldun!')

  const merge = () => {
    if (phase !== 'merge') return
    setDrag(0)
    setPhase('exp')
    ctl.ok()
    ctl.strat('Zincirleri birleştirip çarpanları saydı')
  }
  useGesture(
    {
      onDrag: ({ movement: [mx], last, event }) => {
        event.stopPropagation()
        if (phase !== 'merge') return
        const r = svgRef.current?.getBoundingClientRect()
        const k = r ? 600 / r.width : 1
        const d = Math.min(0, mx * k)
        if (last) {
          if (d < -110) merge()
          else setDrag(0)
          return
        }
        setDrag(d)
      },
    },
    { target: chainB, eventOptions: { passive: false } },
  )

  const checkE = () => {
    if (e === 7) {
      ctl.ok()
      ctl.note('2^{3} · 2^{4} = (2 · 2 · 2) · (2 · 2 · 2 · 2) = 2^{7} = 8 · 16 = 128')
      setPhase('split')
      return
    }
    if (e === 12) return ctl.miss('Zincirdeki “× 2” kristallerini say: 3 tane mavi, 4 tane mor. Birleşince kaç tane olur? Üsleri çarpmak doğru mu?', 'Aynı tabanlı kuvvetleri çarparken üsleri çarptı (2³ · 2⁴ = 2¹²)', 'carpanagaci')
    ctl.miss(`2^{${e}} = ${nf(2 ** e)}. Ama 8 · 16 = 128. Zincirde kaç tane “× 2” var?`)
  }
  const doSplit = (a: number) => {
    if (phase !== 'split' && phase !== 'predict' && phase !== 'done') return
    setCut(a)
    const key = Math.min(a, 7 - a)
    if (splits.includes(key)) {
      if (a !== key || true) ctl.info(`2^{${a}} · 2^{${7 - a}} = ${nf(2 ** a)} · ${nf(2 ** (7 - a))} = 128. Bu ayırmayı (ya da yer değiştirmiş hâlini) zaten buldun; başka bir boşluk dene.`)
      return
    }
    const n = [...splits, key]
    setSplits(n)
    ctl.ok()
    ctl.solve(`zincir:${key}`, `2^{${key}} · 2^{${7 - key}} = 2^{7}`)
    ctl.note(`2^{${a}} · 2^{${7 - a}} = ${nf(2 ** a)} · ${nf(2 ** (7 - a))} = 128 = 2^{7}`)
    if (n.length === 3 && phase === 'split') setPhase('predict')
  }
  const checkP = () => {
    if (p === 8) {
      ctl.ok()
      ctl.note('Aynı tabanlı kuvvetler çarpılırken çarpanlar birleşir, üsler toplanır: a^{m} · a^{n} = a^{m + n}')
      setPhase('done')
      ctl.complete()
      return
    }
    if (p === 12) return ctl.miss('5^{2} · 5^{6} zincirinde kaç tane “× 5” olurdu? 2 tane ve 6 tane yan yana gelince…', 'Aynı tabanlı kuvvetleri çarparken üsleri çarptı')
    ctl.miss('Zinciri hayal et: 5^{2} iki tane “× 5”, 5^{6} altı tane “× 5”. Hepsi bir arada kaç tane?')
  }

  const W = 600, H = 320
  const merged = phase !== 'merge'
  const step = 76
  const x0 = (W - 6 * step) / 2
  const chainY = 120
  const gx = (i: number) => (merged ? x0 + i * step : i < 3 ? 60 + i * 62 : 330 + (i - 3) * 62)
  return (
    <div className="grid gap-3">
      <CaveBox tone="#1e3a8a">
        <GemCanvas w={W} h={H} label="Çarpan zincirleri" svgRef={svgRef}>
          {!merged && <SvgPow x={122} y={60} base="2" exp="3" size={30} fill={GEMS.sapphire[0]} />}
          {!merged && <SvgPow x={423 + drag} y={60} base="2" exp="4" size={30} fill={GEMS.amethyst[0]} />}
          {merged && cut === null && <SvgPow x={W / 2} y={60} base="2" exp={phase === 'exp' ? '?' : '7'} size={34} fill="#fde68a" />}
          {merged && cut !== null && (
            <>
              <SvgPow x={(gx(0) + gx(cut - 1)) / 2} y={60} base="2" exp={cut} size={30} fill={GEMS.sapphire[0]} />
              <SvgPow x={(gx(cut) + gx(6)) / 2} y={60} base="2" exp={7 - cut} size={30} fill={GEMS.amethyst[0]} />
              <line x1={(gx(cut - 1) + gx(cut)) / 2} x2={(gx(cut - 1) + gx(cut)) / 2} y1={78} y2={168} stroke="#fbbf24" strokeWidth={3} strokeDasharray="6 4" className="kg-fade" />
            </>
          )}
          <g>
            {[0, 1, 2].map((i) => (
              <g key={i} className="kg-move" style={{ transform: `translate(${gx(i)}px, ${chainY}px)` }}>
                <Gem x={0} y={0} s={1.25} gem={merged && cut !== null && i >= cut ? 'amethyst' : 'sapphire'} glow />
                <text y={44} textAnchor="middle" fontSize={15} fontWeight={900} fill="#bfdbfe">× 2</text>
              </g>
            ))}
          </g>
          <g ref={chainB} data-handle style={{ cursor: merged ? 'default' : 'grab', touchAction: 'none' }}>
            {!merged && <rect x={300 + drag} y={80} width={270} height={90} rx={16} fill="#a855f7" fillOpacity={0.08} stroke="#c084fc" strokeOpacity={0.5} strokeDasharray="5 5" />}
            {[3, 4, 5, 6].map((i) => (
              <g key={i} className={drag === 0 ? 'kg-move' : undefined} style={{ transform: `translate(${gx(i) + (merged ? 0 : drag)}px, ${chainY}px)` }}>
                <Gem x={0} y={0} s={1.25} gem={merged && cut !== null && i < cut ? 'sapphire' : 'amethyst'} glow />
                <text y={44} textAnchor="middle" fontSize={15} fontWeight={900} fill="#e9d5ff">× 2</text>
              </g>
            ))}
          </g>
          {(phase === 'split' || phase === 'predict' || phase === 'done') && Array.from({ length: 6 }, (_, k) => (
            <rect key={k} x={(gx(k) + gx(k + 1)) / 2 - 24} y={90} width={48} height={70} rx={10} fill={cut === k + 1 ? '#fbbf2433' : 'transparent'} stroke="#fbbf24" strokeOpacity={0.35} strokeDasharray="3 4" style={{ cursor: 'pointer' }} onClick={() => doSplit(k + 1)} />
          ))}
          {merged && phase !== 'exp' && (
            <g className="kg-fade">
              <text x={W / 2} y={208} textAnchor="middle" fontSize={15} fontWeight={800} fill="#cbd5e1">{cut === null ? '8 sıra × 16 kristal = 128' : `${nf(2 ** cut)} sıra × ${nf(2 ** (7 - cut))} kristal = 128`}</text>
              {Array.from({ length: 128 }, (_, j) => {
                const cols = cut === null ? 16 : 2 ** (7 - cut)
                const rows = 128 / cols
                const cw = Math.min(520 / cols, 86 / rows)
                return <Chip key={j} x={W / 2 + ((j % cols) - (cols - 1) / 2) * cw} y={226 + Math.floor(j / cols) * cw + cw / 2} r={Math.min(cw * 0.42, 6)} gem={Math.floor(j / cols) % 2 ? 'aqua' : 'sapphire'} className="kg-move" />
              })}
            </g>
          )}
          {!merged && <text x={W / 2} y={H - 30} textAnchor="middle" fontSize={14} fontWeight={800} fill="#c4b5fd">← mor zinciri sürükle</text>}
        </GemCanvas>
      </CaveBox>
      <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
        {phase === 'merge' && <button type="button" className={gemBtn} onClick={merge}><Link2 size={18} />Zincirleri birleştir</button>}
        {phase === 'exp' && (
          <div className="flex flex-wrap items-center gap-3">
            <Stepper label="Üs" value={e} min={1} max={14} onChange={setE} display={`2^{${e}}`} accent="#fde68a" />
            <button type="button" className={gemBtn} onClick={checkE}><Check size={18} />Kontrol et</button>
          </div>
        )}
        {(phase === 'split' || phase === 'predict' || phase === 'done') && (
          <div className="flex flex-wrap items-center gap-3">
            <Stepper label="Kes" value={at} min={1} max={6} onChange={setAt} display={`${at} | ${7 - at}`} />
            <button type="button" className={darkBtn} onClick={() => doSplit(at)}><Scissors size={18} />Ayır</button>
            <span className="text-sm font-bold text-slate-300">Bulunan ayırmalar: {splits.length}/3</span>
          </div>
        )}
        {phase === 'predict' && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-700 pt-3">
            <Stepper label="Üs" value={p} min={1} max={14} onChange={setP} display={`5^{${p}}`} accent="#fde68a" />
            <button type="button" className={gemBtn} onClick={checkP}><Check size={18} />Tahminimi kontrol et</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═════════════ 2. Paketler ve torbalar ((a^m)^n, a^m ÷ a^n) ═════════════ */

function Packs({ ctl }: { ctl: Ctl }) {
  const [phase, setPhase] = useState<'build' | 'predict' | 'share' | 'shareExp' | 'done'>('build')
  const [k, setK] = useState(1)
  const [e, setE] = useState(3)
  const [p, setP] = useState(2)
  const [bags, setBags] = useState(0)
  const [q, setQ] = useState(1)

  useTask(ctl, phase === 'build'
    ? '(2^{3})^{2} kristali kur: her paket bir 2^{3} (üç tane “× 2”). Kaç paket gerekir? Paketleri kur, sonra toplam üssü yaz: (2^{3})^{2} = 2^{?}'
    : phase === 'predict' ? 'Paket kurmadan tahmin et: (4^{2})^{3} = 4^{?}'
    : phase === 'share' ? '2^{6} = 64 kristali 2^{3} = 8’li torbalara paylaştır. “Torba doldur”a ya da kristallere dokun.'
    : phase === 'shareExp' ? `${bags} torba doldu. 2^{6} ÷ 2^{3} = ${bags} = 2^{?}`
    : 'Paketlerin ve torbaların sırrını buldun!')

  const checkBuild = () => {
    if (k === 2 && e === 6) {
      ctl.ok()
      ctl.note('(2^{3})^{2} = 2^{3} · 2^{3} = 2^{6} = 64')
      setPhase('predict')
      return
    }
    if (k !== 2) return ctl.miss(`(2^{3})^{2} ifadesindeki dıştaki 2 neyi sayıyor? Kaç tane 2^{3} paketini çarpıyoruz? Şu an ${k} paket var.`)
    if (e === 5) return ctl.miss('Zincirdeki “× 2” kristallerini say: her pakette 3 tane, 2 paket var. Üsleri toplamak (3 + 2) zincirdeki kristal sayısını veriyor mu?', 'Kuvvetin kuvvetinde üsleri topladı ((2³)² = 2⁵)', 'carpanagaci')
    if (e === 9) return ctl.miss('2^{3} paketi 3 tane “× 2” taşıyor. 2 paket kaç tane taşır? 3^{2} ile karıştırmış olabilir misin?', 'Kuvvetin kuvvetinde üsleri üs olarak aldı (3²)')
    ctl.miss(`2^{${e}} = ${nf(2 ** e)}. Paketlerdeki “× 2” kristallerini say.`)
  }
  const checkP = () => {
    if (p === 6) {
      ctl.ok()
      ctl.note('Paketleri çoğaltınca üsler çarpılır: (a^{m})^{n} = a^{m · n}')
      setPhase('share')
      return
    }
    if (p === 5) return ctl.miss('(4^{2})^{3}: üç tane 4^{2} paketi, her birinde iki tane “× 4”. Toplam kaç tane “× 4”?', 'Kuvvetin kuvvetinde üsleri topladı')
    ctl.miss('4^{2} paketini 3 kez yan yana koy: 4^{2} · 4^{2} · 4^{2}. Kaç tane 4 çarpılıyor?')
  }
  const fill = () => {
    if (phase !== 'share' || bags >= 8) return
    const b = bags + 1
    setBags(b)
    ctl.ok()
    if (b === 8) setPhase('shareExp')
  }
  const checkQ = () => {
    if (q === 3) {
      ctl.ok()
      ctl.solve('torba:2^6/2^3', '2^{6} ÷ 2^{3} = 2^{3}')
      ctl.note('2^{6} ÷ 2^{3} = 8 = 2^{3}: bölmede ortak çarpanlar sadeleşir, üsler çıkarılır (a^{m} ÷ a^{n} = a^{m − n})')
      setPhase('done')
      ctl.complete()
      return
    }
    if (q === 2) return ctl.miss('2^{2} = 4, ama 8 torba doldu. 2 · 2 · 2 · 2 · 2 · 2 zincirinden 2 · 2 · 2 sadeleşince kaç tane 2 kalır?', 'Aynı tabanlı kuvvetleri bölerken üsleri böldü (2⁶ ÷ 2³ = 2²)')
    ctl.miss(`2^{${q}} = ${nf(2 ** q)}. Kaç torba dolmuştu?`)
  }

  const W = 600, H = 300
  const building = phase === 'build' || phase === 'predict'
  return (
    <div className="grid gap-3">
      <CaveBox tone="#4c1d95">
        <GemCanvas w={W} h={H} label={building ? 'Kristal paketleri' : '64 kristal ve 8’li torbalar'}>
          {building && (
            <g>
              {Array.from({ length: k }, (_, j) => {
                const per = Math.min(4, k)
                const bw = 132, gap = 12
                const total = per * bw + (per - 1) * gap
                const x = (W - total) / 2 + (j % per) * (bw + gap)
                const y = 60
                return (
                  <g key={j} className="kg-pop" style={{ animationDelay: `${j * 60}ms` }}>
                    <rect x={x} y={y} width={bw} height={110} rx={14} fill="#a855f7" fillOpacity={0.1} stroke="#c084fc" strokeDasharray="6 4" />
                    <SvgPow x={x + bw / 2} y={y + 26} base="2" exp="3" size={20} fill="#e9d5ff" />
                    {[0, 1, 2].map((i) => (
                      <g key={i}>
                        <Gem x={x + 26 + i * 40} y={y + 66} s={0.9} gem="amethyst" glow />
                        <text x={x + 26 + i * 40} y={y + 100} textAnchor="middle" fontSize={11} fontWeight={900} fill="#e9d5ff">×2</text>
                      </g>
                    ))}
                  </g>
                )
              })}
              <text x={W / 2} y={36} textAnchor="middle" fontSize={22} fontWeight={900} fill="#fde68a">({k} paket)</text>
              <text x={W / 2} y={230} textAnchor="middle" fontSize={16} fontWeight={800} fill="#cbd5e1">Zincirde {3 * k} tane “× 2” var</text>
            </g>
          )}
          {!building && (
            <g>
              {Array.from({ length: 64 }, (_, j) => {
                const bag = Math.floor(j / 8)
                const inBag = bag < bags
                const col = j % 8
                const x = inBag ? 60 + (bag % 4) * 135 + (col % 4) * 24 : 120 + (j % 16) * 24
                const y = inBag ? 60 + Math.floor(bag / 4) * 110 + Math.floor(col / 4) * 28 : 130 + Math.floor(j / 16) * 26
                return <Chip key={j} x={x} y={y} r={8} gem={inBag ? (bag % 2 ? 'aqua' : 'emerald') : 'topaz'} className="kg-move" style={{ transitionDelay: `${col * 25}ms` }} />
              })}
              {Array.from({ length: bags }, (_, b) => (
                <rect key={b} x={44 + (b % 4) * 135} y={40 + Math.floor(b / 4) * 110} width={104} height={76} rx={14} fill="none" stroke="#34d399" strokeOpacity={0.7} strokeDasharray="5 4" className="kg-fade" />
              ))}
              <rect x={0} y={0} width={W} height={H} fill="transparent" onClick={fill} style={{ cursor: phase === 'share' ? 'pointer' : 'default' }} />
              <text x={W / 2} y={H - 14} textAnchor="middle" fontSize={15} fontWeight={800} fill="#cbd5e1">{bags} torba · {64 - bags * 8} kristal açıkta</text>
            </g>
          )}
        </GemCanvas>
      </CaveBox>
      <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
        {phase === 'build' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={darkBtn} disabled={k >= 4} onClick={() => setK(k + 1)}><PackagePlus size={18} />Paket ekle</button>
              <button type="button" className={darkBtn} disabled={k <= 1} onClick={() => setK(k - 1)}><Undo2 size={18} />Paket çıkar</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Stepper label="Üs" value={e} min={1} max={12} onChange={setE} display={`2^{${e}}`} accent="#fde68a" />
              <button type="button" className={gemBtn} onClick={checkBuild}><Check size={18} />Kontrol et</button>
            </div>
          </div>
        )}
        {phase === 'predict' && (
          <div className="flex flex-wrap items-center gap-3">
            <Stepper label="Üs" value={p} min={1} max={12} onChange={setP} display={`4^{${p}}`} accent="#fde68a" />
            <button type="button" className={gemBtn} onClick={checkP}><Check size={18} />Tahminimi kontrol et</button>
          </div>
        )}
        {phase === 'share' && <button type="button" className={gemBtn} onClick={fill}><Sprout size={18} />Torba doldur (8 kristal) · {bags}</button>}
        {(phase === 'shareExp' || phase === 'done') && (
          <div className="flex flex-wrap items-center gap-3">
            <Stepper label="Üs" value={q} min={0} max={9} onChange={setQ} display={`2^{${q}}`} accent="#fde68a" />
            <button type="button" className={gemBtn} disabled={phase === 'done'} onClick={checkQ}><Check size={18} />Kontrol et</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═════════════ 3. Yarıya bölünen kristal (sıfır ve negatif üs) ═════════════ */

const val2 = (e: number) => (e >= 0 ? nf(2 ** e) : `[[1/${2 ** -e}]]`)

function Halving({ ctl }: { ctl: Ctl }) {
  const EXPS = [3, 2, 1, 0, -1, -2, -3]
  const [shown, setShown] = useState(1)
  const [neg, setNeg] = useState(false)
  const [num, setNum] = useState(1)
  const [den, setDen] = useState(1)
  const [phase, setPhase] = useState<'halve' | 'forms' | 'done'>('halve')
  const [base, setBase] = useState<number>(2)
  const [fe, setFe] = useState(1)
  const [forms, setForms] = useState<string[]>([])
  const nextE = EXPS[shown]
  const needInput = phase === 'halve' && nextE !== undefined && nextE <= 0

  useTask(ctl, phase === 'halve'
    ? nextE > 0 ? 'Kristal her bölünmede yarıya iniyor ve üs 1 azalıyor. “Yarıya böl”e dokun.' : `Örüntüyü sürdür: 2^{${nextE}} kaç olmalı? Değeri kur, sonra kristali yarıya böl.`
    : phase === 'forms' ? `[[1/8]]’i farklı üslü ifadelerle yaz: bir taban seç, üssü ayarla. En az 2 yol bul (${forms.length}/2).`
    : 'Küçülen kristalin sırrını buldun!')

  const halve = () => {
    if (phase !== 'halve' || nextE === undefined) return
    if (needInput) {
      const v = (neg ? -1 : 1) * (num / den)
      const want = 2 ** nextE
      if (Math.abs(v - want) < 1e-9) {
        ctl.ok()
        if (nextE === 0) ctl.note('2^{1} = 2’yi yarıya bölünce 2^{0} = 1: sıfırıncı kuvvet 1’dir')
        if (nextE === -1) ctl.note('2^{−1} = [[1/2]]: negatif üs, sayıyı negatif yapmaz; yarıya bölmeyi sürdürür')
        if (nextE === -3) ctl.note('2^{−3} = [[1/2^{3}]] = [[1/8]]')
      } else {
        if (v === 0) return ctl.miss('2’yi yarıya bölünce kristal yok mu oluyor? 2 ÷ 2 kaç eder?', 'Bir sayının sıfırıncı kuvvetini 0 sandı', 'carpanagaci')
        if (v < 0) return ctl.miss(`Kristal yarıya bölündükçe küçülüyor ama yok olmuyor, tersine de dönmüyor. ${val2(nextE + 1)} sayısının yarısı negatif olabilir mi?`, 'Negatif üssün sayıyı negatif yaptığını sandı (2⁻¹ = −2)')
        if (nextE < 0 && Math.abs(v - 2 ** -nextE) < 1e-9) return ctl.miss(`Bir önceki satır ${val2(nextE + 1)}. Onun yarısı ${nf(2 ** -nextE)} olabilir mi? Kristal büyümüyor, küçülüyor.`, 'Negatif üssü pozitif üs gibi hesapladı')
        if (nextE === 0 && v === 2) return ctl.miss('2^{1} = 2 idi. Bir kez daha yarıya bölünce ne olur?', 'Bir sayının sıfırıncı kuvvetini kendisi sandı')
        return ctl.miss(`Bir önceki satırdaki değer ${val2(nextE + 1)}. Onun yarısı kaç? Payı ve paydayı ona göre kur.`)
      }
    } else ctl.ok()
    const s = shown + 1
    setShown(s)
    setNum(1)
    setDen(1)
    setNeg(false)
    if (s >= EXPS.length) setPhase('forms')
  }

  const BASES: { v: number; t: string }[] = [{ v: 2, t: '2' }, { v: 4, t: '4' }, { v: 8, t: '8' }, { v: 0.5, t: '([[1/2]])' }, { v: 0.125, t: '([[1/8]])' }]
  const bt = BASES.find((b) => b.v === base)!.t
  const checkForm = () => {
    const v = base ** fe
    const label = `${bt}^{${nf(fe)}}`
    if (Math.abs(v - 0.125) < 1e-12) {
      if (forms.includes(label)) return ctl.info('Bu yazımı zaten buldun. Başka bir taban dene!')
      const n = [...forms, label]
      setForms(n)
      ctl.ok()
      ctl.solve(`sekizde:${label}`, `${label} = [[1/8]]`)
      ctl.note(`${label} = [[1/8]]`)
      if (n.length >= 2) {
        if (phase !== 'done') {
          setPhase('done')
          ctl.complete()
        }
      }
      return
    }
    if (base === 2 && fe === 3) return ctl.miss('2^{3} = 8, [[1/8]] değil. Tablonda [[1/8]] hangi üsse karşılık geliyordu?', 'Negatif üs ile pozitif üssü karıştırdı')
    const vt = v >= 1 ? nf(v) : `[[1/${nf(1 / v)}]]`
    ctl.info(`${label} = ${vt}. [[1/8]] için üssü değiştir ya da başka bir taban dene.`)
  }

  const W = 600, H = 330
  const rowH = 42
  return (
    <div className="grid gap-3">
      <CaveBox tone="#164e63">
        <GemCanvas w={W} h={H} label="Yarıya bölünen kristal merdiveni">
          {EXPS.slice(0, shown).map((ex, i) => {
            const v = 2 ** ex
            const w = Math.max(3, (440 * v) / 8)
            const y = 22 + i * rowH
            return (
              <g key={ex} className="kg-fade">
                <g style={{ transform: `translate(130px, ${y}px)` }}>
                  <polygon points={`0,${rowH / 2 - 4} ${Math.min(10, w / 2)},2 ${w - Math.min(10, w / 2)},2 ${w},${rowH / 2 - 4} ${w - Math.min(10, w / 2)},${rowH - 10} ${Math.min(10, w / 2)},${rowH - 10}`} fill={ex >= 0 ? GEMS.aqua[1] : GEMS.amethyst[1]} opacity={0.9} />
                  <polygon points={`0,${rowH / 2 - 4} ${Math.min(10, w / 2)},2 ${w - Math.min(10, w / 2)},2 ${w},${rowH / 2 - 4}`} fill="#fff" opacity={0.3} />
                </g>
                <SvgPow x={18} y={y + 26} base="2" exp={nf(ex)} size={20} fill={ex >= 0 ? GEMS.aqua[0] : GEMS.amethyst[0]} anchor="start" post="" />
                <text x={72} y={y + 26} fontSize={18} fontWeight={900} fill="#e2e8f0">=</text>
                <text x={140 + w} y={y + 26} fontSize={18} fontWeight={900} fill="#fde68a">{ex >= 0 ? nf(v) : `1/${2 ** -ex}`}</text>
                {w < 20 && <circle cx={130 + w / 2} cy={y + rowH / 2 - 4} r={14} fill="none" stroke="#fde68a" strokeOpacity={0.6} strokeDasharray="3 3" />}
              </g>
            )
          })}
          {phase === 'halve' && nextE !== undefined && (
            <g opacity={0.7}>
              <SvgPow x={18} y={22 + shown * rowH + 26} base="2" exp={nf(nextE)} size={20} fill="#94a3b8" anchor="start" />
              <text x={72} y={22 + shown * rowH + 26} fontSize={18} fontWeight={900} fill="#94a3b8">= ?</text>
            </g>
          )}
        </GemCanvas>
      </CaveBox>
      {phase === 'halve' && (
        <div className="grid gap-3 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600 sm:grid-cols-[1fr_auto]">
          {needInput ? (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setNeg(!neg)} aria-pressed={neg} className={`grid size-12 place-items-center rounded-xl text-2xl font-black ring-1 ${neg ? 'bg-rose-500/30 text-rose-100 ring-rose-300' : 'bg-slate-700 text-slate-300 ring-slate-500'}`} aria-label="İşaret">{neg ? '−' : '+'}</button>
              <div className="flex flex-col gap-1.5">
                <Stepper label="Pay" value={num} min={0} max={16} onChange={setNum} />
                <Stepper label="Payda" value={den} min={1} max={16} onChange={setDen} accent="#67e8f9" />
              </div>
              <span className="px-2 text-3xl font-black text-amber-200"><MathText text={`${neg ? '−' : ''}${den === 1 ? num : `[[${num}/${den}]]`}`} /></span>
            </div>
          ) : <p className="self-center text-sm font-bold text-slate-300">Her bölünmede değer yarıya iniyor. Üs ne oluyor?</p>}
          <button type="button" className={gemBtn} onClick={halve}><Scissors size={18} />{needInput ? 'Yarıya böl ve kontrol et' : 'Yarıya böl'}</button>
        </div>
      )}
      {phase !== 'halve' && (
        <div className="grid gap-3 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
          <Label>Taban</Label>
          <div className="flex flex-wrap gap-2">
            {BASES.map((b) => <Pick key={b.t} on={base === b.v} onClick={() => setBase(b.v)}>{b.t.replace(/[()]/g, '')}</Pick>)}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Stepper label="Üs" value={fe} min={-4} max={4} onChange={setFe} display={`${bt}^{${nf(fe)}}`} accent="#fde68a" />
            <button type="button" className={gemBtn} onClick={checkForm}><Check size={18} />[[1/8]] mi?</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═════════════ 4. Kare kristalin kenarı (karekök) ═════════════ */

function RootPoint({ x, onChange, A }: { x: number; onChange: (x: number) => void; A: number }) {
  const P = usePlane()
  const lo = Math.floor(Math.sqrt(A)), hi = lo + 1
  const sn = P.step / 10
  return (
    <g>
      {[lo, hi].map((v) => (
        <g key={v}>
          <line x1={P.sx(v)} x2={P.sx(v)} y1={P.sy(0) - 28} y2={P.sy(0) - 12} stroke="#7c3aed" strokeWidth={2} />
          <text x={P.sx(v)} y={P.sy(0) - 34} textAnchor="middle" fontSize={12} fontWeight={900} fill="#7c3aed">{v}²={v * v}</text>
        </g>
      ))}
      <DragPoint x={x} y={0} color="#db2777" r={12} label="?" onChange={(p) => onChange(Math.round(p.x / sn) * sn)} />
    </g>
  )
}

function SquareRoot({ ctl }: { ctl: Ctl }) {
  const [A] = useState(() => pick([50, 30, 70, 90, 20]))
  const r = Math.sqrt(A)
  const [phase, setPhase] = useState<'squares' | 'line' | 'done'>('squares')
  const [s, setS] = useState(3)
  const [lo, setLo] = useState<number | null>(null)
  const [hi, setHi] = useState<number | null>(null)
  const [x, setX] = useState(1)
  const [tries, setTries] = useState<{ x: number; x2: number }[]>([])

  useTask(ctl, phase === 'squares'
    ? `Alanı ${A} birim kare olan kare bir kristal var. Kenarı kaç birim? Tam kare kristaller kurarak kenarın hangi iki tam sayı arasında olduğunu bul.`
    : phase === 'line' ? `√{${A}} sayısını sayı doğrusuna yerleştir: noktayı sürükle ya da doğruya dokun, sonra “Karesini al” ile dene. Yakınlaştırarak hassaslaştır.`
    : `√{${A}} yerini buldu!`)

  const checkBounds = () => {
    if (lo === null || hi === null) return ctl.info('Bir alt sınır ve bir üst sınır kaydet.')
    if (lo * lo > A) return ctl.miss(`Alt sınır karesinin alanı ${lo * lo}; bu ${A}’dan büyük. Alt sınır kristali hedef kristalin içine sığmalı.`)
    if (hi * hi < A) return ctl.miss(`Üst sınır karesinin alanı ${hi * hi}; bu ${A}’dan küçük. Üst sınır kristali hedefi tamamen örtmeli.`)
    if (hi - lo > 1) return ctl.miss(`${lo} ile ${hi} arasında başka bir tam sayı var. Onun karesi de ${A}’dan küçük ya da büyük olmalı; sınırı daralt.`)
    ctl.ok()
    ctl.note(`${lo}^{2} = ${lo * lo} < ${A} < ${hi * hi} = ${hi}^{2} olduğundan ${lo} < √{${A}} < ${hi}`)
    setX(lo)
    setPhase('line')
  }
  const tryX = () => {
    const xr = Math.round(x * 1000) / 1000
    const x2 = xr * xr
    setTries((t) => [{ x: xr, x2 }, ...t].slice(0, 6))
    if (Math.abs(xr - A / 2) < 0.6) return ctl.miss(`${nf(xr)} · ${nf(xr)} = ${nf(x2, 2)}. Karekök sayının yarısı mı? Kenar uzunluğu ile alanı karıştırmış olabilir misin?`, 'Karekökü sayının yarısı sandı', 'coordinate')
    if (xr < Math.floor(r) || xr > Math.floor(r) + 1) return ctl.miss(`Bu nokta ${Math.floor(r)} ile ${Math.floor(r) + 1} arasında mı? Az önce bulduğun sınırları hatırla.`)
    if (Math.abs(xr - r) <= 0.06) {
      ctl.ok()
      if (tries.length >= 1) ctl.strat('Kare alarak yaklaştırdı')
      ctl.note(`√{${A}} ≈ ${nf(xr, 2)} çünkü ${nf(xr, 2)}^{2} = ${nf(x2, 2)} ≈ ${A}`)
      ctl.solve(`kok:${A}`, `√{${A}} ≈ ${nf(xr, 2)}`)
      setPhase('done')
      ctl.complete()
      return
    }
    ctl.info(`${nf(xr)}^{2} = ${nf(x2, 3)}: ${x2 > A ? `${A}’dan büyük, noktayı sola kaydır` : `${A}’dan küçük, noktayı sağa kaydır`}. İki parmakla yakınlaştırırsan daha hassas yerleştirebilirsin.`)
  }

  const W = 600, H = 300
  const cell = 24
  const ox = 120, oy = 30
  return (
    <div className="grid gap-3">
      {phase === 'squares' ? (
        <CaveBox tone="#0e7490">
          <GemCanvas w={W} h={H} label={`${s} × ${s} kare kristal ve alanı ${A} olan hedef`}>
            <rect x={ox} y={oy} width={r * cell} height={r * cell} fill="#fbbf24" fillOpacity={0.1} stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="7 5" className="kg-breathe" />
            <text x={ox + r * cell + 8} y={oy + 16} fontSize={14} fontWeight={900} fill="#fde68a">alan {A}</text>
            {Array.from({ length: s * s }, (_, j) => (
              <rect key={`${s}-${j}`} x={ox + (j % s) * cell + 1.5} y={oy + Math.floor(j / s) * cell + 1.5} width={cell - 3} height={cell - 3} rx={3} fill={GEMS.aqua[1]} fillOpacity={0.75} stroke={GEMS.aqua[0]} strokeOpacity={0.6} className="kg-pop" style={{ animationDelay: `${(j % s) * 10 + Math.floor(j / s) * 10}ms` }} />
            ))}
            <text x={ox - 10} y={oy + (s * cell) / 2} textAnchor="end" fontSize={16} fontWeight={900} fill="#a5f3fc">{s}</text>
            <text x={ox + (s * cell) / 2} y={oy + s * cell + 20} textAnchor="middle" fontSize={16} fontWeight={900} fill="#a5f3fc">{s}</text>
            <g transform={`translate(${W - 120} 60)`}>
              <text textAnchor="middle" fontSize={15} fontWeight={800} fill="#cbd5e1">senin karen</text>
              <SvgPow x={0} y={34} base={s} exp="2" size={28} fill="#67e8f9" post={` = ${s * s}`} />
              <text y={72} textAnchor="middle" fontSize={22} fontWeight={900} fill={s * s === A ? '#fde68a' : s * s < A ? '#86efac' : '#fda4af'}>{s * s < A ? `< ${A}` : s * s > A ? `> ${A}` : `= ${A}`}</text>
            </g>
          </GemCanvas>
        </CaveBox>
      ) : (
        <div className="rounded-3xl bg-slate-900/60 p-2 ring-1 ring-slate-600">
          <Plane mode="x" initial={{ xMin: Math.floor(r) - 2.5, xMax: Math.floor(r) + 3.5, yMin: -1, yMax: 1 }} minSpan={0.05} maxSpan={40} onTap={(p) => phase === 'line' && setX(Math.round(p.x * 100) / 100)} zoomFocus={{ x }} label={`√${A} için sayı doğrusu`}>
            <RootPoint x={x} A={A} onChange={(v) => phase === 'line' && setX(v)} />
          </Plane>
        </div>
      )}
      <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
        {phase === 'squares' && (
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <Stepper label="Kenar" value={s} min={1} max={10} onChange={setS} accent="#67e8f9" />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={darkBtn} onClick={() => setLo(s)}>Alt sınır yap</button>
              <button type="button" className={darkBtn} onClick={() => setHi(s)}>Üst sınır yap</button>
              <button type="button" className={gemBtn} onClick={checkBounds}><Check size={18} />Kontrol et</button>
            </div>
            <p className="text-[15px] font-extrabold text-slate-200 sm:col-span-2">
              <MathText text={`Alt sınır: ${lo === null ? '—' : `${lo} (${lo}^{2} = ${lo * lo})`} · Üst sınır: ${hi === null ? '—' : `${hi} (${hi}^{2} = ${hi * hi})`}`} />
            </p>
          </div>
        )}
        {phase !== 'squares' && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <Readout tone="sky"><MathText text={`nokta: ${nf(x, 3)}`} /></Readout>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tries.map((t, i) => <span key={i} className="rounded-lg bg-slate-900/70 px-2 py-1 text-sm font-bold text-slate-200 ring-1 ring-slate-700"><MathText text={`${nf(t.x, 3)}^{2} = ${nf(t.x2, 3)}`} /></span>)}
              </div>
            </div>
            <button type="button" className={gemBtn} disabled={phase === 'done'} onClick={tryX}><Sprout size={18} />Karesini al</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═════════════ 5. Mağara ölçüleri (bilimsel gösterim) ═════════════ */

const SCI = [
  { m: 45, start: 3, label: 'Mağaranın toplam uzunluğu', unit: 'm', icon: '🗺️' },
  { m: 38, start: -5, label: 'Bir kristal lifinin kalınlığı', unit: 'm', icon: '🧵' },
]
const CARDS = [
  { t: 'Mağaranın toplam uzunluğu', a: 4.5, n: 4 },
  { t: 'Yeraltı nehrinin uzunluğu', a: 8.1, n: 3 },
  { t: 'Dev sarkıtın boyu', a: 1.2, n: 1 },
  { t: 'Kristal lifinin kalınlığı', a: 3.8, n: -4 },
  { t: 'Mağara tozunun çapı', a: 5, n: -5 },
  { t: 'Mağara bakterisinin boyu', a: 9, n: -7 },
]
const cardVal = (c: { a: number; n: number }) => c.a * 10 ** c.n
const sciTxt = (a: number, n: number) => `${nf(a)} · 10^{${nf(n)}}`
const decTxt = (m: number, p: number) => nf(m * 10 ** p, 12)

function Ruler({ marks }: { marks: { v: number; t: string; c: string }[] }) {
  const W = 600, H = 120
  const lo = -8, hi = 6
  const sx = (v: number) => 30 + ((Math.log10(v) - lo) / (hi - lo)) * (W - 60)
  return (
    <GemCanvas w={W} h={H} label="Büyüklük cetveli (10’un kuvvetleri)">
      <line x1={30} x2={W - 30} y1={70} y2={70} stroke="#94a3b8" strokeWidth={2} />
      {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((k) => (
        <g key={k}>
          <line x1={sx(10 ** k)} x2={sx(10 ** k)} y1={64} y2={76} stroke="#94a3b8" />
          {k % 2 === 0 && <SvgPow x={sx(10 ** k)} y={98} base="10" exp={nf(k)} size={13} fill="#cbd5e1" />}
        </g>
      ))}
      {marks.map((m, i) => (
        <g key={m.t} className="kg-move" style={{ transform: `translate(${sx(m.v)}px, 0px)` }}>
          <line x1={0} x2={0} y1={i % 2 ? 40 : 26} y2={70} stroke={m.c} strokeWidth={2} />
          <circle cx={0} cy={70} r={5} fill={m.c} />
          <text x={0} y={i % 2 ? 36 : 22} textAnchor="middle" fontSize={12} fontWeight={900} fill={m.c}>{m.t}</text>
        </g>
      ))}
    </GemCanvas>
  )
}

function SciNotation({ ctl }: { ctl: Ctl }) {
  const [si, setSi] = useState(0)
  const [k, setK] = useState(SCI[0].start)
  const [n, setN] = useState(0)
  const [order, setOrder] = useState<number[]>(() => [1, 3, 0, 5, 2, 4])
  const [sel, setSel] = useState<number | null>(null)
  const [phase, setPhase] = useState<'build' | 'order' | 'done'>('build')
  const cur = SCI[si]
  const equal = k + n === cur.start
  const a = cur.m * 10 ** k
  const std = k === -1

  useTask(ctl, phase === 'build'
    ? `${cur.label}: ${decTxt(cur.m, cur.start)} ${cur.unit}. Bunu a · 10^{n} biçiminde yaz. Katsayıyı ve üssü değiştir; değer korunuyor mu? Eşit yazımları kaydet; 1 ≤ a < 10 olan bilimsel gösterimi bul.`
    : phase === 'order' ? 'Mağara ölçülerini en büyükten en küçüğe sırala. İki karta art arda dokunarak yerlerini değiştir ya da okları kullan.'
    : 'Mağaranın ölçüleri sıralandı!')

  const save = () => {
    if (!equal) {
      return ctl.miss(`Bu yazımın değeri ${decTxt(cur.m, k + n)}; ölçü ise ${decTxt(cur.m, cur.start)}. Katsayıyı 10’a böldüğünde değerin değişmemesi için 10’un kuvveti ne olmalı?`, 'Katsayıyı değiştirirken 10’un kuvvetini dengelemedi', 'carpanagaci')
    }
    const label = `${sciTxt(a, n)}`
    const fresh = ctl.solve(`bilimsel:${si}:${k}`, `${label} ${cur.unit}`)
    if (!std) {
      if (fresh) ctl.note(`${label} = ${decTxt(cur.m, cur.start)} (eşit yazım)`)
      return ctl.info(fresh ? `Doğru, bu da ${decTxt(cur.m, cur.start)}’a eşit! Ama bilimsel gösterimde katsayı 1 ile 10 arasında olmalı (1 ≤ a < 10). Şimdi katsayı ${nf(a, 12)}.` : 'Bu eşit yazımı zaten kaydettin. Bilimsel gösterime ulaşmayı dene.')
    }
    ctl.ok()
    ctl.note(`${cur.label}: ${label} ${cur.unit}`)
    if (si === 0) {
      ctl.note('Katsayıyı 10’a bölünce 10’un üssü 1 artar; değer korunur')
      setSi(1)
      setK(SCI[1].start)
      setN(0)
    } else {
      ctl.note('Küçük ölçülerde 10’un üssü negatif olur: 0,00038 = 3,8 · 10^{−4}')
      setPhase('order')
    }
  }
  const swap = (i: number, j: number) => {
    if (j < 0 || j >= order.length) return
    const o = [...order]
    ;[o[i], o[j]] = [o[j], o[i]]
    setOrder(o)
    setSel(null)
  }
  const tapCard = (i: number) => {
    if (phase !== 'order') return
    if (sel === null) return setSel(i)
    if (sel === i) return setSel(null)
    swap(sel, i)
  }
  const checkOrder = () => {
    for (let i = 0; i + 1 < order.length; i++) {
      const A = CARDS[order[i]], B = CARDS[order[i + 1]]
      if (cardVal(A) < cardVal(B)) {
        if (A.a > B.a && A.n < B.n) return ctl.miss(`${sciTxt(A.a, A.n)} ile ${sciTxt(B.a, B.n)}: katsayısı büyük olan mı daha büyük, yoksa önce 10’un üslerine mi bakmalı? 10^{${nf(B.n)}} ile 10^{${nf(A.n)}} kaç kat farklı?`, 'Bilimsel gösterimde yalnız katsayıları karşılaştırdı')
        return ctl.miss(`${A.t} (${sciTxt(A.a, A.n)}) ile ${B.t} (${sciTxt(B.a, B.n)}) yer değiştirmeli mi? Önce 10’un üslerini karşılaştır.`)
      }
    }
    ctl.ok()
    ctl.note('Bilimsel gösterimde önce 10’un üslerine, üsler eşitse katsayılara bakılır')
    const big = CARDS[order[0]], small = CARDS[order[order.length - 1]]
    ctl.note(`En büyük ölçü en küçüğün yaklaşık 10^{${big.n - small.n}} katı`)
    setPhase('done')
    ctl.complete()
  }

  const marks = phase === 'build'
    ? [{ v: Math.max(1e-8, cur.m * 10 ** (k + n)), t: equal ? 'senin yazımın ✓' : 'senin yazımın', c: equal ? '#34d399' : '#fb7185' }, { v: cur.m * 10 ** cur.start, t: 'ölçü', c: '#fde68a' }]
    : phase === 'done' ? CARDS.map((c, i) => ({ v: cardVal(c), t: String(i + 1), c: ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#22d3ee', '#fb7185'][i] })) : []
  const pal = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#22d3ee', '#fb7185']

  return (
    <div className="grid gap-3">
      <CaveBox tone="#312e81">
        <div className="px-2 pt-3">
          <Ruler marks={marks} />
        </div>
        {phase === 'build' && (
          <div className="grid gap-2 p-3 pt-1 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950/60 p-3 text-center ring-1 ring-slate-700">
              <p className="text-xs font-black tracking-widest text-slate-400 uppercase">{cur.icon} Ölçü</p>
              <p className="text-2xl font-black text-amber-200">{decTxt(cur.m, cur.start)} {cur.unit}</p>
            </div>
            <div className={`rounded-2xl p-3 text-center ring-2 transition ${equal ? 'bg-emerald-950/60 ring-emerald-400' : 'bg-rose-950/50 ring-rose-400/70'}`}>
              <p className="text-xs font-black tracking-widest text-slate-400 uppercase">Senin yazımın</p>
              <p className="text-2xl font-black text-white"><MathText text={sciTxt(a, n)} /></p>
              <p className={`text-sm font-extrabold ${equal ? 'text-emerald-200' : 'text-rose-200'}`}>= {decTxt(cur.m, k + n)} {equal ? '(eşit)' : '(eşit değil)'}</p>
            </div>
          </div>
        )}
        {phase !== 'build' && (
          <div className="grid gap-2 p-3 pt-1">
            {order.map((ci, i) => {
              const c = CARDS[ci]
              return (
                <div key={ci} className={`flex items-center gap-2 rounded-2xl p-1.5 pl-3 ring-2 transition ${sel === i ? 'bg-violet-500/25 ring-violet-300' : 'bg-slate-900/70 ring-slate-700'}`}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg text-sm font-black text-slate-900" style={{ background: phase === 'done' ? pal[i] : '#cbd5e1' }}>{i + 1}</span>
                  <button type="button" onClick={() => tapCard(i)} className="flex min-h-12 min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 text-left">
                    <span className="text-[14px] font-bold text-slate-200">{c.t}</span>
                    <span className="text-lg font-black text-amber-100"><MathText text={`${sciTxt(c.a, c.n)} m`} /></span>
                  </button>
                  <button type="button" aria-label="Yukarı taşı" disabled={i === 0 || phase === 'done'} onClick={() => swap(i, i - 1)} className="grid size-12 place-items-center rounded-xl bg-slate-700 text-white ring-1 ring-slate-500 disabled:opacity-30"><ArrowUp size={18} /></button>
                  <button type="button" aria-label="Aşağı taşı" disabled={i === order.length - 1 || phase === 'done'} onClick={() => swap(i, i + 1)} className="grid size-12 place-items-center rounded-xl bg-slate-700 text-white ring-1 ring-slate-500 disabled:opacity-30"><ArrowDown size={18} /></button>
                </div>
              )
            })}
          </div>
        )}
      </CaveBox>
      <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
        {phase === 'build' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Katsayı (a)</Label>
              <div className="flex gap-2">
                <button type="button" className={`${darkBtn} flex-1`} disabled={k <= -4} onClick={() => setK(k - 1)}>a ÷ 10</button>
                <button type="button" className={`${darkBtn} flex-1`} disabled={k >= 5} onClick={() => setK(k + 1)}>a × 10</button>
              </div>
            </div>
            <div>
              <Label>10’un üssü (n)</Label>
              <div className="flex gap-2">
                <button type="button" className={`${darkBtn} flex-1`} disabled={n <= -9} onClick={() => setN(n - 1)}>n − 1</button>
                <button type="button" className={`${darkBtn} flex-1`} disabled={n >= 9} onClick={() => setN(n + 1)}>n + 1</button>
              </div>
            </div>
            <button type="button" className={`${gemBtn} sm:col-span-2`} onClick={save}><Check size={18} />Bu yazımı kaydet</button>
          </div>
        )}
        {phase === 'order' && <button type="button" className={`${gemBtn} w-full`} onClick={checkOrder}><Check size={18} />Sıralamayı kontrol et</button>}
        {phase === 'done' && <p className="text-[15px] font-extrabold text-emerald-200">Cetvelde her çentik 10 kat büyüme demek. Sıralaman doğru!</p>}
      </div>
    </div>
  )
}

/* ═════════════ 6. Köşegen kristali (rasyonel / irrasyonel) ═════════════ */

const SORT = [
  { t: '√{16}', r: true, q: '√{16} kaça eşit? 4 bir kesir olarak yazılabilir mi ([[4/1]])?', mis: 'Kök işareti olan her sayıyı irrasyonel sandı' },
  { t: '√{2}', r: false, q: 'Karesi tam 2 olan bir ondalık sayı bulabildin mi? 1,414^{2} bile tam 2 değildi.', mis: 'Ondalık yaklaşımı (1,414) tam değer sandı' },
  { t: '0,25', r: true, q: '0,25 bir kesir olarak yazılabilir mi? [[25/100]] = [[1/4]]', mis: 'Ondalık gösterimli sayıları irrasyonel sandı' },
  { t: '√{[[9/4]]}', r: true, q: '[[3/2]] · [[3/2]] kaç eder?', mis: 'Kesrin karekökünü irrasyonel sandı' },
  { t: 'π', r: false, q: 'π = 3,14159265… basamakları bir yerde bitiyor ya da tekrar ediyor mu? 3,14 yalnızca bir yaklaşım.', mis: 'π’yi rasyonel sandı (π = 3,14)' },
  { t: '√{12}', r: false, q: '3^{2} = 9, 4^{2} = 16. 12 bir tam kare mi? Bir kesrin karesi 12 olabilir mi?', mis: 'Tam kare olmayan sayının karekökünü rasyonel sandı' },
  { t: '0,333…', r: true, q: '[[1/3]] sayısını ondalık yazınca ne olur? Devreden ondalıklar kesre çevrilebilir.', mis: 'Sonsuz devirli ondalık gösterimleri irrasyonel sandı' },
  { t: '√{0,49}', r: true, q: '0,7 · 0,7 kaç eder?', mis: 'Ondalık sayının karekökünü irrasyonel sandı' },
  { t: '[[22/7]]', r: true, q: '[[22/7]] iki tam sayının bölümü. π’ye yakın ama π’ye eşit mi?', mis: 'π’nin [[22/7]]’ye eşit olduğunu sandı' },
]

function Diagonal({ ctl }: { ctl: Ctl }) {
  const [phase, setPhase] = useState<'diag' | 'area' | 'decimal' | 'sort' | 'done'>('diag')
  const [val, setVal] = useState('')
  const [d, setD] = useState<[number, number, number]>([0, 0, 0])
  const [tries, setTries] = useState<string[]>([])
  const [bins, setBins] = useState<(boolean | null)[]>(() => SORT.map(() => null))
  const [sel, setSel] = useState<number | null>(null)
  const [bad, setBad] = useState<number[]>([])

  useTask(ctl, phase === 'diag' ? 'Kenarı 1 birim olan kare kristalin köşegeni ne kadar uzun? Köşegen üzerine bir kare kur.'
    : phase === 'area' ? 'Köşegen üzerine kurulan eğik karenin alanı kaç birim kare? Yarım kareleri say.'
    : phase === 'decimal' ? 'Karesi tam 2 olan bir ondalık sayı ara: basamakları ayarla ve karesini al. 2’ye ne kadar yaklaşabilirsin?'
    : phase === 'sort' ? 'Kristal uzunluklarını sınıflandır: bir karta, sonra kutuya dokun. Kesir olarak yazılabilenler rasyonel, yazılamayanlar irrasyonel.'
    : 'Rasyonel ve irrasyonel kristalleri ayırdın!')

  const checkArea = () => {
    const v = padNum(val)
    if (v === 2) {
      ctl.ok()
      ctl.note('Eğik kare 4 yarım kareden oluşur: alanı 2. Kenarı (birim karenin köşegeni) √{2}')
      setPhase('decimal')
      return
    }
    if (v === 4) return ctl.miss('Eğik karenin içinde 4 parça var, ama her biri tam bir kare mi? Her parça bir birim karenin yarısı.', 'Yarım kareleri tam kare saydı')
    if (v === 1) return ctl.miss('Eğik kare, tek bir birim kareden büyük görünüyor mu? İçindeki yarım kareleri say.')
    ctl.miss('Eğik karenin içindeki üçgenleri say: her biri bir birim karenin yarısı. Kaç yarım kare kaç tam kare eder?')
  }
  const X = 1000 + 100 * d[0] + 10 * d[1] + d[2]
  const xs = `1,${d.join('')}`
  const sq = (X * X) / 1e6
  const tryDec = () => {
    const s = `${xs}^{2} = ${nf(sq, 6)}`
    setTries((t) => (t.includes(s) ? t : [s, ...t].slice(0, 6)))
    if (Math.abs(sq - 2) < 0.003) {
      ctl.ok()
      ctl.note(`${xs}^{2} = ${nf(sq, 6)}: çok yakın ama tam 2 değil. √{2} = 1,41421356… basamakları hiç bitmez, tekrar da etmez`)
      setPhase('sort')
      return
    }
    ctl.info(`${xs}^{2} = ${nf(sq, 6)}: ${sq > 2 ? '2’den büyük' : '2’den küçük'}. Bir sonraki basamağı ayarla.`)
  }
  const place = (r: boolean) => {
    if (sel === null) return
    const b = [...bins]
    b[sel] = r
    setBins(b)
    setBad((x) => x.filter((i) => i !== sel))
    const nextFree = b.findIndex((v) => v === null)
    setSel(nextFree >= 0 ? nextFree : null)
  }
  const checkSort = () => {
    if (bins.some((b) => b === null)) return ctl.info('Önce bütün kartları bir kutuya yerleştir.')
    const wrong = SORT.map((c, i) => (bins[i] !== c.r ? i : -1)).filter((i) => i >= 0)
    setBad(wrong)
    if (wrong.length) {
      const c = SORT[wrong[0]]
      return ctl.miss(`${c.t}: ${c.q}`, c.mis)
    }
    ctl.ok()
    ctl.solve('reel:siniflama', 'Rasyonel / irrasyonel sınıflama')
    ctl.note('Rasyonel: iki tam sayının bölümü olarak yazılabilen (√{16}, 0,25, 0,333…, [[22/7]]). İrrasyonel: yazılamayan (√{2}, √{12}, π). Hepsi birlikte gerçek sayılar')
    setPhase('done')
    ctl.complete()
  }

  const W = 600, H = 300
  const u = 110
  const ox = (W - 2 * u) / 2, oy = 40
  const built = phase !== 'diag'
  return (
    <div className="grid gap-3">
      {phase !== 'sort' && phase !== 'done' ? (
        <CaveBox tone="#065f46">
          <GemCanvas w={W} h={H} label="Birim kare kristaller ve köşegen üzerine kurulan kare">
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={ox + (i % 2) * u + 2} y={oy + Math.floor(i / 2) * u + 2} width={u - 4} height={u - 4} rx={6} fill={i === 2 && !built ? GEMS.emerald[1] : '#10b981'} fillOpacity={i === 2 && !built ? 0.6 : 0.15} stroke={GEMS.emerald[0]} strokeOpacity={0.5} />
            ))}
            <line x1={ox} y1={oy + 2 * u} x2={ox + u} y2={oy + u} stroke="#fde68a" strokeWidth={4} strokeLinecap="round" className="kg-draw" />
            <text x={ox + u / 2 - 26} y={oy + 1.5 * u + 2} fontSize={18} fontWeight={900} fill="#fde68a">?</text>
            <text x={ox + u / 2} y={oy + 2 * u + 22} textAnchor="middle" fontSize={14} fontWeight={900} fill="#a7f3d0">1</text>
            <text x={ox - 14} y={oy + 1.5 * u + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#a7f3d0">1</text>
            {built && (
              <g className="kg-fade">
                <polygon points={`${ox + u},${oy} ${ox + 2 * u},${oy + u} ${ox + u},${oy + 2 * u} ${ox},${oy + u}`} fill="#fbbf24" fillOpacity={0.28} stroke="#fde68a" strokeWidth={3} filter="" />
                {[[ox + u, oy, ox + u, oy + u, ox, oy + u], [ox + u, oy, ox + 2 * u, oy + u, ox + u, oy + u], [ox + 2 * u, oy + u, ox + u, oy + 2 * u, ox + u, oy + u], [ox, oy + u, ox + u, oy + u, ox + u, oy + 2 * u]].map((t, i) => (
                  <polygon key={i} points={`${t[0]},${t[1]} ${t[2]},${t[3]} ${t[4]},${t[5]}`} fill={['#c084fc', '#60a5fa', '#34d399', '#fb7185'][i]} fillOpacity={0.35} stroke="#fff" strokeOpacity={0.4} className="kg-pop" style={{ animationDelay: `${200 + i * 150}ms` }} />
                ))}
              </g>
            )}
            {phase === 'decimal' && <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={16} fontWeight={900} fill="#fde68a">köşegen = √2 ≈ ?</text>}
          </GemCanvas>
        </CaveBox>
      ) : (
        <CaveBox tone="#065f46">
          <div className="grid gap-3 p-3">
            <div className="flex flex-wrap justify-center gap-2">
              {SORT.map((c, i) => bins[i] === null && (
                <button key={c.t} type="button" onClick={() => setSel(i)} className={`grid min-h-14 min-w-20 place-items-center rounded-2xl px-4 text-2xl font-black ring-2 transition active:scale-95 ${sel === i ? 'bg-amber-400/25 text-white ring-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.5)]' : 'bg-slate-900/80 text-slate-100 ring-slate-600'}`}>
                  <MathText text={c.t} />
                </button>
              ))}
              {bins.every((b) => b !== null) && <p className="text-sm font-bold text-slate-300">Bütün kartlar yerleşti. Kontrol et!</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([true, false] as const).map((r) => (
                <div key={String(r)} className={`rounded-2xl p-2 ring-2 ${r ? 'bg-sky-950/50 ring-sky-400/60' : 'bg-fuchsia-950/50 ring-fuchsia-400/60'}`}>
                  <button type="button" onClick={() => place(r)} disabled={sel === null || phase === 'done'} className={`mb-2 w-full rounded-xl py-3 text-lg font-black ${r ? 'bg-sky-500/30 text-sky-50' : 'bg-fuchsia-500/30 text-fuchsia-50'} disabled:opacity-70`}>
                    {r ? 'Rasyonel' : 'İrrasyonel'} {sel !== null && <span className="text-sm">← buraya koy</span>}
                  </button>
                  <div className="flex min-h-14 flex-wrap gap-1.5">
                    {SORT.map((c, i) => bins[i] === r && (
                      <button key={c.t} type="button" disabled={phase === 'done'} onClick={() => { const b = [...bins]; b[i] = null; setBins(b); setSel(i) }} className={`min-h-12 rounded-xl px-3 text-xl font-black ring-2 ${bad.includes(i) ? 'bg-amber-400/20 text-amber-100 ring-amber-400' : 'bg-slate-900/70 text-white ring-slate-600'}`}>
                        <MathText text={c.t} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CaveBox>
      )}
      <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
        {phase === 'diag' && <button type="button" className={gemBtn} onClick={() => { setPhase('area'); ctl.ok() }}><Sprout size={18} />Köşegen üzerine kare kur</button>}
        {phase === 'area' && (
          <div className="flex flex-wrap items-end gap-3">
            <NumPad value={val} onChange={setVal} maxLen={3} />
            <button type="button" className={gemBtn} disabled={!val} onClick={checkArea}><Check size={18} />Alanı kontrol et</button>
          </div>
        )}
        {phase === 'decimal' && (
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col gap-1.5">
              {[0, 1, 2].map((i) => <Stepper key={i} label={`${i + 1}. basamak`} value={d[i]} min={0} max={9} onChange={(v) => setD((c) => c.map((x, j) => (j === i ? v : x)) as [number, number, number])} />)}
            </div>
            <div className="flex flex-col gap-2">
              <Readout tone="emerald"><MathText text={`${xs}^{2} = ?`} /></Readout>
              <button type="button" className={gemBtn} onClick={tryDec}><Sprout size={18} />Karesini al</button>
              <div className="flex flex-wrap gap-1.5">{tries.map((t) => <span key={t} className="rounded-lg bg-slate-900/70 px-2 py-1 text-sm font-bold text-slate-200 ring-1 ring-slate-700"><MathText text={t} /></span>)}</div>
            </div>
          </div>
        )}
        {(phase === 'sort' || phase === 'done') && <button type="button" className={`${gemBtn} w-full`} disabled={phase === 'done'} onClick={checkSort}><Check size={18} />Sınıflamayı kontrol et</button>}
      </div>
    </div>
  )
}

/* ═════════════ Görev listesi ═════════════ */

export const G8: MissionDef[] = [
  {
    id: 'zincir', title: 'Birleşen Zincirler', gem: 'sapphire', Comp: Chains,
    story: 'Kristal ustaları büyümeyi “× 2” kristallerinden oluşan zincirlerle kaydediyor. İki zincir birleşince ne olur?',
    hints: ['Zincirdeki her kristal bir “× 2” çarpanı. Birleşen zincirde kaç çarpan var?', '2^{3} · 2^{4} = (2 · 2 · 2) · (2 · 2 · 2 · 2)', 'Ayırırken iki parçanın üsleri toplamı hep kaç olmalı?'],
    strategies: ['Çarpanları tek tek saydım', 'Üsleri topladım çünkü çarpanlar birleşiyor', 'Önce sayısal değerleri çarpıp kontrol ettim'],
  },
  {
    id: 'paket', title: 'Paketler ve Torbalar', gem: 'amethyst', Comp: Packs,
    story: 'Depoda kristaller paketler hâlinde saklanıyor; paketlerin de paketleri var. Bazen de kristaller torbalara paylaştırılıyor.',
    hints: ['(2^{3})^{2} = 2^{3} · 2^{3}: iki paketi yan yana koy.', 'Her paketteki “× 2” sayısı ile paket sayısını düşün.', '2^{6} ÷ 2^{3}: 6 tane 2’den 3 tanesi sadeleşir.'],
    strategies: ['Paketleri açıp çarpanları saydım', 'Üsleri çarptım', 'Bölmede ortak çarpanları sadeleştirdim'],
  },
  {
    id: 'yarim', title: 'Küçülen Kristal', gem: 'aqua', Comp: Halving,
    story: 'Buz mavisi bir kristal her dokunuşta tam ortadan ikiye ayrılıyor. Üs küçüldükçe kristal nereye kadar küçülür?',
    hints: ['Tabloda aşağı indikçe değer yarıya iniyor: 8, 4, 2, …', '2’nin yarısı 1. 1’in yarısı?', '[[1/8]] = [[1/2]] · [[1/2]] · [[1/2]]; ayrıca 8 · [[1/8]] = 1.'],
    strategies: ['Örüntüyü sürdürdüm (her adımda yarıya)', 'Negatif üssü “1 bölü” olarak düşündüm', 'Kesirlerle çarpım olarak yazdım'],
  },
  {
    id: 'karekok', title: 'Kare Kristalin Kenarı', gem: 'aqua', Comp: SquareRoot,
    story: 'Duvardaki kare kristal panonun alanı biliniyor ama kenarını kimse ölçemiyor. Kenar tam sayı mı?',
    hints: ['Hangi tam karelerin arasında? 1, 4, 9, 16, 25, 36, 49, 64, 81, 100…', 'Sayı, büyük tam kareye mi küçük tam kareye mi daha yakın?', 'Bir değer dene, karesini al; büyük çıkarsa sola, küçük çıkarsa sağa kaydır.'],
    strategies: ['Tam karelerle sınırladım', 'Kare alarak yaklaştırdım', 'Hangi tam kareye daha yakın olduğuna baktım'],
  },
  {
    id: 'bilimsel', title: 'Mağara Ölçüleri', gem: 'topaz', Comp: SciNotation,
    story: 'Haritacılar mağarada hem kilometrelerce uzun galeriler hem de gözle görülmeyen kristal lifleri ölçtü. Bu sayıları nasıl yazmalı?',
    hints: ['Katsayıyı 10’a bölersen değeri korumak için 10’un kuvvetini 1 artırmalısın.', 'Bilimsel gösterimde katsayı 1’den büyük ya da eşit, 10’dan küçük olmalı.', 'Sıralarken önce 10’un üslerini karşılaştır.'],
    strategies: ['Önce 10’un üslerini karşılaştırdım', 'Katsayı ile üssü dengeledim', 'Ondalık yazıma çevirip karşılaştırdım'],
  },
  {
    id: 'kosegen', title: 'Köşegen Kristali', gem: 'emerald', Comp: Diagonal,
    story: 'Zümrüt bir karonun kenarı tam 1 birim. Peki karonun köşegeni? Bazı uzunluklar hiçbir kesirle tam yazılamıyor olabilir mi?',
    hints: ['Eğik kare 4 üçgenden oluşuyor; her üçgen bir birim karenin yarısı.', 'Alanı 2 olan karenin kenarı √{2}.', 'Kesir olarak (a/b) yazılabiliyor mu? Sonlu ya da devirli ondalıklar kesre çevrilebilir.'],
    strategies: ['Yarım kareleri birleştirdim', 'Ondalık basamakları tek tek ayarladım', 'Kesir olarak yazılıp yazılamadığına baktım'],
  },
]

// ek() ileride sayısal ekler için
void ek
void Readout
