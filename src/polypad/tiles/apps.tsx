import { useEffect, useRef, useState } from 'react'
import type { ActionSpec, PadApi, Pt, RenderCtx, Tile, TileDef } from '../types'
import { UNIT, deg, mod, regularPolygon, pathOf, toLocal, toWorld } from '../geom'
import { midiFreq, playNote } from '../sound'
import { C, FONT, Label, edge, rectBox } from './kit'
import { api as storeApi, getState, useStore } from '../store'

// Bileşenler içinden (zamanlayıcılar) parça güncellemek için. Döngüsel içe aktarma güvenli:
// store yalnızca çalışma anında kullanılır, modül yüklenirken değil.
const withApi = (fn: (a: PadApi) => void) => fn(storeApi)

// ---------------------------------------------------------------------------
// Müzik
// ---------------------------------------------------------------------------

const NOTE_NAMES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si']
const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11]
const KW = 24
const KH = 96
const PIANO_START = 60
/** Nota sınıfı renkleri (Polypad "Renkler" etiketleri gibi: her nota kendi renginde) */
const PITCH_COLORS = ['#eb4726', '#fd8c00', '#bfc212', '#22ab24', '#009ea6', '#0f82f2', '#6d3bbf', '#cd0e66', '#b16200', '#187819', '#0b5ba9', '#900a47']

/** Müzik ölçekleri (yarım ses aralıkları) */
const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  blues: [0, 3, 5, 6, 7, 10],
  pentatonic: [0, 2, 4, 7, 9],
}
const inScale = (scale: string | undefined, midi: number) => !SCALES[scale ?? 'major'] || scale === 'chromatic' || SCALES[scale ?? 'major'].includes(mod(midi - PIANO_START, 12))

/** Ses düzeyiyle nota çal (ayarlarda ses ya da müzik açıksa) */
function playVol(freq: number, dur: number, wave: OscillatorType, volume: number | undefined) {
  const st = getState().settings
  if (!st.sound && !st.music) return
  const v = Math.max(0, Math.min(10, volume ?? 1))
  if (v > 0) playNote(freq, dur, wave, Math.min(0.6, 0.18 * v))
}

/** İki oktav: 14 beyaz, 10 siyah tuş */
const pianoKeys = (() => {
  const white: { midi: number; x: number; idx: number }[] = []
  const black: { midi: number; x: number }[] = []
  for (let o = 0; o < 2; o++)
    WHITE_STEPS.forEach((s, i) => {
      const idx = o * 7 + i
      const x = -168 + idx * KW
      white.push({ midi: PIANO_START + o * 12 + s, x, idx })
      if (i !== 2 && i !== 6) black.push({ midi: PIANO_START + o * 12 + s + 1, x: x + KW - 7 })
    })
  return { white, black }
})()

/** Tuş etiketi: sayılar, modüler sayılar, nota adları ya da renk */
function keyLabel(t: Tile, midi: number, idx: number) {
  const mode = pianoLabels(t)
  const m = midi + (t.p.note ?? 0)
  if (mode === 'number') return String(idx + 1)
  if (mode === 'modular') return String((idx % 7) + 1)
  if (mode === 'text') return NOTE_NAMES[mod(m, 12)]
  return ''
}
const pianoLabels = (t: Tile): string => (t.p.labels === true ? 'text' : t.p.labels || 'hidden')

const piano: TileDef = {
  type: 'piano',
  name: () => 'Klavye',
  create: () => ({ p: { labels: 'number', note: 0, musicScale: 'major', volume: 1 } }),
  bounds: () => rectBox(348, 108),
  edgeSnap: false,
  render: (t) => {
    const mode = pianoLabels(t)
    const shift = t.p.note ?? 0
    return (
      <>
        <rect x={-174} y={-54} width={348} height={108} rx={8} fill="#3a3645" />
        {pianoKeys.white.map((k) => {
          const m = k.midi + shift
          const dim = !inScale(t.p.musicScale, m)
          return (
            <g key={k.midi}>
              <rect data-act="key" data-v={k.midi} x={k.x} y={-48} width={KW} height={KH} rx={3} fill={t.p.lit === k.midi ? '#87c1f9' : dim ? '#d6d6de' : '#fff'} stroke="#3a3645" strokeWidth={1} />
              {mode === 'color' ? (
                <circle cx={k.x + KW / 2} cy={34} r={5} fill={PITCH_COLORS[mod(m, 12)]} style={{ pointerEvents: 'none' }} />
              ) : (
                mode !== 'hidden' && (
                  <Label x={k.x + KW / 2} y={36} size={mode === 'text' ? 8 : 10} color="#555">
                    {keyLabel(t, k.midi, k.idx)}
                  </Label>
                )
              )}
            </g>
          )
        })}
        {pianoKeys.black.map((k) => {
          const m = k.midi + shift
          return (
            <g key={k.midi}>
              <rect data-act="key" data-v={k.midi} x={k.x} y={-48} width={14} height={58} rx={2} fill={t.p.lit === k.midi ? '#0f82f2' : inScale(t.p.musicScale, m) ? '#242436' : '#6a6a78'} />
              {mode === 'color' && <circle cx={k.x + 7} cy={2} r={3.5} fill={PITCH_COLORS[mod(m, 12)]} style={{ pointerEvents: 'none' }} />}
            </g>
          )
        })}
      </>
    )
  },
  onTap: (t, api, info) => {
    if (info.act !== 'key') return
    const m = Number(info.v)
    playVol(midiFreq(m + (t.p.note ?? 0)), 0.7, 'triangle', t.p.volume)
    api.updateP(t.id, { lit: m })
    setTimeout(() => {
      if (api.get(t.id)?.p.lit === m) api.updateP(t.id, { lit: null })
    }, 260)
  },
}

const STEPS = 16
const ROWS = 8
const CELL = 18
const ROW_COLORS = ['#cd0e66', '#6d3bbf', '#0f82f2', '#009ea6', '#22ab24', '#bfc212', '#fd8c00', '#eb4726']
const DRUMS = ['Zil', 'Ziller', 'Tom 1', 'Tom 2', 'Trampet', 'Alkış', 'Kaval', 'Davul']
const DRUM_FREQ = [1600, 1200, 330, 240, 200, 900, 160, 70]

/** Satırların (yukarıdan aşağı) MIDI perdeleri: seçilen ölçekten Do4'ten başlayarak */
function songPitches(scale: string | undefined): number[] {
  const steps = SCALES[scale ?? 'major'] ?? SCALES.major
  const out: number[] = []
  for (let i = 0; i < ROWS; i++) out.push(PIANO_START + steps[i % steps.length] + 12 * Math.floor(i / steps.length))
  return out.reverse()
}

/** Parça ızgarasının ölçüleri (satır yüksekliği / sütun genişliği çarpanlarına göre) */
function songGeom(t: Tile) {
  const cw = CELL * (t.p.colSize ?? 1)
  const rh = CELL * (t.p.rowSize ?? 1)
  const lw = t.p.labels === 'hidden' ? 8 : 30
  const w = lw + STEPS * cw + 8
  const h = ROWS * rh + 12
  return { cw, rh, w, h, gx: -w / 2 + lw, gy: -h / 2 + 6 }
}

/** Bir hücre çalınınca: perdeli ya da vurmalı ses */
function songNote(t: Tile, row: number) {
  const scale = t.p.musicScale ?? 'major'
  if (scale === 'none') return
  if (scale === 'percussion') return playVol(DRUM_FREQ[row], row < 2 ? 0.08 : 0.16, row < 2 || row === 5 ? 'square' : 'sine', t.p.volume)
  playVol(midiFreq(songPitches(scale)[row]), 0.3, 'triangle', t.p.volume)
}

