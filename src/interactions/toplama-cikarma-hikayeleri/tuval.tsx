import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Play, RotateCcw, Undo2 } from 'lucide-react'
import { Drag, Drop, type Dnd, type ToolInfo } from '../sayilari-karsilastir/parts'
import { pick, shuffle } from '../donusum-studyosu/ortak'

/**
 * Pullarla Problem Çözme tuvali: iki onluk çerçeve (20’lik), iki renkli sayma pulları,
 * “Gidenler” alanı, karşılaştırma için iki sıra ve çocuğun her hareketini yazan çözüm adımları şeridi.
 * Her hareket bir olaydır (pul koy / pul gitti / çift yap). Tuval, şerit ve işlem cümlesi aynı olay
 * listesinden türetilir; “Adımları izle” listeyi adım adım yeniden oynatır.
 */

/* ───────────── pullar ───────────── */

export type Col = 'r' | 'y'
export const DOT: Record<Col, string> = { r: '🔴', y: '🟡' }
const FILL: Record<Col, string> = {
  r: 'bg-[radial-gradient(circle_at_35%_30%,#fca5a5,#ef4444_55%,#b91c1c)] ring-red-800/40',
  y: 'bg-[radial-gradient(circle_at_35%_30%,#fef9c3,#facc15_55%,#ca8a04)] ring-yellow-700/40',
}

export function Counter({ c, px, pop }: { c: Col; px?: number; pop?: boolean }) {
  return <span className={`block shrink-0 rounded-full shadow-[0_2px_0_rgb(0_0_0/0.2)] ring-2 ${FILL[c]} ${pop ? 'animate-pop' : ''} ${px ? '' : 'size-[80%]'}`} style={px ? { width: px, height: px } : undefined} />
}

/* ───────────── olaylar ───────────── */

export type Ev = { k: 'put'; c: Col } | { k: 'take' } | { k: 'pair' }

/** Tuval durumu. Çerçevede a = kırmızı, b = sarı pul sayısı; karşılaştırmada a = üst sıra (kırmızı), b = alt sıra (sarı). */
export interface St { cells: Col[]; gone: Col[]; a: number; b: number; pairs: number }

export function run(evs: Ev[]): St {
  const s: St = { cells: [], gone: [], a: 0, b: 0, pairs: 0 }
  for (const e of evs) {
    if (e.k === 'put') {
      s.cells.push(e.c)
      if (e.c === 'r') s.a++
      else s.b++
    } else if (e.k === 'take') {
      const c = s.cells.pop()
      if (!c) continue
      s.gone.push(c)
      if (c === 'r') s.a--
      else s.b--
    } else s.pairs++
  }
  return s
}

export interface Step { text: string; eq?: string; end: number; ten?: boolean }

/**
 * Olayları çocuğun “adımlarına” çevirir: aynı renkten art arda konan pullar tek adımdır; çerçevede 10’a
 * ulaşılınca (onluğu tamamlama ya da 10’a inme) adım orada biter. Karşılaştırmada eşleme bitince fark yazılır.
 */
export function stepsOf(evs: Ev[], mode: 'frame' | 'cmp', names: [string, string] = ['', '']): Step[] {
  const out: Step[] = []
  let g: { k: Ev['k']; c?: Col; n: number; from: number; first: boolean } | null = null
  let total = 0
  let a = 0, b = 0, pairs = 0
  const close = (end: number, ten = false) => {
    if (!g) return
    const n = g.n
    if (mode === 'frame') {
      if (g.k === 'put') {
        if (g.first) out.push({ text: `${n} ${DOT[g.c!]} koydum.${n > 10 ? ` 10 ve ${n - 10} oldu.` : ''}`, eq: `${n}`, end })
        else out.push({ text: `${n} ${DOT[g.c!]} daha koydum.${ten ? ' Çerçeve doldu: 10!' : ''}`, eq: `${g.from} + ${n} = ${total}`, end, ten })
      } else out.push({ text: `${n} pul gitti.${ten ? ' 10 kaldı.' : ''}`, eq: `${g.from} − ${n} = ${total}`, end, ten })
    } else {
      if (g.k === 'put') out.push({ text: `${names[g.c === 'r' ? 0 : 1]}: ${n} ${DOT[g.c!]} ${g.first ? 'koydum' : 'daha koydum'}.`, end })
      else {
        const min = Math.min(a, b)
        const big = Math.max(a, b)
        const diff = big - min
        const done = pairs === min && diff > 0
        out.push({ text: `${n} çift yaptım.${done ? ` ${diff} ${DOT[a > b ? 'r' : 'y']} pulun eşi yok.` : ''}`, eq: done ? `${big} − ${min} = ${diff}` : undefined, end })
      }
    }
    g = null
  }
  const seen = new Set<Col>()
  evs.forEach((e, i) => {
    const same = g && g.k === e.k && (e.k !== 'put' || g.c === e.c)
    if (!same) close(i)
    if (!g) {
      const c = e.k === 'put' ? e.c : undefined
      g = { k: e.k, c, n: 0, from: total, first: mode === 'frame' ? out.length === 0 : !!c && !seen.has(c) }
      if (c) seen.add(c)
    }
    g.n++
    if (e.k === 'put') {
      total++
      if (e.c === 'r') a++
      else b++
    } else if (e.k === 'take') total--
    else pairs++
    if (mode === 'frame' && !g.first && total === 10 && g.from !== 10) close(i + 1, true)
  })
  close(evs.length)
  return out
}

