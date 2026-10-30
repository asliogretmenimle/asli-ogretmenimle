import { useMemo } from 'react'
import type { InteractionProps } from '../types'
import { divisors, gcd, smallestPrimeFactor } from '../../lib/numberTheory'
import { ek } from '../../lib/generators'
import { pick, rng } from '../donusum-studyosu/ortak'
import { DivisorBoard, FactorBoard, SignBoard, Theater, num, type Act, type Beat, type Cast } from './sahne'

/**
 * 80. EBOB Tiyatrosu (8. sınıf, Çarpanlar ve Katlar)
 * Kurallar önce söylenmez: her perdede sayı oyuncuları bir durum canlandırır, seyirci (öğrenci) tahmin eder,
 * kural seyircinin cevabından türeyerek Kural Defteri’ne yazılır.
 *  1. Ortak bölenler → EBOB; ortak bölenler EBOB’un bölenleridir
 *  2. Biri diğerini bölüyorsa EBOB küçük sayıdır
 *  3. Aralarında asal (8 ve 15, ardışık 14 ve 15) → EBOB 1
 *  4. EBOB küçük sayıdan büyük olamaz (kendini EBOB sanan 36)
 *  5. Asal çarpanlarla EBOB: ortakların en küçük üslüleri
 *  6. Final: yönetmen seyirci; rastgele iki çift için uygun kuralı seçip EBOB’u bulur
 */

const director: Cast = { name: 'EBOB Hanım', label: 'EBOB', color: '#f472b6', kind: 'director' }

/** EBOB sayı sorusu için düşündüren ipucu */
const ebobHint = (a: number, b: number) => (v: number) => {
  const lo = Math.min(a, b)
  if (v <= 0) return 'EBOB iki sayıyı da tam bölen bir sayı olmalı. 0 bir sayıyı bölebilir mi? Her sayıyı bölen sayı hangisi?'
  if (v > lo) return `EBOB, ${ek(lo, 'acc')} de bölmeli. ${ek(lo, 'acc')} bölen bir sayı ${ek(lo, 'abl')} büyük olabilir mi?`
  if (a % v || b % v) {
    const x = a % v ? a : b
    return `${v}, ${ek(x, 'acc')} tam böler mi? ${x} ÷ ${v} işleminde kalan var mı?`
  }
  return `${v} ortak bölen, güzel! Ama ikisini de bölen daha büyük bir sayı var mı?`
}
const ebobMis = (a: number, b: number) => (v: number) =>
  v === Math.max(a, b) || (v > Math.min(a, b) && v % a === 0 && v % b === 0) ? 'EBOB ile EKOK’u (ortak kat) karıştırdı' : v === a * b ? 'EBOB’u sayıların çarpımı sandı' : undefined

const RULES = [
  { id: 'ortak', label: 'Ortak bölenleri listelerim, en büyüğünü seçerim' },
  { id: 'bolen', label: 'Biri diğerini bölüyor → EBOB küçük sayı' },
  { id: 'asal', label: 'Aralarında asal → EBOB = 1' },
  { id: 'carpan', label: 'Asal çarpanlar: ortakların en küçük üslüleri' },
]

type Kind = 'bolen' | 'asal' | 'genel'
const SPECIAL: [number, number, Kind][] = [[9, 36, 'bolen'], [7, 35, 'bolen'], [13, 39, 'bolen'], [16, 27, 'asal'], [21, 22, 'asal'], [25, 36, 'asal']]
const GENERAL: [number, number, Kind][] = [[24, 36, 'genel'], [20, 30, 'genel'], [18, 24, 'genel'], [28, 42, 'genel'], [30, 45, 'genel']]

