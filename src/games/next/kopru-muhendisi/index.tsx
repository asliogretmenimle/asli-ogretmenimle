import { useState } from 'react'
import { Check, Ruler } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Scene, StrategyPicker, TaskCard } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'

const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]] as const

export default function KopruMuhendisi({ grade, onFinish }: GameProps) {
  const track = useTracker()
  const [index, setIndex] = useState(0)
  const [span, height, cable] = triples[index]
  const [run, setRun] = useState(Math.max(1, span - 2))
  const [rise, setRise] = useState(Math.max(1, height - 2))
  const [tries, setTries] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [complete, setComplete] = useState(false)
  const [message, setMessage] = useState('')
  const measured = Math.sqrt(run * run + rise * rise)

  const check = () => {
    setTries((n) => n + 1)
    if (run !== span || rise !== height) {
      track.attempt(false)
      setMistakes((n) => n + 1)
      setMessage(`Köprü açıklığı ${span} birim, kule yüksekliği ${height} birim. Bu iki kenarla çapraz kirişin uzunluğunu nasıl tahmin edersin?`)
      return
    }
    track.attempt(true)
    track.item(tries === 0)
    setComplete(true)
    setMessage(`Ölçüler uyuştu: ${span}² + ${height}² = ${cable}². Çapraz kirişi ${cable} birim.`)
  }
  const next = () => {
    if (index === triples.length - 1) {
      onFinish({ stars: starsFor(triples.length / (triples.length + mistakes)), score: triples.length * 100, summary: `${triples.length} köprü açıklığını ölçülerle tamamladın.`, insight: 'Dik üçgende yatay ve düşey kenarların kareleri toplamı çapraz kirişin karesini verir.' })
      return
    }
    setIndex((i) => i + 1)
    setRun(1)
    setRise(1)
    setTries(0)
    setComplete(false)
    setMessage('')
  }

  return (
    <Scene grade={grade}>
      <header className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2 text-lg font-black text-ink"><Ruler className="text-slate-600" />Köprü {index + 1}/{triples.length}</span><LevelDots current={index} total={triples.length} /></header>
      <TaskCard step={index + 1} total={triples.length}>Nehir {span} birim genişliğinde. Kule {height} birim yüksek. Çapraz kirişi ölçüp köprüyü güvenle tamamla.</TaskCard>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
          <svg viewBox="0 0 360 230" role="img" aria-label="Köprünün yan görünüşü" className="h-auto w-full">
            <path d="M25 195H335" stroke="#64748b" strokeWidth="5" />
            <path d={`M70 195H${70 + run * 15}V${195 - rise * 15}`} fill="none" stroke="#0284c7" strokeWidth="7" strokeLinejoin="round" />
            <path d={`M70 195L${70 + run * 15} ${195 - rise * 15}`} stroke="#f59e0b" strokeWidth="5" strokeDasharray={complete ? '0' : '7 5'} />
            <text x="70" y="218" fontSize="13">0</text><text x={70 + run * 7.5} y="218" fontSize="13">açıklık {run}</text>
            <text x={76 + run * 15} y={195 - rise * 7.5} fontSize="13">yükseklik {rise}</text>
            <text x={85 + run * 7.5} y={190 - rise * 7.5} fontSize="13" fill="#b45309">kiriş ≈ {measured.toFixed(1)}</text>
          </svg>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
          <Measure label="Açıklık" value={run} max={span} onChange={setRun} />
          <Measure label="Kule" value={rise} max={height} onChange={setRise} />
          <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-ink">Çapraz kiriş: √({run}² + {rise}²) ≈ {measured.toFixed(1)} birim</p>
          {!complete ? <BigButton onClick={check} className="w-full"><Check size={18} />Ölçüyü denetle</BigButton> : <BigButton onClick={next} className="w-full">{index === triples.length - 1 ? 'Köprüleri tamamla' : 'Sonraki köprü'}</BigButton>}
          {message && <p className={`rounded-xl p-3 text-sm font-bold ${complete ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`} aria-live="polite">{message}</p>}
          {complete && <StrategyPicker options={grade < 7 ? ['Kareleri karşılaştırdım', 'Üçgen kenarlarını ölçtüm'] : ['Pisagor bağıntısını kullandım', 'Önce tahmin ettim, sonra denetledim']} onPick={() => undefined} />}
        </div>
      </div>
    </Scene>
  )
}

function Measure({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return <label className="flex items-center justify-between gap-2 text-sm font-black text-ink">{label}<input type="range" min="1" max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-36 accent-sky-600" /><span>{value}</span></label>
}
