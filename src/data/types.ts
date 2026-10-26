/**
 * Etkinlik veri modeli.
 *
 * Metinlerde basit matematik gösterimi kullanılabilir (bkz. components/MathText.tsx):
 *   [[3/4]]   → üst üste kesir
 *   [[1 2/3]] → tam sayılı kesir
 *   x^{2}     → üs
 *   √{16}     → karekök
 */

export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface Outcome {
  /** "MAT.3.1.4" */
  code: string
  /** Programdaki resmî ifade */
  title: string
  /** Öğrencinin anlayacağı kısa başlık */
  short: string
}

export interface Theme {
  /** URL'de kullanılan kısa ad, sınıf içinde benzersiz: "sayilar-ve-nicelikler-1" */
  slug: string
  grade: Grade
  /** İşleniş sırası */
  order: number
  title: string
  /** Konu başlıkları (İçerik Çerçevesi) */
  topics: string[]
  icon: ThemeIcon
  outcomes: Outcome[]
}

export type ThemeIcon = 'numbers' | 'operations' | 'geometry' | 'measure' | 'data' | 'probability' | 'transform' | 'algebra'

// ---------------------------------------------------------------------------
// Görseller (hepsi SVG ile çizilir, dış görsel yok)
// ---------------------------------------------------------------------------

export type ShapeName =
  | 'triangle' | 'right-triangle' | 'square' | 'rectangle' | 'circle' | 'oval' | 'pentagon' | 'hexagon'
  | 'octagon' | 'rhombus' | 'trapezoid' | 'parallelogram' | 'star' | 'semicircle'
  | 'cube' | 'cuboid' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'triangular-prism'

export type Visual =
  /** Aynı emojiden `count` tane (ör. 🍎 × 7). `group` verilirse o kadarlık gruplar halinde dizilir */
  | { kind: 'emoji'; emoji: string; count: number; group?: number }
  /** Birden çok emoji grubu yan yana: [🍎×3] + [🍐×2] */
  | { kind: 'emojiGroups'; groups: { emoji: string; count: number }[]; separator?: string }
  /** Onluk çerçeve */
  | { kind: 'tenframe'; filled: number; size?: 10 | 20 }
  /** Onluk taban blokları */
  | { kind: 'blocks'; thousands?: number; hundreds?: number; tens?: number; ones?: number }
  /** Kesir modeli */
  | { kind: 'fraction'; num: number; den: number; shape?: 'circle' | 'bar' | 'rect'; wholes?: number }
  /** Analog saat (digital: true ise dijital saat de gösterilir) */
  | { kind: 'clock'; h: number; m: number; digital?: boolean; analog?: boolean }
  /** Türk lirası (kuruş için 0.05, 0.1, 0.25, 0.5) */
  | { kind: 'money'; items: number[] }
  | { kind: 'shape'; shape: ShapeName; color?: string; label?: string }
  /** Açı (derece). showMeasure: ölçü yazılsın mı */
  | { kind: 'angle'; degrees: number; showMeasure?: boolean }
  /** Sayı doğrusu. `points` işaretlenen noktalar, `labels: false` ise sayılar gizlenir, `hidden` soru işaretiyle gösterilen değerler */
  | { kind: 'numberline'; min: number; max: number; step: number; points?: number[]; hidden?: number[]; labels?: boolean; jumps?: number[] }
  /** Sütun grafiği */
  | { kind: 'bars'; data: { label: string; value: number }[]; title?: string; unit?: string }
  /** Resim grafiği (her simge `unit` değerinde) */
  | { kind: 'pictograph'; data: { label: string; value: number }[]; icon: string; unit?: number; title?: string }
  /** Çetele / sıklık tablosu */
  | { kind: 'table'; headers: string[]; rows: (string | number)[][] }
  /** Birim kareli zemin üzerinde dikdörtgen (alan/çevre) */
  | { kind: 'area'; w: number; h: number; showGrid?: boolean; labels?: boolean }
  /** Birim kareli zeminde boyalı hücreler (simetri, alan tahmini). cells: "x,y" listesi */
  | { kind: 'grid'; cols: number; rows: number; cells: string[]; axis?: 'v' | 'h'; axisAt?: number; color?: string }
  /** Koordinat düzlemi */
  | { kind: 'coords'; range: number; points?: { x: number; y: number; label?: string; color?: string }[]; lines?: { m: number; b: number; color?: string }[] }
  /** Basit örüntü: emoji/şekil dizisi, '?' boşluk */
  | { kind: 'pattern'; items: string[] }
  /** Terazi: sol ve sağ kefelerdeki etiketler */
  | { kind: 'balance'; left: string[]; right: string[] }
  /** Küp yapısı (yukarıdan görünüş ızgarası: her hücredeki küp sayısı) */
  | { kind: 'cubes'; heights: number[][] }
  /** Zar / çark */
  | { kind: 'spinner'; sectors: { label: string; color?: string }[] }
  | { kind: 'dice'; value: number }
  /** Güvenilir, elle yazılmış ham SVG (viewBox içermeli) */
  | { kind: 'svg'; svg: string }

/** Bir soru, kart veya seçenek içeriği: düz metin ya da metin + görsel */
export type Content = string | { text?: string; visual?: Visual }

// ---------------------------------------------------------------------------
// Etkinlik türleri
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  prompt: Content
  choices: Content[]
  /** Doğru seçeneğin indeksi (0'dan başlar) */
  answer: number
  /** Yanlış cevaptan sonra gösterilen kısa açıklama */
  explain?: string
}

export interface FillItem {
  /** "__" her boşluğu temsil eder: "8 + __ = 15" */
  text: string
  /** Boşlukların doğru cevapları, sırayla. Her boşluk için alternatif cevaplar "|" ile ayrılabilir: "0,5|0.5" */
  answers: string[]
  visual?: Visual
  /** Verilirse klavye yerine kelime/sayı çipleri gösterilir */
  choices?: string[]
  hint?: string
}

