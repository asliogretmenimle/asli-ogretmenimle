import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Copy, Eye, Send, Share2, Wand2 } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Nudge, Scene, StrategyPicker, useSolutions } from '../../games/kit2'
import { ZoomBox } from '../../interactive/ZoomBox'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { NextButton, Pad, Panel, TopBar, fmtN, parseQ, useLook, type Look } from '../islem-zinciri/kit'

/**
 * 34. Sayı Örüntüsü Tasarımcısı
 *  Kural kurucu (başla + her adımda ekle/çarp, n. terim kuralı, kareler, kuvvetler, sırayla ekle-çıkar) ile
 *  örüntü tasarlanır; canlı boncuk dizisi (5+: grafik) güncellenir. Kural gizlenir, “Bilge” (sanal arkadaş)
 *  gösterilen terimlerden kural tahmin eder — az terim gösterilirse başka bir kurala kanabilir!
 *  Tasarlanan örüntü ?oruntu=… linkiyle arkadaşa gönderilir; link açılınca ilk görev o örüntüyü çözmektir.
 */

// ───────────────────────── Kurallar ─────────────────────────

type Kind = 'add' | 'mul' | 'lin' | 'sq' | 'pow' | 'alt'
interface Rule { k: Kind; a: number; b: number; c: number }
// add: a başla, b fark · mul: a başla, b oran · lin: a·n + b · sq: n² + b · pow: a^n · alt: a başla, +b, −c

const r6 = (x: number) => Math.round(x * 1e6) / 1e6
function term(r: Rule, n: number): number {
  switch (r.k) {
    case 'add': return r6(r.a + (n - 1) * r.b)
    case 'mul': return r6(r.a * r.b ** (n - 1))
    case 'lin': return r6(r.a * n + r.b)
    case 'sq': return n * n + r.b
    case 'pow': return r.a ** n
    case 'alt': {
      const up = Math.ceil((n - 1) / 2), down = Math.floor((n - 1) / 2)
      return r.a + up * r.b - down * r.c
    }
  }
}
const terms = (r: Rule, k: number) => Array.from({ length: k }, (_, i) => term(r, i + 1))
const same = (a: Rule, b: Rule, k = 8) => terms(a, k).every((v, i) => Math.abs(v - term(b, i + 1)) < 1e-9)
const sgn = (v: number) => (v < 0 ? `− ${fmtN(-v)}` : `+ ${fmtN(v)}`)

function ruleText(r: Rule, grade: Grade): string {
  const n = grade >= 6 ? 'n' : '× n'
  switch (r.k) {
    case 'add': return `${fmtN(r.a)}’${ek(r.a, 'abl', false).slice(1)} başla, her adımda ${sgn(r.b)}`
    case 'mul': return `${fmtN(r.a)}’${ek(r.a, 'abl', false).slice(1)} başla, her adımda × ${r.b < 0 ? `(${fmtN(r.b)})` : fmtN(r.b)}`
    case 'lin': return `n. terim = ${grade >= 6 ? (r.a === 1 ? '' : r.a === -1 ? '−' : fmtN(r.a)) : fmtN(r.a) + ' '}${n}${r.b ? ` ${sgn(r.b)}` : ''}`
    case 'sq': return `n. terim = n^{2}${r.b ? ` ${sgn(r.b)}` : ''}`
    case 'pow': return `n. terim = ${r.a}^{n}`
    case 'alt': return `${fmtN(r.a)}’${ek(r.a, 'abl', false).slice(1)} başla, sırayla + ${r.b}, − ${r.c}`
  }
}

const KIND_INFO: Record<Kind, { label: string; emoji: string }> = {
  add: { label: 'Her adımda ekle', emoji: '➕' },
  mul: { label: 'Her adımda çarp', emoji: '✖️' },
  lin: { label: 'n. terim kuralı', emoji: '🔢' },
  sq: { label: 'Kareler', emoji: '◼️' },
  pow: { label: 'Kuvvetler', emoji: '⚡' },
  alt: { label: 'Sırayla ekle-çıkar', emoji: '↕️' },
}

function kindsFor(grade: Grade): Kind[] {
  if (grade === 2) return ['add']
  if (grade === 3) return ['add', 'mul']
  if (grade === 4) return ['add', 'mul', 'alt']
  if (grade === 5) return ['add', 'mul', 'lin']
  if (grade === 6) return ['add', 'lin', 'alt', 'mul']
  if (grade === 7) return ['add', 'lin', 'mul']
  return ['lin', 'sq', 'pow', 'mul', 'add']
}

const DEFAULT: Record<Kind, Rule> = {
  add: { k: 'add', a: 2, b: 3, c: 0 },
  mul: { k: 'mul', a: 1, b: 2, c: 0 },
  lin: { k: 'lin', a: 3, b: 1, c: 0 },
  sq: { k: 'sq', a: 0, b: 0, c: 0 },
  pow: { k: 'pow', a: 2, b: 0, c: 0 },
  alt: { k: 'alt', a: 5, b: 3, c: 1 },
}

// ───────────────────────── Görevler ─────────────────────────

interface Solve { kind: 'solve'; title: string; rule: Rule; show: number; askN?: number; shared?: boolean }
interface Open { kind: 'open'; title: string; shown: number[]; need: number }
interface Design { kind: 'design'; title: string; check?: (t: number[]) => string | null; friend: boolean; need: number }
type Task = Solve | Open | Design

