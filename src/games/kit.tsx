import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Heart, Timer, Trophy } from 'lucide-react'
import type { Grade } from '../data/types'

export interface GameResult {
  /** 1–3 yıldız */
  stars: 1 | 2 | 3
  /** Bitiş ekranındaki özet, ör. "14 balon patlattın" */
  summary: string
  /** Puan (en iyi skor için saklanır) */
  score: number
  /** Varsa bitiş ekranında "Ne öğrendik?" notu */
  insight?: string
}

export interface GameProps {
  grade: Grade
  onFinish: (r: GameResult) => void
}

export const starsFor = (ratio: number): 1 | 2 | 3 => (ratio >= 0.85 ? 3 : ratio >= 0.55 ? 2 : 1)

/** Oyunların üstündeki bilgi çubuğu: puan, tur, can, süre */
export function Hud({ score, round, rounds, lives, maxLives, seconds, extra }: { score?: number; round?: number; rounds?: number; lives?: number; maxLives?: number; seconds?: number; extra?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-sm font-extrabold">
      {round !== undefined && rounds !== undefined && (
        <span className="chip bg-white px-3 py-1.5 text-sm ring-1 ring-line">Tur {Math.min(round, rounds)}/{rounds}</span>
      )}
      {score !== undefined && (
        <span className="chip bg-amber-50 px-3 py-1.5 text-sm text-amber-700 ring-1 ring-amber-200"><Trophy size={15} />{score}</span>
      )}
      {lives !== undefined && maxLives !== undefined && (
        <span className="chip bg-rose-50 px-3 py-1.5 text-sm ring-1 ring-rose-200" aria-label={`${lives} can`}>
          {Array.from({ length: maxLives }, (_, i) => (
            <Heart key={i} size={15} className={i < lives ? 'fill-rose-500 text-rose-500' : 'text-rose-200'} />
          ))}
        </span>
      )}
      {seconds !== undefined && (
        <span className={`chip px-3 py-1.5 text-sm ring-1 ${seconds <= 10 ? 'bg-orange-50 text-orange-700 ring-orange-200' : 'bg-white ring-line'}`}><Timer size={15} />{seconds} sn</span>
      )}
      {extra}
    </div>
  )
}

/** Saniye sayacı: running iken her saniye azalır, 0 olunca onEnd bir kez çağrılır */
export function useCountdown(total: number, running: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(total)
  const endRef = useRef(onEnd)
  endRef.current = onEnd
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [running])
  useEffect(() => {
    if (running && left === 0) endRef.current()
  }, [left, running])
  return { left, reset: () => setLeft(total) }
}

/** requestAnimationFrame döngüsü; dt saniye cinsinden */
export function useFrame(cb: (dt: number) => void, running: boolean) {
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      cbRef.current(Math.min(0.05, (now - last) / 1000))
      last = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])
}

/** Kısa süre görünen geri bildirim balonu */
export function Toast({ text, tone }: { text: string; tone: 'ok' | 'bad' | 'info' }) {
  const cls = tone === 'ok' ? 'bg-ok-soft text-green-800 ring-green-200' : tone === 'bad' ? 'bg-orange-50 text-orange-800 ring-orange-200' : 'bg-white text-ink ring-line'
  return <div className={`mx-auto mt-3 w-fit max-w-full rounded-2xl px-4 py-2 text-center text-base font-extrabold ring-1 animate-pop ${cls}`} aria-live="polite">{text}</div>
}

/** Negatif sayıyı tipografik eksiyle yazar: −5 */
export const signed = (s: string) => s.replace(/^-/, '−')