export interface MatchPair {
  left: Content
  right: Content
}

export interface SortRound {
  prompt: string
  /** DOĞRU sırayla yazılır, ekranda karıştırılır */
  items: Content[]
  /** Uçlardaki etiketler, ör. ["En küçük", "En büyük"] */
  ends?: [string, string]
}

export interface CategorizeItem {
  content: Content
  /** categories içindeki id */
  category: string
}

export type ManipulativeTool =
  | 'tenframe' | 'base10' | 'numberline' | 'fractions' | 'clock' | 'money' | 'geoboard'
  | 'symmetry' | 'angle' | 'balance' | 'algebra' | 'bargraph' | 'probability' | 'coordinate' | 'nets'

/**
 * Manipülatif görevleri: her aracın kendi hedef biçimi var.
 *  tenframe:    { count }                     → çerçeveye count sayaç koy
 *  base10:      { value }                     → bloklarla sayıyı oluştur
 *  numberline:  { value }                     → sayı doğrusunda noktayı işaretle (min/max/step config'den)
 *  fractions:   { num, den }                  → kesir şeridinde kesri oluştur
 *  clock:       { h, m }                      → saati ayarla
 *  money:       { total }                     → tutarı paralarla oluştur
 *  geoboard:    { sides?, area?, perimeter?, rect?, square? } → bu özelliklere sahip çokgen çiz
 *  symmetry:    { cells, axis }               → simetriyi tamamla
 *  angle:       { degrees }                   → açıyı oluştur (±3°)
 *  balance:     { a, b, c }                   → a·x + b = c terazisinde x'i bul
 *  algebra:     { x2?, x, c }                 → cebir karolarıyla ifadeyi modelle
 *  bargraph:    { data }                      → tablodaki veriyle sütun grafiği oluştur
 *  probability: { question, choices, answer } → deney yap, soruyu cevapla (answer: seçeneklerden biri)
 *  coordinate:  { x, y }                      → noktayı yerleştir
 *  nets:        { solid }                     → cismin açınımını seç/katla
 */
export interface ManipulativeTask {
  prompt: string
  target: Record<string, unknown>
}

export interface ManipulativeConfig {
  /** numberline: */
  min?: number
  max?: number
  step?: number
  /** fractions: kullanılabilecek paydalar */
  dens?: number[]
  /** geoboard/coordinate/symmetry ızgara boyutu */
  size?: number
  /** tenframe: 10 veya 20 */
  frames?: 1 | 2
  /** base10: gösterilecek blok türleri */
  maxPlace?: 'hundreds' | 'thousands'
  /** money: kullanılabilecek paralar (TL) */
  coins?: number[]
  /** clock: sadece tam/yarım saat */
  minuteStep?: number
  /** probability: 'coin' | 'dice' | 'spinner' | 'bag' */
  mode?: 'coin' | 'dice' | 'spinner' | 'bag'
  /** probability spinner/bag içeriği */
  sectors?: { label: string; color: string; weight?: number }[]
}

/** Çalışma anında soru üreten üreteçler (bkz. lib/generators.ts) */
export interface GeneratorSpec {
  id: string
  params?: Record<string, unknown>
  /** Kaç soru üretilsin (varsayılan 8) */
  count?: number
}

interface ActivityBase {
  /** Tüm sitede benzersiz, URL'de kullanılır: "g3-sayilari-cozumle" (küçük harf, Türkçe karakter yok) */
  id: string
  /** Bağlı olduğu öğrenme çıktısı kodu(ları) */
  outcomes: string[]
  title: string
  /** Kısa yönerge, ekranın üstünde gösterilir */
  instructions: string
  /** 1: kolay, 2: orta, 3: zor */
  level?: 1 | 2 | 3
}

export interface QuizActivity extends ActivityBase {
  type: 'quiz'
  questions?: QuizQuestion[]
  generator?: GeneratorSpec
  /** true ise seçenekler karıştırılmaz (ör. "imkânsız / olabilir / kesin" sıralı ölçek) */
  fixedOrder?: boolean
}
export interface FillActivity extends ActivityBase {
  type: 'fill'
  items?: FillItem[]
  generator?: GeneratorSpec
}
export interface MatchActivity extends ActivityBase {
  type: 'match'
  pairs?: MatchPair[]
  generator?: GeneratorSpec
  /** Bir turda gösterilecek en fazla çift (varsayılan 5) */
  perRound?: number
}
export interface SortActivity extends ActivityBase {
  type: 'sort'
  rounds?: SortRound[]
  generator?: GeneratorSpec
}
export interface CategorizeActivity extends ActivityBase {
  type: 'categorize'
  /** 2–4 grup */
  categories: { id: string; label: string; color?: string }[]
  items: CategorizeItem[]
}
export interface ManipulativeActivity extends ActivityBase {
  type: 'manipulative'
  tool: ManipulativeTool
  config?: ManipulativeConfig
  tasks: ManipulativeTask[]
}

export type Activity =
  | QuizActivity
  | FillActivity
  | MatchActivity
  | SortActivity
  | CategorizeActivity
  | ManipulativeActivity

export type ActivityType = Activity['type']

/** Aslı Hoca'nın eklediği dış bağlantılar */
export interface ExternalLink {
  title: string
  url: string
  /** Bağlı olduğu öğrenme çıktısı ya da tema: "MAT.3.1.4" veya "3/sayilar-ve-nicelikler-1" */
  target: string
  kind?: 'oyun' | 'video' | 'geogebra' | 'calisma-kagidi' | 'diger'
  note?: string
}
