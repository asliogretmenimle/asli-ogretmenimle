/**
 * Büyüyen şekil örüntüleri. Her şekil, birim ızgarada öğe anahtarlarından oluşur:
 *   t:x,y        → (x,y) sol-alt köşeli birim kare karo
 *   d:x,y        → (x,y) noktası
 *   s:x1,y1,x2,y2 → birim uzunlukta kibrit çöpü (yatay/dikey)
 * Şekiller iç içedir: şekil n, şekil n+1’in içinde aynı koordinatlarda durur (büyüme renklendirilebilir).
 * "Görme biçimleri" (lens): şekli gruplara ayıran renklendirmeler; her biri denk bir ifadeye karşılık gelir.
 */

export type Kind = 'tile' | 'dot' | 'stick'

export interface LensGroup {
  keys: string[]
  /** renk sırası (aynı tür tekrarlanan gruplar dönüşümlü renk alır) */
  tone: number
  /** iki kez sayılan parça (çıkarılacak) */
  twice?: boolean
}

export interface Lens {
  id: string
  /** ifade (n ile). Örn. "1 + 3n" */
  expr: string
  /** öğrenciye sözel ipucu */
  say: string
  groups: (n: number) => LensGroup[]
}

export interface Pattern {
  id: string
  kind: Kind
  name: string
  /** birim adı: kibrit, karo, nokta */
  unit: string
  A: number
  B: number
  fig: (n: number) => string[]
  lenses: Lens[]
  /** büyüme cümlesi */
  grow: string
}

const S = (x1: number, y1: number, x2: number, y2: number) => `s:${x1},${y1},${x2},${y2}`
const T = (x: number, y: number) => `t:${x},${y}`
const D = (x: number, y: number) => `d:${x},${y}`
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)

/* ── Kibrit kareleri: 3n + 1 ── */
const kH = (i: number, y: number) => S(i, y, i + 1, y)
const kV = (i: number) => S(i, 0, i, 1)
const kibrit: Pattern = {
  id: 'kibrit',
  kind: 'stick',
  name: 'Kibrit kareleri',
  unit: 'kibrit',
  A: 3,
  B: 1,
  grow: 'Her şekilde sağa bir kare daha ekleniyor.',
  fig: (n) => [...range(0, n - 1).flatMap((i) => [kH(i, 0), kH(i, 1)]), ...range(0, n).map(kV)],
  lenses: [
    { id: 'k1', expr: '1 + 3n', say: 'En soldaki tek çöp, sonra her kare için bir “⊐” (3 çöp).', groups: (n) => [{ keys: [kV(0)], tone: 0 }, ...range(0, n - 1).map((i) => ({ keys: [kH(i, 0), kH(i, 1), kV(i + 1)], tone: 1 + (i % 2) }))] },
    { id: 'k2', expr: '4 + 3(n − 1)', say: 'İlk kare 4 çöp; sonraki her kare 3 çöp ekliyor.', groups: (n) => [{ keys: [kV(0), kH(0, 0), kH(0, 1), kV(1)], tone: 0 }, ...range(1, n - 1).map((i) => ({ keys: [kH(i, 0), kH(i, 1), kV(i + 1)], tone: 1 + (i % 2) }))] },
    { id: 'k3', expr: '2n + (n + 1)', say: 'Yatay çöpler (üst ve alt sıra) ayrı, dikey çöpler ayrı.', groups: (n) => [{ keys: range(0, n - 1).flatMap((i) => [kH(i, 0), kH(i, 1)]), tone: 1 }, { keys: range(0, n).map(kV), tone: 0 }] },
    { id: 'k4', expr: '4n − (n − 1)', say: 'Her kareyi 4 çöple say; iki karenin ortak çöpleri iki kez sayılmış olur.', groups: (n) => [...range(0, n - 1).map((i) => ({ keys: [kH(i, 0), kH(i, 1), kV(i), kV(i + 1)], tone: 1 + (i % 2) })), { keys: range(1, n - 1).map(kV), tone: 3, twice: true }] },
  ],
}