function finalRound(a: number, b: number, kind: Kind, first: boolean): Beat[] {
  const g = gcd(a, b)
  const cast = [director, num(a), num(b)]
  const accept = kind === 'bolen' ? ['bolen'] : kind === 'asal' ? ['asal'] : ['ortak', 'carpan']
  const ruleHint = (id: string) => {
    if (id === 'bolen' && kind !== 'bolen') return `${b} ÷ ${a} tam bölünüyor mu? ${a} × ${Math.floor(b / a)} = ${a * Math.floor(b / a)}, ${a} × ${Math.floor(b / a) + 1} = ${a * (Math.floor(b / a) + 1)}.`
    if (id === 'asal' && kind !== 'asal') return `İkisini de bölen 1’den büyük bir sayı var mı? ${ek(smallestPrimeFactor(g), 'dat')} bölmeyi dene.`
    if (kind === 'bolen') return `Bu yol da EBOB’u bulur ama daha kısa bir yol var: ${b} ÷ ${a} işlemine bak. Aralarında özel bir ilişki görüyor musun?`
    return `Bu yol da çalışır ama daha kısası var: ${a} ile ${b} ardışık mı ya da 1’den başka ortak bölenleri var mı?`
  }
  return [
    { t: 'line', who: 0, cast, text: first ? `Son perde! Bu kez yönetmen sensin. Sahneye ${a} ve ${b} çıkıyor. Hangi kural işimizi en çabuk görür?` : `Harika yönettin! Şimdi de ${a} ve ${b} sahnede.`, board: <SignBoard title="Yeni oyuncular" lines={[{ text: `${a} ve ${b}` }]} /> },
    { t: 'ask', who: 0, ask: { kind: 'choice', prompt: `${a} ve ${b} için EBOB’u bulmanın en kısa yolu hangisi?`, options: RULES, answer: accept, hint: ruleHint, ok: 'Doğru kural seçildi! Şimdi hesaplayalım.' } },
    { t: 'ask', who: 0, ask: { kind: 'number', prompt: `EBOB(${a}, ${b}) kaç?`, answer: g, hint: ebobHint(a, b), misconception: ebobMis(a, b), ok: `EBOB(${a}, ${b}) = ${g}. Sahne alkışlarla inliyor!` } },
    { t: 'line', who: 1, text: kind === 'asal' ? 'Ortak hediyemiz yalnızca 1: biz aralarında asalız!' : `Hediyemiz ${g}! Ortak bölenlerimizin hepsi ${ek(g, 'acc')} bölüyor.`, board: <DivisorBoard rows={[{ n: a, list: divisors(a) }, { n: b, list: divisors(b) }]} mark={divisors(g)} crown={g} /> },
  ]
}

