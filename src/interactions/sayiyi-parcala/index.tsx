import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import type { Grade } from '../../data/types'
import { SolutionList, StrategyPicker, useSolutions } from '../../games/kit2'
import { ek } from '../../lib/generators'
import type { InteractionProps } from '../types'
import { ActivityLayout, DoneNote, NumPad, parseNum, pick, tr, useNudge, useSession } from '../hizli-noktalar/kit'
import { BlockBuilder, Counters, NumberBond, PLACE, SEG, Tape, type Place } from './parts'

/**
 * 23. Sayıyı Parçala — Van de Walle: parça-parça-bütün, “bir sayının pek çok adı var”, yeniden gruplama.
 *  1. sınıf: iki yüzlü sayaçlar (çevir / salla-dök), sayı bağı; bulunan yollar sıralı tabloda boşlukları gösterir (sistemli arama).
 *  2. sınıf: şeridi kesme (3 parça), onluk-birlik bloklarla aynı sayının farklı adları (4 onluk 7 birlik = 3 onluk 17 birlik).
 *  3. sınıf: yüzlük-onluk-birlik ile yeniden gruplama (sıfırlı sayı dâhil), 100’ü ve 1000’i parçalama, sembolik sayı bağı.
 *  4. sınıf: binliklerle yeniden gruplama, 1000 ve 10 000’i üç parçaya ayırma.
 * Her farklı parçalanış useSolutions ile toplanır (öğretmen raporu: farklı çözüm sayısı).
 */

type Kind =
  | { kind: 'counters'; n: number }
  | { kind: 'tape'; n: number; parts: 2 | 3; step: number }
  | { kind: 'blocks'; n: number; places: Place[] }
  | { kind: 'bond'; n: number; parts: 2 | 3 }

interface Task {
  t: Kind
  goal: number
  title: string
  prompt: string
  hints: string[]
  note: string
  picker?: string[]
}


