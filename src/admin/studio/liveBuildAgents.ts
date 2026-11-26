/**
 * Canlı inşa: çoklu ajan imleç motoru (Figma'daki çok oyunculu imleçler gibi).
 *
 * React dışında, doğrudan DOM üzerinde çalışır: her ajanın konumu yay (spring) fiziğiyle
 * requestAnimationFrame'de güncellenir ve yalnızca transform yazılır (60 fps, yerleşim hesabı yok).
 * İçerik kaynakları (iframe'deki HTML, soru kartları, eskiz blokları) "görev" üretir; görevler
 * ajanlara rollerine göre dağıtılır, ajan oraya süzülür, tıklar, kesikli seçim kutusu çizer.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type AgentRole = 'design' | 'math' | 'code' | 'qa'

export interface AgentDef {
  id: AgentRole
  name: string
  color: string
  /** Ara sıra söylediği kısa cümleler */
  lines: string[]
}

export const AGENTS: AgentDef[] = [
  { id: 'design', name: 'Tasarım', color: '#d6457a', lines: ['Kartları hizalıyorum', 'Renkleri yumuşatıyorum', 'Boşlukları ayarlıyorum', 'Yazı boyutu tamam', 'Köşeleri yuvarlıyorum'] },
  { id: 'math', name: 'Matematik', color: '#2563eb', lines: ['Sayıları kontrol ediyorum', 'Bu işlem doğru ✓', 'Zorluğu sınıfa göre ayarlıyorum', 'Çeldiricileri seçiyorum', 'Cevapları iki kez sayıyorum'] },
  { id: 'code', name: 'Kod', color: '#16a34a', lines: ['Düğmeyi bağlıyorum', 'Sürükle-bırak ekliyorum', 'Dokunmatik desteği ✓', 'Animasyonu yazıyorum', 'Puanı hesaplıyorum'] },
  { id: 'qa', name: 'Kontrol', color: '#d97706', lines: ['Telefonda deniyorum', 'Erişilebilirlik ✓', 'Hata yok gibi', 'Okunabilirlik iyi', 'Sınıf seviyesine uygun'] },
]

export interface Task {
  /** Hedefin güncel konumu (katman koordinatlarında); yoksa görev düşer */
  measure: () => Rect | null
  /** Seçim kutusundaki etiket (ör. "button") */
  label: string
  role: AgentRole
  /** Varınca söyleyeceği (yoksa ara sıra rol cümlesi) */
  say?: string
  /** Seçim kutusu çizilmesin (yalnızca dolaşma) */
  quiet?: boolean
}

interface AgentState {
  def: AgentDef
  el: HTMLDivElement
  bubble: HTMLDivElement
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  mode: 'idle' | 'moving' | 'dwell'
  until: number
  queue: Task[]
  current: Task | null
  lastSay: number
  flipped: boolean
}

const STIFF = 0.055
const DAMP = 0.8

export class AgentDirector {
  private layer: HTMLDivElement
  private agents: AgentState[] = []
  private raf = 0
  private last = 0
  private reduced: boolean
  private converge: { x: number; y: number } | null = null
  private paused = false
  /** Düşünme sırasında baş ajanın sürekli balonu */
  private thought: HTMLDivElement | null = null

  constructor(layer: HTMLDivElement, reduced: boolean) {
    this.layer = layer
    this.reduced = reduced
    const { w, h } = this.size()
    AGENTS.forEach((def, i) => {
      const el = document.createElement('div')
      el.className = 'lb-agent'
      el.style.setProperty('--c', def.color)
      el.innerHTML = `
        <svg class="lb-arrow" width="22" height="24" viewBox="0 0 22 24" aria-hidden="true">
          <path d="M2 2 L2 19 L6.6 14.9 L9.6 21.6 L12.6 20.3 L9.7 13.7 L16 13.4 Z" fill="${def.color}" stroke="white" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
        <span class="lb-name">${def.name}</span>`
      const bubble = document.createElement('div')
      bubble.className = 'lb-bubble'
      el.appendChild(bubble)
      if (i === 0) {
        const t = document.createElement('div')
        t.className = 'lb-thought'
        el.appendChild(t)
        this.thought = t
      }
      layer.appendChild(el)
      const home = this.home(i, w, h)
      this.agents.push({ def, el, bubble, x: home.x, y: home.y, vx: 0, vy: 0, tx: home.x, ty: home.y, mode: 'idle', until: performance.now() + 300 + i * 250, queue: [], current: null, lastSay: 0, flipped: false })
    })
    this.raf = requestAnimationFrame(this.tick)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.agents.forEach((a) => a.el.remove())
    this.layer.querySelectorAll('.lb-hl,.lb-pulse').forEach((n) => n.remove())
  }

