import type { Grade, ManipulativeConfig, ManipulativeTool } from '../../../data/types'
import { L, ML, type Marks, type UnitMode, type VesselDef, type VesselKind } from './water'

/**
 * Su Mühendisi görevleri. Beş görev türü:
 *  fill    — vanayla bir kabı hedefe kadar doldur (kesir/yüzde/mL hedef, çizgiler eksik olabilir) + soru
 *  order   — kapları su miktarına ya da doluluğa göre sırala (doluluk ≠ miktar)
 *  compose — ölçü kaplarıyla hedef miktarı oluştur; farklı kap birleşimleri = farklı yollar
 *  equiv   — aynı miktarı farklı kaplara dök, her kapta kaçta kaç / yüzde kaç olduğunu adlandır
 *  jug     — çizgisiz kaplarla aktarma bulmacası; farklı aktarma planları, en az adım
 */

export interface Diag { msg: string; mis?: string }

export type Ask =
  | { kind: 'num' | 'dec'; q: string; answer: number; unit?: string; prefix?: string; diagnose?: (n: number) => Diag | null; okText: string }
  | { kind: 'frac'; q: string; answer: [number, number]; diagnose?: (n: number, d: number) => Diag | null; okText: string }
  | { kind: 'choice'; q: string; options: string[]; answer: number; why: string[]; okText: string }

interface Base {
  title: string
  prompt: string
  hints: string[]
  note: string
  tool?: ManipulativeTool
  toolConfig?: ManipulativeConfig
  toolTitle?: string
  picker?: { q: string; options: string[] }
  unit: UnitMode
}

export interface FillLevel extends Base {
  kind: 'fill'
  tank: VesselDef
  ref?: VesselDef
  target: number
  /** kapasitenin oranı olarak tolerans */
  tol: number
  targetText: string
  /** çizgiler teslimden sonra görünsün */
  hideMarks?: boolean
  ask?: Ask
  diagnose?: (amt: number) => Diag | null
}

export interface OrderLevel extends Base {
  kind: 'order'
  vessels: VesselDef[]
  rounds: { by: 'amount' | 'full'; q: string }[]
  /** sıralama bitince her kabın altında görünen açıklama */
  explain: (v: VesselDef) => string
}

export interface ComposeLevel extends Base {
  kind: 'compose'
  tank: VesselDef
  cups: VesselDef[]
  target: number
  targetText: string
  goal: number
  showTotal: boolean
  allowScoop: boolean
}

export interface EquivLevel extends Base {
  kind: 'equiv'
  source: VesselDef
  tanks: VesselDef[]
  answer: 'choice' | 'frac' | 'pct'
  predict: boolean
}

export interface JugLevel extends Base {
  kind: 'jug'
  vessels: VesselDef[]
  drain: boolean
  goalText: string
  goal: (s: number[]) => boolean
  ways: number
  needShortest?: boolean
  showMarks?: boolean
  ask?: Ask
}

export type Level = FillLevel | OrderLevel | ComposeLevel | EquivLevel | JugLevel

const V = (id: string, name: string, cap: number, kind: VesselKind, o: Partial<VesselDef> = {}): VesselDef => ({ id, name, cap, amt: 0, kind, ...o })
const mk = (div: number, labels: Marks['labels'] = 'none', fmt: Marks['fmt'] = 'L'): Marks => ({ div, labels, fmt })

const C = { blue: '#0369a1', teal: '#0f766e', violet: '#6d28d9', orange: '#c2410c', rose: '#be123c', green: '#15803d', slate: '#334155', amber: '#b45309' }

const FILL_PICK = { q: 'Hedefi nasıl buldun?', options: ['Çizgileri saydım', 'Yarımı referans aldım', 'Önce hesapladım, sonra doldurdum', 'Yaklaşıp ince ayar yaptım'] }
const ORDER_PICK = { q: 'Nasıl karşılaştırdın?', options: ['Her kaptaki litreyi hesapladım', 'Yarımla karşılaştırdım', 'Boş kalan kısma baktım', 'Hepsini aynı birime çevirdim'] }
const COMPOSE_PICK = { q: 'Yolları nasıl buldun?', options: ['Büyük kapla başlayıp küçükle tamamladım', 'Hep aynı kabı kullandım', 'Bir kabı iki küçük kapla değiştirdim', 'Fazla koyup geri aldım'] }
const JUG_PICK = { q: 'Nasıl planladın?', options: ['Büyük kaptan küçüğe döküp kalanı kullandım', 'Küçük kapla büyüğü doldurup taşanı kullandım', 'Önce hesapladım, sonra döktüm', 'Deneyerek buldum'] }

export function makeLevels(grade: Grade): Level[] {
  if (grade <= 3) return g3()
  if (grade === 4) return g4()
  if (grade === 5) return g5()
  return g6()
}

