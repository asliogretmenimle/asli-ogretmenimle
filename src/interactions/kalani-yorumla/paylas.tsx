import { useMemo, useState } from 'react'
import { sfx } from '../../lib/feedback'
import { rng } from '../donusum-studyosu/ortak'
import { Drag, Drop, useDnd, type Dnd, type ToolInfo } from '../sayilari-karsilastir/parts'
import { HandGhost, HandPicker, emojiOf, type Skin, type Verdict } from '../sepetlere-grupla/sepet'

/**
 * Paylaştırma tuvali (Kalan Ne Anlatıyor?, 96): nesneler 4 arkadaşın tabağına adil biçimde dağıtılır.
 * Adalet kuralı: bir tabak, en az alan tabaklardan biri değilse nesne almaz; yeni bir tur ancak herkese
 * yetecek kadar nesne varsa başlar. Artanlar “Bana” kutusuna gider (bilye) ya da kesme kartıyla
 * yarım ve çeyreklere bölünüp yeniden paylaştırılır (kurabiye).
 */

export type Kind = 1 | 2 | 4
export interface Piece { id: number; kind: Kind }
export const PEOPLE = [
  { name: 'Ali', emoji: '👦' },
  { name: 'Ece', emoji: '👧' },
  { name: 'Can', emoji: '🧒' },
  { name: 'Defne', emoji: '👩' },
]
const KIND_WORD: Record<Kind, string> = { 1: '', 2: 'yarım ', 4: 'çeyrek ' }

interface ShareState { plates: Piece[][]; loose: Piece[]; mine: Piece[]; next: number; round: number | null }

