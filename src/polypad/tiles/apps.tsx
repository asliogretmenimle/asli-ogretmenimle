import { useEffect, useRef, useState } from 'react'
import type { PadApi, Pt, RenderCtx, Tile, TileDef } from '../types'
import { UNIT, deg, mod, regularPolygon, pathOf, toLocal, toWorld } from '../geom'
import { midiFreq } from '../sound'
import { C, FONT, Label, action, edge, rectBox, toggle } from './kit'
import { api as storeApi } from '../store'

// Bileşenler içinden (zamanlayıcılar) parça güncellemek için. Döngüsel içe aktarma güvenli:
// store yalnızca çalışma anında kullanılır, modül yüklenirken değil.
const withApi = (fn: (a: PadApi) => void) => fn(storeApi)

// ---------------------------------------------------------------------------
// Müzik
// ---------------------------------------------------------------------------

const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']
const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11]
const KW = 24
const KH = 96
const PIANO_START = 60

/** İki oktav: 14 beyaz, 10 siyah tuş */
const pianoKeys = (() => {
  const white: { midi: number; x: number; name: string }[] = []
  const black: { midi: number; x: number }[] = []
  for (let o = 0; o < 2; o++)
    WHITE_STEPS.forEach((s, i) => {
      const idx = o * 7 + i
      const x = -168 + idx * KW
      white.push({ midi: PIANO_START + o * 12 + s, x, name: SOLFEGE[i] })
      if (i !== 2 && i !== 6) black.push({ midi: PIANO_START + o * 12 + s + 1, x: x + KW - 7 })
    })
  return { white, black }
})()

const piano: TileDef = {
  type: 'piano',
  name: () => 'Klavye',
  bounds: () => rectBox(348, 108),
  edgeSnap: false,
  render: (t) => (
    <>
      <rect x={-174} y={-54} width={348} height={108} rx={8} fill="#3a3645" />
      {pianoKeys.white.map((k) => (
        <g key={k.midi}>
          <rect data-act="key" data-v={k.midi} x={k.x} y={-48} width={KW} height={KH} rx={3} fill={t.p.lit === k.midi ? '#87c1f9' : '#fff'} stroke="#3a3645" strokeWidth={1} />
          {t.p.labels && (
            <Label x={k.x + KW / 2} y={36} size={9} color="#555">
              {k.name}
            </Label>
          )}
        </g>
      ))}
      {pianoKeys.black.map((k) => (
        <rect key={k.midi} data-act="key" data-v={k.midi} x={k.x} y={-48} width={14} height={58} rx={2} fill={t.p.lit === k.midi ? '#0f82f2' : '#242436'} />
      ))}
    </>
  ),
  onTap: (t, api, info) => {
    if (info.act !== 'key') return
    const m = Number(info.v)
    api.note(midiFreq(m), 0.7)
    api.updateP(t.id, { lit: m })
    setTimeout(() => {
      if (api.get(t.id)?.p.lit === m) api.updateP(t.id, { lit: null })
    }, 260)
  },
  actions: (t) => [toggle(t, 'labels', 'Nota adlarını göster', 'label')],
}

const STEPS = 16
const ROWS = 8
const CELL = 18
const PITCHES = [72, 71, 69, 67, 65, 64, 62, 60]
const ROW_NAMES = ['Do', 'Si', 'La', 'Sol', 'Fa', 'Mi', 'Re', 'Do']
const ROW_COLORS = ['#cd0e66', '#6d3bbf', '#0f82f2', '#009ea6', '#22ab24', '#bfc212', '#fd8c00', '#eb4726']
const GX = -133
const GY = -72

function SongView({ t, thumb }: { t: Tile; thumb: boolean }) {
  const [step, setStep] = useState(-1)
  const cells = useRef<number[]>(t.p.cells)
  cells.current = t.p.cells
  const playing = !!t.p.playing && !thumb
  const bpm: number = t.p.bpm
  useEffect(() => {
    if (!playing) {
      setStep(-1)
      return
    }
    let s = 0
    const tick = () => {
      setStep(s)
      const now = s
      cells.current.filter((c) => Math.floor(c / ROWS) === now).forEach((c) => withApi((a) => a.note(midiFreq(PITCHES[c % ROWS]), 0.3)))
      s = (s + 1) % STEPS
    }
    tick()
    const id = window.setInterval(tick, 60000 / bpm / 2)
    return () => window.clearInterval(id)
  }, [playing, bpm])
  const on = new Set<number>(t.p.cells)
  return (
    <>
      <rect x={-161} y={-78} width={322} height={156} rx={8} fill="#fff" stroke="#3a3645" strokeWidth={2} />
      {ROW_NAMES.map((n, r) => (
        <Label key={r} x={-144} y={GY + r * CELL + CELL / 2} size={9} color="#555">
          {n}
        </Label>
      ))}
      {step >= 0 && <rect x={GX + step * CELL} y={GY} width={CELL} height={ROWS * CELL} fill="#fec680" opacity={0.5} />}
      {Array.from({ length: STEPS * ROWS }, (_, i) => {
        const s = Math.floor(i / ROWS)
        const r = i % ROWS
        return (
          <rect
            key={i}
            data-act="cell"
            data-v={i}
            x={GX + s * CELL + 1.5}
            y={GY + r * CELL + 1.5}
            width={CELL - 3}
            height={CELL - 3}
            rx={3}
            fill={on.has(i) ? ROW_COLORS[r] : s % 4 === 0 ? '#e6e6ee' : '#f2f2f6'}
          />
        )
      })}
    </>
  )
}