/* ───────────── 3. sınıf: litre, yarım litre, tahmin, karşılaştırma ───────────── */
function g3(): Level[] {
  return [
    {
      kind: 'fill',
      title: 'Yarım şişe',
      unit: 'L',
      prompt: 'Fidanlar susadı! 2 L’lik şişeyi musluktan **yarısına** kadar doldur. Musluğun vanasını basılı tut, yeter deyince bırak.',
      tank: V('t', 'Şişe', L(2), 'bottle', { tap: true, marks: mk(2, 'all'), plate: 'Şişe · 2 L', color: C.teal }),
      target: L(1),
      tol: 0.07,
      targetText: 'şişenin yarısı',
      hideMarks: true,
      hints: ['Şişenin yarısı, şişeyi iki eş parçaya bölen yerdedir. Altla üstün tam ortasını gözünle bul.', 'Su ortadan yukarıda mı, aşağıda mı? Fazlaysa “Biraz boşalt” düğmesini kullan.'],
      ask: {
        kind: 'num',
        q: 'Şişede kaç litre su var?',
        answer: 1,
        unit: 'L',
        okText: 'Evet! 2 L’nin yarısı 1 L: 1 L + 1 L = 2 L.',
        diagnose: (n) => (n === 2 ? { msg: '2 L şişenin tamamı. Şişe yarısına kadar dolu; iki eş parçadan biri kaç litre?', mis: 'Yarımı bütünle karıştırdı' } : null),
      },
      note: '2 L’nin yarısı 1 L! Bütünü iki eş parçaya bölünce her parça yarım olur.',
      picker: FILL_PICK,
      tool: 'fractions',
      toolConfig: { dens: [2, 4] },
      toolTitle: 'Kesir şeridinde yarımı bul',
    },
    {
      kind: 'order',
      title: 'Hangisinde çok?',
      unit: 'L',
      prompt: 'Dört kapta su var. Önce gözünle tahmin et, sonra **en az sudan en çok suya** doğru kaplara sırayla dokun.',
      vessels: [
        V('a', 'Mavi depo', L(6), 'tank', { amt: L(3), marks: mk(2), plate: '6 L', color: C.blue }),
        V('b', 'Şişe', L(2), 'bottle', { amt: L(2), plate: '2 L', color: C.teal }),
        V('c', 'Kova', L(4), 'bucket', { amt: L(1), marks: mk(4), plate: '4 L', color: C.orange }),
        V('d', 'Büyük depo', L(8), 'tank', { amt: L(4), marks: mk(2), plate: '8 L', color: C.violet }),
      ],
      rounds: [{ by: 'amount', q: 'En az sudan en çok suya doğru dokun.' }],
      explain: (v) => ({ a: '6 L’nin yarısı: 3 L', b: 'Tam dolu: 2 L', c: '4 L’nin çeyreği: 1 L', d: '8 L’nin yarısı: 4 L' })[v.id] ?? '',
      hints: ['Kapların büyüklüğü farklı! Şişe tam dolu ama şişe küçük. 2 L’lik şişede kaç litre su var?', '8 L’lik deponun yarısı kaç litre? 6 L’lik deponun yarısı? 4 L’lik kova dört parçadan birine kadar dolu.'],
      note: 'Su seviyesi yüksek diye su çok olmaz! Kabın büyüklüğüne de bakmak gerekir: 8 L’nin yarısı (4 L), 2 L’lik dolu şişeden fazladır.',
      picker: ORDER_PICK,
      tool: 'fractions',
      toolConfig: { dens: [2, 4] },
    },
    {
      kind: 'compose',
      title: 'Akvaryum',
      unit: 'L',
      prompt: 'Japon balıkları için akvaryuma tam **5 L** su lazım. Kapları musluktan doldurup akvaryuma sürükle. **3 farklı yol** bul!',
      tank: V('t', 'Akvaryum', L(10), 'tank', { marks: mk(10, [2, 4, 6, 8]), plate: 'Akvaryum · 10 L', color: C.blue }),
      cups: [
        V('k', 'Kova', L(2), 'bucket', { tap: true, plate: '2 L', color: C.orange }),
        V('s', 'Sürahi', L(1), 'jug', { tap: true, plate: '1 L', color: C.violet }),
        V('b', 'Şişe', L(0.5), 'bottle', { tap: true, plate: '½ L', color: C.teal }),
      ],
      target: L(5),
      targetText: '5 L',
      goal: 3,
      showTotal: true,
      allowScoop: true,
      hints: ['2 L’lik kovayla iki kez dökersen akvaryumda kaç litre olur? Kaç litre eksik kalır?', 'Eksik 1 L’yi yarım litrelik şişeyle nasıl tamamlarsın?', 'Yalnızca 1 L’lik sürahiyle de deneyebilirsin.'],
      note: 'Aynı 5 L, farklı yollar: 2 + 2 + 1, 1 + 1 + 1 + 1 + 1, 2 + 2 + ½ + ½ … İki yarım litre bir litre eder.',
      picker: COMPOSE_PICK,
      tool: 'fractions',
      toolConfig: { dens: [2] },
    },
    {
      kind: 'equiv',
      title: 'Aynı su, farklı kap',
      unit: 'L',
      prompt: '1 L’lik sürahiyle üç farklı kaba su taşı. Sürahiyi kaba sürükle (ya da önce sürahiye, sonra kaba dokun). Her kabın ne kadarı doldu?',
      source: V('src', 'Sürahi', L(1), 'jug', { amt: L(1), tap: true, plate: 'Sürahi · 1 L', color: C.violet }),
      tanks: [
        V('a', 'Şişe', L(2), 'bottle', { marks: mk(2), plate: 'Şişe · 2 L', color: C.teal }),
        V('b', 'Kova', L(4), 'bucket', { marks: mk(4), plate: 'Kova · 4 L', color: C.orange }),
        V('c', 'Ölçü kabı', L(1), 'cup', { plate: 'Kap · 1 L', color: C.blue }),
      ],
      answer: 'choice',
      predict: false,
      hints: ['Kap iki eş parçaya bölünmüşse ve su bir parçayı doldurduysa kabın ne kadarı dolu?', '4 L’lik kova dört eş parçaya bölünmüş. 1 L su kaç parçayı doldurdu?'],
      note: 'Aynı 1 L su: 1 L’lik kabın bütünü, 2 L’lik şişenin yarısı, 4 L’lik kovanın çeyreği! Kap büyüdükçe aynı su daha küçük bir parça olur.',
      tool: 'kesirdaireleri',
      toolTitle: 'Yarım ve çeyreği modelle',
    },
    {
      kind: 'jug',
      title: 'Tam 2 litre',
      unit: 'L',
      prompt: 'Fidana tam **2 L** su lazım ama yalnızca 5 L’lik ve 3 L’lik kovaların var. Kovaları doldur, birbirine dök ya da gidere boşalt. Bir kovada tam 2 L elde et!',
      vessels: [
        V('a', 'Büyük kova', L(5), 'bucket', { tap: true, marks: mk(5, 'all'), plate: '5 L', color: C.orange }),
        V('b', 'Küçük kova', L(3), 'bucket', { tap: true, marks: mk(3, 'all'), plate: '3 L', color: C.teal }),
      ],
      drain: true,
      goalText: 'bir kovada tam 2 L',
      goal: (s) => s.includes(L(2)),
      ways: 1,
      showMarks: true,
      hints: ['Büyük kovayı doldurup küçük kovaya dökersen, küçük kova dolunca büyük kovada ne kalır?', '5 L’den 3 L’yi çıkarınca kaç litre kalır?'],
      ask: {
        kind: 'choice',
        q: 'Hangi işlemi yapmış oldun?',
        options: ['5 + 3 = 8', '5 − 3 = 2', '3 − 1 = 2', '3 + 2 = 5'],
        answer: 1,
        why: ['Kovaları birleştirmedin; küçük kovayı büyük kovadan doldurdun. Büyük kovadan su eksildi mi, arttı mı?', '', 'Küçük kovada 1 L hiç olmadı. Büyük kovadan küçüğe kaç litre geçti?', 'Bu da doğru bir eşitlik! Ama sen 5 L’den 3 L’yi aldın. O işlem hangisi?'],
        okText: 'Evet! 5 L’lik kovadan 3 L aldın: 5 − 3 = 2. Dökmek, çıkarmaktır.',
      },
      note: 'Büyük kovadan küçük kovayı doldurmak, 5’ten 3’ü çıkarmak demek: 5 − 3 = 2.',
      picker: JUG_PICK,
    },
    {
      kind: 'fill',
      title: 'İki buçuk litre',
      unit: 'L',
      prompt: 'Çiçekler için kovaya tam **2 [[1/2]] L** su koy. Kovadaki çizgilere bak: yazısız çizgiler neyi gösteriyor olabilir?',
      tank: V('t', 'Kova', L(4), 'bucket', { tap: true, marks: mk(8, [2, 4, 6]), plate: 'Kova · 4 L', color: C.orange }),
      target: L(2.5),
      tol: 0.035,
      targetText: '2 [[1/2]] L',
      hints: ['Yazılı çizgiler 1, 2 ve 3 litreyi gösteriyor. İki yazılı çizginin ortasındaki çizgi kaç litre olabilir?', '2 L ile 3 L’nin tam ortası 2 [[1/2]] L’dir.'],
      ask: {
        kind: 'num',
        q: 'Kovanın tam dolması için kaç tane yarım litre daha gerekir?',
        answer: 3,
        okText: 'Evet! 4 L’ye 1 [[1/2]] L eksik; 1 [[1/2]] L içinde üç tane yarım litre var.',
        diagnose: (n) => (n === 2 ? { msg: '4 − 2 [[1/2]] = 1 [[1/2]] L eksik. 1 L kaç yarım litre? Kalan yarımı da say.' } : n === 1 ? { msg: 'Eksik olan 1 [[1/2]] L. Bir yarım litreyle kova dolar mı? Çizgileri sayarak kontrol et.' } : null),
      },
      note: 'Yarım litre çizgileri, litreler arasını iki eş parçaya böler. 2 L + ½ L = 2 [[1/2]] L.',
      picker: FILL_PICK,
      tool: 'fractions',
      toolConfig: { dens: [2] },
    },
  ]
}

