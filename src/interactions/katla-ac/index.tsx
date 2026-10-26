import { useMemo, useRef, useState } from 'react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { Header, NextButton, pick } from '../donusum-studyosu/ortak'
import { paperColors } from './Paper'
import { CreaseTask, EquivTask, NotchTask, SymTask, type Common, type CreaseT, type EquivT, type NotchT, type SymT } from './tasks'
import { AngleTask, MirrorTask, PerpTask } from './ileri'
import type { ShapeId } from './geom'

/**
 * 54. Katla ve Aç (2–8)
 * Sanal kâğıt: kesikli bir çizgiye dokun → kanat katlanır (doğruya dik “bastırma” animasyonu, ön yüz renkli, arka yüz beyaz).
 *  - crease: kâğıdı 1/2/3 kez katlayarak 2/4/8 eş parçaya ayır; farklı kat izi desenleri = farklı çözümler (useSolutions)
 *  - equiv:  şeridi katla, boya, yeniden katla → [[1/2]] = [[2/4]] = [[4/8]] katlamadan türeyerek belirir
 *  - notch:  katla, kesik yerleştir, açılmış hâlini TAHMİN ET, sonra animasyonla aç (kesikler her kat izine göre yansır)
 *  - sym:    şekil kâğıdında kat çizgisini döndür, katla; iki yarı çakışırsa simetri doğrusu
 *  - mirror / perp / angle (7–8): aydınger kâğıtla eğik doğruya göre yansıma, orta dikme ve açıortay
 */

type Task = CreaseT | EquivT | NotchT | SymT | { kind: 'mirror'; ang: number } | { kind: 'perp' } | { kind: 'angle' }

function makeTasks(grade: Grade): Task[] {
  const sym = (s: ShapeId): SymT => ({ kind: 'sym', shape: s })
  switch (grade) {
    case 2:
      return [{ kind: 'crease', paper: 'kare', folds: 1, need: 2 }, sym('kalp'), { kind: 'notch', folds: 1, hint: true }, { kind: 'crease', paper: 'kare', folds: 2, need: 2 }, sym('dikdortgen')]
    case 3:
      return [{ kind: 'crease', paper: 'dikdortgen', folds: 1, need: 2 }, { kind: 'crease', paper: 'kare', folds: 2, need: 2 }, sym('kare'), { kind: 'notch', folds: 2, hint: true }, sym('ucgen')]
    case 4:
      return [{ kind: 'crease', paper: 'kare', folds: 2, need: 3 }, { kind: 'equiv', start: 1, shade: 1, rounds: 2 }, { kind: 'notch', folds: 2 }, sym('altigen'), sym('paralelkenar')]
    case 5:
      return [{ kind: 'equiv', start: 2, shade: 3, rounds: 2 }, { kind: 'crease', paper: 'kare', folds: 3, need: 2 }, { kind: 'notch', folds: 2 }, sym(pick(['besgen', 'altigen'] as const)), sym('yamuk')]
    case 6:
      return [{ kind: 'crease', paper: 'kare', folds: 3, need: 3 }, sym('eskenar'), sym('paralelkenar'), { kind: 'notch', folds: 3 }, sym('besgen')]
    case 7:
      return [{ kind: 'mirror', ang: pick([60, 120, 35]) }, { kind: 'perp' }, { kind: 'angle' }, { kind: 'notch', folds: 3 }, sym(pick(['sekizgen', 'besgen'] as const))]
    default:
      return [{ kind: 'mirror', ang: pick([145, 55, 30]) }, { kind: 'angle' }, { kind: 'perp' }, { kind: 'notch', folds: 3 }]
  }
}

const titles: Record<Task['kind'], string> = {
  crease: 'Eş parçalara katla',
  equiv: 'Katla, boya, yeniden katla',
  notch: 'Katla, kes, tahmin et',
  sym: 'Simetri doğrusu avı',
  mirror: 'Mürekkep baskısı',
  perp: 'Noktayı noktaya katla',
  angle: 'Kolu kola katla',
}

export default function KatlaAc({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const dark = grade >= 7
  const colors = useMemo(() => paperColors(grade), [grade])
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
    const ways = sol.list.length
    onFinish({
      stars: starsFor((f + Math.min(1, ways * 0.15)) / tasks.length),
      summary: `${tasks.length} katlama görevini tamamladın${ways ? `; ${ways} farklı kat/simetri çözümü buldun` : ''}.`,
      insight:
        grade <= 3
          ? 'Kâğıdı iki yarısı tam üst üste gelecek şekilde katlarsan eş parçalar elde edersin; bu kat çizgisi bir simetri doğrusudur. Her yeni katlama parça sayısını iki katına çıkarır.'
          : grade <= 6
            ? 'Katlamak yansıtmaktır: kesikler her kat izine göre ayna görüntüsü gibi çoğalır. Kâğıdı yeniden katlamak parçaları böler ama boyalı alanı değiştirmez; bu yüzden [[1/2]] = [[2/4]] = [[4/8]].'
            : 'Katlama bir yansımadır: kat izi, her noktayı görüntüsüne bağlayan doğru parçasının orta dikmesidir. Bir noktayı ötekinin üstüne katlamak orta dikmeyi, bir kolu öteki kolun üstüne katlamak açıortayı verir.',
  })
  }

  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const c: Common = { grade, dark, footer, onSolved, sol, colors, tag: `t${idx}` }
  return (
    <Scene grade={grade}>
      <Header emoji="📄" title={titles[task.kind]} idx={idx} total={tasks.length} dark={dark} />
      <TaskView key={idx} task={task} c={c} />
    </Scene>
  )
}

function TaskView({ task, c }: { task: Task; c: Common }) {
  switch (task.kind) {
    case 'crease': return <CreaseTask t={task} {...c} />
    case 'equiv': return <EquivTask t={task} {...c} />
    case 'notch': return <NotchTask t={task} {...c} />
    case 'sym': return <SymTask t={task} {...c} />
    case 'mirror': return <MirrorTask t={task} {...c} />
    case 'perp': return <PerpTask t={task} {...c} />
    case 'angle': return <AngleTask t={task} {...c} />
  }
}
