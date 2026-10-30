import { useMemo } from 'react'
import type { InteractionProps } from '../types'
import { gcd, lcm } from '../../lib/numberTheory'
import { ek, gen } from '../../lib/generators'
import { pick, rng } from '../donusum-studyosu/ortak'
import { FactorBoard, SignBoard, StepsBoard, Theater, num, type Act, type Beat, type Cast } from '../ebob-tiyatrosu/sahne'

/**
 * 81. EKOK Tiyatrosu (8. sınıf, Çarpanlar ve Katlar) — EBOB Tiyatrosu’nun sahne motorunu kullanır.
 *  1. Kat basamakları: 4 ve 6’nın ilk ortak basamağı → EKOK; ortak katlar EKOK’un katlarıdır
 *  2. Biri diğerinin katıysa EKOK büyük sayıdır (5 ve 20)
 *  3. Aralarında asal sayıların EKOK’u çarpımlarıdır (4 ve 9)
 *  4. EKOK büyük sayıdan küçük olamaz (kendini EKOK sanan 4)
 *  5. Konuk EBOB Hanım: EBOB × EKOK = a × b
 *  6. Asal çarpanlarla EKOK: bütün çarpanların en büyük üslüleri
 *  7. Final: yönetmen seyirci; rastgele iki çift için uygun kuralı seçip EKOK’u bulur
 */

const director: Cast = { name: 'EKOK Bey', label: 'EKOK', color: '#38bdf8', kind: 'director' }
const guest: Cast = { name: 'EBOB Hanım', label: 'EBOB', color: '#f472b6', kind: 'guest' }

/** EKOK sayı sorusu için düşündüren ipucu */
const lcmHint = (a: number, b: number) => (v: number) => {
  const hi = Math.max(a, b)
  if (v <= 0) return 'EKOK, iki sayının da katı olan 0’dan büyük en küçük sayıdır. 0’dan büyük bir ortak kat ara.'
  if (v < hi) return `EKOK, ${gen(hi)} katı olmalı. ${gen(hi)} katları ${ek(hi, 'abl')} küçük olabilir mi?`
  if (v % a || v % b) {
    const x = v % a ? a : b
    return `${v}, ${gen(x)} katı mı? ${v} ÷ ${x} işleminde kalan var mı?`
  }
  return `${v} bir ortak kat, güzel! Ama daha küçük bir ortak kat var mı? ${gen(hi)} katlarını sırayla dene.`
}
const lcmMis = (a: number, b: number) => (v: number) =>
  v === gcd(a, b) && v !== lcm(a, b) ? 'EKOK yerine EBOB’u buldu' : v === a * b && v !== lcm(a, b) ? 'EKOK’u her zaman sayıların çarpımı sandı' : v === a + b ? 'EKOK için sayıları topladı' : undefined

const RULES = [
  { id: 'liste', label: 'Katları listelerim, ilk ortak katı seçerim' },
  { id: 'kat', label: 'Büyük sayı küçüğün katı → EKOK büyük sayı' },
  { id: 'asal', label: 'Aralarında asal → EKOK = çarpımları' },
  { id: 'carpan', label: 'Asal çarpanlar: hepsinin en büyük üslüleri' },
]

type Kind = 'kat' | 'asal' | 'genel'
const SPECIAL: [number, number, Kind][] = [[6, 18, 'kat'], [7, 21, 'kat'], [9, 36, 'kat'], [5, 8, 'asal'], [9, 10, 'asal'], [4, 15, 'asal']]
const GENERAL: [number, number, Kind][] = [[8, 12, 'genel'], [10, 15, 'genel'], [12, 20, 'genel'], [6, 10, 'genel'], [14, 21, 'genel']]