function SongView({ t, thumb }: { t: Tile; thumb: boolean }) {
  const [step, setStep] = useState(-1)
  const cur = useRef(t)
  cur.current = t
  const playing = !!t.p.playing && !thumb
  const bpm = (t.p.bpm ?? 120) * (t.p.tempo ?? 1)
  useEffect(() => {
    if (!playing) {
      setStep(-1)
      return
    }
    const tt = cur.current
    // Sıra kipinde boş sütunlar atlanır
    const cols = tt.p.playbackType === 'sequence' ? [...new Set<number>((tt.p.cells as number[]).map((c) => Math.floor(c / ROWS)))].sort((x, y) => x - y) : Array.from({ length: STEPS }, (_, i) => i)
    const total = Math.max(1, cols.length) * Math.max(1, tt.p.loops ?? 1)
    let n = 0
    const tick = () => {
      if (n >= total || !cols.length) {
        withApi((a) => a.updateP(tt.id, { playing: false }))
        return
      }
      const col = cols[n % cols.length]
      setStep(col)
      ;(cur.current.p.cells as number[]).filter((c) => Math.floor(c / ROWS) === col).forEach((c) => songNote(cur.current, c % ROWS))
      n++
    }
    tick()
    const id = window.setInterval(tick, 60000 / bpm / 2)
    return () => window.clearInterval(id)
  }, [playing, bpm])
  const on = new Set<number>(t.p.cells)
  const g = songGeom(t)
  const scale = t.p.musicScale ?? 'major'
  const pitches = songPitches(scale)
  const bar = Math.max(1, t.p.barLength ?? 4)
  return (
    <>
      <rect x={-g.w / 2} y={-g.h / 2} width={g.w} height={g.h} rx={8} fill="#fff" stroke="#3a3645" strokeWidth={2} />
      {t.p.labels !== 'hidden' &&
        Array.from({ length: ROWS }, (_, r) => (
          <Label key={r} x={g.gx - 14} y={g.gy + r * g.rh + g.rh / 2} size={Math.min(9, g.rh * 0.5)} color="#555">
            {t.p.labels === 'number' ? ROWS - r : scale === 'percussion' ? DRUMS[r].slice(0, 4) : NOTE_NAMES[mod(pitches[r], 12)]}
          </Label>
        ))}
      {step >= 0 && <rect x={g.gx + step * g.cw} y={g.gy} width={g.cw} height={ROWS * g.rh} fill="#fec680" opacity={0.5} />}
      {Array.from({ length: STEPS * ROWS }, (_, i) => {
        const s = Math.floor(i / ROWS)
        const r = i % ROWS
        return (
          <rect
            key={i}
            data-act="cell"
            data-v={i}
            x={g.gx + s * g.cw + 1.5}
            y={g.gy + r * g.rh + 1.5}
            width={g.cw - 3}
            height={g.rh - 3}
            rx={3}
            fill={on.has(i) ? ROW_COLORS[r] : Math.floor(s / bar) % 2 === 0 ? '#e6e6ee' : '#f2f2f6'}
          />
        )
      })}
      {t.p.showGrid && t.p.playbackType !== 'sequence' && (
        <path
          d={Array.from({ length: Math.floor((STEPS - 1) / bar) }, (_, k) => `M${g.gx + (k + 1) * bar * g.cw} ${g.gy}v${ROWS * g.rh}`).join('')}
          stroke="#3a3645"
          strokeWidth={1.5}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </>
  )
}

const song: TileDef = {
  type: 'song',
  name: () => 'Parça',
  create: () => ({
    p: {
      cells: [7, 13, 21, 31, 39, 45, 53, 59, 64 + 7, 64 + 13, 64 + 21, 64 + 31, 64 + 39, 64 + 45, 64 + 53, 64 + 63],
      bpm: 120,
      playing: false,
      loops: 1,
      playbackType: 'timeline',
      labels: 'text',
      barLength: 4,
      musicScale: 'major',
      tempo: 1,
      volume: 1,
    },
  }),
  bounds: (t) => {
    const g = songGeom(t)
    return rectBox(g.w, g.h)
  },
  edgeSnap: false,
  render: (t, ctx) => <SongView t={t} thumb={!!ctx.thumb} />,
  onTap: (t, api, info) => {
    if (info.act !== 'cell') return
    const i = Number(info.v)
    const cells: number[] = t.p.cells
    const has = cells.includes(i)
    if (!has) songNote(t, i % ROWS)
    api.updateP(t.id, { cells: has ? cells.filter((c) => c !== i) : [...cells, i] }, true)
  },
}

// ---------------------------------------------------------------------------
// Mantık devreleri
// ---------------------------------------------------------------------------

const GREEN = '#22ab24'
const WIRE_OFF = '#9a9aa5'
const INK = '#242436'
const LOGIC = new Set(['logic-button', 'logic-switch', 'logic-metronome', 'logic-bulb', 'logic-speaker', 'logic-display', 'logic-gate'])
const MEM_INPUTS: Record<string, string[]> = { sr: ['S', 'R'], d: ['D', 'CLK'], t: ['T', 'CLK'], jk: ['J', 'CLK', 'K'] }
const isMem = (g: string) => g in MEM_INPUTS

interface Ports {
  ins: Pt[]
  outs: Pt[]
}

function ports(t: Tile): Ports {
  switch (t.type) {
    case 'logic-button':
    case 'logic-switch':
    case 'logic-metronome':
      return { ins: [], outs: [{ x: 36, y: 0 }] }
    case 'logic-bulb':
    case 'logic-speaker':
      return { ins: [{ x: -36, y: 0 }], outs: [] }
    case 'logic-display':
      return { ins: [0, 1, 2, 3].map((i) => ({ x: -46, y: -36 + i * 24 })), outs: [] }
    case 'logic-gate': {
      const g: string = t.p.gate
      if (isMem(g)) {
        const n = MEM_INPUTS[g].length
        return { ins: MEM_INPUTS[g].map((_, i) => ({ x: -44, y: n === 2 ? (i ? 16 : -16) : -24 + i * 24 })), outs: [{ x: 44, y: -20 }, { x: 44, y: 20 }] }
      }
      const unary = g === 'not' || g === 'buffer'
      return { ins: unary ? [{ x: -40, y: 0 }] : [{ x: -40, y: -12 }, { x: -40, y: 12 }], outs: [{ x: 40, y: 0 }] }
    }
  }
  return { ins: [], outs: [] }
}

interface EvalCtx {
  byId: Map<string, Tile>
  cache: Map<string, number[]>
  visiting: Set<string>
}
const evalMemo = new WeakMap<Tile[], EvalCtx>()
function evalCtx(tiles: Tile[]): EvalCtx {
  let c = evalMemo.get(tiles)
  if (!c) {
    c = { byId: new Map(tiles.map((t) => [t.id, t])), cache: new Map(), visiting: new Set() }
    evalMemo.set(tiles, c)
  }
  return c
}

const parseRef = (ref: string) => {
  const [id, o] = ref.split(':')
  return { id, o: Number(o) || 0 }
}

function inVals(t: Tile, tiles: Tile[]): number[] {
  const c = evalCtx(tiles)
  return ((t.p.inputs ?? []) as (string | null)[]).map((ref) => {
    if (!ref) return 0
    const r = parseRef(ref)
    const s = c.byId.get(r.id)
    return s ? (outVals(s, tiles)[r.o] ?? 0) : 0
  })
}

function outVals(t: Tile, tiles: Tile[]): number[] {
  const c = evalCtx(tiles)
  const hit = c.cache.get(t.id)
  if (hit) return hit
  if (t.type === 'logic-button' || t.type === 'logic-switch' || t.type === 'logic-metronome') return [t.p.on ? 1 : 0]
  if (t.type !== 'logic-gate') return []
  const g: string = t.p.gate
  // Bellek öğelerinin çıkışı saklı durumdur; geri besleme döngülerini de bu kırar
  if (isMem(g)) return [t.p.q ? 1 : 0, t.p.q ? 0 : 1]
  if (c.visiting.has(t.id)) return [0]
  c.visiting.add(t.id)
  const [a = 0, b = 0] = inVals(t, tiles)
  c.visiting.delete(t.id)
  const v = { and: a & b, or: a | b, xor: a ^ b, buffer: a, not: 1 - a, nand: 1 - (a & b), nor: 1 - (a | b), xnor: 1 - (a ^ b) }[g] ?? 0
  const r = [v]
  c.cache.set(t.id, r)
  return r
}

const tilesOf = (t: Tile, ctx: RenderCtx) => ctx.tiles ?? [t]

/** Girişlere bağlı kablolar, giriş/çıkış uçları ve sürüklenen kablo */
function LogicPorts({ t, ctx, outs }: { t: Tile; ctx: RenderCtx; outs: number[] }) {
  const tiles = tilesOf(t, ctx)
  const c = evalCtx(tiles)
  const pr = ports(t)
  const ins = inVals(t, tiles)
  const refs = (t.p.inputs ?? []) as (string | null)[]
  const drag = t.p._drag as { x: number; y: number; o: number } | undefined
  return (
    <g>
      {!ctx.thumb &&
        refs.map((ref, i) => {
          if (!ref) return null
          const r = parseRef(ref)
          const s = c.byId.get(r.id)
          const sp = s && ports(s).outs[r.o]
          if (!s || !sp || !pr.ins[i]) return null
          const a = toLocal(t, toWorld(s, sp))
          const b = pr.ins[i]
          const dx = Math.max(30, Math.abs(b.x - a.x) / 2)
          return <path key={i} d={`M${a.x} ${a.y}C${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`} fill="none" stroke={ins[i] ? GREEN : WIRE_OFF} strokeWidth={3} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
        })}
      {drag && pr.outs[drag.o] && <path d={`M${pr.outs[drag.o].x} ${pr.outs[drag.o].y}L${drag.x} ${drag.y}`} stroke={GREEN} strokeWidth={3} strokeDasharray="6 5" fill="none" style={{ pointerEvents: 'none' }} />}
      {pr.ins.map((p, i) => (
        <g key={`i${i}`}>
          <circle data-act="port" data-v={i} cx={p.x} cy={p.y} r={10} fill="transparent" />
          <circle data-act="port" data-v={i} cx={p.x} cy={p.y} r={5} fill={ins[i] ? GREEN : '#fff'} stroke={INK} strokeWidth={1.5} />
        </g>
      ))}
      {pr.outs.map((p, i) => (
        <circle key={`o${i}`} cx={p.x} cy={p.y} r={5} fill={outs[i] ? GREEN : '#fff'} stroke={INK} strokeWidth={1.5} />
      ))}
    </g>
  )
}

/** Çıkış uçlarından kablo çekmek için tutamaklar */
const wiring: Pick<TileDef, 'handles' | 'onHandle'> = {
  handles: (t) => ports(t).outs.map((p, i) => ({ id: `out${i}`, x: p.x, y: p.y, show: 'always', color: GREEN })),
  onHandle: (t, id, l, api, phase) => {
    const o = Number(id.slice(3)) || 0
    if (phase !== 'end') return { p: { ...t.p, _drag: { x: l.x, y: l.y, o } } }
    const { _drag, ...rest } = t.p
    void _drag
    const w = toWorld(t, l)
    const target = api.tileAt(w, [t.id])
    if (target && LOGIC.has(target.type)) {
      const ins = ports(target).ins
      if (ins.length) {
        const tl = toLocal(target, w)
        const cur = [...((target.p.inputs ?? []) as (string | null)[])]
        while (cur.length < ins.length) cur.push(null)
        const order = ins.map((p, i) => ({ i, d: Math.hypot(p.x - tl.x, p.y - tl.y) })).sort((a, b) => a.d - b.d)
        const pick = (order.find((x) => !cur[x.i]) ?? order[0]).i
        cur[pick] = `${t.id}:${o}`
        api.updateP(target.id, { inputs: cur })
        api.sound('snap')
      }
    }
    return { p: rest }
  },
}

/** Giriş ucuna dokununca bağlantıyı koparır */
const disconnect: TileDef['onTap'] = (t, api, info) => {
  if (info.act !== 'port') return
  const cur = [...((t.p.inputs ?? []) as (string | null)[])]
  const i = Number(info.v)
  if (!cur[i]) return
  cur[i] = null
  api.updateP(t.id, { inputs: cur }, true)
}

const logicBase = { colorable: false, edgeSnap: false } satisfies Partial<TileDef>

const logicButton: TileDef = {
  ...logicBase,
  ...wiring,
  type: 'logic-button',
  name: () => 'Düğme',
  create: () => ({ p: { on: false } }),
  bounds: () => ({ x: -24, y: -24, w: 66, h: 48 }),
  render: (t, ctx) => (
    <>
      <path d="M18 0H36" stroke={INK} strokeWidth={2} />
      <circle r={21} fill="#e6e6ee" stroke={INK} strokeWidth={2} />
      <circle data-act="press" r={15} fill={t.p.on ? C.red : C.lRed} stroke={edge(C.red)} strokeWidth={2} style={{ cursor: 'pointer' }} />
      <LogicPorts t={t} ctx={ctx} outs={[t.p.on ? 1 : 0]} />
    </>
  ),
  onTap: (t, api, info) => {
    if (info.act !== 'press') return
    api.updateP(t.id, { on: true })
    api.sound('click')
    setTimeout(() => api.get(t.id) && api.updateP(t.id, { on: false }), 400)
  },
}

const logicSwitch: TileDef = {
  ...logicBase,
  ...wiring,
  type: 'logic-switch',
  name: () => 'Anahtar',
  create: () => ({ p: { on: false } }),
  bounds: () => ({ x: -28, y: -20, w: 70, h: 40 }),
  render: (t, ctx) => (
    <>
      <path d="M24 0H36" stroke={INK} strokeWidth={2} />
      <rect data-act="toggle" x={-26} y={-16} width={50} height={32} rx={16} fill={t.p.on ? GREEN : '#cfcfd8'} stroke={INK} strokeWidth={2} style={{ cursor: 'pointer' }} />
      <circle cx={t.p.on ? 8 : -10} r={11} fill="#fff" stroke={INK} strokeWidth={1.5} style={{ pointerEvents: 'none', transition: 'cx .15s' }} />
      <LogicPorts t={t} ctx={ctx} outs={[t.p.on ? 1 : 0]} />
    </>
  ),
  onTap: (t, api, info) => {
    if (info.act !== 'toggle') return
    api.sound('click')
    api.updateP(t.id, { on: !t.p.on }, true)
  },
}

function MetronomeFx({ id, bpm, paused, thumb }: { id: string; bpm: number; paused: boolean; thumb: boolean }) {
  useEffect(() => {
    if (thumb || paused) return
    const h = window.setInterval(
      () =>
        withApi((a) => {
          const t = a.get(id)
          if (!t) return
          if (!t.p.on) a.sound('click')
          a.updateP(id, { on: !t.p.on })
        }),
      60000 / bpm / 2,
    )
    return () => window.clearInterval(h)
  }, [id, bpm, paused, thumb])
  return null
}

const logicMetronome: TileDef = {
  ...logicBase,
  ...wiring,
  type: 'logic-metronome',
  name: () => 'Metronom',
  create: () => ({ p: { on: false, bpm: 60, paused: false } }),
  bounds: () => ({ x: -26, y: -28, w: 68, h: 56 }),
  render: (t, ctx) => (
    <>
      <MetronomeFx id={t.id} bpm={t.p.bpm} paused={!!t.p.paused} thumb={!!ctx.thumb} />
      <path d="M20 0H36" stroke={INK} strokeWidth={2} />
      <path d="M-10 -24H10L20 22H-20Z" fill={C.lOrange} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <g style={{ transform: `rotate(${t.p.on ? 22 : -22}deg)`, transformOrigin: '0px 16px', transition: 'transform .12s' }}>
        <path d="M0 16V-18" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <rect x={-4} y={-10} width={8} height={6} fill={INK} />
      </g>
      <Label y={19} size={7}>{t.p.bpm}</Label>
      <LogicPorts t={t} ctx={ctx} outs={[t.p.on ? 1 : 0]} />
    </>
  ),
}

const logicBulb: TileDef = {
  ...logicBase,
  type: 'logic-bulb',
  name: () => 'Lamba',
  watch: true,
  create: () => ({ p: { inputs: [null] } }),
  bounds: () => ({ x: -40, y: -30, w: 72, h: 54 }),
  render: (t, ctx) => {
    const on = inVals(t, tilesOf(t, ctx))[0] === 1
    return (
      <>
        <path d="M-36 0H-15" stroke={INK} strokeWidth={2} />
        {on && <circle cy={-4} r={27} fill="#ffe066" opacity={0.45} />}
        <circle cy={-4} r={16} fill={on ? '#ffd43b' : '#f2f2f2'} stroke={INK} strokeWidth={2} />
        <path d="M-5 4L-3 -6L0 -2L3 -6L5 4" fill="none" stroke={on ? C.dOrange : '#aaa'} strokeWidth={1.5} />
        <rect x={-8} y={11} width={16} height={10} rx={2} fill="#8a8a96" stroke={INK} strokeWidth={1.5} />
        <LogicPorts t={t} ctx={ctx} outs={[]} />
      </>
    )
  },
  onTap: disconnect,
}

function SpeakerFx({ on, thumb, note, volume }: { on: boolean; thumb: boolean; note: number; volume: number | undefined }) {
  const prev = useRef(on)
  useEffect(() => {
    if (on && !prev.current && !thumb) playVol(660 * 2 ** (note / 12), 0.3, 'square', volume)
    prev.current = on
  }, [on, thumb, note, volume])
  return null
}

const logicSpeaker: TileDef = {
  ...logicBase,
  type: 'logic-speaker',
  name: () => 'Hoparlör',
  watch: true,
  create: () => ({ p: { inputs: [null], note: 0, volume: 1 } }),
  bounds: () => ({ x: -40, y: -24, w: 76, h: 48 }),
  render: (t, ctx) => {
    const on = inVals(t, tilesOf(t, ctx))[0] === 1
    return (
      <>
        <SpeakerFx on={on} thumb={!!ctx.thumb} note={t.p.note ?? 0} volume={t.p.volume} />
        <path d="M-36 0H-14" stroke={INK} strokeWidth={2} />
        <rect x={-14} y={-9} width={10} height={18} fill={on ? C.blue : '#cfcfd8'} stroke={INK} strokeWidth={2} />
        <path d="M-4 -9L12 -20V20L-4 9Z" fill={on ? C.lBlue : '#e6e6ee'} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        {on && <path d="M18 -8A12 12 0 0 1 18 8M23 -14A20 20 0 0 1 23 14" fill="none" stroke={C.blue} strokeWidth={2} strokeLinecap="round" />}
        <LogicPorts t={t} ctx={ctx} outs={[]} />
      </>
    )
  },
  onTap: disconnect,
}

const SEG: Record<string, string> = {
  a: 'M-12 -30H12',
  b: 'M15 -27V-3',
  c: 'M15 3V27',
  d: 'M-12 30H12',
  e: 'M-15 3V27',
  f: 'M-15 -27V-3',
  g: 'M-12 0H12',
}
const DIGITS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg', 'abcefg', 'cdefg', 'adef', 'bcdeg', 'adefg', 'aefg']

const logicDisplay: TileDef = {
  ...logicBase,
  type: 'logic-display',
  name: () => 'Gösterge',
  watch: true,
  create: () => ({ p: { inputs: [null, null, null, null] } }),
  bounds: () => ({ x: -50, y: -50, w: 86, h: 100 }),
  render: (t, ctx) => {
    const ins = inVals(t, tilesOf(t, ctx))
    const v = ins.reduce((s, b, i) => s + (b ? 2 ** i : 0), 0)
    const lit = DIGITS[v]
    return (
      <>
        {ports(t).ins.map((p, i) => (
          <g key={i}>
            <path d={`M${p.x} ${p.y}H-34`} stroke={INK} strokeWidth={2} />
            <Label x={-40} y={p.y - 9} size={8} color="#555">
              {2 ** i}
            </Label>
          </g>
        ))}
        <rect x={-34} y={-48} width={68} height={96} rx={8} fill={INK} />
        {Object.entries(SEG).map(([k, d]) => (
          <path key={k} d={d} stroke={lit.includes(k) ? '#ff5a5f' : '#3a3645'} strokeWidth={6} strokeLinecap="round" />
        ))}
        <Label y={40} size={8} color="#aaa">
          {v}
        </Label>
        <LogicPorts t={t} ctx={ctx} outs={[]} />
      </>
    )
  },
  onTap: disconnect,
}

const GATE_BODY: Record<string, { d: string; end: number; left: number; bubble?: boolean; back?: boolean }> = {
  and: { d: 'M-24 -20H2A20 20 0 0 1 2 20H-24Z', end: 22, left: -24 },
  nand: { d: 'M-24 -20H2A20 20 0 0 1 2 20H-24Z', end: 22, left: -24, bubble: true },
  or: { d: 'M-26 -20Q2 -20 24 0Q2 20 -26 20Q-16 0 -26 -20Z', end: 24, left: -21 },
  nor: { d: 'M-26 -20Q2 -20 24 0Q2 20 -26 20Q-16 0 -26 -20Z', end: 24, left: -21, bubble: true },
  xor: { d: 'M-26 -20Q2 -20 24 0Q2 20 -26 20Q-16 0 -26 -20Z', end: 24, left: -21, back: true },
  xnor: { d: 'M-26 -20Q2 -20 24 0Q2 20 -26 20Q-16 0 -26 -20Z', end: 24, left: -21, back: true, bubble: true },
  buffer: { d: 'M-22 -20L20 0L-22 20Z', end: 20, left: -22 },
  not: { d: 'M-22 -20L20 0L-22 20Z', end: 20, left: -22, bubble: true },
}

/** Bellek öğelerinin durumunu girişlere göre günceller */
function MemoryFx({ t, ins, thumb }: { t: Tile; ins: number[]; thumb: boolean }) {
  const key = ins.join('')
  useEffect(() => {
    if (thumb) return
    const g: string = t.p.gate
    const q = t.p.q ? 1 : 0
    let next = q
    let clk = t.p.clk ? 1 : 0
    if (g === 'sr') {
      const [s, r] = ins
      if (s && !r) next = 1
      else if (r && !s) next = 0
    } else {
      const c = ins[1] ?? 0
      const rising = c === 1 && clk === 0
      clk = c
      if (rising) {
        if (g === 'd') next = ins[0]
        else if (g === 't') next = ins[0] ? 1 - q : q
        else if (g === 'jk') {
          const [j, , k] = ins
          next = j && k ? 1 - q : j ? 1 : k ? 0 : q
        }
      }
    }
    if (next !== q || clk !== (t.p.clk ? 1 : 0)) withApi((a) => a.updateP(t.id, { q: next, clk }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, thumb])
  return null
}

const logicGate: TileDef = {
  ...logicBase,
  ...wiring,
  type: 'logic-gate',
  name: (t) => (isMem(t.p.gate) ? `${String(t.p.gate).toUpperCase()} mandalı` : `${String(t.p.gate).toUpperCase()} kapısı`),
  watch: true,
  create: (p) => {
    const gate = (p.gate as string) ?? 'and'
    const n = isMem(gate) ? MEM_INPUTS[gate].length : gate === 'not' || gate === 'buffer' ? 1 : 2
    return { p: { gate, inputs: Array(n).fill(null), q: 0, clk: 0 } }
  },
  bounds: (t) => (isMem(t.p.gate) ? { x: -48, y: -40, w: 96, h: 80 } : { x: -44, y: -26, w: 88, h: 62 }),
  render: (t, ctx) => {
    const tiles = tilesOf(t, ctx)
    const g: string = t.p.gate
    const outs = outVals(t, tiles)
    const pr = ports(t)
    if (isMem(g)) {
      const ins = inVals(t, tiles)
      return (
        <>
          <MemoryFx t={t} ins={ins} thumb={!!ctx.thumb} />
          {pr.ins.map((p, i) => (
            <g key={i}>
              <path d={`M${p.x} ${p.y}H-32`} stroke={INK} strokeWidth={2} />
              <Label x={-28} y={p.y} size={8} anchor="start" color="#555">
                {MEM_INPUTS[g][i]}
              </Label>
            </g>
          ))}
          {pr.outs.map((p, i) => (
            <g key={i}>
              <path d={`M32 ${p.y}H${p.x}`} stroke={INK} strokeWidth={2} />
              <Label x={28} y={p.y} size={8} anchor="end" color="#555">
                {i ? 'Q̄' : 'Q'}
              </Label>
            </g>
          ))}
          <rect x={-32} y={-36} width={64} height={72} rx={6} fill="#f4f4f8" stroke={INK} strokeWidth={2} />
          <Label size={14} weight={800}>
            {g.toUpperCase()}
          </Label>
          <LogicPorts t={t} ctx={ctx} outs={outs} />
        </>
      )
    }
    const b = GATE_BODY[g] ?? GATE_BODY.and
    const outStart = b.end + (b.bubble ? 8 : 0)
    return (
      <>
        {pr.ins.map((p, i) => (
          <path key={i} d={`M${p.x} ${p.y}H${b.left}`} stroke={INK} strokeWidth={2} />
        ))}
        <path d={`M${outStart} 0H40`} stroke={INK} strokeWidth={2} />
        {b.back && <path d="M-32 -20Q-22 0 -32 20" fill="none" stroke={INK} strokeWidth={2} />}
        <path d={b.d} fill={outs[0] ? '#e9f7e9' : '#fff'} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        {b.bubble && <circle cx={b.end + 4} r={4} fill="#fff" stroke={INK} strokeWidth={2} />}
        <Label y={29} size={8} color="#777">
          {g.toUpperCase()}
        </Label>
        <LogicPorts t={t} ctx={ctx} outs={outs} />
      </>
    )
  },
  onTap: disconnect,
}

// ---------------------------------------------------------------------------
// Satranç
// ---------------------------------------------------------------------------

const SQ = UNIT * 1.5
const HALF = SQ * 4
const FILES = 'abcdefgh'

const BACK_RANK = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']

type ChessPc = { id: string; piece: string; dark: boolean; c: number; r: number }

/** Tahtanın üstündeki taşlar ve kareleri */
function boardPieces(board: Tile, tiles: Tile[]): ChessPc[] {
  const out: ChessPc[] = []
  for (const x of tiles) {
    if (x.type !== 'chess-piece') continue
    const l = toLocal(board, x)
    const c = Math.floor((l.x + HALF) / SQ)
    const r = Math.floor((l.y + HALF) / SQ)
    if (c >= 0 && c < 8 && r >= 0 && r < 8) out.push({ id: x.id, piece: x.p.piece, dark: !!x.p.dark, c, r })
  }
  return out
}

/** Bir taşın gidebileceği kareler (rok ve geçerken alma olmadan). attack: piyonun yalnızca çapraz tehdidi */
function chessMoves(pcs: ChessPc[], pc: ChessPc, attack = false): [number, number][] {
  const at = (c: number, r: number) => pcs.find((q) => q.c === c && q.r === r && q.id !== pc.id)
  const inB = (c: number, r: number) => c >= 0 && c < 8 && r >= 0 && r < 8
  const out: [number, number][] = []
  const tryAdd = (c: number, r: number) => {
    if (!inB(c, r)) return false
    const o = at(c, r)
    if (o && o.dark === pc.dark) return false
    out.push([c, r])
    return !o
  }
  const slide = (dirs: [number, number][]) => {
    for (const [dc, dr] of dirs) for (let k = 1; k < 8 && tryAdd(pc.c + dc * k, pc.r + dr * k); k++);
  }
  const fwd = pc.dark ? 1 : -1
  switch (pc.piece) {
    case 'p':
      for (const dc of [-1, 1]) {
        const o = at(pc.c + dc, pc.r + fwd)
        if (inB(pc.c + dc, pc.r + fwd) && (attack || (o && o.dark !== pc.dark))) out.push([pc.c + dc, pc.r + fwd])
      }
      if (!attack && inB(pc.c, pc.r + fwd) && !at(pc.c, pc.r + fwd)) {
        out.push([pc.c, pc.r + fwd])
        const start = pc.dark ? 1 : 6
        if (pc.r === start && !at(pc.c, pc.r + 2 * fwd)) out.push([pc.c, pc.r + 2 * fwd])
      }
      break
    case 'n':
      for (const [dc, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) tryAdd(pc.c + dc, pc.r + dr)
      break
    case 'k':
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (dc || dr) tryAdd(pc.c + dc, pc.r + dr)
      break
    case 'r':
      slide([[1, 0], [-1, 0], [0, 1], [0, -1]])
      break
    case 'b':
      slide([[1, 1], [1, -1], [-1, 1], [-1, -1]])
      break
    default:
      slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]])
  }
  return out
}

/** "İpuçları": seçili taşın gidebileceği kareler (tehlikede: güvenliyse mavi, tehdit altındaysa kırmızı) */
function ChessHints({ t }: { t: Tile }) {
  const sel = useStore((s) => s.sel)
  const tiles = useStore((s) => s.tiles)
  if (sel.length !== 1) return null
  const pcs = boardPieces(t, tiles)
  const pc = pcs.find((q) => q.id === sel[0])
  if (!pc) return null
  return (
    <g style={{ pointerEvents: 'none' }}>
      {chessMoves(pcs, pc).map(([c, r]) => {
        let fill: string = C.yellow
        if (t.p.highlight === 'danger') {
          const next = pcs.filter((q) => !(q.c === c && q.r === r) || q.id === pc.id).map((q) => (q.id === pc.id ? { ...q, c, r } : q))
          const danger = next.some((q) => q.dark !== pc.dark && chessMoves(next, q, true).some(([cc, rr]) => cc === c && rr === r))
          fill = danger ? C.red : C.blue
        }
        return <circle key={`${c},${r}`} cx={-HALF + c * SQ + SQ / 2} cy={-HALF + r * SQ + SQ / 2} r={SQ * 0.18} fill={fill} opacity={0.85} />
      })}
    </g>
  )
}

/** Taşları başlangıç dizilişine koyar (karışık: şah dışındaki taşlar rastgele) */
function resetChess(board: Tile, api: PadApi, random = false) {
  api.remove(boardPieces(board, api.all()).map((q) => q.id))
  const pick = (k: string) => (k === 'k' ? 'k' : random ? ['q', 'r', 'b', 'n', 'p'][Math.floor(Math.random() * 5)] : k)
  const add: Omit<Tile, 'id'>[] = []
  const put = (c: number, r: number, piece: string, dark: boolean) => {
    const w = toWorld(board, { x: -HALF + c * SQ + SQ / 2, y: -HALF + r * SQ + SQ / 2 })
    add.push({ type: 'chess-piece', x: w.x, y: w.y, rot: board.rot, p: dark ? { piece, dark } : { piece } })
  }
  for (let c = 0; c < 8; c++) {
    put(c, 0, pick(BACK_RANK[c]), true)
    put(c, 1, pick('p'), true)
    put(c, 6, pick('p'), false)
    put(c, 7, pick(BACK_RANK[c]), false)
  }
  api.add(add, false)
  api.sound('snap')
}

const chessBoard: TileDef = {
  type: 'chess-board',
  name: () => 'Satranç tahtası',
  create: () => ({ p: { highlight: 'off' } }),
  bounds: () => rectBox(HALF * 2 + 36, HALF * 2 + 36),
  edgeSnap: false,
  render: (t, ctx) => (
    <>
      <rect x={-HALF - 18} y={-HALF - 18} width={HALF * 2 + 36} height={HALF * 2 + 36} rx={6} fill="#7a5230" />
      {Array.from({ length: 64 }, (_, i) => {
        const c = i % 8
        const r = Math.floor(i / 8)
        return <rect key={i} x={-HALF + c * SQ} y={-HALF + r * SQ} width={SQ} height={SQ} fill={(c + r) % 2 ? '#b0815a' : '#f1dcb4'} />
      })}
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <Label x={-HALF + i * SQ + SQ / 2} y={HALF + 9} size={10} color="#f1dcb4">
            {FILES[i]}
          </Label>
          <Label x={-HALF - 9} y={-HALF + i * SQ + SQ / 2} size={10} color="#f1dcb4">
            {8 - i}
          </Label>
        </g>
      ))}
      {t.p.highlight && t.p.highlight !== 'off' && !ctx.thumb && <ChessHints t={t} />}
    </>
  ),
  onDrop: (t, dropped, api) => {
    let moved = false
    for (const d of dropped) {
      if (d.type !== 'chess-piece') continue
      const l = toLocal(t, d)
      const c = Math.floor((l.x + HALF) / SQ)
      const r = Math.floor((l.y + HALF) / SQ)
      if (c < 0 || c > 7 || r < 0 || r > 7) continue
      const w = toWorld(t, { x: -HALF + c * SQ + SQ / 2, y: -HALF + r * SQ + SQ / 2 })
      api.update(d.id, { x: w.x, y: w.y, rot: t.rot })
      moved = true
    }
    if (moved) {
      api.sound('snap')
      api.commit()
    }
  },
}

