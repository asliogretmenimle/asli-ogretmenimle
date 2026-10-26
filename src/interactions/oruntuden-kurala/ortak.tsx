import { useCallback, useState, type ReactNode } from 'react'
import { ArrowRight, Delete, Flag } from 'lucide-react'
import { BigButton, LevelDots, Nudge as KitNudge } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { MathText } from '../../components/MathText'

/**
 * Cebir etkinlikleri (58–62) için ortak parçalar.
 * 7–8. sınıfta sahne koyu (useAge → atolye); kartlar ve düğmeler `dark` ile uyum sağlar.
 */

export const isDark = (grade: number) => grade >= 7

/** Türkçe sayı yazımı: −3, 2,5 */
export const num = (v: number, max = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toLocaleString('tr-TR', { maximumFractionDigits: max }).replace('-', '−')

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
export function Layout({ work, panel, lead }: { work: ReactNode; panel: ReactNode; /** görev metni: dikeyde çalışma alanının üstünde, yatayda panelin başında */ lead?: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {lead && <div className="mb-3 lg:hidden">{lead}</div>}
        {work}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {lead && <div className="hidden lg:block">{lead}</div>}
        {panel}
      </div>
    </div>
  )
}

/** Etkinlik başlığı: simge, görev no, başlık ve ilerleme noktaları */
export function Header({ icon, color, idx, total, title, dark, extra }: { icon: ReactNode; color: string; idx: number; total: number; title: string; dark?: boolean; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow" style={{ background: color }}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-wide uppercase" style={{ color: dark ? '#c4b5fd' : color }}>Görev {idx + 1} / {total}</p>
          <p className={`text-lg leading-tight font-black ${dark ? 'text-white' : 'text-ink'}`}><MathText text={title} /></p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <LevelDots current={idx} total={total} />
      </div>
    </div>
  )
}

/** Panel kartı (koyu sahnede koyu kart) */
export function Card({ title, children, dark, className = '' }: { title?: ReactNode; children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? 'bg-slate-800/90 text-slate-100 ring-1 ring-slate-600' : 'bg-white/95 text-ink ring-1 ring-line'} ${className}`}>
      {title && <p className={`mb-2 text-xs font-black tracking-wide uppercase ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{title}</p>}
      {children}
    </div>
  )
}

/** Seçim düğmesi (≥ 48 px) */
export function PickBtn({ on, disabled, onClick, children, color = '#7c3aed', dark, className = '', label }: { on?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; color?: string; dark?: boolean; className?: string; label?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={`min-h-12 min-w-12 rounded-xl px-3 font-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      style={on ? { background: color, color: '#fff', boxShadow: `0 3px 0 ${color}99` } : dark ? { background: '#1e293b', color: '#e2e8f0', boxShadow: 'inset 0 0 0 1px #475569' } : { background: '#fff', color: '#1f2340', boxShadow: 'inset 0 0 0 1px #e7e8f2' }}
    >
      {children}
    </button>
  )
}

/** Görev sonu düğmesi */
export function NextButton({ isLast, onNext, onFinish, label = 'Sonraki görev' }: { isLast: boolean; onNext: () => void; onFinish: () => void; label?: string }) {
  return (
    <div className="animate-fade-up">
      <BigButton onClick={isLast ? onFinish : onNext} className="w-full">
        {isLast ? <>Keşfi bitir <Flag size={20} /></> : <>{label} <ArrowRight size={20} /></>}
      </BigButton>
    </div>
  )
}

/** Hareketten türeyen sembolik ifade / başarı kutusu */
export function Derived({ children, tone = 'ok', className = '' }: { children: ReactNode; tone?: 'ok' | 'info'; className?: string }) {
  return (
    <div className={`rounded-2xl px-4 py-3 text-lg font-black animate-pop ${tone === 'ok' ? 'bg-ok-soft text-green-900 ring-1 ring-green-200' : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200'} ${className}`}>
      {typeof children === 'string' ? <MathText text={children} /> : children}
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

/**
 * Dokunmatik sayı tuş takımı (klavye açılmaz).
 * value: metin ("", "12", "−3", "2,5")
 */
export function NumPad({ value, onChange, dark, allowNeg, allowDec, maxLen = 4, label, unit, onEnter, enterLabel }: { value: string; onChange: (v: string) => void; dark?: boolean; allowNeg?: boolean; allowDec?: boolean; maxLen?: number; label?: ReactNode; unit?: string; onEnter?: () => void; enterLabel?: ReactNode }) {
  const press = (k: string) => {
    if (k === '⌫') return onChange(value.slice(0, -1))
    if (k === '−') return onChange(value.startsWith('−') ? value.slice(1) : `−${value}`)
    if (k === ',') return value.includes(',') ? undefined : onChange(`${value || '0'},`)
    if (value.replace(/[−,]/g, '').length >= maxLen) return
    onChange(value === '0' ? k : value + k)
  }
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', allowNeg ? '−' : allowDec ? ',' : '', '0', '⌫']
  const keyCls = dark ? 'bg-slate-700 text-white ring-slate-500 active:bg-slate-600' : 'bg-white text-ink ring-line active:bg-paper'
  return (
    <div>
      <div className={`mb-2 flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 text-3xl font-black tabular-nums ring-2 ${dark ? 'bg-slate-900 text-white ring-violet-400/60' : 'bg-white text-ink ring-violet-200'}`} aria-live="polite">
        {label && <span className={`text-base font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{label}</span>}
        <span className={value ? '' : 'opacity-30'}>{value || '?'}</span>
        {unit && <span className={`text-base font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>{unit}</span>}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((k, i) =>
          k ? (
            <button key={i} type="button" onClick={() => press(k)} className={`grid min-h-12 place-items-center rounded-xl text-xl font-black ring-1 transition active:scale-95 ${keyCls}`} aria-label={k === '⌫' ? 'Sil' : k === '−' ? 'Eksi' : k}>
              {k === '⌫' ? <Delete size={20} /> : k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      {onEnter && (
        <BigButton onClick={onEnter} disabled={!value || value === '−'} className="mt-2 w-full">{enterLabel ?? 'Tamam'}</BigButton>
      )}
    </div>
  )
}

/** "12", "−3", "2,5" → sayı */
export const parseNum = (s: string) => Number(s.replace('−', '-').replace(',', '.'))