/** “8 + 2 + 3 = 10 + 3 = 13”: çerçevede yapılan bütün adımların tek satırlık işlem zinciri */
export function chainOf(steps: Step[]): string | null {
  if (steps.length < 2) return null
  const first = Number(steps[0].eq)
  if (!Number.isFinite(first)) return null
  const ops = steps.slice(1).map((s) => {
    const m = s.eq?.match(/ ([+−]) (\d+) = /)
    return m ? ` ${m[1]} ${m[2]}` : ''
  })
  const end = steps[steps.length - 1].eq?.split(' = ')[1] ?? `${first}`
  const t = steps.findIndex((s) => s.ten)
  const tail = t > 0 && t < steps.length - 1 ? ` = 10${ops.slice(t).join('')}` : ''
  return `${first}${ops.join('')}${tail} = ${end}`
}

/* ───────────── problemler ───────────── */

export type Kind = 'join' | 'sep' | 'cmp'
/** res: sonuç, chg: değişim, start: başlangıç bilinmiyor · more/less: kaç fazla / kaç eksik · big: büyük miktar bilinmiyor */
export type Unk = 'res' | 'chg' | 'start' | 'more' | 'less' | 'big'
/** poss: karşılaştırmada iyelik eki almış ad (“Ali’nin 9 yıldızı var”) */
export interface Prob { kind: Kind; unk: Unk; a: number; b: number; c: number; emoji: string; noun: string; poss: string; place: string; verb: string; names: [string, string] }

const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const JOIN = [
  { emoji: '🐦', noun: 'kuş', place: 'Dalda', verb: 'geldi' },
  { emoji: '🐟', noun: 'balık', place: 'Akvaryumda', verb: 'geldi' },
  { emoji: '🐞', noun: 'uğur böceği', place: 'Yaprakta', verb: 'geldi' },
  { emoji: '🦆', noun: 'ördek', place: 'Gölde', verb: 'geldi' },
]
const SEP = [
  { emoji: '🎈', noun: 'balon', place: 'Elimizde', verb: 'uçtu' },
  { emoji: '🍪', noun: 'kurabiye', place: 'Tabakta', verb: 'yendi' },
  { emoji: '🐸', noun: 'kurbağa', place: 'Gölde', verb: 'gitti' },
  { emoji: '🍎', noun: 'elma', place: 'Sepette', verb: 'yendi' },
]
const CMP = [
  { emoji: '⭐', noun: 'yıldız', poss: 'yıldızı' },
  { emoji: '📚', noun: 'kitap', poss: 'kitabı' },
  { emoji: '🍓', noun: 'çilek', poss: 'çileği' },
  { emoji: '⚽', noun: 'top', poss: 'topu' },
]
/** İsim, ilgi hâli (“Ali’nin”) ve ayrılma hâli (“Ali’den”) */
const KIDS: [string, string, string][] = [['Ali', 'Ali’nin', 'Ali’den'], ['Ece', 'Ece’nin', 'Ece’den'], ['Can', 'Can’ın', 'Can’dan'], ['Elif', 'Elif’in', 'Elif’ten'], ['Mert', 'Mert’in', 'Mert’ten'], ['Zeynep', 'Zeynep’in', 'Zeynep’ten'], ['Deniz', 'Deniz’in', 'Deniz’den'], ['Ayşe', 'Ayşe’nin', 'Ayşe’den']]
export const gen = (name: string) => KIDS.find((k) => k[0] === name)?.[1] ?? `${name}’in`
export const abl = (name: string) => KIDS.find((k) => k[0] === name)?.[2] ?? `${name}’den`

