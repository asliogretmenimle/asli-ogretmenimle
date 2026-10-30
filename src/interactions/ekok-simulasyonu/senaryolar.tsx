import { useEffect, useState, type ReactNode } from 'react'
import { lcm } from '../../lib/numberTheory'
import { ek } from '../../lib/generators'
import { Prompt, Slider, Split, Stage, Stepper, useChecks } from '../donusum-studyosu/ortak'
import { AMBER, CountPanel, DonePanel, EKOK_STRATEGIES, PredictPanel, RED, RunButton, SKY, Status, Steps, TryCard, erli, fmtTime, useRun, type Phase, type ScenarioProps } from '../ebob-simulasyonu/sim'

/**
 * EKOK senaryoları: hepsi “iki sayının da katı olan en küçük sayı” yapısında.
 * Öğrenci bir değer seçip simülasyonu çalıştırır; iki koşulu birden sağlayan değerler (ortak katlar)
 * listelenir, en küçüğünü seçer ve ardından bir sayma/devam sorusunu çözer.
 */

const gen = (n: number) => ek(n, 'gen')

/** “08.36’da” */
const atTime = (m: number) => {
  const total = 8 * 60 + m
  const mm = total % 60
  return fmtTime(m) + ek(mm === 0 ? Math.floor(total / 60) : mm, 'loc', false)
}

/** Ortak durum: tahmin → deneme (iki koşulu da sağlayanlar) → iddia → sayma */
function useHunt(answer: number, valid: (v: number) => boolean) {
  const chk = useChecks()
  const run = useRun()
  const [phase, setPhase] = useState<Phase>('predict')
  const [pred, setPred] = useState<number | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  const [found, setFound] = useState<number[]>([])
  const [wrong, setWrong] = useState<{ key: number; text: string; misconception?: string } | null>(null)
  const record = (v: number) => valid(v) && setFound((f) => (f.includes(v) ? f : [...f, v]))
  return {
    chk, run, phase, setPhase, pred, shown, setShown, found, wrong, record,
    save(v: number) {
      setPred(v)
      setPhase('try')
    },
    simulate(v: number, seconds: number) {
      setShown(v)
      setWrong(null)
      run.start(seconds, () => record(v))
    },
    claim(v: number, text: string) {
      if (v === answer) {
        setWrong(null)
        setPhase('count')
        return
      }
      chk.fail()
      setWrong((w) => ({ key: (w?.key ?? 0) + 1, text, misconception: 'Ortak katlardan birini buldu ama en küçüğünü aramadı' }))
    },
    canClaim: shown !== null && !run.running && valid(shown),
  }
}

function Layout({ problem, phase, work, status, panel }: { problem: ReactNode; phase: Phase; work: ReactNode; status: ReactNode; panel: ReactNode }) {
  return (
    <Split
      work={
        <div className="flex flex-col gap-3">
          <div className="lg:hidden"><Prompt step="Problem">{problem}</Prompt></div>
          <Stage dark>{work}</Stage>
          {status}
        </div>
      }
      panel={
        <>
          <div className="hidden lg:block"><Prompt step="Problem">{problem}</Prompt></div>
          <Steps phase={phase} />
          {panel}
        </>
      }
    />
  )
}

/* ───────────── a. Otobüsler ───────────── */

