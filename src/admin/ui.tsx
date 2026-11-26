/** Panelin ortak arayüz parçaları */
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, ChevronDown, GripVertical, Info, Loader2, Plus, Trash2, X } from 'lucide-react'
import type { Grade } from '../data/types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ---------------------------------------------------------------------------
// Düğmeler
// ---------------------------------------------------------------------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/90 shadow-sm',
  secondary: 'bg-white text-ink ring-1 ring-line hover:bg-paper shadow-sm',
  ghost: 'text-ink-soft hover:bg-paper hover:text-ink',
  danger: 'bg-white text-bad ring-1 ring-bad/30 hover:bg-bad-soft',
  soft: 'bg-brand-soft text-brand-ink hover:bg-brand/15',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-bold whitespace-nowrap transition select-none disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : size === 'lg' ? 'h-12 px-5 text-base' : 'h-10 px-3.5 text-sm',
        variants[variant],
        className,
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={cx('grid size-8 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-40', className)}>
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Form alanları
// ---------------------------------------------------------------------------
export const inputCls =
  'w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink-soft/60 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-paper'

export function Field({ label, help, error, children, counter, className, action }: { label?: ReactNode; help?: ReactNode; error?: string | null; children: ReactNode; counter?: { n: number; max: number }; className?: string; action?: ReactNode }) {
  return (
    <div className={cx('block', className)}>
      {(label || counter || action) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {label && <span className="text-[13px] font-extrabold text-ink">{label}</span>}
          <span className="flex items-center gap-2">
            {counter && <span className={cx('text-xs font-bold tabular-nums', counter.n > counter.max ? 'text-bad' : 'text-ink-soft')}>{counter.n}/{counter.max}</span>}
            {action}
          </span>
        </div>
      )}
      {children}
      {error ? <p className="mt-1 text-xs font-bold text-bad">{error}</p> : help ? <p className="mt-1 text-xs font-semibold text-ink-soft">{help}</p> : null}
    </div>
  )
}

export function TextInput({ value, onChange, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & { value: string; onChange: (v: string) => void }) {
  return <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, className)} />
}

