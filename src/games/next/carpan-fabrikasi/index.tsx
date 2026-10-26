import { useMemo, useState } from 'react'
import { Check, Factory, Lightbulb } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { BigButton, LevelDots, Scene, StrategyPicker, TaskCard } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'

const targets: Record<number, number[]> = {
  5: [12, 18, 24, 36],
  6: [42, 48, 60, 72],
}

export default function CarpanFabrikasi({ grade, onFinish }: GameProps) {
  const levels = useMemo(() => targets[grade] ?? targets[5], [grade])
  const track = useTracker()
  const [index, setIndex] = useState(0)
  const [rows, setRows] = useState(1)
  const [columns, setColumns] = useState(1)
  const [solutions, setSolutions] = useState<string[]>([])
  const [tries, setTries] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [note, setNote] = useState('')
  const target = levels[index]
  const found = rows * columns === target

  const submit = () => {
    if (confirmed) return
    setTries((n) => n + 1)
    if (!found) {
      track.attempt(false)
      setMistakes((n) => n + 1)
      setNote(`${rows} sıra × ${columns} sütun = ${rows * columns}. Hedef ${target}; dizilimi nasıl değiştirebilirsin?`)
      return
    }
    track.attempt(true)
    track.item(tries === 0)
    setConfirmed(true)
    const key = [rows, columns].sort((a, b) => a - b).join('×')
    if (!solutions.includes(key)) {
      setSolutions((s) => [...s, key])
      track.solutions(solutions.length + 1)
    }
    setNote(`Tam ${target}! ${rows} sıra ve ${columns} sütun aynı dikdörtgeni kurdu.`)
  }

  const next = () => {
    if (index + 1 < levels.length) {
      setIndex((n) => n + 1)
      setRows(1)
      setColumns(1)
      setTries(0)
      setConfirmed(false)
      setNote('')
      return
    }
    onFinish({
      stars: starsFor(levels.length / (levels.length + mistakes)),
      score: solutions.length * 100,
      summary: `${levels.length} üretim hedefi kurdun ve ${solutions.length} farklı çarpan dizilimi keşfettin.`,
      insight: 'Bir çarpımı dikdörtgen dizilim olarak kurabiliriz; satır ve sütunların yerini değiştirince aynı çarpımın başka bir çarpan çifti görünür.',
    })
  }

  return (
    <Scene grade={grade}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="grid size-11 place-items-center rounded-2xl bg-amber-600 text-white"><Factory /></span><div><p className="text-xs font-black uppercase text-amber-800">Üretim hedefi</p><p className="text-xl font-black text-ink">{target} parça</p></div></div>
        <LevelDots current={index} total={levels.length} />
      </header>
      <TaskCard step={index + 1} total={levels.length}>Hedef sayıda parçayı eş sıralı bir dikdörtgen olarak diz. Satır ve sütun sayıları hangi çarpanları gösteriyor?</TaskCard>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-line" aria-label="Parça dizilimi">
          <div className="mx-auto grid max-w-md gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(columns, 12)}, minmax(0, 1fr))` }}>
            {Array.from({ length: Math.min(rows * columns, 144) }, (_, i) => <span key={i} className="aspect-square rounded-md bg-amber-400 ring-1 ring-amber-600/30" />)}
          </div>
          <p className="mt-3 text-center text-lg font-black text-ink">{rows} × {columns} = {rows * columns}</p>
        </section>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <NumberPicker label="Satır" value={rows} onChange={(v) => { setRows(v); setConfirmed(false) }} />
            <NumberPicker label="Sütun" value={columns} onChange={(v) => { setColumns(v); setConfirmed(false) }} />
            <BigButton onClick={submit} disabled={confirmed} className="mt-3 w-full"><Check size={18} />Dizilimi dene</BigButton>
          </div>
          {note && <p className={`rounded-xl p-3 text-sm font-bold ${found ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`} aria-live="polite">{note}</p>}
          {solutions.length > 0 && <p className="rounded-xl bg-sky-50 p-3 text-sm font-bold text-sky-900">Bulduğun çarpan çiftleri: {solutions.join(' · ')}</p>}
          {confirmed && <StrategyPicker options={['Eş gruplar oluşturdum', 'Satırları ve sütunları değiştirdim', 'Çarpan çiftlerini düşündüm']} onPick={() => undefined} />}
          {confirmed && <BigButton onClick={next} variant="ghost" className="w-full">{index + 1 === levels.length ? 'Fabrikayı tamamla' : 'Sonraki hedef'} <Lightbulb size={18} /></BigButton>}
        </div>
      </div>
    </Scene>
  )
}

function NumberPicker({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="mb-3 flex items-center justify-between gap-2 text-sm font-black text-ink">{label}<input type="range" min="1" max="12" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-40 accent-amber-600" /><span className="w-8 text-right text-lg">{value}</span></label>
}
