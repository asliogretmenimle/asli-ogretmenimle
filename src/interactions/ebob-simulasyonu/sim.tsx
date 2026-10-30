import { useRef, useState, type ReactNode } from 'react'
import { FastForward, Play } from 'lucide-react'
import { useFrame } from '../../games/kit'
import { StrategyPicker } from '../../games/kit2'
import { ek } from '../../lib/generators'
import { Card, CheckButton, GhostButton, Nudge, NumPad, Slider, parseNum, type useChecks } from '../donusum-studyosu/ortak'

/**
 * EBOB ve EKOK problem simülasyonları için ortak parçalar.
 * Her senaryo aynı akışla ilerler: 1. Tahmin et → 2. Simülasyonda dene → 3. Hesapla → Düşün.
 */

export type Phase = 'predict' | 'try' | 'count' | 'done'

/** Sonuç kartında gösterilen satır */
export type Row = { emoji: string; title: string; a: number; b: number; answer: number; text: string }

export type ScenarioProps = { onSolved: (row: Row, first: boolean) => void; footer: ReactNode }

export const GREEN = '#22c55e'
export const RED = '#ef4444'
export const AMBER = '#f59e0b'
export const SKY = '#38bdf8'
export const VIOLET = '#a78bfa'

/* ───────────── animasyon ───────────── */

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** 0 → 1 ilerleyen kısa animasyon; bitince (ya da atlanınca) onEnd çağrılır */
export function useRun() {
  const [t, setT] = useState(1)
  const [running, setRunning] = useState(false)
  const tRef = useRef(1)
  const dur = useRef(1)
  const end = useRef<(() => void) | undefined>(undefined)
  const finish = () => {
    tRef.current = 1
    setT(1)
    setRunning(false)
    const f = end.current
    end.current = undefined
    f?.()
  }
  useFrame((dt) => {
    tRef.current = Math.min(1, tRef.current + dt / dur.current)
    if (tRef.current >= 1) finish()
    else setT(tRef.current)
  }, running)
  return {
    t,
    running,
    start(seconds: number, onEnd?: () => void) {
      end.current = onEnd
      dur.current = Math.max(0.2, seconds)
      tRef.current = 0
      setT(0)
      if (reduced()) finish()
      else setRunning(true)
    },
    skip: finish,
  }
}

/* ───────────── biçim yardımcıları ───────────── */

/** 08.00’den m dakika sonrası: 36 → "08.36" */
export const fmtTime = (m: number) => {
  const total = 8 * 60 + m
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}.${String(total % 60).padStart(2, '0')}`
}

/** Üleştirme sıfatı: 4 → "4’erli", 6 → "6’şarlı", 9 → "9’arlı" */
export const erli = (n: number) => {
  const d = ek(n, 'dist')
  return d + (d.endsWith('ar') ? 'lı' : 'li')
}

/* ───────────── paneller ───────────── */

const STEPS: { id: Phase; label: string }[] = [
  { id: 'predict', label: 'Tahmin et' },
  { id: 'try', label: 'Simülasyonda dene' },
  { id: 'count', label: 'Hesapla' },
]

export function Steps({ phase }: { phase: Phase }) {
  const at = phase === 'done' ? 3 : STEPS.findIndex((s) => s.id === phase)
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Adımlar">
      {STEPS.map((s, i) => (
        <li key={s.id} className={`chip px-2.5 py-1 text-xs ${i < at ? 'bg-emerald-500/20 text-emerald-200' : i === at ? 'bg-pink-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
          {i + 1}. {s.label}
        </li>
      ))}
    </ol>
  )
}

/** 1. adım: tahmini kaydet (tuş takımı ya da kaydırıcı) */
export function PredictPanel({ question, unit, slider, onSave }: { question: ReactNode; unit?: string; slider?: { min: number; max: number; start: number; format: (v: number) => string }; onSave: (v: number) => void }) {
  const [s, setS] = useState('')
  const [v, setV] = useState(slider?.start ?? 0)
  const value = slider ? v : parseNum(s)
  return (
    <Card dark>
      <p className="mb-1 text-[11px] font-black tracking-wide text-pink-300 uppercase">1. Tahmin et</p>
      <p className="mb-2 font-extrabold">{question}</p>
      {slider ? (
        <Slider value={v} onChange={setV} min={slider.min} max={slider.max} format={slider.format} label="Tahmin" dark />
      ) : (
        <NumPad value={s} onChange={setS} unit={unit} label="Tahminim" max={4} />
      )}
      <CheckButton onClick={() => onSave(value)} disabled={!Number.isFinite(value) || value <= 0}>Tahminimi kaydet</CheckButton>
    </Card>
  )
}

