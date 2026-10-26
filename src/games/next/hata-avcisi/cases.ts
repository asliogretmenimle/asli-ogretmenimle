import type { Grade, ManipulativeConfig, ManipulativeTool } from '../../../data/types'

/**
 * Hata Avcısı içerik bankası.
 *  - Hunt: kurgusal bir öğrencinin adım adım çözümü. `bug` hatalı adım(lar)ın sırası (birden çok kabul edilebilir), null = çözüm doğru.
 *  - why[0] doğru neden; diğerleri gerçek kavram yanılgılarından türetilmiş çeldiricilerdir (q: düşündüren soru, mis: seçilirse rapora yazılır).
 *  - fix: düzeltme biçimi — num (tuş takımı), pick (birden çok doğru düzeltme olabilir), order (işlem sırasını dokunarak kur; geçerli her sıra ayrı çözüm).
 *  - Duel ("Kim haklı?"): iki öğrencinin farklı yolları.
 */

export type Op = '+' | '−' | '×' | '÷'

export interface Cause {
  t: string
  q?: string
  mis?: string
}

export type Fix =
  | { kind: 'num'; tpl: string; ans: number }
  | { kind: 'pick'; prompt: string; opts: string[]; ok: number[]; result?: string }
  | { kind: 'order'; nums: number[]; ops: Op[] }

export interface Col {
  a: number
  b: number
  op: '+' | '−'
  /** Öğrencinin yazdığı sonuç */
  res: string
  /** Sütunların üstündeki notlar (0 = birler): elde, bozma */
  marks?: Record<number, string>
  /** Üstü çizilen üst sayı basamakları */
  cross?: number[]
}

export interface Hunt {
  id: string
  who: string
  /** Tamlayan ekli ad: Ece’nin */
  whoGen: string
  face: string
  problem: string
  steps: string[]
  /** Adımın sütun işlemde vurguladığı basamak (0 = birler) */
  stepCol?: (number | null)[]
  col?: Col
  bug: number[] | null
  why: Cause[]
  fix?: Fix
  /** Doğru çözümlerde: "Nasıl emin oldun?" — birden çok geçerli kanıt */
  verify?: { opts: Cause[]; ok: number[] }
  /** Bulma aşamasında soru-ipucu */
  hint: string
  /** Hatayı kaçırırsa rapora */
  mis: string
  /** Doğru çözümde olmayan bir hata ararsa rapora */
  trap?: string
  lesson: string
  tool?: ManipulativeTool
  toolConfig?: ManipulativeConfig
}

export interface Duel {
  id: string
  problem: string
  a: { who: string; face: string; method: string; steps: string[] }
  b: { who: string; face: string; method: string; steps: string[] }
  verdict: 'a' | 'b' | 'both'
  reasons: Cause[]
  ok: number[]
  common?: { opts: string[]; ok: number }
  nudge: string
  lesson: string
}

const B10: ManipulativeConfig = { maxPlace: 'hundreds' }

// ───────────────────────────── 2. sınıf ─────────────────────────────
const g2: Hunt[] = [
  {
    id: 'g2-elde', who: 'Ece', whoGen: 'Ece’nin', face: '👧', problem: '47 + 35 işlemini yap.',
    col: { a: 47, b: 35, op: '+', res: '72' },
    steps: ['Birler: 7 + 5 = 12', 'Birlere 2’yi yazdım.', 'Onlar: 4 + 3 = 7', 'Sonuç: 72'],
    stepCol: [0, 0, 1, null],
    bug: [2],
    why: [
      { t: 'Birlerden gelen 1 onluğu (eldeyi) onlara eklemeyi unuttu.' },
      { t: '7 + 5’i yanlış topladı.', q: '7 + 5 kaç eder? 12 doğru mu? Sorun başka yerde olabilir.' },
      { t: 'Onlar basamağında 4 ile 3’ü çarpmalıydı.', q: 'Toplama işleminde onlar basamağında da toplama yapılır. Peki 12’nin 1’i nereye gitti?', mis: 'Toplamada onlar basamağında farklı işlem yapılacağını düşündü' },
      { t: 'Birlere 12 yazmalıydı.', q: 'Bir basamağa iki rakam sığar mı? 12 birlik kaç onluk, kaç birliktir?', mis: 'Bir basamağa iki basamaklı sayı yazılabileceğini düşündü' },
    ],
    fix: { kind: 'num', tpl: '47 + 35 = {?}', ans: 82 },
    hint: '12 birlik kaç onluk, kaç birlik eder? O onluk hangi adımda kayboldu?',
    mis: 'Eldeli toplamada onluğu aktarmayı fark etmedi',
    lesson: '12 birlik = 1 onluk + 2 birlik. O 1 onluk onlara eklenir: 4 + 3 + 1 = 8 onluk. Sonuç 82.',
    tool: 'base10', toolConfig: B10,
  },
  {
    id: 'g2-ters-cikar', who: 'Can', whoGen: 'Can’ın', face: '👦', problem: '52 − 27 işlemini yap.',
    col: { a: 52, b: 27, op: '−', res: '35' },
    steps: ['Birler: 7 − 2 = 5', 'Onlar: 5 − 2 = 3', 'Sonuç: 35'],
    stepCol: [0, 1, null],
    bug: [0],
    why: [
      { t: '2’den 7 çıkmayınca sayıları ters çevirdi; 1 onluk bozmalıydı.' },
      { t: 'Onlar basamağında 5 − 2 yanlış.', q: '5 onluktan 2 onluk çıkınca kaç onluk kalır? Sonra birlere tekrar bak.' },
      { t: 'Toplama yapmalıydı.', q: 'Soruda hangi işlem isteniyor? İşaret doğru; adımlara bak.' },
      { t: 'Çıkarmada her zaman büyükten küçük çıkarılır, bu doğru.', q: 'Üstteki sayının birleri 2, alttakinin 7. Kimden kim çıkıyor?', mis: 'Çıkarmada basamaklarda büyükten küçüğü çıkarmayı doğru sandı' },
    ],
    fix: { kind: 'num', tpl: '52 − 27 = {?}', ans: 25 },
    hint: 'Birler basamağında üstte hangi rakam var, altta hangisi? Kimden kim çıkıyor?',
    mis: 'Çıkarmada küçükten büyüğü çıkaramayınca sayıları ters çevirme hatasını fark etmedi',
    lesson: '52’nin 1 onluğunu bozunca 12 birlik olur: 12 − 7 = 5. Onlarda 4 kalır: 4 − 2 = 2. Sonuç 25. Kontrol: 25 + 27 = 52.',
    tool: 'base10', toolConfig: B10,
  },
  {
    id: 'g2-dogru-elde', who: 'Zeynep', whoGen: 'Zeynep’in', face: '👧🏽', problem: '38 + 46 işlemini yap.',
    col: { a: 38, b: 46, op: '+', res: '84', marks: { 1: '1' } },
    steps: ['Birler: 8 + 6 = 14 → 4’ü yazdım, 1 onluk elde', 'Onlar: 3 + 4 + 1 = 8', 'Sonuç: 84'],
    stepCol: [0, 1, null],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Ters işlemle: 84 − 46 = 38' },
        { t: 'Tahminle: 40 + 45 = 85, 84 buna çok yakın' },
        { t: '84 + 46 = 130 olduğu için doğru', q: '84 + 46 neyi kontrol eder? Toplamı doğrulamak için hangi işlemi yapmalısın?', mis: 'Toplamayı kontrol ederken yine toplama yaptı' },
      ],
      ok: [0, 1],
    },
    hint: '',
    mis: '',
    trap: 'Doğru eldeli toplamayı hatalı sandı',
    lesson: 'Zeynep 14 birlikten 1 onluğu onlara taşıdı. Ters işlem ve tahmin, sonucu kontrol etmenin iki farklı yolu.',
  },
  {
    id: 'g2-basamak', who: 'Mert', whoGen: 'Mert’in', face: '👦🏻', problem: '4 birlik ve 6 onluk hangi sayıyı oluşturur?',
    steps: ['4 birlik = 4', '6 onluk = 6', 'Sayı: 46'],
    bug: [1, 2],
    why: [
      { t: '6 onluk 6 değil, 60 eder; onlukları sayının soluna yazmalıydı.' },
      { t: '4 birlik 40 eder.', q: 'Bir birlik kaçtır? 4 tane birlik kaç eder?', mis: 'Birlik ile onluk değerini karıştırdı' },
      { t: 'Birlikler her zaman sayının soluna yazılır.', q: '25 sayısında 5 kaç birlik? Birlikler hangi tarafta?', mis: 'Birlikler basamağının yerini karıştırdı' },
      { t: 'Hata yok, duyduğumuz sırayla yazılır.', q: '“Altmış dört” derken önce hangi basamağı söylersin? Sayının değeri söyleniş sırasına mı bağlı?', mis: 'Rakamları duyduğu sıraya göre yazmayı doğru sandı' },
    ],
    fix: { kind: 'num', tpl: '6 onluk ve 4 birlik = {?}', ans: 64 },
    hint: '1 onluk kaç birliktir? 6 onluk kaç eder?',
    mis: 'Basamak değerini (onluk = 10 birlik) fark etmedi',
    lesson: '6 onluk = 60, 4 birlik = 4. 60 + 4 = 64. Hangi sırayla söylendiği değil, basamak değeri önemli.',
    tool: 'base10', toolConfig: B10,
  },
  {
    id: 'g2-bozma', who: 'Elif', whoGen: 'Elif’in', face: '👧🏼', problem: '63 − 28 işlemini yap.',
    col: { a: 63, b: 28, op: '−', res: '45', marks: { 0: '13' }, cross: [0] },
    steps: ['Birler: 3’ten 8 çıkmaz, 1 onluk bozdum: 13 − 8 = 5', 'Onlar: 6 − 2 = 4', 'Sonuç: 45'],
    stepCol: [0, 1, null],
    bug: [1],
    why: [
      { t: 'Bozduğu onluğu onlardan düşmedi; 6 onluktan 5 onluk kaldı.' },
      { t: '13 − 8 = 5 yanlış.', q: '13’ten 8 çıkarsa kaç kalır? Bu adımı sayarak kontrol et.' },
      { t: 'Onluk bozmaya gerek yoktu.', q: '3 birlikten 8 birlik çıkarabilir misin?', mis: 'Çıkarmada onluk bozma gereğini görmedi' },
    ],
    fix: { kind: 'num', tpl: '63 − 28 = {?}', ans: 35 },
    hint: 'Elif bir onluğu bozup birlere verdi. Onlar basamağında artık kaç onluk kaldı?',
    mis: 'Onluk bozduktan sonra onlar basamağını azaltmayı fark etmedi',
    lesson: '1 onluk birlere gidince onlarda 5 onluk kalır: 5 − 2 = 3. Sonuç 35. Kontrol: 35 + 28 = 63.',
    tool: 'base10', toolConfig: B10,
  },
  {
    id: 'g2-on-tamamla', who: 'Arda', whoGen: 'Arda’nın', face: '🧒', problem: '29 + 7 işlemini zihinden yap.',
    steps: ['29’a 1 ekledim: 30', '7’den 1 verdim, 6 kaldı.', '30 + 6 = 36'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Tahminle: 30 + 7 = 37; 29, 30’dan 1 eksik, sonuç 36' },
        { t: 'Ters işlemle: 36 − 7 = 29' },
        { t: '29 + 7 = 2 + 9 + 7 = 18', q: '29’daki 2 kaç onluktur? Onu 2 birlik gibi toplayabilir miyiz?', mis: 'Rakamların basamak değerini göz ardı ederek topladı' },
      ],
      ok: [0, 1],
    },
    hint: '',
    mis: '',
    trap: 'Onluğa tamamlama stratejisini hatalı sandı',
    lesson: 'Arda 7’nin 1’ini 29’a verip 30 yaptı: toplam değişmez. Bu, 10’a (onluğa) tamamlama stratejisi.',
  },
  {
    id: 'g2-onluk-birlik', who: 'Defne', whoGen: 'Defne’nin', face: '👧🏾', problem: '45 + 3 işlemini yap.',
    steps: ['45 = 4 onluk 5 birlik', '4 onluk + 3 = 7 onluk', 'Sonuç: 75'],
    bug: [1],
    why: [
      { t: '3, birliktir; onluklara değil birliklere eklenmeli.' },
      { t: '45, 4 onluk 5 birlik değildir.', q: '45’te kaç onluk, kaç birlik var? İlk adımı blokla düşün.' },
      { t: '4 + 3 = 8 olmalıydı.', q: '4 + 3 kaç eder? Asıl soru: 3 hangi basamağa eklenmeli?' },
    ],
    fix: { kind: 'num', tpl: '45 + 3 = {?}', ans: 48 },
    hint: '3 sayısı kaç onluk, kaç birliktir?',
    mis: 'Tek basamaklı sayıyı onluklara eklemeyi fark etmedi',
    lesson: '3 birlik birliklere eklenir: 5 + 3 = 8 birlik. 4 onluk aynı kalır: 48.',
    tool: 'base10', toolConfig: B10,
  },
]

