import type { Grade } from '../../../data/types'
import { area, perim, tl, type Art, type Cell, type Rect } from './city'

/** Görevler: sınıfa göre yapı, temsil ve düşünme düzeyi değişir */

export type Show = 'area' | 'perim' | 'cost' | 'costx' | 'rows' | 'posts' | 'grid' | 'numbers'

export interface Verdict {
  ok: boolean
  msg: string
  misconception?: string
  optimal?: boolean
}

export interface Diag {
  msg: string
  misconception?: string
}

export interface Budget {
  fence?: number
  grass?: number
  total?: number
}

export type Follow =
  | { kind: 'pick'; q: string; best: 'minPerim' | 'maxArea'; why: string }
  | { kind: 'num'; q: string; answer: number; unit: string; diagnose: (n: number) => Diag }
  | { kind: 'choice'; q: string; choices: string[]; answer: number; wrong: string }

interface Base {
  title: string
  prompt: string
  hints: string[]
  /** "Nasıl düşündün?" seçenekleri */
  picker?: string[]
  /** Tercih edilen konum (yerleşim için) */
  at: Cell
}

export type Mission =
  | (Base & { kind: 'road'; goal: number; ask?: { q: string; per: number; diagnose: (n: number, len: number) => Diag } })
  | (Base & { kind: 'fence'; size: [number, number]; art: Art; ask: string; answer: number; unit: string; diagnose: (n: number) => Diag })
  | (Base & { kind: 'compute'; size: [number, number]; art: Art; fence: boolean; show: Show[]; ask: string; answer: number; diagnose: (n: number) => Diag })
  | (Base & { kind: 'count'; cells: Cell[]; estimate: string[]; correctRange: number })
  | (Base & {
      kind: 'design'
      art: Art
      label?: string
      start: [number, number]
      show: Show[]
      budget?: Budget
      fence: boolean
      check: (r: Rect) => Verdict
      goal: number
      /** En iyi tasarımı bulmak gerekir (en büyük alan vb.) */
      optimal?: boolean
      follow?: Follow
    })

export const areaUnit = (g: Grade) => (g >= 5 ? 'm²' : 'birimkare')
export const costOf = (r: Rect, b: Budget) => (b.fence ?? 0) * perim(r) + (b.grass ?? 0) * area(r)

// ── kontrol üreteçleri ─────────────────────────────────────────────

function byArea(n: number, unit: string, noun = 'park'): (r: Rect) => Verdict {
  return (r) => {
    const a = area(r), p = perim(r)
    if (a === n) return { ok: true, msg: `Harika! ${r.h} sıra × ${r.w} kare = ${a} ${unit}.` }
    if (p === n) return { ok: false, msg: `Bu ${noun}ın çevresi ${n} m ama içinde ${a} kare var. Alan, içini kaplayan karelerdir; kenarları değil, içini say.`, misconception: 'Alan ile çevreyi karıştırıyor' }
    return { ok: false, msg: `Bu ${noun} ${a} ${unit} oldu. ${n} ${unit} için ${a < n ? 'büyütmen' : 'küçültmen'} gerek. Bir sırada kaç kare var, kaç sıra var?` }
  }
}

function byPerim(n: number, unit: string): (r: Rect) => Verdict {
  return (r) => {
    const a = area(r), p = perim(r)
    if (p === n) return { ok: true, msg: `Harika! ${r.w} + ${r.h} + ${r.w} + ${r.h} = ${p} m çit.` }
    if (a === n) return { ok: false, msg: `İçinde ${n} ${unit} var ama çit kenarlar boyunca gider. Çevreyi bulurken kenarların hepsini saydın mı?`, misconception: 'Çevre ile alanı karıştırıyor' }
    if (r.w + r.h === n) return { ok: false, msg: `Yalnızca iki kenar ${n} m ediyor. Çit dört kenarı da dolaşır; çevreyi bulurken kenarların hepsini saydın mı?`, misconception: 'Çevrede yalnızca iki kenarı topluyor' }
    return { ok: false, msg: `Bu parkın çevresi ${p} m oldu. Çevreyi bulurken kenarların hepsini saydın mı? ${p < n ? 'Biraz büyütmeyi' : 'Biraz küçültmeyi'} dene.` }
  }
}