/** Simülasyonu çalıştır / atla düğmesi */
export function RunButton({ running, onRun, onSkip, children = 'Simülasyonu çalıştır', disabled }: { running: boolean; onRun: () => void; onSkip: () => void; children?: ReactNode; disabled?: boolean }) {
  return running ? (
    <GhostButton dark onClick={onSkip} className="w-full"><FastForward size={18} />Animasyonu atla</GhostButton>
  ) : (
    <button type="button" onClick={onRun} disabled={disabled} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 text-lg font-black text-white shadow-[0_3px_0_#0369a1] transition active:scale-[0.98] disabled:opacity-40">
      <Play size={20} fill="currentColor" />{children}
    </button>
  )
}

/** Simülasyonda “tam oturan” değerler */
export function FoundList({ label, values, format = String, best }: { label: string; values: number[]; format?: (v: number) => string; best?: number }) {
  if (!values.length) return null
  return (
    <div className="rounded-2xl bg-emerald-950/60 p-3 ring-1 ring-emerald-700">
      <p className="mb-1.5 text-xs font-black text-emerald-200">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {[...values].sort((x, y) => x - y).map((v) => (
          <span key={v} className={`chip px-2.5 py-1 text-sm animate-pop ${v === best ? 'bg-amber-300 text-amber-950' : 'bg-emerald-500 text-white'}`}>{format(v)}</span>
        ))}
      </div>
    </div>
  )
}

/** 2. adım: denetimler (kaydırıcı + çalıştır), tam oturan değerler ve “bulduğum cevap bu” düğmesi */
export function TryCard({ intro, controls, found, foundLabel, format, canClaim, claimLabel, onClaim, wrong }: { intro: ReactNode; controls: ReactNode; found: number[]; foundLabel: string; format?: (v: number) => string; canClaim: boolean; claimLabel: string; onClaim: () => void; wrong: { key: number; text: string; misconception?: string } | null }) {
  return (
    <Card dark className="flex flex-col gap-3">
      <div>
        <p className="mb-1 text-[11px] font-black tracking-wide text-pink-300 uppercase">2. Simülasyonda dene</p>
        <p className="font-bold text-slate-200">{intro}</p>
      </div>
      {controls}
      <FoundList label={foundLabel} values={found} format={format} />
      <CheckButton onClick={onClaim} disabled={!canClaim}>{claimLabel}</CheckButton>
      {wrong && <Nudge key={wrong.key} question={wrong.text} misconception={wrong.misconception} />}
    </Card>
  )
}

/** Durum satırı: simülasyonun sonucu */
export function Status({ ok, children }: { ok: boolean | null; children: ReactNode }) {
  const cls = ok === null ? 'bg-slate-800 text-slate-200 ring-slate-600' : ok ? 'bg-emerald-900/70 text-emerald-100 ring-emerald-600' : 'bg-rose-950/70 text-rose-100 ring-rose-700'
  return <p className={`rounded-2xl px-3 py-2.5 text-[15px] font-bold ring-1 ${cls}`} aria-live="polite">{children}</p>
}

/** 3. adım: sayıyı hesapla */
export function CountPanel({ question, unit, answer, hint, chk, onDone }: { question: ReactNode; unit?: string; answer: number; hint: string; chk: ReturnType<typeof useChecks>; onDone: () => void }) {
  const [s, setS] = useState('')
  const [wrong, setWrong] = useState(0)
  return (
    <Card dark>
      <p className="mb-1 text-[11px] font-black tracking-wide text-pink-300 uppercase">3. Hesapla</p>
      <p className="mb-2 font-extrabold">{question}</p>
      <NumPad value={s} onChange={setS} unit={unit} max={4} />
      <CheckButton
        disabled={!s}
        onClick={() => {
          if (parseNum(s) === answer) return onDone()
          chk.fail()
          setWrong((w) => w + 1)
        }}
      />
      {wrong > 0 && <div className="mt-2"><Nudge key={wrong} question={hint} /></div>}
    </Card>
  )
}

/** Çözüldü: açıklama, tahmin karşılaştırması ve strateji */
export function DonePanel({ text, prediction, answer, format = String, strategies, footer }: { text: string; prediction: number | null; answer: number; format?: (v: number) => string; strategies: string[]; footer: ReactNode }) {
  const diff = prediction === null ? '' : prediction === answer ? ' Tahminin tam isabet!' : ` Tahminin ${format(prediction)} idi, simülasyon ${format(answer)} gösterdi.`
  return (
    <>
      <Nudge tone="ok" question={text + diff} />
      <StrategyPicker options={strategies} onPick={() => undefined} question="Cevabı nasıl buldun?" />
      {footer}
    </>
  )
}

export const EBOB_STRATEGIES = ['Simülasyonda deneyerek buldum', 'Ortak bölenleri listeledim', 'Küçük sayının bölenlerini büyükten küçüğe denedim', 'Asal çarpanlara ayırdım']
export const EKOK_STRATEGIES = ['Simülasyonda deneyerek buldum', 'Büyük sayının katlarını sıraladım', 'Ortak katları listeledim', 'Asal çarpanlara ayırdım']
