import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './icons'
import { Popup } from './Popup'
import { PALETTE, PEN_COLORS } from './colors'
import { getDef } from './tiles'
import { commit, getState, setState, updateTiles, useStore, type Tool } from './store'

// Kalem çizimleri (kalem, keçeli kalem, fosforlu kalem, silgi)
const PENCIL_BODY = 'M1.4,47.3l2.2-2.6a2,2,0,0,1,3-.2l2.8,3.9a2.6,2.6,0,0,0,3.3.2l3.6-3.2a2.7,2.7,0,0,1,3.4,0l3.6,3.2a2.6,2.6,0,0,0,3.3-.2l2.8-3.9a2,2,0,0,1,3,.2l2.2,2.6A1.7,1.7,0,0,0,36,48L25.4,19.6a20.3,20.3,0,0,1-14.8,0L0,48A1.7,1.7,0,0,0,1.4,47.3Z'

function Pencil({ color }: { color: string }) {
  return (
    <svg width={36} height={80} viewBox="0 0 36 80" fill={color} aria-hidden>
      <path d="M36,48c-.5,0-3-5-3-5H3S.5,48,0,48H0V80H36V48Z" />
      <rect fill="#000" height="37" opacity="0.3" transform="translate(36 123) rotate(180)" width="14" x="11" y="43" />
      <path d={PENCIL_BODY} fill="#f7eecb" />
      <path d="M10.6,19.6a20.3,20.3,0,0,0,14.8,0L18,0Z" />
    </svg>
  )
}

function Marker({ color }: { color: string }) {
  return (
    <svg width={36} height={80} viewBox="0 0 36 80" fill={color} aria-hidden>
      <path d="M27,21H9V15a11.4,11.4,0,0,1,2.6-7.2L18,0l6.4,7.8A11.4,11.4,0,0,1,27,15Z" />
      <rect fill="#ccc" height="43" width="36" y="37" />
      <rect height="8" width="32" x="2" y="29" />
      <rect fill="#3a3645" height="8" width="26" x="5" y="21" />
      <rect fill="#000" height="43" opacity="0.15" width="10" x="26" y="37" />
      <rect height="30" width="18" y="50" />
    </svg>
  )
}

function Highlighter({ color }: { color: string }) {
  return (
    <svg width={40} height={80} viewBox="0 0 40 80" fill={color} aria-hidden>
      <rect fill="#3a3645" height="7" width="40" y="38" />
      <rect fill="#3a3645" height="3" width="14" x="13" y="14" />
      <path d="M27,17H13C10.9,25.1,8.2,31.8,0,38H40C31,32.2,28.6,25.5,27,17Z" fill="#615e6a" />
      <rect height="35" width="40" y="45" />
      <rect fill="#000" height="28" opacity="0.2" width="26" x="7" y="52" />
      <polygon points="13 0 13 14 27 14 27 7 13 0" />
    </svg>
  )
}

function Eraser() {
  return (
    <svg width={36} height={80} viewBox="0 0 36 80" aria-hidden>
      <rect fill="#ccc" height="52" width="36" y="28" />
      <path d="M8,0h20c4.4,0,8,3.6,8,8v20H0V8C0,3.6,3.6,0,8,0Z" fill="#eb8f82" />
      <path d="M26,0h2c4.4,0,8,3.6,8,8v72h-10V0h0Z" fill="#000" opacity="0.15" />
    </svg>
  )
}

const setTool = (tool: Tool) => setState({ tool, sel: tool === 'move' ? getState().sel : [] })

function ToolButton({ id, icon, tip, active, onClick, children }: { id: string; icon: string; tip: string; active: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <div className={`pp-tool-wrap${active ? ' active' : ''}`} data-key={id}>
      <button type="button" className="pp-tool" onClick={onClick} aria-label={tip} aria-pressed={active}>
        <Icon name={icon} size={32} />
        <span className="pp-tooltip">{tip}</span>
      </button>
      {children}
    </div>
  )
}

