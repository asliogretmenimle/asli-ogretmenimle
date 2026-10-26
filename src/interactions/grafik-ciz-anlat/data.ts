import type { Grade } from '../../data/types'
import type { Axes, Kind, Pt, Spec } from '../grafik-hikayeleri/graf'

export type Q =
  | { kind: 'tap'; prompt: string; target: 'steepest' | { phase: number }; ok: string; wrong: string; mis?: string }
  | { kind: 'chips'; prompt: string; options: { text: string; ok: boolean; why?: string; mis?: string }[]; ok: string }
  | { kind: 'num'; prompt: string; answer: number; unit: string; hint: string; ok: string; mis?: { value: number; text: string } }

export interface SketchTask {
  kind: 'sketch'
  title: string
  emoji: string
  story: string
  axes: Axes
  spec: Spec
  /** Örnek çizim (takılınca gösterilir) */
  model: Pt[]
  /** İpucu: hikâyenin parçaları */
  parts: string[]
  questions: Q[]
}

export interface CompareTask {
  kind: 'compare'
  title: string
  emoji: string
  story: string
  axes: Axes
  spec: Spec
  model: Pt[]
  parts: string[]
  mates: { name: string; pts: Pt[]; ok: boolean; why: string; q: string; mis?: string }[]
}

export interface OpenTask {
  kind: 'open'
  title: string
  emoji: string
  story: string
  axes: Axes
  start: Pt
  end: Pt
  goal: number
  words: Record<Kind, string>
  who: string
}

export type Task = SketchTask | CompareTask | OpenTask

const qual = (xLabel: string, yLabel: string): Axes => ({ xMax: 10, yMax: 10, xStep: 1, yStep: 1, xLabel, yLabel, numbers: false })

/* ── havuz ── */
function havuz(g: Grade): SketchTask {
  const n = g >= 7
  const flatQ: Q = {
    kind: 'chips',
    prompt: 'Grafiğindeki düz parça ne anlatıyor?',
    ok: 'Evet! Düz parça, zaman geçtiği hâlde su miktarının değişmediğini gösterir.',
    options: [
      { text: 'Su eklenmedi; su miktarı değişmedi.', ok: true },
      { text: 'Havuz doldu.', ok: false, why: 'Havuz dolmuş olsaydı sonra yine dolmaya devam eder miydi? Düz parçadan sonra grafik ne yapıyor?' },
      { text: 'Su çok hızlı aktı.', ok: false, why: 'Su hızlı akarsa havuzdaki su hızla artar. O zaman çizgi düz mü olur, dik mi?', mis: 'Düz parçayı hızlı değişim sanma' },
    ],
  }
  const qs: Q[] = [
    { kind: 'tap', prompt: 'Havuz en hızlı nerede doluyor? Grafiğinde o parçaya dokun.', target: 'steepest', ok: 'Evet, en dik parça! Aynı sürede en çok su orada eklendi.', wrong: 'Bu parçada su ne kadar hızlı yükseliyor? Aynı sürede en çok yükselen, yani en dik parça hangisi?', mis: 'En yüksek noktayı en hızlı değişim sanma' },
    flatQ,
  ]
  if (n) qs.push({ kind: 'num', prompt: 'İki hortumla havuza dakikada kaç litre su doluyor? Grafikten bul.', answer: 40, unit: 'L', hint: 'Son parçanın başında ve sonunda kaç litre var? Bu değişim kaç dakikada oldu?', ok: '(600 − 200) ÷ 10 = 40. Bir hortum 20 L, iki hortum 40 L!', mis: { value: 600, text: 'Toplam miktarı birim zamandaki değişim (hız) sanma' } })
  if (g === 8)
    qs.push({
      kind: 'chips',
      prompt: 'İlk 10 dakikayı hangi kural anlatıyor? (x: dakika, y: litre)',
      ok: 'Evet: y = 20x. Havuz boş başladığı için başlangıç değeri 0, eğim 20.',
      options: [
        { text: 'y = 20x', ok: true },
        { text: 'y = x + 20', ok: false, why: 'x = 10 olunca y = x + 20 kaç olur? Grafikte 10. dakikada kaç litre var?', mis: 'Eğim ile başlangıç değerini karıştırma' },
        { text: 'y = 200x', ok: false, why: '200, 10. dakikadaki miktar. Bir dakikada kaç litre ekleniyor?' },
      ],
    })
  return {
    kind: 'sketch',
    title: 'Havuzu doldurmak',
    emoji: '🏊',
    story: n
      ? 'Boş bir havuza dakikada 20 L akıtan bir hortumla 10 dakika su doldu. Sonra hortum 5 dakika kapatıldı. Ardından iki hortumla (dakikada 40 L) 10 dakika daha dolduruldu.'
      : 'Boş bir havuza bir hortumla su doluyor. Biraz sonra hortum bir süreliğine kapatılıyor. Sonra iki hortumla daha hızlı doldurulup havuz doluyor.',
    axes: n ? { xMax: 30, yMax: 800, xStep: 1, yStep: 20, xLabel: 'Zaman (dk)', yLabel: 'Havuzdaki su (L)', numbers: true } : qual('Zaman', 'Havuzdaki su'),
    spec: {
      start: { y: 0, q: 'Havuz başta boştu. Başlangıçta havuzda ne kadar su var? İlk nokta nerede olmalı?', mis: 'Başlangıç değerini hikâyeden okuyamama' },
      phases: [
        { kind: 'up', q: 'Hortum açıkken havuzdaki su ne olur? Grafiğin ilk parçası bunu gösteriyor mu?' },
        { kind: 'flat', q: 'Hortum kapalıyken havuzdaki su artar mı, azalır mı, aynı mı kalır? Grafikte bunu gösteren bir parça var mı?' },
        { kind: 'up', q: 'Sonra iki hortumla dolduruldu. Grafiğin son parçası ne yapmalı?' },
      ],
      optionalEnd: 'flat',
      faster: [{ a: 2, b: 0, q: 'İki hortumla dolarken su daha hızlı yükselir. Son parça ilk parçadan daha dik mi?', mis: 'Hızlı değişimi daha dik çizgiyle gösterememe' }],
      checkpoints: n
        ? [
            { x: 10, y: 200, q: 'İlk 10 dakikada dakikada 20 L doldu. 10. dakikada havuzda kaç litre var? Grafiğin orada hangi değerde?' },
            { x: 15, y: 200, q: 'Hortum 5 dakika kapalı kaldı. Düz parça hangi dakikada bitmeli?' },
            { x: 25, y: 600, q: '15. dakikadan sonra 10 dakika boyunca dakikada 40 L doldu. 25. dakikada havuzda kaç litre olur?' },
          ]
        : undefined,
    },
    model: n ? [{ x: 0, y: 0 }, { x: 10, y: 200 }, { x: 15, y: 200 }, { x: 25, y: 600 }, { x: 30, y: 600 }] : [{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 5, y: 3 }, { x: 8, y: 9 }, { x: 10, y: 9 }],
    parts: ['Su yükseliyor (bir hortum)', 'Su değişmiyor (hortum kapalı)', 'Su daha hızlı yükseliyor (iki hortum)'],
    questions: qs,
  }
}