const PIECE_BASE = 'M-15 22H15V18Q15 13 10 13H-10Q-15 13 -15 18Z'
const PIECES: Record<string, { name: string; parts: string[]; dots?: [number, number, number][]; detail?: string }> = {
  p: { name: 'piyon', parts: ['M-7 -3Q-9 8 -11 13H11Q9 8 7 -3Z', 'M-9 -5H9V-1H-9Z'], dots: [[0, -11, 7]] },
  r: { name: 'kale', parts: ['M-10 13L-8 -8H8L10 13Z', 'M-12 -8V-19H-7V-14H-2V-19H2V-14H7V-19H12V-8Z'] },
  b: { name: 'fil', parts: ['M-8 13Q-6 0 -4 -4H4Q6 0 8 13Z', 'M0 -19C-10 -12 -9 -4 -4 -3H4C9 -4 10 -12 0 -19Z'], dots: [[0, -21, 2.5]], detail: 'M3 -14L-1 -8' },
  n: { name: 'at', parts: ['M-10 13L-8 3Q-13 -1 -13 -6L-3 -16L-1 -22L3 -16Q13 -11 11 1L10 13Z'], dots: [[-4, -10, 1.6]], detail: 'M-1 -16Q6 -12 7 -2' },
  q: { name: 'vezir', parts: ['M-11 13L-14 -11L-6 -1L0 -15L6 -1L14 -11L11 13Z'], dots: [[-14, -13, 2.6], [0, -18, 2.6], [14, -13, 2.6]] },
  k: { name: 'şah', parts: ['M-11 13L-13 -6Q0 -13 13 -6L11 13Z', 'M-2 -24H2V-20H6V-16H2V-11H-2V-16H-6V-20H-2Z'] },
}