const song: TileDef = {
  type: 'song',
  name: () => 'Parça',
  create: () => ({ p: { cells: [7, 13, 21, 31, 39, 45, 53, 59, 64 + 7, 64 + 13, 64 + 21, 64 + 31, 64 + 39, 64 + 45, 64 + 53, 64 + 63], bpm: 120, playing: false } }),
  bounds: () => rectBox(322, 156),
  edgeSnap: false,
  render: (t, ctx) => <SongView t={t} thumb={!!ctx.thumb} />,
  onTap: (t, api, info) => {
    if (info.act !== 'cell') return
    const i = Number(info.v)
    const cells: number[] = t.p.cells
    const has = cells.includes(i)
    if (!has) api.note(midiFreq(PITCHES[i % ROWS]), 0.3)
    api.updateP(t.id, { cells: has ? cells.filter((c) => c !== i) : [...cells, i] }, true)
  },
  actions: (t) => [
    action('play', t.p.playing ? 'Durdur' : 'Çal', t.p.playing ? 'pause' : 'play', (tile, api) => api.updateP(tile.id, (p) => ({ playing: !p.playing })), !!t.p.playing),
    action('slower', `Yavaşlat (${t.p.bpm})`, 'minus', (tile, api) => api.updateP(tile.id, (p) => ({ bpm: Math.max(40, p.bpm - 20) }), true)),
    action('faster', `Hızlandır (${t.p.bpm})`, 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ bpm: Math.min(240, p.bpm + 20) }), true)),
    action('clear', 'Temizle', 'reset', (tile, api) => api.updateP(tile.id, { cells: [] }, true)),
  ],
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
  actions: (t) => [
    action('pause', t.p.paused ? 'Başlat' : 'Durdur', t.p.paused ? 'play' : 'pause', (tile, api) => api.updateP(tile.id, (p) => ({ paused: !p.paused }), true)),
    action('slower', `Yavaşlat (${t.p.bpm} vuruş/dk)`, 'minus', (tile, api) => api.updateP(tile.id, (p) => ({ bpm: Math.max(15, p.bpm - 15) }), true)),
    action('faster', `Hızlandır (${t.p.bpm} vuruş/dk)`, 'plus', (tile, api) => api.updateP(tile.id, (p) => ({ bpm: Math.min(300, p.bpm + 15) }), true)),
  ],
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

function SpeakerFx({ on, thumb }: { on: boolean; thumb: boolean }) {
  const prev = useRef(on)
  useEffect(() => {
    if (on && !prev.current && !thumb) withApi((a) => a.note(660, 0.3, 'square'))
    prev.current = on
  }, [on, thumb])
  return null
}

const logicSpeaker: TileDef = {
  ...logicBase,
  type: 'logic-speaker',
  name: () => 'Hoparlör',
  watch: true,
  create: () => ({ p: { inputs: [null] } }),
  bounds: () => ({ x: -40, y: -24, w: 76, h: 48 }),
  render: (t, ctx) => {
    const on = inVals(t, tilesOf(t, ctx))[0] === 1
    return (
      <>
        <SpeakerFx on={on} thumb={!!ctx.thumb} />
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

const chessBoard: TileDef = {
  type: 'chess-board',
  name: () => 'Satranç tahtası',
  bounds: () => rectBox(HALF * 2 + 36, HALF * 2 + 36),
  edgeSnap: false,
  render: () => (
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

function Face({ t, h, m, s, digital }: { t: Tile; h: number; m: number; s?: number; digital: string }) {
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
    if (p.clock === 'geared') return { p: { clock: 'geared', min: Math.round((Number(p.ms) || 0) / 60) % 720 } }
    if (p.clock === 'free') return { p: { clock: 'free', h: Number(p.h) || 0, m: Number(p.m) || 0, s: Number(p.s) || 0 } }
    return { p: { clock: 'live' } }
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
        { id: 's', ...tip(t.p.s * 6, 62), show: 'always', hidden: true },
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
  actions: (t) => [toggle(t, 'digital', 'Dijital saati göster', 'clock'), toggle(t, 'noNumbers', 'Sayıları gizle', 'hash')],
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
