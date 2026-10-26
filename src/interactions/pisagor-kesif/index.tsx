import { useMemo, useRef, useState } from 'react'
import type { InteractionProps } from '../types'
import { Scene, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { Header, NextButton, pick, rng, shuffle, type Pt } from '../donusum-studyosu/ortak'
import { ProofTask, SquaresTask } from './kareler'
import { ClassifyTask, ObtuseTask, TriplesTask, type TriItem } from './ucgenler'
import { DistanceTask, MissingTask, type Missing } from './problemler'
import type { Common } from './parca'

/**
 * 57. Pisagor Keşif Alanı (8. sınıf)
 * Formül verilmez; öğrenci dik üçgenin kenarlarına kurulan karelerin alanlarını ölçerek bağıntıyı keşfeder:
 *  1. squares:  dinamik dik üçgen (köşeleri sürükle / iki parmakla ölçekle), eğik kareyi “çevreleyen kare − 4 üçgen” ile say,
 *               3 farklı üçgeni tabloya kaydet → örüntüyü söyle (önce tahmin)
 *  2. proof:    yeniden düzenleme kanıtı: iki eş (a + b)² karesinde 4 eş üçgen → c² ile a² + b² eşit (animasyonlu taşıma)
 *  3. obtuse:   dik olmayan üçgenler: a² + b² ile c² karşılaştırması (dar / dik / geniş), Thales yarım çemberi
 *  4. classify: yalnızca kenar uzunluklarından üçgenin türünü bul
 *  5. triples:  Pisagor üçlüleri avı (çoklu çözüm, benzer üçgenler)
 *  6. missing:  merdiven ya da bahçe yolu — önce karekökü tahmin et, sonra hesapla
 *  7. distance: koordinat düzleminde iki nokta arası uzaklık
 */

type Task =
  | { kind: 'squares' }
  | { kind: 'proof' }
  | { kind: 'obtuse' }
  | { kind: 'classify'; items: TriItem[] }
  | { kind: 'triples' }
  | { kind: 'missing'; p: Missing }
  | { kind: 'distance'; P: Pt; Q: Pt }

function makeTasks(): Task[] {
  const r = rng(Date.now() % 100000)
  const items: TriItem[] = shuffle([
    { s: pick([[6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]] as [number, number, number][], r), kind: 'dik' as const },
    { s: pick([[5, 6, 8], [4, 6, 8], [3, 5, 7], [6, 7, 10]] as [number, number, number][], r), kind: 'genis' as const },
    { s: pick([[4, 5, 6], [5, 6, 7], [6, 7, 8], [7, 8, 9]] as [number, number, number][], r), kind: 'dar' as const },
  ], r)
  const missing: Missing = r() < 0.5
    ? { mode: 'ladder', ...pick([{ L: 5, d: 2 }, { L: 6, d: 3 }, { L: 7, d: 3 }], r) }
    : { mode: 'diag', ...pick([{ w: 6, h: 4 }, { w: 5, h: 3 }, { w: 7, h: 5 }], r) }
  const [P, Q] = pick([[[-3, -2], [3, 6]], [[-2, -3], [3, 9]], [[-4, -3], [4, 3]], [[-3, -1], [2, 3]]] as [Pt, Pt][], r)
  return [
    { kind: 'squares' },
    { kind: 'proof' },
    { kind: 'obtuse' },
    { kind: 'classify', items },
    { kind: 'triples' },
    { kind: 'missing', p: missing },
    { kind: 'distance', P, Q },
  ]
}

const titles: Record<Task['kind'], string> = {
  squares: 'Kenarlardaki kareler',
  proof: 'Parçaları yeniden diz',
  obtuse: 'Dik değilse ne olur?',
  classify: 'Kenarlardan tanı',
  triples: 'Pisagor üçlüleri avı',
  missing: 'Eksik kenar',
  distance: 'İki nokta arası uzaklık',
}
const emojis: Record<Task['kind'], string> = { squares: '🟪', proof: '🧩', obtuse: '📐', classify: '🔍', triples: '🎯', missing: '🪜', distance: '🗺️' }

export default function PisagorKesif({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(), [])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const task = tasks[idx]
  const last = idx === tasks.length - 1

  const onSolved = (first: boolean) => {
    if (firsts.current.length <= idx) firsts.current.push(first)
    setSolved(true)
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(false)
      return
    }
    const f = firsts.current.filter(Boolean).length
    const triples = sol.list.filter((s) => s.key.startsWith('tr-')).length
    onFinish({
      stars: starsFor((f + Math.min(1, triples * 0.2)) / tasks.length),
      summary: `${tasks.length} keşif görevini tamamladın${triples ? `, ${triples} Pisagor üçlüsü buldun` : ''}.`,
      insight: 'Dik üçgende dik kenarlar üzerindeki karelerin alanları toplamı, hipotenüs üzerindeki karenin alanına eşittir: a² + b² = c². Açı 90°’den büyükse a² + b² < c², küçükse a² + b² > c² olur; bu yüzden kenarlardan açının türü anlaşılır.',
    })
  }

  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const common: Common = { footer, onSolved, sol }
  return (
    <Scene grade={grade}>
      <Header emoji={emojis[task.kind]} kicker="Görev" title={titles[task.kind]} idx={idx} total={tasks.length} dark />
      <TaskView key={idx} task={task} {...common} />
    </Scene>
  )
}

function TaskView({ task, ...c }: { task: Task } & Common) {
  switch (task.kind) {
    case 'squares': return <SquaresTask {...c} />
    case 'proof': return <ProofTask {...c} />
    case 'obtuse': return <ObtuseTask {...c} />
    case 'classify': return <ClassifyTask items={task.items} {...c} />
    case 'triples': return <TriplesTask {...c} />
    case 'missing': return <MissingTask p={task.p} {...c} />
    case 'distance': return <DistanceTask P={task.P} Q={task.Q} {...c} />
  }
}
