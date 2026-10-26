import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeftRight, Check, FlaskConical, Undo2 } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Nudge, Scene, StrategyPicker, useSolutions } from '../../games/kit2'
import { Plane, usePlane } from '../../interactive/Plane'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { numberToWords } from '../../lib/generators'
import { Choice, NextButton, Pad, Panel, TopBar, fmtN, parseQ, q, qAdd, qEq, qMul, qNum, qSub, useDragDrop, useLook, type Look, type Q } from '../islem-zinciri/kit'

/**
 * 31. Basamak Laboratuvarı
 *  Rakam kartları basamak tablosundaki yuvalara sürüklenir (ya da dokun-dokun ile taşınır).
 *  Kart yer değiştirince sayının değeri, her rakamın basamak değeri, onluk bloklar ve sayı doğrusundaki
 *  sıçrama canlı değişir. Görevler: kur (en büyük/en küçük), tüm sayıları bul, yer değiştir (önce tahmin),
 *  bir rakamı basamak basamak taşı (×10 / 10’da 1 ilişkisi), fark defteri (farklar 9’un katı) ve tahmin.
 */

// ───────────────────────── Basamaklar ─────────────────────────

const PLACE: Record<number, { name: string; short: string; color: string; soft: string }> = {
  4: { name: 'On binler', short: 'On binler', color: '#9333ea', soft: '#f3e8ff' },
  3: { name: 'Binler', short: 'Binler', color: '#db2777', soft: '#fce7f3' },
  2: { name: 'Yüzler', short: 'Yüzler', color: '#ea580c', soft: '#ffedd5' },
  1: { name: 'Onlar', short: 'Onlar', color: '#16a34a', soft: '#dcfce7' },
  0: { name: 'Birler', short: 'Birler', color: '#ca8a04', soft: '#fef9c3' },
  [-1]: { name: 'Onda birler', short: 'Onda b.', color: '#2563eb', soft: '#dbeafe' },
  [-2]: { name: 'Yüzde birler', short: 'Yüzde b.', color: '#0d9488', soft: '#ccfbf1' },
}
const pv = (e: number): Q => (e >= 0 ? q(10 ** e) : q(1, 10 ** -e))
const unitWord: Record<number, string> = { 4: 'on binlik', 3: 'binlik', 2: 'yüzlük', 1: 'onluk', 0: 'birlik', [-1]: 'onda birlik', [-2]: 'yüzde birlik' }

interface Card { id: number; d: number }
type Cells = (Card | null)[]

const valueOf = (places: number[], cells: Cells): Q => cells.reduce<Q>((s, c, i) => (c ? qAdd(s, qMul(q(c.d), pv(places[i]))) : s), q(0))
const fq = (v: Q) => fmtN(qNum(v), 4)
const leadingZero = (places: number[], cells: Cells) => places[0] >= 1 && cells[0]?.d === 0 && places.filter((e) => e >= 0).length > 1

// ───────────────────────── Görev verisi ─────────────────────────

interface Opt { t: string; ok: boolean; why?: string; mis?: string }
interface Ask { q: string; options: Opt[] }

interface Build { kind: 'build'; title: string; places: number[]; cards: number[]; goal: { value?: number } | { kind: 'max' | 'min' } }
interface Both { kind: 'both'; title: string; places: number[]; cards: number[]; need: number; ask?: Ask }
interface Swap { kind: 'swap'; title: string; places: number[]; start: number[]; pair?: [number, number]; predict?: Ask; after?: Ask }
interface Move { kind: 'move'; title: string; places: number[]; digit: number; path: number[]; ask: Ask }
interface Collect { kind: 'collect'; title: string; places: number[]; starts: number[][]; ask: Ask; follow?: Ask }
interface Predict { kind: 'predict'; title: string; places: number[]; start: number[]; answer: number; why?: Ask }
type Task = Build | Both | Swap | Move | Collect | Predict

const o = (t: string, ok = false, why?: string, mis?: string): Opt => ({ t, ok, why, mis })