/** Sınıfa göre: 1. sınıfta onluğu aşan sonuç bilinmeyen; 2. sınıfta değişim ve başlangıç bilinmeyen de */
export function make(kind: Kind, unk: Unk, grade: number, used: Set<string>): Prob {
  const th = (list: { emoji: string; noun: string; poss?: string; place?: string; verb?: string }[]) => {
    const free = list.filter((x) => !used.has(x.emoji))
    const t = pick(free.length ? free : list)
    used.add(t.emoji)
    return t
  }
  const kids = shuffle(KIDS).slice(0, 2).map((k) => k[0]) as [string, string]
  if (kind === 'join') {
    const a = grade <= 1 ? ri(6, 9) : ri(4, 9)
    const b = ri(11 - a, Math.min(9, (grade <= 1 ? 18 : 19) - a))
    const t = th(JOIN)
    return { kind, unk, a, b, c: a + b, emoji: t.emoji, noun: t.noun, poss: t.noun, place: t.place!, verb: t.verb!, names: kids }
  }
  if (kind === 'sep') {
    const a = ri(11, grade <= 1 ? 18 : 19)
    const c = ri(Math.max(2, a - 9), 9)
    const t = th(SEP)
    return { kind, unk, a, b: a - c, c, emoji: t.emoji, noun: t.noun, poss: t.noun, place: t.place!, verb: t.verb!, names: kids }
  }
  const a = ri(6, 10)
  const b = ri(2, a - 2)
  const t = th(CMP)
  return { kind, unk, a, b, c: a - b, emoji: t.emoji, noun: t.noun, poss: t.poss!, place: '', verb: '', names: kids }
}

/** İşlem cümlesinin parçaları: sayılar ve işaret (karşılaştırmada büyük − küçük) */
export function sentenceOf(p: Prob): { nums: [number, number, number]; sign: '+' | '−'; unknown: 0 | 1 | 2 } {
  if (p.kind === 'join') return { nums: [p.a, p.b, p.c], sign: '+', unknown: p.unk === 'res' ? 2 : p.unk === 'chg' ? 1 : 0 }
  if (p.kind === 'sep') return { nums: [p.a, p.b, p.c], sign: '−', unknown: p.unk === 'res' ? 2 : p.unk === 'chg' ? 1 : 0 }
  if (p.unk === 'big') return { nums: [p.b, p.c, p.a], sign: '+', unknown: 2 }
  return { nums: [p.a, p.b, p.c], sign: '−', unknown: 2 }
}
export const answerOf = (p: Prob) => {
  const s = sentenceOf(p)
  return s.nums[s.unknown]
}

/** Tuvaldeki canlı değerler: işlem cümlesinin kutuları pullar kondukça dolar */
export function liveOf(p: Prob, st: St): [number, number, number] {
  if (p.kind === 'join') return [st.a, st.b, st.cells.length]
  if (p.kind === 'sep') return [st.cells.length + st.gone.length, st.gone.length, st.cells.length]
  if (p.unk === 'big') return [st.b, st.pairs > 0 && st.pairs === st.b ? Math.max(0, st.a - st.pairs) : 0, st.a]
  return [st.a, st.b, 0]
}

/** Model hikâyeyi gösteriyor mu? */
export function builtOf(p: Prob, st: St) {
  const [x, y, z] = liveOf(p, st)
  if (p.kind === 'join') {
    if (st.gone.length) return false
    if (p.unk === 'res') return x === p.a && y === p.b
    if (p.unk === 'chg') return x === p.a && z === p.c
    return y === p.b && z === p.c
  }
  if (p.kind === 'sep') {
    if (p.unk === 'res') return x === p.a && y === p.b
    if (p.unk === 'chg') return x === p.a && z === p.c
    return y === p.b && z === p.c
  }
  if (p.unk === 'big') return st.b === p.b && st.pairs === p.b && st.a === p.a
  return st.a === p.a && st.b === p.b && st.pairs === Math.min(p.a, p.b)
}

/** Hikâyeden fazla pul konduysa yol gösteren cümle (ceza yok) */
export function overOf(p: Prob, st: St): string | null {
  const [x, y, z] = liveOf(p, st)
  const s = sentenceOf(p)
  const undo = 'Fazla pulu “Geri al” ile kaldırabilirsin.'
  if (p.kind === 'join') {
    if (s.unknown !== 0 && x > p.a) return `Başta ${p.a} ${p.noun} vardı: ${p.a} tane 🔴 yeter. ${undo}`
    if (s.unknown !== 1 && y > p.b) return `${p.b} ${p.noun} ${p.verb}: ${p.b} tane 🟡 yeter. ${undo}`
    if (s.unknown !== 2 && z > p.c) return `Sonunda ${p.c} ${p.noun} oldu. Çerçevede ${z} pul var. ${undo}`
  }
  if (p.kind === 'sep') {
    if (s.unknown !== 0 && x > p.a) return `Başta ${p.a} ${p.noun} vardı. Sen ${x} pul koydun. ${undo}`
    if (s.unknown !== 1 && y > p.b) return `${p.b} ${p.noun} ${p.verb}. Gidenlerde ${y} pul var. ${undo}`
  }
  if (p.kind === 'cmp') {
    const [A, B] = p.names
    if (st.a > p.a && p.unk !== 'big') return `${gen(A)} ${p.a} ${p.poss} var. ${undo}`
    if (st.b > p.b) return `${gen(B)} ${p.b} ${p.poss} var. ${undo}`
  }
  return null
}

