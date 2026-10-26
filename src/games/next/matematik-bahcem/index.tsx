import { useMemo, useRef, useState } from 'react'
import { ArrowRight, Flag, Sprout } from 'lucide-react'
import type { ManipulativeTool } from '../../../data/types'
import { celebrate, sfx } from '../../../lib/feedback'
import { useTracker } from '../../../lib/trackerContext'
import { starsFor, type GameProps } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, StrategyPicker, TaskCard, useSolutions } from '../../kit2'
import { buildLevels, type Level } from './levels'
import { HintButton, type Api } from './shared'
import { CoreTask, DesignTask, FamilyTask, FarTask, PlantTask, TranslateTask } from './tasksRow'
import { GrowBuildTask, GrowDesignTask, GrowPredictTask, GrowRuleTask, GrowTableTask } from './tasksGrow'

/**
 * Matematik Bahçem (1–3. sınıf) — örüntüler ve cebirsel düşünme (Van de Walle).
 *  1. sınıf: AB, ABB, ABC yineleyen örüntüler; devam ettirme, hata düzeltme, aynı yapıyı başka çiçeklerle kurma, kendi örüntüsü.
 *  2. sınıf: çekirdeği çitle ayırma, temsiller arası çeviri (çiçek → taş, harf kodu aileleri), uzak terimi gruplayarak tahmin,
 *            kendi örüntüsünü tasarlayıp arkadaşa (Arı Vız ya da paylaşım bağlantısıyla gerçek bir arkadaş) gönderme.
 *  3. sınıf: büyüyen örüntüler; 4. adımı dikme, adım tablosu, kuralı sözle anlatma (birden çok doğru kural), 10. adımı tahmin,
 *            uzak terim, kendi büyüyen bahçesi.
 * Farklı doğru çeviriler / kurallar / tasarımlar useSolutions ile ayrı çözüm sayılır.
 */

const readShare = () => {
  try {
    return new URLSearchParams(window.location.search).get('bahce')
  } catch {
    return null
  }
}