function Brushes() {
  const tool = useStore((s) => s.tool)
  const color = useStore((s) => s.color)
  const mode = useStore((s) => s.settings.drawing)
  const pick = (t: Tool, c?: string) => setState({ tool: t, sel: [], ...(c ? { color: c } : {}) })
  if (mode === 'colored')
    return (
      <div className="pp-brushes">
        {PEN_COLORS.map((c) => (
          <button key={c} type="button" className={`pp-brush${tool === 'pen:pen' && color === c ? ' active' : ''}`} onClick={() => pick('pen:pen', c)} aria-label="Renkli kalem">
            <Pencil color={c} />
          </button>
        ))}
        <button type="button" className={`pp-brush${tool === 'pen:eraser' ? ' active' : ''}`} onClick={() => pick('pen:eraser')} aria-label="Silgi">
          <Eraser />
        </button>
      </div>
    )
  return (
    <div className="pp-brushes">
      <button type="button" className={`pp-brush${tool === 'pen:pen' ? ' active' : ''}`} onClick={() => pick('pen:pen')} aria-label="Kalem">
        <Pencil color={color} />
      </button>
      {mode === 'default' && (
        <>
          <button type="button" className={`pp-brush${tool === 'pen:marker' ? ' active' : ''}`} onClick={() => pick('pen:marker')} aria-label="Keçeli kalem">
            <Marker color={color} />
          </button>
          <button type="button" className={`pp-brush${tool === 'pen:highlighter' ? ' active' : ''}`} onClick={() => pick('pen:highlighter')} aria-label="Fosforlu kalem">
            <Highlighter color={color} />
          </button>
        </>
      )}
      <button type="button" className={`pp-brush${tool === 'pen:eraser' ? ' active' : ''}`} onClick={() => pick('pen:eraser')} aria-label="Silgi">
        <Eraser />
      </button>
    </div>
  )
}