export function cardsFor(p: Prob): number[] {
  const ans = answerOf(p)
  const s = new Set([ans - 1, ans, ans + 1])
  if (p.kind === 'join' && p.unk !== 'res') s.add(p.c)
  if (p.kind === 'sep' && p.unk !== 'res') s.add(p.c)
  if (p.kind === 'sep' && p.unk === 'res') s.add(p.a + p.b > 20 ? p.b : p.a + p.b)
  if (p.kind === 'cmp' && p.unk !== 'big') s.add(p.a + p.b)
  if (p.kind === 'cmp' && p.unk === 'big') s.add(p.c)
  if (s.size < 4) s.add(ans + 2)
  return [...s].filter((v) => v >= 0 && v <= 20).sort((x, y) => x - y)
}

/** Yanlış cevap kartı için düşündüren soru (bilinen yanılgı rapora yazılır) */
export function missOf(p: Prob, v: number): { q: string; mis?: string } {
  const ans = answerOf(p)
  if (Math.abs(v - ans) === 1) return { q: 'Çok yaklaştın! Pulları parmağınla bir daha say. Dolu çerçeve 10 eder, oradan devam et.', mis: 'Sayarken bir eksik ya da fazla sayıyor' }
  if (p.kind === 'join' && p.unk === 'chg' && v === p.c) return { q: `${p.c}, hepsi birden. Soru, kaç ${p.noun} geldiği. Yalnızca 🟡 pulları say.`, mis: 'Değişim bilinmeyen problemde toplamı cevap olarak veriyor' }
  if (p.kind === 'join' && p.unk === 'start' && v === p.c) return { q: `${p.c}, sonunda olanlar. Soru, başta kaç ${p.noun} olduğu. Gelenler (🟡) gelmeden önce kaç pul vardı?`, mis: 'Başlangıç bilinmeyen problemde sonucu cevap olarak veriyor' }
  if (p.kind === 'sep' && p.unk === 'chg' && v === p.c) return { q: `${p.c}, kalanlar. Soru, kaç ${p.noun} ${p.verb}. Gidenler kutusundaki pulları say.`, mis: 'Değişim bilinmeyen problemde kalanı cevap olarak veriyor' }
  if (p.kind === 'sep' && p.unk === 'start' && v === p.c) return { q: `${p.c}, sonunda kalanlar. Başta onlar ve gidenler birlikteydi. Hepsi kaç eder?`, mis: 'Başlangıç bilinmeyen problemde sonucu cevap olarak veriyor' }
  if (p.kind === 'sep' && v === p.a + p.b) return { q: `Hikâyede ${p.b} ${p.noun} gelmedi, ${p.verb}. Gidenler çıkınca çerçevede kaç pul kaldı?`, mis: 'Ayırma probleminde sayıları topluyor' }
  if (p.kind === 'cmp' && p.unk !== 'big' && v === p.a + p.b) return { q: 'İki sırayı topladın. Soru, birinin ötekinden kaç fazla olduğu. Eşi olmayan pulları say.', mis: 'Karşılaştırma probleminde sayıları topluyor' }
  if (p.kind === 'cmp' && p.unk === 'big' && v === p.c) return { q: `${p.c}, aradaki fark. ${gen(p.names[0])} kaç ${p.poss} var? Üst sıradaki bütün pulları say.`, mis: 'Karşılaştırma probleminde farkı büyük miktar sanıyor' }
  return { q: 'Tuvale bak: soru hangi pulları soruyor? Onları parmağınla say.' }
}

/** Her problemin kısa, resimli cümlesi */
export function storyText(p: Prob): string {
  const N = p.noun
  const [A, B] = p.names
  if (p.kind === 'join') {
    if (p.unk === 'res') return `${p.place} ${p.a} ${N} var. ${p.b} ${N} daha ${p.verb}. Kaç ${N} oldu?`
    if (p.unk === 'chg') return `${p.place} ${p.a} ${N} var. Birkaç ${N} daha ${p.verb}. ${p.c} ${N} oldu. Kaç ${N} ${p.verb}?`
    return `${p.place} birkaç ${N} vardı. ${p.b} ${N} daha ${p.verb}. ${p.c} ${N} oldu. Başta kaç ${N} vardı?`
  }
  if (p.kind === 'sep') {
    if (p.unk === 'res') return `${p.place} ${p.a} ${N} var. ${p.b} ${N} ${p.verb}. Kaç ${N} kaldı?`
    if (p.unk === 'chg') return `${p.place} ${p.a} ${N} var. Birkaç ${N} ${p.verb}. ${p.c} ${N} kaldı. Kaç ${N} ${p.verb}?`
    return `${p.place} birkaç ${N} vardı. ${p.b} ${N} ${p.verb}. ${p.c} ${N} kaldı. Başta kaç ${N} vardı?`
  }
  const P = p.poss
  if (p.unk === 'big') return `${gen(B)} ${p.b} ${P} var. ${gen(A)}, ${abl(B)} ${p.c} fazla ${P} var. ${gen(A)} kaç ${P} var?`
  if (p.unk === 'less') return `${gen(A)} ${p.a} ${P} var. ${gen(B)} ${p.b} ${P} var. ${gen(B)} kaç eksik ${P} var?`
  return `${gen(A)} ${p.a} ${P} var. ${gen(B)} ${p.b} ${P} var. ${gen(A)} kaç fazla ${P} var?`
}

