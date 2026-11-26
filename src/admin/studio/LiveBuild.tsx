/**
 * Stüdyo canlı inşa görünümü: yapay zekâ yazarken tasarım önizlemede satır satır oluşur,
 * üstünde isimli renkli imleçler (Tasarım, Matematik, Kod, Kontrol) yeni öğelere uçup seçim kutusu çizer.
 *
 * - HTML türleri: kısmi HTML, betikleri ÇALIŞTIRMAYAN (sandbox="allow-same-origin") tek bir iframe'e
 *   document.write ile parça parça yazılır; tarayıcı sayfayı ağdan yükleniyormuş gibi kademeli kurar.
 * - Test: soru kartları React ile kademeli çizilir.
 * - Düşünme aşaması: boş tuvalde ajanlar tel çerçeve eskiz çizer, baş ajan düşüncelerini söyler.
 * Ajan motoru: liveBuildAgents.ts (DOM + requestAnimationFrame, React'e yük bindirmez).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Calculator, Check, Code, Palette, ShieldCheck } from 'lucide-react'
import { MathText } from '../../components/MathText'
import { cx } from '../ui'
import type { StudioKind } from './model'
import type { LiveState } from './stream'
import { AGENTS, AgentDirector, IGNORE_TAGS, LIVE_BUILD_CSS, roleFor, type AgentRole, type Rect } from './liveBuildAgents'

export interface LiveBuildProps {
  kind: StudioKind
  live: LiveState
  /** Değişiklik isteğinde önceki sürümün HTML'i */
  baseHtml?: string | null
  elapsed: number
  device: 'phone' | 'tablet' | 'wide'
  className?: string
}

const DEVICE_W = { phone: 390, tablet: 820 } as const
const ICONS: Record<AgentRole, typeof Palette> = { design: Palette, math: Calculator, code: Code, qa: ShieldCheck }

const THINK_LINES: Record<AgentRole, string[]> = {
  design: ['Fikri tartışıyoruz…', 'Renk paletini ayarlıyorum…', 'Düzeni çiziyorum…'],
  math: ['Sayı aralıklarını seçiyorum…', 'Sınıf düzeyine bakıyorum…', 'Kavram yanılgılarını listeliyorum…'],
  code: ['Etkileşimi planlıyorum…', 'Dokunmatik kontrolleri düşünüyorum…', 'Puanlamayı kuruyorum…'],
  qa: ['Öğrenci gözüyle bakıyorum…', 'Erişilebilirliği not alıyorum…', 'Mobil görünümü düşünüyorum…'],
}

const IFRAME_HEAD = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"><style>html,body{margin:0;height:100%}body{font-family:Nunito,ui-rounded,system-ui,sans-serif;-webkit-font-smoothing:antialiased}</style>`