function tasksFor(grade: Grade): Task[] {
  const OB = [1, 0]
  switch (grade) {
    case 1:
      return [
        { kind: 'build', title: 'Kartları yerleştir: 14 sayısını yap.', places: OB, cards: [4, 1], goal: { value: 14 } },
        { kind: 'swap', title: 'Kartların yerini değiştir. Ne olacak?', places: OB, start: [1, 2], predict: { q: '12’deki kartların yerini değiştirirsek sayı ne olur?', options: [o('Büyür', true), o('Küçülür', false, 'Onlar yuvasına hangi kart gelecek? 2 onluk mu, 1 onluk mu daha çok?'), o('Aynı kalır', false, 'Kartlar aynı ama yerleri farklı. 1 onluk ile 2 onluk aynı mı?', 'Aynı rakamlar her yerde aynı değerde sanıyor')] }, after: { q: '21’de kaç onluk var?', options: [o('2 onluk', true), o('1 onluk', false, 'Onlar yuvasında hangi kart duruyor? Çubuklara bak.'), o('21 onluk', false, 'Çubukları say. Her çubuk 10 küp.')] } },
        { kind: 'swap', title: '0 kartı nereye konursa ne olur?', places: OB, start: [1, 0], after: { q: 'Şimdi sayı kaç?', options: [o('1', true), o('10', false, 'Onlar yuvasında 0 var: hiç onluk yok. Kaç küp kaldı?'), o('0', false, 'Birler yuvasında 1 duruyor. Kaç küp görüyorsun?')] } },
        { kind: 'both', title: '1 ve 6 kartlarıyla hangi sayıları yapabilirsin? İkisini de bul.', places: OB, cards: [1, 6], need: 2, ask: { q: 'Hangisi daha büyük?', options: [o('61', true), o('16', false, '16’da kaç onluk, 61’de kaç onluk var?', 'Rakamların yerini değil, sırasını dikkate aldı'), o('İkisi eşit', false, 'Aynı kartlar ama 1 onluk ile 6 onluk aynı mı?', 'Aynı rakamlar her yerde aynı değerde sanıyor')] } },
        { kind: 'move', title: '1 kartını onlar yuvasına taşı. Değeri ne oldu?', places: OB, digit: 1, path: [1, 0], ask: { q: '1 kartı onlar yuvasına geçince sayı kaç oldu?', options: [o('10', true), o('1', false, 'Onlar yuvasındaki 1 kart, 1 çubuk demek. 1 çubukta kaç küp var?'), o('2', false, 'Kart taşındı, yeni kart eklenmedi. Çubuğa bak: kaç küp?')] } },
      ]
    case 2:
      return [
        { kind: 'build', title: '3 ve 7 kartlarıyla en büyük sayıyı yap.', places: OB, cards: [3, 7], goal: { kind: 'max' } },
        { kind: 'swap', title: '73’teki kartların yerini değiştir.', places: OB, start: [7, 3], predict: { q: 'Yer değiştirince sayı büyür mü, küçülür mü?', options: [o('Küçülür', true), o('Büyür', false, '7 kartı onlardan birlere geçince değeri ne olur?'), o('Aynı kalır', false, 'Aynı rakamlar ama 7 onluk ile 7 birlik aynı mı?', 'Aynı rakamlar her yerde aynı değerde sanıyor')] }, after: { q: '73 mü daha büyük, 37 mi? Neden?', options: [o('73, çünkü 7 onluğu var', true), o('37, çünkü 7 sonda', false, 'Sondaki 7 kaç değerinde? Çubuk mu, küp mü?', 'Sondaki rakamı en değerli sanıyor'), o('Eşitler, rakamlar aynı', false, '3 onluk 7 birlik ile 7 onluk 3 birlik aynı mı? Bloklara bak.', 'Aynı rakamlar her yerde aynı değerde sanıyor')] } },
        { kind: 'both', title: '2, 5 ve 0 kartlarından ikisini kullan. Kaç farklı iki basamaklı sayı yapabilirsin?', places: OB, cards: [2, 5, 0], need: 4, ask: { q: 'Bulduğun sayılardan en büyüğü hangisi?', options: [o('52', true), o('50', false, '50 ile 52’nin onlukları aynı. Birlere bak.'), o('25', false, '25’te kaç onluk var, 52’de kaç?')] } },
        { kind: 'move', title: '4 kartını onlar yuvasına taşı.', places: OB, digit: 4, path: [1, 0], ask: { q: '4 kartı onlara geçince değeri ne oldu?', options: [o('40 oldu, 4 onluk', true), o('4 kaldı', false, 'Onlar yuvasındaki 4 kart kaç çubuk demek? Kaç küp eder?', 'Rakamın değerinin yerine bağlı olduğunu görmedi'), o('44 oldu', false, 'Yeni bir 4 eklemedik, kartı taşıdık. Birlerde kaç küp kaldı?')] } },
        { kind: 'swap', title: '55’teki kartların yerini değiştir.', places: OB, start: [5, 5], after: { q: 'Kartlar yer değiştirdi ama sayı neden değişmedi?', options: [o('İki kart aynı rakam', true), o('Kartlar yer değiştirmez', false, 'Kartlar gerçekten yer değiştirdi. Peki yerlerine ne geldi?'), o('Birler önemli değil', false, 'Birler de sayının bir parçası. 55’te 5 birlik var.')] } },
      ]
    case 3:
      return [
        { kind: 'build', title: '6, 0 ve 3 kartlarıyla en küçük üç basamaklı sayıyı yap.', places: [2, 1, 0], cards: [6, 0, 3], goal: { kind: 'min' } },
        { kind: 'swap', title: '362’de 3 ile 2’nin yerini değiştir.', places: [2, 1, 0], start: [3, 6, 2], pair: [0, 2], predict: { q: 'Sayı ne kadar değişir: çok mu, az mı?', options: [o('Çok değişir, yüzler değişiyor', true), o('Az değişir, yalnız 2 kart', false, '3 kartı yüzlerden birlere geçince değeri kaç azalır?'), o('Değişmez', false, 'Yüzler yuvasına 2 gelecek. 3 yüzlük ile 2 yüzlük aynı mı?', 'Aynı rakamlar her yerde aynı değerde sanıyor')] }, after: { q: '3 kartının değeri ne oldu?', options: [o('300’den 3’e indi', true), o('Hep 3’tü, değişmedi', false, '362’deki 3 kaç yüzlük gösteriyordu?', 'Rakamın değerinin yerine bağlı olduğunu görmedi'), o('30 oldu', false, '3 kart hangi yuvaya geçti? Onlar mı, birler mi?')] } },
        { kind: 'move', title: '5 kartını basamak basamak sola taşı. Değeri nasıl değişiyor?', places: [2, 1, 0], digit: 5, path: [2, 1, 0], ask: { q: 'Bir rakam bir basamak sola geçince değeri ne olur?', options: [o('10 katına çıkar', true), o('10 artar', false, '5’ten 50’ye kaç arttı? 50’den 500’e kaç arttı? Hep aynı mı?', 'Basamak değerini toplamsal (her basamakta +10) düşündü'), o('2 katına çıkar', false, '5’in 2 katı kaç? 50 mi?')] } },
        { kind: 'collect', title: 'Fark defteri: Her sayının kartlarını değiştir, farkı kaydet.', places: OB, starts: [[4, 1], [7, 2], [9, 3], [6, 1]], ask: { q: 'Farklar hangi sayının çarpım tablosunda var?', options: [o('9’un', true), o('2’nin', false, '27 sayısı 2’nin çarpım tablosunda var mı?'), o('5’in', false, '27 ya da 54, 5’in çarpım tablosunda var mı?')] } },
        { kind: 'both', title: '1, 4 ve 7 kartlarıyla dört farklı üç basamaklı sayı yap.', places: [2, 1, 0], cards: [1, 4, 7], need: 4, ask: { q: 'Bu kartlarla yapılabilecek en büyük sayı hangisi?', options: [o('741', true), o('714', false, '714 ile 741’in yüzlükleri aynı. Onlara bak.'), o('147', false, 'En büyük kart hangi yuvada olmalı?', 'En büyük sayıyı yaparken en büyük rakamı birlere koydu')] } },
      ]
    case 4:
      return [
        { kind: 'build', title: '4, 0, 9, 2 ve 7 kartlarıyla en büyük sayıyı yap.', places: [4, 3, 2, 1, 0], cards: [4, 0, 9, 2, 7], goal: { kind: 'max' } },
        { kind: 'move', title: '7 kartını birlerden binlere doğru taşı.', places: [3, 2, 1, 0], digit: 7, path: [3, 2, 1, 0], ask: { q: 'Binler basamağındaki 7, birler basamağındaki 7’nin kaç katı?', options: [o('1000 katı', true), o('4 katı', false, '7’den 7000’e: her basamakta kaç katına çıktı? Üç kez üst üste…', 'Basamak sayısını kat sanıyor'), o('7000 katı', false, '7 × 7000 kaç eder? 7000 mi?')] } },
        { kind: 'collect', title: 'Fark defteri: Kartları değiştir, farkı kaydet. Bir örüntü var mı?', places: OB, starts: [[8, 2], [5, 3], [7, 1], [9, 4]], ask: { q: 'Farkların hepsinde ortak olan ne?', options: [o('Hepsi 9’un katı', true), o('Hepsi çift', false, '45 çift mi?'), o('Hepsi 50’den küçük', false, '54’e bak. Başka bir ortak özellik ara.')] }, follow: { q: '82 → 28 farkı 54. 8 − 2 = 6. Fark, rakamlar arasındaki farkın kaç katı?', options: [o('9 katı', true), o('6 katı', false, '6 × 6 kaç eder? 54 mü?'), o('10 katı', false, '6 × 10 = 60. 54 mü?')] } },
        { kind: 'predict', title: '73’ün kartları yer değiştirecek. Hesaplamadan fark kaç olur?', places: OB, start: [7, 3], answer: 36 },
        { kind: 'swap', title: '30 572’de 3 ile 2’nin yerini değiştir.', places: [4, 3, 2, 1, 0], start: [3, 0, 5, 7, 2], pair: [0, 4], after: { q: 'Bu fark da 9’un katı mı?', options: [o('Evet, 9999 = 9 × 1111', true), o('Hayır, çok büyük', false, '9999’u 9’a bölmeyi dene: 9 × 1111 = ?'), o('Yalnız iki basamaklı sayılarda olur', false, 'Bu sefer 3, on binlerden birlere geçti. Her basamakta 9’lar mı kaybetti?')] } },
      ]
    default:
      return [
        { kind: 'build', title: '0, 5 ve 2 kartlarıyla 0,52 sayısını yap.', places: [0, -1, -2], cards: [5, 0, 2], goal: { value: 0.52 } },
        { kind: 'move', title: '3 kartını birlerden sağa doğru taşı.', places: [0, -1, -2], digit: 3, path: [0, 1, 2], ask: { q: 'Bir rakam bir basamak sağa geçince değeri ne olur?', options: [o('10’da 1’ine iner', true), o('10 azalır', false, '3’ten 0,3’e kaç azaldı? 0,3’ten 0,03’e kaç? Hep 10 mu?', 'Basamak değerini toplamsal düşündü'), o('Değişmez, hep 3', false, '0,3 ile 3 aynı mı? Sayı doğrusuna bak.', 'Ondalık basamakların değerini görmedi')] } },
        { kind: 'swap', title: '4,7’de kartların yerini değiştir.', places: [0, -1], start: [4, 7], predict: { q: 'Fark ne kadar olur? (İpucu: 47 ile 74’ü düşün.)', options: [o('2,7', true), o('27', false, 'Bu sayılar 10’dan küçük. Fark 27 olabilir mi?'), o('3', false, '7,4 − 4,7: tam 3 mü? Onda birlere bak.')] } },
        { kind: 'collect', title: 'Fark defteri: Ondalık sayılarda da örüntü var mı?', places: [0, -1], starts: [[8, 1], [5, 2], [9, 3], [6, 4]], ask: { q: 'Farkların ortak özelliği ne?', options: [o('Hepsi 0,9’un katı', true), o('Hepsi tam sayı', false, '6,3 tam sayı mı?'), o('Hepsi 1’den büyük', false, '1,8 ve 2,7 de var. Daha derin bir ortak özellik ara: 0,9 × 7 = ?')] } },
        { kind: 'predict', title: '96’nın kartları yer değiştirecek. Hesaplamadan fark kaç olur?', places: [1, 0], start: [9, 6], answer: 27, why: { q: 'Bu farklar neden hep 9’un katı?', options: [o('Onlardan birlere geçen rakamın her birimi 10 yerine 1 sayılır: 9 kaybeder', true), o('Çünkü sayılar iki basamaklı', false, '30 572’yi düşün: orada da fark 9’un katı çıkar.'), o('Rastlantı', false, 'Kaç örnek denedin? Hepsinde oldu mu? Bir nedeni olmalı.', 'Örüntünün nedenini aramadı')] } },
      ]
  }
}