export function Otobus({ a, b, onSolved, footer }: { a: number; b: number } & ScenarioProps) {
  const L = lcm(a, b)
  const R = 2 * L
  const valid = (m: number) => m % a === 0 && m % b === 0
  const T = useHunt(L, valid)
  const [m, setM] = useState(a)
  const sh = T.shown
  const cur = sh === null ? 0 : T.run.t * sh
  const x = (v: number) => 30 + (v / R) * 540
  const ticks = (step: number) => Array.from({ length: Math.floor(R / step) + 1 }, (_, i) => i * step)
  const times = Math.floor(240 / L)
  const status = (() => {
    if (T.phase === 'predict') return <Status ok={null}>İki otobüs 08.00’de birlikte kalktı. Önce tahminini kaydet.</Status>
    if (sh === null) return <Status ok={null}>Bir saat seç ve saati çalıştır.</Status>
    if (T.run.running) return <Status ok={null}>Saat ilerliyor: {fmtTime(Math.floor(cur))}</Status>
    const A = sh % a === 0, B = sh % b === 0
    if (A && B) return <Status ok>{atTime(sh)} iki otobüs birlikte kalkıyor!</Status>
    const who = (n: number, name: string) => `${name} ${atTime(Math.floor(sh / n) * n)} kalktı, sonra ${atTime(Math.ceil(sh / n) * n)} kalkacak`
    if (A) return <Status ok={false}>{atTime(sh)} yalnız A kalkıyor; {who(b, 'B')}.</Status>
    if (B) return <Status ok={false}>{atTime(sh)} yalnız B kalkıyor; {who(a, 'A')}.</Status>
    return <Status ok={false}>{atTime(sh)} hiçbir otobüs kalkmıyor.</Status>
  })()
  return (
    <Layout
      phase={T.phase}
      problem={<>Bir duraktan A otobüsü <b>{a} dakikada</b> bir, B otobüsü <b>{b} dakikada</b> bir kalkıyor. İkisi saat 08.00’de birlikte kalktı. <b>İlk kez yeniden</b> saat kaçta birlikte kalkarlar?</>}
      status={status}
      work={
        <svg viewBox="0 0 600 200" className="w-full" role="img" aria-label="Kalkış çizelgesi">
          <text x={30} y={22} fontSize={15} fontWeight={900} fill={SKY}>🚌 A: {a} dk</text>
          <text x={30} y={192} fontSize={15} fontWeight={900} fill={AMBER}>🚌 B: {b} dk</text>
          <text x={570} y={24} textAnchor="end" fontSize={22} fontWeight={900} fill="#fff">🕗 {fmtTime(Math.floor(cur))}</text>
          <line x1={30} x2={570} y1={100} y2={100} stroke="#64748b" strokeWidth={4} strokeLinecap="round" />
          {ticks(L).map((v) => v <= cur + 1e-6 && <circle key={`c${v}`} cx={x(v)} cy={100} r={13} fill="#fde047" fillOpacity={0.35} stroke="#fde047" strokeWidth={3} className="animate-pop" />)}
          {ticks(a).map((v) => (
            <g key={`a${v}`} opacity={v <= cur + 1e-6 ? 1 : 0.18}>
              <line x1={x(v)} x2={x(v)} y1={100} y2={58} stroke={SKY} strokeWidth={4} />
              <circle cx={x(v)} cy={56} r={5} fill={SKY} />
              <text x={x(v)} y={44} textAnchor="middle" fontSize={13} fontWeight={800} fill="#bae6fd">{fmtTime(v)}</text>
            </g>
          ))}
          {ticks(b).map((v) => (
            <g key={`b${v}`} opacity={v <= cur + 1e-6 ? 1 : 0.18}>
              <line x1={x(v)} x2={x(v)} y1={100} y2={142} stroke={AMBER} strokeWidth={4} />
              <circle cx={x(v)} cy={144} r={5} fill={AMBER} />
              <text x={x(v)} y={164} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fde68a">{fmtTime(v)}</text>
            </g>
          ))}
          {sh !== null && <line x1={x(cur)} x2={x(cur)} y1={34} y2={172} stroke="#f472b6" strokeWidth={3} strokeDasharray="5 4" />}
        </svg>
      }
      panel={
        <>
          {T.phase === 'predict' && <PredictPanel question="Sence iki otobüs ilk kez yeniden saat kaçta birlikte kalkar?" slider={{ min: 1, max: R, start: b, format: fmtTime }} onSave={T.save} />}
          {T.phase === 'try' && (
            <TryCard
              intro="Bir saat seç ve saati 08.00’den çalıştır. İki otobüsün de kalktığı anlar yeşil listeye eklenir."
              controls={
                <>
                  <Slider value={m} onChange={setM} min={1} max={R} format={fmtTime} label="Saat" dark />
                  <RunButton running={T.run.running} onRun={() => T.simulate(m, Math.max(0.7, (m / R) * 2.4))} onSkip={T.run.skip}>Saati çalıştır</RunButton>
                </>
              }
              found={T.found}
              foundLabel="Birlikte kalkış anları"
              format={fmtTime}
              canClaim={T.canClaim}
              claimLabel="İlk birlikte kalkış bu!"
              onClaim={() => T.claim(sh!, `${atTime(sh!)} birlikte kalktılar ama daha önce de birlikte kalkmış olabilirler. Çizelgede mavi ve sarı çentiklerin 08.00’den sonra ilk çakıştığı yere bak.`)}
              wrong={T.wrong}
            />
          )}
          {T.phase === 'count' && (
            <CountPanel
              question="08.00’den sonra 12.00’ye kadar (12.00 dâhil) iki otobüs kaç kez daha birlikte kalkar?"
              answer={times}
              unit="kez"
              chk={T.chk}
              hint={`Birlikte kalkışlar ${L} dakikada bir tekrar ediyor: ${fmtTime(L)}, ${fmtTime(2 * L)}… 08.00 ile 12.00 arası kaç dakika? İçinde kaç tane ${L} var?`}
              onDone={() => {
                const first = T.chk.pass()
                T.setPhase('done')
                onSolved({ emoji: '🚌', title: 'Otobüsler yeniden birlikte', a, b, answer: L, text: `${L} dakika sonra, ${fmtTime(L)}` }, first)
              }}
            />
          )}
          {T.phase === 'done' && <DonePanel text={`${L}, hem ${gen(a)} hem ${gen(b)} katı olan en küçük sayı: otobüsler ${atTime(L)} yine birlikte kalkar. Sonraki birlikte kalkışlar da ${L} dakikada bir tekrar eder (${fmtTime(2 * L)}, ${fmtTime(3 * L)}…); 12.00’ye kadar ${times} kez.`} prediction={T.pred} answer={L} format={fmtTime} strategies={EKOK_STRATEGIES} footer={footer} />}
        </>
      }
    />
  )
}