/** İçeriğe göre uzayan metin kutusu */
export function TextArea({ value, onChange, className, minRows = 2, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & { value: string; onChange: (v: string) => void; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight + 2, 520)}px`
  }, [value])
  return <textarea ref={ref} rows={minRows} {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'resize-y leading-relaxed', className)} />
}

export function Select<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={cx(inputCls, 'appearance-none pr-9')}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-soft" />
    </div>
  )
}

export function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; help?: ReactNode }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-ok peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block text-sm font-extrabold">{label}</span>
        {help && <span className="block text-xs font-semibold text-ink-soft">{help}</span>}
      </span>
    </label>
  )
}

/** Sınıf seçici: çoklu (dizi) */
export function GradePicker({ value, onChange, single }: { value: Grade[]; onChange: (g: Grade[]) => void; single?: boolean }) {
  const all: Grade[] = [1, 2, 3, 4, 5, 6, 7, 8]
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((g) => {
        const on = value.includes(g)
        return (
          <button
            key={g}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(single ? [g] : on ? value.filter((x) => x !== g) : [...value, g].sort((a, b) => a - b))}
            className={cx('size-10 rounded-xl text-sm font-black ring-1 transition', on ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-soft ring-line hover:text-ink')}
          >
            {g}
          </button>
        )
      })}
    </div>
  )
}

/** Metin listesi düzenleyici (adımlar, ipuçları, seçenekler …) */
export function ListEditor({ value, onChange, placeholder, addLabel = 'Ekle', multiline, renderPrefix }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; addLabel?: string; multiline?: boolean; renderPrefix?: (i: number) => ReactNode }) {
  const set = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= value.length) return
    const next = value.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div key={i} className="group flex items-start gap-1.5">
          {renderPrefix ? renderPrefix(i) : <span className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-full bg-paper text-[11px] font-black text-ink-soft ring-1 ring-line">{i + 1}</span>}
          <div className="min-w-0 flex-1">{multiline ? <TextArea value={v} onChange={(x) => set(i, x)} placeholder={placeholder} minRows={1} /> : <TextInput value={v} onChange={(x) => set(i, x)} placeholder={placeholder} />}</div>
          <div className="mt-1 flex opacity-60 group-hover:opacity-100">
            <IconButton label="Yukarı taşı" onClick={() => move(i, -1)} disabled={i === 0}>
              <GripVertical size={15} />
            </IconButton>
            <IconButton label="Sil" onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-bad">
              <Trash2 size={15} />
            </IconButton>
          </div>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus size={15} />} onClick={() => onChange([...value, ''])}>
        {addLabel}
      </Button>
    </div>
  )
}

/** JSON düzenleyici: geçersizken kaydetmez, hatayı gösterir */
export function JsonEditor({ value, onChange, rows = 10, label }: { value: unknown; onChange: (v: unknown) => void; rows?: number; label?: string }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2))
  const [err, setErr] = useState<string | null>(null)
  const last = useRef(value)
  useEffect(() => {
    if (value !== last.current) {
      last.current = value
      setText(JSON.stringify(value ?? null, null, 2))
      setErr(null)
    }
  }, [value])
  return (
    <Field label={label} error={err}>
      <textarea
        value={text}
        rows={rows}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value)
          try {
            const v = JSON.parse(e.target.value)
            setErr(null)
            last.current = v
            onChange(v)
          } catch (x) {
            setErr(`Geçersiz JSON: ${(x as Error).message}`)
          }
        }}
        className={cx(inputCls, 'font-mono text-[12.5px] leading-relaxed')}
      />
    </Field>
  )
}

// ---------------------------------------------------------------------------
// Kartlar, rozetler, başlıklar
// ---------------------------------------------------------------------------
export function Card({ children, className, title, desc, action, pad = true }: { children?: ReactNode; className?: string; title?: ReactNode; desc?: ReactNode; action?: ReactNode; pad?: boolean }) {
  return (
    <section className={cx('rounded-2xl bg-white ring-1 ring-line shadow-[var(--shadow-card)]', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-black">{title}</h3>}
            {desc && <p className="mt-0.5 text-xs font-semibold text-ink-soft">{desc}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

export type Tone = 'gray' | 'green' | 'blue' | 'amber' | 'red' | 'pink' | 'violet'
const tones: Record<Tone, string> = {
  gray: 'bg-paper text-ink-soft ring-line',
  green: 'bg-ok-soft text-green-800 ring-green-200',
  blue: 'bg-blue-50 text-blue-800 ring-blue-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-bad-soft text-red-800 ring-red-200',
  pink: 'bg-brand-soft text-brand-ink ring-brand/20',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
}
export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap ring-1', tones[tone], className)}>{children}</span>
}

export function PageHead({ title, desc, actions, crumbs }: { title: ReactNode; desc?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {crumbs && <div className="mb-1 text-xs font-bold text-ink-soft">{crumbs}</div>}
        <h1 className="text-2xl font-black tracking-tight sm:text-[28px]">{title}</h1>
        {desc && <p className="mt-1 max-w-3xl text-sm font-semibold text-ink-soft">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Empty({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border-2 border-dashed border-line bg-white/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-paper text-ink-soft">{icon}</div>}
      <p className="font-black">{title}</p>
      {desc && <p className="mt-1 max-w-md text-sm font-semibold text-ink-soft">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Callout({ tone = 'blue', title, children, icon }: { tone?: 'blue' | 'amber' | 'red' | 'green'; title?: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  const t = { blue: 'bg-blue-50 ring-blue-200 text-blue-900', amber: 'bg-amber-50 ring-amber-200 text-amber-900', red: 'bg-bad-soft ring-red-200 text-red-900', green: 'bg-ok-soft ring-green-200 text-green-900' }[tone]
  return (
    <div className={cx('flex gap-3 rounded-2xl p-4 text-sm ring-1', t)}>
      <span className="mt-0.5 shrink-0">{icon ?? (tone === 'red' || tone === 'amber' ? <AlertTriangle size={18} /> : tone === 'green' ? <Check size={18} /> : <Info size={18} />)}</span>
      <div className="min-w-0 font-semibold">
        {title && <p className="font-black">{title}</p>}
        {children}
      </div>
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cx('-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-extrabold whitespace-nowrap transition', t.value === value ? 'border-brand text-ink' : 'border-transparent text-ink-soft hover:text-ink')}
        >
          {t.label}
          {t.count !== undefined && <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', t.value === value ? 'bg-brand-soft text-brand-ink' : 'bg-paper text-ink-soft')}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Segmentli seçim (küçük) */
export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-xl bg-paper p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx('inline-flex items-center gap-1.5 rounded-lg font-extrabold transition', size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-sm', o.value === value ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-ink-soft hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pencere (modal) ve onay
// ---------------------------------------------------------------------------
export function Modal({ open, onClose, title, desc, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; desc?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', on)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size]
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={cx('flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-fade-up sm:rounded-3xl', w)}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-black">{title}</h2>
            {desc && <p className="mt-0.5 text-sm font-semibold text-ink-soft">{desc}</p>}
          </div>
          <IconButton label="Kapat" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper/60 px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmOpts {
  title: string
  desc?: ReactNode
  confirm?: string
  danger?: boolean
}
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmCtx)

// ---------------------------------------------------------------------------
// Bildirimler
// ---------------------------------------------------------------------------
interface ToastItem {
  id: number
  text: ReactNode
  tone: 'ok' | 'error' | 'info'
}
const ToastCtx = createContext<(text: ReactNode, tone?: ToastItem['tone']) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirm, setConfirm] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const toast = useCallback((text: ReactNode, tone: ToastItem['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500)
  }, [])
  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirm({ ...o, resolve })), [])
  const close = (v: boolean) => {
    confirm?.resolve(v)
    setConfirm(null)
  }
  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={ask}>
        {children}
        <Modal
          open={!!confirm}
          onClose={() => close(false)}
          title={confirm?.title ?? ''}
          size="sm"
          footer={
            <>
              <Button onClick={() => close(false)}>Vazgeç</Button>
              <Button variant={confirm?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                {confirm?.confirm ?? 'Onayla'}
              </Button>
            </>
          }
        >
          <div className="text-sm font-semibold text-ink-soft">{confirm?.desc}</div>
        </Modal>
        <div className="pointer-events-none fixed right-4 bottom-4 z-[200] flex w-[min(92vw,380px)] flex-col gap-2">
          {toasts.map((t) => (
            <div key={t.id} className={cx('pointer-events-auto flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-lg ring-1 animate-fade-up', t.tone === 'error' ? 'bg-white text-bad ring-bad/30' : t.tone === 'info' ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line')}>
              {t.tone === 'ok' ? <Check size={18} className="mt-0.5 shrink-0 text-ok" /> : t.tone === 'error' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <Info size={18} className="mt-0.5 shrink-0" />}
              <div className="min-w-0">{t.text}</div>
            </div>
          ))}
        </div>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  )
}

/** "3 dk önce" */
export function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'az önce'
  if (d < 3600) return `${Math.floor(d / 60)} dk önce`
  if (d < 86400) return `${Math.floor(d / 3600)} saat önce`
  if (d < 86400 * 7) return `${Math.floor(d / 86400)} gün önce`
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Türkçe metinden URL kısa adı */
export function slugify(s: string) {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u', â: 'a', î: 'i', û: 'u' }
  return s
    .replace(/[çğıİöşüÇĞÖŞÜâîû]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
export const isSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)

/** Kısayol: Ctrl/Cmd + S */
export function useSaveShortcut(fn: () => void, enabled = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!enabled) return
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        ref.current()
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [enabled])
}
