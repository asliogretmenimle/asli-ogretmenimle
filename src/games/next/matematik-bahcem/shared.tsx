import { useState, type ReactNode } from 'react'
import { Check, Copy, Lightbulb, Minus, Plus, Share2 } from 'lucide-react'
import type { Grade, ManipulativeConfig, ManipulativeTool } from '../../../data/types'
import { BigButton, Nudge } from '../../kit2'
import { DragSource } from './drag'
import { Flower, KINDS, SHAPES, Stone } from './flowers'
import type { Level } from './levels'

export type NudgeState = { question: string; tool?: ManipulativeTool; toolConfig?: ManipulativeConfig; misconception?: string; tone?: 'think' | 'ok' }

/** Görevlerin ana oyundan aldığı araçlar */
export interface Api {
  grade: Grade
  li: number
  L: Level
  /** seviye bitti (görev kilitlenir) */
  finished: boolean
  /** seviyeyi tamamla (ilk denemede mi? ana oyun izler) */
  complete: (msg: string, bonus?: number) => void
  /** yanlış deneme: attempt(false) + ilk deneme bozulur */
  miss: () => void
  ok: () => void
  addSol: (key: string, label: string) => boolean
  strat: (s: string) => void
  header: ReactNode
  /** ipucu düğmesi + ipucu balonu + bitiş paneli */
  hintButton: ReactNode
  hintNudge: ReactNode
  donePanel: ReactNode
  /** temsil: renk adları vb. */
  stats: { designs: string[]; translations: string[]; far: string[]; rules: string[] }
}

export const NUDGE_WRAP = '[&>div:has(>div>button+button)>p]:basis-[calc(100%-3rem)] [&>div>div]:ml-auto'

export const colorsOf = (seq: number[]) => seq.map((k) => KINDS[k].color).join('-')
export const shapesOf = (seq: number[]) => seq.map((k) => SHAPES[k].sym).join(' ')

export function Layout({ header, scene, tray, actions }: { header: ReactNode; scene: ReactNode; tray?: ReactNode; actions: ReactNode }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
      <header className="lg:col-start-2 lg:row-start-1">{header}</header>
      <section className="min-w-0 lg:col-start-1 lg:row-span-3 lg:row-start-1">
        {scene}
        {tray}
      </section>
      <aside className="lg:col-start-2 lg:row-start-2">{actions}</aside>
    </div>
  )
}

/** Eylem sütunu: birincil düğme + ipucu + geri bildirim + ek içerik + bitiş paneli */
export function Actions({ api, primary, nudge, onCloseNudge, children, secondary, keep }: {
  api: Api
  /** seviye bittikten sonra da birincil düğmeyi göster */
  keep?: boolean
  primary?: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }
  nudge: NudgeState | null
  onCloseNudge: () => void
  children?: ReactNode
  secondary?: ReactNode
}) {
  return (
    <>
      {(!api.finished || keep) && (primary || secondary) && (
        <div className="flex flex-wrap gap-2">
          {primary && (
            <BigButton onClick={primary.onClick} className="flex-1" disabled={primary.disabled}>
              {primary.icon}
              {primary.label}
            </BigButton>
          )}
          {secondary}
          {!api.finished && api.hintButton}
        </div>
      )}
      <div className={NUDGE_WRAP}>
        {!api.finished && api.hintNudge}
        {nudge && <Nudge key={nudge.question} {...nudge} onClose={onCloseNudge} />}
      </div>
      {children}
      {api.donePanel}
    </>
  )
}

export function HintButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-14 items-center gap-1.5 rounded-2xl bg-amber-50 px-4 text-base font-extrabold text-amber-900 ring-1 ring-amber-200">
      <Lightbulb size={18} />İpucu
    </button>
  )
}