const parkTip = (n: number) => `Dört kenarın toplamı ${n} olmalı. Karşılıklı kenarlar eşit: bir uzun bir kısa kenar ${n / 2} m etmeli.`

// ── 3. sınıf ───────────────────────────────────────────────────────

function grade3(): Mission[] {
  return [
    {
      kind: 'road', title: 'Okul yolu', at: [6, 10], goal: 2,
      prompt: 'Mahalleden okula yol yap! Turuncu karodan parmağını sürükle ya da yanındaki karelere dokun. En kısa yol kaç kare? Farklı bir en kısa yol daha bul.',
      hints: ['Gölün etrafından dolaşmak yolu uzatır mı?', 'Okul sağda ve aşağıda. Hep sağa ve aşağı gidersen yol kısalır mı?', 'Yolun her karesi 1 m. Karelerin üstündeki sayılar yolun uzunluğunu gösterir.'],
    },
    {
      kind: 'fence', title: 'Oyun parkına çit', at: [19, 11], size: [5, 3], art: 'oyun', unit: 'm', answer: 16,
      prompt: 'Oyun parkının etrafına çit çekelim. Her kenara dokunarak çiti kur. Kaç metre çit kullandın?',
      ask: 'Kaç metre çit kullandın?',
      hints: ['Her direk arası 1 m. Bir kenarda kaç aralık var?', 'Dört kenarın uzunluklarını tek tek topla.'],
      picker: ['Direkleri tek tek saydım', 'Dört kenarı topladım', 'Uzun ve kısa kenarı toplayıp iki kere aldım'],
      diagnose: (n) =>
        n === 8 ? { msg: 'Yalnızca iki kenarı mı saydın? Çit parkın dört kenarını da dolaşır.', misconception: 'Çevrede yalnızca iki kenarı topluyor' }
        : n === 15 ? { msg: 'Parkın içindeki kareleri saydın galiba. Çit kenarlar boyunca gider; kenarlardaki çit aralıklarını say.', misconception: 'Çevre ile alanı karıştırıyor' }
        : n === 13 || n === 11 ? { msg: 'Bir kenarı unutmuş olabilir misin? Dört kenarı tek tek topla.' }
        : { msg: 'Çevreyi bulurken kenarların hepsini saydın mı? Her kenarda kaç metre çit var?' },
    },
    {
      kind: 'fence', title: 'Çitin parası', at: [4, 2], size: [4, 2], art: 'park', unit: 'TL', answer: 36,
      prompt: 'Bu küçük parkın çitinin metresi 3 TL. Önce çiti kur, sonra çitin tamamının kaç TL tuttuğunu bul.',
      ask: 'Çitin tamamı kaç TL?',
      hints: ['Önce kaç metre çit gerektiğini bul.', 'Her metre 3 TL ise 3’er 3’er sayabilirsin.'],
      picker: ['3’er 3’er saydım', '12 + 12 + 12 yaptım', '10 × 3 ile 2 × 3’ü topladım'],
      diagnose: (n) =>
        n === 12 ? { msg: '12, çitin metre olarak uzunluğu. Her metresi 3 TL ise toplam kaç TL olur?' }
        : n === 18 ? { msg: 'Bu iki kenarın parası. Dört kenarın hepsini hesaba kattın mı?', misconception: 'Çevrede yalnızca iki kenarı topluyor' }
        : n === 24 ? { msg: 'Parkın içindeki 8 kareyi mi kullandın? Çit, kenarlar boyunca gider.', misconception: 'Çevre ile alanı karıştırıyor' }
        : { msg: 'Kaç metre çit var? Her metre için 3 TL: 3’er 3’er saymayı dene.' },
    },
    {
      kind: 'design', title: '12 metre çit', at: [18, 6], art: 'park', start: [2, 2], show: ['posts'], fence: true, goal: 2,
      prompt: 'Elinde 12 m çit var. Çevresi 12 m olan bir park yap. Köşelerden çekerek büyüt ya da küçült, sonra “Kur”a bas. Farklı biçimde ikinci bir park daha bul!',
      hints: ['Direkler arasını say: her aralık 1 m.', parkTip(12), 'Örneğin uzun kenar 4 m ise kısa kenar kaç m olmalı?'],
      check: byPerim(12, 'kare'),
      follow: { kind: 'choice', q: 'İki parkın çiti aynı uzunlukta. Peki ikisi aynı büyüklükte mi?', choices: ['Evet, aynı büyüklükte', 'Hayır, birinin içinde daha çok kare var'], answer: 1, wrong: 'İki parkın içindeki kareleri say. Aynı sayıda mı?' },
      picker: ['Deneyerek büyüttüm, küçülttüm', 'Kenarları toplayarak hesapladım', 'Direkleri saydım'],
    },
    {
      kind: 'design', title: '70 TL’lik çit', at: [14, 12], art: 'oyun', start: [2, 1], show: ['posts', 'cost'], budget: { fence: 5, total: 70 }, fence: true, goal: 2,
      prompt: 'Çitin metresi 5 TL. 70 TL’nin tamamını harcayacak bir oyun alanı yap. Başka biçimde bir tane daha bul!',
      hints: ['70 TL ile kaç metre çit alabilirsin? 5’er 5’er say.', '70 TL ile 14 m çit alınır. Çevresi 14 m olan bir alan yap.'],
      check: (r) => {
        const c = perim(r) * 5
        if (c === 70) return { ok: true, msg: `Tam 70 TL! Çevre ${perim(r)} m, ${perim(r)} × 5 = 70.` }
        return { ok: false, msg: `Bu çit ${tl(c)} tutuyor. ${c < 70 ? 'Hâlâ paran var, biraz büyütebilirsin.' : 'Paran yetmiyor, biraz küçült.'} 70 TL kaç metre çit eder?` }
      },
      picker: ['Önce kaç metre çit alabileceğimi buldum', 'Deneyerek büyüttüm, küçülttüm', '5’er 5’er saydım'],
    },
  ]
}