// ───────────────────────── Görsel parçalar ─────────────────────────

function Blocks({ e, d }: { e: number; d: number }) {
  if (!d) return <div className="h-10" />
  if (e === 2)
    return (
      <div className="flex flex-wrap justify-center gap-0.5" aria-hidden>
        {Array.from({ length: d }, (_, i) => <span key={i} className="size-7 rounded-[3px] bg-orange-400 bg-[linear-gradient(#0000_90%,#fff6_90%),linear-gradient(90deg,#0000_90%,#fff6_90%)] bg-[length:10%_10%] ring-1 ring-orange-600" />)}
      </div>
    )
  if (e === 1)
    return (
      <div className="flex flex-wrap justify-center gap-0.5" aria-hidden>
        {Array.from({ length: d }, (_, i) => <span key={i} className="h-14 w-2.5 rounded-[2px] bg-green-500 bg-[linear-gradient(#0000_88%,#fff8_88%)] bg-[length:100%_10%] ring-1 ring-green-700" />)}
      </div>
    )
  if (e === 0)
    return (
      <div className="mx-auto grid w-fit grid-cols-5 gap-0.5" aria-hidden>
        {Array.from({ length: d }, (_, i) => <span key={i} className="size-3 rounded-[2px] bg-yellow-400 ring-1 ring-yellow-600" />)}
      </div>
    )
  return null
}

