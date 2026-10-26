import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'
import { CheckCircle2, Ruler, Rows3, Grid3x3, PieChart, X } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { Scene, SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { MathText } from '../../components/MathText'
import { DragPoint, Plane, usePlane } from '../../interactive/Plane'
import { useTracker } from '../../lib/trackerContext'
import { Card, CheckButton, Choices, GridButtons, Header, NextButton, Nudge, PaintGrid, Prompt, Split, countOn, emptyCells, fmt, gcd, near, shuffle } from '../yuzde-boyama/ortak'

/**
 * 45. Kesir Yanılgıları (4–7)
 * Bir karakter kesirlerle ilgili bir iddiada bulunur (çoğu yaygın bir yanılgı). Öğrenci:
 *   1) ilk tepkisini verir (katılıyorum / katılmıyorum / emin değilim),
 *   2) bir modelle KANIT kurar: kesir şeritleri, sayı doğrusu, 100’lük ızgara ya da iki farklı bütün,
 *   3) karar verir (doğru / yanlış / sonuç doğru ama gerekçe yanlış) ve
 *   4) en iyi açıklamayı seçer.
 * Aynı iddia farklı modellerle kanıtlanırsa her model ayrı bir çözüm yolu sayılır.
 */

type Model = 'strips' | 'line' | 'grid' | 'wholes'
type Verdict = 'true' | 'false' | 'reason'
type Claim = {
  id: string
  who: string
  emoji: string
  text: string
  truth: Verdict
  models: Model[]
  /** Kanıt için kurulması gereken değer kümeleri (biri yeterli) */
  need: number[][]
  dens: number[]
  range?: [number, number]
  dec?: boolean
  reasons: { text: string; ok: boolean }[]
  mis: string
  hint: string
}

const C: Record<string, Claim> = {
  unit: { id: 'unit', who: 'Can', emoji: '👦', text: '[[1/8]] > [[1/4]], çünkü 8 > 4.', truth: 'false', models: ['strips', 'line'], need: [[1 / 8, 1 / 4]], dens: [2, 4, 8], mis: 'Birim kesirlerde paydası büyük olanı büyük sandı (1/8 > 1/4)', hint: 'Bir bütünü 8 parçaya bölmek mi, 4 parçaya bölmek mi daha küçük parçalar verir?', reasons: [
    { text: 'Bütün 8 eş parçaya bölününce parçalar küçülür; [[1/8]] < [[1/4]].', ok: true },
    { text: '8, 4’ten büyük olduğu için [[1/8]] daha büyüktür.', ok: false },
    { text: 'İkisi de 1 parça olduğu için eşittir.', ok: false },
  ] },
  wholes: { id: 'wholes', who: 'Elif', emoji: '👧', text: 'Benim çikolatamın [[1/2]]’si ile senin çikolatanın [[1/2]]’si her zaman aynı miktardır.', truth: 'false', models: ['wholes'], need: [[0.5, 0.5]], dens: [2, 3, 4], mis: 'Kesrin bir bütüne göre olduğunu dikkate almadı (farklı bütünlerin yarımları eşit sanıldı)', hint: 'Çikolatalar aynı boyda olmak zorunda mı? Bütünleri farklı yapıp yarımlarını karşılaştır.', reasons: [
    { text: 'Bütünler farklı büyüklükteyse yarımları da farklı miktardır.', ok: true },
    { text: 'Yarım her zaman yarımdır, bütünün boyu önemli değildir.', ok: false },
    { text: 'İki kesrin payı ve paydası aynı olduğu için miktarlar eşittir.', ok: false },
  ] },
  sameAdd: { id: 'sameAdd', who: 'Mert', emoji: '🧒', text: '[[3/8]] + [[2/8]] = [[5/16]]', truth: 'false', models: ['strips', 'line'], need: [[5 / 8, 5 / 16], [3 / 8, 5 / 16]], dens: [8, 16], mis: 'Kesirleri toplarken paydaları da topladı', hint: '[[3/8]]’e bir şey eklersen sonuç [[3/8]]’den küçük olabilir mi? [[5/16]] nerede?', reasons: [
    { text: 'Sekizde birleri sayarız: 3 tane + 2 tane = 5 tane sekizde bir. Parçaların boyu değişmez.', ok: true },
    { text: 'Paylar toplandığı gibi paydalar da toplanır.', ok: false },
    { text: '[[5/16]] daha çok parçaya bölündüğü için daha büyüktür.', ok: false },
  ] },
  improper: { id: 'improper', who: 'Zeynep', emoji: '👩', text: '[[5/4]], 1’den küçüktür; çünkü kesirler her zaman 1’den küçüktür.', truth: 'false', models: ['strips', 'line'], need: [[5 / 4]], dens: [2, 4], range: [0, 2], mis: 'Bileşik kesrin 1’den büyük olabileceğini kabul etmedi', hint: '4 tane [[1/4]] bir bütün eder. 5 tane [[1/4]] ne eder?', reasons: [
    { text: '[[4/4]] bir bütün eder; [[5/4]] bir bütünden [[1/4]] fazladır.', ok: true },
    { text: 'Bir kesrin payı paydasından büyük olamaz.', ok: false },
    { text: '[[5/4]] = [[1/4]] çünkü 5 parçadan 4’ü alınır.', ok: false },
  ] },
  unitTrue: { id: 'unitTrue', who: 'Ayşe', emoji: '👧', text: '[[1/3]] < [[1/2]], çünkü bütünü 3 eş parçaya bölünce parçalar 2’ye bölmekten daha küçük olur.', truth: 'true', models: ['strips', 'line'], need: [[1 / 3, 1 / 2]], dens: [2, 3, 6], mis: 'Doğru bir birim kesir karşılaştırmasını reddetti', hint: 'Şeritleri yan yana koy: hangisi daha uzun?', reasons: [
    { text: 'Bütün ne kadar çok eş parçaya bölünürse her parça o kadar küçük olur.', ok: true },
    { text: '3 > 2 olduğu için [[1/3]] daha büyük olmalıydı.', ok: false },
    { text: 'Birim kesirler her zaman eşittir.', ok: false },
  ] },
  gap: { id: 'gap', who: 'Ali', emoji: '👦', text: '[[3/4]] = [[4/5]], çünkü ikisinde de bütüne 1 parça eksik.', truth: 'false', models: ['strips', 'line'], need: [[3 / 4, 4 / 5]], dens: [4, 5, 20], mis: 'Bütüne kalan parça SAYISINA bakıp parçaların büyüklüğünü dikkate almadı', hint: 'Eksik parçalar aynı büyüklükte mi? [[1/4]] mü büyük, [[1/5]] mi?', reasons: [
    { text: 'Eksik parçalar farklı büyüklükte: [[1/4]] > [[1/5]]; bu yüzden [[4/5]] daha büyük.', ok: true },
    { text: 'Eksik parça sayısı aynıysa kesirler eşittir.', ok: false },
    { text: '[[3/4]] daha büyüktür, çünkü dörtte birler büyük parçalardır.', ok: false },
  ] },
  eqBig: { id: 'eqBig', who: 'Deniz', emoji: '🧑', text: '[[2/4]] > [[1/2]], çünkü 2 ve 4, 1 ve 2’den büyük sayılar.', truth: 'false', models: ['strips', 'line'], need: [[2 / 4, 1 / 2]], dens: [2, 4, 8], mis: 'Denk kesirlerde büyük sayıların büyük kesir verdiğini düşündü', hint: '[[2/4]] ile [[1/2]] şeritlerini alt alta koy. Uçları nerede?', reasons: [
    { text: '[[2/4]] ile [[1/2]] aynı uzunlukta: denk kesirlerdir.', ok: true },
    { text: 'Payı ve paydası büyük olan kesir daha büyüktür.', ok: false },
    { text: '[[2/4]] iki parça olduğu için daha büyüktür.', ok: false },
  ] },
  addAll: { id: 'addAll', who: 'Ece', emoji: '👧', text: '[[1/2]] + [[1/2]] = [[2/4]]', truth: 'false', models: ['strips', 'line'], need: [[1, 2 / 4], [1, 1 / 2]], dens: [2, 4], range: [0, 1.5], mis: 'Kesirleri toplarken payları ve paydaları ayrı ayrı topladı', hint: 'İki yarımı uç uca koyunca ne olur? [[2/4]] nerede?', reasons: [
    { text: 'İki yarım bir bütün eder; [[2/4]] ise yalnızca yarımdır.', ok: true },
    { text: 'Paylar toplanır (1 + 1), paydalar da toplanır (2 + 2).', ok: false },
    { text: 'Toplama kesri hep küçültür.', ok: false },
  ] },
  bench: { id: 'bench', who: 'Kerem', emoji: '👦', text: '[[5/8]] > [[1/2]], çünkü [[4/8]] yarım eder ve [[5/8]] ondan fazladır.', truth: 'true', models: ['strips', 'line'], need: [[5 / 8, 1 / 2]], dens: [2, 4, 8], mis: 'Yarım referansıyla yapılan doğru karşılaştırmayı reddetti', hint: '[[1/2]] kaç sekizde bir eder?', reasons: [
    { text: '[[1/2]] = [[4/8]]; [[5/8]] bundan [[1/8]] fazladır.', ok: true },
    { text: '[[5/8]] < [[1/2]] çünkü 8 > 2.', ok: false },
    { text: 'Paydaları farklı kesirler karşılaştırılamaz.', ok: false },
  ] },
  sum: { id: 'sum', who: 'Bora', emoji: '🧑', text: '[[2/3]] + [[1/4]] = [[3/7]]', truth: 'false', models: ['strips', 'line'], need: [[11 / 12, 3 / 7], [2 / 3, 3 / 7]], dens: [3, 4, 7, 12], mis: 'Kesirleri toplarken payları ve paydaları ayrı ayrı topladı (2/3 + 1/4 = 3/7)', hint: '[[2/3]]’e bir şey eklenince toplam [[2/3]]’ten küçük olabilir mi? [[3/7]] nerede duruyor?', reasons: [
    { text: 'Toplam [[2/3]]’ten büyük olmalı ama [[3/7]] < [[2/3]]. Parçalar farklı boyda olduğu için paylar ve paydalar toplanamaz.', ok: true },
    { text: 'Paylar toplanır (2 + 1), paydalar toplanır (3 + 4).', ok: false },
    { text: 'Doğru, çünkü 3 ve 7 asal sayılar.', ok: false },
  ] },
  dec: { id: 'dec', who: 'Selin', emoji: '👩', text: '0,25 < 0,3, çünkü basamağı çok olan ondalık sayı her zaman daha küçüktür.', truth: 'reason', models: ['grid', 'line'], need: [[0.25, 0.3]], dens: [10, 100], range: [0, 1], dec: true, mis: 'Ondalık sayıları basamak sayısına göre karşılaştırdı', hint: '0,3 kaç yüzde bir eder? Izgarada iki sayıyı boya.', reasons: [
    { text: '0,3 = 30 yüzde bir, 0,25 = 25 yüzde bir. Basamak sayısı değil, basamak değeri önemli.', ok: true },
    { text: 'Basamak sayısı çok olan ondalık her zaman küçüktür.', ok: false },
    { text: '0,25 > 0,3, çünkü 25 > 3.', ok: false },
  ] },
  addSame: { id: 'addSame', who: 'Arda', emoji: '👦', text: 'Pay ve paydaya aynı sayıyı eklersem kesir değişmez: [[1/2]] = [[2/3]]', truth: 'false', models: ['strips', 'line'], need: [[1 / 2, 2 / 3]], dens: [2, 3, 6], mis: 'Denk kesir için pay ve paydaya aynı sayıyı ekledi (toplamsal düşünme)', hint: '[[1/2]] ve [[2/3]] şeritlerinin uçları aynı yerde mi?', reasons: [
    { text: 'Denk kesir için pay ve payda aynı sayıyla ÇARPILIR; eklemek kesri değiştirir ([[2/3]] > [[1/2]]).', ok: true },
    { text: 'Pay ve paydaya aynı sayı eklenirse kesir değişmez.', ok: false },
    { text: '[[2/3]] < [[1/2]] çünkü 3 parça daha küçük.', ok: false },
  ] },
  dec5: { id: 'dec5', who: 'Ceren', emoji: '👧', text: '0,5 = [[1/5]], çünkü ikisinde de 5 var.', truth: 'false', models: ['grid', 'line'], need: [[0.5, 0.2]], dens: [5, 10], range: [0, 1], dec: true, mis: 'Ondalık gösterimi kesirle rakamlarına bakarak eşleştirdi (0,5 = 1/5)', hint: '0,5 kaç onda bir? [[1/5]], 100 karenin kaçı eder?', reasons: [
    { text: '0,5 = [[5/10]] = [[1/2]]; [[1/5]] ise 0,2 eder.', ok: true },
    { text: 'İkisinde de 5 olduğu için eşittir.', ok: false },
    { text: '[[1/5]] > 0,5 çünkü kesirler ondalıklardan büyüktür.', ok: false },
  ] },
  gapTrue: { id: 'gapTrue', who: 'Ece', emoji: '👧', text: '[[7/8]] > [[5/6]], çünkü ikisinde de bütüne 1 parça eksik ve [[1/8]] < [[1/6]].', truth: 'true', models: ['strips', 'line'], need: [[7 / 8, 5 / 6]], dens: [6, 8, 24], mis: 'Bütüne kalan parçanın büyüklüğüyle yapılan doğru karşılaştırmayı reddetti', hint: 'Bütüne kalan parçalar hangisinde daha küçük?', reasons: [
    { text: 'Bütüne kalan parça [[7/8]]’de daha küçük ([[1/8]] < [[1/6]]), bu yüzden [[7/8]] bütüne daha yakın.', ok: true },
    { text: '8 > 6 olduğu için [[7/8]] daha küçük.', ok: false },
    { text: 'İkisinde de 1 parça eksik, o yüzden eşitler.', ok: false },
  ] },
  neg: { id: 'neg', who: 'Kaan', emoji: '🧑', text: '−[[1/2]] > −[[1/3]], çünkü [[1/2]] > [[1/3]].', truth: 'false', models: ['line'], need: [[-1 / 2, -1 / 3]], dens: [2, 3, 6], range: [-1, 1], mis: 'Negatif kesirleri karşılaştırırken mutlak değerine baktı', hint: 'Sayı doğrusunda sağdaki sayı daha büyüktür. −[[1/2]] mi daha sağda, −[[1/3]] mü?', reasons: [
    { text: '−[[1/2]], −[[1/3]]’ün solundadır; negatiflerde sıfırdan uzak olan daha küçüktür.', ok: true },
    { text: 'Negatiflerde de büyük kesir büyüktür.', ok: false },
    { text: 'Eksi işareti sayıları karşılaştırmayı değiştirmez.', ok: false },
  ] },
}

/** Özel adlara ek: Can’ın / Ayşe’nin, Can’a / Ayşe’ye */
const lastV = (w: string) => [...w.toLocaleLowerCase('tr')].reverse().find((ch) => 'aeıioöuü'.includes(ch)) ?? 'e'
const endsV = (w: string) => 'aeıioöuü'.includes(w.toLocaleLowerCase('tr').slice(-1))
const nameGen = (w: string) => { const v = lastV(w); const i4 = 'aı'.includes(v) ? 'ı' : 'ei'.includes(v) ? 'i' : 'ou'.includes(v) ? 'u' : 'ü'; return `${w}’${endsV(w) ? 'n' : ''}${i4}n` }
const nameDat = (w: string) => { const v = lastV(w); return `${w}’${endsV(w) ? 'y' : ''}${'aıou'.includes(v) ? 'a' : 'e'}` }

function claimsFor(grade: Grade): Claim[] {
  if (grade === 4) return [C.unit, C.wholes, C.sameAdd, C.improper, C.unitTrue]
  if (grade === 5) return [C.gap, C.eqBig, C.addAll, C.wholes, C.bench]
  if (grade === 6) return [C.sum, C.dec, C.addSame, C.dec5, C.gapTrue]
  return [C.sum, C.dec, C.neg, C.gapTrue, C.addSame]
}

const modelInfo: Record<Model, { label: string; icon: ReactNode }> = {
  strips: { label: 'Kesir şeritleri', icon: <Rows3 size={18} /> },
  line: { label: 'Sayı doğrusu', icon: <Ruler size={18} /> },
  grid: { label: '100’lük ızgara', icon: <Grid3x3 size={18} /> },
  wholes: { label: 'İki bütün', icon: <PieChart size={18} /> },
}

/** Değer kümelerinden birini, her değeri farklı bir nesneyle eşleyerek karşılıyor mu? */
function covers(vals: number[], need: number[][]) {
  return need.some((set) => {
    const used = new Set<number>()
    return set.every((v) => {
      const i = vals.findIndex((x, k) => !used.has(k) && near(x, v, 1e-6))
      if (i < 0) return false
      used.add(i)
      return true
    })
  })
}

function fracLabel(v: number, dec?: boolean) {
  if (dec) return fmt(v, 3)
  const s = v < 0 ? '−' : ''
  const a = Math.abs(v)
  for (let d = 1; d <= 48; d++) {
    const n = Math.round(a * d)
    if (near(n / d, a, 1e-7)) {
      const g = gcd(n, d) || 1
      return d / g === 1 ? `${s}${n / g}` : `${s}[[${n / g}/${d / g}]]`
    }
  }
  return fmt(v, 3)
}

export default function KesirYanilgilari({ grade, onFinish }: InteractionProps) {
  const claims = useMemo(() => claimsFor(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const sol = useSolutions()
  const claim = claims[idx]
  const last = idx === claims.length - 1
  const onSolved = (first: boolean) => {
    if (firsts.current.length <= idx) firsts.current.push(first)
    setSolved(true)
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(false)
      return
    }
    const f = firsts.current.filter(Boolean).length
    onFinish({
      stars: starsFor((f + Math.min(1, sol.list.length * 0.15)) / claims.length),
      summary: `${claims.length} iddiayı kanıtla inceledin, ${sol.list.length} kanıt modeli kurdun.`,
      insight:
        grade <= 5
          ? 'Kesirleri karşılaştırırken sayıların büyüklüğüne değil parçaların büyüklüğüne bakarız: payda büyüdükçe parça küçülür ve kesir her zaman bir bütüne göredir.'
          : 'Bir iddiayı kanıtlamak için model kurarız: şeritler, sayı doğrusu ya da ızgara. Paylar ve paydalar ayrı ayrı toplanmaz; denk kesir için çarparız, eklemeyiz; sonuç doğru olsa bile gerekçe yanlış olabilir.',
    })
  }
  return (
    <Scene grade={grade}>
      <Header emoji="🚩" kicker="İddia" title="Doğru mu, yanılgı mı?" idx={idx} total={claims.length} dark={grade >= 7} />
      <ClaimView key={claim.id} c={claim} grade={grade} sol={sol} onSolved={onSolved} footer={solved ? <NextButton last={last} onClick={next} /> : null} />
    </Scene>
  )
}

/* ───────────────────────── iddia akışı ───────────────────────── */

function ClaimView({ c, grade, sol, onSolved, footer }: { c: Claim; grade: Grade; sol: ReturnType<typeof useSolutions>; onSolved: (first: boolean) => void; footer: ReactNode }) {
  const [gut, setGut] = useState<string | null>(null)
  const [phase, setPhase] = useState<'gut' | 'build' | 'verdict' | 'explain' | 'done'>('gut')
  const [model, setModel] = useState<Model>(c.models[0])
  const [proved, setProved] = useState<Model[]>([])
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [reason, setReason] = useState<number | null>(null)
  const [fb, setFb] = useState<{ ok: boolean; text: string; mis?: string } | null>(null)
  const fails = useRef(0)
  const [tries, setTries] = useState(0)
  const track = useTracker()
  const reasons = useMemo(() => shuffle(c.reasons.map((r, i) => ({ ...r, i }))), [c])
  const evidence = proved.length > 0
  const onEvidence = (m: Model) => {
    if (proved.includes(m)) return
    setProved((p) => [...p, m])
    sol.add(`${c.id}-${m}`, `${modelInfo[m].label}`)
    if (phase === 'build') setPhase('verdict')
  }
  const fail = (text: string, mis?: string) => {
    fails.current++
    setTries((t) => t + 1)
    track.attempt(false)
    setFb({ ok: false, text, mis })
  }
  const checkVerdict = () => {
    if (verdict === c.truth) {
      track.attempt(true)
      setPhase('explain')
      setFb({ ok: true, text: c.truth === 'true' ? `Evet, ${c.who} haklı! Şimdi en iyi açıklamayı seç.` : c.truth === 'reason' ? `Evet! Sonuç doğru (0,25 < 0,3) ama ${nameGen(c.who)} gerekçesi yanlış. Doğru gerekçeyi seç.` : `Evet, ${c.who} yanılıyor. Ona en iyi hangi açıklama yardım eder?` })
      return
    }
    if (verdict === 'true' && c.truth !== 'true') fail(`Kanıtına tekrar bak. ${c.hint}`, c.mis)
    else if (verdict === 'false' && c.truth === 'true') fail(`Modelin ne gösteriyor? ${c.hint} Bazen iddia gerçekten doğrudur!`, c.mis)
    else if (verdict === 'reason') fail(c.truth === 'true' ? 'Hem sonuç hem gerekçe modelle uyuşuyor mu? Gerekçeyi tek tek dene.' : 'Sonucun kendisi doğru mu? Modelde iki değerin yerine bak.')
    else fail(`Sonuç (hangi sayı büyük) doğru çıktı mı? Peki ${nameGen(c.who)} “çünkü”den sonra söylediği doğru mu?`)
  }
  const checkReason = () => {
    if (reason === null) return
    const r = reasons[reason]
    if (r.ok) {
      track.attempt(true)
      track.item(fails.current === 0)
      onSolved(fails.current === 0)
      setPhase('done')
      setFb({ ok: true, text: `Harika açıklama! ${c.models.length > proved.length ? `İstersen ${c.models.filter((m) => !proved.includes(m)).map((m) => modelInfo[m].label.toLowerCase()).join(' ya da ')} ile de kanıtla.` : ''}` })
      return
    }
    fail(`Bu açıklama modelinle uyuşuyor mu? ${c.hint}`, c.mis)
  }
  return (
    <Split
      work={
        <div className="space-y-3">
          <Speech c={c} />
          {phase !== 'gut' && (
            <div className="rounded-3xl bg-white/95 p-3 text-ink shadow-sm ring-1 ring-line">
              {c.models.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
                  {c.models.map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={model === m} onClick={() => setModel(m)} className={`inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-black ring-1 transition ${model === m ? 'bg-teal-600 text-white ring-teal-700' : 'bg-white text-ink ring-line'}`}>
                      {modelInfo[m].icon}{modelInfo[m].label}{proved.includes(m) && <CheckCircle2 size={16} />}
                    </button>
                  ))}
                </div>
              )}
              {model === 'strips' && <Strips key="s" c={c} onEvidence={() => onEvidence('strips')} />}
              {model === 'line' && <LineModel key="l" c={c} onEvidence={() => onEvidence('line')} />}
              {model === 'grid' && <GridModel key="g" c={c} onEvidence={() => onEvidence('grid')} />}
              {model === 'wholes' && <Wholes key="w" c={c} onEvidence={() => onEvidence('wholes')} />}
            </div>
          )}
        </div>
      }
      panel={
        <>
          {phase === 'gut' && (
            <>
              <Prompt step="İlk tepkin">{nameGen(c.who)} iddiası hakkında ne düşünüyorsun? <span className="mt-1 block text-sm font-bold text-ink-soft">Bu bir tahmin; sonra kanıtla kontrol edeceksin.</span></Prompt>
              <Choices cols={1} value={gut} onPick={setGut} options={[{ id: 'agree', label: '👍 Katılıyorum' }, { id: 'disagree', label: '👎 Katılmıyorum' }, { id: 'unsure', label: '🤔 Emin değilim' }]} />
              <CheckButton disabled={!gut} onClick={() => { track.strategy(`İlk tepki: ${gut === 'agree' ? 'katılıyorum' : gut === 'disagree' ? 'katılmıyorum' : 'emin değilim'}`); setPhase('build') }}>Kanıt kurmaya başla</CheckButton>
            </>
          )}
          {phase === 'build' && (
            <Prompt step="Kanıt kur">İddiadaki kesirleri modelde oluştur. Kanıtın hazır olunca karar vereceksin.<span className="mt-1 block text-sm font-bold text-ink-soft">{c.hint}</span></Prompt>
          )}
          {(phase === 'verdict' || phase === 'explain' || phase === 'done') && (
            <>
              <Prompt step="Karar">Kanıtına göre {nameGen(c.who)} iddiası…</Prompt>
              <Choices cols={1} value={verdict} disabled={phase !== 'verdict'} onPick={(v) => { setVerdict(v); setFb(null) }} options={[{ id: 'true', label: 'Doğru' }, { id: 'false', label: 'Yanlış' }, ...(grade >= 6 ? [{ id: 'reason' as const, label: 'Sonuç doğru ama gerekçe yanlış' }] : [])]} />
              {phase === 'verdict' && <CheckButton onClick={checkVerdict} disabled={!verdict} />}
            </>
          )}
          {(phase === 'explain' || phase === 'done') && (
            <>
              <Card><p className="text-sm font-black">{nameDat(c.who)} hangi açıklamayı yaparsın?</p></Card>
              <div className="grid gap-2">
                {reasons.map((r, i) => (
                  <button key={i} type="button" disabled={phase === 'done'} onClick={() => { setReason(i); setFb(null) }} aria-pressed={reason === i} className={`min-h-14 rounded-2xl px-3 py-2 text-left text-[15px] font-bold ring-2 transition ${reason === i ? (phase === 'done' ? 'bg-emerald-50 text-emerald-900 ring-emerald-500' : 'bg-teal-600 text-white ring-teal-700') : 'bg-white text-ink ring-line'}`}>
                    <MathText text={r.text} />
                  </button>
                ))}
              </div>
              {phase === 'explain' && <CheckButton onClick={checkReason} disabled={reason === null} />}
            </>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={tries} question={fb.text} misconception={fb.mis} tool={c.dec ? 'yuzdeizgarasi' : c.range && c.range[0] < 0 ? 'kesirdogrusu' : 'fractions'} toolTitle="Başka bir modelle dene" />)}
          {evidence && <SolutionList list={sol.list.filter((s) => s.key.startsWith(`${c.id}-`))} goal={c.models.length} />}
          {phase === 'done' && <StrategyPicker question="Hangi kanıt seni en çok ikna etti?" options={[...c.models.map((m) => modelInfo[m].label), 'Kafamda düşündüm']} onPick={() => {}} />}
          {footer}
        </>
      }
    />
  )
}