/* ───────────── hikâye kartı ───────────── */

function Bunch({ n, emoji, unknown, tone }: { n: number; emoji: string; unknown?: boolean; tone: string }) {
  return (
    <div className={`flex min-h-24 flex-1 flex-col items-center justify-center gap-1 rounded-2xl p-2 ring-2 ${tone}`}>
      {unknown ? (
        <span className="grid size-12 place-items-center rounded-full bg-white text-3xl font-black text-sky-600 ring-2 ring-sky-300">?</span>
      ) : (
        <>
          <span className="text-3xl leading-none font-black tabular-nums sm:text-4xl">{n}</span>
          <span className="grid grid-cols-5 gap-x-px text-[13px] leading-tight sm:text-[15px]" aria-hidden>
            {Array.from({ length: n }, (_, i) => <span key={i}>{emoji}</span>)}
          </span>
        </>
      )}
    </div>
  )
}

/** Okumayan çocuk için üç kutulu resimli hikâye: önce → değişim → sonra (ya da iki kişi ve soru) */
export function Story({ p }: { p: Prob }) {
  const u = sentenceOf(p).unknown
  const arrow = (t: string) => <span className="self-center text-center text-sm leading-tight font-black text-ink-soft">{t}</span>
  let body: ReactNode
  if (p.kind === 'cmp') {
    const [A, B] = p.names
    const top = <div className="flex flex-1 flex-col gap-1"><p className="text-center text-sm font-black text-red-700">{A} 🔴</p><Bunch n={p.a} emoji={p.emoji} unknown={p.unk === 'big'} tone="bg-red-50 ring-red-200" /></div>
    const bot = <div className="flex flex-1 flex-col gap-1"><p className="text-center text-sm font-black text-yellow-700">{B} 🟡</p><Bunch n={p.b} emoji={p.emoji} tone="bg-yellow-50 ring-yellow-200" /></div>
    body = (
      <>
        {top}
        {bot}
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-center text-sm font-black text-sky-700">{p.unk === 'less' ? 'Kaç eksik?' : p.unk === 'big' ? `${p.c} fazla` : 'Kaç fazla?'}</p>
          <div className="grid min-h-24 flex-1 place-items-center rounded-2xl bg-sky-50 p-2 text-3xl font-black text-sky-700 ring-2 ring-sky-200">{p.unk === 'big' ? `+${p.c}` : '?'}</div>
        </div>
      </>
    )
  } else {
    const join = p.kind === 'join'
    body = (
      <>
        <Bunch n={p.a} emoji={p.emoji} unknown={u === 0} tone="bg-white ring-line" />
        {arrow(join ? '➕\ngeldi' : '➖\ngitti')}
        <Bunch n={p.b} emoji={p.emoji} unknown={u === 1} tone={join ? 'bg-yellow-50 ring-yellow-200' : 'bg-slate-100 ring-slate-200 opacity-90'} />
        {arrow('=')}
        <Bunch n={p.c} emoji={p.emoji} unknown={u === 2} tone="bg-emerald-50 ring-emerald-200" />
      </>
    )
  }
  return (
    <div className="rounded-2xl bg-white/95 p-2.5 ring-1 ring-line">
      <div className="flex items-stretch gap-1.5 whitespace-pre-line">{body}</div>
      <p className="mt-2 text-center text-[17px] leading-snug font-extrabold text-ink sm:text-lg">{storyText(p)}</p>
    </div>
  )
}

/* ───────────── işlem cümlesi ───────────── */

/**
 * Kutular pullar kondukça dolar: boşken kesikli, hikâyedeki sayıya ulaşınca yeşil. Bilinmeyen kutu
 * cevap kartının bırakıldığı yerdir. signSlot: karışık görevde işaret kartı da sürüklenir.
 */