function CardFace({ d, look, e, ghost }: { d: number; look: Look; e?: number; ghost?: boolean }) {
  const c = e !== undefined ? PLACE[e].color : '#475569'
  return (
    <span
      className={`grid ${look.big ? 'h-20 w-16 text-5xl' : 'h-16 w-14 text-4xl'} place-items-center rounded-2xl bg-white font-black tabular-nums select-none ${ghost ? 'opacity-40' : ''}`}
      style={{ color: c, boxShadow: `0 4px 0 ${c}55, inset 0 0 0 3px ${c}` }}
    >
      {d}
    </span>
  )
}

function DragCard({ card, look, e, selected, onTap, onDrop, onOver, locked }: { card: Card; look: Look; e?: number; selected: boolean; onTap: () => void; onDrop: (t: string | null) => void; onOver: (t: string | null) => void; locked?: boolean }) {
  const dd = useDragDrop({ onDrop, onTap, onOver, disabled: locked })
  return (
    <button type="button" {...dd.bind()} onClick={dd.onClick} style={dd.style} data-handle disabled={locked} className={`rounded-2xl transition ${locked ? '' : 'cursor-grab'} ${selected ? 'ring-4 ring-amber-400 ring-offset-2 -translate-y-1' : ''}`} aria-label={`${card.d} kartı`} aria-pressed={selected}>
      <CardFace d={card.d} look={look} e={e} />
    </button>
  )
}

/** Sayıyı basamak renkleriyle yazar (boş ara basamaklar gri 0) */
function ColorNumber({ places, cells, size = 'lg' }: { places: number[]; cells: Cells; size?: 'lg' | 'md' }) {
  const first = cells.findIndex((c, i) => c && (c.d !== 0 || places[i] <= 0))
  const onesIdx = places.indexOf(0)
  const lastFilled = cells.reduce((m, c, i) => (c ? i : m), -1)
  const parts: ReactNode[] = []
  const start = first === -1 ? (onesIdx === -1 ? 0 : onesIdx) : Math.min(first, onesIdx === -1 ? first : onesIdx)
  const end = Math.max(lastFilled, onesIdx === -1 ? lastFilled : onesIdx)
  for (let i = start; i <= end; i++) {
    const e = places[i]
    const c = cells[i]
    if (e === -1) parts.push(<span key="comma" className="text-ink-soft">,</span>)
    parts.push(
      <span key={i} style={{ color: c ? PLACE[e].color : '#94a3b8' }}>{c ? c.d : 0}</span>,
    )
    if (e === 3 && i < end) parts.push(<span key={`sp${i}`} className="inline-block w-2" />)
  }
  if (onesIdx === -1 && places[0] < 0) parts.unshift(<span key="z">0,</span>)
  if (!cells.some(Boolean)) return <span className={`font-black text-slate-300 ${size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-3xl'}`}>?</span>
  return <span className={`font-black tabular-nums ${size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-3xl'}`}>{parts.length ? parts : '–'}</span>
}

function JumpLine({ a, b }: { a: Q; b: Q }) {
  const lo = Math.min(qNum(a), qNum(b))
  const hi = Math.max(qNum(a), qNum(b))
  const span = Math.max(hi - lo, 1)
  const pad = span * 0.25
  const view = { xMin: lo - pad, xMax: hi + pad, yMin: -1, yMax: 1 }
  return (
    <Plane key={`${lo}-${hi}`} initial={view} mode="x" minSpan={0.05} maxSpan={20000} label="Sayı doğrusunda önceki ve yeni sayı">
      <Jump a={a} b={b} />
    </Plane>
  )
}
function Jump({ a, b }: { a: Q; b: Q }) {
  const P = usePlane()
  const x1 = P.sx(qNum(a)), x2 = P.sx(qNum(b)), y = P.sy(0)
  const mid = (x1 + x2) / 2
  const h = Math.min(60, Math.abs(x2 - x1) / 2 + 14)
  const d = qSub(b, a)
  return (
    <g>
      <path d={`M ${x1} ${y - 8} Q ${mid} ${y - 8 - h * 1.6} ${x2} ${y - 8}`} fill="none" stroke="#d6457a" strokeWidth={3} strokeDasharray="6 5" markerEnd="" />
      <text x={mid} y={y - 12 - h * 0.85} textAnchor="middle" fontSize={15} fontWeight={900} fill="#d6457a">{d.n >= 0 ? '+' : '−'}{fmtN(Math.abs(qNum(d)), 4)}</text>
      <circle cx={x1} cy={y} r={9} fill="#94a3b8" stroke="#fff" strokeWidth={3} />
      <circle cx={x2} cy={y} r={10} fill="#d6457a" stroke="#fff" strokeWidth={3} />
    </g>
  )
}