export default function MatematikBahcem({ grade, onFinish }: GameProps) {
  const levels = useMemo(() => buildLevels(grade, readShare()), [grade])
  const track = useTracker()
  const sol = useSolutions()
  const [li, setLi] = useState(0)
  const L: Level = levels[li]
  const [finished, setFinished] = useState(false)
  const [doneMsg, setDoneMsg] = useState('')
  const [hint, setHint] = useState(-1)
  const missRef = useRef(false)
  const stats = useRef({ items: 0, first: 0, ways: 0, bonus: 0, strategies: new Set<string>(), designs: [] as string[], translations: [] as string[], far: [] as string[], rules: [] as string[] })
  const levelStrats = useRef(new Set<string>())

  const strat = (s: string) => {
    if (levelStrats.current.has(s)) return
    levelStrats.current.add(s)
    stats.current.strategies.add(s)
    track.strategy(s)
  }

  const hintTool: ManipulativeTool = L.kind === 'far' ? 'yuzluk' : 'oruntubloklari'

  const api: Api = {
    grade,
    li,
    L,
    finished,
    complete: (msg, bonus = 0) => {
      if (finished) return
      track.item(!missRef.current)
      stats.current.items++
      if (!missRef.current) stats.current.first++
      stats.current.bonus += bonus
      if (L.auto) strat(L.auto)
      sfx.win()
      celebrate(false)
      setDoneMsg(msg)
      setFinished(true)
      setHint(-1)
    },
    miss: () => {
      track.attempt(false)
      missRef.current = true
      sfx.bad()
    },
    ok: () => track.attempt(true),
    addSol: (key, label) => {
      const isNew = sol.add(key, label)
      if (isNew) stats.current.ways++
      if (isNew && finished) stats.current.bonus++
      return isNew
    },
    strat,
    header: (
      <>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <LevelDots current={li} total={levels.length} />
          <span className="flex items-center gap-1.5">
            <span className="chip bg-green-100 px-2.5 py-1 text-xs text-green-800 ring-1 ring-green-200">{L.stage}</span>
            <span className="chip bg-white px-2.5 py-1 text-xs text-ink ring-1 ring-line">Tarh {li + 1}/{levels.length}</span>
          </span>
        </div>
        <TaskCard step={li + 1} total={levels.length}>
          <span className="block text-xs font-black tracking-wide text-green-700 uppercase">{L.friend ? '💌 ' : ''}{L.title}</span>
          <span className="mt-0.5 block">{L.prompt}</span>
        </TaskCard>
      </>
    ),
    hintButton: (
      <HintButton
        onClick={() => {
          const n = Math.min(hint + 1, L.hints.length - 1)
          if (n !== hint) track.hint()
          setHint(n)
        }}
      />
    ),
    hintNudge: hint >= 0 ? <Nudge key={`h${hint}`} question={L.hints[hint]} tool={hintTool} onClose={() => setHint(-1)} /> : null,
    donePanel: finished ? (
      <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200 animate-fade-up">
        <p className="mb-1 flex items-center justify-center gap-1.5 text-base font-black text-emerald-900"><Sprout size={18} />Tarh çiçek açtı!</p>
        <p className="text-sm font-bold text-emerald-900/85">{doneMsg}</p>
        {L.picker && <StrategyPicker key={li} question={L.picker.q} options={L.picker.options} onPick={(s) => stats.current.strategies.add(s)} />}
        <BigButton onClick={() => next()} className="mt-3 w-full">
          {li + 1 >= levels.length ? <><Flag size={20} />Bitir</> : <>Sonraki tarh<ArrowRight size={20} /></>}
        </BigButton>
      </div>
    ) : null,
    stats: stats.current,
  }

  const next = () => {
    if (li + 1 >= levels.length) return finish()
    setLi(li + 1)
    setFinished(false)
    setDoneMsg('')
    setHint(-1)
    missRef.current = false
    levelStrats.current = new Set()
  }

  const finish = () => {
    const s = stats.current
    const ratio = s.items ? s.first / s.items : 1
    let stars = starsFor(ratio)
    if (s.bonus >= 2 && stars < 3) stars = (stars + 1) as 1 | 2 | 3
    let insight: string
    if (grade <= 1) insight = `${s.designs.length ? `Kendi örüntünü (${s.designs.join(', ')}) tasarladın. ` : ''}Bir örüntüde tekrar eden parçayı bulunca sıradaki çiçeği hep bilebiliriz; aynı örüntü başka çiçeklerle de kurulabilir.`
    else if (grade === 2) insight = `${s.translations.length ? `Aynı örüntüyü ${s.translations.join(' ve ')} diye farklı biçimlerde yazdın. ` : ''}Çekirdeği bilen, örüntünün uzak bir terimini gruplayarak bulabilir${s.far.length ? ` (${s.far[0]})` : ''}.`
    else insight = `${s.rules.length ? `Aynı bahçeyi ${s.rules.length} farklı kuralla anlattın. ` : ''}Büyüyen bir örüntüde değişmeyen kısım ve her adımda eklenen kısım bulunursa istenen adım hesaplanabilir; ikiye katlamak doğru sonuç vermez.`
    onFinish({
      stars,
      score: s.ways * 10 + s.first * 5 + s.bonus * 5,
      summary: `${levels.length} tarhı çiçeklendirdin ve ${s.ways} farklı çözüm buldun.`,
      insight,
    })
  }

  const Task = {
    extend: PlantTask,
    fix: PlantTask,
    remake: PlantTask,
    core: CoreTask,
    translate: TranslateTask,
    family: FamilyTask,
    far: FarTask,
    design: DesignTask,
    gbuild: GrowBuildTask,
    gtable: GrowTableTask,
    grule: GrowRuleTask,
    gpredict: GrowPredictTask,
    gdesign: GrowDesignTask,
  }[L.kind]

  return (
    <Scene grade={grade} className="!p-2 sm:!p-4">
      <div data-kind={L.kind} data-core={L.core?.join('')} data-len={L.len} data-given={L.given} data-n={L.n} data-errors={L.errors ? Object.entries(L.errors).map(([k, v]) => `${k}:${v}`).join(',') : undefined} data-grow={L.grow ? `${L.grow.c},${L.grow.d}` : undefined}>
        <Task key={li} api={api} />
      </div>
    </Scene>
  )
}