const g2d: Duel[] = [
  {
    id: 'g2-d1', problem: '38 + 25 = ?',
    a: { who: 'Ece', face: '👧', method: 'Basamak basamak toplama', steps: ['Birler: 8 + 5 = 13 → 3 yaz, 1 elde', 'Onlar: 3 + 2 + 1 = 6', 'Sonuç: 63'] },
    b: { who: 'Can', face: '👦', method: '10’a tamamlama', steps: ['38’e 2 ekledim: 40', '25’ten 2 verdim, 23 kaldı.', '40 + 23 = 63'] },
    verdict: 'both',
    reasons: [
      { t: 'İkisinin de her adımı doğru ve ikisi de 63 buldu.' },
      { t: 'Can’ın yolu yanlış, çünkü sayıları değiştirdi.', q: 'Can 38’e 2 ekleyip 25’ten 2 aldı. Toplam değişir mi?', mis: 'Telafi stratejisinde toplamın değiştiğini düşündü' },
    ],
    ok: [0],
    common: { opts: ['İkisi de bir onluk oluşturup onluklara ekledi.', 'İkisi de sayıları çarptı.', 'İkisi de sonucu tahmin etti.'], ok: 0 },
    nudge: 'İki çözümü de adım adım kontrol et. Can’ın 38’e verdiği 2, 25’ten alındı mı?',
    lesson: 'Ece 13 birlikten bir onluk çıkardı, Can 38’i 40’a tamamladı. İki yol da onluk oluşturarak aynı sonuca ulaşır.',
  },
  {
    id: 'g2-d2', problem: '50 − 18 = ?',
    a: { who: 'Zeynep', face: '👧🏽', method: 'Parçalayarak çıkarma', steps: ['50 − 10 = 40', '40 − 8 = 32', 'Sonuç: 32'] },
    b: { who: 'Mert', face: '👦🏻', method: 'Basamak basamak çıkarma', steps: ['Birler: 0 − 8 olmaz, 8 − 0 = 8', 'Onlar: 5 − 1 = 4', 'Sonuç: 48'] },
    verdict: 'a',
    reasons: [
      { t: 'Mert 0’dan 8 çıkmayınca sayıları ters çevirdi; onluk bozmalıydı.' },
      { t: 'Zeynep 18’i parçaladığı için yanlış yaptı.', q: '18 = 10 + 8. Önce 10, sonra 8 çıkarmak 18 çıkarmakla aynı mı?', mis: 'Çıkanı parçalayarak çıkarmanın geçersiz olduğunu düşündü' },
      { t: 'Mert onlar basamağını yanlış çıkardı.', q: '5 − 1 kaç? Sorun birlerde olabilir mi?' },
    ],
    ok: [0],
    nudge: 'Kontrol için ters işlem yap: 32 + 18 kaç? 48 + 18 kaç? Hangisi 50 ediyor?',
    lesson: '50’nin bir onluğunu bozunca 10 birlik olur: 10 − 8 = 2, onlarda 4 − 1 = 3 → 32. Zeynep de 18’i 10 ve 8 diye parçalayıp aynı sonuca ulaştı.',
  },
]

