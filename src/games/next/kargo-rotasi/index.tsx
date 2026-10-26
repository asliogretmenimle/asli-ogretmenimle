import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Truck } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Scene, TaskCard } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'
import { PLACES, ROADS, lengthsFor, neighbors, routeKey, routeLength, shortestPath, type NodeId } from './town'

const stops: NodeId[] = ['C', 'H', 'K', 'P']

export default function KargoRotasi({ grade, onFinish }: GameProps) {
  const track = useTracker()
  const lengths = useMemo(() => lengthsFor(grade), [grade])
  const rules = useMemo(() => ({}), [])
  const [index, setIndex] = useState(0)
  const [route, setRoute] = useState<NodeId[]>(['D'])
  const [message, setMessage] = useState('')
  const [tries, setTries] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [solved, setSolved] = useState(false)
  const target = stops[index]
  const current = route[route.length - 1]
  const length = routeLength(route, lengths)
  const shortest = shortestPath('D', target, lengths, rules)
  const visited = route.includes(target)

  const moveTo = (id: NodeId) => {
    if (solved || visited || !neighbors(current, rules).includes(id)) return
    setRoute((r) => [...r, id])
    setMessage('')
  }
  const check = () => {
    setTries((n) => n + 1)
    if (!visited) {
      track.attempt(false)
      setMistakes((n) => n + 1)
      setMessage(`${PLACES.find((p) => p.id === target)?.name} adresine henüz ulaşmadın. Yol ağında komşu bir sokağa ilerle.`)
      return
    }
    track.attempt(true)
    track.item(tries === 0)
    track.solutions(1)
    setSolved(true)
    setMessage(`Teslimat tamamlandı. Rotan ${length} m; en kısa rota ${shortest.d} m. İki rota arasındaki farkı karşılaştır.`)
  }
  const next = () => {
    if (index === stops.length - 1) {
      onFinish({ stars: starsFor(stops.length / (stops.length + mistakes)), score: stops.length * 100, summary: `${stops.length} teslimatı yol ağında tamamladın.`, insight: 'İki nokta arasında birden fazla yol olabilir; her yolun uzunluğunu toplayıp en uygun rotayı gerekçelendirebiliriz.' })
      return
    }
    setIndex((i) => i + 1)
    setRoute(['D'])
    setMessage('')
    setTries(0)
    setSolved(false)
  }
  return (
    <Scene grade={grade}>
      <header className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2 text-lg font-black text-ink"><Truck className="text-amber-700" />Teslimat {index + 1}/{stops.length}</span><LevelDots current={index} total={stops.length} /></header>
      <TaskCard step={index + 1} total={stops.length}>Kargo Merkezi’nden {PLACES.find((p) => p.id === target)?.dat} ulaş. Sokak uzunluklarını topla; başka bir rota da bulup karşılaştır.</TaskCard>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200">
          <svg viewBox="0 0 480 320" role="img" aria-label="Kasaba yol haritası" className="h-auto w-full">
            {ROADS.map((road) => {
              const a = PLACES.find((p) => p.id === road.a)!, b = PLACES.find((p) => p.id === road.b)!
              const active = route.some((n, i) => i > 0 && ((route[i - 1] === road.a && n === road.b) || (route[i - 1] === road.b && n === road.a)))
              return <g key={`${road.a}-${road.b}`}><path d={`M${a.x * 36} ${280 - a.y * 34}L${b.x * 36} ${280 - b.y * 34}`} stroke={active ? '#f59e0b' : '#94a3b8'} strokeWidth={active ? 7 : 4} strokeLinecap="round" /><text x={(a.x + b.x) * 18} y={280 - (a.y + b.y) * 17 - 5} fontSize="9" textAnchor="middle" fill="#334155">{lengths[`${road.a}-${road.b}`] ?? lengths[`${road.b}-${road.a}`]}m</text></g>
            })}
            {PLACES.map((place) => {
              const x = place.x * 36, y = 280 - place.y * 34
              const selectable = neighbors(current, rules).includes(place.id) && !visited && !solved
              return <g key={place.id} onClick={() => moveTo(place.id)} role={selectable ? 'button' : undefined} aria-label={`${place.name}${selectable ? ', ilerle' : ''}`} className={selectable ? 'cursor-pointer' : ''}>
                <circle cx={x} cy={y} r={place.id === target ? 19 : 15} fill={place.id === target ? '#fda4af' : route.includes(place.id) ? '#fbbf24' : '#fff'} stroke="#334155" strokeWidth="2" />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="16">{place.emoji}</text>
              </g>
            })}
          </svg>
        </section>
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
          <p className="font-black text-ink">Rota: {route.map((id) => PLACES.find((p) => p.id === id)?.name).join(' → ')}</p>
          <p className="text-sm font-bold text-ink-soft">Toplam: {length} m · en kısa: {shortest.d} m</p>
          {!solved ? <div className="flex gap-2"><BigButton variant="ghost" disabled={route.length <= 1} onClick={() => { setRoute((r) => r.slice(0, -1)); setMessage('') }}><ArrowLeft size={18} />Geri al</BigButton><BigButton onClick={check} className="flex-1"><Check size={18} />Teslimatı denetle</BigButton></div> : <BigButton onClick={next} className="w-full">{index === stops.length - 1 ? 'Rotaları tamamla' : 'Sonraki teslimat'}</BigButton>}
          {message && <p className={`rounded-xl p-3 text-sm font-bold ${solved ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`} aria-live="polite">{message}</p>}
          {solved && <p className="rounded-xl bg-sky-50 p-3 text-sm font-bold text-sky-900">Seçtiğin yollar: {routeKey(route).split('|').join(', ')}</p>}
        </div>
      </div>
    </Scene>
  )
}