function finalRound(a: number, b: number, kind: Kind, first: boolean): Beat[] {
  const L = lcm(a, b)
  const cast = [director, num(a), num(b)]
  const accept = kind === 'kat' ? ['kat'] : kind === 'asal' ? ['asal'] : ['liste', 'carpan']
  const ruleHint = (id: string) => {
    if (id === 'kat' && kind !== 'kat') return `${b}, ${gen(a)} katı mı? ${b} ÷ ${a} işleminde kalan var mı?`
    if (id === 'asal' && kind !== 'asal') return `${a} ile ${b} aralarında asal mı? İkisini de bölen 1’den büyük bir sayı ara: ${ek(gcd(a, b), 'acc')} dene.`
    if (kind === 'kat') return `Bu yol da EKOK’u bulur ama daha kısası var: ${b} ÷ ${a} işlemine bak. Aralarında özel bir ilişki görüyor musun?`
    return `Bu yol da çalışır ama daha kısası var: ${a} ile ${b} arasında 1’den başka ortak bölen var mı?`
  }
  return [
    { t: 'line', who: 0, cast, text: first ? `Son perde! Bu kez yönetmen sensin. Sahneye ${a} ve ${b} çıkıyor. Hangi kural işimizi en çabuk görür?` : `Harika yönettin! Şimdi de ${a} ve ${b} sahnede.`, board: <SignBoard title="Yeni oyuncular" lines={[{ text: `${a} ve ${b}` }]} /> },
    { t: 'ask', who: 0, ask: { kind: 'choice', prompt: `${a} ve ${b} için EKOK’u bulmanın en kısa yolu hangisi?`, options: RULES, answer: accept, hint: ruleHint, ok: 'Doğru kural seçildi! Şimdi hesaplayalım.' } },
    { t: 'ask', who: 0, ask: { kind: 'number', prompt: `EKOK(${a}, ${b}) kaç?`, answer: L, hint: lcmHint(a, b), misconception: lcmMis(a, b), ok: `EKOK(${a}, ${b}) = ${L}. Sahne alkışlarla inliyor!` } },
    { t: 'line', who: 2, text: `İlk buluşmamız ${L}. basamakta: ${L} ÷ ${a} = ${L / a}, ${L} ÷ ${b} = ${L / b}. İkimizin de tam katı!`, board: <SignBoard title="Buluşma" lines={[{ text: `EKOK(${a}, ${b}) = ${L}`, tone: 'ok' }, { text: `${L} = ${a} × ${L / a}` }, { text: `${L} = ${b} × ${L / b}` }]} /> },
  ]
}