/** Tohum paketleri (çiçek) ya da taş sepeti (şekil) */
export function SeedTray({ kinds, item, onPick, onDrop, title, help, disabled, selected }: {
  kinds: number[]
  item: 'flower' | 'stone'
  onPick: (k: number) => void
  onDrop: (k: number, zone: string) => void
  title: string
  help: string
  disabled?: boolean
  selected?: number | null
}) {
  return (
    <div className={`mt-3 rounded-3xl bg-[linear-gradient(180deg,#f0fdf4,#ecfccb)] p-3 ring-1 ring-green-200 sm:p-4 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-green-900">{title}</p>
        <p className="text-xs font-bold text-green-900/70">{help}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {kinds.map((k) => {
          const pic =
            item === 'flower' ? (
              <svg viewBox="-40 -100 80 108" className="h-16 w-12 sm:h-20 sm:w-14" aria-hidden>
                <Flower kind={k} h={96} />
              </svg>
            ) : (
              <svg viewBox="-36 -34 72 68" className="size-14 sm:size-16" aria-hidden>
                <Stone shape={k} r={30} />
              </svg>
            )
          return (
            <DragSource
              key={k}
              value={k}
              label={item === 'flower' ? `${KINDS[k].name} tohumu` : `${SHAPES[k].name} taşı`}
              onTap={() => onPick(k)}
              onDrop={(z) => onDrop(k, z)}
              ghost={<div className="rounded-2xl bg-white/80 p-1 shadow-lg">{pic}</div>}
              className={`flex min-h-[88px] min-w-[76px] flex-col items-center justify-center rounded-2xl px-2 pt-1 pb-1.5 shadow-[0_3px_0_rgba(22,101,52,.18)] ring-2 transition active:scale-95 sm:min-w-[92px] ${selected === k ? 'bg-sky-50 ring-sky-400' : 'bg-white ring-green-200 hover:bg-green-50'}`}
            >
              {pic}
              <span className="text-xs font-extrabold text-ink">{item === 'flower' ? KINDS[k].color : SHAPES[k].name}</span>
            </DragSource>
          )
        })}
      </div>
    </div>
  )
}

/** Büyük, dokunmaya uygun sayı ayarlayıcı */
export function BigStepper({ value, onChange, min = 0, max = 200, label, big }: { value: number | null; onChange: (v: number) => void; min?: number; max?: number; label: string; big?: boolean }) {
  const v = value ?? 0
  const set = (x: number) => onChange(Math.max(min, Math.min(max, x)))
  const btn = 'grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-green-800 ring-1 ring-green-200 active:scale-95 disabled:opacity-40'
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      {big && (
        <button type="button" className={`${btn} text-sm font-black`} onClick={() => set(v - 10)} disabled={v - 10 < min} aria-label={`${label}: 10 azalt`}>−10</button>
      )}
      <button type="button" className={btn} onClick={() => set(v - 1)} disabled={v <= min} aria-label={`${label}: azalt`}><Minus size={22} /></button>
      <span className="grid h-14 min-w-16 place-items-center rounded-2xl bg-white px-3 text-3xl font-black tabular-nums text-ink ring-2 ring-green-300" aria-live="polite">{value === null ? '?' : value}</span>
      <button type="button" className={btn} onClick={() => set(v + 1)} disabled={v >= max} aria-label={`${label}: artır`}><Plus size={22} /></button>
      {big && (
        <button type="button" className={`${btn} text-sm font-black`} onClick={() => set(v + 10)} disabled={v + 10 > max} aria-label={`${label}: 10 artır`}>+10</button>
      )}
    </div>
  )
}

/** Paylaşım bağlantısı: kopyala ya da paylaş */
export function ShareBox({ code, grade, text }: { code: string; grade: Grade; text: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?sinif=${grade}&bahce=${code}` : ''
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Matematik Bahçem', text, url })
        return
      }
    } catch {
      /* paylaşım iptal */
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="mt-3 rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-200">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-black text-violet-900"><Share2 size={16} />Gerçek bir arkadaşına gönder</p>
      <p className="mb-2 text-sm font-bold text-violet-900/80">Bu bağlantıyı açan arkadaşın senin bahçeni devam ettirir.</p>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-h-12 min-w-0 flex-1 rounded-xl bg-white px-3 text-sm font-bold text-ink ring-1 ring-violet-200" aria-label="Paylaşım bağlantısı" />
        <button type="button" onClick={share} className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-extrabold text-white active:scale-95">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Kopyalandı' : 'Gönder'}
        </button>
      </div>
    </div>
  )
}