  private size() {
    return { w: this.layer.clientWidth || 600, h: this.layer.clientHeight || 400 }
  }

  /** Her ajanın dolaştığı bölge: üst üste binmesinler */
  private home(i: number, w: number, h: number) {
    const cols = [0.28, 0.72, 0.3, 0.7]
    const rows = [0.3, 0.34, 0.68, 0.72]
    return { x: w * cols[i % 4], y: h * rows[i % 4] }
  }

  setPaused(p: boolean) {
    this.paused = p
  }

  /** Düşünme balonu (boş metin gizler) */
  setThought(text: string) {
    if (!this.thought) return
    this.thought.textContent = text
    this.thought.classList.toggle('lb-show', !!text)
  }

  /** Bitiş: hepsi ortada toplanır */
  setConverge(on: boolean) {
    if (!on) return void (this.converge = null)
    const { w, h } = this.size()
    this.converge = { x: w / 2, y: h / 2 }
    this.agents.forEach((a, i) => {
      a.queue = []
      a.current = null
      const ang = (i / this.agents.length) * Math.PI * 2 - Math.PI / 2
      a.tx = w / 2 + Math.cos(ang) * 86 - 4
      a.ty = h / 2 + Math.sin(ang) * 70 - 4
      a.mode = 'moving'
      if (this.reduced) {
        a.x = a.tx
        a.y = a.ty
      }
    })
  }

  /** Görevi rolüne uygun (ya da en boş) ajana ver */
  dispatch(t: Task) {
    if (this.converge) return
    const pref = this.agents.find((a) => a.def.id === t.role)!
    const target = pref.queue.length < 2 ? pref : this.agents.reduce((m, a) => (a.queue.length + (a.current ? 1 : 0) < m.queue.length + (m.current ? 1 : 0) ? a : m), pref)
    target.queue.push(t)
    if (target.queue.length > 3) target.queue.shift()
  }

  /** Belirli bir ajana söylet */
  say(role: AgentRole, text: string, ms = 2600) {
    const a = this.agents.find((x) => x.def.id === role)
    if (a) this.showBubble(a, text, ms)
  }

  private showBubble(a: AgentState, text: string, ms: number) {
    a.bubble.textContent = text
    a.bubble.classList.add('lb-show')
    a.lastSay = performance.now()
    const stamp = a.lastSay
    window.setTimeout(() => {
      if (a.lastSay === stamp) a.bubble.classList.remove('lb-show')
    }, ms)
  }

  private highlight(r: Rect, a: AgentState, label: string) {
    const hl = document.createElement('div')
    hl.className = 'lb-hl'
    hl.style.setProperty('--c', a.def.color)
    hl.style.transform = `translate3d(${r.x - 3}px, ${r.y - 3}px, 0)`
    hl.style.width = `${r.w + 6}px`
    hl.style.height = `${r.h + 6}px`
    const tag = document.createElement('span')
    tag.textContent = `${a.def.name} · ${label}`
    hl.appendChild(tag)
    this.layer.appendChild(hl)
    requestAnimationFrame(() => hl.classList.add('lb-in'))
    window.setTimeout(() => hl.classList.remove('lb-in'), 1250)
    window.setTimeout(() => hl.remove(), 1700)
  }

  private pulse(a: AgentState) {
    const p = document.createElement('div')
    p.className = 'lb-pulse'
    p.style.setProperty('--c', a.def.color)
    p.style.transform = `translate3d(${a.x - 14}px, ${a.y - 14}px, 0)`
    this.layer.appendChild(p)
    window.setTimeout(() => p.remove(), 700)
  }