function makeTasks(grade: Grade): Task[] {
  const why = ['Birinden alıp diğerine verdim', 'Bir onluğu kırdım', 'Kolay (yuvarlak) sayılar seçtim', 'Deneyerek buldum']
  if (grade <= 1) {
    const a = pick([5, 6])
    return [
      { t: { kind: 'counters', n: a }, goal: 3, title: 'Salla ve dök', prompt: `${a} sayaç var: bir yüzü kırmızı, bir yüzü sarı. Sayaçlara dokunarak çevir ya da salla! ${ek(a, 'acc')} kaç kırmızı ve kaç sarı olarak gösterebilirsin? 3 farklı yol bul.`, hints: ['Bir sayaca dokun: rengi değişir. Kaç kırmızı, kaç sarı oldu?', 'Hepsi kırmızı olabilir mi? O da bir yol!'], note: `${a} sayısı pek çok parçadan oluşabilir.` },
      { t: { kind: 'counters', n: 7 }, goal: 5, title: '7’nin parçaları', prompt: '7 sayacı kırmızı ve sarı olarak 5 farklı şekilde göster. Tabloda boş kalan satırlar sana ipucu verir!', hints: ['Tabloya bak: hangi satır boş? Kaç kırmızı olmalı?', 'Bir kırmızıyı sarıya çevirince kırmızılar 1 azalır, sarılar 1 artar.'], note: 'Kırmızılar 1 artınca sarılar 1 azalıyor, toplam hep 7!', picker: ['Bir sayacı çevirdim', 'Tabloya baktım', 'Salladım', 'Ters çevirdim (3 + 4 → 4 + 3)'] },
      { t: { kind: 'tape', n: 8, parts: 2, step: 1 }, goal: 3, title: 'Şeridi kes', prompt: '8 karelik bir şerit var. Şeride dokunarak makasla ikiye kes. 8’i 3 farklı biçimde iki parçaya ayır.', hints: ['Şeridin bir yerine dokun: kesik oluşur. Kesiği sürükleyerek taşıyabilirsin.', '4 ve 4 de bir yol! Peki 1 ve 7?'], note: '8 = 4 + 4 = 3 + 5 = 2 + 6 = 1 + 7. Aynı bütün, farklı parçalar.' },
      { t: { kind: 'counters', n: 10 }, goal: 5, title: '10’un dostları', prompt: '10 sayaçla 10’un dostlarını bul: hangi iki sayı birlikte 10 eder? 5 farklı yol bul.', hints: ['Üst sıranın hepsi kırmızı, alt sıranın hepsi sarı olursa?', 'Tabloda eksik olan satırlar hangileri?'], note: '10’un dostları: 1 ve 9, 2 ve 8, 3 ve 7, 4 ve 6, 5 ve 5. Bunlar toplamada çok işe yarar!', picker: ['Bir sayacı çevirdim', 'Tabloya baktım', 'Salladım', 'Ters çevirdim'] },
      { t: { kind: 'bond', n: 9, parts: 2 }, goal: 3, title: 'Sayı bağı', prompt: 'Şimdi modelsiz! Sayı bağında bütün 9. Parça dairelerine sayı yaz: 9’u 3 farklı yolla iki parçaya ayır.', hints: ['Bir parçaya 4 yazarsan diğeri kaç olmalı?', 'Sayaçlarla yaptıklarını hatırla: 9 = 5 + ?'], note: '9 = 5 + 4 = 6 + 3 = 7 + 2… Sayı bağı, parçaların birlikte bütünü yaptığını gösterir.' },
    ]
  }
  if (grade === 2) {
    const nb = pick([34, 45, 52, 63])
    const nb2 = pick([28, 47, 56].filter((x) => Math.floor(x / 10) !== Math.floor(nb / 10)))
    const r = pick([40, 60, 80])
    return [
      { t: { kind: 'tape', n: 12, parts: 3, step: 1 }, goal: 3, title: 'Üç parça', prompt: '12 karelik şeridi makasla üç parçaya kes. 12’yi 3 farklı yolla üç parçaya ayır.', hints: ['İki kez dokun: iki kesik, üç parça olur.', 'Parçalardan biri 10 olursa diğerleri ne olur?'], note: '12 = 5 + 5 + 2 = 4 + 4 + 4 = 10 + 1 + 1…' },
      { t: { kind: 'blocks', n: nb, places: ['t', 'o'] }, goal: 3, title: 'Blokların adları', prompt: `Onluk ve birlik bloklarla ${ek(nb, 'acc')} 3 farklı yolla oluştur. İpucu: bir onluğu 10 birliğe kırabilirsin!`, hints: [`${nb} için kaç onluk ve kaç birlik gerekir?`, 'Bir onluğu kırınca toplam değişir mi? Dene!', 'Bir onluğu daha kır.'], note: `${Math.floor(nb / 10)} onluk ${nb % 10} birlik = ${Math.floor(nb / 10) - 1} onluk ${(nb % 10) + 10} birlik. Kırmak sayıyı değiştirmez!`, picker: why },
      { t: { kind: 'tape', n: 20, parts: 2, step: 1 }, goal: 3, title: '20’yi böl', prompt: '20 karelik şeridi iki parçaya kes. 3 farklı yol bul. Bir parçanın 10 olduğu bir yol da bul!', hints: ['Şeridin tam ortasına dokunursan?', '10 kare say, oradan kes.'], note: '20 = 10 + 10 = 15 + 5 = 12 + 8… 10’lar işimizi kolaylaştırır.' },
      { t: { kind: 'blocks', n: nb2, places: ['t', 'o'] }, goal: 4, title: 'Daha çok ad', prompt: `${ek(nb2, 'acc')} bloklarla 4 farklı yolla göster. Kaç tane yol olabilir, tahmin et!`, hints: ['Önce en az blokla yap.', 'Her kırma yeni bir yol verir. Birlikler ne kadar artıyor?', 'Hiç onluk kullanmadan yapabilir misin?'], note: `Her kırmada onluklar 1 azalır, birlikler 10 artar. ${ek(nb2, 'gen')} ${Math.floor(nb2 / 10) + 1} farklı blok adı var!`, picker: why },
      { t: { kind: 'bond', n: r, parts: 2 }, goal: 3, title: 'Onlukları parçala', prompt: `Sayı bağında bütün ${r}. Parçalara sayı yaz: ${ek(r, 'acc')} 3 farklı yolla iki parçaya ayır.`, hints: [`${r / 10} onluğu iki gruba ayırmayı düşün.`, `Bir parça 25 olursa diğeri kaç olur?`], note: `${r} = ${r / 2} + ${r / 2} = 10 + ${r - 10}… Onlukları paylaştırmak gibi.` },
    ]
  }
  if (grade === 3) {
    const h = pick([2, 3, 4]), t = pick([4, 5, 6]), o = pick([2, 3, 5])
    const n1 = h * 100 + t * 10 + o
    const n2 = pick([406, 305, 502])
    const b2 = pick([250, 400, 360])
    return [
      { t: { kind: 'blocks', n: n1, places: ['h', 't', 'o'] }, goal: 4, title: 'Yüzlükleri kır', prompt: `${ek(n1, 'acc')} yüzlük, onluk ve birlik bloklarla 4 farklı yolla oluştur.`, hints: ['Önce en az blokla yap.', 'Bir yüzlüğü 10 onluğa kır. Toplam değişti mi?', 'Bir onluğu kırmayı da dene.'], note: `${h} yüzlük ${t} onluk ${o} birlik = ${h - 1} yüzlük ${t + 10} onluk ${o} birlik… Aynı sayı, farklı adlar.`, picker: why },
      { t: { kind: 'tape', n: 100, parts: 3, step: 5 }, goal: 3, title: '100’ü kes', prompt: '100 uzunluğundaki şeridi üç parçaya kes. 3 farklı yol bul. Kesikler 5’in katlarına yapışır.', hints: ['Şeride iki kez dokun.', '25 + 25 + 50 gibi kolay sayılar dene.'], note: '100 = 50 + 25 + 25 = 60 + 30 + 10… Yuvarlak sayılar zihinden toplamayı kolaylaştırır.' },
      { t: { kind: 'blocks', n: n2, places: ['h', 't', 'o'] }, goal: 3, title: 'Sıfırın sırrı', prompt: `${ek(n2, 'gen')} onlar basamağında 0 var. Yine de onluk blok kullanarak gösterebilir misin? 3 farklı yol bul.`, hints: [`${n2} için hiç onluk gerekmiyor, değil mi? Peki bir yüzlüğü kırarsan?`, 'Kırdığın yüzlük 10 onluk olur.'], note: `${n2} = ${Math.floor(n2 / 100)} yüzlük ${n2 % 10} birlik = ${Math.floor(n2 / 100) - 1} yüzlük 10 onluk ${n2 % 10} birlik. 0, “o basamakta grup yok” demek.`, picker: why },
      { t: { kind: 'bond', n: b2, parts: 2 }, goal: 3, title: 'İki parça', prompt: `Sayı bağında bütün ${b2}. ${ek(b2, 'acc')} 3 farklı yolla iki parçaya ayır.`, hints: ['Önce yüzlükleri düşün.', `Bir parça 100 olursa diğeri kaç?`], note: `${b2} = 100 + ${b2 - 100} = ${b2 / 2} + ${b2 / 2}…` },
      { t: { kind: 'bond', n: 1000, parts: 3 }, goal: 3, title: '1000’i üçe böl', prompt: '1000’i üç parçaya ayır. 3 farklı yol bul. Parçalar eşit olmak zorunda değil!', hints: ['500 + 250 + 250 gibi kolay sayılarla başla.', 'Bir parçaya 100 yaz: geri kalan 900’ü iki parçaya nasıl ayırırsın?'], note: '1000 = 500 + 300 + 200 = 600 + 200 + 200…' },
    ]
  }
  const th = pick([2, 3]), hh = pick([3, 4]), tt = pick([5, 2])
  const n1 = th * 1000 + hh * 100 + tt * 10
  const n2 = pick([1205, 2040, 3008])
  const b = pick([4800, 3600, 7200])
  return [
    { t: { kind: 'blocks', n: n1, places: ['th', 'h', 't', 'o'] }, goal: 4, title: 'Binlikleri kır', prompt: `${ek(n1, 'acc')} bloklarla 4 farklı yolla oluştur. Binlikleri ve yüzlükleri kırmayı dene.`, hints: ['Önce en az blokla yap.', 'Bir binliği kırınca kaç yüzlük olur?', `${tr(n1)} kaç yüzlükten oluşur? (${th} binlik = ${th * 10} yüzlük)`], note: `${tr(n1)} = ${th} binlik ${hh} yüzlük ${tt} onluk = ${th * 10 + hh} yüzlük ${tt} onluk. Basamaklar 10’ar 10’ar büyür.`, picker: why },
    { t: { kind: 'tape', n: 1000, parts: 3, step: 50 }, goal: 3, title: '1000 metre', prompt: '1000 metrelik koşu yolunu üç etaba böl. Kesikler 50’nin katlarına yapışır. 3 farklı yol bul.', hints: ['İki kez dokun: üç etap.', '250 ve 750 1000’i tamamlar. Peki 250’yi ikiye bölersen?'], note: '1000 = 500 + 250 + 250 = 400 + 350 + 250…' },
    { t: { kind: 'bond', n: b, parts: 2 }, goal: 3, title: 'Kolay parçalar', prompt: `${tr(b)} sayısını iki parçaya 3 farklı yolla ayır. Bir yolda parçalardan biri yuvarlak bir binlik olsun.`, hints: [`${tr(b)} = ${Math.floor(b / 1000) * 1000} + ?`, 'Yarısını düşün: iki eşit parça?'], note: `${tr(b)} = ${tr(Math.floor(b / 1000) * 1000)} + ${tr(b % 1000)} = ${tr(b / 2)} + ${tr(b / 2)}…` },
    { t: { kind: 'blocks', n: n2, places: ['th', 'h', 't', 'o'] }, goal: 3, title: 'Sıfırlı sayı', prompt: `${tr(n2)} sayısında sıfırlar var. Bloklarla 3 farklı yolla göster.`, hints: ['Sıfır olan basamakta blok yok. Bir üst basamaktan kırarak oraya blok getirebilirsin.'], note: `Sıfır “o basamakta grup yok” demek; kırarak her basamağa blok getirebiliriz.`, picker: why },
    { t: { kind: 'bond', n: 10000, parts: 3 }, goal: 3, title: '10 000’i üçe böl', prompt: '10 000’i üç parçaya 3 farklı yolla ayır.', hints: ['5 000 + 2 500 + 2 500 gibi kolay sayılar dene.', 'Bir parçaya 1 000 yaz; kalan 9 000’i ikiye ayır.'], note: '10 000 = 5 000 + 3 000 + 2 000 = 4 500 + 4 500 + 1 000…' },
  ]
}