const increasing = (t: number[]) => (t.every((v, i) => i === 0 || v > t[i - 1]) ? null : 'Örüntün her adımda büyümeli. Kuralını değiştirir misin?')
const nonTrivial = (t: number[]) => (t.every((v) => v === t[0]) ? 'Bütün terimler aynı! Biraz hareket katar mısın?' : null)
const termIs = (n: number, v: number) => (t: number[]) => (Math.abs(t[n - 1] - v) < 1e-9 ? null : `${n}. terimin şu an ${fmtN(t[n - 1])}. ${fmtN(v)} olması için başlangıcı mı, adımı mı değiştirirsin?`)
const hasNeg = (t: number[]) => (t.some((v) => v < 0) ? null : 'Örüntünde en az bir negatif terim olmalı.')
const R = (k: Kind, a: number, b = 0, c = 0): Rule => ({ k, a, b, c })

function tasksFor(grade: Grade): Task[] {
  const free: Design = { kind: 'design', title: 'Kendi örüntünü tasarla, kuralını gizle ve Bilge’ye çözdür!', check: grade <= 3 ? (t) => nonTrivial(t) ?? increasing(t) : nonTrivial, friend: true, need: 1 }
  switch (grade) {
    case 2:
      return [
        { kind: 'solve', title: 'Bilge’nin örüntüsü: Sıradaki iki sayı ne? Kuralı ne?', rule: R('add', 3, 2), show: 4 },
        { kind: 'solve', title: 'Bu örüntü geriye doğru sayıyor. Sıradakiler?', rule: R('add', 50, -5), show: 4 },
        free,
        { kind: 'solve', title: 'Onar onar! Sıradaki iki sayı ne?', rule: R('add', 4, 10), show: 4 },
        { kind: 'design', title: '5. terimi 20 olan iki farklı örüntü tasarla.', check: termIs(5, 20), friend: false, need: 2 },
      ]
    case 3:
      return [
        { kind: 'solve', title: 'Bilge’nin örüntüsü: Sıradaki iki sayı ne? Kuralı ne?', rule: R('add', 7, 4), show: 4 },
        { kind: 'open', title: '3, 6, … diye başlayan örüntü nasıl devam edebilir? İki farklı kural bul.', shown: [3, 6], need: 2 },
        free,
        { kind: 'solve', title: 'Bu örüntü çok hızlı büyüyor! Sıradakiler ve kuralı?', rule: R('mul', 2, 2), show: 4 },
        { kind: 'design', title: '6. terimi 30 olan iki farklı örüntü tasarla.', check: termIs(6, 30), friend: false, need: 2 },
      ]
    case 4:
      return [
        { kind: 'solve', title: 'Bilge’nin örüntüsü bir ileri bir geri gidiyor. Sıradakiler?', rule: R('alt', 2, 5, 2), show: 5 },
        { kind: 'open', title: '2, 4, … diye başlayan örüntü nasıl devam edebilir? İki farklı kural bul.', shown: [2, 4], need: 2 },
        free,
        { kind: 'solve', title: 'Sıradaki iki sayı ne? Kuralı ne?', rule: R('mul', 3, 2), show: 4 },
        { kind: 'design', title: '5. terimi 48 olan iki farklı örüntü tasarla.', check: termIs(5, 48), friend: false, need: 2 },
      ]
    case 5:
      return [
        { kind: 'solve', title: 'Sıradakiler ne? Kuralı bul ve 10. terimi hesapla.', rule: R('lin', 3, 2), show: 4, askN: 10 },
        { kind: 'open', title: '2, 4, … diye başlayan örüntü nasıl devam edebilir? İki farklı kural bul.', shown: [2, 4], need: 2 },
        free,
        { kind: 'solve', title: 'Sıradakiler ne? Kuralı ne?', rule: R('mul', 5, 2), show: 4 },
        { kind: 'design', title: '10. terimi 50 olan iki farklı örüntü tasarla.', check: termIs(10, 50), friend: false, need: 2 },
      ]
    case 6:
      return [
        { kind: 'solve', title: 'Kuralı cebirsel olarak yaz ve 20. terimi bul.', rule: R('lin', 4, -1), show: 4, askN: 20 },
        { kind: 'open', title: '3, 6, … diye başlayan örüntü nasıl devam edebilir? İki farklı kural bul.', shown: [3, 6], need: 2 },
        free,
        { kind: 'solve', title: 'Bir ileri bir geri! Sıradakiler ve kuralı?', rule: R('alt', 10, 6, 4), show: 5 },
        { kind: 'design', title: '10. terimi 100 olan iki farklı örüntü tasarla.', check: termIs(10, 100), friend: false, need: 2 },
      ]
    case 7:
      return [
        { kind: 'solve', title: 'Sıradakiler ne? Kuralı bul ve 20. terimi hesapla.', rule: R('add', -10, 3), show: 4, askN: 20 },
        { kind: 'open', title: '−2, 4, … diye başlayan örüntü nasıl devam edebilir? İki farklı kural bul.', shown: [-2, 4], need: 2 },
        { ...free, title: 'Negatif terimleri olan bir örüntü tasarla, Bilge’ye çözdür!', check: (t) => nonTrivial(t) ?? hasNeg(t) },
        { kind: 'solve', title: 'Azalan örüntü: kuralı cebirsel yaz ve 10. terimi bul.', rule: R('lin', -3, 20), show: 4, askN: 10 },
        { kind: 'design', title: '5. terimi −7 olan iki farklı örüntü tasarla.', check: termIs(5, -7), friend: false, need: 2 },
      ]
    default:
      return [
        { kind: 'solve', title: 'Sıradakiler ne? Kuralı bul ve 10. terimi hesapla.', rule: R('sq', 0, 1), show: 4, askN: 10 },
        { kind: 'open', title: '1, 4, … diye başlayan örüntü nasıl devam edebilir? İki farklı kural bul.', shown: [1, 4], need: 2 },
        free,
        { kind: 'solve', title: 'Kuvvetler! Sıradakiler ne? 6. terim kaç?', rule: R('pow', 3), show: 4, askN: 6 },
        { kind: 'design', title: '4. terimi 64 olan iki farklı örüntü tasarla.', check: termIs(4, 64), friend: false, need: 2 },
      ]
  }
}