  private clampPoint(x: number, y: number) {
    const { w, h } = this.size()
    return { x: Math.max(6, Math.min(w - 30, x)), y: Math.max(6, Math.min(h - 30, y)) }
  }

  private tick = (now: number) => {
    const dt = Math.min(48, now - (this.last || now)) / 16.67
    this.last = now
    const { w, h } = this.size()
    this.agents.forEach((a, i) => {
      if (!this.paused) this.step(a, i, now, w, h)
      // Yay fiziği (hafif aşma ile süzülme)
      if (this.reduced) {
        a.x = a.tx
        a.y = a.ty
      } else {
        a.vx = (a.vx + (a.tx - a.x) * STIFF * dt) * Math.pow(DAMP, dt)
        a.vy = (a.vy + (a.ty - a.y) * STIFF * dt) * Math.pow(DAMP, dt)
        a.x += a.vx * dt
        a.y += a.vy * dt
      }
      a.el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`
      // Sağ kenara yakınsa balonları sola aç
      const flip = a.x > w - 250
      if (flip !== a.flipped) {
        a.flipped = flip
        a.el.classList.toggle('lb-flip', flip)
      }
    })
    this.separate()
    this.raf = requestAnimationFrame(this.tick)
  }

  /** İki ajan aynı noktaya yığılmasın */
  private separate() {
    for (let i = 0; i < this.agents.length; i++)
      for (let j = i + 1; j < this.agents.length; j++) {
        const a = this.agents[i]
        const b = this.agents[j]
        const dx = b.tx - a.tx
        const dy = b.ty - a.ty
        if (dx * dx + dy * dy < 34 * 34 && !this.converge) {
          b.tx += dx >= 0 ? 26 : -26
          b.ty += 14
        }
      }
  }

  private step(a: AgentState, i: number, now: number, w: number, h: number) {
    if (this.converge) return
    const dist = Math.hypot(a.tx - a.x, a.ty - a.y)
    const speed = Math.hypot(a.vx, a.vy)
    if (a.mode === 'moving' && (dist < 2.5 && speed < 0.35)) {
      // Vardı: tıkla, seç, belki konuş
      const t = a.current
      if (t) {
        const r = t.measure()
        if (r && !t.quiet) {
          this.pulse(a)
          this.highlight(r, a, t.label)
        }
        if (t.say) this.showBubble(a, t.say, 2800)
        else if (!t.quiet && now - a.lastSay > 3200 && Math.random() < 0.32) this.showBubble(a, a.def.lines[Math.floor(Math.random() * a.def.lines.length)], 2200)
      }
      a.mode = 'dwell'
      a.until = now + (t ? 520 + Math.random() * 380 : 900 + Math.random() * 1400)
      return
    }
    if (a.mode === 'moving') {
      // Hedef kaydıysa (sayfa akarken yerleşim değişir) takip et
      if (a.current) {
        const r = a.current.measure()
        if (r) this.aim(a, r)
      }
      return
    }
    if (now < a.until) return
    a.current = null
    const t = a.queue.shift()
    if (t) {
      const r = t.measure()
      if (!r) return
      a.current = t
      this.aim(a, r)
      a.mode = 'moving'
      return
    }
    // Boşta: kendi bölgesinde hafifçe dolaş
    const home = this.home(i, w, h)
    const p = this.clampPoint(home.x + (Math.random() - 0.5) * w * 0.32, home.y + (Math.random() - 0.5) * h * 0.26)
    a.tx = p.x
    a.ty = p.y
    a.mode = 'moving'
  }

  private aim(a: AgentState, r: Rect) {
    // Öğenin sol üst bölgesinde, kenardan biraz içeride bir nokta
    const p = this.clampPoint(r.x + Math.min(r.w * 0.35, 46) + (a.def.id === 'qa' ? 8 : 0), r.y + Math.min(r.h * 0.55, 26))
    a.tx = p.x
    a.ty = p.y
  }
}

/** Öğe türüne göre hangi ajan ilgilenir */
export function roleFor(el: Element): { role: AgentRole; label: string } {
  const tag = el.tagName.toLowerCase()
  const text = (el.textContent ?? '').trim()
  const label = tag === 'div' || tag === 'section' ? (el.classList[0] ? `.${el.classList[0]}`.slice(0, 18) : tag) : tag
  if (['button', 'input', 'select', 'textarea', 'svg', 'canvas', 'a', 'label'].includes(tag) || el.getAttribute('role') === 'button' || el.hasAttribute('draggable')) return { role: 'code', label }
  if (/^h[1-6]$/.test(tag) || ['p', 'span', 'li', 'td', 'th', 'strong', 'b', 'em', 'small'].includes(tag)) return { role: /\d/.test(text) ? 'math' : Math.random() < 0.25 ? 'qa' : 'design', label }
  return { role: Math.random() < 0.18 ? 'qa' : 'design', label }
}

export const IGNORE_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'HTML', 'BODY', 'BR', 'NOSCRIPT', 'TEMPLATE', 'SOURCE', 'WBR'])

/** Bileşenin enjekte ettiği CSS (ajanlar, seçim kutuları, animasyonlar) */
export const LIVE_BUILD_CSS = `
.lb-agent{position:absolute;left:0;top:0;will-change:transform;z-index:5;pointer-events:none}
.lb-arrow{display:block;filter:drop-shadow(0 2px 3px rgb(30 36 51 / .25))}
.lb-name{position:absolute;left:15px;top:19px;white-space:nowrap;border-radius:999px;background:var(--c);color:#fff;font:800 11px/1 'Nunito Variable',Nunito,system-ui,sans-serif;padding:4px 8px;box-shadow:0 2px 6px rgb(30 36 51 / .18)}
.lb-bubble,.lb-thought{position:absolute;left:15px;top:44px;max-width:240px;border-radius:14px;border-top-left-radius:4px;background:#fff;color:#1e2433;font:700 12.5px/1.35 'Nunito Variable',Nunito,system-ui,sans-serif;padding:7px 10px;box-shadow:0 6px 20px rgb(30 36 51 / .14);border:1.5px solid var(--c);opacity:0;transform:translateY(4px) scale(.96);transform-origin:top left;transition:opacity .22s,transform .22s;white-space:normal}
.lb-thought{max-width:280px;top:44px;font-weight:700;font-size:12px;color:#3a4152}
.lb-thought::before{content:'💭 ';}
.lb-show{opacity:1;transform:none}
.lb-flip .lb-name{left:auto;right:6px}
.lb-flip .lb-bubble,.lb-flip .lb-thought{left:auto;right:6px;border-top-left-radius:14px;border-top-right-radius:4px;transform-origin:top right}
.lb-hl{position:absolute;left:0;top:0;border:2px dashed var(--c);border-radius:10px;background:color-mix(in srgb,var(--c) 7%,transparent);opacity:0;transition:opacity .25s;z-index:3;pointer-events:none}
.lb-hl.lb-in{opacity:1}
.lb-hl span{position:absolute;left:-2px;top:-21px;white-space:nowrap;background:var(--c);color:#fff;font:800 10px/1 'Nunito Variable',Nunito,system-ui,sans-serif;padding:4px 6px;border-radius:6px 6px 6px 0}
.lb-pulse{position:absolute;left:0;top:0;width:28px;height:28px;border-radius:999px;border:2px solid var(--c);z-index:4;animation:lb-pulse .6s ease-out forwards;pointer-events:none}
@keyframes lb-pulse{from{opacity:.9;scale:.3}to{opacity:0;scale:1.6}}
@keyframes lb-draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes lb-fill{from{opacity:0}to{opacity:1}}
@keyframes lb-shimmer{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
@keyframes lb-rise{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
@keyframes lb-pop{0%{opacity:0;transform:scale(.4)}60%{opacity:1;transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes lb-caret{50%{opacity:0}}
@keyframes lb-ping{75%,100%{transform:scale(2.2);opacity:0}}
@media (prefers-reduced-motion: reduce){.lb-hl,.lb-bubble,.lb-thought{transition:none}.lb-pulse{display:none}}
`