/* ───────────── b. Dişliler ───────────── */

function gearPoints(n: number, r: number, h: number) {
  const s = (2 * Math.PI) / n
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const th = i * s
    for (const [da, rr] of [[-0.3, r - h / 2], [-0.14, r + h / 2], [0.14, r + h / 2], [0.3, r - h / 2]] as const) {
      const a = th + da * s
      pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`)
    }
  }
  return pts.join(' ')
}

export function Disli({ n1, n2, onSolved, footer }: { n1: number; n2: number } & ScenarioProps) {
  const L = lcm(n1, n2)
  const valid = (m: number) => m % n1 === 0 && m % n2 === 0
  const T = useHunt(L, valid)
  const [m, setM] = useState(n1)
  const sh = T.shown
  const cur = sh === null ? 0 : T.run.t * sh
  const k = Math.min(5.5, 110 / n2)
  const h = k * 1.7
  const r1 = n1 * k, r2 = n2 * k
  const cx1 = 24 + r1, cx2 = cx1 + r1 + r2, cy = 22 + r2
  const W = cx2 + r2 + 24
  const turns = (n: number) => `${Math.floor(cur / n)} tur${Math.round(cur) % n ? ` + ${Math.round(cur) % n} diş` : ''}`
  const big = L / n2
  const status = (() => {
    if (T.phase === 'predict') return <Status ok={null}>Kırmızı işaretli dişler şu an karşı karşıya. Önce tahminini kaydet.</Status>
    if (sh === null) return <Status ok={null}>Kaç diş döneceğini seç ve çarkları çevir.</Status>
    if (T.run.running) return <Status ok={null}>Çarklar dönüyor: {Math.round(cur)}. diş</Status>
    const A = sh % n1 === 0, B = sh % n2 === 0
    if (A && B) return <Status ok>İşaretli dişler yeniden karşılaştı! Küçük çark {sh / n1} tur, büyük çark {sh / n2} tur attı.</Status>
    if (A) return <Status ok={false}>Küçük çark tam {sh / n1} tur attı ama büyük çarkın işareti {sh % n2} diş ileride kaldı.</Status>
    if (B) return <Status ok={false}>Büyük çark tam {sh / n2} tur attı ama küçük çarkın işareti {sh % n1} diş ileride kaldı.</Status>
    return <Status ok={false}>İki çark da tam tur atmadı; işaretler karşılaşmadı.</Status>
  })()
  return (
    <Layout
      phase={T.phase}
      problem={<>{n1} dişli ve {n2} dişli iki çark birbirini döndürüyor. Kırmızı işaretli dişler şu an karşı karşıya. Çarklar dönmeye başlayınca bu iki diş <b>ilk kez yeniden</b> kaç diş sonra karşılaşır?</>}
      status={status}
      work={
        <div>
          <svg viewBox={`0 0 ${W} ${2 * r2 + 44}`} className="mx-auto w-full max-w-[520px]" role="img" aria-label="Dişli çarklar">
            <g transform={`translate(${cx1} ${cy}) rotate(${(cur * 360) / n1})`}>
              <polygon points={gearPoints(n1, r1, h)} fill="#38bdf8" stroke="#0c4a6e" strokeWidth={2} />
              <circle r={r1 * 0.32} fill="#0c4a6e" />
              <circle cx={r1 - h * 0.2} r={Math.max(4, h * 0.55)} fill={RED} stroke="#fff" strokeWidth={2} />
            </g>
            <g transform={`translate(${cx2} ${cy}) rotate(${(-cur * 360) / n2 + (n2 % 2 ? 0 : 180 / n2)})`}>
              <polygon points={gearPoints(n2, r2, h)} fill="#fbbf24" stroke="#78350f" strokeWidth={2} />
              <circle r={r2 * 0.32} fill="#78350f" />
            </g>
            <g transform={`translate(${cx2} ${cy}) rotate(${(-cur * 360) / n2})`}>
              <circle cx={-(r2 - h * 0.9)} r={Math.max(4, h * 0.55)} fill={RED} stroke="#fff" strokeWidth={2} />
            </g>
            <text x={cx1} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff">{n1}</text>
            <text x={cx2} y={cy + 5} textAnchor="middle" fontSize={18} fontWeight={900} fill="#fff">{n2}</text>
          </svg>
          <div className="mt-1 grid grid-cols-3 gap-2 text-center text-sm font-black">
            <p className="rounded-xl bg-slate-800 p-2 text-white">Dönen diş<span className="block text-2xl tabular-nums">{Math.round(cur)}</span></p>
            <p className="rounded-xl bg-sky-900/70 p-2 text-sky-100">{n1} dişli<span className="block text-base">{turns(n1)}</span></p>
            <p className="rounded-xl bg-amber-900/60 p-2 text-amber-100">{n2} dişli<span className="block text-base">{turns(n2)}</span></p>
          </div>
        </div>
      }
      panel={
        <>
          {T.phase === 'predict' && <PredictPanel question="Kaç diş dönünce işaretli dişler ilk kez yeniden karşılaşır?" unit="diş" onSave={T.save} />}
          {T.phase === 'try' && (
            <TryCard
              intro="Kaç diş döneceğini seç ve çarkları çevir. İşaretlerin karşılaştığı diş sayıları yeşil listeye eklenir."
              controls={
                <>
                  <Slider value={m} onChange={setM} min={1} max={2 * L} label="Dönen diş" dark />
                  <RunButton running={T.run.running} onRun={() => T.simulate(m, Math.min(3, Math.max(0.8, m / 22)))} onSkip={T.run.skip}>Çarkları çevir</RunButton>
                </>
              }
              found={T.found}
              foundLabel="İşaretlerin karşılaştığı diş sayıları"
              canClaim={T.canClaim}
              claimLabel="İlk karşılaşma bu!"
              onClaim={() => T.claim(sh!, `${sh} dişte karşılaştılar ama daha önce de karşılaşmış olabilirler. İki çarkın da tam tur attığı ilk anı ara: diş sayısı hem ${gen(n1)} hem ${gen(n2)} katı olmalı.`)}
              wrong={T.wrong}
            />
          )}
          {T.phase === 'count' && (
            <CountPanel
              question={`İşaretler ${L}. dişte karşılaştı. Bu sürede ${n2} dişli büyük çark kaç tam tur attı?`}
              answer={big}
              unit="tur"
              chk={T.chk}
              hint={`Büyük çarkın bir turu ${n2} diş. ${L} dişte kaç tane ${n2} var?`}
              onDone={() => {
                const first = T.chk.pass()
                T.setPhase('done')
                onSolved({ emoji: '⚙️', title: 'Dişliler yeniden karşılaşıyor', a: n1, b: n2, answer: L, text: `${L} diş sonra (${L / n1} tur ve ${big} tur)` }, first)
              }}
            />
          )}
          {T.phase === 'done' && <DonePanel text={`${L}, hem ${gen(n1)} hem ${gen(n2)} katı olan en küçük sayı. Küçük çark ${L / n1} tur, büyük çark ${big} tur atınca işaretler yeniden karşılaşır.`} prediction={T.pred} answer={L} format={(v) => `${v} diş`} strategies={EKOK_STRATEGIES} footer={footer} />}
        </>
      }
    />
  )
}

/* ───────────── c. Fayanslar ───────────── */

export function Fayans({ w, h, onSolved, footer }: { w: number; h: number } & ScenarioProps) {
  const L = lcm(w, h)
  const T = useHunt(L, (v) => v % w === 0 && v % h === 0)
  const [cols, setCols] = useState(1)
  const [rows, setRows] = useState(1)
  const width = cols * w, height = rows * h
  const square = width === height
  const { setShown, record } = T
  useEffect(() => {
    if (T.phase !== 'try') return
    setShown(square ? width : null)
    if (square) record(width)
  }, [cols, rows, T.phase])
  const u = Math.min(500 / width, 290 / height, 34)
  const ox = 44, oy = 14
  const count = (L / w) * (L / h)
  const status = (() => {
    if (T.phase === 'predict') return <Status ok={null}>Bir fayans {w} cm × {h} cm. Önce tahminini kaydet.</Status>
    if (square) return <Status ok>Kare oldu! Kenar {width} cm: yatayda {cols}, dikeyde {rows} fayans.</Status>
    return <Status ok={false}>Henüz kare değil: genişlik {width} cm, yükseklik {height} cm.</Status>
  })()
  return (
    <Layout
      phase={T.phase}
      problem={<>Kenarları {w} cm ve {h} cm olan dikdörtgen fayanslar, döndürülmeden yan yana ve alt alta dizilerek <b>en küçük kare</b> oluşturulacak.</>}
      status={status}
      work={
        <svg viewBox={`0 0 ${Math.max(width * u + ox + 16, 300)} ${height * u + oy + 40}`} className="mx-auto max-h-[380px] w-full" role="img" aria-label="Fayans döşemesi">
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => (
              <rect key={`${r}-${c}`} x={ox + c * w * u} y={oy + r * h * u} width={w * u} height={h * u} fill={(r + c) % 2 ? '#c4b5fd' : '#a78bfa'} stroke="#2e1065" strokeWidth={1.5} className="animate-pop" />
            )),
          )}
          {square && <rect x={ox - 3} y={oy - 3} width={width * u + 6} height={height * u + 6} fill="none" stroke="#fde047" strokeWidth={5} rx={3} className="animate-pop" />}
          <text x={ox + (width * u) / 2} y={oy + height * u + 26} textAnchor="middle" fontSize={16} fontWeight={900} fill="#e9d5ff">{width} cm</text>
          <text x={ox - 14} y={oy + (height * u) / 2} textAnchor="middle" fontSize={16} fontWeight={900} fill="#e9d5ff" transform={`rotate(-90 ${ox - 14} ${oy + (height * u) / 2})`}>{height} cm</text>
        </svg>
      }
      panel={
        <>
          {T.phase === 'predict' && <PredictPanel question="Oluşacak en küçük karenin bir kenarı kaç cm olur?" unit="cm" onSave={T.save} />}
          {T.phase === 'try' && (
            <TryCard
              intro="Yan yana ve alt alta fayans ekle. Kare oluşan kenar uzunlukları yeşil listeye eklenir."
              controls={
                <div className="flex flex-col gap-2">
                  <Stepper value={cols} onChange={setCols} min={1} max={12} label={`Yan yana (${w} cm)`} dark />
                  <Stepper value={rows} onChange={setRows} min={1} max={12} label={`Alt alta (${h} cm)`} dark />
                </div>
              }
              found={T.found}
              foundLabel="Kare olan kenar uzunlukları"
              format={(v) => `${v} cm`}
              canClaim={square}
              claimLabel="En küçük kare bu!"
              onClaim={() => T.claim(width, `Bu bir kare ama daha küçük bir kare de kurulabilir mi? Karenin kenarı hem ${gen(w)} hem ${gen(h)} katı olmalı; daha küçük bir ortak kat var mı?`)}
              wrong={T.wrong}
            />
          )}
          {T.phase === 'count' && (
            <CountPanel
              question={`Kenarı ${L} cm olan kare için kaç fayans gerekir?`}
              answer={count}
              unit="fayans"
              chk={T.chk}
              hint={`Yatayda kaç fayans var (${L} ÷ ${w})? Dikeyde kaç (${L} ÷ ${h})? Satır ve sütunları birleştir.`}
              onDone={() => {
                const first = T.chk.pass()
                T.setPhase('done')
                onSolved({ emoji: '🧱', title: 'Fayanslarla en küçük kare', a: w, b: h, answer: L, text: `kenarı ${L} cm, ${count} fayans` }, first)
              }}
            />
          )}
          {T.phase === 'done' && <DonePanel text={`${L} cm, hem ${gen(w)} hem ${gen(h)} katı olan en küçük sayı. Yatayda ${L / w}, dikeyde ${L / h} fayans: ${count} fayans.`} prediction={T.pred} answer={L} format={(v) => `${v} cm`} strategies={EKOK_STRATEGIES} footer={footer} />}
        </>
      }
    />
  )
}

/* ───────────── d. Kalanlı gruplama ───────────── */

function Groups({ n, size, color, shown }: { n: number; size: number; color: string; shown: number }) {
  const full = Math.floor(n / size)
  const left = n % size
  const dot = (i: number, c: string) => <span key={i} className="size-3 rounded-full ring-1 ring-black/30" style={{ background: c, opacity: i < shown ? 1 : 0.12 }} />
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: full }, (_, g) => (
        <span key={g} className="flex flex-wrap gap-0.5 rounded-lg bg-slate-700/80 p-1 ring-1 ring-slate-500" style={{ width: `${Math.ceil(Math.sqrt(size)) * 14 + 8}px` }}>
          {Array.from({ length: size }, (_, i) => dot(g * size + i, color))}
        </span>
      ))}
      {left > 0 && (
        <span className="flex flex-wrap items-center gap-0.5 rounded-lg border-2 border-dashed border-rose-400 bg-rose-500/20 p-1">
          {Array.from({ length: left }, (_, i) => dot(full * size + i, RED))}
          {shown >= n && <span className="ml-1 text-xs font-black text-rose-200">artan {left}</span>}
        </span>
      )}
    </div>
  )
}

export function Bilye({ a, b, r, onSolved, footer }: { a: number; b: number; r: number } & ScenarioProps) {
  const L = lcm(a, b)
  const ans = L + r
  const valid = (v: number) => v % a === r && v % b === r
  const T = useHunt(ans, valid)
  const [nv, setNv] = useState(10)
  const sh = T.shown
  const shownDots = sh === null ? 0 : Math.ceil(T.run.t * sh)
  const nextOne = 2 * L + r
  const status = (() => {
    if (T.phase === 'predict') return <Status ok={null}>Önce tahminini kaydet.</Status>
    if (sh === null) return <Status ok={null}>Bir bilye sayısı seç ve iki şekilde grupla.</Status>
    if (T.run.running) return <Status ok={null}>Bilyeler gruplanıyor…</Status>
    if (valid(sh)) return <Status ok>İki gruplamada da {r} bilye arttı!</Status>
    return <Status ok={false}>{erli(a)} gruplayınca {sh % a}, {erli(b)} gruplayınca {sh % b} bilye arttı.</Status>
  })()
  return (
    <Layout
      phase={T.phase}
      problem={<>Bir kutudaki bilyeler {erli(a)} gruplanınca da {erli(b)} gruplanınca da <b>{r} bilye artıyor</b>. Kutuda <b>en az</b> kaç bilye vardır? ({r}’den fazla bilye var.)</>}
      status={status}
      work={
        <div className="flex min-h-56 flex-col gap-3 p-1">
          {sh === null ? (
            <div className="grid flex-1 place-items-center rounded-2xl bg-slate-800/70 p-4 text-center text-slate-200">
              <p className="text-4xl" aria-hidden>🫙</p>
              <p className="mt-2 text-sm font-bold">Bilyeler kutuda gruplanmayı bekliyor.</p>
            </div>
          ) : (
            <>
              <p className="text-center text-lg font-black text-white">{sh} bilye</p>
              <div className="rounded-2xl bg-slate-800/60 p-2.5">
                <p className="mb-1.5 text-sm font-black text-sky-200">{erli(a)} gruplar</p>
                <Groups n={sh} size={a} color={SKY} shown={shownDots} />
              </div>
              <div className="rounded-2xl bg-slate-800/60 p-2.5">
                <p className="mb-1.5 text-sm font-black text-amber-200">{erli(b)} gruplar</p>
                <Groups n={sh} size={b} color={AMBER} shown={shownDots} />
              </div>
            </>
          )}
        </div>
      }
      panel={
        <>
          {T.phase === 'predict' && <PredictPanel question="Kutuda en az kaç bilye vardır?" unit="bilye" onSave={T.save} />}
          {T.phase === 'try' && (
            <TryCard
              intro={`Bilye sayısını seç ve grupla. İki gruplamada da ${r} bilye artan sayılar yeşil listeye eklenir.`}
              controls={
                <>
                  <Slider value={nv} onChange={setNv} min={r + 1} max={2 * L + r + 4} label="Bilye sayısı" dark />
                  <RunButton running={T.run.running} onRun={() => T.simulate(nv, 0.9)} onSkip={T.run.skip}>Bilyeleri grupla</RunButton>
                </>
              }
              found={T.found}
              foundLabel={`İki gruplamada da ${r} artan sayılar`}
              canClaim={T.canClaim}
              claimLabel="En az bilye bu!"
              onClaim={() => T.claim(sh!, `${sh} uyuyor ama daha az bilye de olabilir mi? Artan ${r} bilyeyi çıkarınca kalan sayı hem ${gen(a)} hem ${gen(b)} katı olmalı.`)}
              wrong={T.wrong}
            />
          )}
          {T.phase === 'count' && (
            <CountPanel
              question={`Bu koşula uyan, ${ans}’den sonraki ilk bilye sayısı kaçtır?`}
              answer={nextOne}
              unit="bilye"
              chk={T.chk}
              hint={`Artan ${r} bilyeyi çıkar: kalan sayılar hem ${gen(a)} hem ${gen(b)} katı olmalı (${L}, …). Bir sonraki ortak katı bul ve ${r} ekle.`}
              onDone={() => {
                const first = T.chk.pass()
                T.setPhase('done')
                onSolved({ emoji: '🔮', title: 'Kalanlı gruplama', a, b, answer: L, text: `${L} + ${r} = ${ans} bilye` }, first)
              }}
            />
          )}
          {T.phase === 'done' && <DonePanel text={`${r} bilyeyi ayırınca kalan ${L}, hem ${gen(a)} hem ${gen(b)} katı olan en küçük sayı: ${L} + ${r} = ${ans}. Sonraki uygun sayılar da ortak katlara ${r} eklenerek bulunur: ${nextOne}, ${3 * L + r}…`} prediction={T.pred} answer={ans} format={(v) => `${v} bilye`} strategies={EKOK_STRATEGIES} footer={footer} />}
        </>
      }
    />
  )
}