/** Basamak tablosu: yuvalar + kartlar + değerler (+ bloklar) */
function Mat({ look, places, cells, sel, over, onCellTap, onCardTap, onCardDrop, onOver, highlight, locked, blocks }: {
  look: Look; places: number[]; cells: Cells; sel: string | null; over: string | null; highlight?: number | null
  onCellTap: (i: number) => void; onCardTap: (loc: string) => void; onCardDrop: (loc: string, t: string | null) => void; onOver: (t: string | null) => void; locked?: boolean; blocks: boolean
}) {
  return (
    <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${places.length}, minmax(0, 1fr))` }}>
      {places.map((e, i) => {
        const c = cells[i]
        const P = PLACE[e]
        const hot = over === `cell-${i}` || highlight === i
        return (
          <div key={e} className={`flex min-w-0 flex-col items-center rounded-2xl p-1.5 pb-2 transition sm:p-2 ${hot ? 'ring-4 ring-amber-400' : ''}`} style={{ background: look.dark ? '#1e293b' : P.soft }}>
            {e === -1 && <span className="sr-only">virgül</span>}
            <span className="w-full truncate text-center text-[11px] font-black tracking-wide uppercase sm:text-xs" style={{ color: P.color }}>{places.length > 4 ? P.short : P.name}</span>
            <div
              data-drop={`cell-${i}`}
              onClick={() => !c && onCellTap(i)}
              role={c ? undefined : 'button'}
              aria-label={c ? undefined : `${P.name} yuvası`}
              className={`mt-1 grid ${look.big ? 'min-h-24' : 'min-h-20'} w-full place-items-center rounded-xl border-[3px] border-dashed transition`}
              style={{ borderColor: c ? 'transparent' : `${P.color}66` }}
            >
              {c ? (
                <DragCard card={c} look={look} e={e} selected={sel === `cell-${i}`} locked={locked} onTap={() => onCardTap(`cell-${i}`)} onDrop={(t) => onCardDrop(`cell-${i}`, t)} onOver={onOver} />
              ) : (
                <span className="text-sm font-black" style={{ color: `${P.color}aa` }}>{sel ? 'buraya' : ''}</span>
              )}
            </div>
            <span className="mt-1.5 min-h-5 text-center text-[13px] leading-tight font-extrabold tabular-nums" style={{ color: P.color }}>
              {c ? <>{c.d} {unitWord[e]}<br /><b className="text-base">= {fmtN(qNum(qMul(q(c.d), pv(e))), 4)}</b></> : ''}
            </span>
            {blocks && e >= 0 && e <= 2 && <div className="mt-1 min-h-10 w-full"><Blocks e={e} d={c?.d ?? 0} /></div>}
          </div>
        )
      })}
    </div>
  )
}

// ───────────────────────── Ortak durum ─────────────────────────

let uid = 1
const mk = (d: number): Card => ({ id: uid++, d })

function useMat(places: number[], start: (number | null)[], tray: number[]) {
  const [cells, setCells] = useState<Cells>(() => places.map((_, i) => (start[i] === null || start[i] === undefined ? null : mk(start[i]!))))
  const [trayCards, setTray] = useState<Card[]>(() => tray.map(mk))
  const [sel, setSel] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  return { cells, setCells, trayCards, setTray, sel, setSel, over, setOver }
}
type MatState = ReturnType<typeof useMat>

/** loc: "cell-i" | "tray-j" → hedef "cell-k" | "tray" ; tablo dışında dokunuşla taşıma */
function relocate(m: MatState, from: string, to: string | null, allowTray: boolean): { swapped?: [number, number]; moved?: boolean } {
  if (!to || from === to) return {}
  const cells = m.cells.slice()
  const tray = m.trayCards.slice()
  const take = (loc: string): Card | null => {
    if (loc.startsWith('cell-')) return cells[+loc.slice(5)]
    return tray[+loc.slice(5)] ?? null
  }
  const card = take(from)
  if (!card) return {}
  if (to.startsWith('cell-')) {
    const j = +to.slice(5)
    const occ = cells[j]
    if (from.startsWith('cell-')) {
      const i = +from.slice(5)
      cells[i] = occ
      cells[j] = card
      m.setCells(cells)
      return occ ? { swapped: [i, j] } : { moved: true }
    }
    if (!allowTray) return {}
    const ti = +from.slice(5)
    tray.splice(ti, 1)
    if (occ) tray.push(occ)
    cells[j] = card
    m.setCells(cells)
    m.setTray(tray)
    return { moved: true }
  }
  if ((to === 'tray' || to.startsWith('tray')) && from.startsWith('cell-') && allowTray) {
    cells[+from.slice(5)] = null
    tray.push(card)
    m.setCells(cells)
    m.setTray(tray)
    return { moved: true }
  }
  return {}
}

type Say = { q: string; tone?: 'ok'; mis?: string; k: number } | null
interface Res { first: boolean; found: number }

function useSay() {
  const [say, setSay] = useState<Say>(null)
  const nudge = (q: string, tone?: 'ok', mis?: string) => setSay((s) => ({ q, tone, mis, k: (s?.k ?? 0) + 1 }))
  return { say, setSay, nudge }
}

/** Seçenekli soru; doğru seçilince onOk */
function AskBox({ look, ask, onOk, onMiss }: { look: Look; ask: Ask; onOk: () => void; onMiss: (o: Opt) => void }) {
  const [bad, setBad] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const order = useMemo(() => [...ask.options].sort(() => Math.random() - 0.5), [ask])
  return (
    <div className="mt-2">
      <p className={`mb-2 text-[15px] font-black sm:text-base ${look.strong}`}><MathText text={ask.q} /></p>
      <div className="grid gap-2">
        {order.map((op) => (
          <Choice key={op.t} look={look} text={op.t} state={done && op.ok ? 'right' : bad.includes(op.t) ? 'wrong' : 'idle'} disabled={done} onClick={() => {
            if (op.ok) {
              setDone(true)
              onOk()
            } else {
              setBad((b) => [...b, op.t])
              onMiss(op)
            }
          }} />
        ))}
      </div>
    </div>
  )
}

// ───────────────────────── Görev bileşeni ─────────────────────────

function TaskView({ t, grade, look, onDone, sols, last }: { t: Task; grade: Grade; look: Look; onDone: (r: Res) => void; sols: ReturnType<typeof useSolutions>; last: boolean }) {
  const track = useTracker()
  const { say, setSay, nudge } = useSay()
  const misses = useRef(0)
  const busy = useRef(false)
  const blocks = grade <= 3
  const initCells: (number | null)[] =
    t.kind === 'swap' || t.kind === 'predict' ? t.start : t.kind === 'collect' ? t.starts[0] : t.kind === 'move' ? t.places.map((_, i) => (i === t.path[0] ? t.digit : null)) : t.places.map(() => null)
  const initTray = t.kind === 'build' || t.kind === 'both' ? t.cards : []
  const m = useMat(t.places, initCells, initTray)
  const value = valueOf(t.places, m.cells)
  const allTray = t.kind === 'build' || t.kind === 'both'
  const [phase, setPhase] = useState<'predict' | 'act' | 'ask' | 'follow' | 'why' | 'done'>(() => (t.kind === 'swap' && t.predict ? 'predict' : t.kind === 'predict' ? 'predict' : 'act'))
  const [before, setBefore] = useState<Q | null>(null)
  const [log, setLog] = useState<{ a: Q; b: Q }[]>([])
  const [ci, setCi] = useState(0)
  const [step, setStep] = useState(0)
  const [moves, setMoves] = useState<{ from: Q; to: Q }[]>([])
  const [found, setFound] = useState<string[]>([])
  const [guess, setGuess] = useState('')
  const filled = m.cells.every(Boolean)

  const miss = (q: string, mis?: string) => {
    misses.current++
    track.attempt(false)
    sfx.bad()
    nudge(q, undefined, mis)
  }
  const hit = (q?: string) => {
    track.attempt(true)
    sfx.ok()
    if (q) nudge(q, 'ok')
    else setSay(null)
  }
  const finish = () => {
    track.item(misses.current === 0)
    setPhase('done')
  }

  // Bir kart taşındığında görev türüne göre tepki
  const afterMove = (r: { swapped?: [number, number]; moved?: boolean }, cellsBefore: Cells) => {
    const vBefore = valueOf(t.places, cellsBefore)
    if (t.kind === 'swap' && phase === 'act' && r.swapped) {
      if (t.pair && !(r.swapped.includes(t.pair[0]) && r.swapped.includes(t.pair[1]))) {
        m.setCells(cellsBefore)
        return nudge(`Bu görevde ${cellsBefore[t.pair[0]]?.d} ile ${cellsBefore[t.pair[1]]?.d} kartlarının yerini değiştir.`)
      }
      setBefore(vBefore)
      sfx.ok()
      setSay(null)
      setPhase(t.after ? 'ask' : 'done')
      if (!t.after) finish()
      return
    }
    if (t.kind === 'collect' && phase === 'act' && r.swapped) {
      busy.current = true
      const after = valueOf(t.places, cellsAfterSwap(cellsBefore, r.swapped))
      setLog((l) => [...l, { a: vBefore, b: after }])
      sfx.ok()
      const nx = ci + 1
      if (nx < t.starts.length) {
        setTimeout(() => {
          setCi(nx)
          m.setCells(t.places.map((_, i) => mk(t.starts[nx][i])))
          busy.current = false
        }, 900)
      } else setTimeout(() => setPhase('ask'), 600)
      return
    }
    if (t.kind === 'predict' && phase === 'act' && r.swapped) {
      setBefore(vBefore)
      const after = valueOf(t.places, cellsAfterSwap(cellsBefore, r.swapped))
      const diff = qSub(vBefore, after)
      const g = parseQ(guess)
      const right = !!g && qEq(g, q(Math.abs(diff.n), diff.d))
      if (!right) track.attempt(false)
      if (right) hit(`Tahminin tam isabet: fark ${fq(q(Math.abs(diff.n), diff.d))}!`)
      else nudge(`Fark ${fq(q(Math.abs(diff.n), diff.d))} çıktı. ${t.answer % 9 === 0 ? `Rakamlar arasındaki fark ${Math.abs((t.start[0] ?? 0) - (t.start[1] ?? 0))}. 9 × ${Math.abs((t.start[0] ?? 0) - (t.start[1] ?? 0))} kaç eder?` : ''}`)
      if (t.why) setPhase('why')
      else finish()
      return
    }
  }
  const cellsAfterSwap = (c: Cells, [i, j]: [number, number]) => {
    const a = c.slice()
    ;[a[i], a[j]] = [a[j], a[i]]
    return a
  }

  const doMove = (from: string, to: string | null) => {
    m.setSel(null)
    if (busy.current) return
    if (phase === 'predict' || phase === 'done' || phase === 'ask' || phase === 'follow' || phase === 'why') {
      if (phase === 'predict' && to) nudge('Önce tahminini seç, sonra kartları değiştir.')
      return
    }
    if (t.kind === 'move') {
      if (!to?.startsWith('cell-')) return
      const j = +to.slice(5)
      const want = t.path[step + 1]
      if (j !== want) return nudge(`Kartı parlayan yuvaya taşı: ${PLACE[t.places[want]].name}.`)
      const prev = value
      const cells = m.cells.slice()
      const i = +from.slice(5)
      cells[j] = cells[i]
      cells[i] = null
      m.setCells(cells)
      const now = valueOf(t.places, cells)
      setMoves((mv) => [...mv, { from: prev, to: now }])
      sfx.ok()
      if (step + 2 >= t.path.length) setPhase('ask')
      setStep(step + 1)
      return
    }
    const snapshot = m.cells
    const r = relocate(m, from, to, allTray)
    if (r.swapped || r.moved) afterMove(r, snapshot)
  }
  const tapCard = (loc: string) => {
    if (m.sel && m.sel !== loc) return doMove(m.sel, loc)
    m.setSel(m.sel === loc ? null : loc)
  }
  const tapCell = (i: number) => {
    if (t.kind === 'move' && phase === 'act') {
      const curIdx = t.path[step]
      return doMove(`cell-${curIdx}`, `cell-${i}`)
    }
    if (m.sel) doMove(m.sel, `cell-${i}`)
  }

  // ── kontrol: build / both
  const checkBuild = () => {
    if (t.kind !== 'build' && t.kind !== 'both') return
    if (leadingZero(t.places, m.cells)) return miss(`${m.cells.map((c) => c?.d ?? '').join('')} diye yazınca baştaki 0 bir değer katıyor mu? Bu sayı aslında kaç basamaklı?`, 'Sayının başına 0 yazarak basamak sayısını korunmuş sandı')
    if (t.kind === 'build') {
      const digits = t.cards.slice()
      let want: Q
      if ('value' in t.goal && t.goal.value !== undefined) want = parseQ(String(t.goal.value).replace('.', ','))!
      else {
        const kind = (t.goal as { kind: 'max' | 'min' }).kind
        const sorted = digits.sort((a, b) => (kind === 'max' ? b - a : a - b))
        if (kind === 'min' && sorted[0] === 0) {
          const k = sorted.findIndex((d) => d !== 0)
          ;[sorted[0], sorted[k]] = [sorted[k], sorted[0]]
        }
        want = valueOf(t.places, sorted.map(mk))
      }
      if (qEq(value, want)) {
        hit(`Evet! ${fq(value)}${grade <= 3 ? ` (${numberToWords(qNum(value))})` : ''}.`)
        finish()
      } else {
        const kind = 'kind' in t.goal ? t.goal.kind : null
        miss(
          kind === 'max'
            ? 'En büyük sayı için en büyük rakam hangi yuvada olmalı: en solda mı, en sağda mı?'
            : kind === 'min'
              ? 'En küçük sayı için en solda hangi kart durmalı? 0 başa yazılabilir mi?'
              : `Senin sayın ${fq(value)}. Her yuvanın değerine bak: hangi kart nereye gitmeli?`,
          kind === 'max' ? 'En büyük sayıyı kurarken basamak değerini dikkate almadı' : undefined,
        )
      }
      return
    }
    // both
    const key = fq(value)
    if (found.includes(key)) return nudge(`${key} sayısını zaten buldun. Kartları başka bir biçimde diz.`)
    hit()
    sols.add(`${t.title}:${key}`, key)
    const nf = [...found, key]
    setFound(nf)
    if (nf.length >= t.need) setPhase(t.ask ? 'ask' : 'done')
    else nudge(`${key} kaydedildi! ${t.need - nf.length} sayı daha bulabilir misin?`, 'ok')
    if (nf.length >= t.need && !t.ask) finish()
    // kartları tepsiye geri al
    m.setTray([...m.trayCards, ...(m.cells.filter(Boolean) as Card[])])
    m.setCells(t.places.map(() => null))
  }

  const swapNow = () => {
    if (busy.current) return
    // dokunmatik kısa yol: istenen çifti / ilk ikiyi değiştir
    const pair = t.kind === 'swap' && t.pair ? t.pair : ([0, t.places.length - 1] as [number, number])
    const snapshot = m.cells
    const cells = cellsAfterSwap(snapshot, pair)
    m.setCells(cells)
    afterMove({ swapped: pair }, snapshot)
  }

  // ── panel içeriği
  let panel: ReactNode = null
  const ask: Ask | undefined =
    phase === 'predict' && t.kind === 'swap' ? t.predict : phase === 'ask' && 'ask' in t ? t.ask : phase === 'ask' && t.kind === 'swap' ? t.after : phase === 'follow' && t.kind === 'collect' ? t.follow : phase === 'why' && t.kind === 'predict' ? t.why : undefined
  const onAskOk = () => {
    hit()
    if (phase === 'predict') return setPhase('act')
    if (phase === 'ask' && t.kind === 'collect' && t.follow) return setPhase('follow')
    finish()
  }
  if (ask) panel = <AskBox key={phase + ask.q} look={look} ask={ask} onOk={onAskOk} onMiss={(op) => (phase === 'predict' ? (track.attempt(false), misses.current++, nudge(op.why ?? 'Hadi deneyip görelim!', undefined, op.mis), setPhase('act')) : miss(op.why ?? 'Bir daha bak.', op.mis))} />
  else if (phase === 'predict' && t.kind === 'predict')
    panel = (
      <div>
        <p className={`mb-2 text-[15px] font-bold ${look.muted}`}>Tahminini yaz, sonra kartları değiştirip kontrol et.</p>
        <div className={`mb-2 grid min-h-12 place-items-center rounded-xl text-3xl font-black tabular-nums ${look.dark ? 'bg-slate-900' : 'bg-white ring-1 ring-line'}`}>{guess || <span className={look.muted}>?</span>}</div>
        <Pad look={look} value={guess} onChange={setGuess} allow={{ dec: grade >= 5 }} submitLabel="Tahminim bu" onSubmit={() => { setPhase('act'); nudge('Şimdi kartların yerini değiştir ve tahminini kontrol et.', 'ok') }} />
      </div>
    )
  else if (phase === 'act') {
    if (t.kind === 'build' || t.kind === 'both')
      panel = (
        <div className="grid gap-2">
          <p className={`text-[15px] font-bold ${look.muted}`}>Kartları yuvalara sürükle ya da önce karta, sonra yuvaya dokun.</p>
          <button type="button" className="btn-primary min-h-14 text-lg" disabled={!filled} onClick={checkBuild}><Check size={20} />{t.kind === 'both' ? 'Bu sayıyı kaydet' : 'Kontrol et'}</button>
          {t.kind === 'both' && <p className={`text-sm font-black ${look.strong}`}>Bulunan: {found.length} / {t.need} {found.map((f) => <span key={f} className="chip ml-1 bg-emerald-50 px-2.5 py-1 text-sm text-emerald-800">{f}</span>)}</p>}
        </div>
      )
    else if (t.kind === 'move') panel = <p className={`text-[15px] font-bold ${look.muted}`}>Kartı parlayan yuvaya sürükle ya da yuvaya dokun. Değer nasıl değişiyor?</p>
    else
      panel = (
        <div className="grid gap-2">
          <p className={`text-[15px] font-bold ${look.muted}`}>{t.kind === 'swap' && t.pair ? 'İki kartı yer değiştir: birini diğerinin üstüne sürükle ya da sırayla ikisine dokun.' : 'Bir kartı diğerinin üstüne sürükle ya da sırayla iki karta dokun.'}</p>
          <button type="button" className={`btn-ghost min-h-12 ${look.dark ? '!bg-slate-700 !text-white !ring-slate-500' : ''}`} onClick={swapNow}><ArrowLeftRight size={18} />Yer değiştir</button>
        </div>
      )
  } else if (phase === 'done')
    panel = (
      <>
        {(t.kind === 'collect' || t.kind === 'predict') && <StrategyPicker question="Farkı nasıl buldun / tahmin ettin?" options={['Basamak değerlerine baktım', '9’un katlarını kullandım', 'Çıkarma yaptım', 'Sayı doğrusuna baktım']} onPick={() => {}} />}
        <NextButton last={last} onClick={() => onDone({ first: misses.current === 0, found: found.length })} />
      </>
    )

  const highlight = t.kind === 'move' && phase === 'act' ? t.path[step + 1] : null
  const showJump = grade >= 2 && before && (t.kind === 'swap' || t.kind === 'predict') && !qEq(before, value)
  const showMoveLine = t.kind === 'move' && moves.length > 0

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Scene grade={grade}>
        <div className="mb-3 flex flex-col items-center">
          <ColorNumber places={t.places} cells={m.cells} />
          {grade <= 3 && m.cells.some(Boolean) && !leadingZero(t.places, m.cells) && <span className={`mt-1 text-base font-extrabold ${look.muted}`}>{numberToWords(qNum(value))}</span>}
          {before && (
            <span className={`mt-2 chip px-3 py-1.5 text-base ${look.dark ? 'bg-slate-800 text-slate-100 ring-1 ring-slate-600' : 'bg-white text-ink ring-1 ring-line'}`}>
              Önce <b>{fq(before)}</b> → Şimdi <b>{fq(value)}</b>{grade >= 2 && <> · Fark <b className="text-brand">{fq(q(Math.abs(qSub(before, value).n), qSub(before, value).d))}</b></>}
            </span>
          )}
        </div>
        <Mat look={look} places={t.places} cells={m.cells} sel={m.sel} over={m.over} highlight={highlight} blocks={blocks}
          onCellTap={tapCell} onCardTap={tapCard} onCardDrop={doMove} onOver={m.setOver} locked={phase === 'done' || (t.kind === 'collect' && phase !== 'act')} />
        {allTray && (
          <div data-drop="tray" className={`mt-3 flex min-h-24 flex-wrap items-center justify-center gap-2 rounded-2xl p-3 transition ${m.over === 'tray' ? 'ring-4 ring-amber-400' : ''} ${look.dark ? 'bg-slate-900/50 ring-1 ring-slate-700' : 'bg-white/70 ring-1 ring-line'}`}>
            {m.trayCards.length === 0 && <span className={`text-sm font-black ${look.muted}`}>Kart kutusu boş</span>}
            {m.trayCards.map((c, j) => (
              <DragCard key={c.id} card={c} look={look} selected={m.sel === `tray-${j}`} onTap={() => tapCard(`tray-${j}`)} onDrop={(tg) => doMove(`tray-${j}`, tg)} onOver={m.setOver} />
            ))}
          </div>
        )}
        {showMoveLine && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {moves.map((mv, k) => {
              const up = qNum(mv.to) > qNum(mv.from)
              return <span key={k} className={`chip px-3 py-1.5 text-base animate-pop ${look.dark ? 'bg-slate-800 text-cyan-200' : 'bg-white text-ink ring-1 ring-line'}`}>{fq(mv.from)} → <b>{fq(mv.to)}</b> <span className="text-brand">({up ? '×10' : '÷10'})</span></span>
            })}
          </div>
        )}
        {showJump && before && (
          <div className="mt-3">
            <JumpLine a={before} b={value} />
          </div>
        )}
        {t.kind === 'collect' && log.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-line">
            <table className={`w-full text-center text-lg font-black tabular-nums ${look.dark ? 'bg-slate-900/60 text-slate-100' : 'bg-white text-ink'}`}>
              <thead><tr className={`text-xs tracking-wide uppercase ${look.dark ? 'bg-slate-800 text-slate-300' : 'bg-violet-50 text-violet-900'}`}><th className="py-2">Sayı</th><th>Yer değişince</th><th>Fark</th></tr></thead>
              <tbody>
                {log.map((r, k) => (
                  <tr key={k} className={`border-t animate-fade-up ${look.dark ? 'border-slate-700' : 'border-line'}`}>
                    <td className="py-2">{fq(r.a)}</td><td>{fq(r.b)}</td><td className="text-brand">{fq(q(Math.abs(qSub(r.a, r.b).n), qSub(r.a, r.b).d))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Scene>
      <div className="space-y-3 lg:sticky lg:top-20">
        <Panel look={look} title={t.kind === 'collect' ? `Fark defteri: ${log.length} / ${t.starts.length}` : 'Laboratuvar notu'} icon={<FlaskConical size={20} className="mt-0.5 shrink-0 text-violet-500" />}>
          {panel}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {t.kind === 'both' && phase !== 'act' && found.length > 0 && <p className={`mt-3 text-sm font-black ${look.strong}`}>Bulduğun sayılar: {found.map((f) => <span key={f} className="chip ml-1 bg-emerald-50 px-2.5 py-1 text-sm text-emerald-800">{f}</span>)}</p>}
          {(t.kind === 'build' || t.kind === 'both') && phase === 'act' && m.cells.some(Boolean) && (
            <button type="button" className={`btn-ghost mt-2 w-full ${look.dark ? '!bg-slate-700 !text-white !ring-slate-500' : ''}`} onClick={() => { m.setTray([...m.trayCards, ...(m.cells.filter(Boolean) as Card[])]); m.setCells(t.places.map(() => null)); m.setSel(null) }}><Undo2 size={18} />Kartları geri al</button>
          )}
        </Panel>
      </div>
    </div>
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function BasamakLaboratuvari({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [i, setI] = useState(0)
  const sols = useSolutions()
  const firsts = useRef(0)
  const t = tasks[i]
  const done = (r: Res) => {
    if (r.first) firsts.current++
    if (i + 1 < tasks.length) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const stars = (firsts.current >= tasks.length - 1 ? 3 : firsts.current >= 2 ? 2 : 1) as 1 | 2 | 3
    onFinish({
      summary: `${tasks.length} laboratuvar deneyini tamamladın.`,
      insight:
        grade <= 2
          ? 'Bir rakamın değeri bulunduğu yere bağlıdır: onlar yuvasındaki 4, 4 onluk yani 40 eder.'
          : grade === 3
            ? 'Bir rakam bir basamak sola geçince değeri 10 katına çıkar; iki basamaklı bir sayının rakamları yer değişince fark hep 9’un katıdır.'
            : grade === 4
              ? 'Her basamak sağındakinin 10 katıdır. Rakamlar yer değişince fark 9’un katı olur: 82 − 28 = 9 × (8 − 2).'
              : 'Bir rakam sağa geçince değeri 10’da 1’ine iner. Onlardan birlere geçen her rakam 10 yerine 1 sayılır; bu yüzden farklar 9’un katıdır.',
      stars,
    })
  }
  const EMO: Record<Task['kind'], string> = { build: '🧩', both: '🔍', swap: '🔄', move: '➡️', collect: '📒', predict: '🔮' }
  return (
    <div>
      <TopBar look={look} step={i} total={tasks.length} title={t.title} emoji={EMO[t.kind]} />
      <TaskView key={i} t={t} grade={grade} look={look} onDone={done} sols={sols} last={i === tasks.length - 1} />
    </div>
  )
}