/* ── bisiklet ── */
function bisiklet(g: Grade): SketchTask {
  const n = g >= 7
  const qs: Q[] = [
    { kind: 'tap', prompt: 'Deniz’in parkta dinlendiği zaman grafiğin hangi parçası? Dokun.', target: { phase: 1 }, ok: 'Evet! Dururken evden uzaklık değişmez; grafik düz gider.', wrong: 'Dinlenirken Deniz’in evden uzaklığı değişir mi? Grafikte uzaklığın değişmediği parça hangisi?', mis: 'Düz parçayı hareket sanma' },
    {
      kind: 'chips',
      prompt: 'Grafiğindeki aşağı inen parça ne anlatıyor?',
      ok: 'Evet! Evden uzaklık azalıyor: Deniz eve yaklaşıyor.',
      options: [
        { text: 'Deniz eve dönüyor.', ok: true },
        { text: 'Deniz yokuş aşağı iniyor.', ok: false, why: 'Grafik yolun resmi değil; y ekseni evden uzaklığı gösteriyor. Uzaklık azalıyorsa Deniz ne yapıyor?', mis: 'Grafiği resim gibi okuma (tepe biçimli grafik)' },
        { text: 'Deniz yavaşlıyor.', ok: false, why: 'Çizgi aşağı iniyor ve dik. Bu, yavaşlamak mı, yoksa eve hızla yaklaşmak mı demek?', mis: 'Uzaklık grafiğini hız grafiği gibi okuma' },
      ],
    },
  ]
  if (n) qs.push({ kind: 'num', prompt: 'Deniz eve dönerken dakikada kaç metre yol aldı?', answer: 400, unit: 'm', hint: '2000 m’yi kaç dakikada döndü? 1 dakikada ne kadar?', ok: '2000 ÷ 5 = 400 m. Gidişte dakikada 100 m’ydi; dönüş 4 kat hızlı, çizgi de 4 kat dik!', mis: { value: 2000, text: 'Toplam yolu birim zamandaki değişim (hız) sanma' } })
  return {
    kind: 'sketch',
    title: 'Parka bisiklet turu',
    emoji: '🚲',
    story: n
      ? 'Deniz evden 2000 m uzaktaki parka bisikletle 20 dakikada gitti, parkta 10 dakika dinlendi, sonra 5 dakikada aynı yoldan eve döndü.'
      : 'Deniz parka bisikletle yavaş yavaş gitti, parkta bir süre dinlendi, sonra hızla aynı yoldan eve döndü.',
    axes: n ? { xMax: 40, yMax: 3000, xStep: 1, yStep: 100, xLabel: 'Zaman (dk)', yLabel: 'Evden uzaklık (m)', numbers: true } : qual('Zaman', 'Evden uzaklık'),
    spec: {
      start: { y: 0, q: 'Deniz yola evden başladı. Evdeyken evden uzaklığı ne kadardır?' },
      phases: [
        { kind: 'up', q: 'Deniz önce parka gitti. Evden uzaklaşırken grafik ne yapmalı?' },
        { kind: 'flat', q: 'Deniz parkta dinlendi. Dinlenirken evden uzaklığı değişir mi? Bunu gösteren düz bir parça var mı?' },
        { kind: 'down', q: 'Sonunda Deniz eve döndü. Eve yaklaşırken evden uzaklık ne olur?' },
      ],
      optionalEnd: 'flat',
      end: { y: 0, q: 'Deniz en sonunda nerede? Evdeyken evden uzaklığı kaç olur? Grafiğin sonu nerede olmalı?' },
      faster: [{ a: 2, b: 0, q: 'Deniz eve hızla döndü. Aynı yolu daha kısa sürede gitmek grafikte nasıl görünür? Dönüş çizgisi gidişten daha dik mi?', mis: 'Hızlı değişimi daha dik çizgiyle gösterememe' }],
      checkpoints: n
        ? [
            { x: 20, y: 2000, q: 'Deniz 20 dakikada parka vardı. 20. dakikada evden kaç metre uzakta?' },
            { x: 30, y: 2000, q: 'Deniz parkta 10 dakika dinlendi. Düz parça hangi dakikaya kadar sürmeli?' },
            { x: 35, y: 0, q: 'Deniz 5 dakikada eve döndü. Hangi dakikada evde? O anda evden uzaklığı kaç?' },
          ]
        : undefined,
    },
    model: n ? [{ x: 0, y: 0 }, { x: 20, y: 2000 }, { x: 30, y: 2000 }, { x: 35, y: 0 }, { x: 40, y: 0 }] : [{ x: 0, y: 0 }, { x: 4, y: 6 }, { x: 7, y: 6 }, { x: 8, y: 0 }],
    parts: ['Evden uzaklaşıyor (yavaş)', 'Uzaklık değişmiyor (dinleniyor)', 'Eve yaklaşıyor (hızlı)'],
    questions: qs,
  }
}