// ── 4. sınıf ───────────────────────────────────────────────────────

function grade4(): Mission[] {
  const u = 'birimkare'
  return [
    {
      kind: 'road', title: 'Okul yolu', at: [6, 10], goal: 1,
      prompt: 'Mahalleden okula en kısa yolu yap. Turuncu karodan sürükle ya da karelere dokun.',
      hints: ['Gölün etrafından dolaşmak yolu uzatır mı?', 'Okula doğru hep sağa ve aşağı gidersen yol kısalır mı?'],
      ask: {
        q: 'Yolun her karesi 20 TL. Yolun tamamı kaç TL?', per: 20,
        diagnose: (n, len) =>
          n === len ? { msg: `${len}, yoldaki kare sayısı. Her kare 20 TL ise toplam kaç TL olur?` }
          : n === len * 2 ? { msg: 'Her kare 2 TL değil, 20 TL. 10 TL’nin iki katı olduğunu düşün.' }
          : { msg: `Yolda ${len} kare var. ${len} tane 20 TL kaç eder? Önce 10 tane 20’yi düşünebilirsin.` },
      },
      picker: ['10 × 20 ile 1 × 20’yi topladım', '20’şer 20’şer saydım', '11 × 2 yapıp sonuna 0 ekledim'],
    },
    {
      kind: 'count', title: 'Çiçek bahçesi', at: [4, 2], correctRange: 2,
      cells: [...[0, 1, 2, 3, 4, 5].flatMap((x) => [[x, 0], [x, 1]] as Cell[]), ...[0, 1, 2].flatMap((x) => [[x, 2], [x, 3], [x, 4]] as Cell[])],
      estimate: ['10’dan az', '10 ile 20 arası', '20 ile 30 arası', '30’dan çok'],
      prompt: 'Belediye bu L biçimli bahçenin her birimkaresine bir kasa çiçek dikecek. Kaç kasa gerekir? Önce tahmin et, sonra say!',
      hints: ['Karelere tek tek dokunabilir ya da soldaki sıra düğmeleriyle bir sırayı bir kerede sayabilirsin.', 'Bahçeyi iki dikdörtgene ayırmayı dene.'],
      picker: ['Tek tek saydım', 'Sıraları sayıp topladım', 'İki dikdörtgene ayırdım'],
    },
    {
      kind: 'design', title: '12 birimkarelik park', at: [19, 7], art: 'park', start: [2, 2], show: ['grid'], fence: true, goal: 2,
      prompt: 'Alanı 12 birimkare olan bir park yap ve “Kur”a bas. En az iki farklı park bul. Hangisi en az çit gerektirir?',
      hints: ['Parkın içindeki kareleri say: kaç sıra, her sırada kaç kare?', '12 kareyi eşit sıralara dizmenin kaç yolu var? 2 sıra, 3 sıra…'],
      check: byArea(12, u),
      follow: { kind: 'pick', q: 'Hangi park en az çit gerektirir? Dokun.', best: 'minPerim', why: 'Çevrelerini karşılaştır: kareye yakın olan dikdörtgenin çevresi daha kısa.' },
      picker: ['Kareleri sıra sıra dizdim', 'Çarpma kullandım (3 × 4 = 12)', 'Deneyerek buldum'],
    },
    {
      kind: 'design', title: '16 metre çit', at: [15, 12], art: 'park', start: [2, 2], show: ['posts', 'grid'], fence: true, goal: 2,
      prompt: 'Çevresi 16 m olan iki farklı park yap. Hangisinde çocuklara daha çok çim (alan) kalıyor?',
      hints: ['Direkler arasını say: her aralık 1 m.', parkTip(16)],
      check: byPerim(16, u),
      follow: { kind: 'pick', q: 'Hangisinde daha çok çim var? Dokun.', best: 'maxArea', why: 'İçlerindeki kareleri say: çevre aynı ama alanlar farklı!' },
    },
    {
      kind: 'compute', title: 'Park bütçesi', at: [19, 3], size: [6, 4], art: 'park', fence: true, show: ['grid', 'posts'], answer: 160,
      prompt: 'Bu parka çim ekip çevresine çit çekeceğiz. Çimin birimkaresi 5 TL, çitin metresi 2 TL.',
      ask: 'Toplam kaç TL harcanır?',
      hints: ['İki ayrı hesap var: çim parkın içine (alan), çit kenarlarına (çevre).', 'Kaç birimkare çim, kaç metre çit gerekiyor?'],
      picker: ['Önce çimi, sonra çiti hesapladım', 'Önce çiti, sonra çimi hesapladım', 'Tahmin edip kontrol ettim'],
      diagnose: (n) =>
        n === 120 ? { msg: '120 TL çimin parası. Çiti unutmuş olabilir misin?' }
        : n === 40 ? { msg: '40 TL çitin parası. Peki çim?' }
        : n === 148 ? { msg: 'Fiyatlar yer değiştirmiş olabilir mi? Çim alana (içine), çit çevreye (kenarlara) gider.', misconception: 'Alan ile çevreyi karıştırıyor' }
        : n === 140 ? { msg: 'Çiti yalnızca iki kenar için mi hesapladın? Çit dört kenarı da dolaşır.', misconception: 'Çevrede yalnızca iki kenarı topluyor' }
        : { msg: 'Çim: kaç birimkare × 5 TL? Çit: kaç metre × 2 TL? Sonra ikisini topla.' },
    },
    {
      kind: 'design', title: '96 TL’lik çim', at: [17, 9], art: 'park', start: [2, 2], show: ['grid', 'cost'], budget: { grass: 4, total: 96 }, fence: false, goal: 2,
      prompt: 'Çimin birimkaresi 4 TL. 96 TL’nin tamamını harcayacak bir park yap. Başka biçimde bir tane daha bul!',
      hints: ['96 TL ile kaç birimkare çim alınır?', '96 ÷ 4 = 24. Alanı 24 birimkare olan dikdörtgenler hangileri?'],
      check: (r) => {
        const c = area(r) * 4
        if (c === 96) return { ok: true, msg: `Tam 96 TL! ${area(r)} birimkare × 4 TL = 96 TL.` }
        return { ok: false, msg: `Bu park ${area(r)} birimkare, çimi ${tl(c)}. ${c < 96 ? 'Biraz büyütebilirsin.' : 'Paran yetmiyor.'} 96 TL kaç birimkare çim eder?` }
      },
      picker: ['Önce 96 ÷ 4 yaptım', 'Deneyerek buldum', '4’er 4’er saydım'],
    },
  ]
}

