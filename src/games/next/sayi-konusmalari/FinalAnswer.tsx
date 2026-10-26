import { useState } from 'react'
import { MathText } from '../../../components/MathText'
import { Nudge } from '../../kit2'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import type { ManipulativeTool } from '../../../data/types'
import { fmtN, same, type Problem } from './problems'
import { Keypad, parseNum } from './ui'

/** Kurulan stratejinin son adımı: öğrenci kolaylaşan işlemi zihinden hesaplar. */
export function FinalAnswer({ p, expr, expected, onCorrect }: { p: Problem; expr: string; expected: number; onCorrect: (firstTry: boolean) => void }) {
  const [val, setVal] = useState('')
  const [miss, setMiss] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; mis?: string } | null>(null)
  const [done, setDone] = useState(false)
  const track = useTracker()
  const tool: ManipulativeTool | undefined = p.kind === 'mul' ? 'dizilim' : p.kind === 'pow' ? undefined : 'numberline'

  const submit = () => {
    const v = parseNum(val)
    if (Number.isNaN(v) || done) return
    if (same(v, expected)) {
      track.attempt(true)
      setDone(true)
      setNudge(null)
      sfx.ok()
      onCorrect(miss === 0)
      return
    }
    track.attempt(false)
    sfx.bad()
    setMiss(miss + 1)
    const [x, y] = p.terms
    let q = ''
    let mis: string | undefined
    if (same(v, -expected) && !same(expected, 0)) {
      q = 'Sayı doğru görünüyor ama işaretine bak: sonuç sıfırın hangi tarafında olmalı?'
      mis = 'Sonucun işaretini karıştırdı'
    } else if (p.kind === 'sub' && same(v, x - y)) {
      q = 'Bu işlemde çıkarıyoruz. Sonuç başladığın sayıdan büyük olabilir mi?'
      mis = 'Çıkarma yerine toplama yaptı'
    } else if (Math.abs(v - expected) <= p.step * 10 + 1e-9 && p.kind !== 'pow') {
      q = `Çok yaklaştın! ${expr} işlemini bir daha düşün: önce kolay kısmı, sonra kalanı.`
    } else if (Math.abs(v - expected) === 10 || Math.abs(v - expected) === 100) {
      q = 'Basamaklara dikkat: onlukları ve birlikleri ayrı ayrı topladın mı? Eldeyi unutmuş olabilir misin?'
      mis = 'Onluk bozma / elde hatası'
    } else {
      q = `Tahminine dön: sonuç ${fmtN(p.bench)} ile karşılaştırınca nerede olmalıydı? Cevabın buna uyuyor mu?`
    }
    setNudge({ q, mis })
    setVal('')
  }

  return (
    <div className="mt-3 animate-fade-up">
      <Keypad value={val} onChange={setVal} onSubmit={submit} decimal={!Number.isInteger(p.step) || p.terms.some((t) => !Number.isInteger(t))} negative={/^−|\(−/.test(p.text) || p.answer < 0} prompt={<MathText text={`${expr} =`} />} disabled={done} />
      {nudge && <div className="mx-auto max-w-md"><Nudge key={nudge.q + miss} question={nudge.q} misconception={nudge.mis} tool={miss >= 2 ? tool : undefined} onClose={() => setNudge(null)} /></div>}
    </div>
  )
}
