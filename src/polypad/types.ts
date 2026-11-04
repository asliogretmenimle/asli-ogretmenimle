import type { ReactNode } from 'react'

export type Pt = { x: number; y: number }
// Parçaya özel özellikler serbest biçimlidir; her parça tanımı kendi alanlarını bilir
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Props = Record<string, any>

/** Tuvaldeki her nesne (çokgen, kalem çizgisi, metin, zar…) bir parçadır */
export interface Tile {
  id: string
  type: string
  /** Dünya koordinatında merkez */
  x: number
  y: number
  /** Derece, saat yönünde */
  rot: number
  flip?: boolean
  color?: string
  locked?: boolean
  p: Props
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Seçili (ya da her zaman görünen) sürüklenebilir kontrol noktası; yerel koordinatta */
export interface Handle {
  id: string
  x: number
  y: number
  show?: 'selected' | 'always'
  /** Görünmez ama dokunulabilir tutamak (ör. saat akrebi ucunda) */
  hidden?: boolean
  color?: string
}

/**
 * Eylem çubuğundaki bir öğe (Polypad modeli). Seçimdeki tüm parçaların türü tileTypes içindeyse
 * ve show() doğruysa görünür. Düğmeler seçimin tamamı üzerinde çalışır (ör. birden çok onluk seçilince "Birleştir").
 */
export interface ActionSpec {
  id: string
  type: 'button' | 'checkbox' | 'input' | 'select' | 'slider'
  tileTypes: string[] | 'all'
  label: string
  /** icons.tsx'teki simge adı */
  icon?: string
  /** Düğmede simge yerine yazı görünsün (Polypad useTextLabel) */
  text?: boolean
  /** Yer: varsayılan çubuk ('bar' verilirse her zaman çubuğun sonunda), 'more' ⋯ menüsü, 'music' müzik bölümü */
  location?: 'bar' | 'more' | 'music'
  /** Yalnızca yazar modunda görünür ("Yazar" bölümünde) */
  author?: boolean
  order?: number
  show?: (tiles: Tile[]) => boolean
  /** Düğme: seçimin tamamı üzerinde çalışır */
  click?: (tiles: Tile[], api: PadApi) => void
  /** Onay kutusu / giriş / seçim / kaydırıcı: bir parçanın değeri (kaydırıcı için 0–1) */
  get?: (t: Tile) => unknown
  /** Her seçili parça için çağrılır; dönen yama uygulanır (p alanı birleştirilir) */
  set?: (value: never, t: Tile, api: PadApi) => Partial<Tile> | void
  options?: { key: string; label: string }[]
  /** Giriş türü; 'number' ise –/+ düğmeleri çıkar */
  value?: 'number' | 'text'
  range?: [number, number]
  /** –/+ adımı (varsayılan 1) */
  step?: number
}

export interface RenderCtx {
  selected: boolean
  /** Kenar çubuğu küçük resmi çiziliyor */
  thumb?: boolean
  /** Yüksek karşıtlık modu */
  hc?: boolean
  /** Diğer parçalar (bağlı çizgiler, mantık kapıları gibi başkasına bakan parçalar için) */
  tiles?: Tile[]
}

export interface TapInfo {
  /** Dokunulan öğedeki data-act değeri */
  act?: string
  /** Dokunulan öğedeki data-v değeri */
  v?: string
  local: Pt
  world: Pt
}

export interface TileDef {
  type: string
  name: (t: Tile) => string
  render: (t: Tile, ctx: RenderCtx) => ReactNode
  /** Yerel (döndürülmemiş) sınır kutusu, 0,0 merkez kabul edilir */
  bounds: (t: Tile) => Box
  /** Köşe yakalama için yerel çokgen */
  outline?: (t: Tile) => Pt[]
  /** Kaynak özelliklerinden yeni parçanın ilk hâli */
  create?: (p: Props) => Partial<Omit<Tile, 'id' | 'type' | 'x' | 'y'>>
  colorable?: boolean
  /** Varsayılan true */
  rotatable?: boolean
  /** Döndürme adımı (derece); varsayılan 15 */
  rotStep?: number
  flippable?: boolean
  /** Izgara açıkken köşe ızgaraya yapışsın */
  gridSnap?: boolean
  /** Diğer parçaların köşelerine yapışsın (outline gerekir); varsayılan true */
  edgeSnap?: boolean
  /** Sürüklemeden dokunma. Parça zaten seçiliyken ya da data-act'li bir öğeye dokunulduğunda çağrılır */
  onTap?: (t: Tile, api: PadApi, info: TapInfo) => void
  onDoubleTap?: (t: Tile, api: PadApi, info: TapInfo) => void
  handles?: (t: Tile) => Handle[]
  /** Tutamak sürüklenince yeni özellikleri döndürür (local: tutamağın yeni yerel konumu) */
  onHandle?: (t: Tile, id: string, local: Pt, api: PadApi, phase: 'start' | 'move' | 'end') => Partial<Tile> | void
  /** Kenar çubuğu küçük resmi (verilmezse render kullanılır) */
  thumb?: (t: Tile) => ReactNode
  /** Çift dokunuşla metin düzenleme */
  text?: { key: string; multiline?: boolean; label?: string }
  /** Başka parçalara bağlı parçalar (ör. bağlı çizgi): bağlı olduğu parça kimlikleri */
  deps?: (t: Tile) => string[]
  /** Bağlı parçalardan biri değişince parçanın yeni hâli */
  follow?: (t: Tile, get: (id: string) => Tile | undefined) => Partial<Tile> | null
  /** Silgi ile silinebilir (kalem çizgileri) */
  erasable?: boolean
  /**
   * true ise parça her değişiklikte yeniden çizilir ve ctx.tiles ile tüm parçaları görür
   * (terazi, fonksiyon makinesi, mantık kapıları gibi). Pahalıdır; yalnızca gerektiğinde kullanın.
   */
  watch?: boolean
  /** Başka parçalar bu parçanın üzerine bırakıldığında (bırakılanların merkezi bu parçanın sınırları içindeyse) */
  onDrop?: (t: Tile, dropped: Tile[], api: PadApi) => void
}

export type SoundKind = 'click' | 'pop' | 'roll' | 'snap' | 'win' | 'error'

export interface PadApi {
  get: (id: string) => Tile | undefined
  all: () => Tile[]
  /** commit=true ise geri alınabilir adım oluşturur */
  update: (id: string, patch: Partial<Tile> | ((t: Tile) => Partial<Tile>), commit?: boolean) => void
  /** Yalnızca p içindeki alanları birleştirir */
  updateP: (id: string, patch: Props | ((p: Props) => Props), commit?: boolean) => void
  add: (tiles: Omit<Tile, 'id'>[], select?: boolean) => string[]
  remove: (ids: string[]) => void
  select: (ids: string[]) => void
  commit: () => void
  sound: (kind: SoundKind) => void
  /** Frekansı Hz olan bir nota çalar */
  note: (freq: number, dur?: number, wave?: OscillatorType) => void
  confetti: () => void
  /** Uygulama içi metin isteme penceresi */
  prompt: (label: string, value: string) => Promise<string | null>
  /** Seçili rengi verir */
  color: () => string
  /** Dünya noktasındaki en üstteki parça */
  tileAt: (world: Pt, exclude?: string[]) => Tile | undefined
  /** Parçanın dünya koordinatındaki sınır kutusu */
  box: (t: Tile) => Box
}

export interface Source {
  t: string
  p?: Props
  /** Erişilebilir ad ve araç ipucu */
  label: string
  /** Kaynağın altında görünen yazı */
  cap?: string
  /** Küçük resim boyut çarpanı (varsayılan 1) */
  scale?: number
}

export interface SourceGroup {
  subtitle?: string
  caption?: string
  sources: Source[]
  /** Küçük resim kutusu en büyük kenarı (px) */
  max?: number
  /** Her kaynak kendi başına kutuya sığdırılsın (yoksa grup içinde oranlar korunur) */
  fit?: boolean
}

export interface Section {
  key: string
  title: string
  groups: SourceGroup[]
}

export interface Category {
  key: string
  title: string
  color: string
  icon: string
  sections: Section[]
}