/* ── L karoları: 2n + 1 ── */
const lCorner = T(0, 0)
const lRight = (n: number) => range(1, n).map((i) => T(i, 0))
const lUp = (n: number) => range(1, n).map((i) => T(0, i))
const lkaro: Pattern = {
  id: 'lkaro',
  kind: 'tile',
  name: 'L karoları',
  unit: 'karo',
  A: 2,
  B: 1,
  grow: 'Her şekilde iki kola birer karo ekleniyor.',
  fig: (n) => [lCorner, ...lRight(n), ...lUp(n)],
  lenses: [
    { id: 'l1', expr: '1 + n + n', say: 'Köşedeki karo, sağa uzanan kol ve yukarı uzanan kol.', groups: (n) => [{ keys: [lCorner], tone: 0 }, { keys: lRight(n), tone: 1 }, { keys: lUp(n), tone: 2 }] },
    { id: 'l2', expr: '(n + 1) + n', say: 'Alttaki sıranın tamamı ve üstündeki sütun.', groups: (n) => [{ keys: [lCorner, ...lRight(n)], tone: 1 }, { keys: lUp(n), tone: 2 }] },
    { id: 'l3', expr: '2(n + 1) − 1', say: 'İki eş kol; köşedeki karo iki kolda da sayılıyor.', groups: (n) => [{ keys: lRight(n), tone: 1 }, { keys: lUp(n), tone: 2 }, { keys: [lCorner], tone: 3, twice: true }] },
  ],
}

/* ── Artı noktaları: 4n + 1 ── */
const aArm = (n: number, dx: number, dy: number) => range(1, n).map((i) => D(i * dx, i * dy))
const arti: Pattern = {
  id: 'arti',
  kind: 'dot',
  name: 'Artı noktaları',
  unit: 'nokta',
  A: 4,
  B: 1,
  grow: 'Her şekilde dört kolun ucuna birer nokta ekleniyor.',
  fig: (n) => [D(0, 0), ...aArm(n, 1, 0), ...aArm(n, -1, 0), ...aArm(n, 0, 1), ...aArm(n, 0, -1)],
  lenses: [
    { id: 'a1', expr: '1 + 4n', say: 'Ortadaki nokta ve dört eş kol.', groups: (n) => [{ keys: [D(0, 0)], tone: 0 }, { keys: aArm(n, 1, 0), tone: 1 }, { keys: aArm(n, -1, 0), tone: 2 }, { keys: aArm(n, 0, 1), tone: 1 }, { keys: aArm(n, 0, -1), tone: 2 }] },
    { id: 'a2', expr: '(2n + 1) + 2n', say: 'Yatay çizginin tamamı, sonra yukarı ve aşağı kollar.', groups: (n) => [{ keys: [D(0, 0), ...aArm(n, 1, 0), ...aArm(n, -1, 0)], tone: 1 }, { keys: [...aArm(n, 0, 1), ...aArm(n, 0, -1)], tone: 2 }] },
    { id: 'a3', expr: '2(2n + 1) − 1', say: 'Yatay ve dikey iki uzun çizgi; ortadaki nokta iki kez sayılıyor.', groups: (n) => [{ keys: [...aArm(n, 1, 0), ...aArm(n, -1, 0)], tone: 1 }, { keys: [...aArm(n, 0, 1), ...aArm(n, 0, -1)], tone: 2 }, { keys: [D(0, 0)], tone: 3, twice: true }] },
  ],
}

/* ── Nokta kulesi: 2n + 2 ── */
const kuleCol = (i: number) => [D(i, 0), D(i, 1)]
const kule: Pattern = {
  id: 'kule',
  kind: 'dot',
  name: 'Nokta treni',
  unit: 'nokta',
  A: 2,
  B: 2,
  grow: 'Her şekilde sağa iki noktalık bir sütun ekleniyor.',
  fig: (n) => range(0, n).flatMap(kuleCol),
  lenses: [
    { id: 'u1', expr: '2 + 2n', say: 'İlk sütun 2 nokta, sonra her şekil için bir sütun daha.', groups: (n) => [{ keys: kuleCol(0), tone: 0 }, ...range(1, n).map((i) => ({ keys: kuleCol(i), tone: 1 + (i % 2) }))] },
    { id: 'u2', expr: '(n + 1) + (n + 1)', say: 'Üst sıra ve alt sıra.', groups: (n) => [{ keys: range(0, n).map((i) => D(i, 1)), tone: 1 }, { keys: range(0, n).map((i) => D(i, 0)), tone: 2 }] },
    { id: 'u3', expr: '2(n + 1)', say: 'İkişerli sütunlar; şekil numarasından bir fazla sütun var.', groups: (n) => range(0, n).map((i) => ({ keys: kuleCol(i), tone: 1 + (i % 2) })) },
  ],
}