export function Sentence({ p, st, dnd, answer, sign, signSlot, built, wrongAt }: { p: Prob; st: St; dnd: Dnd; answer: number | null; sign: string | null; signSlot?: boolean; built: boolean; wrongAt?: 'ans' | 'sign' | null }) {
  const s = sentenceOf(p)
  const live = liveOf(p, st)
  const box = 'grid h-16 min-w-16 place-items-center rounded-2xl px-2 text-4xl font-black tabular-nums transition sm:h-[72px] sm:min-w-[72px]'
  const num = (i: 0 | 1 | 2) => {
    if (i === s.unknown) {
      if (answer !== null) return <span key={i} className={`${box} bg-emerald-500 text-white animate-pop`}>{answer}</span>
      return (
        <Drop key={i} dnd={dnd} id="ans" className={`${box} border-[3px] border-dashed ${built ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-slate-300 bg-white/70 text-slate-300'} ${wrongAt === 'ans' ? 'animate-shake' : ''}`}>?</Drop>
      )
    }
    const v = live[i]
    const ok = v === s.nums[i]
    return <span key={i} className={`${box} ${v === 0 ? 'border-[3px] border-dashed border-slate-300 bg-white/70 text-slate-300' : ok ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400' : 'bg-amber-50 text-amber-700 ring-2 ring-amber-300'}`}>{v === 0 ? '' : v}</span>
  }
  const op = (t: ReactNode) => <span className="px-0.5 text-4xl font-black text-ink">{t}</span>
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-white/90 px-2 py-2 ring-1 ring-line">
      {num(0)}
      {signSlot ? (
        sign ? <span className={`${box} min-w-14! bg-violet-500 text-white animate-pop`}>{sign}</span> : <Drop dnd={dnd} id="sign" className={`${box} min-w-14! border-[3px] border-dashed border-violet-400 bg-violet-50 text-xl text-violet-500 ${wrongAt === 'sign' ? 'animate-shake' : ''}`}>+ −</Drop>
      ) : op(s.sign)}
      {num(1)}
      {op('=')}
      {num(2)}
    </div>
  )
}

/* ───────────── kaynak pullar ───────────── */

function Five({ c, px }: { c: Col; px: number }) {
  return <span className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Counter key={i} c={c} px={px} />)}</span>
}

/** Sonsuz pul kaynağı: 1’er ya da 5’li dizi hâlinde sürüklenir */
export function Sources({ dnd, disabled, names, colors = ['r', 'y'] }: { dnd: Dnd; disabled?: boolean; names?: [string, string]; colors?: Col[] }) {
  const pile = (c: Col) => (
    <div key={c} className="flex flex-col items-center gap-1">
      <p className={`text-xs font-black ${c === 'r' ? 'text-red-700' : 'text-yellow-700'}`}>{names ? `${names[c === 'r' ? 0 : 1]} ${DOT[c]}` : c === 'r' ? '🔴 kırmızı' : '🟡 sarı'}</p>
      <div className="flex items-center gap-1.5">
        <Drag dnd={dnd} item={`src-${c}-1`} label={`1 ${c === 'r' ? 'kırmızı' : 'sarı'} pul`} disabled={disabled} ghost={<Counter c={c} px={40} />} className="grid size-14 place-items-center rounded-2xl bg-white shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">
          <Counter c={c} px={34} />
        </Drag>
        <Drag dnd={dnd} item={`src-${c}-5`} label={`5 ${c === 'r' ? 'kırmızı' : 'sarı'} pul`} disabled={disabled} ghost={<Five c={c} px={32} />} className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl bg-white px-1.5 shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">
          <Five c={c} px={15} />
          <span className="text-[11px] leading-none font-black text-ink-soft">5’li</span>
        </Drag>
      </div>
    </div>
  )
  return (
    <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-2 rounded-2xl bg-white/90 px-2 py-2 ring-1 ring-line sm:flex-col sm:items-center">
      {colors.map(pile)}
    </div>
  )
}

/* ───────────── onluk çerçeveler ───────────── */

/**
 * İki onluk çerçeve (üstteki önce dolar). Tüm alan bir bırakma hedefidir (board). take verilirse çerçeve
 * tek bir büyük tutma alanıdır: tutup sürükleyince en son konan pul kalkar (Gidenler’e götürülür).
 */
export function Frames({ st, dnd, take, lock }: { st: St; dnd: Dnd; take?: boolean; lock?: boolean }) {
  const lastIdx = st.cells.length - 1
  const body = (
    <div className="flex w-full flex-col gap-2">
      {[0, 1].map((f) => {
        const full = st.cells.length >= (f + 1) * 10
        return (
          <div key={f} className="relative">
            <div className={`grid grid-cols-5 gap-1 rounded-xl p-1.5 ring-[3px] transition ${full ? 'bg-emerald-50 ring-emerald-500' : 'bg-white ring-slate-400'}`}>
              {Array.from({ length: 10 }, (_, i) => {
                const k = f * 10 + i
                const c = st.cells[k]
                return (
                  <span key={i} className={`grid aspect-square place-items-center rounded-lg bg-slate-50 ring-1 ring-slate-300 ${i === 4 || i === 9 ? '' : ''}`}>
                    {c && <Counter key={`${k}-${c}`} c={c} pop={k === lastIdx} />}
                  </span>
                )
              })}
            </div>
            {full && <span className="absolute -top-2.5 -right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-black text-white shadow animate-pop">10</span>}
          </div>
        )
      })}
    </div>
  )
  const last = st.cells[lastIdx]
  return (
    <Drop dnd={dnd} id="board" className="mx-auto w-full max-w-[340px] rounded-2xl p-1">
      {take && last && !lock ? (
        <Drag dnd={dnd} item="board" label="Çerçeveden 1 pul" ghost={<Counter c={last} px={44} />} className="block w-full rounded-2xl">
          {body}
        </Drag>
      ) : (
        body
      )}
      <p className="mt-1.5 text-center text-sm font-black text-ink-soft tabular-nums">Çerçevede {st.cells.length} pul</p>
    </Drop>
  )
}

