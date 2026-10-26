import type { Grade } from '../../data/types'
import { ek } from '../../lib/generators'

/**
 * Bütünü Değiştir — görev tanımları.
 * Her bütün (Whole) bir kişiye aittir; kesri sabittir, büyüklüğü (n) değişebilir.
 *  - bar:   n = uzunluk (birim kare / metre / 10 TL / kg)
 *  - set:   n = nesne sayısı (bilye, kurabiye, öğrenci)
 *  - pizza: n = yarıçap (görsel birim)
 */

export interface Person {
  who: string
  emoji: string
  /** tamlayan: Ali’nin */
  gen: string
  color: string
}

export interface Whole extends Person {
  n: number
  num: number
  den: number
  /** kesrin gösterimi (varsayılan [[num/den]]); ör. %25, 0,25 */
  fl?: string
  /** kesrin iyelik eki (varsayılan paydaya göre): ’ü, ’si… */
  flPoss?: string
  min?: number
  max?: number
  step?: number
  /** nesnenin adı: çikolata, şerit, torba… */
  thing: string
  /** iyelikli hâli: çikolatası, şeridi, ipi… */
  its: string
}

export interface Reflect {
  q: string
  options: string[]
  correct: number
  /** yanlış seçenekler için düşündüren soru */
  wrong: (string | null)[]
  mis?: (string | null)[]
}

export type BarStyle = 'choco' | 'ribbon' | 'tape'

interface Base {
  title: string
  prompt: string
  reflect?: Reflect
  strategies?: string[]
  /** miktar birimi: kare, bilye, m, TL */
  unit: string
  /** bir birim kaç değer (ör. 1 birim = 10 TL) */
  unitValue?: number
  style?: BarStyle
  /** set için nesne emojisi (yoksa bilye) */
  item?: string
  maxUnits?: number
}

export type Task =
  | (Base & { kind: 'match'; model: 'pizza' | 'bar'; A: Whole; B: Whole; rel: 'eq' | 'gt' | 'lt' })
  | (Base & { kind: 'share'; model: 'set' | 'bar'; A: Whole; B: Whole })
  | (Base & { kind: 'find'; A: Whole; target: number })
  | (Base & { kind: 'fromPart'; A: Whole; B: Whole; part: number })
  | (Base & { kind: 'open'; A: Whole; B: Whole; rel: 'gt' | 'eq'; goal: number; pattern?: string })

const ALI: Person = { who: 'Ali', emoji: '👦', gen: 'Ali’nin', color: '#0d9488' }
const AYSE: Person = { who: 'Ayşe', emoji: '👧', gen: 'Ayşe’nin', color: '#7c3aed' }
const CAN: Person = { who: 'Can', emoji: '🧑', gen: 'Can’ın', color: '#0d9488' }
const ELIF: Person = { who: 'Elif', emoji: '👩', gen: 'Elif’in', color: '#7c3aed' }

/** Kesir gösterimi ve iyelik eki */
export const fLabel = (w: Whole) => w.fl ?? `[[${w.num}/${w.den}]]`
/** Okulda yaygın okunuş paydaya göre: [[1/2]]’si, [[3/4]]’ü, [[2/5]]’i */
export const fPoss = (w: Whole) => w.flPoss ?? ek(w.den, 'poss', false)
/** "Ayşe’nin [[1/2]]’si" */
export const share = (w: Whole) => `${w.gen} ${fLabel(w)}${fPoss(w)}`
/** bütünün ölçtüğü miktar (birim cinsinden, unitValue uygulanmadan) */
export const partUnits = (w: Whole, n = w.n) => (n * w.num) / w.den

const REFLECT_SAME: Reflect = {
  q: 'İkisi de aynı kesri yedi. Aynı miktarda mı yediler?',
  options: ['Evet, aynı kesir hep aynı miktardır', 'Hayır, bütünleri farklı büyüklükte'],
  correct: 1,
  wrong: ['Pizzaları yan yana koy. Büyük pizzanın yarısı ile küçük pizzanın yarısı aynı büyüklükte mi?', null],
  mis: ['Aynı kesir her bütünde aynı miktardır', null],
}