// ── 5. sınıf ───────────────────────────────────────────────────────

function grade5(): Mission[] {
  const u = 'm²'
  return [
    {
      kind: 'road', title: 'Okul yolu', at: [6, 10], goal: 1,
      prompt: 'Mahalleden okula en kısa yolu yap. Turuncu karodan sürükle ya da karelere dokun.',
      hints: ['Gölün etrafından dolaşmak yolu uzatır mı?', 'Kaç kare sağa, kaç kare aşağı gitmen gerekiyor?'],
      ask: {
        q: 'Yolun metresi 15 TL, her kare 1 m. Yol kaç TL tutar?', per: 15,
        diagnose: (n, len) =>
          n === len ? { msg: `${len}, yolun metre olarak uzunluğu. Her metresi 15 TL ise?` }
          : { msg: `${len} × 15 için ${len} × 10 ile ${len} × 5’i ayrı ayrı bulup toplayabilirsin.` },
      },
      picker: ['× 10 ve × 5’i topladım', 'Alt alta çarptım', '15’er 15’er saydım'],
    },
    {
      kind: 'design', title: 'Kütüphane', at: [19, 8], art: 'bina', label: 'Kütüphane', start: [2, 2], show: ['rows'], fence: false, goal: 3,
      prompt: 'Kütüphanenin taban alanı 24 m² olacak. Farklı dikdörtgen tabanlar dene: en az 3 tane bul!',
      hints: ['Bir sırada kaç kare var? Kaç sıra var? Sıra sayısı × bir sıradaki kare = alan.', '24’ü iki sayının çarpımı olarak kaç farklı yolla yazabilirsin?'],
      check: byArea(24, u, 'taban'),
      follow: { kind: 'pick', q: 'Duvarların toplam uzunluğu (çevre) en kısa olan hangisi? Dokun.', best: 'minPerim', why: 'Çevrelerini karşılaştır: kenarları birbirine yakın olanın çevresi en kısa.' },
      picker: ['24’ün çarpanlarını düşündüm', 'Sıra ekleyip çıkararak denedim', 'Bir kenarı seçip 24’ü ona böldüm'],
    },
    {
      kind: 'design', title: '20 metrelik bahçe', at: [15, 12], art: 'park', start: [2, 2], show: ['grid', 'area'], fence: true, goal: 3,
      prompt: 'Çevresi 20 m olan bahçeler yap. Kenar uzunlukları doğal sayı olsun. En az 3 farklı bahçe bul!',
      hints: ['Karşılıklı kenarlar eşit. Bir uzun ve bir kısa kenar toplam kaç m etmeli?', 'Uzun kenar + kısa kenar = 10 m. 1 + 9, 2 + 8, …'],
      check: byPerim(20, u),
      follow: {
        kind: 'num', q: 'Çevresi 20 m, bir kenarı 7 m olan bahçenin diğer kenarı kaç m?', answer: 3, unit: 'm',
        diagnose: (n) =>
          n === 13 ? { msg: '20 − 7 = 13 ama 7 m’lik kenardan iki tane var! İki kenar 7 + 7 eder.', misconception: 'Çevreden kenar bulurken karşılıklı kenarları unutuyor' }
          : n === 6 ? { msg: '20 − 7 − 7 = 6 iki kısa kenarın toplamı. Bir kenar kaç m?' }
          : { msg: 'Uzun kenar + kısa kenar çevrenin yarısı eder. 10 − 7 = ?' },
      },
    },
    {
      kind: 'design', title: 'En büyük park', at: [17, 4], art: 'park', start: [2, 3], show: ['grid', 'area', 'perim'], fence: true, goal: 1, optimal: true,
      prompt: '24 m çitin var. Çitin tamamını kullanarak alanı en büyük olan parkı tasarla! Her denemen tabloya yazılır.',
      hints: ['Tablodaki parkları karşılaştır: hangi biçimde alan büyüyor?', 'Kenarlar birbirine yaklaştıkça alan ne oluyor?'],
      check: (r) => {
        const p = perim(r), a = area(r)
        if (p !== 24) return { ok: false, msg: `Çitin tamamını kullan: çevre 24 m olmalı, şu an ${p} m.` }
        return { ok: true, optimal: a === 36, msg: a === 36 ? `En büyük park! 6 × 6 = 36 m². Kare biçiminde alan en büyük oldu.` : `Çevre 24 m, alan ${a} m². Daha büyüğü var mı?` }
      },
      picker: ['Kareye yaklaştırdım', 'Tablodaki örüntüyü izledim', 'Tüm seçenekleri denedim'],
    },
    {
      kind: 'compute', title: 'Okul bahçesi', at: [5, 2], size: [8, 4], art: 'park', fence: true, show: ['grid', 'posts'], answer: 8 * 4 * 5 + 24 * 12,
      prompt: 'Okulun yeni bahçesi 8 m × 4 m. Çevresine çit (metresi 12 TL), içine çim (m²’si 5 TL) yapılacak.',
      ask: 'Toplam kaç TL harcanır?',
      hints: ['İki hesap var: çit çevreye, çim alana.', 'Çevre: 8 + 4 + 8 + 4. Alan: 8 × 4.'],
      picker: ['Önce çiti, sonra çimi hesapladım', 'Önce çimi, sonra çiti hesapladım', 'İşlemleri tek ifadede yazdım'],
      diagnose: (n) =>
        n === 288 ? { msg: '288 TL çitin parası. Çimi de ekledin mi?' }
        : n === 160 ? { msg: '160 TL çimin parası. Çiti unutmuş olabilir misin?' }
        : n === 32 * 12 + 24 * 5 ? { msg: 'Fiyatlar yer değiştirmiş olabilir mi? Çit kenarlar için (çevre), çim içi için (alan).', misconception: 'Alan ile çevreyi karıştırıyor' }
        : n === 12 * 12 + 160 ? { msg: 'Çiti yalnızca iki kenar için mi hesapladın? Çevre dört kenarın toplamı.', misconception: 'Çevrede yalnızca iki kenarı topluyor' }
        : { msg: 'Çit için çevreyi, çim için alanı bul; her birini kendi fiyatıyla çarp, sonra ikisini topla.' },
    },
    {
      kind: 'design', title: '500 TL’lik park', at: [18, 9], art: 'park', start: [3, 2], show: ['grid', 'area', 'costx'], budget: { fence: 12, grass: 5, total: 500 }, fence: true, goal: 1, optimal: true,
      prompt: 'Bütçen 500 TL. Çitin metresi 12 TL, çimin m²’si 5 TL. Bütçeyi aşmadan alanı en büyük parkı tasarla!',
      hints: ['Kalan bütçeye bak: hâlâ büyütebilir misin?', 'Kareye yakın parklar aynı çitle daha çok alan kaplar.', 'Alanı 36 m² olan parkları dene.'],
      check: (r) => {
        const c = costOf(r, { fence: 12, grass: 5 })
        if (c > 500) return { ok: false, msg: `Bu park ${tl(c)} tutuyor; bütçeyi ${tl(c - 500)} aştın. Biraz küçült.` }
        const a = area(r)
        return { ok: true, optimal: a >= 36, msg: a >= 36 ? `${a} m² — bütçeyle yapılabilecek en büyük park! Harcanan ${tl(c)}.` : `${a} m², ${tl(c)}. Kalan ${tl(500 - c)}: daha büyük bir park olabilir mi?` }
      },
      picker: ['Kareye yaklaştırdım', 'Kalan bütçeye bakarak büyüttüm', 'Önce çit, sonra çim hesabı yaptım'],
    },
  ]
}

export function missionsFor(g: Grade): Mission[] {
  return g <= 3 ? grade3() : g === 4 ? grade4() : grade5()
}

export const insightFor = (g: Grade) =>
  g <= 3
    ? 'Çevre, bir şeklin bütün kenarlarının toplamıdır. Aynı uzunlukta çitle farklı biçimlerde parklar yapılabilir — ama içleri aynı büyüklükte olmayabilir!'
    : g === 4
      ? 'Alanı aynı olan dikdörtgenlerin çevresi farklı olabilir; kareye yakın olan daha az çit ister. Çevresi aynı olanların alanı da farklı olabilir.'
      : 'Dikdörtgenin alanı “sıra sayısı × bir sıradaki kare sayısı”dır. Çevre sabitken kenarlar birbirine yaklaştıkça alan büyür; en büyüğü karedir.'
