import { useRef, useState } from 'react'
import { useGesture } from '@use-gesture/react'
import { Check, Delete, Sprout, Swords, X } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import { ek } from '../../../lib/generators'
import type { Ctl, MissionDef } from './mission'
import { CaveBox, Chip, Gem, GemCanvas, GEMS, Label, NumPad, Pick, Readout, Stepper, darkBtn, gemBtn, nf, padNum, type GemName } from './ui'
import { expand, pick, pile, useTask } from './shared'

/* ═════════════ 1. Büyüme ağacı ═════════════ */

const BUCKETS: { t: string; lo: number; hi: number }[] = [
  { t: '50’den az', lo: 0, hi: 50 },
  { t: '50 ile 200 arası', lo: 50, hi: 200 },
  { t: '200 ile 500 arası', lo: 200, hi: 500 },
  { t: '500’den çok', lo: 500, hi: Infinity },
]

function Tree({ ctl }: { ctl: Ctl }) {
  const B = 3
  const MAXG = 3
  const [phase, setPhase] = useState<'est' | 'grow' | 'predict' | 'done'>('est')
  const [est, setEst] = useState<number | null>(null)
  const [gen, setGen] = useState(0)
  const [val, setVal] = useState('')
  const wrap = useRef<HTMLDivElement>(null)

  useTask(
    ctl,
    phase === 'est'
      ? 'Tohum kristal her gece 3 kristale bölünüyor; yeni kristaller de öyle. 5. gecenin sonunda kaç kristal olur? Önce tahmin et.'
      : phase === 'grow'
        ? 'Kristali büyüt: “Bir gece geçsin”e dokun ya da kristallerin üstünde iki parmağını aç. Tablodaki sayılar nasıl değişiyor?'
        : phase === 'predict'
          ? 'Ağaç mağaraya sığmıyor! Büyütmeden bul: 5. gecenin sonunda kaç kristal olur?'
          : 'Kristal ağacı tamam. Tahmininle karşılaştır!',
  )

  const grow = () => {
    if (phase !== 'grow' || gen >= MAXG) return
    const g = gen + 1
    setGen(g)
    ctl.ok()
    if (g === 2) ctl.note('Her gece kristal sayısı 3 katına çıkıyor: 1 → 3 → 9')
    if (g >= MAXG) setPhase('predict')
  }

  useGesture(
    {
      onPinch: ({ da: [d], first, last, memo }) => {
        if (first) return d
        if (last && memo && d / memo > 1.25) grow()
        return memo
      },
    },
    { target: wrap, eventOptions: { passive: false } },
  )

  const check = () => {
    const v = padNum(val)
    if (Number.isNaN(v)) return
    if (v === 243) {
      ctl.ok()
      ctl.note('3 · 3 · 3 · 3 · 3 = 3^{5} = 243 kristal')
      const b = est !== null ? BUCKETS[est] : null
      ctl.note(b && 243 >= b.lo && 243 < b.hi ? 'Tahminin isabetliydi!' : 'Tahminden hızlı büyüdü: her gece bir öncekinin 3 katı eklenince sayı çok hızlı artıyor.')
      setPhase('done')
      ctl.complete()
      return
    }
    if (v === 15) return ctl.miss('3 ile 5’i çarptın. Tabloya bak: 2. gecede 3 · 2 = 6 mı oldu, yoksa 3 · 3 = 9 mu? Her gece ne yapılıyor?', 'Kuvveti taban × üs olarak hesapladı (3^{5} = 15)', 'carpanagaci')
    if (v === 125) return ctl.miss('125 = 5 · 5 · 5. Burada her gece hangi sayıyla çarpıyoruz, kaç kez?', 'Kuvvette taban ile üssü karıştırdı (5^{3})')
    if (v === 81) return ctl.miss('81 kristal 4. gecenin sonunda olur. Bir gece daha geçince ne olur?')
    if (v === 729) return ctl.miss('Bu 6. gecenin sayısı olur. Bir gece fazla mı saydın? Tabloyu 4. ve 5. geceye uzat.')
    if (v === 45 || v === 39 || v === 36) return ctl.miss('Her gece 9’ar ya da 3’er mi ekleniyor, yoksa sayı 3 katına mı çıkıyor? 1 → 3 → 9 → 27 dizisine bak.', 'Üstel büyümeyi sabit eklemeli (doğrusal) büyüme gibi düşündü')
    ctl.miss('Tabloda her satır bir öncekinden nasıl elde ediliyor? 27’den başlayıp iki gece daha ilerle.')
  }

  const W = 600, H = 360
  const ys = [42, 132, 222, 318]
  const sc = [1.3, 0.95, 0.7, 0.42]
  const xs = (k: number, i: number) => ((i + 0.5) * W) / B ** k
  const levels = Array.from({ length: gen + 1 }, (_, k) => k)
  const gems: GemName[] = ['amethyst', 'aqua', 'emerald', 'topaz']
  const rows = phase === 'done' ? 5 : phase === 'predict' ? 5 : gen

  return (
    <div className="grid gap-3">
      <CaveBox>
        <div ref={wrap} style={{ touchAction: 'none' }} data-handle>
          <GemCanvas w={W} h={H} label={`Kristal ağacı: ${gen}. gece, ${B ** gen} kristal`}>
            {levels.map((k) =>
              k === 0 ? null : (
                <g key={`e${k}`} stroke={GEMS[gems[k]][1]} strokeOpacity={0.45} strokeWidth={k === 3 ? 1 : 1.6}>
                  {Array.from({ length: B ** k }, (_, i) => (
                    <line key={i} x1={xs(k - 1, Math.floor(i / B))} y1={ys[k - 1] + 14 * sc[k - 1]} x2={xs(k, i)} y2={ys[k] - 16 * sc[k]} className="kg-draw" style={{ animationDelay: `${i * 12}ms` }} />
                  ))}
                </g>
              ),
            )}
            {levels.map((k) => (
              <g key={`n${k}`}>
                {Array.from({ length: B ** k }, (_, i) => (
                  <Gem key={i} x={xs(k, i)} y={ys[k]} s={sc[k]} gem={gems[k]} glow={k < 3} halo={k === 0} anim="grow" delay={k === gen ? 200 + i * 30 : 0} />
                ))}
                <text x={10} y={ys[k] + 5} fontSize={14} fontWeight={900} fill={GEMS[gems[k]][0]}>{B ** k}</text>
              </g>
            ))}
            {gen >= MAXG && phase !== 'done' && (
              <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={13} fontWeight={800} fill="#c4b5fd" className="kg-fade">Mağara doldu: 4. ve 5. geceyi zihninde büyüt</text>
            )}
          </GemCanvas>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 p-3 pt-0">
          <button type="button" className={gemBtn} disabled={phase !== 'grow' || gen >= MAXG} onClick={grow}><Sprout size={18} />Bir gece geçsin</button>
          <span className="text-sm font-bold text-slate-300">{gen}. gece · {B ** gen} kristal</span>
        </div>
      </CaveBox>

      {phase === 'est' && (
        <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
          <Label>Tahminin</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BUCKETS.map((b, i) => <Pick key={b.t} on={est === i} onClick={() => { setEst(i); setPhase('grow'); ctl.note(`Tahminim: ${b.t}`) }}>{b.t}</Pick>)}
          </div>
        </div>
      )}

      {phase !== 'est' && (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="overflow-x-auto rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
            <Label>Büyüme tablosu</Label>
            <table className="w-full text-left text-[15px] font-extrabold text-slate-100">
              <thead><tr className="text-xs text-slate-400"><th className="py-1 pr-3">Gece</th><th className="py-1 pr-3">Kristal</th><th className="py-1">Çarpım olarak</th></tr></thead>
              <tbody>
                {Array.from({ length: rows + 1 }, (_, k) => {
                  const known = k <= gen || phase === 'done'
                  return (
                    <tr key={k} className={`border-t border-slate-700 ${known ? '' : 'text-slate-500'} ${k === gen && known ? 'animate-fade-up' : ''}`}>
                      <td className="py-1.5 pr-3">{k}.</td>
                      <td className="py-1.5 pr-3 tabular-nums" style={{ color: known ? GEMS[gems[Math.min(3, k)]][0] : undefined }}>{known ? nf(3 ** k) : '?'}</td>
                      <td className="py-1.5"><MathText text={!known ? '…' : k === 0 ? '1' : k === 1 ? '3' : `${expand(3, k)} = 3^{${k}}`} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {phase === 'predict' && (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
              <Label>5. gece kaç kristal?</Label>
              <NumPad value={val} onChange={setVal} maxLen={5} />
              <button type="button" className={`${gemBtn} w-full`} disabled={!val} onClick={check}><Check size={18} />Kontrol et</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═════════════ 2. Aynı hazine, farklı kuleler ═════════════ */

function formsOf(N: number) {
  const out: [number, number][] = []
  for (let a = 2; a <= N; a++) for (let b = 1; a ** b <= N; b++) if (a ** b === N) out.push([a, b])
  return out
}

function treasureLayout(N: number, form: [number, number] | null, W: number, H: number) {
  if (!form || form[1] === 1) return { pts: pile(N, W / 2, H / 2, 128), blocks: [] as { x: number; y: number; s: number }[], r: 7 }
  const [a, b] = form
  const nb = a ** (b - 2)
  const bpr = Math.ceil(Math.sqrt(nb))
  const rows = Math.ceil(nb / bpr)
  const gap = 14
  const cell = Math.min((W - 40 - gap * (bpr - 1)) / (bpr * a), (H - 40 - gap * (rows - 1)) / (rows * a))
  const bw = a * cell
  const ox = (W - (bpr * bw + gap * (bpr - 1))) / 2
  const oy = (H - (rows * bw + gap * (rows - 1))) / 2
  const pts = Array.from({ length: N }, (_, j) => {
    const blk = Math.floor(j / (a * a))
    const r = Math.floor((j % (a * a)) / a)
    const c = j % a
    return { x: ox + (blk % bpr) * (bw + gap) + (c + 0.5) * cell, y: oy + Math.floor(blk / bpr) * (bw + gap) + (r + 0.5) * cell }
  })
  const blocks = Array.from({ length: nb }, (_, k) => ({ x: ox + (k % bpr) * (bw + gap), y: oy + Math.floor(k / bpr) * (bw + gap), s: bw }))
  return { pts, blocks, r: Math.min(cell * 0.42, 9) }
}

function Treasure({ ctl }: { ctl: Ctl }) {
  const [N] = useState(() => pick([64, 81]))
  const forms = formsOf(N)
  const GOAL = 3
  const [a, setA] = useState(N === 64 ? 3 : 2)
  const [b, setB] = useState(2)
  const [shown, setShown] = useState<[number, number] | null>(null)
  const [found, setFound] = useState<string[]>([])
  const [last, setLast] = useState<string | null>(null)

  useTask(ctl, found.length < GOAL ? `Hazinede ${N} kristal var. Onları aynı sayının kuvveti olarak diz: tabanı ve üssü seç, kuleyi kur. En az ${GOAL} farklı yol bul!` : found.length < forms.length ? `${found.length} yol buldun! Bir yol daha kaldı; bulabilir misin? (İstersen sonraki odaya geç.)` : `${ek(N, 'gen')} bütün kuvvet yazımlarını buldun!`)

  const build = () => {
    const v = a ** b
    const key = `${a}^${b}`
    setLast(`${a}^{${b}} = ${b > 1 ? expand(a, b) + ' = ' : ''}${nf(v)}`)
    if (v === N) {
      if (found.includes(key)) return ctl.info('Bu kuleyi zaten kurdun. Başka bir taban dene: hangi sayıları kendisiyle çarparak ' + N + ' elde edebilirsin?')
      const nf2 = [...found, key]
      setFound(nf2)
      setShown([a, b])
      ctl.ok()
      ctl.solve(`hazine:${N}:${key}`, `${a}^{${b}} = ${N}`)
      if (b === 1) ctl.info(`Doğru: her sayı kendisinin 1. kuvvetidir (${N}^{1} = ${N}). Kristaller tek bir yığın; bir de tabanı küçük bir kule dene!`)
      else ctl.note(`${a}^{${b}} = ${expand(a, b)} = ${N}`)
      if (nf2.length >= GOAL) {
        if (nf2.length >= 2) ctl.note(`${nf2.map((k) => k.replace(/\^(\d+)/, '^{$1}')).join(' = ')}`)
        ctl.complete()
      }
      return
    }
    if (a * b === N) return ctl.miss(`${a}^{${b}} demek ${ek(a, 'acc')} ${b} kez toplamak mı, yoksa ${b} tane ${ek(a, 'acc')} çarpmak mı? ${expand(a, b)} işlemini yap.`, 'Üslü ifadeyi taban × üs olarak hesapladı', 'carpanagaci')
    ctl.info(`${a}^{${b}} = ${nf(v)} kristal; hazinede ${N} var. ${v < N ? 'Az geldi' : 'Çok geldi'}: tabanı mı değiştirirsin, üssü mü?`)
  }

  const W = 600, H = 340
  const L = treasureLayout(N, shown, W, H)
  const pal: GemName[] = ['amethyst', 'sapphire', 'emerald', 'topaz', 'aqua', 'ruby']
  const a2 = shown ? shown[0] * shown[0] : N

  return (
    <div className="grid gap-3">
      <CaveBox tone="#4c1d95">
        <GemCanvas w={W} h={H} label={`${N} kristallik hazine`}>
          {L.blocks.map((q, k) => (
            <rect key={`${shown}-${k}`} x={q.x - 5} y={q.y - 5} width={q.s + 10} height={q.s + 10} rx={8} fill={GEMS[pal[k % pal.length]][1]} fillOpacity={0.08} stroke={GEMS[pal[k % pal.length]][1]} strokeOpacity={0.6} strokeDasharray="4 4" className="kg-fade" />
          ))}
          {L.pts.map((p, j) => (
            <Chip key={j} x={p.x} y={p.y} r={L.r} gem={shown && shown[1] > 1 ? pal[Math.floor(j / a2) % pal.length] : pal[j % 3]} className="kg-move" style={{ transitionDelay: `${(j % 16) * 12}ms` }} />
          ))}
        </GemCanvas>
        <p className="px-3 pb-3 text-center text-[15px] font-extrabold text-violet-100">
          {shown && shown[1] > 1 ? <MathText text={`${shown[0]}^{${shown[1]}}: ${shown[1] === 2 ? `${shown[0]} sıra × ${shown[0]} sütun` : `${nf(shown[0] ** (shown[1] - 2))} tane ${shown[0]} × ${shown[0]} kare`}`} /> : `${N} kristal dağınık duruyor`}
        </p>
      </CaveBox>

      <div className="grid gap-3 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col gap-2">
          <Stepper label="Taban" value={a} min={1} max={N} onChange={setA} />
          <Stepper label="Üs" value={b} min={1} max={8} onChange={setB} accent="#fbbf24" />
        </div>
        <div className="flex flex-col justify-center gap-2">
          <Readout><MathText text={`${a}^{${b}} = ${b > 1 ? expand(a, b) : a}`} /></Readout>
          <button type="button" className={gemBtn} onClick={build}><Sprout size={18} />Kuleyi kur</button>
          {last && <p className="text-center text-sm font-bold text-slate-300"><MathText text={`Son kule: ${last}`} /></p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-700">
        <span className="text-xs font-black tracking-widest text-violet-200 uppercase">Kuleler</span>
        {forms.map((_, i) => (
          <span key={i} className={`grid min-h-10 min-w-16 place-items-center rounded-xl px-3 text-lg font-black ${found[i] ? 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400 animate-pop' : 'bg-slate-800 text-slate-500 ring-1 ring-slate-600 ring-dashed'}`}>
            {found[i] ? <MathText text={found[i].replace(/\^(\d+)/, '^{$1}')} /> : '?'}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ═════════════ 3. Kule yarışı ═════════════ */

const PAIRS: [[number, number], [number, number]][] = [
  [[2, 5], [5, 2]],
  [[3, 4], [4, 3]],
]

function Pillar({ x, base, floors, maxV, gem, label }: { x: number; base: number; floors: number; maxV: number; gem: GemName; label: string }) {
  const H = 250, top = 30, bottom = top + H, w = 76
  const v = base ** floors
  const h = Math.max(8, (v / maxV) * H)
  const [l, m] = GEMS[gem]
  return (
    <g>
      <rect x={x - w / 2 - 6} y={bottom} width={w + 12} height={10} rx={4} fill="#1e1b4b" />
      <g style={{ transform: `translate(${x}px, ${bottom}px)` }}>
        <g className="kg-move" style={{ transform: `scaleY(${h / 100})`, transformOrigin: '0 0' }}>
          <polygon points={`${-w / 2},0 ${-w / 2},-92 0,-100 ${w / 2},-92 ${w / 2},0`} fill={m} fillOpacity={0.85} />
          <polygon points={`${-w / 2},0 ${-w / 2},-92 0,-100 0,0`} fill="#000" opacity={0.18} />
        </g>
      </g>
      {Array.from({ length: floors }, (_, k) => {
        const yk = bottom - Math.max(8, (base ** (k + 1) / maxV) * H)
        return <line key={k} x1={x - w / 2} x2={x + w / 2} y1={yk} y2={yk} stroke={l} strokeOpacity={0.7} strokeWidth={1.5} className="kg-fade" />
      })}
      <text x={x} y={bottom - h - 10} textAnchor="middle" fontSize={22} fontWeight={900} fill={l} className="kg-move">{nf(v)}</text>
      <text x={x} y={bottom + 32} textAnchor="middle" fontSize={18} fontWeight={900} fill={m}>{label}</text>
    </g>
  )
}

function Race({ ctl }: { ctl: Ctl }) {
  const [pi, setPi] = useState(0)
  const [pred, setPred] = useState<'L' | 'E' | 'R' | null>(null)
  const [fl, setFl] = useState<[number, number]>([0, 0])
  const [hunt, setHunt] = useState<[number, number]>([2, 3])
  const [huntShown, setHuntShown] = useState<[number, number] | null>(null)
  const [solved, setSolved] = useState(false)
  const misLogged = useRef(false)
  const huntMode = pi >= PAIRS.length
  const pair: [[number, number], [number, number]] = huntMode ? (huntShown ? [[huntShown[0], huntShown[1]], [huntShown[1], huntShown[0]]] : [[2, 3], [3, 2]]) : PAIRS[pi]
  const floors: [number, number] = huntMode ? (huntShown ? [huntShown[1], huntShown[0]] : [0, 0]) : fl
  const full = !huntMode && fl[0] === pair[0][1] && fl[1] === pair[1][1]
  const vL = pair[0][0] ** pair[0][1], vR = pair[1][0] ** pair[1][1]
  const maxV = Math.max(vL, vR, 1)
  const t = (p: [number, number]) => `${p[0]}^{${p[1]}}`

  useTask(ctl, huntMode
    ? 'Yarışlarda taban ile üs yer değiştirince sonuç değişti. Yer değiştirdiğinde EŞİT kalan iki farklı sayı bulabilir misin?'
    : pred === null
      ? `Hangi kule daha yüksek olur: ${t(pair[0])} mı, ${t(pair[1])} mi? Önce tahmin et.`
      : full ? 'Yarış bitti! Tahmininle karşılaştır.' : 'Kuleleri kat kat büyüt: her kat, kuleyi tabanı kadar katına çıkarır.')

  const addFloor = (side: 0 | 1) => {
    if (pred === null || fl[side] >= pair[side][1]) return
    const n: [number, number] = [...fl]
    n[side]++
    setFl(n)
    if (n[0] === pair[0][1] && n[1] === pair[1][1]) finish()
  }
  const finish = () => {
    const actual = vL > vR ? 'L' : vL < vR ? 'R' : 'E'
    ctl.ok()
    ctl.note(`${t(pair[0])} = ${expand(pair[0][0], pair[0][1])} = ${vL} ${vL > vR ? '>' : vL < vR ? '<' : '='} ${vR} = ${t(pair[1])}`)
    if (pred !== actual) {
      if (!misLogged.current && ((actual === 'L' && pair[1][0] > pair[0][0]) || (actual === 'R' && pair[0][0] > pair[1][0]))) {
        misLogged.current = true
        ctl.misconception('Tabanı büyük olan kuvvetin her zaman daha büyük olduğunu düşündü')
      }
      ctl.info('Tahminin farklı çıktı. Üs, kaç kez çarptığımızı söyler: küçük bir sayıyı çok kez çarpmak bazen büyük sayıyı az kez çarpmayı geçer!')
    }
  }
  const nextPair = () => {
    setPi((p) => p + 1)
    setPred(null)
    setFl([0, 0])
  }
  const race = () => {
    const [a, b] = hunt
    if (a === b) return ctl.info('Aynı sayıyı seçince yer değiştirmek bir şey değiştirmez. İki farklı sayı seç.')
    setHuntShown([a, b])
    const x = a ** b, y = b ** a
    if (x === y) {
      if (!solved) {
        setSolved(true)
        ctl.ok()
        ctl.solve('yaris:2-4', `${a}^{${b}} = ${b}^{${a}} = ${x}`)
        ctl.note(`${a}^{${b}} = ${b}^{${a}} = ${x}: taban ile üs yer değiştirince sonuç genellikle değişir, ama bu çift bir istisna!`)
        ctl.complete()
      }
      return
    }
    ctl.info(`${a}^{${b}} = ${nf(x)}, ${b}^{${a}} = ${nf(y)}. ${x > y ? 'Soldaki' : 'Sağdaki'} kazandı; eşit değiller. Başka bir çift dene!`)
  }

  const W = 600, H = 330
  return (
    <div className="grid gap-3">
      <CaveBox tone="#1e3a8a">
        <GemCanvas w={W} h={H} label="Kristal kule yarışı">
          <Pillar x={180} base={pair[0][0]} floors={floors[0]} maxV={maxV} gem="sapphire" label={`${pair[0][0]} üssü ${pair[0][1]}`} />
          <Pillar x={420} base={pair[1][0]} floors={floors[1]} maxV={maxV} gem="ruby" label={`${pair[1][0]} üssü ${pair[1][1]}`} />
          <text x={W / 2} y={170} textAnchor="middle" fontSize={26} fontWeight={900} fill="#e9d5ff" opacity={0.5}>VS</text>
        </GemCanvas>
      </CaveBox>

      {!huntMode && pred === null && (
        <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
          <Label>Tahminin</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            <Pick onClick={() => setPred('L')}>{`${t(pair[0])} daha yüksek`}</Pick>
            <Pick onClick={() => setPred('E')}>Eşit olurlar</Pick>
            <Pick onClick={() => setPred('R')}>{`${t(pair[1])} daha yüksek`}</Pick>
          </div>
        </div>
      )}
      {!huntMode && pred !== null && (
        <div className="grid gap-3 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600 sm:grid-cols-2">
          {([0, 1] as const).map((s) => {
            const p = pair[s]
            const f = fl[s]
            return (
              <div key={s} className="flex flex-col gap-2">
                <Readout tone={s === 0 ? 'sky' : 'amber'}><MathText text={f === 0 ? '1' : `${expand(p[0], f)} = ${nf(p[0] ** f)}`} /></Readout>
                <button type="button" className={darkBtn} disabled={f >= p[1]} onClick={() => addFloor(s)}>Kat ekle (× {p[0]}) · {f}/{p[1]}</button>
              </div>
            )
          })}
          {full && <button type="button" className={`${gemBtn} sm:col-span-2`} onClick={nextPair}><Swords size={18} />{pi + 1 < PAIRS.length ? 'Sonraki yarış' : 'Yer değiştirme avı'}</button>}
        </div>
      )}
      {huntMode && (
        <div className="grid gap-3 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col gap-2">
            <Stepper label="a" value={hunt[0]} min={1} max={6} onChange={(v) => setHunt([v, hunt[1]])} />
            <Stepper label="b" value={hunt[1]} min={1} max={6} onChange={(v) => setHunt([hunt[0], v])} accent="#fbbf24" />
          </div>
          <div className="flex flex-col justify-center gap-2">
            <Readout><MathText text={`${hunt[0]}^{${hunt[1]}}  ve  ${hunt[1]}^{${hunt[0]}}`} /></Readout>
            <button type="button" className={gemBtn} onClick={race}><Swords size={18} />Yarıştır</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═════════════ 4. İşlem önceliği ═════════════ */

type Tok = '2' | '3' | '5' | '+' | '·' | '²' | '(' | ')'

function evalToks(t: Tok[]): number | null {
  let i = 0
  const num = (): number | null => {
    if (t[i] === '(') {
      i++
      const v = expr()
      if (v === null || t[i] !== ')') return null
      i++
      return v
    }
    let s = ''
    while (i < t.length && /\d/.test(t[i])) s += t[i++]
    return s ? Number(s) : null
  }
  const pow = (): number | null => {
    let v = num()
    while (v !== null && t[i] === '²') {
      v = v * v
      i++
    }
    return v
  }
  const term = (): number | null => {
    let v = pow()
    while (v !== null && t[i] === '·') {
      i++
      const r = pow()
      v = r === null ? null : v * r
    }
    return v
  }
  const expr = (): number | null => {
    let v = term()
    while (v !== null && t[i] === '+') {
      i++
      const r = term()
      v = r === null ? null : v + r
    }
    return v
  }
  const v = expr()
  return v !== null && i === t.length ? v : null
}
const showToks = (t: Tok[]) => t.map((x) => (x === '²' ? '^{2}' : x === '+' ? ' + ' : x === '·' ? ' · ' : x)).join('')

function GridArt({ which }: { which: 0 | 1 }) {
  const W = 600, H = 300
  if (which === 0) {
    const c = 50, ox = 300, oy = 60
    return (
      <GemCanvas w={W} h={H} label="2 tek kristal ve 3 × 3’lük bir kare grup">
        <Gem x={110} y={150} s={1.5} gem="topaz" glow anim="pop" />
        <Gem x={180} y={150} s={1.5} gem="topaz" glow anim="pop" delay={80} />
        <rect x={ox - 8} y={oy - 8} width={3 * c + 16} height={3 * c + 16} rx={12} fill="#a855f7" fillOpacity={0.08} stroke="#c084fc" strokeDasharray="5 4" />
        {Array.from({ length: 9 }, (_, j) => <Gem key={j} x={ox + (j % 3) * c + c / 2} y={oy + Math.floor(j / 3) * c + c / 2} s={1.15} gem="amethyst" glow anim="pop" delay={150 + j * 40} />)}
        <text x={ox + 1.5 * c} y={oy + 3 * c + 36} textAnchor="middle" fontSize={16} fontWeight={900} fill="#e9d5ff">3 sıra × 3 sütun</text>
      </GemCanvas>
    )
  }
  const c = 46, ox = 185, oy = 34
  return (
    <GemCanvas w={W} h={H} label="Kenarı 2 artı 3 olan kare kristal grubu">
      {Array.from({ length: 25 }, (_, j) => {
        const r = Math.floor(j / 5), k = j % 5
        const g: GemName = r < 2 && k < 2 ? 'topaz' : r >= 2 && k >= 2 ? 'amethyst' : 'aqua'
        return <Gem key={j} x={ox + k * c + c / 2} y={oy + r * c + c / 2} s={1.05} gem={g} glow anim="pop" delay={j * 25} />
      })}
      <line x1={ox} x2={ox + 2 * c - 4} y1={oy - 12} y2={oy - 12} stroke="#fbbf24" strokeWidth={4} strokeLinecap="round" />
      <line x1={ox + 2 * c + 4} x2={ox + 5 * c} y1={oy - 12} y2={oy - 12} stroke="#c084fc" strokeWidth={4} strokeLinecap="round" />
      <text x={ox + c} y={oy - 18} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fde68a">2</text>
      <text x={ox + 3.5 * c} y={oy - 18} textAnchor="middle" fontSize={15} fontWeight={900} fill="#e9d5ff">3</text>
      <line x1={ox - 12} x2={ox - 12} y1={oy} y2={oy + 2 * c - 4} stroke="#fbbf24" strokeWidth={4} strokeLinecap="round" />
      <line x1={ox - 12} x2={ox - 12} y1={oy + 2 * c + 4} y2={oy + 5 * c} stroke="#c084fc" strokeWidth={4} strokeLinecap="round" />
    </GemCanvas>
  )
}

function Order({ ctl }: { ctl: Ctl }) {
  const TARGET = [11, 25]
  const [ti, setTi] = useState<0 | 1>(0)
  const [toks, setToks] = useState<Tok[]>([])
  const [solvedT, setSolvedT] = useState<boolean[]>([false, false])
  const [forms, setForms] = useState<string[][]>([[], []])

  useTask(ctl, ti === 0
    ? (solvedT[0] ? 'Aynı resmi anlatan başka bir ifade yazabilir misin? Ya da sonraki dizilime geç.' : 'Resimdeki kristalleri bir ifadeyle anlat. Karolara dokunarak ifadeyi kur, sonra kristallerle karşılaştır.')
    : (solvedT[1] ? 'Harika! Başka bir yazım da bulabilirsin.' : 'Yeni dizilim: büyük kare grubu bir ifadeyle anlat. Kenarına dikkat!'))

  const add = (t: Tok) => setToks((c) => (c.length < 14 ? [...c, t] : c))
  const check = () => {
    const v = evalToks(toks)
    const s = showToks(toks)
    if (v === null) return ctl.info('İfade henüz tamamlanmamış: parantezler kapalı mı, her işaretin iki yanında bir sayı var mı?')
    const target = TARGET[ti]
    const key = toks.join('')
    if (v === target) {
      if (!toks.includes('²')) return ctl.info(`Doğru sayı (${target})! Ama resimde bir kare grup var. Onu bir kuvvetle (^{2}) yazabilir misin?`)
      if (forms[ti].includes(key)) return ctl.info('Bu ifadeyi zaten yazdın. Toplananların ya da çarpanların yerini değiştirmeyi dene.')
      setForms((f) => f.map((x, i) => (i === ti ? [...x, key] : x)))
      ctl.solve(`oncelik:${ti}:${key}`, `${s} = ${target}`)
      ctl.ok()
      ctl.note(`${s} = ${target}`)
      if (!solvedT[ti]) {
        const n = [...solvedT]
        n[ti] = true
        setSolvedT(n)
        if (ti === 1) {
          ctl.note('Önce parantez içi, sonra kuvvet, sonra çarpma, en son toplama: 2 + 3^{2} = 11 ama (2 + 3)^{2} = 25')
          ctl.complete()
        }
      }
      return
    }
    if (ti === 1 && (key === '2+3²' || key === '3²+2' || key === '2²+3²' || key === '3²+2²')) return ctl.miss(`${s} = ${v} kristal eder; resimde ${target} var. Bu ifadede önce hangi işlem yapılır? Kenarın tamamının (2 ile 3’ün toplamının) karesini almak için ne eklemelisin?`, 'Kuvveti toplamın tamamına uygulanıyor sandı (2 + 3² = 25)', 'algebra')
    if (ti === 0 && (key === '(2+3)²' || key === '(3+2)²')) return ctl.miss(`${s} = ${v}: bu 5 × 5’lik bir kare olurdu. Resimde 5 × 5’lik bir kare var mı? Parantez neyi değiştirdi?`, 'Parantezin işlem önceliğini değiştirdiğini fark etmedi')
    if (key.includes('2²') && ti === 0) return ctl.miss(`${s} = ${v}. Resimdeki iki tek kristal bir kare grup mu? Hangi sayının karesini almalısın?`)
    ctl.miss(`Senin ifaden ${v} kristal anlatıyor, resimde ${target} kristal var. Hangi grup eksik ya da fazla? Önce hangi işlemin yapıldığına dikkat et.`)
  }
  const keys: Tok[] = ['2', '3', '5', '+', '·', '²', '(', ')']

  return (
    <div className="grid gap-3">
      <CaveBox tone="#701a75">
        <div className="flex items-center justify-between px-3 pt-3">
          <span className="rounded-lg bg-slate-900/70 px-2.5 py-1 text-sm font-black text-fuchsia-200">Dizilim {ti + 1}/2</span>
          <span className="rounded-lg bg-slate-900/70 px-2.5 py-1 text-sm font-black text-amber-200">{TARGET[ti]} kristal</span>
        </div>
        <GridArt key={ti} which={ti} />
      </CaveBox>
      <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
        <div className="mb-2 flex min-h-14 items-center gap-2 rounded-2xl bg-slate-950/70 px-4 text-2xl font-black text-amber-100 ring-1 ring-slate-600" aria-live="polite">
          {toks.length ? <MathText text={showToks(toks)} /> : <span className="text-base text-slate-500">İfadeni kur…</span>}
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {keys.map((k) => (
            <button key={k} type="button" onClick={() => add(k)} className="grid min-h-12 place-items-center rounded-xl bg-slate-700 text-xl font-black text-white ring-1 ring-slate-500 active:scale-95" aria-label={k === '²' ? 'kare' : k}>
              {k === '²' ? <MathText text="□^{2}" /> : k}
            </button>
          ))}
          <button type="button" onClick={() => setToks((c) => c.slice(0, -1))} className="grid min-h-12 place-items-center rounded-xl bg-slate-700 text-white ring-1 ring-slate-500 active:scale-95" aria-label="Sil"><Delete size={20} /></button>
          <button type="button" onClick={() => setToks([])} className="grid min-h-12 place-items-center rounded-xl bg-slate-700 text-white ring-1 ring-slate-500 active:scale-95" aria-label="Temizle"><X size={20} /></button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={`${gemBtn} flex-1`} disabled={!toks.length} onClick={check}><Check size={18} />Kristallerle karşılaştır</button>
          {ti === 0 && solvedT[0] && <button type="button" className={darkBtn} onClick={() => { setTi(1); setToks([]) }}>Sonraki dizilim</button>}
        </div>
      </div>
    </div>
  )
}

/* ═════════════ 5. İşaret aynası ═════════════ */

function Mirror({ ctl }: { ctl: Ctl }) {
  const [n, setN] = useState(0)
  const [phase, setPhase] = useState<'grow' | 'predict' | 'pair' | 'done'>('grow')
  const [p9, setP9] = useState<'+' | '−' | null>(null)
  const [p10, setP10] = useState<'+' | '−' | null>(null)
  const [vals, setVals] = useState<[string, string]>(['', ''])
  const [focus, setFocus] = useState<0 | 1>(0)
  const MAXN = 6
  const v = (-2) ** n

  useTask(ctl, phase === 'grow'
    ? 'Ayna kristali her dokunuşta (−2) ile çarpılıyor: sayısı ikiye katlanıyor, rengi aynada dönüyor. 6 kez çarp ve işaretlerin örüntüsünü izle.'
    : phase === 'predict' ? 'Büyütmeden tahmin et: (−2)^{9} ve (−2)^{10} pozitif mi, negatif mi?'
    : phase === 'pair' ? 'İki kristal kartı aynı mı? (−3)^{2} ve −3^{2} değerlerini bul. Bir karta dokun, değerini yaz.'
    : 'Ayna odasının sırrını çözdün!')

  const mult = () => {
    if (n >= MAXN) return
    const k = n + 1
    setN(k)
    ctl.ok()
    if (k === 4) ctl.note('(−2) · (−2) = 4: iki eksi çarpılınca artı olur')
    if (k === MAXN) setPhase('predict')
  }
  const checkPred = () => {
    if (!p9 || !p10) return
    if (p9 === '−' && p10 === '+') {
      ctl.ok()
      ctl.note('Çift sayıda (−2) çarpılırsa sonuç pozitif, tek sayıda çarpılırsa negatif: (−2)^{9} < 0, (−2)^{10} > 0')
      setPhase('pair')
      return
    }
    ctl.miss('Tabloda işaret nasıl değişiyor? Hangi üslerde sonuç pozitif çıktı: 2, 4, 6… mı, 1, 3, 5… mi? 9 ve 10 hangi gruba giriyor?', 'Negatif tabanlı kuvvetin işaretinin üsse bağlı olduğunu fark etmedi')
  }
  const checkPair = () => {
    const a = padNum(vals[0]), b = padNum(vals[1])
    if (Number.isNaN(a) || Number.isNaN(b)) return ctl.info('İki kartın da değerini yaz.')
    if (a === 9 && b === -9) {
      ctl.ok()
      ctl.note('(−3)^{2} = (−3) · (−3) = 9 ama −3^{2} = −(3 · 3) = −9: üs, hemen önündeki sayıya ya da paranteze uygulanır')
      setPhase('done')
      ctl.complete()
      return
    }
    if (a === -9) return ctl.miss('(−3)^{2} = (−3) · (−3). İki negatif sayının çarpımının işareti ne olur? Aynadaki tabloya bak.', 'Negatif sayının karesini negatif sandı')
    if (Math.abs(a) === 6 || Math.abs(b) === 6) return ctl.miss('Kare almak 2 ile çarpmak mı, sayıyı kendisiyle çarpmak mı?', 'Kuvveti taban × üs olarak hesapladı')
    if (b === 9) return ctl.miss('−3^{2} ifadesinde parantez yok. Üs yalnızca hangi sayıya uygulanır: 3’e mi, −3’e mi? Önce 3^{2}’yi bul, sonra önündeki eksiyi düşün.', 'Parantezsiz −3² ifadesinde üssü negatif sayının tamamına uyguladı')
    ctl.miss('Her kartı çarpım olarak yaz: (−3) · (−3) ve −(3 · 3). Sonuçlar aynı mı?')
  }

  const W = 600, H = 300
  const cnt = Math.abs(v)
  const cols = cnt <= 8 ? cnt : cnt <= 16 ? 8 : cnt <= 32 ? 8 : 16
  const pos = v >= 0
  const cell = cnt <= 8 ? 56 : cnt <= 32 ? 34 : 30

  return (
    <div className="grid gap-3">
      <CaveBox tone={pos ? '#78350f' : '#881337'}>
        <GemCanvas w={W} h={H} label={`(−2) üssü ${n} = ${v}`}>
          <line x1={20} x2={W - 20} y1={H - 40} y2={H - 40} stroke="#e2e8f0" strokeOpacity={0.25} strokeDasharray="6 6" />
          <text x={W / 2} y={36} textAnchor="middle" fontSize={30} fontWeight={900} fill={pos ? '#fde68a' : '#fda4af'} key={`t${n}`} className="kg-pop">{n === 0 ? '1' : `(−2)${'⁰¹²³⁴⁵⁶'[n]} = ${nf(v)}`}</text>
          <g key={n}>
            {Array.from({ length: cnt }, (_, j) => {
              const rows = Math.ceil(cnt / cols)
              const x = W / 2 + ((j % cols) - (cols - 1) / 2) * cell
              const y = 70 + (H - 130) / 2 - ((rows - 1) * cell) / 2 + Math.floor(j / cols) * cell + 14
              return <Gem key={j} x={x} y={y} s={cell / 48} gem={pos ? 'topaz' : 'ruby'} glow={cnt <= 16} rot={pos ? 0 : 180} anim="pop" delay={j * 15} />
            })}
          </g>
          <text x={W / 2} y={H - 14} textAnchor="middle" fontSize={15} fontWeight={800} fill={pos ? '#fcd34d' : '#fda4af'}>{pos ? 'pozitif: kristaller dik' : 'negatif: kristaller aynada ters'}</text>
        </GemCanvas>
      </CaveBox>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="overflow-x-auto rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
          <Label>Ayna tablosu</Label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: n }, (_, k) => {
              const x = (-2) ** (k + 1)
              return (
                <span key={k} className={`rounded-xl px-2.5 py-1.5 text-[15px] font-black ring-1 animate-pop ${x > 0 ? 'bg-amber-400/15 text-amber-100 ring-amber-400/50' : 'bg-rose-500/15 text-rose-100 ring-rose-400/50'}`}>
                  <MathText text={`(−2)^{${k + 1}} = ${nf(x)}`} />
                </span>
              )
            })}
            {n === 0 && <span className="text-sm font-semibold text-slate-400">Çarptıkça burada belirecek.</span>}
          </div>
          {phase === 'grow' && <button type="button" className={`${gemBtn} mt-3 w-full`} onClick={mult}>(−2) ile çarp · {n}/{MAXN}</button>}
        </div>
        {phase === 'predict' && (
          <div className="grid gap-2 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
            {([['(−2)^{9}', p9, setP9], ['(−2)^{10}', p10, setP10]] as const).map(([lbl, val, set]) => (
              <div key={lbl} className="flex items-center gap-2">
                <span className="w-24 text-xl font-black text-slate-100"><MathText text={lbl} /></span>
                <Pick on={val === '+'} onClick={() => set('+')}>pozitif</Pick>
                <Pick on={val === '−'} onClick={() => set('−')}>negatif</Pick>
              </div>
            ))}
            <button type="button" className={gemBtn} disabled={!p9 || !p10} onClick={checkPred}><Check size={18} />Kontrol et</button>
          </div>
        )}
      </div>
      {(phase === 'pair' || phase === 'done') && (
        <div className="grid gap-3 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            {(['(−3)^{2}', '−3^{2}'] as const).map((lbl, i) => (
              <button key={lbl} type="button" onClick={() => setFocus(i as 0 | 1)} className={`flex min-h-16 items-center justify-between rounded-2xl px-4 text-2xl font-black ring-2 transition ${focus === i ? 'bg-violet-500/25 text-white ring-violet-300' : 'bg-slate-900/70 text-slate-200 ring-slate-600'}`}>
                <MathText text={lbl} /><span className="text-amber-200">= {vals[i] || '?'}</span>
              </button>
            ))}
            <button type="button" className={gemBtn} disabled={phase === 'done'} onClick={checkPair}><Check size={18} />İki kartı kontrol et</button>
          </div>
          <NumPad value={vals[focus]} onChange={(s) => setVals((c) => (focus === 0 ? [s, c[1]] : [c[0], s]))} neg maxLen={4} />
        </div>
      )}
    </div>
  )
}

/* ═════════════ 6. İkiye katlanan bahçe ═════════════ */

function Garden({ ctl }: { ctl: Ctl }) {
  const [phase, setPhase] = useState<'est' | 'grow' | 'power' | 'done'>('est')
  const [est, setEst] = useState(4)
  const [day, setDay] = useState(0)
  const [marked, setMarked] = useState<number | null>(null)
  const [base, setBase] = useState(2)
  const [exp, setExp] = useState(2)
  const MAXD = 8
  const A = (d: number) => 2 ** d
  const Bv = (d: number) => 20 + 10 * d

  useTask(ctl, phase === 'est'
    ? 'Mor bahçede 1 kristal var ve her gece kristal sayısı ikiye katlanıyor. Yeşil bahçede 20 kristal var ve her gece 10 kristal ekleniyor. Mor bahçe kaçıncı gece yeşili geçer? Tahmin et.'
    : phase === 'grow'
      ? day < 7 ? 'Geceleri ilerlet ve iki bahçeyi izle.' : 'Mor bahçenin yeşili İLK KEZ geçtiği geceyi bul ve aşağıdan o geceye dokun.'
      : phase === 'power' ? 'Mor bahçenin 7. gecedeki kristal sayısını (128) bir kuvvet olarak yaz.'
      : 'Bahçeler büyüdü!')

  const mark = (d: number) => {
    setMarked(d)
    if (d === 7) {
      ctl.ok()
      ctl.note('7. gece mor bahçe 128, yeşil bahçe 90 kristal: ikiye katlanma toplamayı geçti')
      ctl.note(est === 7 ? 'Tahminin tam isabet!' : `Tahminin ${est}. geceydi; ${est < 7 ? 'katlanma başta yavaş görünür ama sonra hızlanır.' : 'katlanma sandığından hızlı büyüdü.'}`)
      setPhase('power')
      return
    }
    if (d === 6) return ctl.miss('6. gecede mor bahçede 64, yeşil bahçede 80 kristal var. Hangisi daha çok?')
    if (d === 8) return ctl.miss('8. gecede mor önde, ama ilk kez mi öne geçti? Bir önceki geceye bak.')
    if (d < 6) return ctl.miss(`${d}. gecede mor bahçede ${A(d)}, yeşil bahçede ${Bv(d)} kristal var. Mor gerçekten önde mi?`, 'Katlanarak büyümenin başlangıçta yavaş olduğunu gözden kaçırdı')
  }
  const checkPow = () => {
    const v = base ** exp
    if (v === 128 && base === 2) {
      ctl.ok()
      ctl.solve('bahce:2^7', '2^{7} = 128')
      ctl.note('Mor: 2^{7} = 128 (her gece × 2). Yeşil: 20 + 10 · 7 = 90 (her gece + 10)')
      setPhase('done')
      ctl.complete()
      return
    }
    if (v === 128) return ctl.info('Bu da 128’e eşit. Ama mor bahçe her gece kaç katına çıkıyordu? O sayıyı taban yap.')
    if (base * exp === 128 || base === 7) return ctl.miss(`${base}^{${exp}} = ${expand(base, Math.min(exp, 8))} = ${nf(v)}. Taban, her gece çarptığımız sayı; üs ise kaç gece çarptığımız. Hangisi hangisi?`, base === 7 ? 'Taban ile üssü karıştırdı' : 'Kuvveti taban × üs olarak hesapladı')
    ctl.miss(`${base}^{${exp}} = ${nf(v)}, 128 değil. 1 → 2 → 4 → 8 … kaç kez 2 ile çarptın?`)
  }

  const W = 600, H = 300
  const shown = Array.from({ length: day + 1 }, (_, d) => d)
  const yMax = Math.max(40, ...shown.map((d) => Math.max(A(d), Bv(d))))
  const gw = (W - 60) / (MAXD + 1)
  const sy = (v: number) => (v / yMax) * (H - 70)
  return (
    <div className="grid gap-3">
      <CaveBox tone="#14532d">
        <GemCanvas w={W} h={H} label="İki kristal bahçesinin geceye göre büyümesi">
          <line x1={40} x2={W - 10} y1={H - 30} y2={H - 30} stroke="#94a3b8" strokeOpacity={0.5} />
          {Array.from({ length: MAXD + 1 }, (_, d) => {
            const x = 44 + d * gw
            const on = d <= day
            return (
              <g key={d} opacity={on ? 1 : 0.25}>
                {on && (
                  <>
                    <rect x={x + 4} width={gw / 2 - 6} y={H - 30 - sy(A(d))} height={sy(A(d))} rx={4} fill="#c084fc" className="kg-fade" />
                    <rect x={x + gw / 2} width={gw / 2 - 6} y={H - 30 - sy(Bv(d))} height={sy(Bv(d))} rx={4} fill="#34d399" className="kg-fade" />
                    <text x={x + gw / 4 + 1} y={H - 36 - sy(A(d))} textAnchor="middle" fontSize={11} fontWeight={900} fill="#e9d5ff">{A(d)}</text>
                    <text x={x + (3 * gw) / 4 - 3} y={H - 36 - sy(Bv(d))} textAnchor="middle" fontSize={11} fontWeight={900} fill="#bbf7d0">{Bv(d)}</text>
                  </>
                )}
                {marked === d && <rect x={x} y={20} width={gw - 2} height={H - 50} rx={8} fill="none" stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="6 4" />}
                <text x={x + gw / 2} y={H - 12} textAnchor="middle" fontSize={13} fontWeight={800} fill="#cbd5e1">{d}.</text>
              </g>
            )
          })}
          <Gem x={60} y={26} s={0.7} gem="amethyst" glow /><text x={74} y={31} fontSize={13} fontWeight={900} fill="#e9d5ff">×2</text>
          <Gem x={120} y={26} s={0.7} gem="emerald" glow /><text x={134} y={31} fontSize={13} fontWeight={900} fill="#bbf7d0">+10</text>
        </GemCanvas>
      </CaveBox>
      {phase === 'est' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
          <Stepper label="Gece" value={est} min={1} max={12} onChange={setEst} />
          <button type="button" className={gemBtn} onClick={() => { setPhase('grow'); ctl.note(`Tahminim: ${est}. gece`) }}>Tahminimi kaydet</button>
        </div>
      )}
      {phase === 'grow' && (
        <div className="rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600">
          <button type="button" className={`${gemBtn} w-full sm:w-auto`} disabled={day >= MAXD} onClick={() => { setDay((d) => d + 1); ctl.ok() }}><Sprout size={18} />Bir gece geçsin ({day}/{MAXD})</button>
          {day >= 7 && (
            <div className="mt-3">
              <Label>Mor bahçe ilk kez hangi gece öne geçti?</Label>
              <div className="flex flex-wrap gap-1.5">
                {shown.slice(1).map((d) => <Pick key={d} on={marked === d} onClick={() => mark(d)}>{`${d}. gece`}</Pick>)}
              </div>
            </div>
          )}
        </div>
      )}
      {(phase === 'power' || phase === 'done') && (
        <div className="grid gap-3 rounded-2xl bg-slate-800/80 p-3 ring-1 ring-slate-600 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col gap-2">
            <Stepper label="Taban" value={base} min={1} max={12} onChange={setBase} />
            <Stepper label="Üs" value={exp} min={1} max={10} onChange={setExp} accent="#fbbf24" />
          </div>
          <div className="flex flex-col justify-center gap-2">
            <Readout><MathText text={`${base}^{${exp}} = ?`} /></Readout>
            <button type="button" className={gemBtn} disabled={phase === 'done'} onClick={checkPow}><Check size={18} />128 mi?</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═════════════ Görev listesi ═════════════ */

export const G7: MissionDef[] = [
  {
    id: 'agac', title: 'Büyüme Ağacı', gem: 'amethyst', Comp: Tree,
    story: 'Mağaranın girişinde tek bir mor kristal parlıyor. Her gece her kristal üç kristale bölünüyor.',
    hints: ['Her gece kristal sayısı bir önceki gecenin kaç katı oluyor?', '27’den sonra bir gece: 27 · 3. Bir gece daha?', '5 gece boyunca 3 ile çarptın: 3 · 3 · 3 · 3 · 3.'],
    strategies: ['Her geceyi bir öncekinin 3 katı olarak buldum', '3’ü 5 kez çarptım', 'Ağaç çizimindeki dalları düşündüm'],
  },
  {
    id: 'hazine', title: 'Aynı Hazine, Farklı Kuleler', gem: 'sapphire', Comp: Treasure,
    story: 'Bir sandık dolusu kristal bulundu. Ustalar onları kare ve küp kuleler hâlinde dizmek istiyor.',
    hints: ['Küçük bir tabanla başla: 2 · 2 · 2 … kaç kez çarparsan hazineye ulaşırsın?', 'Bir kuvveti bulduysan çarpanları gruplayabilirsin: 2 · 2 · 2 · 2 · 2 · 2 = (2 · 2) · (2 · 2) · (2 · 2).', 'Her sayı kendisinin 1. kuvvetidir.'],
    strategies: ['Çarpanları ikişer üçer grupladım', 'Küçük tabandan başlayıp tekrar tekrar çarptım', 'Bulduğum kuvvetten yenisini türettim'],
  },
  {
    id: 'yaris', title: 'Kule Yarışı', gem: 'ruby', Comp: Race,
    story: 'İki kristal kulesi yarışıyor. Biri büyük tabanlı, öteki büyük üslü. Hangisi daha yükseğe çıkar?',
    hints: ['Üs, tabanı kaç kez çarptığımızı söyler. Kat kat büyüterek karşılaştır.', 'Yer değiştirme avında 2’yi tabanlardan biri olarak dene.', '2^{3} ile 3^{2}, 2^{4} ile 4^{2}… hangileri eşit?'],
    strategies: ['Kat kat çarparak karşılaştırdım', 'Üssün daha güçlü büyüttüğünü düşündüm', 'Küçük sayılarla sistemli denedim'],
  },
  {
    id: 'oncelik', title: 'Sıralı Kristaller', gem: 'topaz', Comp: Order,
    story: 'Kristal haritasında gruplar ifadelerle yazılmış. Bir ifadeyi yanlış sırayla okuyan madenci yanlış odaya gidiyor!',
    hints: ['Resimde kaç ayrı grup var? Her grubu ayrı ayrı yaz, sonra birleştir.', 'Kare bir grup: kenarındaki kristal sayısının karesi.', 'Kenar 2 + 3 ise, karenin tamamı için toplamın karesini almalısın: parantez kullan.'],
    strategies: ['Önce grupları ayrı ayrı yazdım', 'Parantezle işlem sırasını değiştirdim', 'İfadeyi hesaplayıp resimle karşılaştırdım'],
  },
  {
    id: 'ayna', title: 'İşaret Aynası', gem: 'ruby', Comp: Mirror,
    story: 'Ayna gölünde kristaller iki dünya arasında gidip geliyor: pozitif dünyada dik, negatif dünyada ters duruyorlar.',
    hints: ['(−2) · (−2) çarpımının işareti ne? Bir (−2) daha çarparsan?', 'Eksileri ikişer eşleştir: eşleşmeyen bir eksi kalıyor mu?', '−3^{2} ifadesinde üs yalnızca 3’e uygulanır.'],
    strategies: ['Eksi işaretlerini ikişer eşleştirdim', 'Tablodaki örüntüyü sürdürdüm', 'İfadeyi çarpım olarak yazdım'],
  },
  {
    id: 'bahce', title: 'İkiye Katlanan Bahçe', gem: 'emerald', Comp: Garden,
    story: 'İki bahçıvan yarışıyor: biri her gece kristallerini ikiye katlıyor, öteki her gece 10 kristal ekliyor.',
    hints: ['Mor bahçe: 1, 2, 4, 8… Yeşil bahçe: 20, 30, 40… Tabloyu birlikte sürdür.', 'Mor bahçenin yeşili geçtiği ilk geceyi bulmak için ardışık iki geceyi karşılaştır.', '128 = 2 · 2 · 2 · 2 · 2 · 2 · 2'],
    strategies: ['Tabloyu gece gece sürdürdüm', 'Grafikteki sütunları karşılaştırdım', 'Katlanmanın hızlandığını fark ettim'],
  },
]