export function makeTasks(grade: Grade): Task[] {
  if (grade <= 3)
    return [
      {
        kind: 'match', model: 'pizza', rel: 'gt', unit: '',
        title: 'Kimin yarısı daha çok?',
        prompt: 'Ali ile Ayşe pizzalarının [[1/2]]’sini yiyecek. Ayşe “Benim yarım daha çok olsun!” diyor. Ayşe’nin pizzasını büyüt: tutamacı sürükle ya da iki parmakla aç.',
        A: { ...ALI, thing: 'pizza', its: 'pizzası', n: 70, num: 1, den: 2 },
        B: { ...AYSE, thing: 'pizza', its: 'pizzası', n: 70, num: 1, den: 2, min: 40, max: 135, step: 1 },
        reflect: REFLECT_SAME,
      },
      {
        kind: 'share', model: 'set', unit: 'kurabiye', item: '🍪',
        title: 'Kurabiyeleri paylaştır',
        prompt: 'Ali 6 kurabiyenin [[1/2]]’sini, Ayşe 10 kurabiyenin [[1/2]]’sini alacak. Kim daha çok kurabiye alır? Önce tahmin et.',
        A: { ...ALI, thing: 'tabak', its: 'kurabiyeleri', n: 6, num: 1, den: 2 },
        B: { ...AYSE, thing: 'tabak', its: 'kurabiyeleri', n: 10, num: 1, den: 2 },
        strategies: ['Paylaştırıp saydım', 'İkiye böldüm', 'Büyük tabağın yarısı büyük diye düşündüm'],
      },
      {
        kind: 'match', model: 'bar', rel: 'eq', unit: 'kare', style: 'choco', maxUnits: 12,
        title: 'Yarısı, bütün kadar',
        prompt: 'Ayşe’nin çikolatasının [[1/2]]’si, Ali’nin bütün çikolatası kadar olsun. Ayşe’nin çikolatasını uzat ya da kısalt.',
        A: { ...ALI, thing: 'çikolata', its: 'çikolatası', n: 3, num: 1, den: 1, fl: 'bütün', flPoss: 'ü' },
        B: { ...AYSE, thing: 'çikolata', its: 'çikolatası', n: 2, num: 1, den: 2, min: 2, max: 12, step: 2 },
        strategies: ['İki katını düşündüm', 'Kareleri saydım', 'Uzatıp karşılaştırdım'],
      },
      {
        kind: 'share', model: 'set', unit: 'bilye',
        title: 'Çeyrekleri paylaştır',
        prompt: 'Ali 8 bilyenin [[1/4]]’ünü, Ayşe 12 bilyenin [[1/4]]’ünü alacak. İkisi de çeyrek alıyor. Kim daha çok bilye alır?',
        A: { ...ALI, thing: 'torba', its: 'torbası', n: 8, num: 1, den: 4 },
        B: { ...AYSE, thing: 'torba', its: 'torbası', n: 12, num: 1, den: 4 },
        strategies: ['Paylaştırıp saydım', 'Dört eş gruba ayırdım', 'Büyük torbanın çeyreği büyük diye düşündüm'],
      },
      {
        kind: 'match', model: 'bar', rel: 'gt', unit: 'kare', style: 'choco', maxUnits: 16,
        title: 'Çeyrek, yarımdan çok olabilir mi?',
        prompt: 'Ali çikolatasının [[1/2]]’sini, Ayşe kendi çikolatasının [[1/4]]’ünü yiyecek. Ayşe’nin [[1/4]]’ü daha çok olabilir mi? Ayşe’nin çikolatasını değiştirerek dene.',
        A: { ...ALI, thing: 'çikolata', its: 'çikolatası', n: 4, num: 1, den: 2 },
        B: { ...AYSE, thing: 'çikolata', its: 'çikolatası', n: 4, num: 1, den: 4, min: 4, max: 16, step: 4 },
        reflect: {
          q: '[[1/4]], [[1/2]]’den küçük bir kesir. Ayşe nasıl daha çok yedi?',
          options: ['Ayşe’nin çikolatası çok daha büyük', 'Çünkü [[1/4]] aslında [[1/2]]’den büyük'],
          correct: 0,
          wrong: [null, 'Aynı çikolatanın [[1/4]]’ü ile [[1/2]]’sini düşün. Hangisi daha büyük parça? Peki Ayşe’nin çikolatası Ali’ninkiyle aynı mı?'],
          mis: [null, 'Paydası büyük kesir daha büyüktür'],
        },
      },
    ]

  if (grade === 4)
    return [
      {
        kind: 'match', model: 'pizza', rel: 'lt', unit: '',
        title: 'Aynı kesir, daha az pizza',
        prompt: 'Ali de Ayşe de pizzasının [[3/4]]’ünü yiyecek. Ayşe’nin [[3/4]]’ü, Ali’ninkinden daha az olsun. Ayşe’nin pizzasını değiştir.',
        A: { ...ALI, thing: 'pizza', its: 'pizzası', n: 95, num: 3, den: 4 },
        B: { ...AYSE, thing: 'pizza', its: 'pizzası', n: 95, num: 3, den: 4, min: 40, max: 135, step: 1 },
        reflect: {
          q: 'İkisi de [[3/4]] yedi. Aynı miktarda mı yediler?',
          options: ['Evet, [[3/4]] hep aynı miktardır', 'Hayır, [[3/4]] bütüne göre değişir'],
          correct: 1,
          wrong: ['İki pizzanın [[3/4]]’ünü yan yana koy. Aynı büyüklükte mi görünüyorlar?', null],
          mis: ['Aynı kesir her bütünde aynı miktardır', null],
        },
      },
      {
        kind: 'share', model: 'set', unit: 'bilye',
        title: 'Hangi çeyrek daha çok?',
        prompt: 'Ali’nin torbasında 12, Ayşe’nin torbasında 20 bilye var. İkisi de torbasının [[1/4]]’ünü kardeşine verecek. Kim daha çok bilye verir? Önce tahmin et.',
        A: { ...ALI, thing: 'torba', its: 'torbası', n: 12, num: 1, den: 4 },
        B: { ...AYSE, thing: 'torba', its: 'torbası', n: 20, num: 1, den: 4 },
        strategies: ['Paylaştırıp saydım', '4’e böldüm', 'Büyük bütünün çeyreği büyüktür'],
      },
      {
        kind: 'find', unit: 'bilye', maxUnits: 32,
        title: 'Torbayı bul',
        prompt: 'Bir torbanın [[1/4]]’ü 5 bilye. Torbada kaç bilye olmalı? Torbayı büyütüp küçülterek bul.',
        A: { ...AYSE, thing: 'torba', its: 'torbası', n: 8, num: 1, den: 4, min: 1, max: 32, step: 1 },
        target: 5,
        strategies: ['Birim kesri yineledim: 5, 10, 15, 20', '4 grupta 5’er bilye düşündüm', 'Deneyerek buldum'],
      },
      {
        kind: 'find', unit: 'bilye', maxUnits: 40,
        title: 'Üç çeyreği 9 olan torba',
        prompt: 'Bir torbanın [[3/4]]’ü 9 bilye. Bütün torbada kaç bilye var?',
        A: { ...ALI, thing: 'torba', its: 'torbası', n: 6, num: 3, den: 4, min: 1, max: 40, step: 1 },
        target: 9,
        strategies: ['Önce dörtte birini buldum', '9’u 3 gruba ayırdım, bir grup ekledim', 'Deneyerek buldum'],
      },
      {
        kind: 'match', model: 'bar', rel: 'eq', unit: 'kare', style: 'choco', maxUnits: 16,
        title: 'Çeyrek ile yarım',
        prompt: 'Ayşe’nin çikolatasının [[1/4]]’ü, Ali’nin çikolatasının [[1/2]]’si kadar olsun. Ayşe’nin çikolatası kaç kare olmalı?',
        A: { ...ALI, thing: 'çikolata', its: 'çikolatası', n: 6, num: 1, den: 2 },
        B: { ...AYSE, thing: 'çikolata', its: 'çikolatası', n: 4, num: 1, den: 4, min: 1, max: 16, step: 1 },
        strategies: ['İki katını düşündüm', 'Çeyreği yarımla karşılaştırdım', 'Uzatıp karşılaştırdım'],
      },
      {
        kind: 'fromPart', unit: 'kare', style: 'choco', maxUnits: 14, part: 4,
        title: 'Parçadan bütüne',
        prompt: 'Bu 4 karelik parça bir çikolatanın [[2/3]]’ü. Bütün çikolatayı oluştur: alttaki çikolatayı uzat.',
        A: { ...ALI, thing: 'parça', its: 'parçası', n: 4, num: 2, den: 3 },
        B: { ...AYSE, thing: 'çikolata', its: 'çikolatası', n: 4, num: 2, den: 3, min: 1, max: 14, step: 1 },
        strategies: ['Parçayı 2’ye bölüp üçte birini buldum', 'Birim kesri 3 kez yineledim', 'Deneyerek buldum'],
      },
    ]

  if (grade === 5)
    return [
      {
        kind: 'match', model: 'bar', rel: 'eq', unit: 'm', style: 'ribbon', maxUnits: 14,
        title: 'Üçte ikisi, bütün kadar',
        prompt: 'Can’ın şeridi 4 m. Elif’in şeridinin [[2/3]]’ü, Can’ın bütün şeridi kadar olsun. Elif’in şeridi kaç metre olmalı?',
        A: { ...CAN, thing: 'şerit', its: 'şeridi', n: 4, num: 1, den: 1, fl: 'bütün', flPoss: 'ü' },
        B: { ...ELIF, thing: 'şerit', its: 'şeridi', n: 3, num: 2, den: 3, min: 1, max: 14, step: 1 },
        strategies: ['Önce üçte birini buldum', 'Birim kesri yineledim', 'Uzatıp karşılaştırdım'],
      },
      {
        kind: 'fromPart', unit: 'm', style: 'ribbon', maxUnits: 14, part: 4,
        title: 'Parçadan bütüne',
        prompt: 'Bu 4 metrelik kurdele, bütün kurdelenin [[2/5]]’i. Bütün kurdeleyi oluştur.',
        A: { ...CAN, thing: 'parça', its: 'parçası', n: 4, num: 2, den: 5 },
        B: { ...ELIF, thing: 'kurdele', its: 'kurdelesi', n: 4, num: 2, den: 5, min: 1, max: 14, step: 1 },
        strategies: ['Parçayı 2’ye bölüp beşte birini buldum', 'Birim kesri 5 kez yineledim', 'Deneyerek buldum'],
      },
      {
        kind: 'share', model: 'set', unit: 'öğrenci', item: '🧒',
        title: 'Hangi sınıftan daha çok?',
        prompt: 'Can’ın sınıfındaki 24 öğrencinin [[1/3]]’ü, Elif’in sınıfındaki 12 öğrencinin [[1/2]]’si geziye katılıyor. Hangi sınıftan daha çok öğrenci katılıyor?',
        A: { ...CAN, thing: 'sınıf', its: 'sınıfı', n: 24, num: 1, den: 3 },
        B: { ...ELIF, thing: 'sınıf', its: 'sınıfı', n: 12, num: 1, den: 2 },
        strategies: ['Gruplara ayırıp saydım', 'Bütünleri de karşılaştırdım', 'Yarım daha büyük diye düşündüm'],
      },
      {
        kind: 'find', unit: 'bilye', maxUnits: 40,
        title: 'Beşte üçü 9 olan torba',
        prompt: 'Bir torbanın [[3/5]]’i 9 bilye. Bütün torbada kaç bilye var?',
        A: { ...ELIF, thing: 'torba', its: 'torbası', n: 10, num: 3, den: 5, min: 1, max: 40, step: 1 },
        target: 9,
        strategies: ['Önce beşte birini buldum', 'Birim kesri 5 kez yineledim', 'Deneyerek buldum'],
      },
      {
        kind: 'match', model: 'bar', rel: 'lt', unit: 'm', style: 'ribbon', maxUnits: 12,
        title: 'Büyük kesir, az miktar',
        prompt: 'Can’ın 8 m’lik ipinin [[1/2]]’si boyandı. Elif’in ipinin [[3/4]]’ü boyanacak. Elif’in boyalı kısmı Can’ınkinden kısa olsun.',
        A: { ...CAN, thing: 'ip', its: 'ipi', n: 8, num: 1, den: 2 },
        B: { ...ELIF, thing: 'ip', its: 'ipi', n: 8, num: 3, den: 4, min: 1, max: 12, step: 1 },
        reflect: {
          q: '[[3/4]] > [[1/2]] olduğu hâlde Elif’in boyalı kısmı nasıl daha kısa?',
          options: ['Elif’in ipi daha kısa, bütünü küçük', 'Olamaz, [[3/4]] her zaman daha çoktur'],
          correct: 0,
          wrong: [null, 'Modele bak: hangi ipin boyalı kısmı daha kısa? Kesirleri karşılaştırırken bütünler aynı mıydı?'],
          mis: [null, 'Kesrin büyüklüğüne bakıp bütünü hesaba katmadı'],
        },
      },
      {
        kind: 'open', rel: 'gt', goal: 2, unit: 'm', style: 'ribbon', maxUnits: 16,
        title: 'Çeyrek, yarımdan fazla',
        prompt: 'Can’ın ipinin [[1/4]]’ü, Elif’in ipinin [[1/2]]’sinden uzun olsun. İki ipi de değiştirebilirsin. En az 2 farklı yol bul.',
        A: { ...CAN, thing: 'ip', its: 'ipi', n: 8, num: 1, den: 4, min: 1, max: 16, step: 1 },
        B: { ...ELIF, thing: 'ip', its: 'ipi', n: 8, num: 1, den: 2, min: 1, max: 16, step: 1 },
        pattern: 'Can’ın ipi her seferinde Elif’inkinin 2 katından uzun oldu.',
        strategies: ['Can’ın ipini çok uzattım', 'Elif’in ipini kısalttım', '2 katından uzun olmalı diye düşündüm'],
      },
    ]

  return [
    {
      kind: 'share', model: 'bar', unit: 'TL', unitValue: 10, style: 'tape', maxUnits: 8,
      title: 'Kim daha çok harcadı?',
      prompt: 'Can 80 TL’nin 0,25’ini, Elif 30 TL’nin 0,5’ini harcadı. Kim daha çok harcadı? Önce tahmin et.',
      A: { ...CAN, thing: 'harçlık', its: 'harçlığı', n: 8, num: 1, den: 4, fl: '0,25', flPoss: '’i' },
      B: { ...ELIF, thing: 'harçlık', its: 'harçlığı', n: 3, num: 1, den: 2, fl: '0,5', flPoss: '’i' },
      strategies: ['Parçalara bölüp hesapladım', '0,25’i dörtte bir olarak düşündüm', '0,5 büyük diye düşündüm'],
    },
    {
      kind: 'fromPart', unit: 'm', style: 'ribbon', maxUnits: 18, part: 9,
      title: 'Parçadan bütüne',
      prompt: 'Bu 9 metrelik şerit, bütün şeridin [[3/5]]’i. Bütün şerit kaç metre?',
      A: { ...CAN, thing: 'parça', its: 'parçası', n: 9, num: 3, den: 5 },
      B: { ...ELIF, thing: 'şerit', its: 'şeridi', n: 6, num: 3, den: 5, min: 1, max: 18, step: 1 },
      strategies: ['Önce beşte birini buldum', 'Birim kesri 5 kez yineledim', 'Deneyerek buldum'],
    },
    {
      kind: 'find', unit: 'bilye', maxUnits: 40,
      title: 'Yüzde kırkı 6 olan torba',
      prompt: 'Bir torbadaki bilyelerin %40’ı kırmızı ve 6 tane. Torbada kaç bilye var?',
      A: { ...ELIF, thing: 'torba', its: 'torbası', n: 10, num: 2, den: 5, fl: '%40', flPoss: '’ı', min: 1, max: 40, step: 1 },
      target: 6,
      strategies: ['%40’ı beşte iki olarak düşündüm', 'Önce %20’yi buldum', 'Deneyerek buldum'],
    },
    {
      kind: 'share', model: 'bar', unit: 'kg', style: 'tape', maxUnits: 9,
      title: 'Farklı kesir, farklı bütün',
      prompt: 'Can 9 kg elmanın [[2/3]]’ünü, Elif 8 kg elmanın [[3/4]]’ünü sattı. Kim daha çok elma sattı?',
      A: { ...CAN, thing: 'kasa', its: 'kasası', n: 9, num: 2, den: 3 },
      B: { ...ELIF, thing: 'kasa', its: 'kasası', n: 8, num: 3, den: 4 },
      strategies: ['Parçalara bölüp hesapladım', 'Önce birim kesri buldum', 'Dörtte üç daha büyük diye düşündüm'],
    },
    {
      kind: 'match', model: 'bar', rel: 'eq', unit: 'm', style: 'ribbon', maxUnits: 16,
      title: 'Yüzdeler eşit olsun',
      prompt: 'Can’ın 6 m’lik ipinin %50’si boyalı. Elif’in ipinin %25’i, bu boyalı kısım kadar olsun. Elif’in ipi kaç metre olmalı?',
      A: { ...CAN, thing: 'ip', its: 'ipi', n: 6, num: 1, den: 2, fl: '%50', flPoss: '’si' },
      B: { ...ELIF, thing: 'ip', its: 'ipi', n: 4, num: 1, den: 4, fl: '%25', flPoss: '’i', min: 1, max: 16, step: 1 },
      strategies: ['%25’i dörtte bir olarak düşündüm', 'İki katını düşündüm', 'Uzatıp karşılaştırdım'],
    },
    {
      kind: 'open', rel: 'eq', goal: 3, unit: 'm', style: 'ribbon', maxUnits: 18,
      title: 'Üçte biri = yarısı',
      prompt: 'Can’ın ipinin [[1/3]]’ü, Elif’in ipinin [[1/2]]’sine eşit olsun. İki ipi de değiştirebilirsin. En az 3 farklı yol bul. Bir kural görüyor musun?',
      A: { ...CAN, thing: 'ip', its: 'ipi', n: 6, num: 1, den: 3, min: 1, max: 18, step: 1 },
      B: { ...ELIF, thing: 'ip', its: 'ipi', n: 6, num: 1, den: 2, min: 1, max: 18, step: 1 },
      pattern: 'Her çözümde Can’ın ipi, Elif’inkinin 1,5 katı ([[3/2]]’si) oldu.',
      strategies: ['Bir çözümü katladım', 'Can’ın ipi 3’ün, Elif’inki 2’nin katı olmalı', 'Deneyerek buldum'],
    },
  ]
}