/** Son düşünce: en fazla iki cümle, ~160 karakter */
function lastThought(thoughts: string[]) {
  const t = (thoughts[thoughts.length - 1] ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const sentences = t.split(/(?<=[.!?…])\s+/)
  let out = sentences.slice(-2).join(' ')
  if (out.length > 160) out = `…${out.slice(-158)}`
  return out
}

function phaseLabel(kind: StudioKind, live: LiveState) {
  if (live.phase === 'connecting') return 'Bağlanıyor'
  if (live.phase === 'thinking') return 'Düşünüyor'
  if (live.phase === 'done') return 'Hazır'
  if (kind === 'test') return 'Soruları yazıyor'
  if (!live.html && live.edits?.length) return 'Düzenliyor'
  if (!hasBodyContent(live.html)) return 'Stilleri yazıyor'
  return /<script\b/i.test(live.html) ? 'Kod yazıyor' : 'Tasarlıyor'
}

/** Betikleri etkisiz şablona çevir (sandbox zaten çalıştırmaz; konsolu da kirletmesin) */
const neutralize = (h: string) => h.replace(/<script\b/gi, '<template data-lb-script').replace(/<\/script>/gi, '</template>')

/** Gövdede görünür bir öğe başladı mı? (Önce uzun <style> bloğu yazılır; o sırada eskiz kalsın) */
const hasBodyContent = (h: string) => {
  const b = h.search(/<body[^>]*>/i)
  if (b >= 0) return /<[a-z]/i.test(h.slice(b).replace(/^<body[^>]*>/i, ''))
  const afterHead = h.search(/<\/head>/i)
  return afterHead >= 0 ? /<[a-z]/i.test(h.slice(afterHead + 7)) : /<(div|main|section|header|h1|h2|p|button|svg|canvas)\b/i.test(h.replace(/<style[\s\S]*?(<\/style>|$)/gi, ''))
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function LiveBuild({ kind, live, baseHtml, elapsed, device, className }: LiveBuildProps) {
  const stage = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const sketch = useRef<HTMLDivElement>(null)
  const quizBox = useRef<HTMLDivElement>(null)
  const director = useRef<AgentDirector | null>(null)
  const deviceBox = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [count, setCount] = useState(0)
  const countRef = useRef(0)

  const isHtmlKind = kind !== 'test'
  const editMode = isHtmlKind && !!baseHtml && !live.html
  const bodyStarted = useMemo(() => hasBodyContent(live.html), [live.html])
  const showSketch = isHtmlKind ? !baseHtml && !bodyStarted : !(live.quiz?.questions?.length ?? 0)
  const done = live.phase === 'done'

  const reduced = useMemo(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  }, [])

  // ------------------------------------------------------------ ölçüler
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pad = box.w < 520 ? 12 : 20
  const availW = Math.max(200, box.w - pad * 2)
  const availH = Math.max(200, box.h - pad * 2)
  const devW = device === 'wide' ? availW : DEVICE_W[device]
  const scale = Math.min(1, availW / devW)
  const devH = availH / scale

  // ------------------------------------------------------------ ajan motoru
  useEffect(() => {
    if (!layer.current) return
    const d = new AgentDirector(layer.current, reduced)
    director.current = d
    return () => {
      d.destroy()
      director.current = null
    }
  }, [reduced])

  // Ajanlar boştayken cihaz çerçevesinin içinde dolaşsın
  useEffect(() => {
    const el = deviceBox.current
    if (!el || !director.current) return
    director.current.setBounds(relRect(el.getBoundingClientRect()))
  }, [box.w, box.h, devW, devH, scale, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Katman koordinatlarında dikdörtgen */
  const relRect = (r: DOMRect | { left: number; top: number; width: number; height: number }): Rect | null => {
    const lr = layer.current?.getBoundingClientRect()
    if (!lr) return null
    return { x: r.left - lr.left, y: r.top - lr.top, w: r.width, h: r.height }
  }

  // iframe içindeki öğenin katmandaki yeri (iframe ölçeklenmiş olabilir)
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const iframeRect = (el: Element): Rect | null => {
    const f = frame.current
    const lr = layer.current?.getBoundingClientRect()
    if (!f || !lr || !el.isConnected) return null
    const fr = f.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const s = scaleRef.current
    const out = { x: fr.left - lr.left + r.left * s, y: fr.top - lr.top + r.top * s, w: r.width * s, h: r.height * s }
    // Görünür alanın tamamen dışındaysa düşür
    if (out.y > fr.bottom - lr.top || out.y + out.h < fr.top - lr.top) return null
    return out
  }

  const bump = (n: number) => {
    countRef.current += n
  }
  useEffect(() => {
    const t = setInterval(() => setCount(countRef.current), 400)
    return () => clearInterval(t)
  }, [])

  // ------------------------------------------------------------ iframe: kademeli yazım
  const written = useRef('')
  const held = useRef('')
  const mode = useRef<'none' | 'base' | 'stream'>('none')
  const feedOn = useRef(false)

  useEffect(() => {
    if (!isHtmlKind) return
    const doc = frame.current?.contentDocument
    if (!doc) return
    if (live.html) {
      if (mode.current !== 'stream' || !live.html.startsWith(written.current)) {
        doc.open()
        doc.write(IFRAME_HEAD)
        written.current = ''
        held.current = ''
        mode.current = 'stream'
        feedOn.current = true
      }
      let chunk = held.current + live.html.slice(written.current.length)
      written.current = live.html
      // Yarım kalmış etiketi (ör. "<scr") bir sonraki parçaya bırak
      const tail = /<[^>]{0,12}$/.exec(chunk)
      held.current = tail ? tail[0] : ''
      if (tail) chunk = chunk.slice(0, -tail[0].length)
      if (chunk) doc.write(neutralize(chunk))
    } else if (baseHtml && mode.current === 'none') {
      doc.open()
      doc.write(IFRAME_HEAD + neutralize(baseHtml))
      doc.close()
      mode.current = 'base'
      feedOn.current = false
    }
  }, [live.html, baseHtml, isHtmlKind])

  // Yeni öğeleri izle → ajanlara görev
  useEffect(() => {
    if (!isHtmlKind) return
    const doc = frame.current?.contentDocument
    if (!doc) return
    const pending: { el: Element; at: number }[] = []
    const seen = new WeakSet<Element>()
    const mo = new MutationObserver((recs) => {
      if (!feedOn.current) return
      const now = performance.now()
      for (const r of recs)
        r.addedNodes.forEach((n) => {
          if (n.nodeType === 1 && !seen.has(n as Element)) {
            seen.add(n as Element)
            pending.push({ el: n as Element, at: now })
          }
        })
      if (pending.length > 400) pending.splice(0, pending.length - 400)
    })
    mo.observe(doc, { childList: true, subtree: true })
    let lastScroll = 0
    const timer = setInterval(() => {
      const d = director.current
      if (!d || !pending.length) return
      const now = performance.now()
      let sent = 0
      let newest: Element | null = null
      while (pending.length && sent < 5 && now - pending[0].at > 220) {
        const { el } = pending.shift()!
        if (IGNORE_TAGS.has(el.tagName) || (el as SVGElement).ownerSVGElement) continue
        const win = el.ownerDocument.defaultView
        const r = el.getBoundingClientRect()
        if (r.width < 14 || r.height < 10) continue
        bump(1)
        const vw = win?.innerWidth ?? 800
        const vh = win?.innerHeight ?? 600
        if (r.width * r.height > vw * vh * 0.72) continue // sarmalayıcılar
        newest = el
        const { role, label } = roleFor(el)
        d.dispatch({ role, label, measure: () => iframeRect(el) })
        sent++
      }
      // Yeni içerik görünür alanın altındaysa yumuşakça kaydır: inşayı izle
      if (newest && now - lastScroll > 900) {
        const win = newest.ownerDocument.defaultView
        const r = newest.getBoundingClientRect()
        if (win && r.bottom > win.innerHeight - 10) {
          lastScroll = now
          win.scrollTo({ top: win.scrollY + r.bottom - win.innerHeight + 60, behavior: reduced ? 'auto' : 'smooth' })
        }
      }
    }, 170)
    return () => {
      mo.disconnect()
      clearInterval(timer)
    }
  }, [isHtmlKind]) // eslint-disable-line react-hooks/exhaustive-deps

  // Düzenleme modu: önceki sürümün üzerinde dolaş, düzenlenen yerlere git
  useEffect(() => {
    if (!editMode) return
    const t = setInterval(() => {
      const d = director.current
      const doc = frame.current?.contentDocument
      if (!d || !doc?.body) return
      const list = Array.from(doc.body.querySelectorAll('h1,h2,h3,p,button,li,svg,canvas,section,article,[class*="card"]')).filter((e) => {
        const r = e.getBoundingClientRect()
        return r.width > 30 && r.height > 14 && r.top < (doc.defaultView?.innerHeight ?? 600)
      })
      if (!list.length) return
      const el = list[Math.floor(Math.random() * list.length)]
      d.dispatch({ role: Math.random() < 0.5 ? 'qa' : 'design', label: 'inceleniyor', measure: () => iframeRect(el) })
    }, 1500)
    return () => clearInterval(t)
  }, [editMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const editsSent = useRef(0)
  useEffect(() => {
    const d = director.current
    const doc = frame.current?.contentDocument
    if (!d || !doc?.body || !live.edits?.length || live.html) return
    for (let i = editsSent.current; i < live.edits.length; i++) {
      const e = live.edits[i]
      if (!e?.find || e.replace === undefined) break
      editsSent.current = i + 1
      const needle = e.find.trim().slice(0, 60)
      let target: Element | null = null
      let best = Infinity
      doc.body.querySelectorAll('*').forEach((el) => {
        if (IGNORE_TAGS.has(el.tagName)) return
        const h = el.outerHTML
        if (h.length < best && h.includes(needle)) {
          best = h.length
          target = el
        }
      })
      const css = !target && /[{};:]/.test(needle)
      const el: Element = target ?? (doc.body.firstElementChild || doc.body)
      const role: AgentRole = css ? 'design' : /\d/.test(needle) ? 'math' : 'code'
      const rep = (e.replace ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      d.dispatch({ role, label: css ? 'stil' : 'düzenliyor', say: `✎ ${rep ? (rep.length > 48 ? `${rep.slice(0, 48)}…` : rep) : 'güncelliyorum'}`, measure: () => iframeRect(el) })
      bump(1)
    }
  }, [live.edits, live.html]) // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ React kaynakları (eskiz, sorular)
  useEffect(() => {
    const roots = [sketch.current, quizBox.current].filter(Boolean) as HTMLElement[]
    const mos = roots.map((root) => {
      const mo = new MutationObserver((recs) => {
        const d = director.current
        if (!d) return
        let added = false
        for (const r of recs)
          r.addedNodes.forEach((n) => {
            if (n.nodeType !== 1) return
            const els = [(n as Element), ...Array.from((n as Element).querySelectorAll('[data-lb]'))].filter((e) => e.hasAttribute('data-lb'))
            if (els.length) added = true
            els.forEach((el) => {
              const [role, label] = (el.getAttribute('data-lb') ?? 'design:blok').split(':') as [AgentRole, string]
              bump(1)
              window.setTimeout(() => d.dispatch({ role, label, measure: () => (el.isConnected ? relRect(el.getBoundingClientRect()) : null) }), 120)
            })
          })
        // Soru listesi büyüdükçe en alta kaydır
        if (added && root === quizBox.current) root.scrollTo({ top: root.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
      })
      mo.observe(root, { childList: true, subtree: true })
      return mo
    })
    return () => mos.forEach((m) => m.disconnect())
  }, [showSketch, kind]) // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ düşünceler ve bitiş
  const thought = lastThought(live.thoughts)
  const [generic, setGeneric] = useState(0)
  const thinking = live.phase === 'connecting' || live.phase === 'thinking'
  useEffect(() => {
    if (!thinking) return
    const t = setInterval(() => {
      setGeneric((g) => g + 1)
      const roles: AgentRole[] = ['math', 'code', 'qa']
      const r = roles[Math.floor(Math.random() * roles.length)]
      director.current?.say(r, THINK_LINES[r][Math.floor(Math.random() * THINK_LINES[r].length)], 2400)
    }, 3400)
    return () => clearInterval(t)
  }, [thinking])
  useEffect(() => {
    const d = director.current
    if (!d) return
    if (done || !thinking) return d.setThought('')
    d.setThought(thought || (live.phase === 'connecting' ? 'Ekibi topluyorum…' : THINK_LINES.design[generic % THINK_LINES.design.length]))
  }, [thought, thinking, done, generic, live.phase])
  useEffect(() => {
    director.current?.setConverge(done)
  }, [done])

  // ------------------------------------------------------------ çizim
  const progress = done ? 100 : thinking ? Math.min(22, 4 + elapsed * 0.5) : Math.min(96, 22 + (live.chars / (kind === 'test' ? 7000 : 16000)) * 74)
  const label = phaseLabel(kind, live)

  return (
    <div className={cx('flex min-h-0 flex-col overflow-hidden bg-paper', className)}>
      <style>{LIVE_BUILD_CSS}</style>

      {/* Canlı durum çubuğu */}
      <div className="relative flex h-11 shrink-0 items-center gap-3 border-b border-line bg-white px-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bad-soft px-2 py-0.5 text-[10px] font-black tracking-widest text-bad">
          <span className="relative flex size-2">
            {!done && <span className="absolute inline-flex size-full rounded-full bg-bad opacity-60" style={{ animation: 'lb-ping 1.4s cubic-bezier(0,0,.2,1) infinite' }} />}
            <span className="relative inline-flex size-2 rounded-full bg-bad" />
          </span>
          CANLI
        </span>
        <span className="flex -space-x-1.5">
          {AGENTS.map((a) => {
            const Icon = ICONS[a.id]
            return (
              <span key={a.id} title={a.name} className="grid size-6 place-items-center rounded-full text-white ring-2 ring-white" style={{ background: a.color }}>
                <Icon size={12} strokeWidth={2.6} />
              </span>
            )
          })}
        </span>
        <span className="min-w-0 truncate text-sm font-black text-ink">
          {label}
          {!done && <span className="ml-0.5 inline-block w-3 text-left">{'.'.repeat(1 + (Math.floor(elapsed * 2) % 3))}</span>}
        </span>
        <span className="ml-auto hidden items-center gap-3 text-xs font-bold text-ink-soft tabular-nums sm:flex">
          <span>{live.chars.toLocaleString('tr-TR')} karakter</span>
          <span>{count} öğe</span>
        </span>
        <span className="text-xs font-black text-ink-soft tabular-nums max-sm:ml-auto">{fmtTime(elapsed)}</span>
        <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-brand/10">
          <div className="h-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
          {!done && <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" style={{ animation: 'lb-shimmer 1.4s linear infinite' }} />}
        </div>
      </div>

      {/* Sahne */}
      <div ref={stage} className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(#dfe2ea_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="absolute inset-0 flex justify-center" style={{ padding: pad }}>
          <div ref={deviceBox} className="relative shrink-0" style={{ width: devW * scale, height: devH * scale }}>
            <div
              className={cx('absolute top-0 left-0 overflow-hidden bg-white shadow-[var(--shadow-lift)]', device === 'phone' ? 'rounded-[30px] ring-[6px] ring-ink/85' : 'rounded-2xl ring-1 ring-line')}
              style={{ width: devW, height: devH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
              {isHtmlKind && (
                <iframe
                  ref={frame}
                  title="Canlı inşa"
                  sandbox="allow-same-origin"
                  className="block size-full border-0 transition-opacity duration-500"
                  style={{ opacity: showSketch ? 0 : 1 }}
                />
              )}
              {kind === 'test' && <QuizBoard boxRef={quizBox} live={live} />}
              {showSketch && <SketchBoard boxRef={sketch} kind={kind} live={live} />}
            </div>
          </div>
        </div>

        {/* Ajan katmanı */}
        <div ref={layer} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />

        {done && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center" style={{ animation: 'lb-pop .55s cubic-bezier(.34,1.56,.64,1) both' }}>
              <span className="grid size-16 place-items-center rounded-full bg-ok text-white shadow-[0_10px_30px_rgb(22_163_74/.35)] ring-8 ring-white">
                <Check size={34} strokeWidth={3} />
              </span>
              <span className="mt-3 rounded-full bg-white px-4 py-1.5 text-base font-black text-ink shadow-[var(--shadow-lift)] ring-1 ring-line">Hazır!</span>
            </div>
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {label}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Düşünme tuvali: tel çerçeve eskiz kademeli çizilir
// ---------------------------------------------------------------------------
interface Block {
  id: string
  role: AgentRole
  label: string
  cls: string
  /** Çizgi rengi (ajan rengi) */
  color: string
}

const SKETCH: Omit<Block, 'color'>[] = [
  { id: 'bar', role: 'design', label: 'üst bar', cls: 'col-span-6 h-11' },
  { id: 'c1', role: 'math', label: 'kart', cls: 'col-span-2 h-24' },
  { id: 'c2', role: 'math', label: 'kart', cls: 'col-span-2 h-24' },
  { id: 'c3', role: 'design', label: 'kart', cls: 'col-span-2 h-24' },
  { id: 'board', role: 'code', label: 'oyun alanı', cls: 'col-span-6 min-h-40 flex-1' },
  { id: 'b1', role: 'code', label: 'düğme', cls: 'col-span-2 col-start-2 h-11 !rounded-full' },
  { id: 'b2', role: 'qa', label: 'düğme', cls: 'col-span-2 h-11 !rounded-full' },
]
const QUIZ_SKETCH: Omit<Block, 'color'>[] = [
  { id: 'q', role: 'math', label: 'soru', cls: 'col-span-6 h-16' },
  { id: 'a1', role: 'math', label: 'seçenek', cls: 'col-span-3 h-12' },
  { id: 'a2', role: 'qa', label: 'seçenek', cls: 'col-span-3 h-12' },
  { id: 'a3', role: 'math', label: 'seçenek', cls: 'col-span-3 h-12' },
  { id: 'a4', role: 'qa', label: 'seçenek', cls: 'col-span-3 h-12' },
  { id: 'e', role: 'design', label: 'açıklama', cls: 'col-span-6 h-10' },
]
const roleColor = (r: AgentRole) => AGENTS.find((a) => a.id === r)!.color

function SketchBoard({ boxRef, kind, live }: { boxRef: RefObject<HTMLDivElement>; kind: StudioKind; live: LiveState }) {
  const blocks = (kind === 'test' ? QUIZ_SKETCH : SKETCH).map((b) => ({ ...b, color: roleColor(b.role) }))
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= blocks.length ? x : x + 1)), 1150)
    return () => clearInterval(t)
  }, [blocks.length])
  const title = live.meta?.title ?? ''
  const emoji = live.meta?.emoji ?? ''
  return (
    <div ref={boxRef} className="absolute inset-0 flex flex-col bg-white p-5 sm:p-7">
      <div className="mb-5 flex min-h-12 items-center gap-3">
        <span className={cx('grid size-12 shrink-0 place-items-center rounded-2xl bg-paper text-2xl ring-1 ring-line transition', emoji && 'bg-brand-soft')} data-lb={emoji ? 'design:simge' : undefined} key={emoji ? 'e1' : 'e0'}>
          {emoji || <span className="size-5 animate-pulse rounded-md bg-line" />}
        </span>
        <div className="min-w-0 flex-1">
          {title ? (
            <p className="truncate text-xl font-black text-ink" data-lb="design:başlık" key="t1">
              {title}
              <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-0.5 bg-brand" style={{ animation: 'lb-caret 1s steps(1) infinite' }} />
            </p>
          ) : (
            <div className="space-y-2">
              <div className="h-4 w-2/3 max-w-72 animate-pulse rounded-full bg-line" />
              <div className="h-3 w-1/3 max-w-44 animate-pulse rounded-full bg-line/70" />
            </div>
          )}
          {live.meta?.description && <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-ink-soft">{live.meta.description}</p>}
        </div>
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-6 content-start gap-3">
        {blocks.slice(0, n).map((b) => (
          <div key={b.id} data-lb={`${b.role}:${b.label}`} className={cx('relative overflow-hidden rounded-2xl', b.cls)} style={{ animation: 'lb-rise .4s ease-out both' }}>
            <svg className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <rect x="1" y="1" rx={b.cls.includes('rounded-full') ? 22 : 16} fill="none" stroke={b.color} strokeWidth="2" strokeDasharray="100" pathLength={100} style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)', animation: 'lb-draw .9s ease-out both' }} />
            </svg>
            <div className="absolute inset-[3px] rounded-[13px]" style={{ background: `${b.color}0d`, animation: 'lb-fill .5s .7s ease-out both' }} />
            {b.id === 'board' && (
              <div className="absolute inset-0 grid place-items-center" style={{ animation: 'lb-fill .5s 1s ease-out both' }}>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="size-9 rounded-xl border-2 border-dashed" style={{ borderColor: `${b.color}55` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Test: soru kartları kademeli
// ---------------------------------------------------------------------------
function QuizBoard({ boxRef, live }: { boxRef: RefObject<HTMLDivElement>; live: LiveState }) {
  const qs = live.quiz?.questions ?? []
  return (
    <div ref={boxRef} className="absolute inset-0 overflow-y-auto bg-paper p-4 sm:p-6">
      {(live.meta?.title || live.quiz?.instructions) && (
        <div className="mb-4">
          {live.meta?.title && (
            <p className="text-lg font-black text-ink" data-lb="design:başlık">
              {live.meta.emoji} {live.meta.title}
            </p>
          )}
          {live.quiz?.instructions && <p className="text-sm font-semibold text-ink-soft">{live.quiz.instructions}</p>}
        </div>
      )}
      <ol className="space-y-3">
        {qs.map((q, i) => (
          <li key={i} data-lb="math:soru" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line" style={{ animation: 'lb-rise .45s ease-out both' }}>
            <div className="flex items-start gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-black text-brand-ink">{i + 1}</span>
              <div className="min-w-0 flex-1 text-[15px] font-extrabold text-ink">{q?.prompt ? <MathText text={q.prompt} /> : <span className="inline-block h-4 w-40 animate-pulse rounded bg-line" />}</div>
            </div>
            {!!q?.choices?.length && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.choices.map((c, j) => {
                  const correct = typeof q.answer === 'number' && q.answer === j
                  return (
                    <div
                      key={j}
                      data-lb={j % 2 ? 'qa:seçenek' : 'math:seçenek'}
                      className={cx('flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ring-1 transition-colors duration-500', correct ? 'bg-ok-soft text-green-900 ring-green-200' : 'bg-paper text-ink ring-line')}
                      style={{ animation: 'lb-rise .35s ease-out both' }}
                    >
                      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-white text-[10px] font-black text-ink-soft ring-1 ring-line">{String.fromCharCode(65 + j)}</span>
                      <span className="min-w-0 flex-1">
                        <MathText text={c ?? ''} />
                      </span>
                      {correct && <Check size={15} className="shrink-0 text-ok" strokeWidth={3} />}
                    </div>
                  )
                })}
              </div>
            )}
            {q?.explain && (
              <p data-lb="design:açıklama" className="mt-2.5 rounded-xl bg-cream px-3 py-2 text-xs font-semibold text-ink-soft" style={{ animation: 'lb-rise .35s ease-out both' }}>
                💡 <MathText text={q.explain} />
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