/* ── çay ── */
function cay(g: Grade): SketchTask {
  const n = g >= 7
  const qs: Q[] = [
    { kind: 'tap', prompt: 'Çay en hızlı ne zaman soğuyor? Grafiğinde o parçaya dokun.', target: 'steepest', ok: 'Evet! Çay sıcakken hızlı soğur; ılındıkça soğuması yavaşlar.', wrong: 'Bu parçada sıcaklık ne kadar hızlı düşüyor? Aynı sürede en çok düşen, yani en dik inen parça hangisi?' },
    {
      kind: 'chips',
      prompt: 'Grafik en sonunda neden düzleşiyor?',
      ok: 'Evet! Çay oda sıcaklığına inince daha fazla soğumaz.',
      options: [
        { text: 'Çay oda sıcaklığına ulaştı.', ok: true },
        { text: 'Çay bitti.', ok: false, why: 'Hikâyede çayı içen var mı? Grafik çayın neyini gösteriyor?' },
        { text: 'Çay donmaya başladı.', ok: false, why: 'Masadaki çay odadan daha soğuk olabilir mi?', mis: 'Soğuyan çayın sıcaklığının sıfıra ineceğini sanma' },
      ],
    },
  ]
  if (g === 8)
    qs.push({
      kind: 'chips',
      prompt: 'Bu grafik doğrusal bir fonksiyonun grafiği mi?',
      ok: 'Doğru! Eşit sürelerde eşit miktarda değişmediği için eğim değişiyor; grafik bir doğru değil.',
      options: [
        { text: 'Hayır, eşit sürelerde eşit miktarda değişmiyor.', ok: true },
        { text: 'Evet, çünkü hep azalıyor.', ok: false, why: 'Azalmak, doğrusal olmak demek mi? Her 10 dakikada sıcaklık aynı miktar mı düşüyor?', mis: 'Azalan her grafiği doğrusal sanma' },
        { text: 'Evet, çünkü düz çizgilerden oluşuyor.', ok: false, why: 'Parçaların eğimleri aynı mı? Tek bir doğru olsaydı eğim hep aynı olurdu.' },
      ],
    })
  return {
    kind: 'sketch',
    title: 'Soğuyan çay',
    emoji: '🍵',
    story: n
      ? '90 °C’lik bir bardak çayı 20 °C’lik odada masada unuttun. Çay ilk 10 dakikada yaklaşık 40 °C soğur; sonra soğuması yavaşlar. Sıcaklığı 40 dakika boyunca çiz.'
      : 'Sıcacık bir bardak çayı masada unuttun. Oda serin ama soğuk değil. Çayın sıcaklığı zamanla nasıl değişir? Grafiğini çiz.',
    axes: n ? { xMax: 40, yMax: 100, xStep: 1, yStep: 5, xLabel: 'Zaman (dk)', yLabel: 'Sıcaklık (°C)', numbers: true } : qual('Zaman', 'Çayın sıcaklığı'),
    spec: {
      start: n ? { y: 90, tol: 5, q: 'Çay başta kaç derece? Grafiğin ilk noktası hangi değerde olmalı?' } : { min: 6, q: 'Çay başta sıcacıktı. Grafik yüksek bir yerden mi başlamalı?' },
      floor: n ? { y: 20, q: 'Çay odadan daha soğuk olabilir mi? Oda 20 °C; çayın sıcaklığı bunun altına iner mi?', mis: 'Soğuyan çayın sıcaklığının sıfıra ineceğini sanma' } : undefined,
      phases: [{ kind: 'down', shape: 'decel', q: 'Çay soğurken sıcaklığı ne olur? Grafik bunu gösteriyor mu?', shapeQ: 'Çay her dakika aynı miktarda mı soğur? Sıcakken mi daha hızlı soğur, ılınınca mı? Araya nokta ekleyerek çizgiyi bük: başta dik, sonra yatık.', shapeMis: 'Soğumayı sabit hızlı (doğrusal) sanma' }],
      optionalEnd: 'flat',
      end: n ? undefined : { min: 1, q: 'Çay odadan daha soğuk olabilir mi? Sıcaklık sıfıra kadar iner mi?', mis: 'Soğuyan çayın sıcaklığının sıfıra ineceğini sanma' },
      checkpoints: n ? [{ x: 10, y: 50, tol: 10, q: 'İlk 10 dakikada çay yaklaşık 40 °C soğuyor. 10. dakikada çay kaç derece civarında olmalı?' }] : undefined,
      minX: n ? { x: 30, q: 'Sıcaklığı 40 dakika boyunca çiz. Grafiğin 30. dakikadan sonra da devam ediyor mu?' } : { x: 7, q: 'Çay uzun süre masada kaldı. Grafiğini zamanın sonuna kadar sürdür.' },
    },
    model: n ? [{ x: 0, y: 90 }, { x: 5, y: 65 }, { x: 10, y: 50 }, { x: 20, y: 32 }, { x: 30, y: 24 }, { x: 40, y: 21 }] : [{ x: 0, y: 9 }, { x: 2, y: 6 }, { x: 4, y: 4 }, { x: 7, y: 3 }, { x: 10, y: 3 }],
    parts: ['Sıcaklık hızla düşüyor (çay çok sıcak)', 'Sıcaklık yavaş düşüyor (çay ılındı)', 'Sıcaklık oda sıcaklığında kalıyor'],
    questions: qs,
  }
}