function makeActs(): Act[] {
  const r = rng(Date.now() % 100000)
  const [sa, sb, sk] = pick(SPECIAL, r)
  const [ga, gb, gk] = pick(GENERAL, r)

  return [
    {
      title: 'Kat basamakları',
      cast: [director, num(4), num(6)],
      board: <StepsBoard a={4} b={6} upTo={36} reachA={0} reachB={0} />,
      beats: [
        { t: 'line', who: 0, text: 'İyi akşamlar! Ben EKOK Bey. Bu sahnede oyuncular katlarıyla dans eder: her biri kendi adım boyuyla basamak basamak ilerler.' },
        { t: 'line', who: 1, text: 'Ben 4. Dörder adım atarım: 4, 8…', board: <StepsBoard a={4} b={6} upTo={36} reachA={8} reachB={0} /> },
        { t: 'line', who: 2, text: 'Ben 6. Altışar adım atarım: 6…', board: <StepsBoard a={4} b={6} upTo={36} reachA={8} reachB={6} /> },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'number', prompt: 'Seyirci, tahmin et: 4 ile 6 ilk kez hangi basamağa birlikte basacak?', answer: 12,
            hint: (v) => (v === 24 ? '24’te ikisi de basar, doğru! Ama daha önce birlikte bastıkları bir basamak var mı?' : v === 2 ? '2 ikisini de böler; ama burada ikisinin de ULAŞTIĞI basamağı arıyoruz.' : lcmHint(4, 6)(v)),
            misconception: (v) => (v === 2 ? 'EKOK yerine EBOB’u buldu' : v === 24 ? 'EKOK’u her zaman sayıların çarpımı sandı' : undefined),
            ok: 'İlk ortak basamak 12.',
          },
        },
        { t: 'line', who: 0, text: 'Bakalım! İkisi de 12’de, 24’te ve 36’da buluşuyor. İlk buluşma 12: En Küçük Ortak Kat, kısaca EKOK! EKOK(4, 6) = 12.', board: <StepsBoard a={4} b={6} upTo={36} reachA={36} reachB={36} mark /> },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', prompt: 'Buluşma basamakları 12, 24, 36… Bunların hepsi hangi sayının katları?',
            options: [{ id: '12', label: '12’nin katları' }, { id: '10', label: '10’un katları' }, { id: '24', label: '24’ün katları' }, { id: 'yok', label: 'Hiçbir düzeni yok' }], answer: '12',
            hint: (id) => (id === '10' ? '20 ve 30 bir buluşma basamağı mı? Sahneye bak.' : id === '24' ? '12 de bir buluşma basamağı. 12, 24’ün katı mı?' : '12, 24 ve 36 arasındaki farklara bak.'),
            ok: 'Bütün buluşmalar 12’nin katı: 12, 24, 36…',
          },
        },
        { t: 'rule', rule: { id: 'tanim', title: 'EKOK, ortak katların en küçüğüdür', text: 'İki sayının da katı olan sayılar ortak katlardır; bunların 0’dan büyük en küçüğü EKOK’tur. Bütün ortak katlar EKOK’un katıdır.', example: 'EKOK(4, 6) = 12 · ortak katlar 12, 24, 36… hepsi 12’nin katı' } },
      ],
    },
    {
      title: 'Büyük adımlı dansçı',
      cast: [director, num(5), num(20)],
      beats: [
        { t: 'line', who: 1, text: 'Ben 5. Beşer adım atarım: 5, 10, 15, 20…', board: <StepsBoard a={5} b={20} upTo={40} reachA={40} reachB={0} /> },
        { t: 'line', who: 2, text: 'Ben 20’yim. Tek adımda 20. basamaktayım; çünkü 20 = 5 × 4!', board: <StepsBoard a={5} b={20} upTo={40} reachA={40} reachB={40} /> },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'number', prompt: 'EKOK(5, 20) kaç?', answer: 20,
            hint: (v) => (v === 100 ? '100 bir ortak kat ama daha küçüğü var mı? 20, 5’in katı mı?' : v === 5 ? '5, 20’nin katı mı? EKOK ikisinin de katı olmalı.' : lcmHint(5, 20)(v)),
            misconception: (v) => (v === 100 ? 'EKOK’u her zaman sayıların çarpımı sandı' : v === 5 ? 'EKOK yerine EBOB’u buldu' : undefined),
            ok: 'EKOK(5, 20) = 20.',
          },
        },
        { t: 'line', who: 0, text: '20’nin bastığı her basamağa 5 de basıyor. İlk buluşma 20’nin kendisi!', board: <StepsBoard a={5} b={20} upTo={40} reachA={40} reachB={40} mark /> },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', prompt: 'b sayısı a’nın katıysa EKOK(a, b) her zaman nedir?',
            options: [{ id: 'buyuk', label: 'Büyük sayı (b)' }, { id: 'kucuk', label: 'Küçük sayı (a)' }, { id: 'carpim', label: 'a × b' }, { id: 'bir', label: '1' }], answer: 'buyuk',
            hint: (id) => (id === 'kucuk' ? 'Küçük sayı, büyük sayının katı olabilir mi? 5, 20’nin katı mı?' : id === 'carpim' ? '5 × 20 = 100 bir ortak kat ama en küçüğü mü?' : '1, 5’in katı mı? EKOK iki sayının da katı olmalı.'),
            misconception: (id) => (id === 'kucuk' || id === 'bir' ? 'EKOK yerine EBOB’u düşündü' : id === 'carpim' ? 'EKOK’u her zaman sayıların çarpımı sandı' : undefined),
            ok: 'Evet: büyük sayı zaten küçüğün katı, daha küçük bir ortak kat olamaz.',
          },
        },
        { t: 'rule', rule: { id: 'kat', title: 'Biri diğerinin katıysa EKOK büyük sayıdır', text: 'b sayısı a’nın katıysa b zaten iki sayının da katıdır ve b’den küçük bir katı olamaz; bu yüzden EKOK(a, b) = b.', example: 'EKOK(5, 20) = 20 · EKOK(7, 21) = 21' } },
      ],
    },
    {
      title: 'Ortak böleni olmayan dansçılar',
      cast: [director, num(4), num(9)],
      beats: [
        { t: 'line', who: 1, text: 'Ben 4. Dörder adım atarım.', board: <StepsBoard a={4} b={9} upTo={36} reachA={12} reachB={0} /> },
        { t: 'line', who: 2, text: 'Ben 9. Dokuzar adım atarım. Aramızda 1’den başka ortak bölen yok: biz aralarında asalız.', board: <StepsBoard a={4} b={9} upTo={36} reachA={12} reachB={18} /> },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'number', prompt: 'EKOK(4, 9) kaç?', answer: 36,
            hint: (v) => (v === 13 ? 'Topladın mı? 13, 4’ün katı mı?' : lcmHint(4, 9)(v)),
            misconception: (v) => (v === 13 ? 'EKOK için sayıları topladı' : v === 1 ? 'EKOK yerine EBOB’u buldu' : undefined),
            ok: 'EKOK(4, 9) = 36.',
          },
        },
        { t: 'line', who: 0, text: 'İlk buluşma 36. basamakta. Bakın: 4 × 9 = 36!', board: <StepsBoard a={4} b={9} upTo={36} reachA={36} reachB={36} mark /> },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', prompt: 'Aralarında asal iki sayının EKOK’u nedir?',
            options: [{ id: 'carpim', label: 'Sayıların çarpımı' }, { id: 'buyuk', label: 'Büyük sayı' }, { id: 'toplam', label: 'Sayıların toplamı' }, { id: 'bir', label: '1' }], answer: 'carpim',
            hint: (id) => (id === 'buyuk' ? '9, 4’ün katı mı?' : id === 'toplam' ? '4 + 9 = 13. 13, 4’ün katı mı?' : 'Aralarında asal sayıların EBOB’u 1’dir. EKOK da 1 olabilir mi? 1, 4’ün katı mı?'),
            misconception: (id) => (id === 'bir' ? 'Aralarında asal sayılarda EBOB = 1 ile EKOK’u karıştırdı' : id === 'toplam' ? 'EKOK için sayıları topladı' : undefined),
            ok: 'Ortak çarpanları olmadığı için çarpımdan daha küçük bir ortak kat yok.',
          },
        },
        { t: 'rule', rule: { id: 'asal', title: 'Aralarında asal sayıların EKOK’u çarpımlarıdır', text: '1’den başka ortak böleni olmayan iki sayının EKOK’u, sayıların çarpımıdır.', example: 'EKOK(4, 9) = 36 · EKOK(8, 15) = 120' } },
      ],
    },
    {
      title: 'Kendini EKOK sanan 4',
      cast: [director, num(8), num(12), num(4, 'confused')],
      beats: [
        { t: 'line', who: 3, text: 'Bekleyin! EKOK(8, 12) benim: ben 4’üm, ikisini de tam bölerim!', board: <SignBoard title="4’ün iddiası" lines={[{ text: 'EKOK(8, 12) = 4 ?' }]} /> },
        { t: 'line', who: 2, text: 'Ama 4 benim basamaklarımdan biri değil ki; ben 12’den başlıyorum.' },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', prompt: 'Seyirci, 4’e nasıl itiraz edersin?',
            options: [
              { id: 'kat', label: '4, 8’in ve 12’nin katı değil; EKOK ikisinin de katı olmalı.' },
              { id: 'bolen', label: '4 ikisini de bölüyor; bu yüzden haklı.' },
              { id: 'tek', label: '4 tek basamaklı; EKOK iki basamaklı olmalı.' },
              { id: 'kucuk', label: 'EKOK her zaman 100’den büyük olmalı.' },
            ],
            answer: 'kat',
            hint: (id) => (id === 'bolen' ? 'Ortak bölen EBOB’un işi. EKOK ortak KAT olmalı: 4, 12’nin katı mı?' : id === 'tek' ? 'EKOK(2, 3) = 6 ve tek basamaklı. Basamak sayısı mı önemli, kat olmak mı?' : 'EKOK(4, 6) = 12’ydi. 100’den büyük olması gerekiyor mu?'),
            misconception: (id) => (id === 'bolen' ? 'EKOK ile EBOB’u (ortak bölen) karıştırdı' : undefined),
            ok: 'Haklısın: 4 ne 8’in ne de 12’nin katı.',
          },
        },
        { t: 'line', who: 3, text: 'Doğru ya… Ben ortak bölenim, ortak kat değilim! Galiba yanlış tiyatroya geldim, beni EBOB Tiyatrosu’na götürün.', board: <SignBoard title="4’ün iddiası" lines={[{ text: 'EKOK(8, 12) = 4', tone: 'bad' }, { text: 'EBOB(8, 12) = 4', tone: 'ok' }]} /> },
        { t: 'ask', who: 0, ask: { kind: 'number', prompt: 'Hiç hesaplamadan söyle: EKOK(8, 12) en az kaç olabilir?', answer: 12, hint: (v) => (v < 12 ? 'EKOK, 12’nin katı olmalı. 12’nin 0’dan büyük katlarının en küçüğü kaç?' : 'Daha küçük olabilir mi? Mesela EKOK(6, 12) kaç? 12, 12’nin katı mı?'), ok: 'EKOK hiçbir zaman büyük sayının (12) altına inemez. Gerçekte EKOK(8, 12) = 24.' } },
        { t: 'rule', rule: { id: 'buyuk', title: 'EKOK büyük sayıdan küçük olamaz', text: 'EKOK iki sayının da katıdır; bir sayının 0’dan büyük katı o sayıdan küçük olamaz. Bu yüzden EKOK ≥ büyük sayı. Küçük olanlar EBOB Tiyatrosu’nun oyuncularıdır!', example: 'EKOK(8, 12) ≥ 12 · gerçekte 24' } },
      ],
    },
    {
      title: 'Konuk oyuncu: EBOB Hanım',
      cast: [director, num(12), num(18), guest],
      beats: [
        { t: 'line', who: 0, text: 'Bu akşam EBOB Tiyatrosu’ndan bir konuğumuz var: EBOB Hanım!' },
        { t: 'line', who: 3, text: 'Merhaba! Biz EBOB(12, 18) = 6 olduğunu bulmuştuk. Bakalım EKOK ne olacak?', board: <SignBoard title="Yıldızlar" lines={[{ text: 'EBOB(12, 18) = 6' }]} /> },
        { t: 'ask', who: 0, board: <StepsBoard a={12} b={18} upTo={36} reachA={36} reachB={0} />, ask: { kind: 'number', prompt: 'EKOK(12, 18) kaç? (12’nin basamaklarından 18’in de katı olan ilkini ara.)', answer: 36, hint: lcmHint(12, 18), misconception: lcmMis(12, 18), ok: 'EKOK(12, 18) = 36.' } },
        { t: 'line', who: 0, text: 'Şimdi iki yıldızımızı çarpalım: EBOB ile EKOK’u.', board: <SignBoard title="Yıldızlar" lines={[{ text: 'EBOB(12, 18) = 6' }, { text: 'EKOK(12, 18) = 36' }]} /> },
        { t: 'ask', who: 3, ask: { kind: 'number', prompt: 'EBOB × EKOK = 6 × 36 = ?', answer: 216, hint: () => '6 × 36 = 6 × 30 + 6 × 6. Parça parça çarp.', ok: '6 × 36 = 216.' } },
        { t: 'ask', who: 0, ask: { kind: 'number', prompt: 'Peki sayıların kendi çarpımı: 12 × 18 = ?', answer: 216, hint: () => '12 × 18 = 12 × 20 − 12 × 2. Parça parça çarp.', ok: '12 × 18 = 216.' } },
        { t: 'line', who: 3, text: 'Aynı sonuç! Tesadüf mü acaba?', board: <SignBoard title="Yıldızlar" lines={[{ text: '6 × 36 = 216', tone: 'ok' }, { text: '12 × 18 = 216', tone: 'ok' }]} /> },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', prompt: 'Başka sayılarla dene: EBOB(4, 6) = 2 ve EKOK(4, 6) = 12. 2 × 12 ile 4 × 6 eşit mi?',
            options: [{ id: 'evet', label: 'Evet, ikisi de 24' }, { id: 'hayir', label: 'Hayır, farklı çıkıyor' }], answer: 'evet',
            hint: () => '2 × 12 kaç? 4 × 6 kaç? İkisini de hesapla.', ok: 'Yine eşit: EBOB × EKOK = a × b.',
          },
        },
        {
          t: 'ask', who: 3,
          ask: {
            kind: 'number', prompt: 'Kuralı kullan: a × b = 96 ve EBOB(a, b) = 4 ise EKOK(a, b) kaç?', answer: 24,
            hint: (v) => (v === 384 ? 'EBOB × EKOK = a × b, yani 4 × EKOK = 96. EKOK’u bulmak için 96’yı ne yapmalısın?' : '4 × EKOK = 96. 4 ile hangi sayıyı çarparsan 96 olur?'),
            misconception: (v) => (v === 384 ? 'EBOB × EKOK = a × b kuralında bölmek yerine çarptı' : undefined),
            ok: '96 ÷ 4 = 24.',
          },
        },
        { t: 'rule', rule: { id: 'carpim', title: 'EBOB × EKOK = iki sayının çarpımı', text: 'İki sayının EBOB’u ile EKOK’unun çarpımı, sayıların çarpımına eşittir. Biri bilinirse diğeri bölmeyle bulunur.', example: '6 × 36 = 12 × 18 = 216' } },
      ],
    },
    {
      title: 'Asal çarpan kostümleri',
      cast: [director, num(12), num(18)],
      beats: [
        { t: 'line', who: 0, text: 'Oyuncularımız asal çarpan kostümlerini giydi. EKOK ikisinin de katı olmalı; yani ikisinin bütün kostüm parçalarını taşımalı.', board: <FactorBoard a={12} b={18} /> },
        { t: 'line', who: 1, text: 'Ben 2 · 2 · 3, yani 2² · 3’üm.' },
        { t: 'line', who: 2, text: 'Ben de 2 · 3 · 3, yani 2 · 3²’yim.' },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', cols: 2, prompt: 'EKOK’un içine en az kaç tane 2 koymalıyız ki hem 12’nin hem 18’in katı olsun?',
            options: [{ id: '0', label: '0' }, { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }], answer: '2',
            hint: (id) => (id === '1' ? 'Tek bir 2 olursa EKOK 12’nin katı olabilir mi? 12’de kaç tane 2 var?' : id === '3' ? '12’de iki, 18’de bir tane 2 var. Üç taneye gerçekten ihtiyaç var mı? En KÜÇÜK ortak katı arıyoruz.' : 'Hiç 2 olmazsa EKOK çift sayı olabilir mi? 12’nin katı çift olmak zorunda mı?'),
            misconception: (id) => (id === '1' ? 'EKOK için en küçük üssü aldı' : id === '3' ? 'EKOK için üsleri topladı' : undefined),
            ok: '12’deki iki tane 2’yi kapsamak gerekir: 2².',
          },
        },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', cols: 2, prompt: 'Peki kaç tane 3 koymalıyız?',
            options: [{ id: '0', label: '0' }, { id: '1', label: '1' }, { id: '2', label: '2' }, { id: '3', label: '3' }], answer: '2',
            hint: (id) => (id === '1' ? 'Tek bir 3 olursa EKOK 18’in katı olabilir mi? 18’de kaç tane 3 var?' : id === '3' ? 'Üç taneye gerçekten ihtiyaç var mı? En KÜÇÜK ortak katı arıyoruz.' : 'Hiç 3 olmazsa EKOK 18’in katı olabilir mi?'),
            misconception: (id) => (id === '1' ? 'EKOK için en küçük üssü aldı' : id === '3' ? 'EKOK için üsleri topladı' : undefined),
            ok: '18’deki iki tane 3’ü kapsamak gerekir: 3².',
          },
        },
        { t: 'line', who: 0, text: 'Her asal çarpanın en büyük üslüsünü aldık: 2² · 3².', board: <FactorBoard a={12} b={18} take="max" /> },
        { t: 'ask', who: 0, ask: { kind: 'number', prompt: 'O hâlde EKOK(12, 18) = 2² · 3² = 4 · 9 = ?', answer: 36, hint: () => '4 ile 9’u çarp.', ok: '4 · 9 = 36. Konuk perdesindeki sonuçla aynı!' } },
        {
          t: 'ask', who: 0,
          ask: {
            kind: 'choice', prompt: 'Büyük sayılarda dener misin? a = 2³ · 3² · 5 ve b = 2² · 3⁴ · 7 ise EKOK(a, b) hangisi?',
            options: [{ id: 'dogru', label: '2³ · 3⁴ · 5 · 7' }, { id: 'ebob', label: '2² · 3²' }, { id: 'ortak', label: '2³ · 3⁴' }, { id: 'topla', label: '2⁵ · 3⁶ · 5 · 7' }],
            answer: 'dogru',
            hint: (id) => (id === 'ebob' ? 'Bu, ortak çarpanların en küçük üslüleri: EBOB’un yolu! 2² · 3², a’nın katı mı?' : id === 'ortak' ? '5 ve 7’yi unuttun mu? EKOK a’nın katıysa içinde 5 olmalı mı?' : 'Üsleri topladın. Bu bir ortak kat ama en küçüğü mü? Her çarpandan en çok kaç tane gerekiyor?'),
            misconception: (id) => (id === 'ebob' ? 'EKOK yerine EBOB’u buldu' : id === 'ortak' ? 'Ortak olmayan asal çarpanları EKOK’a katmadı' : 'EKOK için üsleri topladı'),
            ok: 'Bütün asal çarpanlar, en büyük üsleriyle: 2³ · 3⁴ · 5 · 7.',
          },
        },
        { t: 'rule', rule: { id: 'carpan', title: 'Asal çarpanlarla EKOK', text: 'Sayıları asal çarpanlarına ayır; ortak olan ve olmayan bütün asal çarpanları al, her birinin en büyük üslüsünü seç ve çarp.', example: '12 = 2² · 3, 18 = 2 · 3² → EKOK = 2² · 3² = 36' } },
        { t: 'strategy', question: 'EKOK bulurken hangi yolu daha çok seviyorsun?', options: ['Katları listelerim', 'Asal çarpanlara ayırırım', 'EBOB × EKOK = a × b kuralını kullanırım', 'Önce özel durumlara bakarım (kat mı, aralarında asal mı?)'] },
      ],
    },
    {
      title: 'Yönetmen sensin!',
      cast: [director, num(sa), num(sb)],
      beats: [...finalRound(sa, sb, sk, true), ...finalRound(ga, gb, gk, false)],
    },
  ]
}

export default function EkokTiyatrosu({ grade, onFinish }: InteractionProps) {
  const acts = useMemo(makeActs, [])
  return (
    <Theater
      grade={grade}
      acts={acts}
      emoji="🎭"
      playTitle="EKOK Tiyatrosu"
      onFinish={onFinish}
      finish={{
        summary: (rules, asks) => `${rules} EKOK kuralını Kural Defteri’ne yazdın ve ${asks} seyirci sorusunu yanıtladın.`,
        insight: 'EKOK, ortak katların en küçüğüdür ve bütün ortak katlar EKOK’un katıdır. Biri diğerinin katıysa EKOK büyük sayıdır; aralarında asal sayıların EKOK’u çarpımlarıdır; EKOK hiçbir zaman büyük sayının altına inemez. EBOB × EKOK iki sayının çarpımına eşittir; asal çarpanlarla EKOK, bütün çarpanların en büyük üslüleriyle bulunur.',
      }}
    />
  )
}