function makeActs(): Act[] {
  const r = rng(Date.now() % 100000)
  const [sa, sb, sk] = pick(SPECIAL, r)
  const [ga, gb, gk] = pick(GENERAL, r)
  const d12 = { n: 12, list: divisors(12) }
  const d18 = { n: 18, list: divisors(18) }
  const rows2 = (a: number, b: number) => [{ n: a, list: divisors(a) }, { n: b, list: divisors(b) }]

  return [
    {
      title: 'Ortak hediye',
      cast: [director, num(12), num(18)],
      beats: [
        { t: 'line', who: 0, text: 'Hoş geldiniz! Ben EBOB Hanım, bu sahnenin yönetmeniyim. Bu akşam iki oyuncumuz birlikte taşıyabilecekleri ortak bir hediye arıyor.' },
        { t: 'line', who: 1, text: 'Ben 12. Beni tam bölen sayılar benim aksesuarlarım: 1, 2, 3, 4, 6 ve 12!', board: <DivisorBoard rows={[d12]} /> },
        { t: 'line', who: 2, text: 'Ben de 18’im. Benim aksesuarlarım: 1, 2, 3, 6, 9 ve 18.', board: <DivisorBoard rows={[d12, d18]} /> },
        { t: 'line', who: 0, text: 'Hediye ikisinin de aksesuarı olmalı. Sevgili seyirci, bize yardım eder misin?' },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'multi', prompt: '12 ile 18’in ikisinde de bulunan aksesuarlara (ortak bölenlere) dokun.', options: [1, 2, 3, 4, 6, 9, 12, 18], answer: [1, 2, 3, 6],
            hint: (p) => {
              const extra = p.find((x) => 12 % x || 18 % x)
              if (extra) return `${extra}, ${12 % extra ? '12’yi' : '18’i'} tam böler mi? Ortak aksesuar ikisinde de olmalı.`
              if (!p.includes(1)) return '1’i unuttun mu? 1 her sayıyı tam böler mi?'
              return 'Bir ortak aksesuarı kaçırdın. İki satırda da görünen sayıları tek tek kontrol et.'
            },
            ok: 'Ortak bölenler: 1, 2, 3 ve 6.',
          },
        },
        { t: 'line', who: 1, text: 'Ortak aksesuarlarımız 1, 2, 3 ve 6. Hangisini hediye seçelim, yönetmenim?', board: <DivisorBoard rows={[d12, d18]} mark={[1, 2, 3, 6]} /> },
        { t: 'ask', who: 0, ask: { kind: 'number', prompt: 'En değerli hediye ortak bölenlerin en büyüğü. O hangisi?', answer: 6, hint: ebobHint(12, 18), misconception: ebobMis(12, 18), ok: 'Ortak bölenlerin en büyüğü 6.' } },
        { t: 'line', who: 0, text: 'İşte hediyemiz: En Büyük Ortak Bölen, kısaca EBOB! EBOB(12, 18) = 6.', board: <DivisorBoard rows={[d12, d18]} mark={[1, 2, 3, 6]} crown={6} /> },
        { t: 'line', who: 2, text: 'Bir şey fark ettim: ortak aksesuarlarımız 1, 2, 3 ve 6… Bunlar 6’nın da aksesuarları değil mi?' },
        {
          t: 'ask', who: 0,
          ask: { kind: 'choice', prompt: '1, 2, 3 ve 6 sayılarının hepsi 6’yı tam böler mi?', options: [{ id: 'evet', label: 'Evet, hepsi 6’nın böleni' }, { id: 'hayir', label: 'Hayır, bazıları 6’yı bölmez' }], answer: 'evet', hint: () => '6 ÷ 1, 6 ÷ 2, 6 ÷ 3 ve 6 ÷ 6 işlemlerine bak: kalan var mı?', ok: 'Hepsi 6’yı böler: ortak bölenler EBOB’un bölenleridir.' },
        },
        { t: 'rule', rule: { id: 'tanim', title: 'EBOB, ortak bölenlerin en büyüğüdür', text: 'İki sayıyı da tam bölen sayılar ortak bölenlerdir; bunların en büyüğü EBOB’dur. Bütün ortak bölenler EBOB’un da bölenidir.', example: 'EBOB(12, 18) = 6 · ortak bölenler 1, 2, 3, 6 → hepsi 6’yı böler' } },
      ],
    },
    {
      title: 'Küçük sayı büyüğü bölerse',
      cast: [director, num(8), num(24)],
      beats: [
        { t: 'line', who: 1, text: 'Ben 8. Arkadaşım 24’ü tam bölerim: 24 = 8 × 3!' },
        { t: 'line', who: 2, text: 'Doğru, 8 benim aksesuarlarımdan biri.', board: <DivisorBoard rows={rows2(8, 24)} /> },
        { t: 'ask', who: 0, ask: { kind: 'number', prompt: 'Peki EBOB(8, 24) kaç?', answer: 8, hint: (v) => (v === 24 ? '24, 8’i tam bölebilir mi? EBOB ikisini de bölmeli.' : ebobHint(8, 24)(v)), misconception: (v) => (v === 24 ? 'EBOB’u büyük sayı sandı' : undefined), ok: 'EBOB(8, 24) = 8.' } },
        { t: 'line', who: 0, text: '8’in bütün aksesuarları 24’te de var! Yani 8’in kendisi en büyük ortak bölen.', board: <DivisorBoard rows={rows2(8, 24)} mark={divisors(8)} crown={8} /> },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', prompt: 'Bir sayı (a) diğerini (b) tam bölüyorsa EBOB(a, b) her zaman nedir?',
            options: [{ id: 'kucuk', label: 'Küçük sayı (a)' }, { id: 'buyuk', label: 'Büyük sayı (b)' }, { id: 'carpim', label: 'a × b' }, { id: 'bir', label: '1' }],
            answer: 'kucuk',
            hint: (id) => (id === 'buyuk' ? 'Büyük sayı küçük sayıyı bölebilir mi? EBOB(8, 24) için 24, 8’i böler mi?' : id === 'carpim' ? '8 × 24 = 192. 192, 8’i böler mi?' : '1 her zaman ortak bölendir ama en büyüğü mü? EBOB(8, 24)’e bak.'),
            misconception: (id) => (id === 'buyuk' ? 'EBOB’u büyük sayı sandı' : id === 'carpim' ? 'EBOB’u sayıların çarpımı sandı' : undefined),
            ok: 'Evet: küçük sayının bütün bölenleri büyük sayıda da var.',
          },
        },
        { t: 'rule', rule: { id: 'bolen', title: 'Biri diğerini bölüyorsa EBOB küçük sayıdır', text: 'a sayısı b’yi tam bölüyorsa a’nın bütün bölenleri b’nin de bölenidir; bu yüzden EBOB(a, b) = a.', example: 'EBOB(8, 24) = 8 · EBOB(7, 35) = 7' } },
      ],
    },
    {
      title: 'Ortak hediyesi olmayanlar',
      cast: [director, num(8), num(15)],
      beats: [
        { t: 'line', who: 1, text: 'Ben 8. Aksesuarlarım 1, 2, 4 ve 8.', board: <DivisorBoard rows={rows2(8, 15)} /> },
        { t: 'line', who: 2, text: 'Ben 15. Benimkiler 1, 3, 5 ve 15. İkimiz de asal değiliz; kesin büyük bir ortak hediyemiz vardır!' },
        { t: 'ask', who: 0, ask: { kind: 'number', prompt: 'Sevgili seyirci, EBOB(8, 15) kaç?', answer: 1, hint: ebobHint(8, 15), misconception: (v) => (v === 0 ? 'Ortak bölen yoksa EBOB’u 0 sandı' : undefined), ok: 'Tek ortak aksesuar 1: EBOB(8, 15) = 1.' } },
        { t: 'line', who: 0, text: 'Yalnızca 1 ortak! 1’den başka ortak böleni olmayan sayılara aralarında asal sayılar diyoruz. Dikkat: 8 de 15 de asal değil!', board: <DivisorBoard rows={rows2(8, 15)} mark={[1]} crown={1} /> },
        { t: 'line', who: 1, cast: [director, num(14), num(15)], text: 'Biz de ardışık sayılarız: 14 ve 15. Hep yan yana dururuz!', board: <DivisorBoard rows={rows2(14, 15)} /> },
        { t: 'ask', who: 0, ask: { kind: 'number', prompt: 'EBOB(14, 15) kaç?', answer: 1, hint: ebobHint(14, 15), misconception: (v) => (v === 0 ? 'Ortak bölen yoksa EBOB’u 0 sandı' : undefined), ok: 'EBOB(14, 15) = 1.' } },
        {
          t: 'ask', who: 2,
          ask: {
            kind: 'choice', prompt: 'Ardışık iki sayının 1’den büyük bir ortak böleni olabilir mi?',
            options: [{ id: 'hayir', label: 'Hayır, hiçbir zaman' }, { id: 'evet', label: 'Evet, bazen olabilir' }], answer: 'hayir',
            hint: () => 'Bir sayı 14’ü de 15’i de bölseydi, aradaki farkı (15 − 14 = 1) da bölmesi gerekirdi. 1’i bölen, 1’den büyük bir sayı var mı?',
            misconception: () => 'Ardışık sayıların 1’den büyük ortak böleni olabileceğini düşündü',
            ok: 'Ardışık iki sayının tek ortak böleni 1’dir.',
          },
        },
        { t: 'rule', rule: { id: 'asal', title: 'Aralarında asal sayıların EBOB’u 1’dir', text: '1’den başka ortak böleni olmayan sayılar aralarında asaldır: EBOB = 1. Sayıların kendilerinin asal olması gerekmez! Ardışık iki sayı her zaman aralarında asaldır.', example: 'EBOB(8, 15) = 1 · EBOB(14, 15) = 1' } },
      ],
    },
    {
      title: 'Kendini EBOB sanan 36',
      cast: [director, num(12), num(18), num(36, 'confused')],
      beats: [
        { t: 'line', who: 3, text: 'Durun durun! EBOB(12, 18) benim: ben 36’yım, kocaman bir sayıyım!', board: <SignBoard title="36’nın iddiası" lines={[{ text: 'EBOB(12, 18) = 36 ?' }]} /> },
        { t: 'line', who: 1, text: 'Hmm… 36 benim aksesuarlarım arasında hiç yoktu.' },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', prompt: 'Seyirci, 36’ya nasıl itiraz edersin?',
            options: [
              { id: 'bolmez', label: '36, 12’yi ve 18’i tam bölmez; EBOB ikisini de bölmeli.' },
              { id: 'basamak', label: '36 iki basamaklı; EBOB tek basamaklı olmalı.' },
              { id: 'kat', label: '36, ikisinin de katı; bu yüzden EBOB’dur.' },
              { id: 'carpim', label: '36 = 12 × 3, yani doğru söylüyor.' },
            ],
            answer: 'bolmez',
            hint: (id) => (id === 'basamak' ? 'EBOB(24, 36) = 12 ve iki basamaklı. Basamak sayısı mı önemli, bölmek mi?' : id === 'kat' ? '36 ortak bir KAT. EBOB ise ortak BÖLEN olmalı: 36, 12’yi böler mi?' : '36, 12’nin katı. Peki 36, 12’yi tam böler mi?'),
            misconception: (id) => (id === 'kat' ? 'EBOB ile EKOK’u (ortak kat) karıştırdı' : undefined),
            ok: 'Haklısın: 36 ne 12’yi ne de 18’i böler.',
          },
        },
        { t: 'line', who: 3, text: 'Eyvah… Ben ortak katım, ortak bölen değilim! Galiba yanlış tiyatroya geldim, beni EKOK Tiyatrosu’na yollayın.', board: <SignBoard title="36’nın iddiası" lines={[{ text: 'EBOB(12, 18) = 36', tone: 'bad' }, { text: 'EBOB(12, 18) = 6', tone: 'ok' }]} /> },
        { t: 'ask', who: 0, ask: { kind: 'number', prompt: 'Hiç hesaplamadan söyle: EBOB(12, 18) en fazla kaç olabilir?', answer: 12, hint: (v) => (v > 12 ? 'EBOB, 12’yi bölmek zorunda. 12’yi bölen bir sayı 12’den büyük olabilir mi?' : 'Daha büyük bir sınır olabilir mi? Mesela EBOB(12, 24) kaç? 12’nin kendisi 12’yi böler mi?'), ok: 'EBOB hiçbir zaman küçük sayıyı (12) geçemez.' } },
        { t: 'rule', rule: { id: 'kucuk', title: 'EBOB küçük sayıdan büyük olamaz', text: 'EBOB iki sayıyı da böler; bir sayıyı bölen sayı o sayıdan büyük olamaz. Bu yüzden EBOB ≤ küçük sayı. Büyük sayıdan büyük olanlar EKOK Tiyatrosu’nun oyuncularıdır!', example: 'EBOB(12, 18) ≤ 12 · gerçekte 6' } },
      ],
    },
    {
      title: 'Asal çarpan kostümleri',
      cast: [director, num(12), num(18)],
      beats: [
        { t: 'line', who: 0, text: 'Şimdi oyuncularımız asal çarpan kostümlerini giyiyor. Kostümler sayıları en küçük parçalarına ayırıyor.', board: <FactorBoard a={12} b={18} /> },
        { t: 'line', who: 1, text: 'Ben 2 · 2 · 3, yani 2² · 3’üm.' },
        { t: 'line', who: 2, text: 'Ben de 2 · 3 · 3, yani 2 · 3²’yim.' },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', cols: 2, prompt: 'EBOB ikisini de bölmeli. EBOB’un içine en fazla kaç tane 2 koyabiliriz?',
            options: [{ id: '0', label: '0' }, { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }], answer: '1',
            hint: (id) => (id === '2' ? '2 · 2 = 4. 4, 18’i tam böler mi?' : id === '3' ? '12’de kaç tane 2 var? 18’de kaç tane?' : '2, hem 12’yi hem 18’i böler mi?'),
            misconception: (id) => (id === '2' ? 'EBOB için en büyük üssü aldı' : undefined),
            ok: '18’de yalnızca bir tane 2 var; EBOB’a bir tane 2 girer.',
          },
        },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', cols: 2, prompt: 'Peki kaç tane 3 koyabiliriz?',
            options: [{ id: '0', label: '0' }, { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }], answer: '1',
            hint: (id) => (id === '2' ? '3 · 3 = 9. 9, 12’yi tam böler mi?' : id === '3' ? '12’de kaç tane 3 var?' : '3, hem 12’yi hem 18’i böler mi?'),
            misconception: (id) => (id === '2' ? 'EBOB için en büyük üssü aldı' : undefined),
            ok: '12’de yalnızca bir tane 3 var; EBOB’a bir tane 3 girer.',
          },
        },
        { t: 'line', who: 0, text: 'İkisinde de bulunan kadarını aldık: ortak çarpanların en küçük üslüleri.', board: <FactorBoard a={12} b={18} take="min" /> },
        { t: 'ask', who: 0, ask: { kind: 'number', prompt: 'O hâlde EBOB(12, 18) = 2 · 3 = ?', answer: 6, hint: () => '2 ile 3’ü çarp.', ok: '2 · 3 = 6.' } },
        { t: 'line', who: 2, text: '1. perdedeki hediyeyle aynı! Yol farklı, sonuç aynı.' },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', prompt: 'Büyük sayılarda dener misin? a = 2³ · 3² · 5 ve b = 2² · 3⁴ · 7 ise EBOB(a, b) hangisi?',
            options: [{ id: 'dogru', label: '2² · 3²' }, { id: 'ekok', label: '2³ · 3⁴ · 5 · 7' }, { id: 'buyuk', label: '2³ · 3⁴' }, { id: 'hepsi', label: '2² · 3² · 5 · 7' }],
            answer: 'dogru',
            hint: (id) => (id === 'ekok' ? 'Bu, bütün çarpanların en büyük üslüleri. EBOB iki sayıyı da bölmeli: 2³, b’yi böler mi?' : id === 'buyuk' ? 'b’de kaç tane 2 var? 2³, b’yi böler mi?' : '5, b’yi böler mi? Ortak olmayan çarpanlar EBOB’a girebilir mi?'),
            misconception: (id) => (id === 'ekok' ? 'EBOB yerine EKOK’u buldu' : id === 'buyuk' ? 'EBOB için en büyük üssü aldı' : 'Ortak olmayan asal çarpanları EBOB’a kattı'),
            ok: 'Ortak asal çarpanlar 2 ve 3; en küçük üsleriyle: 2² · 3².',
          },
        },
        { t: 'rule', rule: { id: 'carpan', title: 'Asal çarpanlarla EBOB', text: 'Sayıları asal çarpanlarına ayır; yalnızca ortak asal çarpanları al, her birinin en küçük üslüsünü seç ve çarp.', example: '12 = 2² · 3, 18 = 2 · 3² → EBOB = 2 · 3 = 6' } },
        { t: 'strategy', question: 'EBOB bulurken hangi yolu daha çok seviyorsun?', options: ['Ortak bölenleri listelerim', 'Asal çarpanlara ayırırım', 'Önce özel durumlara bakarım (bölüyor mu, ardışık mı?)'] },
      ],
    },
    {
      title: 'Yönetmen sensin!',
      cast: [director, num(sa), num(sb)],
      beats: [...finalRound(sa, sb, sk, true), ...finalRound(ga, gb, gk, false)],
    },
  ]
}

export default function EbobTiyatrosu({ grade, onFinish }: InteractionProps) {
  const acts = useMemo(makeActs, [])
  return (
    <Theater
      grade={grade}
      acts={acts}
      emoji="🎭"
      playTitle="EBOB Tiyatrosu"
      onFinish={onFinish}
      finish={{
        summary: (rules, asks) => `${rules} EBOB kuralını Kural Defteri’ne yazdın ve ${asks} seyirci sorusunu yanıtladın.`,
        insight: 'EBOB, ortak bölenlerin en büyüğüdür ve bütün ortak bölenler EBOB’u böler. Biri diğerini bölüyorsa EBOB küçük sayıdır; aralarında asal sayıların EBOB’u 1’dir; EBOB hiçbir zaman küçük sayıyı geçemez. Asal çarpanlarla EBOB, ortak çarpanların en küçük üslüleriyle bulunur.',
      }}
    />
  )
}
