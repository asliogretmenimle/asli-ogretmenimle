/**
 * LiveBuild için deneme sahnesi: gerçek akış olmadan, örnek bir oyunun HTML'ini / test sorularını
 * karakter karakter "akıtır". Geliştirirken ve ekran görüntüsü alırken kullanılır; sitede bağlı değildir.
 */
import { useEffect, useRef, useState } from 'react'
import type { StudioKind } from './model'
import { emptyLive, type LiveState } from './stream'
import { LiveBuild } from './LiveBuild'

const SAMPLE_HTML = `<!doctype html><html lang="tr"><head><style>
*{box-sizing:border-box}html,body{height:100%;margin:0}
body{font-family:Nunito,sans-serif;background:#fff7ef;color:#1e2433;display:flex;flex-direction:column;gap:14px;padding:18px}
.top{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #e6e8ee;border-radius:18px;padding:12px 16px}
.score{font-weight:900;color:#d6457a;font-size:20px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.card{background:#fff;border:1px solid #e6e8ee;border-radius:18px;padding:16px;text-align:center;font-weight:800;font-size:26px}
.board{flex:1;min-height:160px;background:#fff;border:1px solid #e6e8ee;border-radius:22px;display:grid;place-items:center}
.line{display:flex;gap:6px}.dot{width:34px;height:34px;border-radius:10px;background:#fdeef3;border:2px solid #d6457a}
.btns{display:flex;gap:10px;justify-content:center}
button{font:inherit;font-weight:800;border:0;border-radius:14px;padding:14px 22px;background:#d6457a;color:#fff;font-size:17px}
button.ghost{background:#fff;color:#1e2433;border:1px solid #e6e8ee}
</style></head><body>
<div class="top"><h2 style="margin:0">🎯 Onluk Avcısı</h2><span class="score">Puan: 0</span></div>
<p style="margin:0;font-weight:700;color:#5d6475">Toplamı 10 eden iki kartı bul. Tur 1 / 8</p>
<div class="cards"><div class="card">7</div><div class="card">3</div><div class="card">6</div></div>
<div class="board"><div class="line"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>
<div class="btns"><button>Kontrol et</button><button class="ghost">İpucu</button></div>
<script>let puan=0;document.querySelector('button').onclick=()=>{puan+=10}</script>
</body></html>`

const SAMPLE_QUIZ = {
  instructions: 'Doğru cevabı seç.',
  questions: [
    { prompt: '7 + 5 = ?', choices: ['12', '11', '13', '2'], answer: 0, explain: '7 + 3 = 10, 10 + 2 = 12' },
    { prompt: '[[1/2]] + [[1/4]] = ?', choices: ['[[3/4]]', '[[2/6]]', '[[1/6]]', '1'], answer: 0, explain: 'İki çeyrek bir yarım eder.' },
    { prompt: '9 × 6 = ?', choices: ['54', '56', '45', '63'], answer: 0, explain: '10 × 6 = 60, 60 − 6 = 54' },
  ],
}

const THOUGHTS = [
  '2. sınıf için 10’a tamamlamayı somut kartlarla başlatmak iyi olur.',
  'Sayı aralığını 1–9 tutuyorum; çeldiriciler 9’a ve 11’e tamamlayan çiftler olsun.',
  'Puan, tur göstergesi ve ipucu düğmesi ekliyorum. Telefonda büyük düğmeler.',
]

type Mode = 'game' | 'test' | 'edit'