const emptyCounts = (): Record<Place, number> => ({ th: 0, h: 0, t: 0, o: 0 })

export default function SayiyiParcala({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade), [grade])
  const S = useSession(tasks.length)
  const T = tasks[S.idx]
  const sol = useSolutions()
  const { nudge, show, clear } = useNudge()
  const [sides, setSides] = useState<boolean[]>([])
  const [cuts, setCuts] = useState<number[]>([])
  const [counts, setCounts] = useState(emptyCounts)
  const [bond, setBond] = useState<(number | null)[]>([])
  const [active, setActive] = useState(0)
  const [pad, setPad] = useState('')
  const [hintI, setHintI] = useState(0)
  const [picked, setPicked] = useState(false)
  const [found, setFound] = useState(0)
  const big = grade <= 3

  // görev değişince modeli kur
  useEffect(() => {
    const t = T.t
    setSides(t.kind === 'counters' ? Array.from({ length: t.n }, (_, i) => i < Math.ceil(t.n / 2)) : [])
    setCuts([])
    setCounts(emptyCounts())
    setBond(t.kind === 'bond' ? Array(t.parts).fill(null) : [])
    setActive(0)
    setPad('')
    setHintI(0)
    setPicked(false)
  }, [S.idx]) // eslint-disable-line react-hooks/exhaustive-deps

  const record = (key: string, label: string) => {
    if (sol.add(key, label)) {
      S.attempt(true)
      setFound((f) => f + 1)
      clear()
      const n = sol.list.length + 1
      if (n >= T.goal) S.complete()
      else show(n === 1 ? 'Harika bir yol! Şimdi başka bir yol bul.' : `${n} yol oldu! Başka bir yol var mı?`, { tone: 'ok' })
      return true
    }
    show('Bunu zaten buldun! Parçaları değiştirerek başka bir yol dene.')
    return false
  }

  // Blok modelinde toplam hedefe eşit olunca kendiliğinden kaydet
  const t = T.t
  const blockTotal = (['th', 'h', 't', 'o'] as Place[]).reduce((s, p) => s + counts[p] * PLACE[p].v, 0)
  useEffect(() => {
    if (t.kind !== 'blocks' || blockTotal !== t.n) return
    const used = t.places.filter((p) => counts[p] > 0)
    const words = used.map((p) => `${counts[p]} ${PLACE[p].name}`).join(' ')
    const sym = used.map((p) => tr(counts[p] * PLACE[p].v)).join(' + ')
    record(t.places.map((p) => counts[p]).join('-'), `${words} = ${sym}`)
  }, [blockTotal, counts]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveCounters = () => {
    if (t.kind !== 'counters') return
    const r = sides.filter(Boolean).length
    record(String(r), `${r} + ${t.n - r}`)
  }
  const saveTape = () => {
    if (t.kind !== 'tape') return
    if (cuts.length < t.parts - 1) {
      show(t.parts === 3 ? 'Üç parça için iki kesik gerekir. Şeride bir kez daha dokun.' : 'Önce şeride dokunarak bir kesik yap.')
      return
    }
    const s = [...cuts].sort((a, b) => a - b)
    const parts = [0, ...s, t.n].slice(1).map((b, i) => b - [0, ...s][i])
    const key = [...parts].sort((a, b) => a - b).join('+')
    if (!record(key, `${parts.map((p) => tr(p)).join(' + ')}`)) show('Bu parçaları zaten buldun (sıraları farklı olsa da parçalar aynı). Başka bir yerden kes!')
  }
  const saveBond = () => {
    if (t.kind !== 'bond') return
    if (bond.some((b) => b === null || b === 0)) {
      S.attempt(false)
      show('Her parça dairesine sıfırdan büyük bir sayı yaz.')
      return
    }
    const ps = bond as number[]
    const sum = ps.reduce((a, b) => a + b, 0)
    if (sum !== t.n) {
      S.attempt(false)
      const digits = String(t.n).split('').map(Number).filter((d) => d > 0)
      const misc = ps.every((p) => p < 10) && t.n >= 20 && ps.join() === digits.slice(0, ps.length).join() ? 'Sayının rakamlarını parça sandı (basamak değerini düşünmedi)' : undefined
      show(sum > t.n ? `Parçaların toplamı ${tr(sum)}; bütün ${tr(t.n)}. Parçalar bütünden büyük olabilir mi? Hangi parçayı küçültürsün?` : `Parçaların toplamı ${tr(sum)}; bütüne ulaşmak için ${tr(t.n)} gerekir. Hangi parçayı büyütürsün?`, { misc, tool: t.n <= 20 ? 'tenframe' : t.n <= 100 ? 'numberline' : undefined, toolConfig: t.n <= 20 ? { frames: 2 } : { min: 0, max: 100, step: 10 } })
      return
    }
    record([...ps].sort((a, b) => a - b).join('+'), `${tr(t.n)} = ${ps.map((p) => tr(p)).join(' + ')}`)
  }

  const hint = () => {
    S.hint()
    show(T.hints[Math.min(hintI, T.hints.length - 1)])
    setHintI((i) => i + 1)
  }

  const next = () => {
    if (S.last) {
      onFinish({
        stars: S.stars(),
        summary: `${tasks.length} sayıyı toplam ${found} farklı yolla parçaladın.`,
        insight:
          grade <= 1
            ? 'Bir sayı pek çok parçadan oluşur: 7 = 3 + 4 = 5 + 2 = 6 + 1. Bir parça büyüyünce diğeri küçülür, bütün aynı kalır.'
            : grade === 2
              ? 'Bir onluğu 10 birliğe kırmak sayıyı değiştirmez: 4 onluk 7 birlik = 3 onluk 17 birlik = 47. Bu, çıkarmada çok işe yarar!'
              : 'Aynı sayının pek çok adı vardır: yüzlükleri, binlikleri kırarak ya da sayıyı kolay parçalara ayırarak zihinden işlemi kolaylaştırırız.',
      })
      return
    }
    S.next()
    sol.reset()
    clear()
  }

  // ─── Model alanı
  let model: React.ReactNode = null
  let side: React.ReactNode = null
  if (t.kind === 'counters') {
    const r = sides.filter(Boolean).length
    const foundRed = new Set(sol.list.map((s) => Number(s.key)))
    model = (
      <div className="flex flex-col items-center gap-3">
        <Counters sides={sides} onFlip={(i) => setSides((s) => s.map((v, k) => (k === i ? !v : v)))} onShake={() => setSides((s) => s.map(() => Math.random() < 0.5))} />
        <p className="text-3xl font-black"><span className="text-red-500">{r}</span> + <span className="text-yellow-500 [text-shadow:0_1px_0_#a16207]">{t.n - r}</span> = {t.n}</p>
      </div>
    )
    side = (
      <>
        <NumberBond whole={t.n} parts={[r, t.n - r]} big />
        <button type="button" onClick={saveCounters} className="btn-primary min-h-14 w-full text-lg"><Save size={20} />Bu yolu kaydet</button>
        {sol.list.length >= 2 && (
          <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
            <p className="mb-1 text-sm font-black">Bulduğun yollar sırayla</p>
            <div className="grid grid-cols-2 gap-1 text-lg font-black sm:grid-cols-3">
              {Array.from({ length: t.n + 1 }, (_, k) => t.n - k).map((red) => (
                <span key={red} className={`rounded-lg px-2 py-0.5 text-center ${foundRed.has(red) ? 'bg-emerald-50 text-emerald-900' : 'bg-paper text-ink-soft/50'}`}>
                  {foundRed.has(red) ? `${red} + ${t.n - red}` : '? + ?'}
                </span>
              ))}
            </div>
          </div>
        )}
      </>
    )
  } else if (t.kind === 'tape') {
    const s = [...cuts].sort((a, b) => a - b)
    const parts = [0, ...s, t.n].slice(1).map((b, i) => b - [0, ...s][i])
    model = (
      <div>
        <Tape total={t.n} step={t.step} cuts={cuts} maxCuts={t.parts - 1} onChange={setCuts} />
        <p className="text-center text-sm font-bold text-ink-soft">Şeride dokun: kesik ekle · Kesiği sürükle: taşı · Kesiğe dokun: kaldır</p>
        <p className="mt-2 text-center text-3xl font-black">{tr(t.n)} = {parts.map((p, i) => <span key={i}>{i > 0 && ' + '}<span style={{ color: SEG[i % 3] }}>{tr(p)}</span></span>)}</p>
      </div>
    )
    side = <button type="button" onClick={saveTape} className="btn-primary min-h-14 w-full text-lg"><Save size={20} />Bu yolu kaydet</button>
  } else if (t.kind === 'blocks') {
    model = (
      <div>
        <BlockBuilder places={t.places} counts={counts} onChange={setCounts} big={big} />
        <p className={`mt-3 text-center text-2xl font-black ${blockTotal === t.n ? 'text-ok' : ''}`}>
          Toplam: {tr(blockTotal)} {blockTotal === t.n ? '✓' : <span className="text-base text-ink-soft">(hedef {tr(t.n)})</span>}
        </p>
      </div>
    )
    side = <div className="rounded-2xl bg-sky-50 p-3 text-sm font-bold text-sky-900 ring-1 ring-sky-200">Toplam {tr(t.n)} olunca yol kendiliğinden kaydedilir. Sonra bir bloğu kırıp yeni bir yol ara!</div>
  } else {
    const sum = bond.reduce<number>((a, b) => a + (b ?? 0), 0)
    const setVal = (v: string) => {
      setPad(v)
      setBond((bd) => bd.map((x, i) => (i === active ? (v ? parseNum(v) : null) : x)))
    }
    model = (
      <div className="flex flex-col items-center gap-2">
        <NumberBond whole={t.n} parts={bond} active={active} onPart={(i) => { setActive(i); setPad(bond[i] === null ? '' : String(bond[i])) }} big />
        <p className="text-2xl font-black">{tr(t.n)} = {bond.map((b, i) => <span key={i}>{i > 0 && ' + '}<span style={{ color: SEG[i] }}>{b === null ? '?' : tr(b)}</span></span>)}</p>
        <p className="text-sm font-bold text-ink-soft">Parçaların toplamı: {tr(sum)}</p>
      </div>
    )
    side = (
      <div className="rounded-2xl bg-white/95 p-3 ring-1 ring-line">
        <p className="mb-2 text-sm font-black">{active + 1}. parçaya sayı yaz (parçaya dokunarak seç)</p>
        <NumPad
          value={pad}
          onChange={setVal}
          onSubmit={() => {
            const nx = bond.findIndex((b, i) => i !== active && b === null)
            if (nx >= 0) {
              setActive(nx)
              setPad('')
            } else saveBond()
          }}
          submitLabel={bond.some((b, i) => i !== active && b === null) ? 'Sonraki' : 'Kaydet'}
          maxLen={String(t.n).length}
          big={big}
        />
      </div>
    )
  }

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={tasks.length}
      title={T.title}
      prompt={T.prompt}
      nudge={nudge}
      onCloseNudge={clear}
      done={S.done}
      doneBox={
        <DoneNote title={`${sol.list.length} farklı yol buldun!`} note={T.note}>
          {T.picker && !picked && <StrategyPicker question="Yeni yolları nasıl buldun?" options={T.picker} onPick={() => setPicked(true)} />}
          <p className="mt-2 text-sm font-bold text-green-800">İstersen başka yollar bulmaya devam edebilirsin.</p>
        </DoneNote>
      }
      onNext={next}
      onHint={hint}
      panel={
        <>
          {side}
          <SolutionList list={sol.list} goal={T.goal} />
        </>
      }
    >
      <div className="mb-3 flex items-center justify-center gap-2">
        <span className="rounded-2xl bg-ink px-4 py-1 text-sm font-black text-white">Bütün: {tr(t.n)}</span>
        <span className="rounded-2xl bg-white px-3 py-1 text-sm font-black ring-1 ring-line">Hedef: {T.goal} farklı yol</span>
      </div>
      {model}
    </ActivityLayout>
  )
}
