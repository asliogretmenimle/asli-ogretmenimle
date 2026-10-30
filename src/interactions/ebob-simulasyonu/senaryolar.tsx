import { useState, type ReactNode } from 'react'
import { gcd } from '../../lib/numberTheory'
import { ek } from '../../lib/generators'
import { Prompt, Slider, Split, Stage, useChecks } from '../donusum-studyosu/ortak'
import { CountPanel, DonePanel, EBOB_STRATEGIES, GREEN, PredictPanel, RED, RunButton, Status, Steps, TryCard, useRun, type Phase, type ScenarioProps } from './sim'

/**
 * EBOB senaryoları: hepsi “iki niceliği de artmadan bölen en büyük sayı” yapısında.
 * Her bileşen aynı durum makinesini kullanır (useTry) ve yalnızca sahnesini çizer.
 */

const acc = (n: number) => ek(n, 'acc')

/** Ortak durum: tahmin → deneme (tam oturanlar) → iddia → sayma */
function useTry(a: number, b: number) {
  const g = gcd(a, b)
  const chk = useChecks()
  const run = useRun()
  const [phase, setPhase] = useState<Phase>('predict')
  const [pred, setPred] = useState<number | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  const [found, setFound] = useState<number[]>([])
  const [wrong, setWrong] = useState<{ key: number; text: string; misconception?: string } | null>(null)
  const fits = (v: number) => a % v === 0 && b % v === 0
  return {
    g, chk, run, phase, setPhase, pred, shown, found, wrong, fits,
    save(v: number) {
      setPred(v)
      setPhase('try')
    },
    simulate(v: number, seconds: number) {
      setShown(v)
      setWrong(null)
      run.start(seconds, () => {
        if (fits(v)) setFound((f) => (f.includes(v) ? f : [...f, v]))
      })
    },
    /** v en büyük mü? değilse ipucu */
    claim(v: number, text: string) {
      if (v === g) {
        setWrong(null)
        setPhase('count')
        return
      }
      chk.fail()
      setWrong((w) => ({ key: (w?.key ?? 0) + 1, text, misconception: 'Ortak bölenlerden birini buldu ama en büyüğünü aramadı' }))
    },
    canClaim: shown !== null && !run.running && fits(shown),
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

/* ───────────── a. Tarla ───────────── */

export function Tarla({ W, H, onSolved, footer }: { W: number; H: number } & ScenarioProps) {
  const T = useTry(W, H)
  const [s, setS] = useState(5)
  const sh = T.shown
  const u = Math.min(540 / W, 300 / H)
  const ox = 46, oy = 34
  const n = (W / T.g) * (H / T.g)
  let tiles: ReactNode = null
  let rest: ReactNode = null
  if (sh) {
    const cols = Math.floor(W / sh), rows = Math.floor(H / sh)
    const N = cols * rows
    const vis = Math.ceil(T.run.t * N)
    tiles = Array.from({ length: Math.min(vis, N) }, (_, i) => {
      const c = i % cols, r = Math.floor(i / cols)
      return <rect key={i} x={ox + c * sh * u} y={oy + r * sh * u} width={sh * u} height={sh * u} fill={GREEN} fillOpacity={0.8} stroke="#064e3b" strokeWidth={Math.min(2, sh * u * 0.08)} />
    })
    if (!T.run.running) {
      const rw = W - cols * sh, rh = H - rows * sh
      rest = (
        <g>
          {rw > 0 && <rect x={ox + cols * sh * u} y={oy} width={rw * u} height={H * u} fill={RED} fillOpacity={0.6} />}
          {rh > 0 && <rect x={ox} y={oy + rows * sh * u} width={cols * sh * u} height={rh * u} fill={RED} fillOpacity={0.6} />}
          {rw > 0 && <text x={ox + (cols * sh + rw / 2) * u} y={oy + (H * u) / 2} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff" transform={`rotate(-90 ${ox + (cols * sh + rw / 2) * u} ${oy + (H * u) / 2})`}>artan {rw} m</text>}
          {rh > 0 && <text x={ox + (cols * sh * u) / 2} y={oy + (rows * sh + rh / 2) * u + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff">artan {rh} m</text>}
        </g>
      )
    }
  }
  const status = (() => {
    if (T.phase === 'predict') return <Status ok={null}>Tarla {W} m × {H} m. Önce tahminini kaydet.</Status>
    if (!sh) return <Status ok={null}>Bir kare kenarı seç ve tarlayı döşe.</Status>
    if (T.run.running) return <Status ok={null}>{sh} m’lik kareler döşeniyor…</Status>
    if (T.fits(sh)) return <Status ok>{sh} m’lik kareler artmadan oturdu: {W} ÷ {sh} = {W / sh}, {H} ÷ {sh} = {H / sh}.</Status>
    const parts = [W % sh ? `${W} ÷ ${sh} = ${Math.floor(W / sh)}, kalan ${W % sh}` : '', H % sh ? `${H} ÷ ${sh} = ${Math.floor(H / sh)}, kalan ${H % sh}` : ''].filter(Boolean)
    return <Status ok={false}>{sh} m olmadı: {parts.join(' · ')}. Kırmızı şeritte toprak arttı.</Status>
  })()
  return (
    <Layout
      phase={T.phase}
      problem={<>Kenarları {W} m ve {H} m olan dikdörtgen bir tarla, hiç toprak artmadan <b>eş ve olabildiğince büyük kare</b> parsellere bölünecek.</>}
      status={status}
      work={
        <svg viewBox={`0 0 ${W * u + ox + 20} ${H * u + oy + 16}`} className="w-full" role="img" aria-label="Tarla">
          <rect x={ox} y={oy} width={W * u} height={H * u} fill="#78350f" fillOpacity={0.55} stroke="#fbbf24" strokeWidth={2} rx={3} />
          {tiles}
          {rest}
          <text x={ox + (W * u) / 2} y={oy - 10} textAnchor="middle" fontSize={16} fontWeight={900} fill="#fde68a">{W} m</text>
          <text x={ox - 12} y={oy + (H * u) / 2} textAnchor="middle" fontSize={16} fontWeight={900} fill="#fde68a" transform={`rotate(-90 ${ox - 12} ${oy + (H * u) / 2})`}>{H} m</text>
        </svg>
      }
      panel={
        <>
          {T.phase === 'predict' && <PredictPanel question="Kare parselin bir kenarı en çok kaç metre olabilir?" unit="m" onSave={T.save} />}
          {T.phase === 'try' && (
            <TryCard
              intro="Kare kenarını seç ve tarlayı döşe. Artmadan oturan kenarlar yeşil listeye eklenir."
              controls={
                <>
                  <Slider value={s} onChange={setS} min={1} max={H} format={(v) => `${v} m`} label="Kare kenarı" dark />
                  <RunButton running={T.run.running} onRun={() => T.simulate(s, 0.9)} onSkip={T.run.skip}>Tarlayı döşe</RunButton>
                </>
              }
              found={T.found}
              foundLabel="Artmadan oturan kare kenarları"
              format={(v) => `${v} m`}
              canClaim={T.canClaim}
              claimLabel="En büyük kare bu!"
              onClaim={() => T.claim(sh!, `${sh} m’lik kareler oturdu ama daha büyüğü de olabilir. Yeşil listedeki her kenar hem ${acc(W)} hem ${acc(H)} bölüyor. İkisini birden bölen daha büyük bir sayı var mı?`)}
              wrong={T.wrong}
            />
          )}
          {T.phase === 'count' && (
            <CountPanel
              question={`${T.g} m’lik kare parsellerden kaç tane oluşur?`}
              answer={n}
              chk={T.chk}
              hint={`Uzun kenar boyunca kaç parsel sığıyor (${W} ÷ ${T.g})? Kısa kenar boyunca kaç? Satır ve sütun sayısını nasıl birleştirirsin?`}
              onDone={() => {
                const first = T.chk.pass()
                T.setPhase('done')
                onSolved({ emoji: '🌾', title: 'Tarlayı kare parsellere böl', a: W, b: H, answer: T.g, text: `${T.g} m’lik ${n} kare parsel` }, first)
              }}
            />
          )}
          {T.phase === 'done' && <DonePanel text={`${T.g} m, hem ${acc(W)} hem ${acc(H)} bölen en büyük sayı. Tarla ${W / T.g} × ${H / T.g} = ${n} parsele bölündü.`} prediction={T.pred} answer={T.g} format={(v) => `${v} m`} strategies={EBOB_STRATEGIES} footer={footer} />}
        </>
      }
    />
  )
}

/* ───────────── b. Kurdele ───────────── */

export function Kurdele({ A, B, onSolved, footer }: { A: number; B: number } & ScenarioProps) {
  const T = useTry(A, B)
  const [s, setS] = useState(7)
  const sh = T.shown
  const u = 540 / B
  const ox = 20
  const total = A / T.g + B / T.g
  const rib = (L: number, y: number, color: string) => {
    const k = sh ? Math.floor(L / sh) : 0
    const cuts = sh ? Array.from({ length: k }, (_, i) => (i + 1) * sh).filter((x) => x < L) : []
    const maxCuts = sh ? Math.max(Math.floor(A / sh), Math.floor(B / sh)) : 1
    const vis = cuts.filter((_, i) => i + 1 <= T.run.t * maxCuts)
    const left = sh && !T.run.running ? L % sh : 0
    const last = vis.length ? vis[vis.length - 1] : 0
    return (
      <g>
        <text x={ox} y={y - 10} fontSize={15} fontWeight={900} fill="#e2e8f0">{L} cm</text>
        <rect x={ox} y={y} width={L * u} height={30} rx={6} fill={color} />
        {left > 0 && <rect x={ox + (L - left) * u} y={y} width={left * u} height={30} rx={4} fill={RED} stroke="#fff" strokeDasharray="4 3" strokeWidth={2} />}
        {left > 0 && <text x={ox + (L - left / 2) * u} y={y + 50} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fca5a5">artık {left} cm</text>}
        {vis.map((x) => <line key={x} x1={ox + x * u} x2={ox + x * u} y1={y - 4} y2={y + 34} stroke="#0f172a" strokeWidth={3} />)}
        {T.run.running && vis.length > 0 && <text x={ox + last * u} y={y - 6} textAnchor="middle" fontSize={22}>✂️</text>}
        {sh && !T.run.running && <text x={ox + L * u + 8 > 560 ? ox + L * u - 4 : ox + L * u + 8} y={y + 20} textAnchor={ox + L * u + 8 > 560 ? 'end' : 'start'} fontSize={13} fontWeight={900} fill="#fff">{Math.floor(L / sh)} parça</text>}
      </g>
    )
  }
  const status = (() => {
    if (T.phase === 'predict') return <Status ok={null}>Kurdeleler {A} cm ve {B} cm. Önce tahminini kaydet.</Status>
    if (!sh) return <Status ok={null}>Bir parça uzunluğu seç ve kurdeleleri kes.</Status>
    if (T.run.running) return <Status ok={null}>{sh} cm’lik parçalar kesiliyor…</Status>
    if (T.fits(sh)) return <Status ok>Hiç artık yok! {A} ÷ {sh} = {A / sh} parça, {B} ÷ {sh} = {B / sh} parça.</Status>
    const parts = [A % sh ? `${A} cm’lik kurdeleden ${A % sh} cm` : '', B % sh ? `${B} cm’lik kurdeleden ${B % sh} cm` : ''].filter(Boolean)
    return <Status ok={false}>{sh} cm olmadı: {parts.join(', ')} artık kaldı.</Status>
  })()
  return (
    <Layout
      phase={T.phase}
      problem={<>{A} cm ve {B} cm uzunluğundaki iki kurdele, hiç artık kalmadan <b>eş uzunlukta ve olabildiğince uzun</b> parçalara kesilecek.</>}
      status={status}
      work={
        <svg viewBox="0 0 600 210" className="w-full" role="img" aria-label="Kurdeleler">
          {rib(A, 44, '#a855f7')}
          {rib(B, 140, '#ec4899')}
        </svg>
      }
      panel={
        <>
          {T.phase === 'predict' && <PredictPanel question="Bir parça en çok kaç santimetre olabilir?" unit="cm" onSave={T.save} />}
          {T.phase === 'try' && (
            <TryCard
              intro="Parça uzunluğunu seç ve iki kurdeleyi de kes. Artık kalmayan uzunluklar yeşil listeye eklenir."
              controls={
                <>
                  <Slider value={s} onChange={setS} min={1} max={A} format={(v) => `${v} cm`} label="Parça uzunluğu" dark />
                  <RunButton running={T.run.running} onRun={() => T.simulate(s, 1.1)} onSkip={T.run.skip}>Kurdeleleri kes</RunButton>
                </>
              }
              found={T.found}
              foundLabel="Artık bırakmayan parça uzunlukları"
              format={(v) => `${v} cm`}
              canClaim={T.canClaim}
              claimLabel="En uzun parça bu!"
              onClaim={() => T.claim(sh!, `${sh} cm artık bırakmadı ama parçalar daha uzun da olabilir. Hem ${acc(A)} hem ${acc(B)} bölen daha büyük bir sayı dene.`)}
              wrong={T.wrong}
            />
          )}
          {T.phase === 'count' && (
            <CountPanel
              question={`${T.g} cm’lik parçalardan toplam kaç tane elde edilir?`}
              answer={total}
              chk={T.chk}
              hint={`Her kurdeleyi ayrı düşün: ${A} cm’de kaç tane ${T.g} cm var? ${B} cm’de kaç tane? Sonra ikisini birleştir.`}
              onDone={() => {
                const first = T.chk.pass()
                T.setPhase('done')
                onSolved({ emoji: '🎀', title: 'Kurdeleleri artıksız kes', a: A, b: B, answer: T.g, text: `${T.g} cm’lik ${total} parça` }, first)
              }}
            />
          )}
          {T.phase === 'done' && <DonePanel text={`${T.g} cm, hem ${acc(A)} hem ${acc(B)} bölen en büyük sayı. ${A / T.g} + ${B / T.g} = ${total} parça kurdele oldu.`} prediction={T.pred} answer={T.g} format={(v) => `${v} cm`} strategies={EBOB_STRATEGIES} footer={footer} />}
        </>
      }
    />
  )
}

/* ───────────── c. Paketleme ───────────── */

export function Paket({ A, B, onSolved, footer }: { A: number; B: number } & ScenarioProps) {
  const T = useTry(A, B)
  const [p, setP] = useState(5)
  const sh = T.shown
  const per = A / T.g + B / T.g
  const vis = sh ? Math.ceil(T.run.t * sh) : 0
  const status = (() => {
    if (T.phase === 'predict') return <Status ok={null}>{A} elma ve {B} armut var. Önce tahminini kaydet.</Status>
    if (!sh) return <Status ok={null}>Paket sayısını seç ve meyveleri dağıt.</Status>
    if (T.run.running) return <Status ok={null}>Meyveler {sh} pakete dağıtılıyor…</Status>
    if (T.fits(sh)) return <Status ok>Hiç meyve artmadı! Her pakette {ek(A / sh, 'dist')} elma ve {ek(B / sh, 'dist')} armut var.</Status>
    return <Status ok={false}>{sh} paket olmadı: {[A % sh ? `${A % sh} elma` : '', B % sh ? `${B % sh} armut` : ''].filter(Boolean).join(' ve ')} arttı.</Status>
  })()
  return (
    <Layout
      phase={T.phase}
      problem={<>{A} elma ve {B} armut, her pakette eşit sayıda elma ve eşit sayıda armut olacak şekilde, hiç meyve artmadan paketlenecek. <b>En çok kaç paket</b> hazırlanabilir?</>}
      status={status}
      work={
        <div className="flex min-h-56 flex-col gap-2 p-1">
          {!sh ? (
            <div className="grid flex-1 place-items-center rounded-2xl bg-slate-800/70 p-4 text-center text-slate-200">
              <p className="text-3xl" aria-hidden>🍎 × {A}</p>
              <p className="text-3xl" aria-hidden>🍐 × {B}</p>
              <p className="mt-2 text-sm font-bold">Meyveler kasada paketlenmeyi bekliyor.</p>
            </div>
          ) : (
            <>
              <div className={`grid gap-1.5 ${sh > 12 ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-4'}`}>
                {Array.from({ length: vis }, (_, i) => (
                  <div key={i} className="rounded-xl bg-amber-100 px-1.5 py-1 text-center text-amber-950 ring-2 ring-amber-700/60 animate-pop">
                    <p className="text-[10px] font-black text-amber-800">📦 {i + 1}</p>
                    <p className={`font-black ${sh > 12 ? 'text-xs' : 'text-sm'}`}>🍎{Math.floor(A / sh)} 🍐{Math.floor(B / sh)}</p>
                  </div>
                ))}
              </div>
              {!T.run.running && (A % sh > 0 || B % sh > 0) && (
                <div className="rounded-xl bg-rose-500/25 px-3 py-2 text-center font-black text-rose-100 border-2 border-dashed border-rose-400">
                  Artan: {A % sh > 0 && <>🍎 {A % sh} </>}{B % sh > 0 && <>🍐 {B % sh}</>}
                </div>
              )}
            </>
          )}
        </div>
      }
      panel={
        <>
          {T.phase === 'predict' && <PredictPanel question="En çok kaç paket hazırlanabilir?" unit="paket" onSave={T.save} />}
          {T.phase === 'try' && (
            <TryCard
              intro="Paket sayısını seç ve meyveleri dağıt. Hiç meyve artmayan paket sayıları yeşil listeye eklenir."
              controls={
                <>
                  <Slider value={p} onChange={setP} min={1} max={24} label="Paket sayısı" dark />
                  <RunButton running={T.run.running} onRun={() => T.simulate(p, 0.8)} onSkip={T.run.skip}>Meyveleri dağıt</RunButton>
                </>
              }
              found={T.found}
              foundLabel="Meyve artmayan paket sayıları"
              canClaim={T.canClaim}
              claimLabel="En çok paket bu!"
              onClaim={() => T.claim(sh!, `${sh} pakette meyve artmadı ama daha çok paket de olabilir. Paket sayısı hem ${acc(A)} hem ${acc(B)} bölmeli; daha büyük bir ortak bölen var mı?`)}
              wrong={T.wrong}
            />
          )}
          {T.phase === 'count' && (
            <CountPanel
              question={`${T.g} paketin her birinde toplam kaç meyve olur?`}
              answer={per}
              unit="meyve"
              chk={T.chk}
              hint={`Bir pakete kaç elma düşüyor (${A} ÷ ${T.g})? Kaç armut? İkisini topla.`}
              onDone={() => {
                const first = T.chk.pass()
                T.setPhase('done')
                onSolved({ emoji: '📦', title: 'Meyveleri eş paketle', a: A, b: B, answer: T.g, text: `${T.g} paket, her birinde ${per} meyve` }, first)
              }}
            />
          )}
          {T.phase === 'done' && <DonePanel text={`${T.g} paket: ${T.g}, hem ${acc(A)} hem ${acc(B)} bölen en büyük sayı. Her pakette ${A / T.g} elma + ${B / T.g} armut = ${per} meyve var.`} prediction={T.pred} answer={T.g} strategies={EBOB_STRATEGIES} footer={footer} />}
        </>
      }
    />
  )
}

/* ───────────── d. Ağaç dikme ───────────── */

export function Agac({ W, H, onSolved, footer }: { W: number; H: number } & ScenarioProps) {
  const T = useTry(W, H)
  const [s, setS] = useState(4)
  const sh = T.shown
  const P = 2 * (W + H)
  const u = Math.min(500 / W, 230 / H)
  const ox = 50, oy = 40
  const at = (d: number): [number, number] => {
    if (d <= W) return [d, 0]
    if (d <= W + H) return [W, d - W]
    if (d <= 2 * W + H) return [W - (d - W - H), H]
    return [0, H - (d - 2 * W - H)]
  }
  const xy = (d: number) => {
    const [x, y] = at(d)
    return [ox + x * u, oy + y * u] as const
  }
  const n = sh ? Math.ceil(P / sh) : 0
  const vis = Math.ceil(T.run.t * n)
  const corners = [0, W, W + H, 2 * W + H]
  const missing = sh && !T.run.running ? corners.filter((c) => c % sh !== 0) : []
  const trees = P / T.g
  const status = (() => {
    if (T.phase === 'predict') return <Status ok={null}>Bahçe {W} m × {H} m. Önce tahminini kaydet.</Status>
    if (!sh) return <Status ok={null}>Ağaçlar arasındaki aralığı seç ve dikmeye başla.</Status>
    if (T.run.running) return <Status ok={null}>{sh} m arayla ağaçlar dikiliyor…</Status>
    if (T.fits(sh)) return <Status ok>Dört köşeye de ağaç geldi! {P} ÷ {sh} = {P / sh} ağaç.</Status>
    return <Status ok={false}>{sh} m olmadı: {missing.length} köşede ağaç yok (kırmızı halkalar).</Status>
  })()
  return (
    <Layout
      phase={T.phase}
      problem={<>Kenarları {W} m ve {H} m olan dikdörtgen bir bahçenin çevresine, <b>köşelere de</b> gelecek şekilde eşit aralıklarla ağaç dikilecek. <b>En az</b> kaç ağaç gerekir?</>}
      status={status}
      work={
        <svg viewBox={`0 0 ${W * u + ox * 2} ${H * u + oy * 2}`} className="w-full" role="img" aria-label="Bahçe">
          <rect x={ox} y={oy} width={W * u} height={H * u} fill="#166534" fillOpacity={0.45} stroke="#86efac" strokeWidth={3} strokeDasharray="8 5" rx={2} />
          <text x={ox + (W * u) / 2} y={oy - 16} textAnchor="middle" fontSize={16} fontWeight={900} fill="#bbf7d0">{W} m</text>
          <text x={ox - 22} y={oy + (H * u) / 2} textAnchor="middle" fontSize={16} fontWeight={900} fill="#bbf7d0" transform={`rotate(-90 ${ox - 22} ${oy + (H * u) / 2})`}>{H} m</text>
          {missing.map((c) => {
            const [x, y] = xy(c)
            return <circle key={c} cx={x} cy={y} r={14} fill="none" stroke={RED} strokeWidth={4} className="animate-pop" />
          })}
          {Array.from({ length: Math.min(vis, n) }, (_, i) => {
            const [x, y] = xy(i * sh!)
            return n <= 48 ? (
              <text key={i} x={x} y={y + 7} textAnchor="middle" fontSize={20}>🌳</text>
            ) : (
              <circle key={i} cx={x} cy={y} r={4.5} fill={GREEN} stroke="#052e16" />
            )
          })}
        </svg>
      }
      panel={
        <>
          {T.phase === 'predict' && <PredictPanel question="En az kaç ağaç gerekir?" unit="ağaç" onSave={T.save} />}
          {T.phase === 'try' && (
            <TryCard
              intro="Aralığı seç ve ağaçları dik. Dört köşeye de ağaç getiren aralıklar yeşil listeye eklenir."
              controls={
                <>
                  <Slider value={s} onChange={setS} min={1} max={H} format={(v) => `${v} m`} label="Ağaç aralığı" dark />
                  <RunButton running={T.run.running} onRun={() => T.simulate(s, 1.1)} onSkip={T.run.skip}>Ağaçları dik</RunButton>
                </>
              }
              found={T.found}
              foundLabel="Köşelere uyan aralıklar"
              format={(v) => `${v} m`}
              canClaim={T.canClaim}
              claimLabel="En az ağaç bu aralıkla!"
              onClaim={() => T.claim(sh!, `Aralık büyüdükçe ağaç sayısı azalır. ${sh} m köşelere uydu; hem ${acc(W)} hem ${acc(H)} bölen daha büyük bir aralık var mı?`)}
              wrong={T.wrong}
            />
          )}
          {T.phase === 'count' && (
            <CountPanel
              question={`Ağaçlar ${T.g} m arayla dikilirse toplam kaç ağaç gerekir?`}
              answer={trees}
              unit="ağaç"
              chk={T.chk}
              hint="Bahçenin çevresi kaç metre? Kapalı bir çizgide ağaç sayısı aralık sayısına eşittir; köşe ağaçlarını iki kez sayma."
              onDone={() => {
                const first = T.chk.pass()
                T.setPhase('done')
                onSolved({ emoji: '🌳', title: 'Bahçeye eşit aralıkla ağaç', a: W, b: H, answer: T.g, text: `${T.g} m arayla ${trees} ağaç` }, first)
              }}
            />
          )}
          {T.phase === 'done' && <DonePanel text={`Aralık ${T.g} m: hem ${acc(W)} hem ${acc(H)} bölen en büyük sayı. Çevre ${P} m, ${P} ÷ ${T.g} = ${trees} ağaç.`} prediction={T.pred} answer={trees} format={(v) => `${v} ağaç`} strategies={EBOB_STRATEGIES} footer={footer} />}
        </>
      }
    />
  )
}