export function LiveBuildDemo() {
  const [mode, setMode] = useState<Mode>('game')
  const [device, setDevice] = useState<'phone' | 'tablet' | 'wide'>('wide')
  const [run, setRun] = useState(0)
  const [live, setLive] = useState<LiveState>(emptyLive)
  const [elapsed, setElapsed] = useState(0)
  const t0 = useRef(0)

  useEffect(() => {
    t0.current = performance.now()
    let state = emptyLive()
    setLive(state)
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const tick = window.setInterval(() => setElapsed((performance.now() - t0.current) / 1000), 250)
    at(500, () => setLive((state = { ...state, phase: 'thinking' })))
    THOUGHTS.forEach((th, i) => at(1400 + i * 1800, () => setLive((state = { ...state, thoughts: [...state.thoughts, th] }))))
    at(3000, () => setLive((state = { ...state, meta: { title: 'Onluk', emoji: '🎯' } })))
    at(3600, () => setLive((state = { ...state, meta: { title: 'Onluk Avcısı', emoji: '🎯', description: 'Toplamı 10 yapan çiftleri bul.' } })))
    const start = 6600
    if (mode === 'game') {
      const step = 14
      for (let i = step; i <= SAMPLE_HTML.length + step; i += step) at(start + (i / step) * 45, () => setLive((state = { ...state, phase: 'writing', html: SAMPLE_HTML.slice(0, i), chars: 900 + i })))
      at(start + (SAMPLE_HTML.length / step) * 45 + 600, () => setLive((state = { ...state, phase: 'done' })))
    } else if (mode === 'test') {
      let t = start
      SAMPLE_QUIZ.questions.forEach((q, qi) => {
        const qs = () => state.quiz?.questions ?? []
        for (let c = 2; c <= q.prompt.length; c += 2) at((t += 40), () => setLive((state = { ...state, phase: 'writing', quiz: { instructions: SAMPLE_QUIZ.instructions, questions: [...qs().slice(0, qi), { prompt: q.prompt.slice(0, c) }] }, chars: state.chars + 2 })))
        q.choices.forEach((_, ci) => at((t += 380), () => setLive((state = { ...state, quiz: { ...state.quiz, questions: [...qs().slice(0, qi), { prompt: q.prompt, choices: q.choices.slice(0, ci + 1) }] }, chars: state.chars + 12 }))))
        at((t += 400), () => setLive((state = { ...state, quiz: { ...state.quiz, questions: [...qs().slice(0, qi), { ...q }] }, chars: state.chars + 40 })))
      })
      at(t + 800, () => setLive((state = { ...state, phase: 'done' })))
    } else {
      at(start, () => setLive((state = { ...state, phase: 'writing', edits: [{ find: 'background:#fff7ef' }] })))
      at(start + 1400, () => setLive((state = { ...state, edits: [{ find: 'background:#fff7ef', replace: 'background:#dbeafe' }] })))
      at(start + 3200, () => setLive((state = { ...state, edits: [...(state.edits ?? []), { find: 'Kontrol et', replace: 'Cevabımı kontrol et' }] })))
      at(start + 5200, () => setLive((state = { ...state, edits: [...(state.edits ?? []), { find: '<div class="card">7</div>', replace: '<div class="card">8</div>' }] })))
      at(start + 7600, () => setLive((state = { ...state, phase: 'done' })))
    }
    return () => {
      timers.forEach(clearTimeout)
      clearInterval(tick)
    }
  }, [mode, run])

  const kind: StudioKind = mode === 'test' ? 'test' : 'game'
  return (
    <div className="flex h-dvh flex-col bg-paper">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white p-2 text-sm font-bold">
        {(['game', 'test', 'edit'] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => (setMode(m), setRun((x) => x + 1))} className={`rounded-lg px-3 py-1.5 ring-1 ring-line ${mode === m ? 'bg-ink text-white' : ''}`}>
            {m === 'game' ? 'Oyun' : m === 'test' ? 'Test' : 'Düzenleme'}
          </button>
        ))}
        {(['phone', 'tablet', 'wide'] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDevice(d)} className={`rounded-lg px-3 py-1.5 ring-1 ring-line ${device === d ? 'bg-brand text-white' : ''}`}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => setRun((x) => x + 1)} className="rounded-lg px-3 py-1.5 ring-1 ring-line">
          Yeniden
        </button>
      </div>
      <LiveBuild key={`${mode}-${run}`} kind={kind} live={live} baseHtml={mode === 'edit' ? SAMPLE_HTML : null} elapsed={elapsed} device={device} className="min-h-0 flex-1" />
    </div>
  )
}