/** Gidenler: çerçeveden sürüklenen pullar buraya gelir */
export function Gone({ st, dnd }: { st: St; dnd: Dnd }) {
  return (
    <Drop dnd={dnd} id="gone" className="flex min-h-28 w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-2 sm:w-36">
      <p className="text-sm font-black text-slate-600">👋 Gidenler</p>
      <div className="flex max-w-[150px] flex-wrap justify-center gap-1">
        {st.gone.map((c, i) => <span key={i} className="opacity-60"><Counter c={c} px={22} pop={i === st.gone.length - 1} /></span>)}
      </div>
      <p className="mt-auto text-2xl font-black text-slate-600 tabular-nums">{st.gone.length}</p>
    </Drop>
  )
}

/* ───────────── karşılaştırma sıraları ───────────── */

/**
 * İki sıra pul, sütunlar hizalı. Bir sıranın pullarını tutup öbür sıraya sürüklemek bir çift yapar
 * (bire bir eşleme); çiftler aradaki çizgiyle bağlanır. Eşleme bitince eşi olmayan pullar parlar.
 */
/** 5 göz + küçük boşluk + 5 göz (beşlik yapı görünsün) */
const TEN = 'repeat(5, minmax(0, 1fr)) 4px repeat(5, minmax(0, 1fr))'

export function Rows({ st, dnd, names, lock }: { st: St; dnd: Dnd; names: [string, string]; lock?: boolean }) {
  const min = Math.min(st.a, st.b)
  const done = st.pairs > 0 && st.pairs === min
  const row = (c: Col) => {
    const n = c === 'r' ? st.a : st.b
    const free = n - st.pairs
    const grid = (
      <div className="grid w-full gap-1" style={{ gridTemplateColumns: TEN }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} style={{ gridColumn: i < 5 ? i + 1 : i + 2 }} className={`grid aspect-square place-items-center rounded-lg ring-1 ${i < n ? (done && i >= st.pairs ? 'bg-sky-100 ring-2 ring-sky-500' : 'bg-white ring-slate-300') : 'bg-slate-50/70 ring-slate-200'}`}>
            {i < n && <Counter key={`${c}-${i}`} c={c} pop={i === n - 1} />}
          </span>
        ))}
      </div>
    )
    const id = c === 'r' ? 'rowA' : 'rowB'
    return (
      <Drop dnd={dnd} id={id} className={`rounded-2xl p-1.5 ${c === 'r' ? 'bg-red-50' : 'bg-yellow-50'}`}>
        <p className={`mb-1 flex items-center justify-between px-1 text-sm font-black ${c === 'r' ? 'text-red-700' : 'text-yellow-800'}`}>
          <span>{names[c === 'r' ? 0 : 1]} {DOT[c]}</span>
          <span className="tabular-nums">{n}</span>
        </p>
        {!lock && free > 0 && st.pairs < 10 ? (
          <Drag dnd={dnd} item={id} label={`${names[c === 'r' ? 0 : 1]} sırasından eşi olmayan 1 pul`} ghost={<Counter c={c} px={36} />} className="block w-full rounded-xl">
            {grid}
          </Drag>
        ) : (
          grid
        )}
      </Drop>
    )
  }
  return (
    <div className="flex flex-col">
      {row('r')}
      <div className="grid h-7 gap-1 px-1.5" style={{ gridTemplateColumns: TEN }} aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} style={{ gridColumn: i < 5 ? i + 1 : i + 2 }} className="flex justify-center">{i < st.pairs && <span className="h-full w-1 rounded-full bg-violet-500 animate-pop" />}</span>
        ))}
      </div>
      {row('y')}
      <p className="mt-1.5 text-center text-sm font-black text-violet-700">{st.pairs ? `${st.pairs} çift` : 'Çift yok'}{done && Math.max(st.a, st.b) > min ? ` · ${Math.max(st.a, st.b) - min} pulun eşi yok` : ''}</p>
    </div>
  )
}

/* ───────────── çözüm adımları şeridi ───────────── */

