import { useState } from 'react'
import { Check, Route } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Scene, StrategyPicker, TaskCard } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'

const distances = [120, 180, 240, 300]
const speeds = [30, 40, 60, 80, 100]

export default function TrafikSimulatoru({ grade, onFinish }: GameProps) {
  const track = useTracker()
  const [index, setIndex] = useState(0)
  const [speed, setSpeed] = useState(40)
  const [hours, setHours] = useState(2)
  const [tries, setTries] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [done, setDone] = useState(false)
  const [message, setMessage] = useState('')
  const target = distances[index]
  const distance = speed * hours
  const check = () => {
    setTries((n) => n + 1)
    if (distance !== target) {
      track.attempt(false)
      setMistakes((n) => n + 1)
      setMessage(`${speed} km/sa × ${hours} sa = ${distance} km. Hedef ${target} km; hız ya da süreyi değiştir.`)
      return
    }
    track.attempt(true)
    track.item(tries === 0)
    setDone(true)
    setMessage(`Modelin hedefe ulaştı: ${speed} km/sa × ${hours} sa = ${target} km.`)
  }
  const next = () => {
    if (index === distances.length - 1) {
      onFinish({ stars: starsFor(distances.length / (distances.length + mistakes)), score: distances.length * 100, summary: `${distances.length} yolculuğu grafikle modelledin.`, insight: 'Sabit hızda yol-zaman grafiğinin eğimi hızı gösterir; aynı hedefe farklı hız ve süre çiftleriyle ulaşılabilir.' })
      return
    }
    setIndex((i) => i + 1)
    setSpeed(40)
    setHours(2)
    setTries(0)
    setDone(false)
    setMessage('')
  }
  const maxHours = Math.max(4, Math.ceil(target / 20))
  return (
    <Scene grade={grade}>
      <header className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2 text-lg font-black text-ink"><Route className="text-emerald-700" />Sefer {index + 1}/{distances.length}</span><LevelDots current={index} total={distances.length} /></header>
      <TaskCard step={index + 1} total={distances.length}>Aracın {target} km yol almalı. Hızını ve yolculuk süresini seç; yol-zaman grafiğini kur.</TaskCard>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <svg viewBox="0 0 360 230" role="img" aria-label={`Yol-zaman grafiği, hız ${speed} kilometre/saat`} className="h-auto w-full">
            <path d="M45 15V190H340" fill="none" stroke="#475569" strokeWidth="3" />
            <text x="8" y="24" fontSize="12">yol (km)</text><text x="280" y="218" fontSize="12">zaman (sa)</text>
            {[0, 1, 2, 3, 4].map((n) => <g key={n}><path d={`M${45 + n * 68} 190V194`} stroke="#64748b" /><text x={42 + n * 68} y="210" fontSize="11">{n}</text><path d={`M41 ${190 - n * 40}H45`} stroke="#64748b" /><text x="12" y={194 - n * 40} fontSize="11">{n * 100}</text></g>)}
            <path d={`M45 190L${Math.min(340, 45 + hours * 68)} ${Math.max(20, 190 - distance * 0.4)}`} stroke="#059669" strokeWidth="5" />
            <circle cx={Math.min(340, 45 + hours * 68)} cy={Math.max(20, 190 - distance * 0.4)} r="7" fill="#f59e0b" />
          </svg>
        </section>
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
          <label className="text-sm font-black text-ink">Hız: {speed} km/sa<select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="mt-2 min-h-12 w-full rounded-xl bg-paper px-3">{speeds.map((v) => <option key={v} value={v}>{v} km/sa</option>)}</select></label>
          <label className="text-sm font-black text-ink">Süre: {hours} saat<input type="range" min="1" max={maxHours} value={Math.min(hours, maxHours)} onChange={(e) => setHours(Number(e.target.value))} className="mt-2 w-full accent-emerald-600" /></label>
          <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">Model: yol = hız × zaman = {speed} × {hours} = {distance} km</p>
          {!done ? <BigButton onClick={check} className="w-full"><Check size={18} />Yolculuğu denetle</BigButton> : <BigButton onClick={next} className="w-full">{index === distances.length - 1 ? 'Simülasyonu bitir' : 'Sonraki sefer'}</BigButton>}
          {message && <p className={`rounded-xl p-3 text-sm font-bold ${done ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`} aria-live="polite">{message}</p>}
          {done && <StrategyPicker options={grade < 8 ? ['Tablodan çarptım', 'Grafiğin eğimini karşılaştırdım'] : ['Eğim hızdır', 'Önce tahmin ettim']} onPick={() => undefined} />}
        </div>
      </div>
    </Scene>
  )
}