export function useShare({ n, preset = 0, people = 4 }: { n: number; preset?: number; people?: number }) {
  const [st, setSt] = useState<ShareState>(() => {
    let id = 0
    const plates = Array.from({ length: people }, () => Array.from({ length: preset }, () => ({ id: id++, kind: 1 as Kind })))
    const loose = Array.from({ length: n - id }, () => ({ id: id++, kind: 1 as Kind }))
    return { plates, loose, mine: [], next: id, round: null }
  })
  const [hand, setHand] = useState(1)
  const countOf = (kind: Kind) => st.plates.map((p) => p.filter((x) => x.kind === kind).length)
  const even = ([1, 2, 4] as Kind[]).every((k) => new Set(countOf(k)).size === 1)

  function move(item: string, target: string, sk: Skin, cookie: boolean): Verdict | null {
    if (item.startsWith('cut-')) {
      const parts = Number(item.slice(4)) as 2 | 4
      if (!target.startsWith('piece-')) return { ok: false, msg: 'Kesme kartını masadaki artan bir kurabiyenin üstüne bırak.' }
      const id = Number(target.slice(6))
      const p = st.loose.find((x) => x.id === id)
      if (!p) return null
      if (p.kind === 4) return { ok: false, msg: 'Bu zaten bir çeyrek, yeterince küçük. Şimdi arkadaşlarına paylaştır.' }
      if (p.kind === 2 && parts === 4) return { ok: false, msg: 'Yarım kurabiyeyi 4’e bölersek parçalar çeyrekten de küçük olur. Yarımı ikiye böl: 2 çeyrek olur.' }
      const kind: Kind = p.kind === 2 ? 4 : parts
      const count = p.kind === 2 ? 2 : parts
      const made = Array.from({ length: count }, (_, k) => ({ id: st.next + k, kind }))
      const i = st.loose.indexOf(p)
      setSt({ ...st, loose: [...st.loose.slice(0, i), ...made, ...st.loose.slice(i + 1)], next: st.next + count })
      sfx.ok()
      return { ok: true }
    }
    if (!item.startsWith('obj-')) return null
    const id = Number(item.slice(4))
    const p = st.loose.find((x) => x.id === id)
    if (!p) return null
    const same = st.loose.filter((x) => x.kind === p.kind)
    const counts = countOf(p.kind)
    const min = Math.min(...counts)
    const allEq = counts.every((c) => c === min)
    if (target.startsWith('pay-')) {
      const i = Number(target.slice(4))
      if (counts[i] > min) {
        const low = PEOPLE[counts.indexOf(min)].name
        return { ok: false, msg: `${PEOPLE[i].name} şimdiden ${low}’den daha çok aldı. Adil olsun: önce daha az alana ver.` }
      }
      const take = allEq ? (cookie ? 1 : Math.min(hand, same.length)) : st.round ?? 1
      if (allEq && same.length < people * take) {
        if (cookie) {
          if (p.kind === 1) return { ok: false, msg: `Herkese birer bütün kurabiye daha yetmez: masada ${same.length} kurabiye var. Kurabiyeyi bölmeyi dene: ✂️ kesme kartını bir kurabiyenin üstüne sürükle.` }
          return { ok: false, msg: `4 kişiye yetecek kadar ${KIND_WORD[p.kind]}parça yok: masada ${same.length} tane var. ${p.kind === 2 ? 'Yarımları da ikiye bölebilirsin.' : 'Başka bir parçayı da böl.'}` }
        }
        if (same.length < people) return { ok: false, msg: `Herkese birer ${sk.one} daha vermeye yetmez: masada ${same.length} ${sk.one} var. Kimseye fazladan veremeyiz. Artanlar kime kalıyordu? Hikâyeye bak.` }
        return { ok: false, msg: `Herkese ${take} ${sk.one} daha vermeye yetmez: masada ${same.length} var. Bir seferde daha az al.` }
      }
      const ids = [p, ...same.filter((x) => x !== p)].slice(0, take)
      const plates = st.plates.map((pl, k) => (k === i ? [...pl, ...ids] : pl))
      const after = plates.map((pl) => pl.filter((x) => x.kind === p.kind).length)
      setSt({ ...st, plates, loose: st.loose.filter((x) => !ids.includes(x)), round: new Set(after).size === 1 ? null : take })
      return { ok: true }
    }
    if (target === 'me') {
      if (!allEq || st.loose.length >= people)
        return { ok: false, msg: allEq ? `Masada ${st.loose.length} ${sk.one} var: herkese birer tane daha verebilirsin. Önce arkadaşlarına eşit paylaştır.` : 'Önce bu turu bitir: herkes aynı sayıda alsın.', mis: st.loose.length >= people ? 'Eşit paylaştırılabilecek nesneleri kalana ayırıyor' : undefined }
      const ids = [p, ...st.loose.filter((x) => x !== p)].slice(0, Math.min(hand, st.loose.length))
      setSt({ ...st, loose: st.loose.filter((x) => !ids.includes(x)), mine: [...st.mine, ...ids] })
      return { ok: true }
    }
    return null
  }

  return { ...st, hand, setHand, even, finished: st.loose.length === 0 && even, move, people }
}
export type Share = ReturnType<typeof useShare>

/** Çeyrek sayısından “5 kurabiye ve 3 çeyrek” ya da “5 3/4” */
export function amountText(qs: number, grade: number) {
  const w = Math.floor(qs / 4)
  const r = qs % 4
  if (!r) return `${w} kurabiye`
  if (grade >= 4) return `${w} ${r}/4 kurabiye`
  return `${w} kurabiye ve ${r === 2 ? 'yarım' : `${r} çeyrek`}`
}

/** Bütün, yarım ya da çeyrek parça */
export function PieceIcon({ p, sk, big }: { p: Piece; sk: Skin; big?: boolean }) {
  const e = emojiOf(sk, p.id)
  const sz = big ? 'text-[32px]' : 'text-[22px]'
  if (p.kind === 1) return <span className={`${sz} leading-none`}>{e}</span>
  return (
    <span className={`relative inline-block ${sz} leading-none`}>
      <span style={{ clipPath: p.kind === 2 ? 'inset(0 50% 0 0)' : 'inset(0 50% 50% 0)', display: 'inline-block' }}>{e}</span>
      <span className="absolute -right-1 -bottom-1 rounded bg-white px-0.5 text-[10px] leading-tight font-black text-amber-800 ring-1 ring-amber-300">{p.kind === 2 ? '½' : '¼'}</span>
    </span>
  )
}