export function Strip({ steps, play, onPlay, chain, empty = 'Pul koydukça adımların burada yazılacak.' }: { steps: Step[]; play: number | null; onPlay: () => void; chain?: string | null; empty?: string }) {
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    if (play === null) return
    const el = listRef.current?.children[play] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [play])
  return (
    <div className="rounded-2xl bg-white p-3 ring-2 ring-violet-200">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black tracking-wide text-violet-700 uppercase">📝 Çözüm adımlarım</p>
        <button type="button" onClick={onPlay} disabled={!steps.length || play !== null} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-sm font-black text-white shadow-[0_3px_0_#5b21b6] active:translate-y-0.5 disabled:opacity-40">
          <Play size={16} fill="currentColor" />{play !== null ? 'İzleniyor…' : 'Adımları izle'}
        </button>
      </div>
      {steps.length ? (
        <ol ref={listRef} className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
          {steps.map((s, i) => (
            <li key={i} className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-2 py-1.5 transition animate-fade-up ${play === i ? 'bg-violet-100 ring-2 ring-violet-500' : play !== null && i > play ? 'opacity-35 ring-1 ring-violet-100' : 'bg-violet-50/70 ring-1 ring-violet-200'}`}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-600 text-xs font-black text-white">{i + 1}</span>
              <span className="min-w-0 flex-1 text-[15px] leading-snug font-extrabold">{s.text}</span>
              {s.eq && <span className={`rounded-lg px-2 py-0.5 text-base font-black tabular-nums ring-1 ${s.ten ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-white text-violet-800 ring-violet-200'}`}>{s.eq}</span>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl bg-violet-50/60 px-3 py-3 text-sm font-bold text-violet-900/70">{empty}</p>
      )}
      {chain && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-center text-lg font-black text-emerald-800 tabular-nums ring-1 ring-emerald-300">{chain}</p>}
    </div>
  )
}

/** “Adımları izle”: play adımı gösterilirken tuval o adımın sonundaki durumu çizer */
export function usePlayer(steps: Step[]) {
  const [play, setPlay] = useState<number | null>(null)
  useEffect(() => {
    if (play === null) return
    const id = window.setTimeout(() => setPlay(play + 1 < steps.length ? play + 1 : null), play + 1 < steps.length ? 1300 : 1800)
    return () => window.clearTimeout(id)
  }, [play, steps.length])
  const on = play !== null && play < steps.length ? play : null
  return { play: on, start: () => steps.length && setPlay(0), stop: () => setPlay(null), end: on === null ? null : steps[on].end }
}

/* ───────────── düğmeler ───────────── */

export function Tools({ onUndo, onReset, disabled }: { onUndo: () => void; onReset: () => void; disabled?: boolean }) {
  const b = 'inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line active:translate-y-0.5 disabled:opacity-40'
  return (
    <div className="flex justify-center gap-2">
      <button type="button" onClick={onUndo} disabled={disabled} className={b}><Undo2 size={17} />Geri al</button>
      <button type="button" onClick={onReset} disabled={disabled} className={b}><RotateCcw size={17} />Baştan</button>
    </div>
  )
}

/* ───────────── “Nasıl kullanılır?” araçları ───────────── */

export const TOOL: Record<'src' | 'frame' | 'take' | 'pair' | 'strip' | 'card' | 'sign' | 'undo', ToolInfo> = {
  src: { icon: <span className="flex gap-0.5"><Counter c="r" px={12} /><Counter c="y" px={12} /></span>, name: 'Pul yığınları', text: 'Bir pulu ya da 5’li diziyi tutup çerçeveye sürükle. 🔴 baştakiler, 🟡 gelenler.' },
  frame: { icon: <span className="grid h-4 w-6 grid-cols-5 gap-px rounded-sm bg-slate-400 p-px">{Array.from({ length: 10 }, (_, i) => <span key={i} className="bg-white" />)}</span>, name: 'Onluk çerçeveler', text: 'Üstteki çerçeve önce dolar. Bir çerçeve dolunca 10 olur.' },
  take: { icon: <span className="text-base leading-none">👋</span>, name: 'Gidenler', text: 'Çerçeveyi tut ve Gidenler kutusuna sürükle: en son pul gider.' },
  pair: { icon: <span className="flex flex-col items-center"><Counter c="r" px={10} /><span className="h-1.5 w-0.5 bg-violet-500" /><Counter c="y" px={10} /></span>, name: 'Eşleme', text: 'Bir sıranın pulunu tutup öbür sıraya sürükle: iki pul çift olur, arada çizgi çıkar.' },
  strip: { icon: <span className="text-base leading-none">📝</span>, name: 'Çözüm adımları', text: 'Her hareketin buraya yazılır. “Adımları izle” ile çözümünü baştan izleyebilirsin.' },
  card: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-white px-0.5 text-[11px] font-black ring-1 ring-line">13</span>, name: 'Sayı kartları', text: 'Model hazır olunca cevap kartını işlem cümlesindeki ? kutusuna sürükle.' },
  sign: { icon: <span className="grid h-5 min-w-6 place-items-center rounded-md bg-violet-500 px-0.5 text-xs font-black text-white">+ −</span>, name: 'İşaret kartları', text: 'Hikâyeye uyan işareti işlem cümlesindeki boş kutuya sürükle.' },
  undo: { icon: <Undo2 size={16} />, name: 'Geri al', text: 'Son hareketini geri alır. “Baştan” hepsini temizler.' },
}