function SubButtons({ items }: { items: { tool: Tool; icon: string; label: string }[] }) {
  const tool = useStore((s) => s.tool)
  return (
    <div className="pp-sub">
      {items.map((it) => (
        <button key={it.tool} type="button" className={tool === it.tool ? 'active' : ''} onClick={() => setTool(it.tool)}>
          <Icon name={it.icon} size={22} /> {it.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Renk seçici
// ---------------------------------------------------------------------------

const hex2rgb = (h: string) => {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(h)
  const n = m ? parseInt(m[1], 16) : 0
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: m?.[2] ? parseInt(m[2], 16) / 255 : 1 }
}
const rgb2hex = (r: number, g: number, b: number, a = 1) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}${a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : ''}`

const STROKE_TYPES = new Set(['stroke', 'line', 'geo-segment', 'geo-circle', 'geo-rect', 'geo-angle'])

/** Seçili parçalara renk uygular, sonraki çizimler için de saklar */
export function applyColor(c: string) {
  setState({ color: c })
  const { sel } = getState()
  if (!sel.length) return
  updateTiles(sel, (t) => (getDef(t.type)?.colorable ? { color: c } : null))
  commit()
}

function Slider({ label, value, max, onChange, gradient }: { label: string; value: number; max: number; onChange: (v: number) => void; gradient: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    onChange(Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * max))
  }
  return (
    <div className="pp-slider-row">
      <label>{label}</label>
      <div
        ref={ref}
        className="pp-slider"
        style={{ background: gradient }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          set(e.clientX)
        }}
        onPointerMove={(e) => e.buttons && set(e.clientX)}
      >
        <div className="pp-slider-handle" style={{ left: `${(value / max) * 100}%` }} />
      </div>
      <input className="pp-input" type="number" min={0} max={max} value={value} onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))} aria-label={label} />
    </div>
  )
}

function ColorPicker() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'palette' | 'sliders'>('palette')
  const color = useStore((s) => s.color)
  const tool = useStore((s) => s.tool)
  const sel = useStore((s) => s.sel)
  const tiles = useStore((s) => s.tiles)
  const strokeWidth = useStore((s) => s.strokeWidth)
  const strokeStyle = useStore((s) => s.strokeStyle)
  const advanced = useStore((s) => s.settings.advancedColors)
  const close = useCallback(() => setOpen(false), [])
  const set = new Set(sel)
  const showStroke = tool.startsWith('pen:') || tool.startsWith('line:') || tool.startsWith('geo:') || tiles.some((t) => set.has(t.id) && STROKE_TYPES.has(t.type))
  const { r, g, b, a } = hex2rgb(color)

  const setStroke = (patch: { strokeWidth?: 0 | 1 | 2 | 3; strokeStyle?: 'solid' | 'dashed' | 'dotted' }) => {
    setState(patch)
    const st = getState()
    if (!st.sel.length) return
    const s2 = new Set(st.sel)
    const W = { stroke: [3, 2, 4, 8], line: [3, 2, 4, 8] }
    updateTiles(s2, (t) => {
      if (!STROKE_TYPES.has(t.type)) return null
      const p = { ...t.p }
      if (patch.strokeWidth !== undefined) p.w = t.type === 'stroke' && t.p.kind !== 'pen' ? t.p.w : (t.type === 'stroke' ? W.stroke : W.line)[patch.strokeWidth]
      if (patch.strokeStyle) p.dash = patch.strokeStyle
      return { p }
    })
    commit()
  }

  return (
    <div className="pp-tool-wrap" data-key="color">
      <button type="button" className="pp-tool" onClick={() => setOpen((o) => !o)} aria-label="Renk seçici" aria-expanded={open}>
        <span className="pp-color-circle" style={{ ['--c' as string]: color }} />
        <span className="pp-tooltip">Renk seçici</span>
      </button>
      <Popup open={open} onClose={close} label="Renk seçici" className="pp-color-popup">
        {advanced && (
          <div className="pp-color-options">
            <div className="pp-select">
              <button type="button" className={mode === 'palette' ? 'active' : ''} onClick={() => setMode('palette')} title="Renk örnekleri" aria-label="Renk örnekleri">
                <Icon name="grid" />
              </button>
              <button type="button" className={mode === 'sliders' ? 'active' : ''} onClick={() => setMode('sliders')} title="RGB kaydırıcıları" aria-label="RGB kaydırıcıları">
                <Icon name="controls" />
              </button>
            </div>
          </div>
        )}
        {showStroke && (
          <div className="pp-color-options">
            <div className="pp-select pp-stroke-choice">
              {[
                ['Varsayılan', 0, <><circle cx="12" cy="12" fill="none" r="8" strokeWidth="2" /><path d="M7 7l10 10" strokeWidth="2" /></>],
                ['İnce', 1, <path d="M4 4l16 16" strokeWidth="2" />],
                ['Orta', 2, <path d="M5 5l14 14" strokeWidth="5" />],
                ['Kalın', 3, <path d="M6 6l12 12" strokeWidth="8" />],
              ].map(([title, v, svg]) => (
                <button key={String(v)} type="button" title={String(title)} aria-label={String(title)} className={strokeWidth === v ? 'active' : ''} onClick={() => setStroke({ strokeWidth: v as 0 | 1 | 2 | 3 })}>
                  <svg width="24" height="24" stroke="currentColor" strokeLinecap="round">
                    {svg as ReactNode}
                  </svg>
                </button>
              ))}
            </div>
            <div className="pp-select pp-stroke-choice">
              {(['solid', 'dashed', 'dotted'] as const).map((v) => (
                <button key={v} type="button" title={v === 'solid' ? 'Düz' : v === 'dashed' ? 'Kesikli' : 'Noktalı'} aria-label={v} className={strokeStyle === v ? 'active' : ''} onClick={() => setStroke({ strokeStyle: v })}>
                  <svg width="24" height="24" stroke="currentColor" strokeLinecap="round">
                    <path d="M5 5l14 14" strokeWidth="4" strokeDasharray={v === 'dashed' ? '3 6' : v === 'dotted' ? '.1 6' : undefined} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === 'palette' || !advanced ? (
          <div className="pp-palette">
            {PALETTE.map((p) => (
              <button key={p.c} type="button" style={{ background: p.c }} aria-label={p.name} title={p.name} className={color.slice(0, 7).toLowerCase() === p.c ? 'active' : ''} onClick={() => applyColor(p.c)} />
            ))}
          </div>
        ) : (
          <div className="pp-sliders">
            <Slider label="R" value={r} max={255} onChange={(v) => applyColor(rgb2hex(v, g, b, a))} gradient={`linear-gradient(90deg, rgb(0,${g},${b}), rgb(255,${g},${b}))`} />
            <Slider label="G" value={g} max={255} onChange={(v) => applyColor(rgb2hex(r, v, b, a))} gradient={`linear-gradient(90deg, rgb(${r},0,${b}), rgb(${r},255,${b}))`} />
            <Slider label="B" value={b} max={255} onChange={(v) => applyColor(rgb2hex(r, g, v, a))} gradient={`linear-gradient(90deg, rgb(${r},${g},0), rgb(${r},${g},255))`} />
            <Slider label="A" value={Math.round(a * 100)} max={100} onChange={(v) => applyColor(rgb2hex(r, g, b, v / 100))} gradient={`linear-gradient(90deg, transparent, rgb(${r},${g},${b})), repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0/12px 12px`} />
          </div>
        )}
      </Popup>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ekran kaydı
// ---------------------------------------------------------------------------

function Recorder() {
  const [open, setOpen] = useState(false)
  const [mic, setMic] = useState(true)
  const [msg, setMsg] = useState('')
  const [time, setTime] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const rec = useRef<{ mr: MediaRecorder; streams: MediaStream[]; micTrack?: MediaStreamTrack; t0: number } | null>(null)
  const recording = useStore((s) => s.recording)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => rec.current && setTime(Math.floor((Date.now() - rec.current.t0) / 1000)), 500)
    return () => window.clearInterval(id)
  }, [recording])

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== 'undefined'

  async function start() {
    setMsg('')
    if (!supported) {
      setMsg('Bu tarayıcı ekran kaydını desteklemiyor. Bilgisayarda Chrome, Edge ya da Firefox ile deneyin.')
      return
    }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true } as DisplayMediaStreamOptions)
      const streams = [screen]
      const tracks = [...screen.getVideoTracks()]
      let micTrack: MediaStreamTrack | undefined
      if (mic) {
        try {
          const m = await navigator.mediaDevices.getUserMedia({ audio: true })
          streams.push(m)
          micTrack = m.getAudioTracks()[0]
          if (micTrack) tracks.push(micTrack)
        } catch {
          setMsg('Mikrofon izni verilmedi; kayıt sessiz yapılıyor.')
        }
      }
      const type = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
      const mr = new MediaRecorder(new MediaStream(tracks), type ? { mimeType: type } : undefined)
      const chunks: Blob[] = []
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      mr.onstop = () => {
        streams.forEach((s) => s.getTracks().forEach((t) => t.stop()))
        const blob = new Blob(chunks, { type: mr.mimeType || 'video/webm' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `tuval-kaydi.${(mr.mimeType || '').includes('mp4') ? 'mp4' : 'webm'}`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 4000)
        rec.current = null
        setState({ recording: false })
      }
      // Kullanıcı tarayıcının "paylaşımı durdur" düğmesine basarsa
      screen.getVideoTracks()[0]?.addEventListener('ended', () => mr.state !== 'inactive' && mr.stop())
      mr.start(1000)
      rec.current = { mr, streams, micTrack, t0: Date.now() }
      setMicOn(!!micTrack)
      setTime(0)
      setOpen(false)
      setState({ recording: true })
    } catch {
      setMsg('Kayıt başlatılamadı ya da izin verilmedi.')
    }
  }

  const stop = () => rec.current?.mr.state !== 'inactive' && rec.current?.mr.stop()
  const toggleMic = () => {
    const t = rec.current?.micTrack
    if (!t) return
    t.enabled = !t.enabled
    setMicOn(t.enabled)
  }

  return (
    <div className="pp-tool-wrap recording" data-key="record">
      {recording ? (
        <div className="pp-tool pp-pill">
          <button type="button" onClick={stop} aria-label="Kaydı durdur">
            <span className="pp-dot" />
            <span className="pp-timer">
              {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
            </span>
            <span className="pp-tooltip">Kaydı durdur</span>
          </button>
          <button type="button" onClick={toggleMic} aria-label="Mikrofonu aç/kapat" className={micOn ? '' : 'off'}>
            <Icon name="mic" size={24} />
            <span className="pp-tooltip">Mikrofon</span>
          </button>
        </div>
      ) : (
        <button type="button" className="pp-tool" onClick={() => setOpen((o) => !o)} aria-label="Ekran kaydı" aria-expanded={open}>
          <span className="pp-dot" />
          <span className="pp-tooltip">Ekran kaydı</span>
        </button>
      )}
      <Popup open={open} onClose={close} label="Ekran kaydı" className="pp-rec-popup">
        <label className="pp-form-row">
          <Icon name="mic" size={20} />
          <span>Mikrofon</span>
          <input className="pp-toggle" type="checkbox" checked={mic} onChange={(e) => setMic(e.target.checked)} />
          <span className="pp-control" />
        </label>
        {msg && <p className="pp-caption warn">{msg}</p>}
        <button type="button" className="pp-btn pp-btn-red" onClick={start}>
          Kaydı başlat
        </button>
      </Popup>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function Toolbar() {
  const tool = useStore((s) => s.tool)
  const group = tool.split(':')[0]
  return (
    <div className="pp-toolbar-wrap">
      <div className="pp-toolbar" role="region" aria-label="Araç çubuğu">
        <ToolButton id="move" icon="cursor" tip="Taşıma aracı [V]" active={tool === 'move'} onClick={() => setTool('move')} />
        <span className="pp-tool-sep" aria-hidden />
        <ToolButton id="pen" icon="pen" tip="Çizim araçları [P]" active={group === 'pen'} onClick={() => setTool(group === 'pen' ? tool : 'pen:pen')} />
        {group === 'pen' && <Brushes />}
        <ToolButton id="line" icon="geo-line" tip="Çizgi [L]" active={group === 'line'} onClick={() => setTool(group === 'line' ? tool : 'line:straight')} />
        {group === 'line' && (
          <SubButtons
            items={[
              { tool: 'line:straight', icon: 'geo-line', label: 'Düz' },
              { tool: 'line:curved', icon: 'geo-line', label: 'Eğri' },
              { tool: 'line:custom', icon: 'geo-line', label: 'Kırık' },
            ]}
          />
        )}
        <ToolButton id="geo" icon="geo-construction" tip="Geometrik çizim [G]" active={group === 'geo'} onClick={() => setTool(group === 'geo' ? tool : 'geo:point')} />
        {group === 'geo' && (
          <SubButtons
            items={[
              { tool: 'geo:point', icon: 'geo-point', label: 'Nokta' },
              { tool: 'geo:line', icon: 'geo-line', label: 'Doğru parçası' },
              { tool: 'geo:circle', icon: 'geo-circle', label: 'Çember' },
              { tool: 'geo:rect', icon: 'geo-rectangle', label: 'Dikdörtgen' },
              { tool: 'geo:angle', icon: 'geo-angle', label: 'Açı' },
            ]}
          />
        )}
        <ToolButton id="text" icon="text" tip="Metin kutusu [T]" active={tool === 'text:text'} onClick={() => setTool('text:text')} />
        <ToolButton id="equation" icon="equation" tip="Denklem [Q]" active={tool === 'text:equation'} onClick={() => setTool('text:equation')} />
        <span className="pp-tool-sep" aria-hidden />
        <Recorder />
        <ColorPicker />
      </div>
    </div>
  )
}