/* ── küvet (karşılaştırma) ── */
function kuvet(): CompareTask {
  return {
    kind: 'compare',
    title: 'Küvet: çizimleri karşılaştır',
    emoji: '🛁',
    story: 'Can boş küveti musluktan doldurdu. Musluğu kapatıp bir süre banyo yaptı. Sonra tıpayı çekti ve küvet boşaldı.',
    axes: qual('Zaman', 'Su yüksekliği'),
    spec: {
      start: { y: 0, q: 'Küvet başta boştu. Grafiğin ilk noktası nerede olmalı?' },
      phases: [
        { kind: 'up', q: 'Musluk açıkken su yüksekliği ne olur?' },
        { kind: 'flat', q: 'Banyo yaparken musluk kapalı. Su yüksekliği değişir mi? Bunu gösteren düz bir parça var mı?' },
        { kind: 'down', q: 'Tıpa çekilince su yüksekliği ne olur?' },
      ],
      optionalEnd: 'flat',
      end: { y: 0, q: 'Küvet tamamen boşaldı. Grafiğin sonunda su yüksekliği kaç?' },
    },
    model: [{ x: 0, y: 0 }, { x: 3, y: 6 }, { x: 7, y: 6 }, { x: 9, y: 0 }, { x: 10, y: 0 }],
    parts: ['Su yükseliyor', 'Su değişmiyor (banyo)', 'Su azalıyor (boşalma)'],
    mates: [
      { name: 'Ela', pts: [{ x: 0, y: 0 }, { x: 3, y: 6 }, { x: 7, y: 6 }, { x: 9, y: 0 }, { x: 10, y: 0 }], ok: true, why: 'Doldu, değişmedi, boşaldı: hikâyenin üç parçası sırayla var.', q: 'Ela’nın grafiğini hikâyeyle parça parça karşılaştır: dolma, banyo ve boşalma parçaları sırayla var mı?' },
      { name: 'Kerem', pts: [{ x: 0, y: 0 }, { x: 0.15, y: 8 }, { x: 7, y: 8 }, { x: 9, y: 0 }], ok: false, why: 'Başta dikey bir çizgi var: küvet hiç zaman geçmeden bir anda dolmuş gibi. Zaman geçmeden su yükselebilir mi?', q: 'Kerem’in grafiğinin başına dikkatle bak: çizgi dimdik yukarı çıkıyor. Bu kadar kısa sürede küvet dolabilir mi?', mis: 'Zaman grafiğinde dikey sıçrama çizme' },
      { name: 'Nil', pts: [{ x: 0, y: 0 }, { x: 5, y: 8 }, { x: 6, y: 8 }, { x: 10, y: 0 }], ok: true, why: 'Seninkinden farklı görünüyor ama hikâyeye uyuyor: küvet yavaş dolmuş, banyo kısa sürmüş, yavaş boşalmış.', q: 'Nil’in grafiği seninkine benzemiyor diye yanlış mı? Dolma, banyo ve boşalma parçaları var mı? Parçaların uzunluğu hikâyede söyleniyor mu?' },
      { name: 'Arda', pts: [{ x: 0, y: 0 }, { x: 4, y: 7 }, { x: 8, y: 0 }], ok: false, why: 'Banyo sırasında su yüksekliği değişmez; ama bu grafikte düz bir parça yok. Su dolar dolmaz boşalmaya başlamış.', q: 'Arda’nın grafiğinde Can’ın banyo yaptığı zaman nerede? O sırada su yüksekliği ne yapıyor olmalı?', mis: 'Değişmeyen (sabit) bölümü grafikte göstermeme' },
    ],
  }
}