/* ───────────── 4. sınıf: L ↔ mL, kapasitenin kesri, modelle denk kesirler ───────────── */
function g4(): Level[] {
  return [
    {
      kind: 'fill',
      title: '750 mililitre',
      unit: 'mL',
      prompt: 'Limonata için sürahiye tam **750 mL** su koy. Sürahide yalnızca 0 ve 1 L yazıyor. Aradaki çizgiler kaç mL’yi gösteriyor olabilir?',
      tank: V('t', 'Sürahi', L(1), 'jug', { tap: true, marks: { div: 4, labels: 'last', fmt: 'L' }, plate: 'Sürahi · 1 L', color: C.violet }),
      target: ML(750),
      tol: 0.035,
      targetText: '750 mL',
      hints: ['1 L = 1.000 mL. Sürahi kaç eş parçaya bölünmüş?', 'Bir parça 1.000 ÷ 4 = ? mL. 750 mL kaç parça eder?'],
      ask: {
        kind: 'frac',
        q: 'Sürahinin kaçta kaçı dolu?',
        answer: [3, 4],
        okText: 'Evet! 4 eş parçanın 3’ü dolu: [[3/4]]. 750 mL = 1 L’nin [[3/4]]’ü.',
        diagnose: (n, d) =>
          n === 1 && d === 4 ? { msg: '[[1/4]] boş kalan kısım. Dolu olan kaç parça?', mis: 'Boş kısmı kesir olarak yazdı' }
          : n === 4 && d === 3 ? { msg: 'Pay, dolu parça sayısı; payda bütünün kaç eş parçaya bölündüğü. Hangisi hangisi?', mis: 'Pay ile paydayı karıştırdı' }
          : d === 3 ? { msg: 'Sürahide 3 çizgi var ama kaç eş parça var? Parçaları say.', mis: 'Çizgileri saydı, parçaları değil' }
          : null,
      },
      note: '1 L = 1.000 mL; dört eş parçanın her biri 250 mL. 750 mL, 3 parça yani [[3/4]] L.',
      picker: FILL_PICK,
      tool: 'fractions',
      toolConfig: { dens: [4] },
    },
    {
      kind: 'compose',
      title: 'Bir litre limonata',
      unit: 'mL',
      prompt: 'Limonata kabına tam **1 L** su gerekiyor ama kapların üstünde mL yazıyor. Kapları doldurup dök; bittiğine sen karar ver ve “Teslim et”e bas. **3 farklı yol** bul!',
      tank: V('t', 'Limonata kabı', L(2), 'tank', { plate: 'Limonata · 2 L', color: C.amber }),
      cups: [
        V('a', '500 mL şişe', ML(500), 'bottle', { tap: true, plate: '500 mL', color: C.teal }),
        V('b', '250 mL bardak', ML(250), 'cup', { tap: true, plate: '250 mL', color: C.violet }),
        V('c', '200 mL kap', ML(200), 'cup', { tap: true, plate: '200 mL', color: C.rose }),
      ],
      target: L(1),
      targetText: '1 L',
      goal: 3,
      showTotal: false,
      allowScoop: true,
      hints: ['1 L kaç mL eder?', '500 mL’lik şişeden kaç tane 1.000 mL eder? 250 mL’likten kaç tane?', '200 mL’lik kapla 1.000 mL’ye ulaşabilir misin? 200, 400, …'],
      note: '1 L = 1.000 mL: 500 + 500, 250 × 4, 200 × 5, 500 + 250 + 250 … Hepsi aynı litre!',
      picker: COMPOSE_PICK,
    },
    {
      kind: 'equiv',
      title: 'Denk depolar',
      unit: 'L',
      prompt: '2 L suyu aynı büyüklükteki üç depoya ayrı ayrı dök. Depolar farklı sayıda eş parçaya bölünmüş. Önce suyun nereye çıkacağını tahmin et (depoya dokun), sonra dök ve kesri yaz.',
      source: V('src', 'Ölçü kovası', L(2), 'bucket', { amt: L(2), tap: true, plate: 'Kova · 2 L', color: C.orange }),
      tanks: [
        V('a', 'Depo A', L(4), 'tank', { marks: mk(2), plate: 'A · 4 L', color: C.blue }),
        V('b', 'Depo B', L(4), 'tank', { marks: mk(4), plate: 'B · 4 L', color: C.teal }),
        V('c', 'Depo C', L(4), 'tank', { marks: mk(8), plate: 'C · 4 L', color: C.violet }),
      ],
      answer: 'frac',
      predict: true,
      hints: ['Depo kaç eş parçaya bölünmüş? Su kaç parçayı doldurdu? Payda bütündeki parça sayısı, pay dolu parça sayısı.', 'Su seviyesi üç depoda da aynı mı? Peki kesirlerin adları neden farklı?'],
      note: '[[1/2]] = [[2/4]] = [[4/8]]: aynı su, aynı seviye, farklı adlar. Parçalar küçüldükçe sayıları artar.',
      picker: { q: 'Bu kesirler neden denk?', options: ['Su seviyesi aynı', 'Parçaları ikiye bölünce pay ve payda ikiye katlandı', 'Hepsi 2 L', 'Hepsi deponun yarısı'] },
      tool: 'fractions',
      toolConfig: { dens: [2, 4, 8] },
      toolTitle: 'Kesir şeritleriyle karşılaştır',
    },
    {
      kind: 'order',
      title: 'L mi, mL mi?',
      unit: 'mL',
      prompt: 'Kaplardaki suyu **en azdan en çoğa** sırala. Dikkat: kimi kapta L, kimisinde mL yazıyor!',
      vessels: [
        V('a', 'Sürahi', L(1), 'jug', { amt: ML(750), marks: mk(4), plate: '1 L', color: C.violet }),
        V('b', 'Şişe', L(2), 'bottle', { amt: ML(500), marks: mk(4), plate: '2 L', color: C.teal }),
        V('c', 'Matara', ML(1500), 'bottle', { amt: ML(1000), marks: mk(3), plate: '1.500 mL', color: C.green }),
        V('d', 'Bardak', ML(400), 'cup', { amt: ML(400), plate: '400 mL', color: C.rose }),
      ],
      rounds: [{ by: 'amount', q: 'En az sudan en çok suya doğru dokun.' }],
      explain: (v) => ({ a: '1.000’in [[3/4]]’ü: 750 mL', b: '2.000’in [[1/4]]’ü: 500 mL', c: '1.500’ün [[2/3]]’ü: 1.000 mL', d: 'Tam dolu: 400 mL' })[v.id] ?? '',
      hints: ['Hepsini mL’ye çevir: 1 L = 1.000 mL.', '2 L’lik şişe dört eş parçaya bölünmüş; bir parçası kaç mL?', '1.500 mL’lik mataranın üç parçasından ikisi dolu. Bir parça kaç mL?'],
      note: 'Kapların boyu da, su seviyesi de yanıltabilir. Miktarları aynı birime (mL) çevirince karşılaştırmak kolaylaşır.',
      picker: ORDER_PICK,
    },
    {
      kind: 'jug',
      title: 'Kek tarifi',
      unit: 'mL',
      prompt: 'Kek tarifi tam **200 mL** su istiyor. 1 L’lik sürahin ve 400 mL’lik kabın var; ikisinde de çizgi yok. Tam 200 mL’yi **iki farklı yolla** elde et!',
      vessels: [
        V('a', 'Sürahi', L(1), 'jug', { tap: true, plate: '1 L', color: C.violet }),
        V('b', 'Kap', ML(400), 'cup', { tap: true, plate: '400 mL', color: C.rose }),
      ],
      drain: true,
      goalText: 'bir kapta tam 200 mL',
      goal: (s) => s.includes(ML(200)),
      ways: 2,
      hints: ['1 L kaç mL? Sürahiyi doldurup 400 mL’lik kaba dökersen sürahide kaç mL kalır?', 'Bir de küçük kaptan başla: 400 mL’lik kabı sürahiye üç kez boşaltmaya çalış. Üçüncüde ne olur?'],
      note: '1.000 − 400 − 400 = 200 ve 400 + 400 + 400 − 1.000 = 200. Çıkararak da, taşanı kullanarak da aynı yere varılır.',
      picker: JUG_PICK,
    },
    {
      kind: 'fill',
      title: 'Şişenin dörtte üçü',
      unit: 'mL',
      prompt: 'Koşu için 2 L’lik şişenin **[[3/4]]**’ünü doldur. Şişede yalnızca 1 L ve 2 L yazıyor.',
      tank: V('t', 'Şişe', L(2), 'bottle', { tap: true, marks: mk(8, [4], 'L'), plate: 'Şişe · 2 L', color: C.teal }),
      target: L(1.5),
      tol: 0.035,
      targetText: '[[3/4]]',
      hints: ['Şişeyi dört eş parçaya bölsen her parça kaç litre olur?', '2 L’nin [[1/4]]’ü 500 mL. [[3/4]]’ü kaç mL?'],
      diagnose: (a) => (Math.abs(a - ML(750)) <= ML(70) ? { msg: '750 mL, 1 L’nin [[3/4]]’ü olurdu. Ama bütün bu kez 2 L’lik şişe. Şişenin yarısı nerede?', mis: 'Bütünü 1 L kabul etti' } : null),
      ask: {
        kind: 'num',
        q: 'Şişede kaç mL su var?',
        answer: 1500,
        unit: 'mL',
        okText: 'Evet! 2.000 mL’nin [[1/4]]’ü 500 mL, [[3/4]]’ü 1.500 mL.',
        diagnose: (n) =>
          n === 750 ? { msg: '[[3/4]] L değil, 2 L’nin [[3/4]]’ü! 2 L’nin [[1/4]]’ü kaç mL?', mis: 'Bütünü 1 L kabul etti' }
          : n === 15 || n === 150 ? { msg: '1 L = 1.000 mL. 1 [[1/2]] L kaç mL eder?', mis: 'L–mL dönüşümünde basamak hatası' }
          : null,
      },
      note: 'Kesir, bütüne göredir: 2 L’nin [[3/4]]’ü 1.500 mL, 1 L’nin [[3/4]]’ü ise 750 mL.',
      picker: FILL_PICK,
      tool: 'fractions',
      toolConfig: { dens: [4, 8] },
    },
  ]
}

