import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Flag } from 'lucide-react'
import { BigButton, LevelDots, Nudge as KitNudge, type useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { MathText } from '../../components/MathText'

/**
 * Kesir etkinlikleri (36–40) için ortak küçük parçalar:
 * yerleşim (yatay tablette çalışma alanı solda, panel sağda), başlık, seçim düğmeleri,
 * dar panele uygun Nudge, oturum puanı ve kesir yardımcıları.
 */

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

/** [[n/d]] biçiminde kesir metni (MathText için). Tam sayılı yazım için whole verilebilir. */
export const fr = (n: number, d: number) => `[[${n}/${d}]]`

/** n/d → "1 2/3" gibi tam sayılı kesir metni; tam sayıysa sadece sayı */
export function mixed(n: number, d: number) {
  const w = Math.floor(n / d)
  const r = n - w * d
  if (r === 0) return String(w)
  return w > 0 ? `[[${w} ${r}/${d}]]` : `[[${r}/${d}]]`
}

/** Türkçe ondalık yazımı: 0.25 → "0,25" */
export const dec = (v: number, max = 3) => (Math.abs(v) < 1e-12 ? 0 : v).toLocaleString('tr-TR', { maximumFractionDigits: max })

/** useSolutions.add dönüş değeri setState içinde hesaplandığından güvenilmez; yeniliği kendimiz izleriz */
export function useFresh(sol: ReturnType<typeof useSolutions>) {
  const seen = useRef(new Set<string>())
  return useCallback(
    (k: string, label: string) => {
      if (seen.current.has(k)) return false
      seen.current.add(k)
      sol.add(k, label)
      return true
    },
    [sol],
  )
}

/** Oturum: her görevin ilk denemede çözülüp çözülmediği */
export function useSession(total: number) {
  const [idx, setIdx] = useState(0)
  const [firsts, setFirsts] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  const complete = useCallback((first: boolean) => {
    setDone((d) => {
      if (!d) setFirsts((f) => [...f, first])
      return true
    })
  }, [])
  const next = () => {
    setIdx((i) => i + 1)
    setDone(false)
  }
  const isLast = idx + 1 >= total
  const stars = (bonus = 0) => starsFor(Math.min(1, (firsts.filter(Boolean).length + bonus) / total))
  return { idx, done, complete, next, isLast, firsts, stars }
}

/** Yatay tablette: çalışma alanı solda, görev paneli sağda. Dikeyde alt alta. */
export function Layout({ work, panel }: { work: ReactNode; panel: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">{work}</div>
      <div className="flex min-w-0 flex-col gap-3">{panel}</div>
    </div>
  )
}

/** Etkinlik başlığı: simge, görev no, başlık ve ilerleme noktaları */
export function Header({ icon, color, idx, total, title, extra }: { icon: ReactNode; color: string; idx: number; total: number; title: string; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow" style={{ background: color }}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-wide uppercase" style={{ color }}>Görev {idx + 1} / {total}</p>
          <p className="text-lg leading-tight font-black text-ink"><MathText text={title} /></p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <LevelDots current={idx} total={total} />
      </div>
    </div>
  )
}

/** Dar panelde soru metni tam satır kaplasın, düğmeler alta insin */
export function Nudge(p: Parameters<typeof KitNudge>[0]) {
  return (
    <div className="[&>div>div]:ml-12 [&>div>p]:basis-[calc(100%-3rem)]">
      <KitNudge {...p} />
    </div>
  )
}

/** Panel kartı */
export function Card({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/95 p-3 ring-1 ring-line ${className}`}>
      {title && <p className="mb-2 text-xs font-black tracking-wide text-ink-soft uppercase">{title}</p>}
      {children}
    </div>
  )
}

/** Seçim düğmesi (≥ 48 px) */
export function PickBtn({ on, disabled, onClick, children, color = '#0d9488', className = '', label }: { on?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; color?: string; className?: string; label?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={`min-h-12 min-w-12 rounded-xl px-3 text-lg font-black ring-1 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={on ? { background: color, color: '#fff', boxShadow: `0 3px 0 ${color}aa`, borderColor: color } : { background: '#fff', color: '#1f2340', boxShadow: 'inset 0 0 0 1px #e7e8f2' }}
    >
      {children}
    </button>
  )
}

/** Görev sonu düğmesi */
export function NextButton({ isLast, onNext, onFinish, label = 'Sonraki görev' }: { isLast: boolean; onNext: () => void; onFinish: () => void; label?: string }) {
  return (
    <div className="flex justify-center animate-fade-up lg:justify-stretch">
      <BigButton onClick={isLast ? onFinish : onNext} className="w-full">
        {isLast ? <>Keşfi bitir <Flag size={20} /></> : <>{label} <ArrowRight size={20} /></>}
      </BigButton>
    </div>
  )
}

/** Başarı kutusu: hareketten türeyen sembolik ifade */
export function Derived({ children, tone = 'ok' }: { children: ReactNode; tone?: 'ok' | 'info' }) {
  return (
    <div className={`rounded-2xl px-4 py-3 text-lg font-black animate-pop ${tone === 'ok' ? 'bg-ok-soft text-green-900 ring-1 ring-green-200' : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200'}`}>
      {typeof children === 'string' ? <MathText text={children} /> : children}
    </div>
  )
}