const pieceLabel = (p: Piece, sk: Skin) => `1 ${KIND_WORD[p.kind]}${sk.one}`

export function ShareView({ sh, dnd, sk, cookie, locked, wrong, grade, meLabel = 'Bana kalanlar' }: { sh: Share; dnd: Dnd; sk: Skin; cookie?: boolean; locked?: boolean; wrong?: string | null; grade: number; meLabel?: string }) {
  const jit = useMemo(() => {
    const r = rng(17)
    return Array.from({ length: 64 }, () => Math.round((r() - 0.5) * 26))
  }, [])
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5 text-sm font-black">
        <span className="rounded-xl bg-amber-100 px-2.5 py-1 text-amber-900">Masada: {sh.loose.length}</span>
        {!cookie && <span className="rounded-xl bg-rose-100 px-2.5 py-1 text-rose-900">Bana: {sh.mine.length}</span>}
        {!cookie && !locked && sh.loose.length > 0 && <div className="ml-auto"><HandPicker value={sh.hand} max={4} onChange={sh.setHand} unit={sk.one} disabled={sh.round !== null} /></div>}
      </div>
      {!cookie && !locked && sh.round !== null && <p className="-mt-1 text-xs font-bold text-ink-soft">Tur bitene kadar herkese {sh.round} tane ver; sonra avucunu değiştirebilirsin.</p>}
      {cookie && !locked && sh.loose.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-2 py-1.5 ring-1 ring-line">
          <span className="text-xs font-black text-ink-soft">Kesme kartları:</span>
          {([2, 4] as const).map((k) => (
            <Drag key={k} dnd={dnd} item={`cut-${k}`} label={`Kes: ${k}’${k === 2 ? 'ye' : 'e'} böl`} className="flex min-h-14 items-center gap-1.5 rounded-2xl bg-white px-3 text-base font-black text-ink shadow-[0_3px_0_#cbd5e1] ring-2 ring-line">
              <span className="text-xl">✂️</span>{k}’{k === 2 ? 'ye' : 'e'} böl
            </Drag>
          ))}
        </div>
      )}
      {sh.loose.length > 0 && (
        <div className="rounded-2xl bg-[#fbf3df] p-2 ring-1 ring-amber-200">
          <p className="mb-1 px-1 text-[11px] font-black tracking-wide text-amber-800 uppercase">Masa · {sh.loose.length} {cookie ? 'parça' : sk.one}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1">
            {sh.loose.map((p, i) => {
              const drag = (
                <Drag
                  dnd={dnd}
                  item={`obj-${p.id}`}
                  label={sh.hand > 1 && !cookie ? `${Math.min(sh.hand, sh.loose.length)} ${sk.one}` : pieceLabel(p, sk)}
                  disabled={locked}
                  ghost={cookie ? <span className="rounded-2xl bg-white/85 p-1 ring-2 ring-sky-400"><PieceIcon p={p} sk={sk} big /></span> : <HandGhost emojis={[p, ...sh.loose.filter((x) => x !== p)].slice(0, Math.min(sh.hand, sh.loose.length)).map((x) => emojiOf(sk, x.id))} />}
                  className="grid size-12 place-items-center rounded-2xl"
                >
                  <PieceIcon p={p} sk={sk} big />
                </Drag>
              )
              return (
                <div key={p.id} className="grid h-14 place-items-center" style={{ transform: `rotate(${jit[i % 64]}deg)` }}>
                  {cookie ? <Drop dnd={dnd} id={`piece-${p.id}`} className={`rounded-2xl ${wrong === `piece-${p.id}` ? 'animate-shake ring-4 ring-amber-400' : ''}`}>{drag}</Drop> : drag}
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sh.plates.map((pl, i) => {
          const qs = pl.reduce((s, p) => s + 4 / p.kind, 0)
          const wholes = pl.filter((p) => p.kind === 1)
          const parts = pl.filter((p) => p.kind !== 1)
          return (
            <Drop key={i} dnd={dnd} id={`pay-${i}`} className={`flex min-h-32 flex-col items-center gap-1 rounded-2xl border-2 border-violet-300 bg-violet-50 p-2 ${wrong === `pay-${i}` ? 'animate-shake ring-4 ring-amber-400' : ''}`}>
              <p className="flex items-center gap-1 text-sm font-black text-violet-900"><span className="text-2xl leading-none">{PEOPLE[i].emoji}</span>{PEOPLE[i].name}</p>
              <div className="flex flex-wrap justify-center gap-0.5">
                {cookie && wholes.length > 0 ? (
                  <span className="rounded-lg bg-white px-1.5 py-0.5 text-sm font-black text-amber-900 ring-1 ring-amber-200">🍪 × {wholes.length}</span>
                ) : (
                  wholes.map((p) => <span key={p.id} className="text-[20px] leading-none animate-pop">{emojiOf(sk, p.id)}</span>)
                )}
                {parts.map((p) => <span key={p.id} className="animate-pop"><PieceIcon p={p} sk={sk} /></span>)}
              </div>
              <p className="mt-auto rounded-lg bg-white px-2 py-0.5 text-xs font-black text-violet-900 tabular-nums">{cookie ? amountText(qs, grade) : `${pl.length} ${sk.one}`}</p>
            </Drop>
          )
        })}
      </div>
      {!cookie && (
        <Drop dnd={dnd} id="me" className={`min-h-20 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-2 text-center ${wrong === 'me' ? 'animate-shake ring-4 ring-amber-400' : ''}`}>
          <p className="text-xs font-black tracking-wide text-rose-800 uppercase">🙋 {meLabel}: {sh.mine.length}</p>
          <p className="text-[11px] font-bold text-rose-700">arkadaşlarına eşit dağıtılamayanları buraya sürükle</p>
          <div className="mt-1 flex min-h-8 flex-wrap justify-center gap-1 text-[24px] leading-none">
            {sh.mine.map((p) => <span key={p.id} className="animate-pop">{emojiOf(sk, p.id)}</span>)}
          </div>
        </Drop>
      )}
    </div>
  )
}

/** Kesme kartı dokunarak da kullanılsın: elde kesme kartı varken bir parçaya dokunmak onu keser */
export function useShareDnd(handle: (item: string, target: string) => boolean | void) {
  const base = useDnd(handle)
  return { ...base, tap: (item: string) => (base.held?.startsWith('cut-') && item.startsWith('obj-') ? base.hit(`piece-${item.slice(4)}`) : base.tap(item)) }
}

export const SHARE_TOOLS = (sk: Skin) => ({
  obj: { icon: <span className="text-lg leading-none">{emojiOf(sk, 0)}</span>, name: 'Paylaştırma', text: `Masadaki bir ${sk.one} tut ve bir arkadaşın tabağına sürükle. Adil olmalı: önce az alana verilir, herkese yetmiyorsa kimseye verilmez.` } as ToolInfo,
  hand: { icon: <span className="text-base leading-none">✋</span>, name: 'Bir seferde al', text: 'Herkese birer mi, ikişer mi vereceksin? Tur başında sayıya dokun; tur bitene kadar değişmez.' } as ToolInfo,
  me: { icon: <span className="text-base leading-none">🙋</span>, name: 'Bana kalanlar', text: `Arkadaşlarına eşit dağıtılamayan ${sk.one} buraya sürüklenir.` } as ToolInfo,
  cut: { icon: <span className="text-base leading-none">✂️</span>, name: 'Kesme kartları', text: 'Kartı masadaki bir kurabiyenin üstüne bırak: 2’ye böl iki yarım, 4’e böl dört çeyrek yapar. Yarım bir parçayı 2’ye bölersen iki çeyrek olur.' } as ToolInfo,
})