// ───────────────────────── Paylaşım ─────────────────────────

function encode(r: Rule, show: number) {
  return btoa(JSON.stringify([r.k, r.a, r.b, r.c, show])).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function decode(s: string | null): { rule: Rule; show: number } | null {
  if (!s) return null
  try {
    const [k, a, b, c, show] = JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')))
    if (!(k in KIND_INFO) || ![a, b, c, show].every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 1e5)) return null
    return { rule: { k, a, b, c }, show: Math.max(2, Math.min(6, Math.round(show))) }
  } catch {
    return null
  }
}

// ───────────────────────── Sanal arkadaş (Bilge) ─────────────────────────

/** Gösterilen terimlere uyan aday kurallar (sınıfa uygun aileler) */
function candidates(shown: number[], grade: Grade): Rule[] {
  const out: Rule[] = []
  const k = shown.length
  const d = shown[1] - shown[0]
  if (shown.every((v, i) => i === 0 || Math.abs(v - shown[i - 1] - d) < 1e-9)) out.push(grade >= 5 && kindsFor(grade).includes('lin') ? R('lin', d, r6(shown[0] - d)) : R('add', shown[0], d))
  if (shown[0] !== 0 && kindsFor(grade).includes('mul')) {
    const r = shown[1] / shown[0]
    if (Number.isInteger(r) && Math.abs(r) > 1 && shown.every((v, i) => i === 0 || Math.abs(v - shown[i - 1] * r) < 1e-9)) out.push(R('mul', shown[0], r))
  }
  if (kindsFor(grade).includes('sq')) {
    const b = shown[0] - 1
    if (shown.every((v, i) => v === (i + 1) ** 2 + b)) out.push(R('sq', 0, b))
  }
  if (kindsFor(grade).includes('pow') && shown[0] >= 2 && shown[0] <= 9 && shown.every((v, i) => v === shown[0] ** (i + 1))) out.push(R('pow', shown[0]))
  if (kindsFor(grade).includes('alt') && k >= 3) {
    const p = shown[1] - shown[0], qq = shown[1] - shown[2]
    if (p > 0 && qq > 0 && p !== -qq && shown.every((v, i) => v === term(R('alt', shown[0], p, qq), i + 1))) out.push(R('alt', shown[0], p, qq))
  }
  if (kindsFor(grade).includes('alt') && k === 2 && shown[1] > shown[0]) out.push(R('alt', shown[0], shown[1] - shown[0], 1))
  return out
}

function friendGuess(truth: Rule, shown: number[], grade: Grade): Rule | null {
  const cs = candidates(shown, grade)
  const n = shown.length + 1
  const wrong = cs.find((c) => Math.abs(term(c, n) - term(truth, n)) > 1e-9)
  return wrong ?? cs[0] ?? null
}

// ───────────────────────── Görsel parçalar ─────────────────────────

const BEAD = ['#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444']