function Speech({ c }: { c: Claim }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white text-4xl shadow-sm ring-2 ring-amber-300" aria-hidden>{c.emoji}</span>
      <div className="relative min-w-0 flex-1 rounded-3xl rounded-tl-md bg-amber-50 px-4 py-3 text-ink shadow-sm ring-2 ring-amber-300">
        <p className="text-xs font-black tracking-wide text-amber-800 uppercase">{c.who} diyor ki:</p>
        <p className="mt-0.5 text-xl leading-snug font-black sm:text-2xl"><MathText text={`“${c.text}”`} /></p>
      </div>
    </div>
  )
}

/** Kanıt ilk kez tamamlandığında üst bileşene bildirir */
function useEvidence(ok: boolean, cb: () => void) {
  const sent = useRef(false)
  useEffect(() => {
    if (ok && !sent.current) {
      sent.current = true
      cb()
    }
  }, [ok, cb])
}

function EvidenceBadge({ ok, text }: { ok: boolean; text: string }) {
  return ok ? (
    <p className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-200 animate-fade-up"><CheckCircle2 size={18} /><span>Kanıt hazır! <MathText text={text} /></span></p>
  ) : (
    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-ink-soft ring-1 ring-line"><MathText text={text} /></p>
  )
}

/* ───────────────────────── model: kesir şeritleri ───────────────────────── */