// ───────────────────────────── 3. sınıf ─────────────────────────────
const g3: Hunt[] = [
  {
    id: 'g3-iki-elde', who: 'Kerem', whoGen: 'Kerem’in', face: '👦', problem: '456 + 278 işlemini yap.',
    col: { a: 456, b: 278, op: '+', res: '634', marks: { 1: '1' } },
    steps: ['Birler: 6 + 8 = 14 → 4 yaz, 1 elde', 'Onlar: 5 + 7 + 1 = 13 → 3 yaz', 'Yüzler: 4 + 2 = 6', 'Sonuç: 634'],
    stepCol: [0, 1, 2, null],
    bug: [1, 2],
    why: [
      { t: 'Onlardan gelen 1 yüzlüğü (ikinci eldeyi) yüzlere eklemedi.' },
      { t: '6 + 8 = 14 yanlış.', q: '6 + 8 kaç eder? Bu adım doğruysa bir sonrakine bak.' },
      { t: 'Elde yalnızca bir kez olur.', q: 'Onlarda 13 onluk çıktı. 10 onluk neye eşittir?', mis: 'Bir işlemde yalnızca bir kez elde olabileceğini düşündü' },
    ],
    fix: { kind: 'num', tpl: '456 + 278 = {?}', ans: 734 },
    hint: 'Onlar basamağında 13 onluk çıktı. 13 onluğun içinde 1 yüzlük var mı?',
    mis: 'İkinci eldeyi (onluktan yüzlüğe) fark etmedi',
    lesson: '13 onluk = 1 yüzlük + 3 onluk. Yüzler: 4 + 2 + 1 = 7. Sonuç 734.',
    tool: 'base10', toolConfig: B10,
  },
  {
    id: 'g3-sifir-bozma', who: 'Ayşe', whoGen: 'Ayşe’nin', face: '👧🏻', problem: '503 − 247 işlemini yap.',
    col: { a: 503, b: 247, op: '−', res: '266', marks: { 0: '13', 1: '10', 2: '4' }, cross: [0, 1, 2] },
    steps: ['Birlerde 3’ten 7 çıkmaz; onlarda 0 var, 1 yüzlük bozdum: onlar 10 oldu.', 'Birlere 1 onluk verdim: 13 − 7 = 6', 'Onlar: 10 − 4 = 6', 'Yüzler: 4 − 2 = 2', 'Sonuç: 266'],
    stepCol: [2, 0, 1, 2, null],
    bug: [2],
    why: [
      { t: 'Birlere 1 onluk verdiği için onlarda 9 onluk kalmıştı, 10 değil.' },
      { t: 'Yüzlükten bozmaya gerek yoktu.', q: 'Onlar basamağında 0 onluk var. Birlere vermek için onluğu nereden bulacak?', mis: 'Sıfır olan basamaktan bozma yapılabileceğini düşündü' },
      { t: 'Yüzler 5 − 2 = 3 olmalıydı.', q: '1 yüzlük bozulunca yüzlerde kaç kaldı?', mis: 'Bozulan yüzlüğü yüzler basamağından düşmedi' },
    ],
    fix: { kind: 'num', tpl: '503 − 247 = {?}', ans: 256 },
    hint: '10 onluktan birini birlere verdin. Onlarda kaç onluk kaldı?',
    mis: 'Sıfırlı sayıda bozma yaparken onlukların azaldığını fark etmedi',
    lesson: '503 = 4 yüzlük + 9 onluk + 13 birlik. 13 − 7 = 6, 9 − 4 = 5, 4 − 2 = 2 → 256. Kontrol: 256 + 247 = 503.',
    tool: 'base10', toolConfig: B10,
  },
  {
    id: 'g3-yer-tutucu', who: 'Emir', whoGen: 'Emir’in', face: '🧒🏽', problem: '7 yüzlük ve 4 birlik hangi sayıyı oluşturur?',
    steps: ['7 yüzlük = 700', 'Onluk yok.', '4 birlik = 4', 'Sayı: 74'],
    bug: [3],
    why: [
      { t: 'Onluk olmasa da onlar basamağına 0 yazmalıydı.' },
      { t: '7 yüzlük 70 eder.', q: '1 yüzlük kaç onluk, kaç birliktir?', mis: 'Yüzlük ile onluğun değerini karıştırdı' },
      { t: 'Onluk olmadığına göre sayı iki basamaklıdır.', q: '74 kaç yüzlük içerir? 700’den büyük mü küçük mü?', mis: 'Sıfırın yer tutucu görevini bilmedi' },
    ],
    fix: { kind: 'num', tpl: '700 + 4 = {?}', ans: 704 },
    hint: '74 sayısında kaç yüzlük var? 700’den büyük olmalı mı?',
    mis: 'Sıfırın yer tutucu olduğunu fark etmedi',
    lesson: '0, onlar basamağının boş olduğunu gösterir: 704. 0 yazılmazsa 7 yüzlük, 7 onluk gibi okunur.',
    tool: 'base10', toolConfig: B10,
  },
  {
    id: 'g3-atlama', who: 'Nil', whoGen: 'Nil’in', face: '👧', problem: '300 − 125 işlemini yap.',
    steps: ['300 − 100 = 200', '200 − 20 = 180', '180 − 5 = 175'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Ters işlemle: 175 + 125 = 300' },
        { t: 'Tahminle: 300 − 130 = 170; 175 buna yakın' },
        { t: '175 + 300 = 475', q: 'Bu toplama neyi kontrol ediyor? Farkı kontrol etmek için hangi işlem gerekir?', mis: 'Çıkarmayı kontrol ederken yanlış ters işlem seçti' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Çıkanı parçalayarak çıkarma stratejisini hatalı sandı',
    lesson: 'Nil 125’i 100, 20 ve 5 diye parçalayıp sırayla çıkardı. Parçaların toplamı 125 olduğu için sonuç doğru.',
  },
  {
    id: 'g3-dogru-elde', who: 'Bora', whoGen: 'Bora’nın', face: '👦🏼', problem: '268 + 147 işlemini yap.',
    col: { a: 268, b: 147, op: '+', res: '415', marks: { 1: '1', 2: '1' } },
    steps: ['Birler: 8 + 7 = 15 → 5 yaz, 1 elde', 'Onlar: 6 + 4 + 1 = 11 → 1 yaz, 1 elde', 'Yüzler: 2 + 1 + 1 = 4', 'Sonuç: 415'],
    stepCol: [0, 1, 2, null],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Tahminle: 270 + 150 = 420; 415 buna yakın' },
        { t: 'Ters işlemle: 415 − 147 = 268' },
        { t: 'Her basamakta 9’dan büyük çıkanları atmalıydı', q: '15 birliği atarsak ne kaybederiz? 15 birlik neye eşit?', mis: 'Onluk bozma/aktarma yerine basamak toplamını atmayı düşündü' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'İki kez elde olan doğru toplamayı hatalı sandı',
    lesson: 'Bora iki kez elde aktardı: 15 birlikten 1 onluk, 11 onluktan 1 yüzlük. Tahmin de sonucu destekliyor.',
  },
  {
    id: 'g3-ters', who: 'Elif', whoGen: 'Elif’in', face: '👧🏼', problem: '382 − 156 işlemini yap.',
    col: { a: 382, b: 156, op: '−', res: '234' },
    steps: ['Birler: 6 − 2 = 4', 'Onlar: 8 − 5 = 3', 'Yüzler: 3 − 1 = 2', 'Sonuç: 234'],
    stepCol: [0, 1, 2, null],
    bug: [0],
    why: [
      { t: '2’den 6 çıkmayınca ters çıkardı; 1 onluk bozmalıydı.' },
      { t: 'Yüzlerde 3 − 1 yanlış.', q: '3 − 1 kaç? Birlere bak: üstte hangi rakam var?' },
      { t: 'Onlar 8 − 5 = 3 yanlış.', q: '8 − 5 kaç eder? Bu adım tek başına doğru. Peki onluk bozulsaydı onlar değişir miydi?' },
    ],
    fix: { kind: 'num', tpl: '382 − 156 = {?}', ans: 226 },
    hint: 'Birlerde üstte 2, altta 6 var. 2’den 6 çıkar mı?',
    mis: 'Çıkarmada ters çevirme hatasını fark etmedi',
    lesson: 'Bir onluk bozunca 12 − 6 = 6, onlarda 7 − 5 = 2, yüzlerde 3 − 1 = 2 → 226. Kontrol: 226 + 156 = 382.',
    tool: 'base10', toolConfig: B10,
  },
  {
    id: 'g3-onluk-yuzluk', who: 'Kerem', whoGen: 'Kerem’in', face: '👦', problem: '125 + 40 işlemini yap.',
    steps: ['40, 4 onluktur.', '125’in yüzlerine 4 ekledim: 1 + 4 = 5', 'Sonuç: 525'],
    bug: [1],
    why: [
      { t: '4 onluğu yüzlere ekledi; onluklara eklemeliydi.' },
      { t: '40, 4 yüzlüktür.', q: '40 içinde kaç tane 100 var?', mis: 'Onluk ile yüzlüğü karıştırdı' },
      { t: '1 + 4 = 5 yanlış.', q: '1 + 4 kaç eder? Asıl soru: 4 hangi basamağa eklenmeli?' },
    ],
    fix: { kind: 'num', tpl: '125 + 40 = {?}', ans: 165 },
    hint: '40 kaç onluk? 125’in onluklar basamağında hangi rakam var?',
    mis: 'Basamak değerine göre toplamayı fark etmedi',
    lesson: '125’te 2 onluk var: 2 + 4 = 6 onluk. Sonuç 165. 525, 125’ten 400 fazla olurdu!',
    tool: 'base10', toolConfig: B10,
  },
]

const g3d: Duel[] = [
  {
    id: 'g3-d1', problem: '199 + 245 = ?',
    a: { who: 'Ayşe', face: '👧🏻', method: 'Yuvarlak sayıya tamamlama', steps: ['199’a 1 ekledim: 200', '245’ten 1 aldım: 244', '200 + 244 = 444'] },
    b: { who: 'Bora', face: '👦🏼', method: 'Basamak basamak toplama', steps: ['Birler: 9 + 5 = 14 → 4, 1 elde', 'Onlar: 9 + 4 + 1 = 14 → 4, 1 elde', 'Yüzler: 1 + 2 + 1 = 4 → 444'] },
    verdict: 'both',
    reasons: [
      { t: 'İkisinin de adımları doğru, ikisi de 444 buldu.' },
      { t: 'Ayşe’nin yolu yanlış; 245’i değiştirdi.', q: 'Ayşe bir sayıya 1 ekleyip diğerinden 1 aldı. Toplam değişir mi?', mis: 'Telafi stratejisinde toplamın değiştiğini düşündü' },
    ],
    ok: [0],
    common: { opts: ['İkisi de basamak değerini kullandı: biri 200’e tamamladı, diğeri onluk ve yüzlükleri aktardı.', 'İkisi de çarpma yaptı.', 'İkisi de sayıları sıraladı.'], ok: 0 },
    nudge: 'Ayşe 199’a verdiği 1’i nereden aldı? Toplam değişti mi?',
    lesson: 'Ayşe 199’u 200’e tamamladı, Bora iki kez elde aktardı. Farklı yollar, aynı toplam: 444.',
  },
  {
    id: 'g3-d2', problem: '400 − 168 = ?',
    a: { who: 'Nil', face: '👧', method: 'Üstüne sayma', steps: ['168’den 200’e: 32', '200’den 400’e: 200', '32 + 200 = 232'] },
    b: { who: 'Emir', face: '🧒🏽', method: 'Basamak basamak çıkarma', steps: ['Birler: 0 − 8 olmaz → 8 − 0 = 8', 'Onlar: 0 − 6 olmaz → 6 − 0 = 6', 'Yüzler: 4 − 1 = 3 → 368'] },
    verdict: 'a',
    reasons: [
      { t: 'Emir sıfırlardan çıkaramayınca sayıları ters çevirdi; bozma yapmalıydı.' },
      { t: 'Nil toplama yaptığı için yanlış.', q: '168’e kaç eklersen 400 olur? Bu soru farkı vermez mi?', mis: 'Eksik toplanan (üstüne sayma) ile çıkarmanın ilişkisini görmedi' },
    ],
    ok: [0],
    nudge: 'Ters işlemle kontrol et: 232 + 168 ve 368 + 168 kaç eder?',
    lesson: 'Nil 168’den 400’e kadar saydı: fark 232. Emir’in sonucu 368 + 168 = 536 eder, 400 değil.',
  },
]

// ───────────────────────────── 4. sınıf ─────────────────────────────
const g4: Hunt[] = [
  {
    id: 'g4-sifirli-carp', who: 'Mert', whoGen: 'Mert’in', face: '👦🏻', problem: '305 × 4 işlemini yap.',
    steps: ['Birler: 5 × 4 = 20 → 0 yaz, 2 elde', 'Onlar: 0 × 4 = 0 → 0 yaz', 'Yüzler: 3 × 4 = 12', 'Sonuç: 1200'],
    bug: [1],
    why: [
      { t: '0 × 4 = 0 ama eldeki 2 onluğu eklemeyi unuttu.' },
      { t: '0 × 4 = 4 olmalıydı.', q: 'Hiç onluk yokken 4 kez “hiç” alırsan kaç olur?', mis: 'Sıfırla çarpımın sayının kendisi olduğunu düşündü' },
      { t: '5 × 4 = 20 yanlış.', q: '4 tane 5 kaç eder? Bu adım doğruysa 20’nin 2’sine ne oldu?' },
    ],
    fix: { kind: 'num', tpl: '305 × 4 = {?}', ans: 1220 },
    hint: 'İlk adımda 2 elde vardı. Bu 2 hangi adımda kullanıldı?',
    mis: 'Sıfırlı çarpmada eldeyi eklemeyi fark etmedi',
    lesson: '305 × 4 = 300 × 4 + 5 × 4 = 1200 + 20 = 1220. Onlarda 0 × 4 = 0, eldeyle 2.',
  },
  {
    id: 'g4-onluklar', who: 'Defne', whoGen: 'Defne’nin', face: '👧🏾', problem: '40 × 50 işlemini yap.',
    steps: ['40 × 50 = 4 × 10 × 5 × 10', '= 4 × 5 × 10 × 10', '= 20 × 10', '= 200'],
    bug: [2],
    why: [
      { t: 'İki tane × 10 vardı, birini unuttu: 20 × 10 × 10 olmalı.' },
      { t: 'Çarpanların yerini değiştirmek yanlış.', q: '4 × 5 ile 5 × 4 aynı mı? Çarpanların sırası sonucu değiştirir mi?', mis: 'Çarpmanın değişme özelliğini bilmedi' },
      { t: '4 × 5 = 9 olmalıydı.', q: '4 tane 5 kaç eder?', mis: 'Çarpmayı toplama ile karıştırdı' },
    ],
    fix: { kind: 'num', tpl: '40 × 50 = {?}', ans: 2000 },
    hint: 'İkinci adımda kaç tane “× 10” var? Üçüncü adımda kaç tane kaldı?',
    mis: 'Onluklarla çarpmada basamak değerini fark etmedi',
    lesson: '4 × 5 × 10 × 10 = 20 × 100 = 2000. 40 × 50, 4 onluk × 5 onluk = 20 yüzlük.',
  },
  {
    id: 'g4-birim-kesir', who: 'Can', whoGen: 'Can’ın', face: '👦', problem: '[[1/8]] ile [[1/4]]’i karşılaştır.',
    steps: ['Paydalar: 8 ve 4', '8 > 4', 'O hâlde [[1/8]] > [[1/4]]'],
    bug: [2],
    why: [
      { t: 'Payda büyüdükçe bütün daha çok parçaya bölünür; her parça küçülür.' },
      { t: '8 > 4 yanlış.', q: '8 mi büyük, 4 mü? Bu adım doğru. Peki büyük payda ne anlama gelir?' },
      { t: 'Paylar eşit olduğu için kesirler de eşittir.', q: 'Bir pizzanın 8’de 1’i ile 4’te 1’i aynı büyüklükte mi?', mis: 'Payları eşit kesirlerin eşit olduğunu düşündü' },
    ],
    fix: { kind: 'pick', prompt: 'Doğru karşılaştırmayı seç. Birden çok doğru yazım olabilir!', opts: ['[[1/8]] < [[1/4]]', '[[1/8]] > [[1/4]]', '[[1/4]] > [[1/8]]', '[[1/8]] = [[1/4]]'], ok: [0, 2] },
    hint: 'Aynı pizzayı 8 kişiyle mi, 4 kişiyle mi paylaşırsan sana daha büyük dilim düşer?',
    mis: '“Paydası büyük olan birim kesir büyüktür” yanılgısını fark etmedi',
    lesson: 'Bütün 8 parçaya bölünce her parça, 4 parçaya bölünenden küçüktür: [[1/8]] < [[1/4]].',
    tool: 'fractions', toolConfig: { dens: [2, 4, 8] },
  },
  {
    id: 'g4-esit-payda', who: 'Zeynep', whoGen: 'Zeynep’in', face: '👧🏽', problem: '[[3/5]] ile [[4/5]]’ü karşılaştır.',
    steps: ['Paydalar eşit: parçalar aynı büyüklükte', '4 parça, 3 parçadan fazladır.', '[[4/5]] > [[3/5]]'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Kesir şeridinde [[4/5]] daha uzun kalır.' },
        { t: '[[4/5]] bütüne daha yakın: bütüne [[1/5]] kalıyor.' },
        { t: '4 + 5 = 9, 3 + 5 = 8 ve 9 > 8', q: 'Pay ile paydayı toplamak kesrin büyüklüğünü verir mi? [[1/2]] ile [[2/6]]’yi bu yolla dene.', mis: 'Kesirleri pay ve paydanın toplamıyla karşılaştırdı' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Paydaları eşit kesirlerin karşılaştırılmasını hatalı sandı',
    lesson: 'Paydalar eşitse parçalar aynı büyüklüktedir; daha çok parça daha büyük kesirdir.',
  },
  {
    id: 'g4-dagilma', who: 'Arda', whoGen: 'Arda’nın', face: '🧒', problem: '120 × 3 işlemini yap.',
    steps: ['100 × 3 = 300', '20 × 3 = 60', '300 + 60 = 360'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Tekrarlı toplama: 120 + 120 + 120 = 360' },
        { t: 'Tahmin: 100 × 3 = 300; 360 biraz fazlası, makul' },
        { t: '120 + 3 = 123', q: '120 × 3, 3 tane 120 demek. 120 + 3 bunu verir mi?', mis: 'Çarpmayı toplama ile karıştırdı' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Parçalayarak çarpmayı hatalı sandı',
    lesson: 'Arda 120’yi 100 ve 20 diye parçalayıp her birini 3 ile çarptı: dağılma özelliği.',
  },
  {
    id: 'g4-eksik-dagilma', who: 'Elif', whoGen: 'Elif’in', face: '👧🏼', problem: '25 × 12 işlemini yap.',
    steps: ['12 = 10 + 2', '25 × 12 = 25 × 10 + 2', '= 250 + 2 = 252'],
    bug: [1],
    why: [
      { t: '2’yi de 25 ile çarpmalıydı: 25 × 10 + 25 × 2.' },
      { t: '12’yi 10 + 2 diye ayırmak yanlış.', q: '10 + 2 kaç eder? Parçalamak serbest, peki her parça ne ile çarpılmalı?', mis: 'Sayıyı parçalayarak çarpmanın yanlış olduğunu düşündü' },
      { t: '25 × 10 = 250 yanlış.', q: '10 tane 25 kaç eder?' },
    ],
    fix: { kind: 'num', tpl: '25 × 12 = {?}', ans: 300 },
    hint: '25 × 12, 12 tane 25 demek. 252’de kaç tane 25 var?',
    mis: 'Dağılma özelliğinde her parçayı çarpmayı fark etmedi',
    lesson: '25 × 12 = 25 × 10 + 25 × 2 = 250 + 50 = 300. 12 tane 25 = 10 tane 25 + 2 tane 25.',
    tool: 'dizilim',
  },
  {
    id: 'g4-binlik', who: 'Kerem', whoGen: 'Kerem’in', face: '👦', problem: '1005 × 3 işlemini yap.',
    steps: ['1005 = 1000 + 5', '5 × 3 = 15', '1000 × 3 = 300', '300 + 15 = 315'],
    bug: [2],
    why: [
      { t: '1000 × 3 = 3000; bir sıfırı (basamağı) kaybetti.' },
      { t: '1005’i 1000 + 5 diye ayırmak yanlış.', q: '1000 + 5 kaç eder?' },
      { t: 'Sıfırlar çarpmada önemsizdir.', q: '3 tane 1000 kaç eder? 300 mü, 3000 mi?', mis: 'Sıfırların basamak değerini önemsiz saydı' },
    ],
    fix: { kind: 'num', tpl: '1005 × 3 = {?}', ans: 3015 },
    hint: 'Tahmin et: 1005 × 3 yaklaşık kaç olmalı? 315 makul mü?',
    mis: 'Sıfırlı sayılarla çarpmada basamak değerini fark etmedi',
    lesson: '3 tane binlik 3000 eder: 3000 + 15 = 3015. Tahmin (1000 × 3 ≈ 3000) hatayı hemen gösterir.',
  },
]

const g4d: Duel[] = [
  {
    id: 'g4-d1', problem: '25 × 16 = ?',
    a: { who: 'Ayşe', face: '👧🏻', method: 'Çarpanlara ayırma', steps: ['16 = 4 × 4', '25 × 4 = 100', '100 × 4 = 400'] },
    b: { who: 'Emir', face: '🧒🏽', method: 'Parçalayarak çarpma', steps: ['16 = 10 + 6', '25 × 10 = 250, 25 × 6 = 150', '250 + 150 = 400'] },
    verdict: 'both',
    reasons: [
      { t: 'İkisinin de adımları doğru, ikisi de 400 buldu.' },
      { t: 'Ayşe’nin yolu yanlış, 16’yı çarpanlarına ayıramazsın.', q: '4 × 4 kaç eder? 25 × 4 × 4 ile 25 × 16 aynı mı?', mis: 'Çarpanlara ayırarak çarpmanın geçersiz olduğunu düşündü' },
    ],
    ok: [0],
    common: { opts: ['İkisi de 16’yı daha kolay parçalara ayırdı.', 'İkisi de 25’i yuvarladı.', 'İkisi de tekrarlı toplama yaptı.'], ok: 0 },
    nudge: 'Her iki çözümün son sonucunu tahminle karşılaştır: 25 × 16 yaklaşık kaç?',
    lesson: 'Ayşe 16’yı 4 × 4, Emir 10 + 6 olarak ayırdı. İkisi de çarpmayı kolay parçalara böldü.',
  },
  {
    id: 'g4-d2', problem: '[[1/3]] ile [[1/6]]’den hangisi büyük?',
    a: { who: 'Bora', face: '👦🏼', method: 'Paydaya bakma', steps: ['6 > 3', 'O hâlde [[1/6]] daha büyük.'] },
    b: { who: 'Nil', face: '👧', method: 'Parça büyüklüğünü düşünme', steps: ['Bütünü 3’e bölersem parçalar büyük olur.', 'Bütünü 6’ya bölersem parçalar küçülür.', '[[1/3]] daha büyük.'] },
    verdict: 'b',
    reasons: [
      { t: 'Payda büyüdükçe parçalar küçülür; Bora doğal sayılar gibi karşılaştırdı.' },
      { t: 'Bora haklı, çünkü 6 daha büyük sayı.', q: 'Bir çikolatayı 6 kişiyle mi, 3 kişiyle mi paylaşırsan sana daha çok düşer?', mis: '“Paydası büyük olan birim kesir büyüktür” diye düşündü' },
    ],
    ok: [0],
    nudge: 'Aynı büyüklükteki iki şeridi 3’e ve 6’ya böldüğünü düşün. Hangi parça daha uzun?',
    lesson: '[[1/3]], [[1/6]]’in iki katıdır. Birim kesirlerde payda büyüdükçe kesir küçülür.',
  },
]

// ───────────────────────────── 5. sınıf ─────────────────────────────
const g5: Hunt[] = [
  {
    id: 'g5-oncelik1', who: 'Defne', whoGen: 'Defne’nin', face: '👧🏾', problem: '3 + 4 × 2 işleminin sonucunu bul.',
    steps: ['3 + 4 = 7', '7 × 2 = 14', 'Sonuç: 14'],
    bug: [0],
    why: [
      { t: 'Çarpma, toplamadan önce yapılır; önce 4 × 2 hesaplanmalı.' },
      { t: 'İşlemler her zaman soldan sağa yapılır.', q: '3 + 4 × 2’de “4 tane 2” ile 3’ü topluyoruz. Önce hangisini bilmeliyiz?', mis: 'İşlem önceliğini gözetmeden soldan sağa işlem yaptı' },
      { t: '7 × 2 = 14 yanlış.', q: '7 × 2 kaç eder? Bu adım tek başına doğru; ilk adıma bak.' },
    ],
    fix: { kind: 'order', nums: [3, 4, 2], ops: ['+', '×'] },
    hint: '“3 elma ve 4 kutu, her kutuda 2 elma” desek toplam kaç elma olur?',
    mis: 'İşlem önceliği hatasını fark etmedi',
    lesson: 'Önce 4 × 2 = 8, sonra 3 + 8 = 11. Çarpma “gruplar” anlatır; önce grupları hesaplarız.',
  },
  {
    id: 'g5-soldan-saga', who: 'Mert', whoGen: 'Mert’in', face: '👦🏻', problem: '20 − 8 + 2 işleminin sonucunu bul.',
    steps: ['8 + 2 = 10', '20 − 10 = 10', 'Sonuç: 10'],
    bug: [0],
    why: [
      { t: 'Toplama ve çıkarma aynı önceliktedir; soldan sağa: önce 20 − 8.' },
      { t: 'Toplama her zaman çıkarmadan önce yapılır.', q: '20 TL’n var, 8 TL harcadın, sonra 2 TL buldun. Kaç TL’n olur?', mis: 'Toplamanın çıkarmadan önce yapıldığını düşündü' },
      { t: '20 − 10 = 10 yanlış.', q: '20 − 10 kaç? Bu adım doğru; 10’u nereden buldu?' },
    ],
    fix: { kind: 'order', nums: [20, 8, 2], ops: ['−', '+'] },
    hint: 'Hikâye kur: 20 TL’n var, 8 TL harcadın, sonra 2 TL kazandın. Ne kadar paran olur?',
    mis: 'Aynı öncelikli işlemlerde soldan sağa kuralını fark etmedi',
    lesson: '20 − 8 = 12, 12 + 2 = 14. Önce 8 + 2 yapmak, 2 TL’yi de harcamak gibi olur.',
  },
  {
    id: 'g5-oncelik-cok', who: 'Ayşe', whoGen: 'Ayşe’nin', face: '👧🏻', problem: '5 + 3 × 4 + 2 × 5 işleminin sonucunu bul.',
    steps: ['5 + 3 = 8', '8 × 4 = 32', '32 + 2 = 34', '34 × 5 = 170'],
    bug: [0],
    why: [
      { t: 'Çarpmaları önce yapmadı; 3 × 4 ve 2 × 5 önce hesaplanmalı.' },
      { t: 'Soldan sağa doğru yaptığı için doğru.', q: 'Çarpma ile toplama yan yana olunca hangisi önce gelir?', mis: 'İşlem önceliğini gözetmeden soldan sağa işlem yaptı' },
      { t: '34 × 5 = 170 yanlış.', q: '34 × 5 kaç? Bu adım doğru; asıl hata nerede başladı?' },
    ],
    fix: { kind: 'order', nums: [5, 3, 4, 2, 5], ops: ['+', '×', '+', '×'] },
    hint: 'İfadede kaç tane çarpma var? Onlar yapılmadan toplama yapılabilir mi?',
    mis: 'Çok işlemli ifadede işlem önceliği hatasını fark etmedi',
    lesson: '3 × 4 = 12 ve 2 × 5 = 10; sonra 5 + 12 + 10 = 27. İki çarpmanın hangisinin önce yapıldığı sonucu değiştirmez.',
  },
  {
    id: 'g5-cevre', who: 'Can', whoGen: 'Can’ın', face: '👦', problem: 'Kenarları 6 cm ve 4 cm olan dikdörtgenin çevresi kaç cm’dir?',
    steps: ['Çevre = 6 × 4', 'Çevre = 24 cm'],
    bug: [0],
    why: [
      { t: 'Kenarları çarptı; bu alanı verir. Çevre, kenar uzunluklarının toplamıdır.' },
      { t: '6 × 4 = 24 yanlış.', q: '6 × 4 kaç eder? İşlem doğru ama doğru işlem mi seçilmiş?' },
      { t: 'Çevre ile alan aynı şeydir.', q: 'Çitle bahçeyi çevirmek ile bahçeye çim ekmek aynı mı?', mis: 'Çevre ile alanı aynı kavram sandı' },
    ],
    fix: { kind: 'pick', prompt: 'Çevreyi hangi işlemler verir? Birden çok doğru yol var!', opts: ['6 + 4 + 6 + 4', '2 × (6 + 4)', '2 × 6 + 2 × 4', '6 × 4', '6 + 4'], ok: [0, 1, 2], result: 'Çevre = 20 cm' },
    hint: 'Bir karınca dikdörtgenin kenarları boyunca bir tur atsa kaç cm yürür?',
    mis: 'Çevre-alan karışıklığını fark etmedi',
    lesson: 'Çevre, sınırın uzunluğudur: 6 + 4 + 6 + 4 = 20 cm. 6 × 4 = 24 ise içi dolduran birim karelerin sayısıdır (cm²).',
    tool: 'alancevre',
  },
  {
    id: 'g5-alan', who: 'Zeynep', whoGen: 'Zeynep’in', face: '👧🏽', problem: 'Kenarları 5 cm ve 3 cm olan dikdörtgenin alanı kaç cm²’dir?',
    steps: ['Alan = 5 + 3 + 5 + 3', 'Alan = 16 cm²'],
    bug: [0],
    why: [
      { t: 'Kenarları topladı; bu çevreyi verir. Alan, içi dolduran birim karelerin sayısıdır.' },
      { t: '5 + 3 + 5 + 3 = 16 yanlış.', q: 'Toplamı kontrol et: 16 mı? Peki bu toplam neyi ölçer?' },
      { t: 'Birim cm olmalıydı, gerisi doğru.', q: 'İçini 1 cm’lik karelerle döşesen kaç kare gerekir?', mis: 'Alan ile çevreyi birim dışında aynı sandı' },
    ],
    fix: { kind: 'num', tpl: 'Alan = {?} cm²', ans: 15 },
    hint: 'Dikdörtgenin içini 1 cm’lik karelerle döşesen kaç sıra ve her sırada kaç kare olur?',
    mis: 'Alan yerine çevre hesaplandığını fark etmedi',
    lesson: '3 sıra, her sırada 5 birim kare: 5 × 3 = 15 cm². 16 cm ise çevredir.',
    tool: 'alancevre',
  },
  {
    id: 'g5-cevreden-kenar', who: 'Emir', whoGen: 'Emir’in', face: '🧒🏽', problem: 'Çevresi 18 cm olan dikdörtgenin kısa kenarı 4 cm’dir. Uzun kenarı kaç cm’dir?',
    steps: ['İki kısa kenar: 4 + 4 = 8', 'Kalan: 18 − 8 = 10', 'Uzun kenar: 10 ÷ 2 = 5 cm'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Kontrol: 4 + 5 + 4 + 5 = 18' },
        { t: 'Kontrol: 2 × (4 + 5) = 18' },
        { t: 'Kontrol: 4 × 5 = 20 ≠ 18, yanlış', q: '4 × 5 neyi hesaplar: çevreyi mi, alanı mı?', mis: 'Çevreyi kontrol ederken alan hesapladı' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Çevreden kenar bulmayı hatalı sandı',
    lesson: 'Emir önce iki kısa kenarı çıkardı, kalanı iki uzun kenara eşit paylaştırdı. Çevre formülüyle iki yoldan kontrol edilebilir.',
    tool: 'alancevre',
  },
  {
    id: 'g5-parantez', who: 'Arda', whoGen: 'Arda’nın', face: '🧒', problem: '(8 + 4) ÷ 3 × 2 işleminin sonucunu bul.',
    steps: ['Önce parantez: 8 + 4 = 12', '12 ÷ 3 = 4', '4 × 2 = 8'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Önce parantez yapıldı.' },
        { t: 'Bölme ve çarpma soldan sağa yapıldı: önce 12 ÷ 3.' },
        { t: 'Çarpma bölmeden önce gelir: 12 ÷ 6 = 2 olmalı', q: '12 elmayı 3 kişiye paylaştırıp sonra her payı 2 katına çıkarsan kaç olur?', mis: 'Çarpmanın bölmeden önce yapıldığını düşündü' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Parantezli ifadenin doğru çözümünü hatalı sandı',
    lesson: 'Önce parantez, sonra çarpma ve bölme soldan sağa: 12 ÷ 3 = 4, 4 × 2 = 8.',
  },
]

const g5d: Duel[] = [
  {
    id: 'g5-d1', problem: '6 × 7 + 6 × 3 = ?',
    a: { who: 'Kerem', face: '👦', method: 'Önce çarpmalar', steps: ['6 × 7 = 42', '6 × 3 = 18', '42 + 18 = 60'] },
    b: { who: 'Nil', face: '👧', method: 'Ortak çarpan (dağılma)', steps: ['İkisinde de 6’lık gruplar var.', '6 × (7 + 3)', '= 6 × 10 = 60'] },
    verdict: 'both',
    reasons: [
      { t: 'İkisi de doğru: 7 grup 6 ile 3 grup 6, toplam 10 grup 6’dır.' },
      { t: 'Nil yanlış; parantez ekleyemezsin.', q: '7 tane 6 ile 3 tane 6’yı toplarsan kaç tane 6 olur?', mis: 'Dağılma özelliğini geçersiz saydı' },
    ],
    ok: [0],
    common: { opts: ['İkisi de toplam 10 tane 6’lık grubu hesapladı.', 'İkisi de soldan sağa işlem yaptı.', 'İkisi de sonucu yuvarladı.'], ok: 0 },
    nudge: 'Nil’in yolunu grupla düşün: 7 tane 6 ve 3 tane 6 daha. Toplam kaç tane 6?',
    lesson: 'Kerem işlem önceliğini kullandı, Nil dağılma özelliğini. 6 × 7 + 6 × 3 = 6 × 10.',
  },
  {
    id: 'g5-d2', problem: '12 m’ye 8 m boyutlarındaki bahçenin etrafına çit çekilecek. Kaç m çit gerekir?',
    a: { who: 'Bora', face: '👦🏼', method: 'Kenarları çarpma', steps: ['12 × 8 = 96', 'Çit: 96 m'] },
    b: { who: 'Elif', face: '👧🏼', method: 'Çevreyi bulma', steps: ['12 + 8 = 20', '2 × 20 = 40', 'Çit: 40 m'] },
    verdict: 'b',
    reasons: [
      { t: 'Çit bahçenin çevresine çekilir; 96 alanı verir ve birimi m²’dir.' },
      { t: 'Bora haklı, çünkü çarpma daha büyük sonuç verir.', q: 'Çit nereye çekilir: bahçenin sınırına mı, her yerine mi?', mis: 'Çevre ile alanı karıştırdı' },
    ],
    ok: [0],
    nudge: 'Bahçenin sınırında yürüdüğünü düşün. Kaç m yürürsün?',
    lesson: 'Çit sınırı çevreler: 2 × (12 + 8) = 40 m. 96 m² ise bahçenin alanıdır.',
  },
]

// ───────────────────────────── 6. sınıf ─────────────────────────────
const g6: Hunt[] = [
  {
    id: 'g6-ondalik-kars', who: 'Elif', whoGen: 'Elif’in', face: '👧🏼', problem: '0,25 ile 0,3’ü karşılaştır.',
    steps: ['0,25 = 25 yüzde bir', '0,3 = 3 onda bir', '25 > 3 olduğundan 0,25 > 0,3'],
    bug: [2],
    why: [
      { t: 'Farklı birimleri karşılaştırdı: 3 onda bir = 30 yüzde bir, yani 0,3 = 0,30.' },
      { t: '0,3, 3 yüzde birdir.', q: 'Virgülden sonraki ilk basamak onda birler mi, yüzde birler mi?', mis: 'Ondalık basamak değerlerini karıştırdı' },
      { t: 'Basamak sayısı çok olan ondalık daha büyüktür.', q: '0,3 = 0,30 yazılabilir mi? Şimdi basamak sayıları eşit.', mis: '“Basamağı çok olan ondalık daha büyüktür” yanılgısı' },
    ],
    fix: { kind: 'pick', prompt: 'Doğru karşılaştırmayı seç. Birden çok doğru yazım olabilir!', opts: ['0,25 < 0,3', '0,3 > 0,25', '0,25 > 0,3', '0,25 = 0,3'], ok: [0, 1] },
    hint: '0,3’ü yüzde birlerle yazabilir misin? 3 onda bir kaç yüzde bir eder?',
    mis: '“Basamağı çok olan ondalık büyüktür” yanılgısını fark etmedi',
    lesson: '0,3 = 0,30 = 30 yüzde bir. 25 yüzde bir < 30 yüzde bir, yani 0,25 < 0,3.',
    tool: 'yuzdeizgarasi',
  },
  {
    id: 'g6-virgul-hiza', who: 'Kerem', whoGen: 'Kerem’in', face: '👦', problem: '2,5 + 1,25 işlemini yap.',
    steps: ['Sayıları sağdan hizaladım.', '25 + 125 = 150', 'Sonuç: 1,50'],
    bug: [0, 1],
    why: [
      { t: 'Virgülleri alt alta getirmedi; onda birler ile yüzde birler karıştı.' },
      { t: '25 + 125 = 150 yanlış.', q: '25 + 125 kaç eder? Doğru; ama 2,5 gerçekten 25 mi?' },
      { t: 'Ondalık sayılar doğal sayılar gibi sağdan hizalanır.', q: '2,5’teki 5 onda bir mi, yüzde bir mi? 1,25’teki 5 nedir?', mis: 'Ondalık sayıları doğal sayılar gibi sağdan hizaladı' },
    ],
    fix: { kind: 'num', tpl: '2,5 + 1,25 = {?}', ans: 3.75 },
    hint: 'Tahmin et: 2,5 + 1,25 yaklaşık kaçtır? 1,50 makul mü?',
    mis: 'Ondalık toplamada basamak hizalama hatasını fark etmedi',
    lesson: '2,50 + 1,25: aynı basamaklar alt alta → 3,75. Tahmin (2 + 1 = 3’ten büyük) 1,50’nin olamayacağını gösterir.',
  },
  {
    id: 'g6-yuzde-butun', who: 'Can', whoGen: 'Can’ın', face: '👦', problem: '%20’si 15 olan sayı kaçtır?',
    steps: ['Sayının %20’si 15', '15’in %20’sini buldum: 3', 'Cevap: 3'],
    bug: [1],
    why: [
      { t: '15 parçadır, bütün değil. %20’si 15 ise %100’ü 15’in 5 katıdır.' },
      { t: '15’in %20’si 3 değildir.', q: '15’in beşte biri kaç? Hesap doğru; ama soru bunu mu soruyor?' },
      { t: 'Yüzde her zaman verilen sayının yüzdesi alınarak bulunur.', q: 'Sayının %20’si 15 ise sayı 15’ten büyük mü küçük mü olmalı?', mis: 'Parça-bütün ilişkisini yüzdede ters kurdu' },
    ],
    fix: { kind: 'num', tpl: 'Sayı = {?}', ans: 75 },
    hint: 'Bütün %100. %20 bütünün beşte biri. Cevap 15’ten büyük mü olmalı, küçük mü?',
    mis: 'Yüzdede parça ile bütünü karıştırdığını fark etmedi',
    lesson: '%20 = 15 ise %100 = 5 × 15 = 75. Kontrol: 75’in %20’si 15.',
    tool: 'yuzdeizgarasi',
  },
  {
    id: 'g6-ondalik-carp', who: 'Ayşe', whoGen: 'Ayşe’nin', face: '👧🏻', problem: '0,4 × 0,2 işlemini yap.',
    steps: ['4 × 2 = 8', '0,4 × 0,2 = 0,8'],
    bug: [1],
    why: [
      { t: 'Onda bir × onda bir = yüzde bir; sonuç 0,08 olmalı.' },
      { t: '4 × 2 = 8 yanlış.', q: '4 × 2 kaç? Bu doğru; asıl soru 8’in hangi basamakta olduğu.' },
      { t: 'Çarpma her zaman sonucu büyütür.', q: '0,4’ün 0,2 katı, 0,4’ün beşte biri demek. Büyür mü küçülür mü?', mis: '“Çarpma her zaman büyütür” yanılgısı' },
    ],
    fix: { kind: 'num', tpl: '0,4 × 0,2 = {?}', ans: 0.08 },
    hint: '0,4’ün 0,2 katı, 0,4’ün yarısından da az olmalı. 0,8 bundan büyük mü?',
    mis: 'Ondalık çarpmada basamak değerini fark etmedi',
    lesson: '[[4/10]] × [[2/10]] = [[8/100]] = 0,08. 1’den küçük bir sayıyla çarpınca sonuç küçülür.',
  },
  {
    id: 'g6-indirim', who: 'Zeynep', whoGen: 'Zeynep’in', face: '👧🏽', problem: '200 TL’lik ürüne %15 indirim yapıldı. Yeni fiyat kaç TL?',
    steps: ['%10’u: 20 TL', '%5’i: 10 TL', '%15’i: 30 TL', 'Yeni fiyat: 200 − 30 = 170 TL'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: '%85’i ödenir: 200 × [[85/100]] = 170' },
        { t: '%15 + %85 = %100; 30 + 170 = 200' },
        { t: '200 − 15 = 185 olmalı', q: '%15, 15 TL mi demek? 200 TL’nin %15’i kaç TL?', mis: 'Yüzde ile miktarı karıştırdı' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Yüzdeyi parçalayarak hesaplamayı hatalı sandı',
    lesson: 'Zeynep %15’i %10 + %5 diye parçaladı. Yeni fiyat, fiyatın %85’i olarak da bulunabilir.',
    tool: 'yuzdeizgarasi',
  },
  {
    id: 'g6-ondalik-dogru', who: 'Bora', whoGen: 'Bora’nın', face: '👦🏼', problem: '1,5 ile 1,45’i karşılaştır.',
    steps: ['1,5 = 1,50', '50 yüzde bir > 45 yüzde bir', '1,5 > 1,45'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Sayı doğrusunda 1,5, 1,45’in sağındadır.' },
        { t: '1,45’in basamağı daha çok, o hâlde daha büyük', q: '1,45 ile 1,50’yi yan yana yaz. Basamak sayıları aynı; hangisi büyük?', mis: '“Basamağı çok olan ondalık daha büyüktür” yanılgısı' },
        { t: 'Onda birler basamağında 5 > 4.' },
      ],
      ok: [0, 2],
    },
    hint: '', mis: '',
    trap: '“Basamağı çok olan ondalık daha büyüktür” yanılgısıyla doğru çözümü hatalı sandı',
    lesson: 'Bora 1,5’i 1,50 yazarak birimleri eşitledi. Onda birler basamağına bakmak ya da sayı doğrusu da aynı sonucu verir.',
    tool: 'kesirdogrusu',
  },
  {
    id: 'g6-yuzde-bolme', who: 'Defne', whoGen: 'Defne’nin', face: '👧🏾', problem: '40 kişilik sınıfın %25’i gözlüklüdür. Kaç kişi gözlüklüdür?',
    steps: ['%25 = [[25/100]]', '40 ÷ 25 = 1,6', 'Cevap: 1,6 kişi'],
    bug: [1],
    why: [
      { t: '%25 dörtte birdir; 40’ı 25’e değil, 4’e bölmeliydi (ya da 40 × [[25/100]]).' },
      { t: '%25 = [[25/100]] yanlış.', q: '%25, 100’de 25 demek değil mi? Bu adım doğru.' },
      { t: 'Kişi sayısı ondalıklı olabilir.', q: '1,6 kişi olabilir mi? Cevap makul mü?', mis: 'Sonucun bağlama uygunluğunu kontrol etmedi' },
    ],
    fix: { kind: 'num', tpl: '{?} kişi', ans: 10 },
    hint: '%25 kesir olarak kaçta kaçtır? 40 kişinin dörtte biri kaç kişi?',
    mis: 'Yüzde hesabında işlem seçimi hatasını fark etmedi',
    lesson: '%25 = [[1/4]]. 40’ın dörtte biri 10 kişi. “1,6 kişi” sonucu bağlama uymadığı için hata ipucuydu.',
    tool: 'yuzdeizgarasi',
  },
]

const g6d: Duel[] = [
  {
    id: 'g6-d1', problem: '0,5 × 18 = ?',
    a: { who: 'Nil', face: '👧', method: 'Yarım olarak düşünme', steps: ['0,5 = [[1/2]]', '18’in yarısı: 9'] },
    b: { who: 'Emir', face: '🧒🏽', method: 'Kesre çevirme', steps: ['0,5 = [[5/10]]', '[[5/10]] × 18 = [[90/10]]', '= 9'] },
    verdict: 'both',
    reasons: [
      { t: 'İkisi de doğru: 0,5 = [[5/10]] = [[1/2]].' },
      { t: 'Çarpma büyütür; sonuç 18’den büyük olmalı.', q: '18’in yarısı 18’den büyük olabilir mi?', mis: '“Çarpma her zaman büyütür” yanılgısı' },
    ],
    ok: [0],
    common: { opts: ['İkisi de 0,5’i kesir olarak düşündü.', 'İkisi de virgülü kaydırdı.', 'İkisi de 18’i yuvarladı.'], ok: 0 },
    nudge: '0,5 ile çarpmak neye benzer? 18’den büyük bir sonuç makul mü?',
    lesson: '0,5, [[1/2]] ve [[5/10]] aynı sayının farklı yazılışları. Biri yarıyı, diğeri onda biri kullandı.',
  },
  {
    id: 'g6-d2', problem: '60’ın %30’u kaçtır?',
    a: { who: 'Arda', face: '🧒', method: '%10’dan gitme', steps: ['%10’u: 6', '%30’u: 3 × 6 = 18'] },
    b: { who: 'Kerem', face: '👦', method: 'Yüzde sayısını çıkarma', steps: ['60 − 30 = 30', 'Cevap: 30'] },
    verdict: 'a',
    reasons: [
      { t: 'Kerem yüzdeyi sayı gibi çıkardı; %30, 60’ın 100’de 30’u demektir.' },
      { t: 'Arda yanlış; %30 = 30’dur.', q: '%30, 30 tane mi demek yoksa 100’de 30 mu?', mis: 'Yüzdeyi mutlak miktar sandı' },
    ],
    ok: [0],
    nudge: 'Kontrol et: 60’ın %50’si 30 eder. %30’u bundan az mı olmalı, eşit mi?',
    lesson: '%10’u 6 ise %30’u 18. Kerem’in 30’u aslında %50’dir.',
  },
]

// ───────────────────────────── 7. sınıf ─────────────────────────────
const g7: Hunt[] = [
  {
    id: 'g7-negatif-carp', who: 'Arda', whoGen: 'Arda’nın', face: '🧒', problem: '(−3) × (−4) işlemini yap.',
    steps: ['(−3) × (−4)', 'İki negatif sayı: sonuç negatif', '= −12'],
    bug: [1],
    why: [
      { t: 'Negatif × negatif pozitiftir: (−4)’ün tersinin 3 katı.' },
      { t: 'İki negatif sayı toplanınca negatif olur, çarpınca da öyle.', q: 'Toplama ile çarpmanın işaret kuralı aynı mı? (−1) × (−1) kaç?', mis: 'Toplama ve çarpmanın işaret kurallarını karıştırdı' },
      { t: '3 × 4 = 12 yanlış.', q: 'Mutlak değerler doğru; işarete bak.' },
    ],
    fix: { kind: 'num', tpl: '(−3) × (−4) = {?}', ans: 12 },
    hint: 'Örüntüye bak: (−3) × 2 = −6, (−3) × 1 = −3, (−3) × 0 = 0, (−3) × (−1) = ?',
    mis: 'Negatif × negatif işaret kuralı hatasını fark etmedi',
    lesson: '(−3) × 1 = −3, (−3) × 0 = 0, (−3) × (−1) = 3… Her adımda 3 artar; (−3) × (−4) = 12.',
  },
  {
    id: 'g7-farkli-isaret', who: 'Nil', whoGen: 'Nil’in', face: '👧', problem: '−7 + 3 işlemini yap.',
    steps: ['İşaretler farklı.', 'Mutlak değerleri topladım: 7 + 3 = 10', 'Sonuç: −10'],
    bug: [1],
    why: [
      { t: 'İşaretler farklıyken mutlak değerler çıkarılır: −7’den 3 sağa → −4.' },
      { t: 'Sonuç pozitif olmalıydı.', q: '−7’den 3 birim sağa gidince sıfırı geçer misin?', mis: 'Farklı işaretli toplamada sonucun işaretini karıştırdı' },
      { t: 'Negatif sayıyla toplama yapılamaz.', q: 'Borcun 7 TL, 3 TL ödedin. Borcun kaç TL kaldı?', mis: 'Negatif sayılarla toplamayı anlamlandıramadı' },
    ],
    fix: { kind: 'num', tpl: '−7 + 3 = {?}', ans: -4 },
    hint: 'Sayı doğrusunda −7’den başla, 3 birim sağa git. Nereye vardın?',
    mis: 'Farklı işaretli tam sayı toplamada hata yaptığını fark etmedi',
    lesson: '−7 + 3: 7 borçtan 3 ödendi → 4 borç kaldı: −4. Sayı doğrusunda −7’den 3 sağa.',
    tool: 'numberline', toolConfig: { min: -10, max: 5, step: 1 },
  },
  {
    id: 'g7-denklem-isaret', who: 'Kerem', whoGen: 'Kerem’in', face: '👦', problem: '3x + 5 = 20 denklemini çöz.',
    steps: ['3x + 5 = 20', '3x = 20 + 5', '3x = 25', 'x = [[25/3]]'],
    bug: [1],
    why: [
      { t: 'İki taraftan da 5 çıkarmalıydı: 3x = 20 − 5.' },
      { t: '20 + 5 = 25 yanlış.', q: '20 + 5 kaç? Hesap doğru; ama 5’e ne yapılmalıydı?' },
      { t: 'Terimi karşıya atarken işaret aynı kalır.', q: 'Terazinin bir kefesinden 5 alırsan dengeyi korumak için diğer kefeye ne yaparsın?', mis: 'Eşitliğin korunumunu (iki tarafa aynı işlem) anlamadı' },
    ],
    fix: { kind: 'pick', prompt: 'Doğru ikinci adımı seç. Birden çok doğru yazım var!', opts: ['3x = 20 − 5', '3x + 5 − 5 = 20 − 5', '3x = 15', '3x = 20 + 5', '3x + 5 = 15'], ok: [0, 1, 2], result: 'x = 5' },
    hint: 'Teraziyi düşün: sol kefede 3x ve 5 birim, sağda 20 birim. 5 birimi kaldırırsan sağ kefeye ne olur?',
    mis: 'Denklemde ters işlem hatasını fark etmedi',
    lesson: 'İki taraftan 5 çıkar: 3x = 15, sonra iki tarafı 3’e böl: x = 5. Kontrol: 3 × 5 + 5 = 20.',
    tool: 'balance',
  },
  {
    id: 'g7-tek-taraf', who: 'Defne', whoGen: 'Defne’nin', face: '👧🏾', problem: '2x − 4 = 10 denklemini çöz.',
    steps: ['2x − 4 + 4 = 10', '2x = 10', 'x = 5'],
    bug: [0],
    why: [
      { t: 'Sadece sol tarafa 4 ekledi; dengeyi korumak için sağa da 4 eklemeliydi.' },
      { t: '4 eklemek yerine 4 çıkarmalıydı.', q: '−4’ü yok etmek için ne eklemeli? Asıl soru: bunu kaç tarafa yaptı?', mis: 'Ters işlemi yanlış seçti' },
      { t: 'x = 5 doğru, çünkü 2 × 5 = 10.', q: 'x = 5’i ilk denklemde dene: 2 × 5 − 4 kaç eder?', mis: 'Çözümü ilk denklemde sınamadı' },
    ],
    fix: { kind: 'pick', prompt: 'İlk adımı düzelt. Birden çok doğru yazım var!', opts: ['2x − 4 + 4 = 10 + 4', '2x = 14', '2x − 4 + 4 = 10', '2x = 10 − 4'], ok: [0, 1], result: 'x = 7' },
    hint: 'x = 5’i ilk denklemde dene: 2 · 5 − 4 kaç eder? 10 mu?',
    mis: 'Eşitliğin yalnız bir tarafına işlem yapıldığını fark etmedi',
    lesson: 'İki tarafa 4 ekle: 2x = 14, x = 7. Kontrol: 2 × 7 − 4 = 10. Sınama hatayı hemen yakalar.',
    tool: 'balance',
  },
  {
    id: 'g7-toplamsal', who: 'Bora', whoGen: 'Bora’nın', face: '👦🏼', problem: '4 kişilik kek tarifinde 6 yumurta var. 6 kişilik kek için kaç yumurta gerekir?',
    steps: ['4 kişiden 6 kişiye: 2 kişi fazla', '6 + 2 = 8 yumurta'],
    bug: [1],
    why: [
      { t: 'Orantıda fark değil oran korunur: kişi sayısı 1,5 katına çıktı, yumurta da 1,5 katına çıkmalı.' },
      { t: '4’ten 6’ya fark 2 değildir.', q: '6 − 4 kaç? Fark doğru; ama farkı eklemek orantıyı korur mu?' },
      { t: 'Her kişiye 1 yumurta düştüğü için 2 eklenir.', q: '4 kişiye 6 yumurta: kişi başına kaç yumurta düşüyor?', mis: 'Toplamsal düşünme ile orantıyı karıştırdı' },
    ],
    fix: { kind: 'num', tpl: '{?} yumurta', ans: 9 },
    hint: 'Kişi başına kaç yumurta düşüyor? 2 kişilik tarifte kaç yumurta olurdu?',
    mis: 'Orantıda toplamsal düşünme hatasını fark etmedi',
    lesson: '2 kişi → 3 yumurta. 6 kişi = 3 × 2 kişi → 3 × 3 = 9 yumurta. Oran (2 : 3) aynı kalır.',
    tool: 'orantablosu',
  },
  {
    id: 'g7-bolme-isaret', who: 'Ayşe', whoGen: 'Ayşe’nin', face: '👧🏻', problem: '(−12) ÷ 3 işlemini yap.',
    steps: ['12 ÷ 3 = 4', 'İşaretler farklı: sonuç negatif', '(−12) ÷ 3 = −4'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Kontrol: 3 × (−4) = −12' },
        { t: '12 TL borç 3 kişiye eşit paylaşılırsa her biri 4 TL borçlanır.' },
        { t: 'Bölmede sonuç her zaman pozitiftir', q: '3 × 4 = 12 mi, −12 mi? Bölmeyi çarpma ile kontrol et.', mis: 'Bölmede işaret kuralını bilmedi' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Doğru işaret kuralını hatalı sandı',
    lesson: 'Bölme, çarpmanın tersidir: 3 × (−4) = −12. Borç bağlamı da aynı sonucu verir.',
  },
  {
    id: 'g7-orantı-dogru', who: 'Emir', whoGen: 'Emir’in', face: '🧒🏽', problem: '5 defter 40 TL ise 8 defter kaç TL?',
    steps: ['1 defter: 40 ÷ 5 = 8 TL', '8 defter: 8 × 8 = 64 TL'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Oran tablosu: 10 defter 80 TL, 2 defter 16 TL; 80 − 16 = 64' },
        { t: 'Defter başına fiyat (8 TL) her durumda aynı kaldı.' },
        { t: '3 defter fazla, 40 + 3 = 43 TL olmalı', q: '1 defter 8 TL ise 3 defter daha kaç TL eder?', mis: 'Orantıda toplamsal düşündü' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Birim fiyatla orantı çözümünü hatalı sandı',
    lesson: 'Emir birim fiyatı buldu. Oran tablosuyla 10 ve 2 defterden gitmek de aynı sonucu verir: 64 TL.',
    tool: 'orantablosu',
  },
]

const g7d: Duel[] = [
  {
    id: 'g7-d1', problem: '2(x + 3) = 14 denklemini çöz.',
    a: { who: 'Zeynep', face: '👧🏽', method: 'Önce dağıtma', steps: ['2x + 6 = 14', '2x = 8', 'x = 4'] },
    b: { who: 'Can', face: '👦', method: 'Önce iki tarafı bölme', steps: ['İki tarafı 2’ye böldüm: x + 3 = 7', 'x = 4'] },
    verdict: 'both',
    reasons: [
      { t: 'İkisi de eşitliğin iki tarafına aynı işlemi yaptı; x = 4 iki denklemi de sağlar.' },
      { t: 'Can yanlış; önce parantez açılmalı.', q: '2(x + 3) = 14 ise (x + 3) kaç olmalı? Parantezi açmadan bulabilir misin?', mis: 'Denklem çözümünde tek bir doğru adım sırası olduğunu düşündü' },
    ],
    ok: [0],
    common: { opts: ['İkisi de dengeyi koruyarak iki tarafa aynı işlemi yaptı.', 'İkisi de x’i tahmin etti.', 'İkisi de terimleri işaret değiştirerek karşıya attı.'], ok: 0 },
    nudge: 'x = 4’ü ilk denklemde dene: 2(4 + 3) kaç eder?',
    lesson: 'Zeynep dağıttı, Can böldü. Farklı ilk adımlar; ikisi de dengeyi korudu ve x = 4 buldu.',
  },
  {
    id: 'g7-d2', problem: '2 bardak unla 3 kek yapılıyor. 6 bardak unla kaç kek yapılır?',
    a: { who: 'Mert', face: '👦🏻', method: 'Farkı ekleme', steps: ['Un 2’den 6’ya: 4 bardak fazla', '3 + 4 = 7 kek'] },
    b: { who: 'Elif', face: '👧🏼', method: 'Katını alma', steps: ['Un 3 katına çıktı (2 × 3 = 6).', 'Kek de 3 katı: 3 × 3 = 9 kek'] },
    verdict: 'b',
    reasons: [
      { t: 'Orantıda oran korunur; Mert farkı ekleyerek toplamsal düşündü.' },
      { t: 'Mert haklı; 4 bardak fazla un, 4 kek fazla demek.', q: '2 bardak un 3 kek yapıyorsa 4 bardak un kaç kek yapar?', mis: 'Orantıda toplamsal düşündü' },
    ],
    ok: [0],
    nudge: 'Un ile kek arasındaki ilişkiyi tabloyla düşün: 2 → 3, 4 → ?, 6 → ?',
    lesson: '2 → 3, 4 → 6, 6 → 9. Un kaç katına çıkarsa kek de o kadar katına çıkar.',
  },
]

// ───────────────────────────── 8. sınıf ─────────────────────────────
const g8: Hunt[] = [
  {
    id: 'g8-us-carp', who: 'Emir', whoGen: 'Emir’in', face: '🧒🏽', problem: '2^{3} kaçtır?',
    steps: ['2^{3} = 2 · 3', '= 6'],
    bug: [0],
    why: [
      { t: 'Üs, tabanın kendisiyle kaç kez çarpılacağını gösterir: 2 · 2 · 2.' },
      { t: '2 · 3 = 6 yanlış.', q: '2 · 3 = 6 doğru. Peki 2^{3}, 2 · 3 mü demek?' },
      { t: '2^{3} = 3 · 3 olmalı.', q: 'Taban hangisi, üs hangisi? Hangi sayı tekrar tekrar çarpılıyor?', mis: 'Taban ile üssü karıştırdı' },
    ],
    fix: { kind: 'num', tpl: '2^{3} = {?}', ans: 8 },
    hint: '2^{2} kaçtır? 2^{3}, 2^{2}’nin kaç katı olmalı?',
    mis: '“Üs, tabanla çarpılır” yanılgısını fark etmedi',
    lesson: '2^{3} = 2 · 2 · 2 = 8. Kenarı 2 olan küpün içinde 8 birim küp vardır.',
  },
  {
    id: 'g8-toplam-kare', who: 'Zeynep', whoGen: 'Zeynep’in', face: '👧🏽', problem: '(3 + 4)^{2} kaçtır?',
    steps: ['(3 + 4)^{2} = 3^{2} + 4^{2}', '= 9 + 16', '= 25'],
    bug: [0],
    why: [
      { t: 'Kare, toplamaya dağılmaz; önce parantez: 7^{2} = 49. Karede iki dikdörtgen eksik kaldı.' },
      { t: '3^{2} + 4^{2} = 9 + 16 yanlış.', q: '3^{2} ve 4^{2} kaç? Bu adım doğru; ilk adıma bak.' },
      { t: 'Parantezin karesi her terimin karesidir.', q: 'Kenarı 7 olan kareyi 3 + 4 diye böl. İçinde kaç parça oluşuyor?', mis: '“(a + b)^{2} = a^{2} + b^{2}” yanılgısı' },
    ],
    fix: { kind: 'pick', prompt: 'Hangisi (3 + 4)^{2} ile eşittir? Birden çok doğru yazım var!', opts: ['7^{2} = 49', '3^{2} + 2 · 3 · 4 + 4^{2} = 49', '3^{2} + 4^{2} = 25', '(3 + 4) · 2 = 14'], ok: [0, 1], result: '(3 + 4)^{2} = 49' },
    hint: 'Önce parantezin içini hesaplasan ne olur? 25 ile aynı mı?',
    mis: '“(a + b)^{2} = a^{2} + b^{2}” yanılgısını fark etmedi',
    lesson: 'Kenarı 3 + 4 olan kare: 3 × 3 kare, 4 × 4 kare ve iki tane 3 × 4 dikdörtgen. 9 + 16 + 24 = 49 = 7^{2}.',
  },
  {
    id: 'g8-kok-toplam', who: 'Kerem', whoGen: 'Kerem’in', face: '👦', problem: '√{9 + 16} kaçtır?',
    steps: ['√{9 + 16} = √{9} + √{16}', '= 3 + 4', '= 7'],
    bug: [0],
    why: [
      { t: 'Karekök toplamaya dağılmaz; önce topla: √{25} = 5.' },
      { t: '√{9} + √{16} = 3 + 4 yanlış.', q: '√{9} ve √{16} kaç? Bu adım doğru; ilk adıma bak.' },
      { t: 'Kök, toplamın her terimine ayrı ayrı uygulanır.', q: '7^{2} kaç eder? 9 + 16’ya eşit mi?', mis: '“√{a + b} = √{a} + √{b}” yanılgısı' },
    ],
    fix: { kind: 'num', tpl: '√{9 + 16} = {?}', ans: 5 },
    hint: 'Kontrol et: 7^{2} = 49. 9 + 16 kaç ediyor?',
    mis: '“√{a + b} = √{a} + √{b}” yanılgısını fark etmedi',
    lesson: '√{9 + 16} = √{25} = 5. Dik kenarları 3 ve 4 olan üçgenin hipotenüsü de 5’tir, 7 değil!',
  },
  {
    id: 'g8-egim-isaret', who: 'Ayşe', whoGen: 'Ayşe’nin', face: '👧🏻', problem: 'A(1, 2) ve B(3, −2) noktalarından geçen doğrunun eğimini bul.',
    steps: ['Dikey değişim: −2 − 2 = −4', 'Yatay değişim: 3 − 1 = 2', 'Eğim = [[4/2]] = 2'],
    bug: [2],
    why: [
      { t: 'Dikey değişim negatifti; işareti kaybetti. Doğru sağa doğru alçalıyor, eğim −2.' },
      { t: 'Eğim yatay değişim bölü dikey değişimdir.', q: 'Eğim “her 1 birim sağa gidince kaç birim yükseliyor” demek. Hangisi pay olmalı?', mis: 'Eğimde dikey ve yatay değişimi ters kurdu' },
      { t: 'Eğim negatif olamaz.', q: 'Sağa giderken aşağı inen bir yokuş düşün. Eğimi nasıl ifade edilir?', mis: 'Eğimin negatif olabileceğini bilmedi' },
    ],
    fix: { kind: 'num', tpl: 'Eğim = {?}', ans: -2 },
    hint: 'A’dan B’ye giderken doğru yükseliyor mu, alçalıyor mu? Eğimin işareti ne olmalı?',
    mis: 'Eğimin işaretini kaybettiğini fark etmedi',
    lesson: 'Eğim = [[−4/2]] = −2. A’dan B’ye 2 birim sağa giderken 4 birim aşağı iniliyor.',
    tool: 'egim',
  },
  {
    id: 'g8-pisagor-kenar', who: 'Mert', whoGen: 'Mert’in', face: '👦🏻', problem: 'Bir dik kenarı 6 cm, hipotenüsü 10 cm olan dik üçgende diğer dik kenar kaç cm?',
    steps: ['x^{2} = 6^{2} + 10^{2}', 'x^{2} = 136', 'x = √{136}'],
    bug: [0],
    why: [
      { t: 'En uzun kenar hipotenüstür (10); dik kenarların kareleri toplamı hipotenüsün karesine eşittir.' },
      { t: '6^{2} + 10^{2} = 136 yanlış.', q: '36 + 100 kaç? Hesap doğru; peki eşitlik doğru kurulmuş mu?' },
      { t: 'Pisagor bağıntısında hangi kenarın karesi alındığı önemli değildir.', q: 'x = √{136} ≈ 11,7 olurdu. Bir dik kenar hipotenüsten uzun olabilir mi?', mis: 'Pisagor bağıntısında hipotenüsü ayırt etmedi' },
    ],
    fix: { kind: 'pick', prompt: 'Doğru eşitliği seç. Birden çok doğru yazım var!', opts: ['x^{2} + 6^{2} = 10^{2}', 'x^{2} = 10^{2} − 6^{2}', 'x^{2} = 6^{2} + 10^{2}', 'x = 10 − 6'], ok: [0, 1], result: 'x^{2} = 64, x = 8 cm' },
    hint: 'Hangi kenar en uzun olmalı? x = √{136} ≈ 11,7, hipotenüs 10’dan büyük çıkar mı?',
    mis: 'Pisagor bağıntısında yanlış kenarı hipotenüs aldığını fark etmedi',
    lesson: 'x^{2} + 36 = 100 → x^{2} = 64 → x = 8 cm. 6–8–10, 3–4–5 üçgeninin 2 katı.',
    tool: 'dinamikucgen',
  },
  {
    id: 'g8-us-carpim', who: 'Nil', whoGen: 'Nil’in', face: '👧', problem: '2^{3} · 2^{2} kaçtır?',
    steps: ['2^{3} · 2^{2} = (2 · 2 · 2) · (2 · 2)', '= 2^{5}', '= 32'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Toplam beş tane 2 çarpılıyor.' },
        { t: 'Kontrol: 8 · 4 = 32' },
        { t: 'Üsler çarpılır: 2^{6} = 64', q: 'Kaç tane 2 çarpılıyor? Say: (2 · 2 · 2) · (2 · 2)', mis: 'Aynı tabanlı çarpımda üsleri çarptı' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Aynı tabanlı üslü sayıların çarpımını hatalı sandı',
    lesson: 'Nil çarpanları açıp saydı: beş tane 2 → 2^{5}. Kural ezberlemeden üsleri toplamanın nedeni bu.',
  },
  {
    id: 'g8-kok-sadele', who: 'Bora', whoGen: 'Bora’nın', face: '👦🏼', problem: '√{48} ifadesini a√{b} biçiminde yaz.',
    steps: ['48 = 16 · 3', '√{48} = √{16} · √{3}', '= 4√{3}'],
    bug: null,
    why: [],
    verify: {
      opts: [
        { t: 'Kontrol: (4√{3})^{2} = 16 · 3 = 48' },
        { t: 'Tahmin: √{48} ≈ 6,9 ve 4 · 1,73 ≈ 6,9' },
        { t: '√{48} = √{40} + √{8} olmalı', q: 'Karekök toplamaya dağılır mı? √{9 + 16} ile √{9} + √{16} aynı mı?', mis: '“√{a + b} = √{a} + √{b}” yanılgısı' },
      ],
      ok: [0, 1],
    },
    hint: '', mis: '',
    trap: 'Kareköklü ifadeyi sadeleştirmeyi hatalı sandı',
    lesson: 'Bora 48’i tam kare çarpanıyla ayırdı: √{16 · 3} = 4√{3}. Kare alarak ya da tahminle iki yoldan kontrol edilir.',
  },
  {
    id: 'g8-eksi-us', who: 'Elif', whoGen: 'Elif’in', face: '👧🏼', problem: '−3^{2} kaçtır?',
    steps: ['−3^{2}', '= (−3) · (−3)', '= 9'],
    bug: [1],
    why: [
      { t: 'Üs yalnızca 3’e aittir: −3^{2} = −(3 · 3) = −9. Parantez olsaydı 9 olurdu.' },
      { t: '(−3) · (−3) = −9 olmalı.', q: 'Negatif × negatif kaçtır? Bu çarpım 9; sorun ifadenin okunuşunda.', mis: 'Negatif × negatif işaret kuralını karıştırdı' },
      { t: '−3^{2} ile (−3)^{2} aynıdır.', q: '−3^{2}’de taban hangisi: 3 mü, −3 mü? Parantez neyi değiştirir?', mis: '−a^{n} ile (−a)^{n} ifadelerini aynı sandı' },
    ],
    fix: { kind: 'num', tpl: '−3^{2} = {?}', ans: -9 },
    hint: '−3^{2} ile (−3)^{2} aynı ifade mi? Üs hangi sayıya ait?',
    mis: '−a^{n} ile (−a)^{n} farkını fark etmedi',
    lesson: '−3^{2} = −(3^{2}) = −9; (−3)^{2} = 9. Parantez, tabanın −3 olduğunu gösterir.',
  },
]

const g8d: Duel[] = [
  {
    id: 'g8-d1', problem: 'Bir dik kenarı 5, hipotenüsü 13 olan dik üçgende diğer dik kenar kaçtır?',
    a: { who: 'Arda', face: '🧒', method: 'Pisagor bağıntısıyla hesaplama', steps: ['x^{2} = 13^{2} − 5^{2}', 'x^{2} = 169 − 25 = 144', 'x = 12'] },
    b: { who: 'Defne', face: '👧🏾', method: 'Pisagor üçlüsünü tanıma', steps: ['5, 12, 13 bilinen bir Pisagor üçlüsü.', 'Kontrol: 25 + 144 = 169', 'x = 12'] },
    verdict: 'both',
    reasons: [
      { t: 'İkisi de 5^{2} + x^{2} = 13^{2} ilişkisini kullandı ve 12 buldu.' },
      { t: 'Defne yanlış; ezberden cevap verilmez.', q: 'Defne cevabını kontrol etti mi? 25 + 144 kaç ediyor?', mis: 'Bilinen ilişkiyle tahmin edip kontrol etmeyi geçersiz saydı' },
    ],
    ok: [0],
    common: { opts: ['İkisi de dik kenarların kareleri toplamının hipotenüsün karesine eşit olmasını kullandı.', 'İkisi de 13 − 5 işlemini yaptı.', 'İkisi de açı ölçtü.'], ok: 0 },
    nudge: 'İki sonucu da sına: 5^{2} + 12^{2} = 13^{2} mi?',
    lesson: 'Arda hesapladı, Defne tanıyıp kontrol etti. İkisi de aynı ilişkiye dayanıyor.',
  },
  {
    id: 'g8-d2', problem: '3^{2} · 3^{3} kaçtır?',
    a: { who: 'Can', face: '👦', method: 'Çarpanları sayma', steps: ['(3 · 3) · (3 · 3 · 3)', 'Beş tane 3: 3^{5}', '= 243'] },
    b: { who: 'Ayşe', face: '👧🏻', method: 'Üsleri çarpma', steps: ['3^{2 · 3}', '= 3^{6}', '= 729'] },
    verdict: 'a',
    reasons: [
      { t: 'Aynı tabanlı çarpımda çarpanlar sayılır: 2 + 3 = 5 tane 3. Üsler toplanır.' },
      { t: 'Ayşe haklı; üsler çarpılır.', q: '(3 · 3) · (3 · 3 · 3) içinde kaç tane 3 var?', mis: 'Aynı tabanlı çarpımda üsleri çarptı' },
    ],
    ok: [0],
    nudge: 'Çarpanları açarak yaz: 3^{2} · 3^{3} içinde kaç tane 3 var?',
    lesson: '3^{2} · 3^{3} = 3^{5} = 243. Üsler ancak bir kuvvetin kuvveti alınırken çarpılır: (3^{2})^{3} = 3^{6}.',
  },
]

export const huntBank: Record<Grade, Hunt[]> = { 1: g2, 2: g2, 3: g3, 4: g4, 5: g5, 6: g6, 7: g7, 8: g8 }
export const duelBank: Record<Grade, Duel[]> = { 1: g2d, 2: g2d, 3: g3d, 4: g4d, 5: g5d, 6: g6d, 7: g7d, 8: g8d }