function Beads({ values, hidden = 0, look, diffs }: { values: (number | null)[]; hidden?: number; look: Look; diffs?: boolean }) {
  const all = [...values, ...Array(hidden).fill(null)]
  return (
    <div className="flex flex-wrap items-end justify-center gap-x-1.5 gap-y-4">
      {all.map((v, i) => (
        <div key={i} className="flex items-end gap-1.5">
          {diffs && i > 0 && values[i] !== null && values[i - 1] !== null && values[i] !== undefined && (
            <span className={`mb-4 rounded-full px-1.5 text-xs font-black ${look.dark ? 'bg-slate-700 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>{sgn(r6((values[i] as number) - (values[i - 1] as number))).replace(' ', '')}</span>
          )}
          <div className="flex flex-col items-center">
            <span
              className={`grid ${look.big ? 'size-16 text-xl' : 'size-14 text-lg'} place-items-center rounded-full font-black tabular-nums animate-pop ${v === null ? (look.dark ? 'border-[3px] border-dashed border-slate-500 text-slate-400' : 'border-[3px] border-dashed border-slate-300 text-slate-400') : 'text-white'}`}
              style={v === null ? undefined : { background: `radial-gradient(circle at 35% 30%, #ffffff66, transparent 40%), ${BEAD[i % BEAD.length]}`, boxShadow: `0 4px 0 ${BEAD[i % BEAD.length]}88` }}
            >
              {v === null ? '?' : <span className={Math.abs(v) >= 1000 ? 'text-sm' : ''}>{fmtN(v)}</span>}
            </span>
            <span className={`mt-1 text-[11px] font-black ${look.muted}`}>{i + 1}.</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Graph({ values, look }: { values: number[]; look: Look }) {
  const W = 320, H = 170, P = 26
  const lo = Math.min(0, ...values), hi = Math.max(1, ...values)
  const sx = (i: number) => P + (i * (W - P - 22)) / Math.max(1, values.length - 1)
  const sy = (v: number) => H - P - ((v - lo) / (hi - lo || 1)) * (H - P - 12)
  const stroke = look.dark ? '#22d3ee' : '#d6457a'
  return (
    <ZoomBox controls={false}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Örüntünün grafiği">
        <line x1={P} x2={W - 6} y1={sy(0)} y2={sy(0)} stroke={look.dark ? '#475569' : '#cbd5e1'} strokeWidth={1.5} />
        <line x1={P} x2={P} y1={8} y2={H - P + 4} stroke={look.dark ? '#475569' : '#cbd5e1'} strokeWidth={1.5} />
        <polyline points={values.map((v, i) => `${sx(i)},${sy(v)}`).join(' ')} fill="none" stroke={stroke} strokeWidth={2} strokeDasharray="5 4" opacity={0.6} />
        {values.map((v, i) => (
          <g key={i}>
            <circle cx={sx(i)} cy={sy(v)} r={5.5} fill={BEAD[i % BEAD.length]} stroke="#fff" strokeWidth={2} />
            <text x={sx(i)} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={800} fill={look.dark ? '#94a3b8' : '#5b6080'}>{i + 1}</text>
          </g>
        ))}
        <text x={W - 4} y={sy(0) - 5} textAnchor="end" fontSize={12} fontWeight={900} fill={look.dark ? '#94a3b8' : '#5b6080'}>n</text>
      </svg>
    </ZoomBox>
  )
}

function NumField({ look, label, value, onChange, min, max }: { look: Look; label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  const b = `grid ${look.big ? 'h-14 min-w-12' : 'h-12 min-w-11'} place-items-center rounded-xl px-2 text-base font-black transition active:scale-95 disabled:opacity-30 ${look.key}`
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)))
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-xs font-black tracking-wide uppercase ${look.muted}`}>{label}</span>
      <div className="flex items-center gap-1">
        {max - min > 30 && <button type="button" className={b} onClick={() => set(value - 10)} disabled={value - 10 < min} aria-label={`${label} 10 azalt`}>−10</button>}
        <button type="button" className={b} onClick={() => set(value - 1)} disabled={value - 1 < min} aria-label={`${label} azalt`}>−1</button>
        <span className={`grid min-w-14 place-items-center text-2xl font-black tabular-nums ${look.strong}`} aria-live="polite">{fmtN(value)}</span>
        <button type="button" className={b} onClick={() => set(value + 1)} disabled={value + 1 > max} aria-label={`${label} artır`}>+1</button>
        {max - min > 30 && <button type="button" className={b} onClick={() => set(value + 10)} disabled={value + 10 > max} aria-label={`${label} 10 artır`}>+10</button>}
      </div>
    </div>
  )
}

/** Kural kurucu */
function Builder({ look, grade, rule, onChange, extra }: { look: Look; grade: Grade; rule: Rule; onChange: (r: Rule) => void; extra?: Kind }) {
  const kinds = extra && !kindsFor(grade).includes(extra) ? [...kindsFor(grade), extra] : kindsFor(grade)
  const neg = grade >= 7
  const set = (p: Partial<Rule>) => onChange({ ...rule, ...p })
  let fields: ReactNode
  if (rule.k === 'add') fields = <><NumField look={look} label="Başla" value={rule.a} min={neg ? -100 : 0} max={200} onChange={(a) => set({ a })} /><NumField look={look} label="Her adımda ekle" value={rule.b} min={grade >= 2 ? -20 : 1} max={50} onChange={(b) => set({ b })} /></>
  else if (rule.k === 'mul') fields = <><NumField look={look} label="Başla" value={rule.a} min={neg ? -20 : 1} max={50} onChange={(a) => set({ a })} /><NumField look={look} label="Her adımda çarp" value={rule.b} min={neg ? -4 : 2} max={5} onChange={(b) => set({ b: b === 0 || b === 1 ? (b > rule.b ? 2 : -1) : b })} /></>
  else if (rule.k === 'lin') fields = <><NumField look={look} label="n’nin katsayısı" value={rule.a} min={neg ? -20 : 1} max={30} onChange={(a) => set({ a })} /><NumField look={look} label="Sabit" value={rule.b} min={-100} max={100} onChange={(b) => set({ b })} /></>
  else if (rule.k === 'sq') fields = <NumField look={look} label="n²’ye ekle" value={rule.b} min={-50} max={100} onChange={(b) => set({ b })} />
  else if (rule.k === 'pow') fields = <NumField look={look} label="Taban" value={rule.a} min={2} max={6} onChange={(a) => set({ a })} />
  else fields = <><NumField look={look} label="Başla" value={rule.a} min={0} max={100} onChange={(a) => set({ a })} /><NumField look={look} label="Ekle" value={rule.b} min={1} max={30} onChange={(b) => set({ b })} /><NumField look={look} label="Çıkar" value={rule.c} min={1} max={30} onChange={(c) => set({ c })} /></>
  return (
    <div className={`rounded-2xl p-3 ${look.soft}`}>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-black"><Wand2 size={16} />Kural kurucu</p>
      {kinds.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <button key={k} type="button" aria-pressed={rule.k === k} onClick={() => onChange(rule.k === k ? rule : { ...DEFAULT[k] })} className={`min-h-12 rounded-xl px-3 text-sm font-extrabold transition ${rule.k === k ? look.chipOn : look.chip}`}>
              <span aria-hidden>{KIND_INFO[k].emoji}</span> {KIND_INFO[k].label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3">{fields}</div>
      <p className={`mt-3 rounded-xl px-3 py-2 text-center text-base font-black ${look.dark ? 'bg-slate-900 text-cyan-200' : 'bg-white text-brand-ink ring-1 ring-line'}`}><MathText text={ruleText(rule, grade)} /></p>
    </div>
  )
}

const Friend = ({ look, children }: { look: Look; children: ReactNode }) => (
  <div className="mt-3 flex items-start gap-2 animate-fade-up">
    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-violet-100 text-2xl ring-2 ring-violet-300" aria-hidden>🤖</span>
    <div className={`relative flex-1 rounded-2xl rounded-tl-sm px-3 py-2 text-[15px] font-bold ${look.dark ? 'bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/40' : 'bg-violet-50 text-violet-950 ring-1 ring-violet-200'}`}>
      <span className="block text-xs font-black tracking-wide uppercase opacity-70">Bilge</span>
      {children}
    </div>
  </div>
)

// ───────────────────────── Görev bileşenleri ─────────────────────────

type Say = { q: string; tone?: 'ok'; mis?: string; k: number } | null
interface Res { first: boolean }
function useSay() {
  const [say, setSay] = useState<Say>(null)
  const nudge = (q: string, tone?: 'ok', mis?: string) => setSay((s) => ({ q, tone, mis, k: (s?.k ?? 0) + 1 }))
  return { say, setSay, nudge }
}

function Shell({ grade, look, scene, panel, title }: { grade: Grade; look: Look; scene: ReactNode; panel: ReactNode; title: string }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
      <Scene grade={grade}>{scene}</Scene>
      <div className="space-y-3 lg:sticky lg:top-20">
        <Panel look={look} title={title} icon={<span aria-hidden>🎨</span>}>{panel}</Panel>
      </div>
    </div>
  )
}

function SolveTask({ t, grade, look, onDone, sols, last }: { t: Solve; grade: Grade; look: Look; onDone: (r: Res) => void; sols: ReturnType<typeof useSolutions>; last: boolean }) {
  const track = useTracker()
  const { say, setSay, nudge } = useSay()
  const [phase, setPhase] = useState<'next' | 'rule' | 'far' | 'done'>('next')
  const [filled, setFilled] = useState<number[]>([])
  const [entry, setEntry] = useState('')
  const [rule, setRule] = useState<Rule>(DEFAULT[kindsFor(grade)[0]])
  const [hint, setHint] = useState(false)
  const [ways, setWays] = useState<string[]>([])
  const misses = useRef(0)
  const shown = terms(t.rule, t.show)
  const values: (number | null)[] = [...shown, ...filled]
  const hidden = phase === 'next' ? 2 - filled.length : 0
  const dec = grade >= 6

  const submitNext = () => {
    const v = parseQ(entry)
    const want = term(t.rule, t.show + filled.length + 1)
    setEntry('')
    if (v && Math.abs(v.n / v.d - want) < 1e-9) {
      track.attempt(true)
      sfx.ok()
      setSay(null)
      const nf = [...filled, want]
      setFilled(nf)
      if (nf.length >= 2) {
        setPhase('rule')
        nudge('Doğru! Şimdi kuralı kur: kural kurucu senin örüntünü üretmeli.', 'ok')
      }
    } else {
      misses.current++
      track.attempt(false)
      if (!hint) {
        setHint(true)
        track.hint()
      }
      const additive = shown.every((x, i) => i === 0 || x - shown[i - 1] === shown[1] - shown[0])
      nudge(additive ? 'Terimler arasındaki farklara bak. Her adımda ne oluyor?' : 'Farklar aynı mı? Değilse terimlerin birbirinin kaç katı olduğuna ya da sıra numarasıyla ilişkisine bak.', undefined, additive ? undefined : 'Toplamsal olmayan örüntüyü toplamsal sandı')
    }
  }
  const tryRule = () => {
    const k = t.show + 2
    if (same(rule, t.rule, Math.max(k, 6))) {
      track.attempt(true)
      sfx.ok()
      const key = rule.k
      if (!ways.includes(key)) {
        setWays([...ways, key])
        sols.add(`${t.title}:${key}`, ruleText(rule, grade))
      }
      if (t.askN && phase === 'rule') {
        setPhase('far')
        nudge(`Kuralın doğru: ${ruleText(rule, grade)}. Şimdi ${t.askN}. terimi kuralla bul — tek tek yazmadan!`, 'ok')
      } else {
        track.item(misses.current === 0)
        setPhase('done')
        nudge(ways.length === 0 && grade >= 5 && (rule.k === 'add' || rule.k === 'lin') ? 'Kuralın doğru! Bu örüntüyü başka bir biçimde de yazabilir misin? (Her adımda ekle ↔ n. terim kuralı)' : 'Kuralın doğru!', 'ok')
      }
    } else {
      misses.current++
      track.attempt(false)
      const mine = terms(rule, k)
      const bad = mine.findIndex((v, i) => Math.abs(v - term(t.rule, i + 1)) > 1e-9)
      nudge(`Senin kuralın ${bad + 1}. terimi ${fmtN(mine[bad])} yapıyor ama örüntüde ${fmtN(term(t.rule, bad + 1))} var. ${bad === 0 ? 'Başlangıca bak.' : 'Adıma bak.'}`)
    }
  }
  const submitFar = () => {
    const v = parseQ(entry)
    const want = term(t.rule, t.askN!)
    setEntry('')
    if (v && Math.abs(v.n / v.d - want) < 1e-9) {
      track.attempt(true)
      track.item(misses.current === 0)
      sfx.ok()
      setPhase('done')
      nudge(`Evet, ${t.askN}. terim ${fmtN(want)}! Kural sayesinde tek tek saymana gerek kalmadı.`, 'ok')
    } else {
      misses.current++
      track.attempt(false)
      nudge(t.rule.k === 'lin' || t.rule.k === 'add' ? `1. terimden ${t.askN}. terime kaç adım var? Her adımda ne kadar değişiyor?` : `Kuralda n yerine ${t.askN} yaz.`, undefined, 'Uzak terimi kural yerine tahminle buldu')
    }
  }
  return (
    <Shell grade={grade} look={look} title={phase === 'next' ? 'Sıradaki terim ne?' : phase === 'rule' || phase === 'done' ? 'Kuralı kur' : `${t.askN}. terim kaç?`}
      scene={
        <>
          {t.shared && <p className={`mb-2 text-center text-sm font-black ${look.muted}`}>📨 Bu örüntüyü bir arkadaşın tasarladı!</p>}
          <Beads values={values} hidden={hidden} look={look} diffs={hint || phase !== 'next'} />
          {phase !== 'next' && (
            <div className="mt-4">
              <p className={`mb-1 text-center text-xs font-black tracking-wide uppercase ${look.muted}`}>Senin kuralın üretiyor</p>
              <Beads values={terms(rule, t.show + 2)} look={look} />
            </div>
          )}
          {grade >= 5 && phase !== 'next' && <div className="mt-3"><Graph values={terms(t.rule, t.show + 2)} look={look} /></div>}
        </>
      }
      panel={
        <>
          {(phase === 'next' || phase === 'far') && (
            <>
              <p className={`mb-2 text-[15px] font-bold ${look.muted}`}>{phase === 'next' ? `${t.show + filled.length + 1}. terimi yaz.` : `Kuralı kullanarak ${t.askN}. terimi bul.`}</p>
              <div className={`mb-2 grid min-h-12 place-items-center rounded-xl text-3xl font-black tabular-nums ${look.dark ? 'bg-slate-900' : 'bg-white ring-1 ring-line'}`}>{entry || <span className={look.muted}>?</span>}</div>
              <Pad look={look} value={entry} onChange={setEntry} onSubmit={phase === 'next' ? submitNext : submitFar} allow={{ neg: grade >= 7, dec }} />
            </>
          )}
          {(phase === 'rule' || phase === 'done') && (
            <>
              <Builder look={look} grade={grade} rule={rule} onChange={setRule} extra={t.rule.k} />
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={tryRule}><Check size={20} />Kuralımı dene</button>
            </>
          )}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone({ first: misses.current === 0 })} />}
        </>
      }
    />
  )
}

function OpenTask({ t, grade, look, onDone, sols, last }: { t: Open; grade: Grade; look: Look; onDone: (r: Res) => void; sols: ReturnType<typeof useSolutions>; last: boolean }) {
  const track = useTracker()
  const { say, setSay, nudge } = useSay()
  const [rule, setRule] = useState<Rule>(DEFAULT[kindsFor(grade)[0]])
  const [found, setFound] = useState<{ next: number; text: string }[]>([])
  const [phase, setPhase] = useState<'find' | 'why' | 'done'>('find')
  const mine = terms(rule, 5)
  const fits = t.shown.every((v, i) => Math.abs(v - mine[i]) < 1e-9)
  const save = () => {
    if (!fits) {
      track.attempt(false)
      return nudge(`Senin kuralın ${mine.slice(0, t.shown.length).map((v) => fmtN(v)).join(', ')} ile başlıyor. ${t.shown.map((v) => fmtN(v)).join(', ')} ile başlamalı.`)
    }
    const nx = mine[t.shown.length]
    if (found.some((f) => Math.abs(f.next - nx) < 1e-9)) return nudge(`Bu kural da ${t.shown.length + 1}. terimi ${fmtN(nx)} yapıyor; bu yolu zaten buldun. Farklı devam eden bir kural var mı?`)
    track.attempt(true)
    sfx.ok()
    const text = ruleText(rule, grade)
    sols.add(`open:${nx}`, `${t.shown.map((v) => fmtN(v)).join(', ')}, ${fmtN(nx)}… (${text})`)
    const nf = [...found, { next: nx, text }]
    setFound(nf)
    if (nf.length >= t.need) {
      track.item(true)
      setPhase('why')
    } else nudge('Harika! Aynı başlangıçla bambaşka devam eden bir kural daha bul.', 'ok')
  }
  return (
    <Shell grade={grade} look={look} title={`Farklı devamlar: ${found.length} / ${t.need}`}
      scene={
        <>
          <Beads values={t.shown} hidden={2} look={look} />
          <div className="mt-4 space-y-3">
            <p className={`text-center text-xs font-black tracking-wide uppercase ${look.muted}`}>Senin kuralın</p>
            <Beads values={mine} look={look} />
            {found.map((f, i) => (
              <div key={i} className={`rounded-2xl p-2 ${look.dark ? 'bg-emerald-400/10 ring-1 ring-emerald-400/30' : 'bg-emerald-50 ring-1 ring-emerald-200'}`}>
                <p className={`mb-1 text-center text-sm font-black ${look.dark ? 'text-emerald-200' : 'text-emerald-800'}`}>{i + 1}. yol: <MathText text={f.text} /></p>
              </div>
            ))}
          </div>
        </>
      }
      panel={
        <>
          {phase === 'find' && (
            <>
              <Builder look={look} grade={grade} rule={rule} onChange={setRule} />
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={save}><Check size={20} />Bu kural uyuyor mu?</button>
            </>
          )}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'why' && <StrategyPicker question={`İki kural da ${t.shown.map((v) => fmtN(v)).join(', ')} ile başlıyor ama farklı devam ediyor. Bu ne demek?`} options={['İki terim kuralı belirlemeye yetmez', 'Biri yanlış olmalı', 'Daha çok terim görmek gerekir', 'Emin değilim']} onPick={() => { setPhase('done'); nudge('Bir örüntünün yalnız ilk birkaç terimi, kuralı tek başına belirlemeyebilir. Kuralı da söylemek gerekir!', 'ok') }} />}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone({ first: true })} />}
        </>
      }
    />
  )
}

function DesignTask({ t, grade, look, onDone, sols, last }: { t: Design; grade: Grade; look: Look; onDone: (r: Res) => void; sols: ReturnType<typeof useSolutions>; last: boolean }) {
  const track = useTracker()
  const { say, setSay, nudge } = useSay()
  const [rule, setRule] = useState<Rule>(DEFAULT[kindsFor(grade)[0]])
  const [phase, setPhase] = useState<'build' | 'show' | 'judge' | 'why' | 'share' | 'done'>('build')
  const [show, setShow] = useState(2)
  const [guess, setGuess] = useState<Rule | null>(null)
  const [found, setFound] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const misses = useRef(0)
  const preview = terms(rule, 8)
  const ready = () => {
    const err = (grade < 7 && preview.some((v) => v < 0) ? 'Örüntün negatif sayılara iniyor. Doğal sayılarda kalması için başlangıcı ya da adımı değiştirir misin?' : null) ?? t.check?.(preview)
    if (err) {
      track.attempt(false)
      return nudge(err)
    }
    if (!t.friend) {
      const key = preview.slice(0, 6).join('|')
      if (found.includes(key)) return nudge('Bu örüntüyü zaten buldun. Başlangıcı ya da adımı değiştirerek başka bir yol dene.')
      track.attempt(true)
      sfx.ok()
      sols.add(`d:${key}`, `${preview.slice(0, 5).map((v) => fmtN(v)).join(', ')}… (${ruleText(rule, grade)})`)
      const nf = [...found, key]
      setFound(nf)
      if (nf.length >= t.need) {
        track.item(misses.current === 0)
        setPhase('done')
        nudge('İki farklı örüntü de aynı terimden geçiyor! Bir kısıt birçok çözüme izin verebilir.', 'ok')
      } else nudge('Harika! Aynı koşula uyan başka bir örüntü tasarlayabilir misin?', 'ok')
      return
    }
    track.attempt(true)
    sfx.ok()
    setSay(null)
    setPhase('show')
  }
  const askFriend = (k: number) => {
    setShow(k)
    setGuess(friendGuess(rule, terms(rule, k), grade))
    setPhase('judge')
    setSay(null)
  }
  const judge = (friendRight: boolean) => {
    const truthNext = term(rule, show + 1)
    const fNext = guess ? term(guess, show + 1) : NaN
    const actual = guess !== null && Math.abs(truthNext - fNext) < 1e-9
    if (friendRight !== actual) {
      misses.current++
      track.attempt(false)
      return nudge(`Kendi kuralına bak: ${show + 1}. terim ${fmtN(truthNext)}. Bilge ${guess ? fmtN(fNext) : 'hiçbir şey'} dedi. Aynı mı?`)
    }
    track.attempt(true)
    if (actual) {
      sfx.ok()
      track.strategy(`Bilge’ye ${show} terim gösterdi`)
      setPhase('share')
      nudge(`Bilge ${show} terimle kuralını buldu! Şimdi örüntünü bir arkadaşına gönder.`, 'ok')
    } else setPhase('why')
  }
  const link = useMemo(() => {
    const u = new URL(window.location.href)
    u.searchParams.set('sinif', String(grade))
    u.searchParams.set('oruntu', encode(rule, Math.max(show, 3)))
    return u.toString()
  }, [rule, show, grade])
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Örüntümü çözebilir misin?', text: 'Bu sayı örüntüsünün kuralını bul!', url: link })
      else {
        await navigator.clipboard.writeText(link)
        setCopied(true)
      }
    } catch {
      /* paylaşım iptal edildi */
    }
  }
  return (
    <Shell grade={grade} look={look} title={t.friend ? (phase === 'build' ? 'Örüntünü tasarla' : phase === 'share' || phase === 'done' ? 'Arkadaşına gönder' : 'Bilge çözmeye çalışıyor') : `Tasarladığın örüntüler: ${found.length} / ${t.need}`}
      scene={
        <>
          <p className={`mb-2 text-center text-xs font-black tracking-wide uppercase ${look.muted}`}>{phase === 'build' ? 'Örüntün (yalnız sen görüyorsun)' : t.friend ? `Bilge’nin gördüğü: ${show} terim` : ''}</p>
          {phase === 'build' || !t.friend ? <Beads values={preview.slice(0, 6)} look={look} /> : <Beads values={terms(rule, show)} hidden={1} look={look} />}
          {grade >= 5 && phase === 'build' && <div className="mt-3"><Graph values={preview} look={look} /></div>}
          {t.friend && phase !== 'build' && (
            <p className={`mt-4 text-center text-sm font-bold ${look.muted}`}>Gizli kuralın: <MathText text={ruleText(rule, grade)} /> · {show + 1}. terim: <b className={look.strong}>{fmtN(term(rule, show + 1))}</b></p>
          )}
          {!t.friend && found.length > 0 && <ul className="mt-4 space-y-1.5">{sols.list.filter((s) => s.key.startsWith('d:')).slice(-t.need).map((s) => <li key={s.key} className={`rounded-xl px-3 py-2 text-center text-[15px] font-extrabold ${look.dark ? 'bg-emerald-400/10 text-emerald-200' : 'bg-emerald-50 text-emerald-900'}`}><MathText text={s.label} /></li>)}</ul>}
        </>
      }
      panel={
        <>
          {phase === 'build' && (
            <>
              <Builder look={look} grade={grade} rule={rule} onChange={setRule} />
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={ready}>{t.friend ? <><Eye size={20} />Örüntüm hazır</> : <><Check size={20} />Bu örüntüyü kaydet</>}</button>
            </>
          )}
          {phase === 'show' && (
            <>
              <p className={`text-[15px] font-bold ${look.muted}`}>Bilge’ye kaç terim göstereceksin? Az terim gösterirsen zorlaşır… ama yanılabilir de!</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[2, 3, 4, 5].map((k) => <button key={k} type="button" onClick={() => askFriend(k)} className={`${look.h} rounded-2xl text-xl font-black ${look.chip}`}>{k}</button>)}
              </div>
            </>
          )}
          {(phase === 'judge' || phase === 'why') && (
            <Friend look={look}>
              {guess ? <>Bence kural: <MathText text={ruleText(guess, grade)} />. O hâlde {show + 1}. terim <b>{fmtN(term(guess, show + 1))}</b>!</> : <>Hmm… bu terimlerden bir kural çıkaramadım. Biraz daha göster!</>}
            </Friend>
          )}
          {phase === 'judge' && guess && (
            <div className="mt-3">
              <p className={`mb-2 text-[15px] font-black ${look.strong}`}>Bilge’nin tahmini doğru mu?</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => judge(true)} className={`${look.h} rounded-2xl bg-emerald-500 text-lg font-black text-white`}>Doğru</button>
                <button type="button" onClick={() => judge(false)} className={`${look.h} rounded-2xl bg-rose-500 text-lg font-black text-white`}>Yanlış</button>
              </div>
            </div>
          )}
          {phase === 'judge' && !guess && <button type="button" className="btn-primary mt-3 min-h-14 w-full" onClick={() => askFriend(Math.min(6, show + 1))}><Eye size={18} />Bir terim daha göster</button>}
          {phase === 'why' && (
            <>
              <StrategyPicker question="Bilge neden yanıldı?" options={['Gösterdiğim terimler iki farklı kurala da uyuyordu', 'Bilge dikkatsizdi', 'Benim kuralım yanlıştı']} onPick={(o) => nudge(o.startsWith('Gösterdiğim') ? 'Evet! Az terim, birden çok kurala uyabilir. Bir terim daha göster.' : 'Bilge’nin kuralı, gösterdiğin terimlere uyuyor mu? Bak! Sorun terim sayısında olabilir mi?', o.startsWith('Gösterdiğim') ? 'ok' : undefined)} />
              {show < 6 && <button type="button" className="btn-primary mt-3 min-h-14 w-full" onClick={() => askFriend(show + 1)}><Eye size={18} />Bir terim daha göster</button>}
            </>
          )}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'share' && (
            <div className="mt-3 grid gap-2">
              <button type="button" className="btn-primary min-h-14 text-lg" onClick={share}>{typeof navigator !== 'undefined' && 'share' in navigator ? <><Share2 size={20} />Arkadaşına gönder</> : <><Copy size={20} />Linki kopyala</>}</button>
              {copied && <p className="text-center text-sm font-black text-emerald-600">Link kopyalandı! Arkadaşına yapıştırıp gönderebilirsin.</p>}
              <p className={`rounded-xl px-3 py-2 text-xs font-bold break-all ${look.dark ? 'bg-slate-900 text-slate-400' : 'bg-paper text-ink-soft'}`}>{link}</p>
              <button type="button" className={`btn-ghost ${look.dark ? '!bg-slate-700 !text-white !ring-slate-500' : ''}`} onClick={() => { track.item(misses.current === 0); setPhase('done') }}><Send size={18} />Tamam</button>
            </div>
          )}
          {phase === 'done' && <NextButton last={last} onClick={() => onDone({ first: misses.current === 0 })} />}
        </>
      }
    />
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function OruntuTasarimcisi({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const [params] = useSearchParams()
  const sharedRaw = params.get('oruntu')
  const tasks = useMemo<Task[]>(() => {
    const base = tasksFor(grade)
    const sh = decode(sharedRaw)
    if (!sh) return base
    const first: Solve = { kind: 'solve', title: 'Arkadaşının örüntüsü! Sıradaki iki terim ne? Kuralı ne?', rule: sh.rule, show: sh.show, shared: true }
    return [first, ...base.slice(1)]
  }, [grade, sharedRaw])
  const [i, setI] = useState(0)
  const sols = useSolutions()
  const firsts = useRef(0)
  const t = tasks[i]
  const last = i === tasks.length - 1
  const done = (r: Res) => {
    if (r.first) firsts.current++
    if (!last) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const stars = (firsts.current >= tasks.length - 1 ? 3 : firsts.current >= 2 ? 2 : 1) as 1 | 2 | 3
    onFinish({
      summary: `${tasks.length} örüntü görevini tamamladın, ${sols.list.length} farklı kural/örüntü buldun.`,
      insight:
        grade <= 4
          ? 'Bir örüntünün kuralı her adımda ne olduğunu söyler. Yalnızca iki terim görmek yetmeyebilir: 2, 4 diye başlayan örüntü 6 ile de 8 ile de devam edebilir.'
          : grade <= 6
            ? 'Bir örüntüyü “her adımda ekle” diye ya da “n. terim = 3n + 2” gibi bir kuralla yazabiliriz; n. terim kuralı uzak terimleri hemen bulmayı sağlar.'
            : 'Aynı başlangıçtan farklı kurallar doğabilir; cebirsel kural (an + b, n², aⁿ) örüntüyü kesin olarak belirler ve her terimi hesaplatır.',
      stars,
    })
  }
  const EMO: Record<Task['kind'], string> = { solve: '🧩', open: '🔀', design: '🎨' }
  let body: ReactNode
  if (t.kind === 'solve') body = <SolveTask key={i} t={t} grade={grade} look={look} onDone={done} sols={sols} last={last} />
  else if (t.kind === 'open') body = <OpenTask key={i} t={t} grade={grade} look={look} onDone={done} sols={sols} last={last} />
  else body = <DesignTask key={i} t={t} grade={grade} look={look} onDone={done} sols={sols} last={last} />
  return (
    <div>
      <TopBar look={look} step={i} total={tasks.length} title={t.title} emoji={EMO[t.kind]} />
      {body}
    </div>
  )
}