/* ───────────── 5. sınıf: farklı paydalar, farklı büyüklükte depoların doluluğu ───────────── */
function g5(): Level[] {
  return [
    {
      kind: 'order',
      title: 'En dolu mu, en çok mu?',
      unit: 'L',
      prompt: 'Dört deponun büyüklüğü de çizgileri de farklı. “En dolu depo” ile “en çok su olan depo” aynı mı? **İki kez** sıralayıp bul.',
      vessels: [
        V('a', 'Depo A', L(4), 'tank', { amt: L(3), marks: mk(4), plate: 'A · 4 L', color: C.blue }),
        V('b', 'Depo B', L(10), 'tank', { amt: L(4), marks: mk(5), plate: 'B · 10 L', color: C.teal }),
        V('c', 'Depo C', L(6), 'tank', { amt: L(5), marks: mk(6), plate: 'C · 6 L', color: C.violet }),
        V('d', 'Depo D', L(12), 'tank', { amt: L(6), marks: mk(2), plate: 'D · 12 L', color: C.orange }),
      ],
      rounds: [
        { by: 'full', q: 'Önce doluluğa göre: en az dolu olandan en dolu olana dokun.' },
        { by: 'amount', q: 'Şimdi su miktarına göre: en az sudan en çok suya dokun.' },
      ],
      explain: (v) => ({ a: '[[3/4]] dolu · 3 L', b: '[[2/5]] dolu · 4 L', c: '[[5/6]] dolu · 5 L', d: '[[1/2]] dolu · 6 L' })[v.id] ?? '',
      hints: ['Doluluk için her deponun kaçta kaçının dolu olduğunu yaz: A deposu [[3/4]], B deposu [[2/5]] …', '[[1/2]]’den az dolu olan hangisi? 1’e en yakın olan hangisi? Boş kalan parçalara bak: [[1/4]] mü küçük, [[1/6]] mı?', 'Miktar için kesri kapasiteyle düşün: 10 L’nin [[2/5]]’i = ?'],
      note: 'En dolu depo (6 L’nin [[5/6]]’sı = 5 L) en çok suyu taşımıyor; 12 L’nin yarısı daha çok! Kesir, bütüne göre bir büyüklüktür.',
      picker: ORDER_PICK,
      tool: 'kesirdogrusu',
      toolTitle: 'Kesirleri sayı doğrusunda karşılaştır',
    },
    {
      kind: 'fill',
      title: 'Altıda beş',
      unit: 'L',
      prompt: 'Depoyu **[[5/6]]**’sına kadar doldur. Ama depoda yalnızca üçte birlik çizgiler var!',
      tank: V('t', 'Depo', L(12), 'tank', { tap: true, marks: mk(3), plate: 'Depo · 12 L', color: C.blue }),
      target: L(10),
      tol: 0.035,
      targetText: '[[5/6]]',
      hints: ['[[5/6]], [[2/3]]’ten büyük mü küçük mü? [[2/3]] kaç altıda bire eşit?', '[[5/6]] = [[4/6]] + [[1/6]]. Bir üçte birlik parçanın yarısı kaç altıda bir eder?'],
      diagnose: (a) => (Math.abs(a - L(8)) <= L(0.45) ? { msg: 'Su [[2/3]] çizgisinde. [[2/3]] kaç altıda bir eder? [[5/6]] için ne kadar daha gerek?' } : Math.abs(a - L(6)) <= L(0.45) ? { msg: 'Su deponun yarısında: [[1/2]] = [[3/6]]. [[5/6]] daha yukarıda mı, aşağıda mı?' } : null),
      ask: {
        kind: 'num',
        q: 'Depoda kaç litre su var?',
        answer: 10,
        unit: 'L',
        okText: 'Evet! 12 L’nin [[1/6]]’sı 2 L, [[5/6]]’sı 10 L.',
        diagnose: (n) => (n === 5 ? { msg: '[[5/6]] litre değil, 12 L’nin [[5/6]]’sı! 12 L’nin [[1/6]]’sı kaç L?', mis: 'Kesrin bütününü unuttu' } : n === 2 ? { msg: '2 L, 12 L’nin yalnızca [[1/6]]’sı. [[5/6]]’sı?' } : n === 8 ? { msg: '8 L, [[2/3]] = [[4/6]] olurdu. Bir altıda bir daha!' } : null),
      },
      note: '[[2/3]] = [[4/6]]; bir altıda bir daha eklenince [[5/6]]. Üçte birlik parçayı ikiye bölmek altıda birleri verir.',
      picker: FILL_PICK,
      tool: 'fractions',
      toolConfig: { dens: [3, 6] },
    },
    {
      kind: 'compose',
      title: 'Bir tam bir çeyrek',
      unit: 'frac',
      prompt: 'Kek hamuru tam **[[1 1/4]] L** süt istiyor. Kaplar [[1/2]] L, [[1/4]] L ve [[3/4]] L. Sürahiye toplam [[1 1/4]] L koy. **3 farklı yol** bul!',
      tank: V('t', 'Sürahi', L(2), 'jug', { plate: 'Sürahi · 2 L', color: C.blue }),
      cups: [
        V('a', 'Yarım litre', L(0.5), 'bottle', { tap: true, plate: '½ L', color: C.teal }),
        V('b', 'Çeyrek litre', L(0.25), 'cup', { tap: true, plate: '¼ L', color: C.rose }),
        V('c', 'Üç çeyrek', L(0.75), 'jug', { tap: true, plate: '¾ L', color: C.violet }),
      ],
      target: L(1.25),
      targetText: '[[1 1/4]] L',
      goal: 3,
      showTotal: false,
      allowScoop: true,
      hints: ['[[1 1/4]] L içinde kaç tane [[1/4]] L var?', '[[1/2]] L kaç çeyrek eder? [[3/4]] L kaç çeyrek?', '[[3/4]] + [[1/2]] = ? Çeyreklerle düşün.'],
      note: 'Farklı paydalı kesirleri toplarken hepsini aynı parçayla saymak işe yarar: [[3/4]] + [[2/4]] = [[5/4]] = [[1 1/4]].',
      picker: { q: 'Kesirleri nasıl topladın?', options: ['Hepsini çeyreklerle saydım', '[[1/2]] = [[2/4]] diye düşündüm', 'Önce 1 L’yi tamamladım', 'Fazla koyup geri aldım'] },
      tool: 'fractions',
      toolConfig: { dens: [2, 4] },
    },
    {
      kind: 'equiv',
      title: 'Aynı 3 litre',
      unit: 'L',
      prompt: '3 L suyu farklı büyüklükteki depolara ayrı ayrı dök. Her depoda çizgiler 1 L’de bir. Aynı 3 L her depoda kaçta kaç eder? Önce tahmin çizgini koy (depoya dokun).',
      source: V('src', 'Kova', L(3), 'bucket', { amt: L(3), tap: true, plate: 'Kova · 3 L', color: C.orange }),
      tanks: [
        V('a', '6 L', L(6), 'tank', { marks: mk(6), plate: '6 L', color: C.blue }),
        V('b', '4 L', L(4), 'tank', { marks: mk(4), plate: '4 L', color: C.teal }),
        V('c', '12 L', L(12), 'tank', { marks: mk(12), plate: '12 L', color: C.violet }),
        V('d', '9 L', L(9), 'tank', { marks: mk(9), plate: '9 L', color: C.green }),
      ],
      answer: 'frac',
      predict: true,
      hints: ['Su 6 L’lik depoda 6 parçanın kaçını doldurdu?', '[[3/6]] başka nasıl yazılır? Deponun yarısına bak.', 'Depo büyüdükçe aynı 3 L deponun daha küçük mü, daha büyük mü bir kesri olur?'],
      note: 'Aynı 3 L: [[3/6]] = [[1/2]], [[3/4]], [[3/12]] = [[1/4]], [[3/9]] = [[1/3]]. Bütün büyüdükçe aynı su daha küçük bir kesir olur.',
      picker: { q: 'En dolu depoyu nasıl buldun?', options: ['Kesirleri karşılaştırdım', 'Su seviyesine baktım', 'Boş kalan kısma baktım', 'Kesirleri sadeleştirdim'] },
      tool: 'kesirdogrusu',
    },
    {
      kind: 'jug',
      title: 'Çeyrek litre şurup',
      unit: 'frac',
      prompt: 'İlaç şurubu için tam **[[1/4]] L** su gerekiyor. [[3/4]] L’lik sürahin ve [[1/2]] L’lik şişen var; çizgisi yok. **İki farklı yolla** tam [[1/4]] L elde et!',
      vessels: [
        V('a', 'Sürahi', L(0.75), 'jug', { tap: true, plate: '¾ L', color: C.violet }),
        V('b', 'Şişe', L(0.5), 'bottle', { tap: true, plate: '½ L', color: C.teal }),
      ],
      drain: true,
      goalText: 'bir kapta tam [[1/4]] L',
      goal: (s) => s.includes(L(0.25)),
      ways: 2,
      hints: ['[[3/4]] − [[1/2]] = ? Çeyreklerle düşün: [[3/4]] − [[2/4]].', 'Şişeyi iki kez sürahiye boşaltmayı dene: [[1/2]] + [[1/2]] sürahiye sığar mı? Ne kadar taşar?'],
      note: '[[3/4]] − [[2/4]] = [[1/4]] ve [[2/4]] + [[2/4]] − [[3/4]] = [[1/4]]. Aynı sonuca hem çıkararak hem taşanı kullanarak ulaştın.',
      picker: JUG_PICK,
      tool: 'fractions',
      toolConfig: { dens: [2, 4] },
    },
    {
      kind: 'fill',
      title: 'Aynı oranda',
      unit: 'L',
      prompt: 'Mavi depo [[2/3]] dolu. Kırmızı depoyu (9 L) da **aynı oranda**, yani onun da [[2/3]]’ü dolu olacak biçimde doldur.',
      ref: V('r', 'Mavi depo', L(6), 'tank', { amt: L(4), marks: mk(3), plate: 'Mavi · 6 L', color: C.blue }),
      tank: V('t', 'Kırmızı depo', L(9), 'tank', { tap: true, marks: mk(9), plate: 'Kırmızı · 9 L', color: C.rose }),
      target: L(6),
      tol: 0.035,
      targetText: '[[2/3]]',
      hints: ['9 L’nin [[1/3]]’ü kaç L?', 'Kırmızı depoda çizgiler 1 L’de bir. [[2/3]] kaç çizgiye denk gelir?'],
      diagnose: (a) => (Math.abs(a - L(4)) <= L(0.35) ? { msg: 'Mavi depodaki kadar su koydun: 4 L. Ama kırmızı depo daha büyük; 4 L onun [[2/3]]’ü mü? Su seviyelerini karşılaştır.', mis: 'Aynı oranı aynı miktarla karıştırdı' } : null),
      ask: {
        kind: 'num',
        q: 'Kırmızı depoda kaç litre su var?',
        answer: 6,
        unit: 'L',
        okText: 'Evet! 9 L’nin [[1/3]]’ü 3 L, [[2/3]]’ü 6 L. Mavi depoda ise 4 L var.',
        diagnose: (n) => (n === 4 ? { msg: 'Mavi depoda 4 L var; kırmızı depo daha büyük. 9 L’nin [[2/3]]’ü kaç L?', mis: 'Aynı oranı aynı miktarla karıştırdı' } : n === 3 ? { msg: '3 L, 9 L’nin [[1/3]]’ü. [[2/3]]’ü?' } : null),
      },
      note: '[[2/3]] dolu: 6 L’nin [[2/3]]’ü 4 L, 9 L’nin [[2/3]]’ü 6 L. Aynı kesir, farklı miktar! Su seviyeleri aynı oranda.',
      picker: FILL_PICK,
      tool: 'fractions',
      toolConfig: { dens: [3, 9] },
    },
  ]
}