/* ── kumbara (açık uçlu) ── */
function kumbara(g: Grade): OpenTask {
  const n = g >= 7
  return {
    kind: 'open',
    title: 'Kumbaranın 6 haftası',
    emoji: '🐷',
    story: n
      ? 'Ada’nın kumbarasında 20 TL vardı. 6 hafta sonra 60 TL oldu. Bu 6 haftada neler olmuş olabilir? Uyan iki farklı grafik çiz.'
      : 'Ada’nın kumbarasında biraz para vardı. 6 hafta sonra daha çok parası oldu (işaretli noktalar). Bu 6 haftada neler olmuş olabilir? Uyan iki farklı grafik çiz.',
    axes: n ? { xMax: 6, yMax: 100, xStep: 1, yStep: 5, xLabel: 'Zaman (hafta)', yLabel: 'Para (TL)', numbers: true } : { xMax: 6, yMax: 10, xStep: 1, yStep: 1, xLabel: 'Zaman (hafta)', yLabel: 'Kumbaradaki para', numbers: false },
    start: { x: 0, y: n ? 20 : 2 },
    end: { x: 6, y: n ? 60 : 6 },
    goal: 2,
    words: { up: 'para biriktirdi', flat: 'ne biriktirdi ne harcadı', down: 'para harcadı' },
    who: 'Ada',
  }
}

export function makeTasks(grade: Grade): Task[] {
  if (grade <= 6) return [havuz(grade), bisiklet(grade), kuvet(), kumbara(grade), cay(grade)]
  return [havuz(grade), bisiklet(grade), cay(grade), kuvet(), kumbara(grade)]
}
