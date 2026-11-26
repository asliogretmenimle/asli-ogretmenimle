/** Çoklu seçiciler: öğrenme çıktıları ve içerik kimlikleri */
import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { allOutcomes } from '../../data/curriculum'
import type { Grade } from '../../data/types'
import { cx, inputCls } from '../ui'

interface Option {
  value: string
  label: string
  hint?: string
}

export function MultiPicker({ value, onChange, options, placeholder = 'Ara ve ekle…', max }: { value: string[]; onChange: (v: string[]) => void; options: Option[]; placeholder?: string; max?: number }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options])
  const key = (s: string) => s.toLocaleLowerCase('tr')
  const hits = options.filter((o) => !value.includes(o.value) && (!q || key(`${o.value} ${o.label} ${o.hint ?? ''}`).includes(key(q)))).slice(0, 40)
  const full = max !== undefined && value.length >= max
  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <span key={v} className={cx('inline-flex max-w-full items-center gap-1 rounded-lg py-1 pr-1 pl-2.5 text-[13px] font-bold ring-1', i === 0 ? 'bg-brand-soft text-brand-ink ring-brand/20' : 'bg-paper text-ink ring-line')}>
              <span className="truncate" title={byValue.get(v)?.label}>
                {byValue.get(v) ? `${v} · ${byValue.get(v)!.label}` : v}
              </span>
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="grid size-5 shrink-0 place-items-center rounded-md hover:bg-white" aria-label="Kaldır">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {!full && (
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={placeholder} className={inputCls} />
          {open && hits.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl bg-white p-1 shadow-xl ring-1 ring-line">
              {hits.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange([...value, o.value])
                      setQ('')
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-left hover:bg-paper"
                  >
                    <span className="block text-sm font-extrabold">
                      <span className="text-ink-soft">{o.value}</span> · {o.label}
                    </span>
                    {o.hint && <span className="block truncate text-xs font-semibold text-ink-soft">{o.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** Öğrenme çıktısı seçici (verilen sınıflarla sınırlanabilir) */
export function OutcomePicker({ value, onChange, grades, max }: { value: string[]; onChange: (v: string[]) => void; grades?: Grade[]; max?: number }) {
  const options = useMemo(
    () =>
      allOutcomes
        .filter((o) => !grades?.length || grades.includes(o.theme.grade))
        .map((o) => ({ value: o.code, label: o.short, hint: `${o.theme.grade}. sınıf · ${o.theme.title}` })),
    [grades],
  )
  return <MultiPicker value={value} onChange={onChange} options={options} placeholder="Kod ya da konu yazın: MAT.5.1.4, kesir…" max={max} />
}
