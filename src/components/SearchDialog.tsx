import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Search, X } from 'lucide-react'
import { useSiteSearch } from '../lib/siteSearch'

const SUGGESTIONS = ['kesirler', 'çarpma', 'saat', 'açılar', 'örüntü', 'olasılık', 'onluk taban', 'denklem']

/** Her sayfadan açılan hızlı arama: Ctrl+K ya da "/" kısayolu */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { groups, loading } = useSiteSearch(q, 5)
  const flat = groups.flatMap((g) => g.hits)

  useEffect(() => {
    if (!open) return
    setQ('')
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const go = (to: string) => {
    onClose()
    navigate(to)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (flat[active]) go(flat[active].to)
      else if (q.trim()) go(`/?ara=${encodeURIComponent(q.trim())}`)
    }
  }

  let i = -1
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 p-3 pt-[8vh] backdrop-blur-sm sm:pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Sitede ara" className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-lift)] ring-1 ring-line animate-fade-up" onKeyDown={onKey}>
        <label className="flex items-center gap-3 border-b border-line px-4">
          <Search size={20} className="shrink-0 text-ink-soft" />
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Konu, oyun ya da materyal ara…"
            className="h-14 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-ink-soft/60"
            aria-label="Ara"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="arama-sonuclari"
            aria-activedescendant={flat[active] ? `arama-${active}` : undefined}
          />
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-paper" aria-label="Kapat">
            <X size={18} />
          </button>
        </label>

        <div ref={listRef} id="arama-sonuclari" role="listbox" className="overflow-y-auto p-2">
          {!q.trim() ? (
            <div className="p-3">
              <p className="mb-2 text-xs font-bold text-ink-soft">Sık arananlar</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setQ(s)} className="pill">{s}</button>
                ))}
              </div>
            </div>
          ) : groups.length === 0 ? (
            <p className="p-6 text-center text-sm font-semibold text-ink-soft">{loading ? 'Aranıyor…' : `“${q}” için sonuç bulunamadı.`}</p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="mb-1">
                <p className="px-3 pt-2 pb-1 text-xs font-bold text-ink-soft">{g.label}</p>
                {g.hits.map((h) => {
                  i++
                  const idx = i
                  return (
                    <Link
                      key={h.key}
                      id={`arama-${idx}`}
                      data-i={idx}
                      role="option"
                      aria-selected={idx === active}
                      to={h.to}
                      onClick={onClose}
                      onMouseMove={() => setActive(idx)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${idx === active ? 'bg-paper' : ''}`}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper text-lg font-bold text-ink-soft" aria-hidden>{h.emoji ?? h.badge}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-ink">{h.title}</span>
                        <span className="block truncate text-xs font-semibold text-ink-soft">{h.sub}</span>
                      </span>
                      {idx === active && <ArrowRight size={16} className="shrink-0 text-ink-soft" />}
                    </Link>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {q.trim() && (
          <Link to={`/?ara=${encodeURIComponent(q.trim())}`} onClick={onClose} className="flex items-center justify-center gap-1 border-t border-line px-4 py-3 text-sm font-bold text-brand hover:bg-paper">
            Tüm sonuçları gör <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </div>
  )
}

/** Ctrl+K / ⌘K ya da "/" ile aramayı aç */
export function useSearchShortcut(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
}