const ROW_COLORS = ['#d6457a', '#0ea5e9', '#f59e0b']

function Strips({ c, onEvidence }: { c: Claim; onEvidence: () => void }) {
  const maxW = c.range ? c.range[1] : 1
  const rowsN = Math.max(2, ...c.need.map((s) => s.length))
  const [rows, setRows] = useState<number[][]>(Array.from({ length: rowsN }, () => []))
  const [act, setAct] = useState(0)
  const vals = rows.map((r) => r.reduce((s, d) => s + 1 / d, 0))
  const ok = covers(vals.filter((_, i) => rows[i].length), c.need)
  useEvidence(ok, onEvidence)
  const add = (d: number) => {
    setRows((rs) => rs.map((r, i) => (i === act && r.reduce((s, x) => s + 1 / x, 0) + 1 / d <= maxW + 1e-9 ? [...r, d] : r)))
  }
  const remove = (ri: number, k: number) => setRows((rs) => rs.map((r, i) => (i === ri ? r.filter((_, j) => j !== k) : r)))
  const W = (v: number) => `${(v / maxW) * 100}%`
  return (
    <div>
      <div className="relative">
        {/* bütün referansı */}
        <div className="mb-1.5 flex h-9 items-center justify-center rounded-lg bg-slate-700 text-sm font-black text-white" style={{ width: W(1) }}>1 bütün</div>
        {maxW > 1 && <div className="absolute top-0 right-0 flex h-9 items-center justify-center rounded-lg border-2 border-dashed border-slate-400 text-xs font-black text-slate-500" style={{ width: W(maxW - 1) }}>2. bütün</div>}
        <div className="space-y-2">
          {rows.map((r, ri) => (
            <div key={ri} className={`flex items-center gap-2 rounded-xl p-1 transition ${act === ri ? 'bg-teal-50 ring-2 ring-teal-400' : ''}`}>
              <button type="button" onClick={() => setAct(ri)} className="grid size-12 shrink-0 place-items-center rounded-xl text-lg font-black text-white" style={{ background: ROW_COLORS[ri] }} aria-label={`${ri + 1}. şeridi seç`}>{'ABC'[ri]}</button>
              <div className="relative h-12 flex-1 rounded-lg bg-slate-100 ring-1 ring-slate-300" onClick={() => setAct(ri)}>
                <div className="absolute inset-0 flex">
                  {r.map((d, k) => (
                    <button key={k} type="button" onClick={(e) => { e.stopPropagation(); setAct(ri); remove(ri, k) }} className="flex h-12 items-center justify-center border-r-2 border-white text-[11px] font-black text-white first:rounded-l-lg" style={{ width: `${(1 / d / maxW) * 100}%`, flex: 'none', background: ROW_COLORS[ri] }} aria-label={`1/${d} parçasını çıkar`}>
                      {d <= 12 && <MathText text={`[[1/${d}]]`} />}
                    </button>
                  ))}
                </div>
                {maxW > 1 && <span className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-slate-500" style={{ left: W(1) }} />}
              </div>
              <span className="w-16 shrink-0 text-center text-lg font-black" style={{ color: ROW_COLORS[ri] }}>{r.length ? <MathText text={fracLabel(vals[ri])} /> : '—'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-black tracking-wide text-ink-soft uppercase">{'ABC'[act]} şeridine ekle:</span>
        {c.dens.map((d) => (
          <button key={d} type="button" onClick={() => add(d)} aria-label={`1/${d} parçası ekle`} className="min-h-12 min-w-14 rounded-xl px-2 text-lg font-black ring-2 transition active:scale-95" style={{ background: `${ROW_COLORS[act]}14`, color: ROW_COLORS[act], borderColor: ROW_COLORS[act] }}>
            <MathText text={`[[1/${d}]]`} />
          </button>
        ))}
        <button type="button" onClick={() => setRows((rs) => rs.map((r, i) => (i === act ? [] : r)))} className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-white px-3 text-sm font-black text-ink-soft ring-1 ring-line"><X size={16} />Şeridi boşalt</button>
      </div>
      <EvidenceBadge ok={ok} text={ok ? 'Şeritlerin uçlarını karşılaştır.' : 'Bir şeridi seç, birim kesir parçaları ekle. Bir parçaya dokunursan çıkar.'} />
    </div>
  )
}

/* ───────────────────────── model: sayı doğrusu ───────────────────────── */

function Ticks({ den, dec }: { den: number; dec?: boolean }) {
  const P = usePlane()
  if (!den) return null
  const px = P.unitPx / den
  if (px < 7) return null
  const y0 = P.sy(0)
  const out: ReactNode[] = []
  const from = Math.ceil(P.view.xMin * den), to = Math.floor(P.view.xMax * den)
  for (let k = from; k <= to; k++) {
    if (k % den === 0) continue
    const v = k / den
    out.push(
      <g key={k}>
        <line x1={P.sx(v)} x2={P.sx(v)} y1={y0 - 12} y2={y0 + 12} stroke="#0d9488" strokeWidth={2} />
        {px > (dec ? 34 : 28) && (
          <foreignObject x={P.sx(v) - 22} y={y0 - 60} width={44} height={42}>
            <div className="flex h-full items-center justify-center text-[14px] font-black text-teal-700"><MathText text={dec ? fmt(v, 2) : fracLabel(v)} /></div>
          </foreignObject>
        )}
      </g>,
    )
  }
  return <g pointerEvents="none">{out}</g>
}

function LineModel({ c, onEvidence }: { c: Claim; onEvidence: () => void }) {
  const [lo, hi] = c.range ?? [0, 1]
  const n = Math.max(...c.need.map((s) => s.length))
  const [den, setDen] = useState(c.dens[0])
  const [pts, setPts] = useState<number[]>(Array.from({ length: n }, (_, i) => (lo < 0 ? (i === 0 ? lo : 0) : i === 0 ? lo : hi)))
  const ok = covers(pts, c.need)
  useEvidence(ok, onEvidence)
  const snap = (x: number) => Math.min(hi, Math.max(lo, den ? Math.round(x * den) / den : Math.round(x * 100) / 100))
  const colors = ['#d6457a', '#0ea5e9', '#f59e0b']
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-black tracking-wide text-ink-soft uppercase">{c.dec ? 'Bölme' : 'Bütünü böl'}</span>
        {c.dens.map((d) => (
          <button key={d} type="button" onClick={() => { setDen(d); setPts((p) => p.map((x) => Math.round(x * d) / d)) }} aria-pressed={den === d} className={`min-h-12 min-w-12 rounded-xl px-2 text-base font-black ring-1 ${den === d ? 'bg-teal-600 text-white ring-teal-700' : 'bg-white text-ink ring-line'}`}>
            {c.dec ? (d === 10 ? 'onda bir' : d === 100 ? 'yüzde bir' : `${d} parça`) : `${d} eş parça`}
          </button>
        ))}
      </div>
      <Plane mode="x" initial={{ xMin: lo - (hi - lo) * 0.08, xMax: hi + (hi - lo) * 0.08, yMin: -1, yMax: 1 }} minSpan={0.05} maxSpan={6} label="Sayı doğrusu" fixedStep={c.range && hi - lo > 1.5 ? 1 : undefined}>
        <Ticks den={den} dec={c.dec} />
        {pts.map((x, i) => (
          <DragPoint key={i} x={x} y={0} r={13} color={colors[i]} label={`${'ABC'[i]}`} onChange={(p) => setPts((ps) => ps.map((v, k) => (k === i ? snap(p.x) : v)))} />
        ))}
      </Plane>
      <div className="mt-2 flex flex-wrap gap-2">
        {pts.map((x, i) => (
          <span key={i} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-lg font-black text-white" style={{ background: colors[i] }}>{'ABC'[i]} = <MathText text={fracLabel(x, c.dec)} /></span>
        ))}
      </div>
      <EvidenceBadge ok={ok} text={ok ? 'Hangisi daha sağda? Sağdaki sayı daha büyüktür.' : 'Noktaları sürükleyip iddiadaki sayıların yerine koy. Yakınlaştırmak için iki parmak kullan.'} />
    </div>
  )
}

/* ───────────────────────── model: 100’lük ızgara ───────────────────────── */

function GridModel({ c, onEvidence }: { c: Claim; onEvidence: () => void }) {
  const [a, setA] = useState(emptyCells)
  const [b, setB] = useState(emptyCells)
  const vals = [countOn(a) / 100, countOn(b) / 100]
  const ok = covers(vals, c.need)
  useEvidence(ok, onEvidence)
  const one = (cells: boolean[], set: (x: boolean[]) => void, color: string, name: string) => (
    <div className="min-w-0">
      <p className="mb-1 text-center text-base font-black" style={{ color }}>{name} = {fmt(countOn(cells) / 100)}</p>
      <PaintGrid cells={cells} onChange={set} color={color} label={`${name} ızgarası`} />
      <div className="mt-1.5"><GridButtons compact cells={cells} onChange={set} /></div>
    </div>
  )
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {one(a, setA, '#d6457a', 'A')}
        {one(b, setB, '#0ea5e9', 'B')}
      </div>
      <EvidenceBadge ok={ok} text={ok ? 'Hangisinde daha çok kare boyalı?' : 'Her ızgara 1 bütün. Bir sütun 0,1; bir kare 0,01. İddiadaki iki sayıyı boya.'} />
    </div>
  )
}

/* ───────────────────────── model: iki farklı bütün ───────────────────────── */

function Bar({ size, den, on, color, onToggle, onSize, onDen, name }: { size: number; den: number; on: boolean[]; color: string; onToggle: (i: number) => void; onSize: (s: number) => void; onDen: (d: number) => void; name: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useGesture({ onPinch: ({ offset: [s], event }) => { event?.preventDefault?.(); onSize(Math.max(0.35, Math.min(1, s))) } }, { target: ref, eventOptions: { passive: false }, pinch: { from: () => [size, 0], scaleBounds: { min: 0.35, max: 1 } } })
  return (
    <div className="rounded-2xl bg-amber-50/60 p-2 ring-1 ring-amber-200">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-black" style={{ color }}>{name}</span>
        {[['Küçük', 0.45], ['Orta', 0.7], ['Büyük', 1]].map(([l, v]) => (
          <button key={l} type="button" onClick={() => onSize(v as number)} className={`min-h-11 rounded-xl px-2.5 text-xs font-black ring-1 ${near(size, v as number, 0.02) ? 'bg-amber-500 text-white ring-amber-600' : 'bg-white text-ink ring-line'}`}>{l}</button>
        ))}
        <span className="ml-auto text-xs font-black text-ink-soft">parça:</span>
        {[2, 3, 4].map((d) => (
          <button key={d} type="button" onClick={() => onDen(d)} className={`min-h-11 min-w-11 rounded-xl text-sm font-black ring-1 ${den === d ? 'bg-teal-600 text-white ring-teal-700' : 'bg-white text-ink ring-line'}`}>{d}</button>
        ))}
      </div>
      <div ref={ref} className="touch-none py-1" style={{ touchAction: 'none' }}>
        <div className="flex h-20 overflow-hidden rounded-lg ring-4 ring-[#5b3415] transition-all" style={{ width: `${size * 100}%`, background: '#7c4a21' }}>
          {Array.from({ length: den }, (_, i) => (
            <button key={i} type="button" onClick={() => onToggle(i)} className="flex-1 border-r-4 border-[#5b3415] text-sm font-black text-white last:border-r-0" style={{ background: on[i] ? color : 'repeating-linear-gradient(90deg,#8b5a2b,#8b5a2b 14px,#7c4a21 14px,#7c4a21 16px)' }} aria-pressed={on[i]} aria-label={`${name} ${i + 1}. parça`}>
              <MathText text={`[[1/${den}]]`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Wholes({ c, onEvidence }: { c: Claim; onEvidence: () => void }) {
  const [A, setA] = useState({ size: 1, den: 2, on: [false, false] })
  const [B, setB] = useState({ size: 1, den: 2, on: [false, false] })
  const fa = A.on.filter(Boolean).length / A.den, fb = B.on.filter(Boolean).length / B.den
  const target = c.need[0][0]
  const both = near(fa, target) && near(fb, target)
  const ok = both && !near(A.size, B.size, 0.05)
  useEvidence(ok, onEvidence)
  const amtA = A.size * fa, amtB = B.size * fb
  const ctl = (S: typeof A, set: (s: typeof A) => void) => ({
    size: S.size, den: S.den, on: S.on,
    onToggle: (i: number) => set({ ...S, on: S.on.map((x, k) => (k === i ? !x : x)) }),
    onSize: (s: number) => set({ ...S, size: s }),
    onDen: (d: number) => set({ ...S, den: d, on: Array(d).fill(false) }),
  })
  return (
    <div className="space-y-2">
      <Bar {...ctl(A, setA)} color="#d6457a" name="Elif’in çikolatası" />
      <Bar {...ctl(B, setB)} color="#0ea5e9" name="Senin çikolatan" />
      {both && (
        <div className="space-y-1 rounded-xl bg-white p-2 ring-1 ring-line">
          <p className="text-xs font-black text-ink-soft">Yenen miktarlar yan yana:</p>
          <div className="h-5 rounded bg-[#d6457a] transition-all" style={{ width: `${amtA * 100}%` }} />
          <div className="h-5 rounded bg-[#0ea5e9] transition-all" style={{ width: `${amtB * 100}%` }} />
        </div>
      )}
      <EvidenceBadge ok={ok} text={ok ? 'İkisi de [[1/2]] ama miktarlar aynı mı?' : both ? 'İkisinin de yarısını boyadın. Şimdi çikolataların boyunu farklı yap (düğmelerle ya da iki parmakla).' : 'Her çikolatayı eş parçalara böl ve yarısını boya. Çikolatanın üzerinde iki parmakla boyunu değiştirebilirsin.'} />
    </div>
  )
}