/* ── İki katlı kibrit çiti: 5n + 2 ── */
const cH = (i: number, y: number) => S(i, y, i + 1, y)
const cV = (i: number, y: number) => S(i, y, i, y + 1)
const cCol = (i: number) => [cH(i, 0), cH(i, 1), cH(i, 2), cV(i + 1, 0), cV(i + 1, 1)]
const cit: Pattern = {
  id: 'cit',
  kind: 'stick',
  name: 'İki katlı kibrit çiti',
  unit: 'kibrit',
  A: 5,
  B: 2,
  grow: 'Her şekilde sağa iki katlı bir sütun ekleniyor.',
  fig: (n) => [...range(0, n - 1).flatMap((i) => [cH(i, 0), cH(i, 1), cH(i, 2)]), ...range(0, n).flatMap((i) => [cV(i, 0), cV(i, 1)])],
  lenses: [
    { id: 'c1', expr: '2 + 5n', say: 'En soldaki iki dikey çöp, sonra her sütun için 5 çöp.', groups: (n) => [{ keys: [cV(0, 0), cV(0, 1)], tone: 0 }, ...range(0, n - 1).map((i) => ({ keys: cCol(i), tone: 1 + (i % 2) }))] },
    { id: 'c2', expr: '3n + 2(n + 1)', say: 'Üç sıra yatay çöp, iki sıra dikey çöp.', groups: (n) => [{ keys: range(0, n - 1).flatMap((i) => [cH(i, 0), cH(i, 1), cH(i, 2)]), tone: 1 }, { keys: range(0, n).flatMap((i) => [cV(i, 0), cV(i, 1)]), tone: 2 }] },
    { id: 'c3', expr: '7 + 5(n − 1)', say: 'İlk sütun 7 çöp; sonraki her sütun 5 çöp.', groups: (n) => [{ keys: [cV(0, 0), cV(0, 1), ...cCol(0)], tone: 0 }, ...range(1, n - 1).map((i) => ({ keys: cCol(i), tone: 1 + (i % 2) }))] },
    { id: 'c4', expr: '2(3n + 1) − n', say: 'Üst üste iki “kibrit kareleri” sırası; ortadaki yatay çöpler iki kez sayılıyor.', groups: (n) => [{ keys: [...range(0, n - 1).map((i) => cH(i, 0)), ...range(0, n).map((i) => cV(i, 0))], tone: 1 }, { keys: [...range(0, n - 1).map((i) => cH(i, 2)), ...range(0, n).map((i) => cV(i, 1))], tone: 2 }, { keys: range(0, n - 1).map((i) => cH(i, 1)), tone: 3, twice: true }] },
  ],
}

export const PATTERNS = { kibrit, lkaro, arti, kule, cit }
export type PatternId = keyof typeof PATTERNS

export const valueAt = (p: Pattern, n: number) => p.A * n + p.B

/* ── geometri yardımcıları ── */

export type Item = { kind: Kind; x: number; y: number; x2: number; y2: number }
export function parseKey(k: string): Item {
  const [t, rest] = k.split(':')
  const v = rest.split(',').map(Number)
  if (t === 's') return { kind: 'stick', x: v[0], y: v[1], x2: v[2], y2: v[3] }
  return { kind: t === 't' ? 'tile' : 'dot', x: v[0], y: v[1], x2: v[0] + (t === 't' ? 1 : 0), y2: v[1] + (t === 't' ? 1 : 0) }
}

export function bounds(keys: string[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const k of keys) {
    const it = parseKey(k)
    x0 = Math.min(x0, it.x, it.x2)
    y0 = Math.min(y0, it.y, it.y2)
    x1 = Math.max(x1, it.x, it.x2)
    y1 = Math.max(y1, it.y, it.y2)
  }
  if (!isFinite(x0)) return { x0: 0, y0: 0, x1: 1, y1: 1 }
  return { x0, y0, x1, y1 }
}

const keyOf = (it: Item) => {
  if (it.kind === 'stick') {
    const [a, b] = it.x < it.x2 || (it.x === it.x2 && it.y <= it.y2) ? [[it.x, it.y], [it.x2, it.y2]] : [[it.x2, it.y2], [it.x, it.y]]
    return S(a[0], a[1], b[0], b[1])
  }
  return it.kind === 'tile' ? T(it.x, it.y) : D(it.x, it.y)
}

/** Ötelemeden bağımsız biçim imzası; mirror: yatay ayna */
export function shapeSig(keys: string[], mirror = false): string {
  let items = keys.map(parseKey)
  if (mirror) items = items.map((it) => (it.kind === 'tile' ? { ...it, x: -it.x - 1, x2: -it.x } : { ...it, x: -it.x, x2: -it.x2 }))
  const b = bounds(items.map(keyOf))
  return items
    .map((it) => keyOf({ ...it, x: it.x - b.x0, x2: it.x2 - b.x0, y: it.y - b.y0, y2: it.y2 - b.y0 }))
    .sort()
    .join(' ')
}

export const sameShape = (a: string[], b: string[]) => {
  const s = shapeSig(b)
  return shapeSig(a) === s || shapeSig(a, true) === s
}