/* ───────────── 6. sınıf: ondalık, yüzde, çok adımlı en iyileme ───────────── */
function g6(): Level[] {
  return [
    {
      kind: 'fill',
      title: 'Yüzde altmış',
      unit: 'dec',
      prompt: 'Depoyu **%60**’a kadar doldur. Depoda yalnızca %50 ve %100 yazıyor.',
      tank: V('t', 'Depo', L(2.5), 'tank', { tap: true, marks: mk(10, [5], 'pct'), plate: 'Depo · 2,5 L', color: C.blue }),
      target: L(1.5),
      tol: 0.03,
      targetText: '%60',
      hints: ['Depo kaç eş parçaya bölünmüş? Her parça yüzde kaç?', '%60 = %50 + %10.'],
      ask: {
        kind: 'dec',
        q: 'Depoda kaç litre su var?',
        answer: 1.5,
        unit: 'L',
        okText: 'Evet! 2,5 L’nin %10’u 0,25 L; %60’ı 6 × 0,25 = 1,5 L.',
        diagnose: (n) =>
          n === 60 ? { msg: '%60 bir oran; depo 2,5 L. 2,5 L’nin %10’u kaç L?', mis: 'Yüzdeyi miktar sandı' }
          : n === 0.6 ? { msg: '0,6 L, 1 L’nin %60’ı olurdu. Bu depo 2,5 L.', mis: 'Bütünü 1 L kabul etti' }
          : n === 1.25 ? { msg: '1,25 L deponun yarısı (%50). %10 daha!' }
          : null,
      },
      note: '%60 = [[60/100]] = [[3/5]]. 2,5 L’nin %10’u 0,25 L olduğundan %60’ı 1,5 L.',
      picker: FILL_PICK,
      tool: 'yuzdeizgarasi',
      toolTitle: 'Yüzde ızgarasında %60',
    },
    {
      kind: 'compose',
      title: 'Laboratuvar karışımı',
      unit: 'dec',
      prompt: 'Karışım tam **1,75 L** su istiyor. 0,5 L, 0,25 L ve 1,25 L’lik kaplarla sürahiye 1,75 L koy. **3 farklı yol** bul; en az dökmeli yolu da ara!',
      tank: V('t', 'Sürahi', L(3), 'jug', { plate: 'Sürahi · 3 L', color: C.blue }),
      cups: [
        V('a', '0,5 L', L(0.5), 'bottle', { tap: true, plate: '0,5 L', color: C.teal }),
        V('b', '0,25 L', L(0.25), 'cup', { tap: true, plate: '0,25 L', color: C.rose }),
        V('c', '1,25 L', L(1.25), 'jug', { tap: true, plate: '1,25 L', color: C.violet }),
      ],
      target: L(1.75),
      targetText: '1,75 L',
      goal: 3,
      showTotal: false,
      allowScoop: true,
      hints: ['1,25 L’ye ne eklersen 1,75 L olur?', '1,75 L içinde kaç tane 0,25 L var?', 'Fazla koyup geri almak da bir yol: 1,25 + 1,25 − ? = 1,75'],
      note: '1,25 + 0,5 = 1,75 en kısa yol (2 dökme); 0,25 × 7 en uzun. Ondalıkları basamak değeriyle topla: 1 tam 75 yüzde bir.',
      picker: { q: 'En az dökmeli yolu nasıl buldun?', options: ['En büyük kapla başladım', 'Kalanı hesapladım: 1,75 − 1,25', 'Çeyrek litrelerle saydım', 'Fazla koyup geri aldım'] },
    },
    {
      kind: 'order',
      title: 'Kesir, yüzde, ondalık',
      unit: 'dec',
      prompt: 'Dört kabı içlerindeki su miktarına göre **en azdan en çoğa** sırala. Bilgiler farklı biçimlerde: yüzde, kesir, mL!',
      vessels: [
        V('a', 'Depo', L(2.5), 'tank', { amt: L(1), plate: '2,5 L', note: '%40 dolu', color: C.blue }),
        V('b', 'Şişe', L(2), 'bottle', { amt: L(1.5), plate: '2 L', note: '¾ dolu', color: C.teal }),
        V('c', 'Matara', ML(1250), 'bottle', { amt: ML(1250), plate: '1.250 mL', note: 'tam dolu', color: C.green }),
        V('d', 'Büyük depo', L(4), 'tank', { amt: L(1.2), plate: '4 L', note: '%30 dolu', color: C.violet }),
      ],
      rounds: [{ by: 'amount', q: 'En az sudan en çok suya doğru dokun.' }],
      explain: (v) => ({ a: '2,5 × 0,4 = 1 L', b: '2’nin [[3/4]]’ü = 1,5 L', c: '1.250 mL = 1,25 L', d: '4 × 0,3 = 1,2 L' })[v.id] ?? '',
      hints: ['Hepsini litreye, ondalık gösterimle çevir.', '4 L’nin %30’u: 4 L’nin %10’u 0,4 L ise %30’u?', '1.250 mL = ? L. 1,2 ile 1,25’i basamak basamak karşılaştır.'],
      note: '1 L < 1,2 L < 1,25 L < 1,5 L. Yüzde, kesir ve ondalık aynı miktarı farklı biçimde anlatır; karşılaştırmak için tek biçime çevir.',
      picker: ORDER_PICK,
      tool: 'yuzdeizgarasi',
    },
    {
      kind: 'jug',
      title: 'En az adım',
      unit: 'dec',
      prompt: 'Tam **2 L** su ölçmelisin; 2,5 L ve 1,5 L’lik çizgisiz kapların var. Hedef: **en az adımda!** Her doldurma, boşaltma ve dökme 1 adım sayılır.',
      vessels: [
        V('a', 'Sürahi', L(2.5), 'jug', { tap: true, plate: '2,5 L', color: C.violet }),
        V('b', 'Şişe', L(1.5), 'bottle', { tap: true, plate: '1,5 L', color: C.teal }),
      ],
      drain: true,
      goalText: 'bir kapta tam 2 L',
      goal: (s) => s.includes(L(2)),
      ways: 1,
      needShortest: true,
      hints: ['2,5 − 1,5 = 1. Bu 1 L işine yarar mı?', '1 L’yi şişeye koyarsan şişede ne kadar boş yer kalır? Dolu sürahiden şişeye dökünce sürahide ne kalır?', 'Büyük kapla başlayan plan daha kısa: doldur, dök, boşalt, dök, doldur, dök.'],
      note: '2,5 − 1,5 = 1 ve 2,5 − (1,5 − 1) = 2. En az adımı bulmak için önce planla, sonra dök!',
      picker: JUG_PICK,
    },
    {
      kind: 'jug',
      title: 'Adil paylaşım',
      unit: 'L',
      prompt: '8 L’lik bidondaki suyu iki köy çeşmesine **4 L + 4 L** olarak paylaştır. Musluk ve gider yok; yalnızca 5 L’lik kova ve 3 L’lik sürahi var. Bidonda ve kovada 4’er litre kalsın.',
      vessels: [
        V('a', 'Bidon', L(8), 'tank', { amt: L(8), plate: 'Bidon · 8 L', color: C.blue }),
        V('b', 'Kova', L(5), 'bucket', { plate: 'Kova · 5 L', color: C.orange }),
        V('c', 'Sürahi', L(3), 'jug', { plate: 'Sürahi · 3 L', color: C.violet }),
      ],
      drain: false,
      goalText: 'bidonda 4 L, kovada 4 L',
      goal: (s) => s[0] === L(4) && s[1] === L(4),
      ways: 1,
      hints: ['Bidondan kovayı doldur, sonra kovadan sürahiye dök. Kovada kaç litre kaldı?', 'Sürahiyi bidona geri boşaltmak da bir hamle. Toplam su hep 8 L!', 'Kovada 4 L için, kova dolarken 5 L’ye 1 L eksik kalmalı. Sürahide 2 L varken kovayı doldurmaya çalış.'],
      note: 'Su ne eklendi ne kayboldu: her adımda toplam hep 8 L. Planlı paylaşım 7 adımda biter.',
      picker: JUG_PICK,
    },
    {
      kind: 'equiv',
      title: 'Yüzde kaç dolu?',
      unit: 'dec',
      prompt: '1,2 L suyu farklı depolara ayrı ayrı dök. Her depoda çizgiler %10’da bir. Aynı su her depoda yüzde kaç eder? Önce tahmin çizgini koy (depoya dokun).',
      source: V('src', 'Şişe', L(1.2), 'bottle', { amt: L(1.2), tap: true, plate: 'Şişe · 1,2 L', color: C.teal }),
      tanks: [
        V('a', '2 L', L(2), 'tank', { marks: mk(10), plate: '2 L', color: C.blue }),
        V('b', '1,5 L', L(1.5), 'tank', { marks: mk(10), plate: '1,5 L', color: C.orange }),
        V('c', '4 L', L(4), 'tank', { marks: mk(10), plate: '4 L', color: C.violet }),
        V('d', '2,4 L', L(2.4), 'tank', { marks: mk(10), plate: '2,4 L', color: C.green }),
      ],
      answer: 'pct',
      predict: true,
      hints: ['2 L’nin %10’u 0,2 L. 1,2 L içinde kaç tane 0,2 L var?', 'Su kaç çizgi aralığını doldurdu? Her aralık %10.', '1,2 L, 2,4 L’nin yarısı mı?'],
      note: 'Aynı 1,2 L: 2 L’nin %60’ı, 1,5 L’nin %80’i, 4 L’nin %30’u, 2,4 L’nin %50’si. Bütün büyüdükçe yüzde küçülür.',
      picker: { q: 'Yüzdeyi nasıl buldun?', options: ['Çizgi aralıklarını saydım', '%10’u bulup katladım', 'Kesre çevirdim', 'Yarımla karşılaştırdım'] },
      tool: 'yuzdeizgarasi',
    },
  ]
}

export const insightFor = (grade: Grade) =>
  grade <= 3
    ? 'Bir kaptaki su miktarı hem su seviyesine hem kabın büyüklüğüne bağlıdır: 8 L’nin yarısı, dolu 2 L’lik şişeden fazladır. İki yarım litre bir litre eder.'
    : grade === 4
      ? '1 L = 1.000 mL. Aynı depoyu daha çok eş parçaya bölmek su seviyesini değiştirmez, yalnızca kesrin adını değiştirir: [[1/2]] = [[2/4]] = [[4/8]].'
      : grade === 5
        ? 'En dolu depo en çok suyu taşımayabilir: kesir bütüne göredir. Farklı paydalı kesirleri aynı büyüklükte parçalarla sayarak toplar ve karşılaştırırız.'
        : 'Kesir, ondalık ve yüzde aynı miktarı anlatır; karşılaştırmak için tek biçime çeviririz. Çok adımlı bir problemde önce planlamak en az adımı bulmayı sağlar.'