const chessPiece: TileDef = {
  type: 'chess-piece',
  name: (t) => `${t.p.dark ? 'Siyah' : 'Beyaz'} ${PIECES[t.p.piece]?.name ?? 'taş'}`,
  bounds: () => ({ x: -16, y: -25, w: 32, h: 48 }),
  edgeSnap: false,
  render: (t) => {
    const pc = PIECES[t.p.piece] ?? PIECES.p
    const fill = t.p.dark ? '#3a3645' : '#fbfbf5'
    const stroke = t.p.dark ? '#111' : INK
    return (
      <g fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinejoin="round">
        <path d={PIECE_BASE} />
        {pc.parts.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {pc.dots?.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
        {pc.detail && <path d={pc.detail} fill="none" stroke={t.p.dark ? '#ddd' : INK} />}
      </g>
    )
  },
}

// ---------------------------------------------------------------------------
// Paralar (özgün, sade çizimler)
// ---------------------------------------------------------------------------

const COPPER = '#d39a5b'
const GOLD = '#e3c15a'
const SILVER = '#cfd3d8'

interface Money {
  kind: 'coin' | 'note'
  r: number
  color: string
  inner?: string
  text: string
  sub?: string
  hept?: boolean
  name: string
}

function money(cur: string, v: number): Money {
  const coin = (r: number, color: string, text: string, sub: string, name: string, inner?: string, hept?: boolean): Money => ({ kind: 'coin', r, color, text, sub, name, inner, hept })
  const note = (color: string, text: string, sub: string, name: string): Money => ({ kind: 'note', r: 0, color, text, sub, name })
  if (cur === 'TRY') {
    if (v < 1) {
      const k = Math.round(v * 100)
      const spec: Record<number, [number, string]> = { 1: [15, COPPER], 5: [17, COPPER], 10: [19, GOLD], 25: [21, GOLD], 50: [23, SILVER] }
      const [r, c] = spec[k] ?? [18, GOLD]
      return coin(r, c, String(k), 'kuruş', `${k} kuruş`, k === 50 ? GOLD : undefined)
    }
    if (v === 1) return coin(26, SILVER, '1', 'lira', '1 Türk lirası', GOLD)
    const colors: Record<number, string> = { 5: '#b69ddf', 10: '#f5a393', 20: '#91d592', 50: '#fec680', 100: '#87c1f9', 200: '#e687b3' }
    return note(colors[v] ?? '#ddd', `${v} ₺`, 'TÜRK LİRASI', `${v} Türk lirası`)
  }
  if (cur === 'USD') {
    if (v >= 100) return note('#9fc59a', `$${v / 100}`, 'DOLAR', `${v / 100} dolar`)
    const spec: Record<number, [number, string]> = { 1: [17, COPPER], 5: [20, SILVER], 10: [16, SILVER], 25: [22, SILVER] }
    const [r, c] = spec[v] ?? [18, SILVER]
    return coin(r, c, `${v}¢`, 'sent', `${v} sent`)
  }
  if (cur === 'EUR') {
    if (v === 100) return coin(22, SILVER, '1 €', 'euro', '1 euro', GOLD)
    if (v === 200) return coin(24, GOLD, '2 €', 'euro', '2 euro', SILVER)
    const spec: Record<number, [number, string]> = { 1: [15, COPPER], 2: [17, COPPER], 5: [19, COPPER], 10: [18, GOLD], 20: [20, GOLD], 50: [22, GOLD] }
    const [r, c] = spec[v] ?? [18, GOLD]
    return coin(r, c, String(v), 'cent', `${v} euro sent`)
  }
  // GBP
  if (v === 100) return coin(22, GOLD, '£1', 'sterlin', '1 sterlin', SILVER)
  if (v === 200) return coin(25, SILVER, '£2', 'sterlin', '2 sterlin', GOLD)
  const spec: Record<number, [number, string, boolean?]> = { 1: [15, COPPER], 2: [19, COPPER], 5: [15, SILVER], 10: [21, SILVER], 20: [19, SILVER, true], 50: [24, SILVER, true] }
  const [r, c, h] = spec[v] ?? [18, SILVER]
  return coin(r, c, `${v}p`, 'peni', `${v} peni`, undefined, h)
}

const NOTE_W = 176
const NOTE_H = 88

const currency: TileDef = {
  type: 'currency',
  name: (t) => money(t.p.currency, t.p.value).name,
  create: (p) => ({ p: { currency: p.currency ?? 'TRY', value: p.value ?? 1 } }),
  bounds: (t) => {
    const m = money(t.p.currency, t.p.value)
    return m.kind === 'note' ? rectBox(NOTE_W, NOTE_H) : rectBox(m.r * 2 + 2, m.r * 2 + 2)
  },
  edgeSnap: false,
  render: (t) => {
    const m = money(t.p.currency, t.p.value)
    if (m.kind === 'note') {
      const d = edge(m.color)
      return (
        <>
          <rect x={-NOTE_W / 2} y={-NOTE_H / 2} width={NOTE_W} height={NOTE_H} rx={5} fill={m.color} stroke={d} strokeWidth={1.5} />
          <rect x={-NOTE_W / 2 + 6} y={-NOTE_H / 2 + 6} width={NOTE_W - 12} height={NOTE_H - 12} rx={3} fill="none" stroke={d} strokeWidth={1} strokeDasharray="2 3" />
          {[10, 18, 26, 34].map((r) => (
            <circle key={r} cx={44} cy={0} r={r} fill="none" stroke={d} strokeWidth={1} opacity={0.5} />
          ))}
          <path d="M-70 18Q-50 8 -30 18T10 18" fill="none" stroke={d} strokeWidth={1} opacity={0.6} />
          <Label x={-74} y={-22} size={20} weight={900} anchor="start" color={INK}>
            {m.text}
          </Label>
          <Label x={-74} y={4} size={9} weight={800} anchor="start" color={d}>
            {m.sub}
          </Label>
          <Label x={44} y={0} size={14} weight={900} color={INK}>
            {m.text}
          </Label>
        </>
      )
    }
    const d = edge(m.color)
    const shape = m.hept ? <path d={pathOf(regularPolygon(7, 2 * m.r * Math.sin(Math.PI / 7)).map((p) => ({ x: p.x, y: p.y - (m.r - m.r * Math.cos(Math.PI / 7)) / 2 })))} fill={m.color} stroke={d} strokeWidth={1.5} strokeLinejoin="round" /> : <circle r={m.r} fill={m.color} stroke={d} strokeWidth={1.5} />
    return (
      <>
        {shape}
        {m.inner ? <circle r={m.r * 0.64} fill={m.inner} stroke={edge(m.inner)} strokeWidth={1} /> : <circle r={m.r - 3} fill="none" stroke={d} strokeWidth={1} opacity={0.6} />}
        <Label y={m.sub && m.r >= 17 ? -3 : 0} size={Math.max(8, m.r * 0.55)} weight={900} color={INK}>
          {m.text}
        </Label>
        {m.r >= 17 && (
          <Label y={m.r * 0.42} size={Math.max(5.5, m.r * 0.26)} weight={800} color={INK}>
            {m.sub}
          </Label>
        )}
      </>
    )
  },
}

// ---------------------------------------------------------------------------
// Saatler
// ---------------------------------------------------------------------------

const R = 72
const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0')
const tip = (angle: number, len: number): Pt => ({ x: Math.sin((angle * Math.PI) / 180) * len, y: -Math.cos((angle * Math.PI) / 180) * len })
const angleOf = (l: Pt) => mod(deg(Math.atan2(l.x, -l.y)), 360)

function Face({ t, h, m, s: sec, digital }: { t: Tile; h: number; m: number; s?: number; digital: string }) {
  // Saniye ibresi ve dijital saniyeler "Saniyeler" seçeneğine bağlı
  const s = t.p.showSeconds === false ? undefined : sec
  if (t.p.showSeconds === false) digital = digital.split(':').slice(0, 2).join(':')
  const hourTip = tip(h, 38)
  const minTip = tip(m, 58)
  return (
    <>
      <circle r={R} fill="#fff" stroke={INK} strokeWidth={4} />
      {Array.from({ length: 60 }, (_, i) => {
        const a = tip(i * 6, R - 4)
        const b = tip(i * 6, i % 5 ? R - 8 : R - 13)
        return <path key={i} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke={INK} strokeWidth={i % 5 ? 1 : 2.5} />
      })}
      {!t.p.noNumbers &&
        Array.from({ length: 12 }, (_, i) => {
          const p = tip((i + 1) * 30, R - 25)
          return (
            <Label key={i} x={p.x} y={p.y} size={14} weight={800}>
              {i + 1}
            </Label>
          )
        })}
      <path d={`M0 0L${hourTip.x} ${hourTip.y}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d={`M0 0L${minTip.x} ${minTip.y}`} stroke={C.blue} strokeWidth={4} strokeLinecap="round" />
      {s !== undefined && (
        <path d={`M${tip(s, -12).x} ${tip(s, -12).y}L${tip(s, 62).x} ${tip(s, 62).y}`} stroke={C.red} strokeWidth={1.5} strokeLinecap="round" />
      )}
      <circle r={4.5} fill={INK} />
      {t.p.clock !== 'live' && (
        <>
          <circle cx={hourTip.x} cy={hourTip.y} r={5} fill={INK} />
          <circle cx={minTip.x} cy={minTip.y} r={5} fill={C.blue} />
          {s !== undefined && <circle cx={tip(s, 62).x} cy={tip(s, 62).y} r={4} fill={C.red} />}
        </>
      )}
      {t.p.digital && (
        <g>
          <rect x={-46} y={R + 6} width={92} height={26} rx={6} fill={INK} />
          <text y={R + 19} textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontWeight={800} fontSize={15} fill="#fff" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {digital}
          </text>
        </g>
      )}
    </>
  )
}

function LiveClock({ t, thumb }: { t: Tile; thumb: boolean }) {
  const [now, setNow] = useState(() => (thumb ? new Date(2000, 0, 1, 10, 10, 30) : new Date()))
  useEffect(() => {
    if (thumb) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [thumb])
  const h = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()
  return <Face t={t} h={((h % 12) + m / 60) * 30} m={(m + s / 60) * 6} s={s * 6} digital={`${pad2(h)}:${pad2(m)}:${pad2(s)}`} />
}

const clock: TileDef = {
  type: 'clock',
  name: (t) => (t.p.clock === 'live' ? 'Canlı saat' : t.p.clock === 'geared' ? 'Dişli saat' : 'Serbest saat'),
  create: (p) => {
    if (p.clock === 'geared') return { p: { clock: 'geared', min: Math.round((Number(p.ms) || 0) / 60) % 720, showSeconds: true } }
    if (p.clock === 'free') return { p: { clock: 'free', h: Number(p.h) || 0, m: Number(p.m) || 0, s: Number(p.s) || 0, showSeconds: true } }
    return { p: { clock: 'live', showSeconds: true } }
  },
  bounds: (t) => ({ x: -R - 2, y: -R - 2, w: 2 * R + 4, h: 2 * R + 4 + (t.p.digital ? 36 : 0) }),
  edgeSnap: false,
  render: (t, ctx) => {
    if (t.p.clock === 'live') return <LiveClock t={t} thumb={!!ctx.thumb} />
    if (t.p.clock === 'geared') {
      const min = mod(t.p.min, 720)
      const hh = Math.floor(min / 60) || 12
      return <Face t={t} h={min / 2} m={(min % 60) * 6} digital={`${hh}:${pad2(min % 60)}`} />
    }
    const hh = Math.floor(mod(t.p.h, 12)) || 12
    return <Face t={t} h={mod(t.p.h, 12) * 30} m={t.p.m * 6} s={t.p.s * 6} digital={`${hh}:${pad2(t.p.m)}:${pad2(t.p.s)}`} />
  },
  handles: (t) => {
    if (t.p.clock === 'geared') {
      const min = mod(t.p.min, 720)
      const h = tip(min / 2, 38)
      const m = tip((min % 60) * 6, 58)
      return [
        { id: 'h', ...h, show: 'always', hidden: true },
        { id: 'm', ...m, show: 'always', hidden: true },
      ]
    }
    if (t.p.clock === 'free')
      return [
        { id: 'h', ...tip(mod(t.p.h, 12) * 30, 38), show: 'always', hidden: true },
        { id: 'm', ...tip(t.p.m * 6, 58), show: 'always', hidden: true },
        ...(t.p.showSeconds === false ? [] : [{ id: 's', ...tip(t.p.s * 6, 62), show: 'always' as const, hidden: true }]),
      ]
    return []
  },
  onHandle: (t, id, l) => {
    const a = angleOf(l)
    if (t.p.clock === 'geared') {
      if (id === 'h') return { p: { ...t.p, min: mod(Math.round((a / 360) * 720), 720) } }
      const cur = mod(t.p.min, 60)
      let delta = Math.round(a / 6) % 60 - cur
      if (delta > 30) delta -= 60
      if (delta < -30) delta += 60
      return { p: { ...t.p, min: mod(t.p.min + delta, 720) } }
    }
    if (id === 'h') return { p: { ...t.p, h: mod(Math.round(a / 6) / 5, 12) } }
    return { p: { ...t.p, [id]: Math.round(a / 6) % 60 } }
  },
}

// ---------------------------------------------------------------------------
// Domino
// ---------------------------------------------------------------------------

const DW = UNIT * 1.5
const DH = UNIT * 3
const PIPS: Record<number, [number, number][]> = {
  0: [],
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
}

const domino: TileDef = {
  type: 'domino',
  name: (t) => `Domino ${t.p.a}–${t.p.b}`,
  bounds: () => rectBox(DW, DH),
  outline: () => [
    { x: -DW / 2, y: -DH / 2 },
    { x: DW / 2, y: -DH / 2 },
    { x: DW / 2, y: DH / 2 },
    { x: -DW / 2, y: DH / 2 },
  ],
  render: (t) => (
    <>
      <rect x={-DW / 2} y={-DH / 2} width={DW} height={DH} rx={6} fill="#fffaf0" stroke={INK} strokeWidth={2} />
      <path d={`M${-DW / 2 + 6} 0H${DW / 2 - 6}`} stroke={INK} strokeWidth={1.5} />
      {[t.p.a, t.p.b].map((v: number, half) =>
        (PIPS[v] ?? []).map(([x, y], i) => <circle key={`${half}-${i}`} cx={x * 13} cy={(half ? DH / 4 : -DH / 4) + y * 13} r={4.5} fill={INK} />),
      )}
    </>
  ),
}

export const appsTiles: TileDef[] = [piano, song, logicButton, logicSwitch, logicMetronome, logicBulb, logicSpeaker, logicDisplay, logicGate, chessBoard, chessPiece, currency, clock, domino]

// ---------------------------------------------------------------------------
// Para bozma / birleştirme / düzenleme
// ---------------------------------------------------------------------------

/** Para birimlerinin değerleri (TRY kuruş cinsinden tamsayı, diğerleri sent/peni) */
const DENOMS: Record<string, number[]> = {
  TRY: [1, 5, 10, 25, 50, 100, 500, 1000, 2000, 5000, 10000, 20000],
  USD: [1, 5, 10, 25, 100],
  EUR: [1, 2, 5, 10, 20, 50, 100, 200],
  GBP: [1, 2, 5, 10, 20, 50, 100, 200],
}
const toInt = (cur: string, v: number) => (cur === 'TRY' ? Math.round(v * 100) : v)
const fromInt = (cur: string, n: number) => (cur === 'TRY' ? n / 100 : n)

/** Açgözlü yöntemle toplamı verilen değerlere böler (yalnızca sınırdan küçük değerler) */
function greedy(cur: string, total: number, below = Infinity): number[] {
  const ds = (DENOMS[cur] ?? []).filter((d) => d < below && d <= total)
  const out: number[] = []
  let sum = 0
  for (let i = ds.length - 1; i >= 0 && sum < total; ) {
    if (sum + ds[i] <= total) {
      sum += ds[i]
      out.push(ds[i])
    } else i--
  }
  return sum === total ? out : []
}

/** Bir paranın bozuk hâli (kendisinden küçük değerlerle) */
const changeOf = (t: Tile) => greedy(t.p.currency, toInt(t.p.currency, t.p.value), toInt(t.p.currency, t.p.value)).map((n) => fromInt(t.p.currency, n))

const byCurrency = (ts: Tile[]) => Object.keys(DENOMS).map((c) => ts.filter((t) => t.type === 'currency' && t.p.currency === c)).filter((g) => g.length)

/** Bir grubu daha büyük değerlere çevirir; değişmiyorsa undefined */
function cashInOf(group: Tile[]): number[] | undefined {
  const cur = group[0].p.currency
  const vals = group.map((t) => toInt(cur, t.p.value))
  const res = greedy(cur, vals.reduce((a, b) => a + b, 0))
  if (!res.length) return
  const key = (a: number[]) => [...a].sort((x, y) => x - y).join(',')
  if (key(res) === key(vals)) return
  return res.map((n) => fromInt(cur, n))
}

const moneySize = (cur: string, v: number) => {
  const m = money(cur, v)
  return m.kind === 'note' ? { w: NOTE_W, h: NOTE_H } : { w: m.r * 2, h: m.r * 2 }
}

/** Paraları değere göre satırlara dizer: aynı değerler aynı satırda, en çok 10 sütun */
function moneyGrid(cur: string, values: number[]): Pt[] {
  const sizes = values.map((v) => moneySize(cur, v))
  const cw = Math.max(...sizes.map((z) => z.w)) + 10
  const ch = Math.max(...sizes.map((z) => z.h)) + 10
  const counts = new Map<number, number>()
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
  const grouped = [...counts.values()].some((n) => n >= 3) || values.length > 10
  let col = -1
  let row = 0
  const cells: [number, number][] = values.map((v, i) => {
    if (!grouped) return [i % 10, Math.floor(i / 10)]
    const newRow = i > 0 && (col + 1 >= 10 || v !== values[i - 1])
    col = newRow ? 0 : col + 1
    if (newRow) row++
    return [col, row]
  })
  const mx = Math.max(...cells.map((c) => c[0]))
  const my = Math.max(...cells.map((c) => c[1]))
  return cells.map(([c, r]) => ({ x: (c - mx / 2) * cw, y: (r - my / 2) * ch }))
}

const centerOf = (ts: Tile[]) => {
  const xs = ts.map((t) => t.x)
  const ys = ts.map((t) => t.y)
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

// ---------------------------------------------------------------------------
// Eylem çubuğu (Polypad eylemleri)
// ---------------------------------------------------------------------------

const p = (patch: Record<string, unknown>) => ({ p: patch })
const all = (ts: Tile[], f: (t: Tile) => boolean) => ts.every(f)

const SCALE_OPTIONS = [
  { key: 'major', label: 'Majör' },
  { key: 'minor', label: 'Minör' },
  { key: 'chromatic', label: 'Kromatik' },
  { key: 'blues', label: 'Blues' },
  { key: 'pentatonic', label: 'Pentatonik' },
]

export const appsActions: ActionSpec[] = [
  // Parça (song)
  { id: 'song-play', type: 'button', tileTypes: ['song'], label: 'Çal', icon: 'play', location: 'bar', order: 0, show: (ts) => ts.some((t) => !t.p.playing), click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { playing: true })) },
  { id: 'song-pause', type: 'button', tileTypes: ['song'], label: 'Durdur', icon: 'pause', location: 'bar', order: 1, show: (ts) => ts.some((t) => t.p.playing), click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { playing: false })) },
  { id: 'loops', type: 'input', tileTypes: ['song'], label: 'Tekrar:', value: 'number', range: [1, 100], get: (t) => t.p.loops ?? 1, set: (v: number) => p({ loops: Math.round(v) }) },
  {
    id: 'playback',
    type: 'select',
    tileTypes: ['song'],
    label: 'Çalma:',
    location: 'music',
    options: [
      { key: 'timeline', label: 'Zaman çizelgesi' },
      { key: 'sequence', label: 'Sıra' },
    ],
    get: (t) => t.p.playbackType ?? 'timeline',
    set: (v: string) => p({ playbackType: v }),
  },
  {
    id: 'song-labels',
    type: 'select',
    tileTypes: ['song'],
    label: 'Etiketler:',
    location: 'music',
    show: (ts) => all(ts, (t) => t.p.musicScale !== 'percussion'),
    options: [
      { key: 'hidden', label: 'Yok' },
      { key: 'number', label: 'Sayılar' },
      { key: 'text', label: 'Notalar' },
    ],
    get: (t) => t.p.labels || 'text',
    set: (v: string) => p({ labels: v }),
  },
  { id: 'showGrid', type: 'checkbox', tileTypes: ['song'], label: 'Dikey çizgiler:', location: 'music', show: (ts) => all(ts, (t) => t.p.playbackType !== 'sequence'), get: (t) => !!t.p.showGrid, set: (v: boolean) => p({ showGrid: v }) },
  { id: 'rowSize', type: 'input', tileTypes: ['song'], label: 'Satır yüksekliği:', location: 'music', value: 'number', range: [0.5, 10], step: 0.5, get: (t) => t.p.rowSize ?? 1, set: (v: number) => p({ rowSize: v }) },
  { id: 'colSize', type: 'input', tileTypes: ['song'], label: 'Sütun genişliği:', location: 'music', value: 'number', range: [0.25, 10], step: 0.25, get: (t) => t.p.colSize ?? 1, set: (v: number) => p({ colSize: v }) },
  { id: 'bar-length', type: 'input', tileTypes: ['song'], label: 'Ölçü uzunluğu:', location: 'music', value: 'number', range: [1, 16], get: (t) => t.p.barLength ?? 4, set: (v: number) => p({ barLength: Math.round(v) }) },
  {
    id: 'song-scale',
    type: 'select',
    tileTypes: ['song', 'piano'],
    label: 'Müzik ölçeği:',
    location: 'music',
    options: [...SCALE_OPTIONS, { key: 'percussion', label: 'Vurmalı' }, { key: 'none', label: 'Yok' }],
    get: (t) => t.p.musicScale ?? 'major',
    // Vurmalı yalnızca parçada anlamlı
    set: (v: string, t) => p({ musicScale: v === 'percussion' && t.type !== 'song' ? 'major' : v }),
  },
  { id: 'song-tempo', type: 'input', tileTypes: ['song'], label: 'Tempo:', location: 'music', value: 'number', range: [0.25, 4], step: 0.25, get: (t) => t.p.tempo ?? 1, set: (v: number) => p({ tempo: v }) },
  { id: 'song-slower', type: 'button', tileTypes: ['song'], label: 'Yavaşlat', icon: 'minus', location: 'more', click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { bpm: Math.max(40, (t.p.bpm ?? 120) - 20) })) },
  { id: 'song-faster', type: 'button', tileTypes: ['song'], label: 'Hızlandır', icon: 'add', location: 'more', click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { bpm: Math.min(240, (t.p.bpm ?? 120) + 20) })) },
  { id: 'song-clear', type: 'button', tileTypes: ['song'], label: 'Temizle', icon: 'reset', location: 'more', click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { cells: [], playing: false })) },

  // Klavye
  {
    id: 'audio-labels',
    type: 'select',
    tileTypes: ['piano'],
    label: 'Etiketler:',
    location: 'music',
    options: [
      { key: 'hidden', label: 'Yok' },
      { key: 'number', label: 'Sayılar' },
      { key: 'modular', label: 'Modüler sayılar' },
      { key: 'text', label: 'Notalar' },
      { key: 'color', label: 'Renkler' },
    ],
    get: (t) => pianoLabels(t),
    set: (v: string) => p({ labels: v }),
  },
  { id: 'key', type: 'input', tileTypes: ['piano'], label: 'Başlangıç notası:', location: 'music', value: 'number', range: [-24, 24], show: (ts) => all(ts, (t) => pianoLabels(t) !== 'hidden'), get: (t) => t.p.note ?? 0, set: (v: number) => p({ note: Math.round(v) }) },

  // Hoparlör
  { id: 'pitch', type: 'input', tileTypes: ['logic-speaker'], label: 'Nota:', location: 'music', value: 'number', range: [-50, 50], get: (t) => t.p.note ?? 0, set: (v: number) => p({ note: Math.round(v) }) },
  { id: 'volume', type: 'input', tileTypes: ['piano', 'logic-speaker', 'song'], label: 'Ses düzeyi:', location: 'music', value: 'number', range: [0, 10], get: (t) => t.p.volume ?? 1, set: (v: number) => p({ volume: v }) },

  // Metronom
  { id: 'metronome-play', type: 'button', tileTypes: ['logic-metronome'], label: 'Başlat', icon: 'play', show: (ts) => all(ts, (t) => !!t.p.paused), click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { paused: false })) },
  { id: 'metronome-pause', type: 'button', tileTypes: ['logic-metronome'], label: 'Durdur', icon: 'pause', show: (ts) => ts.some((t) => !t.p.paused), click: (ts, api) => ts.forEach((t) => api.updateP(t.id, { paused: true })) },
  { id: 'bpm', type: 'input', tileTypes: ['logic-metronome'], label: 'Vuruş/dk:', value: 'number', range: [10, 200], get: (t) => t.p.bpm ?? 60, set: (v: number) => p({ bpm: Math.max(1, Math.min(240, Math.round(v))) }) },

  // Satranç
  {
    id: 'hints',
    type: 'select',
    tileTypes: ['chess-board'],
    label: 'İpuçları:',
    options: [
      { key: 'off', label: 'Yok' },
      { key: 'moves', label: 'Hamleler' },
      { key: 'danger', label: 'Tehlike' },
    ],
    get: (t) => t.p.highlight || 'off',
    set: (v: string) => p({ highlight: v }),
  },
  { id: 'chess-reset', type: 'button', tileTypes: ['chess-board'], label: 'Sıfırla', click: (ts, api) => ts.forEach((t) => resetChess(t, api)) },
  { id: 'randomise', type: 'button', tileTypes: ['chess-board'], label: 'Karıştır', icon: 'random', text: true, location: 'more', click: (ts, api) => ts.forEach((t) => resetChess(t, api, true)) },

  // Saat
  { id: 'seconds', type: 'checkbox', tileTypes: ['clock'], label: 'Saniyeler:', get: (t) => t.p.showSeconds !== false, set: (v: boolean) => p({ showSeconds: v }) },
  { id: 'clock-digital', type: 'checkbox', tileTypes: ['clock'], label: 'Dijital saat:', location: 'more', get: (t) => !!t.p.digital, set: (v: boolean) => p({ digital: v }) },
  { id: 'clock-numbers', type: 'checkbox', tileTypes: ['clock'], label: 'Sayılar:', location: 'more', get: (t) => !t.p.noNumbers, set: (v: boolean) => p({ noNumbers: !v }) },

  // Paralar
  {
    id: 'make-change',
    type: 'button',
    tileTypes: ['currency'],
    label: 'Bozdur',
    icon: 'split-dots',
    text: true,
    show: (ts) => {
      const n = ts.reduce((s, t) => s + changeOf(t).length, 0)
      return n >= 1 && n <= 200
    },
    click: (ts, api) => {
      const add: Omit<Tile, 'id'>[] = []
      const gone: string[] = []
      for (const t of ts) {
        const parts = changeOf(t)
        if (!parts.length) continue
        gone.push(t.id)
        const size = Math.max(...parts.map((v) => Math.max(moneySize(t.p.currency, v).w, moneySize(t.p.currency, v).h)))
        const rad = parts.length === 1 ? 0 : size * 0.55 * Math.max(1, parts.length / 4)
        const a0 = Math.random() * Math.PI
        parts.forEach((v, i) => {
          const a = a0 + (2 * Math.PI * i) / parts.length
          add.push({ type: 'currency', x: t.x + Math.cos(a) * rad, y: t.y + Math.sin(a) * rad, rot: t.rot, p: { currency: t.p.currency, value: v } })
        })
      }
      api.remove(gone)
      api.add(add)
      api.sound('pop')
    },
  },
  {
    id: 'cash-in',
    type: 'button',
    tileTypes: ['currency'],
    label: 'Birleştir',
    icon: 'combine-dots',
    text: true,
    show: (ts) => ts.length > 1 && byCurrency(ts).some((g) => !!cashInOf(g)),
    click: (ts, api) => {
      const add: Omit<Tile, 'id'>[] = []
      for (const g of byCurrency(ts)) {
        const res = cashInOf(g)
        if (!res) continue
        const cur = g[0].p.currency
        const c = centerOf(g)
        const vals = [...res].sort((x, y) => y - x)
        const pos = moneyGrid(cur, vals)
        api.remove(g.map((t) => t.id))
        vals.forEach((v, i) => add.push({ type: 'currency', x: c.x + pos[i].x, y: c.y + pos[i].y, rot: 0, p: { currency: cur, value: v } }))
      }
      if (add.length) api.add(add)
      api.sound('snap')
    },
  },
  {
    id: 'organize',
    type: 'button',
    tileTypes: ['currency'],
    label: 'Düzenle',
    show: (ts) => ts.length > 1 && byCurrency(ts).some((g) => g.length > 1),
    click: (ts, api) => {
      for (const g of byCurrency(ts)) {
        if (g.length <= 1) continue
        const c = centerOf(g)
        const sorted = [...g].sort((a, b) => b.p.value - a.p.value || a.y - b.y || a.x - b.x)
        const pos = moneyGrid(g[0].p.currency, sorted.map((t) => t.p.value))
        sorted.forEach((t, i) => api.update(t.id, { x: c.x + pos[i].x, y: c.y + pos[i].y, rot: 0 }))
      }
    },
  },
]
