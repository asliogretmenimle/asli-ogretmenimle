import { useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { Scene, StrategyPicker } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { MathText } from '../../../components/MathText'
import { Header, NextButton } from '../../../interactions/donusum-studyosu/ortak'
import { levels, type Step } from './model'
import { ChoiceStep, CompareStep, PayStep, type StepProps } from './parts'

/**
 * Kök Dükkanı (8. sınıf, kareköklü ifadeler)
 * Öğrenci kareköklü para birimiyle alışveriş yapar. Kurallar mekanikte yaşar:
 *  - Kasa yalnızca sade parayı kabul eder → Bozdurma Bürosu’nda √18 = √(9 · 2) = 3√2 (a√b biçimine getirme)
 *  - Tepside her kök cinsi ayrı toplanır → √2 + √3 ≠ √5
 *  - Etiketlerde katsayıyı kök içine alma ile karşılaştırma, kilo × fiyat ile çarpma, para üstüyle çıkarma
 * Her seviye bir ya da birkaç adımdan oluşur; seviye puanı ilk denemede 100 jeton, her yanlışta 15 eksik (en az 40).
 */

const STRATEGY_AT = new Set([2, 4, 6])
const STRATEGIES = ['Parayı bozdurup aynı cinse çevirdim', 'Tam kare çarpan aradım', 'Katsayıyı kök içine aldım', 'Önce yaklaşık değeri tahmin ettim']

export default function KokDukkani({ grade, onFinish }: GameProps) {
  const track = useTracker()
  const [li, setLi] = useState(0)
  const [si, setSi] = useState(0)
  const [stepDone, setStepDone] = useState(false)
  const [score, setScore] = useState(0)
  const fails = useRef(0)
  const firsts = useRef(0)
  const level = levels[li]
  const step = level.steps[si]
  const lastStep = si === level.steps.length - 1
  const levelDone = stepDone && lastStep
  const lastLevel = li === levels.length - 1

  const onFail = (mis?: string) => {
    fails.current++
    track.attempt(false)
    if (mis) track.misconception(mis)
    sfx.bad()
  }
  const onSolved = () => {
    track.attempt(true)
    sfx.ok()
    setStepDone(true)
    if (si === level.steps.length - 1) {
      const first = fails.current === 0
      track.item(first)
      if (first) firsts.current++
      setScore((s) => s + Math.max(40, 100 - 15 * fails.current))
    }
  }
  const nextStep = () => {
    setSi(si + 1)
    setStepDone(false)
  }
  const nextLevel = () => {
    if (!lastLevel) {
      setLi(li + 1)
      setSi(0)
      setStepDone(false)
      fails.current = 0
      return
    }
    onFinish({
      stars: starsFor(firsts.current / levels.length),
      score,
      summary: `Kök Dükkanı’nda ${levels.length} alışverişi tamamladın ve ${score} jeton topladın.`,
      insight: 'Kareköklü ifadeler ancak kök içleri aynıysa toplanıp çıkarılır (3√2 + √8 = 3√2 + 2√2 = 5√2); √2 + √3 ise √5 etmez. Kök içindeki tam kare çarpan dışarı çıkar, katsayı kök içine karesiyle girer ve çarpmada kök içleri çarpılır: √3 · √12 = √36 = 6.',
    })
  }

  const footer = stepDone ? (
    levelDone ? (
      <div className="flex flex-col gap-3 animate-fade-up">
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-950 ring-1 ring-emerald-200">
          <p className="text-xs font-black tracking-wide text-emerald-700 uppercase">Ne keşfettik?</p>
          <p className="mt-1 text-[15px] font-bold"><MathText text={level.insight} /></p>
        </div>
        {STRATEGY_AT.has(li) && <StrategyPicker key={li} options={STRATEGIES} onPick={() => undefined} />}
        <NextButton last={lastLevel} onClick={nextLevel} />
      </div>
    ) : (
      <button type="button" onClick={nextStep} className="btn-primary min-h-14 w-full text-lg animate-fade-up">Devam <ArrowRight size={20} /></button>
    )
  ) : null

  const common: StepProps = { onFail, onSolved, footer }
  return (
    <Scene grade={grade}>
      <Header
        emoji={level.emoji}
        kicker="Dükkân"
        title={<>{level.title}{level.steps.length > 1 && <span className="ml-2 text-sm font-extrabold text-slate-400">adım {si + 1}/{level.steps.length}</span>}</>}
        idx={li}
        total={levels.length}
        dark
        right={<span className="chip bg-amber-400/15 px-3 py-1.5 text-sm text-amber-200 ring-1 ring-amber-400/40">🪙 {score}</span>}
      />
      <StepView key={`${li}-${si}`} step={step} {...common} />
    </Scene>
  )
}

function StepView({ step, ...c }: { step: Step } & StepProps) {
  switch (step.kind) {
    case 'pay': return <PayStep step={step} {...c} />
    case 'choice': return <ChoiceStep step={step} {...c} />
    case 'compare': return <CompareStep step={step} {...c} />
  }
}
