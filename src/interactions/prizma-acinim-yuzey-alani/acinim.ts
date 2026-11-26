import * as THREE from 'three'

/**
 * Dikdörtgenler prizmasının açınımları ve katlanması.
 *  - Boyutlar: a = en (sol–sağ), b = derinlik (ön–arka), c = yükseklik.
 *  - Açınım, kareli kâğıtta (u, v) dikdörtgenleridir. Alt yüz her zaman kök: [0, a] × [0, b].
 *  - Her yüz, bir “ebeveyn” yüze ortak bir kenarla (menteşe) bağlıdır. Katlanırken her menteşe 90° döner;
 *    bütün yüzler kâğıdın aynı tarafına (+z) kalkar. Geçerli bir açınım böylece kutuyu kapatır.
 *  - analyze(): tamamen katlanınca her yüzün kutunun hangi yüzüne oturduğunu bulur; üst üste binen
 *    ya da yere oturmayan yüzleri ve boş kalan yerleri döndürür.
 */

export type FaceId = 'alt' | 'ust' | 'on' | 'arka' | 'sol' | 'sag'
export type Pair = 'ab' | 'ac' | 'bc'
export const FACES: FaceId[] = ['alt', 'ust', 'on', 'arka', 'sol', 'sag']
export const PAIR_OF: Record<FaceId, Pair> = { alt: 'ab', ust: 'ab', on: 'ac', arka: 'ac', sol: 'bc', sag: 'bc' }
export const PAIR_COLOR: Record<Pair, string> = { ab: '#60a5fa', ac: '#fbbf24', bc: '#f472b6' }
export const PAIR_NAME: Record<Pair, string> = { ab: 'Alt ve üst', ac: 'Ön ve arka', bc: 'Sağ ve sol' }
export const FACE_NAME: Record<FaceId, string> = { alt: 'Alt', ust: 'Üst', on: 'Ön', arka: 'Arka', sol: 'Sol', sag: 'Sağ' }

export interface FaceDef { id: FaceId; u: number; v: number; w: number; h: number; parent: FaceId | null }
export interface NetDef { id: string; name: string; faces: (a: number, b: number, c: number) => FaceDef[]; why?: string }

const F = (id: FaceId, u: number, v: number, w: number, h: number, parent: FaceId | null = null): FaceDef => ({ id, u, v, w, h, parent })

export const NETS: Record<string, NetDef> = {
  hac: {
    id: 'hac',
    name: 'Haç biçimli',
    faces: (a, b, c) => [F('alt', 0, 0, a, b), F('on', 0, -c, a, c, 'alt'), F('arka', 0, b, a, c, 'alt'), F('sol', -c, 0, c, b, 'alt'), F('sag', a, 0, c, b, 'alt'), F('ust', 0, b + c, a, b, 'arka')],
  },
  yanKapak: {
    id: 'yanKapak',
    name: 'Kapağı yanda',
    faces: (a, b, c) => [F('alt', 0, 0, a, b), F('on', 0, -c, a, c, 'alt'), F('arka', 0, b, a, c, 'alt'), F('sol', -c, 0, c, b, 'alt'), F('sag', a, 0, c, b, 'alt'), F('ust', a + c, 0, a, b, 'sag')],
  },
  serit: {
    id: 'serit',
    name: 'Dört duvar yan yana',
    faces: (a, b, c) => [F('alt', 0, 0, a, b), F('on', 0, -c, a, c, 'alt'), F('sol', -b, -c, b, c, 'on'), F('sag', a, -c, b, c, 'on'), F('arka', a + b, -c, a, c, 'sag'), F('ust', a + b, -c - b, a, b, 'arka')],
  },
  merdiven: {
    id: 'merdiven',
    name: 'Merdiven',
    faces: (a, b, c) => [F('alt', 0, 0, a, b), F('on', 0, -c, a, c, 'alt'), F('sag', a, 0, c, b, 'alt'), F('arka', a, b, c, a, 'sag'), F('sol', a, b + a, c, b, 'arka'), F('ust', a + c, 0, a, b, 'sag')],
  },
  uzun: {
    id: 'uzun',
    name: 'Uzun şerit',
    faces: (a, b, c) => [F('alt', 0, 0, a, b), F('on', 0, -c, a, c, 'alt'), F('ust', 0, -c - b, a, b, 'on'), F('arka', 0, -c - b - c, a, c, 'ust'), F('sol', -c, 0, c, b, 'alt'), F('sag', a, 0, c, b, 'alt')],
  },
  ayniTaraf: {
    id: 'ayniTaraf',
    name: 'İki kapak aynı tarafta',
    why: 'Üst yüz de alt yüzle aynı kenar hizasında: katlayınca o da yere kapanıp alt yüzün üstüne biner, kutunun üstü açık kalır.',
    faces: (a, b, c) => [F('alt', 0, 0, a, b), F('on', 0, -c, a, c, 'alt'), F('sol', -b, -c, b, c, 'on'), F('sag', a, -c, b, c, 'on'), F('arka', a + b, -c, a, c, 'sag'), F('ust', a + b, 0, a, b, 'arka')],
  },
  yanlisDuvar: {
    id: 'yanlisDuvar',
    name: 'Arka yüz yanlış yerde',
    why: 'Arka yüz ön yüzün yanına bağlanmış: katlayınca sol duvarın yerine gelip onunla üst üste biner, kutunun arkası açık kalır.',
    faces: (a, b, c) => [F('alt', 0, 0, a, b), F('on', 0, -c, a, c, 'alt'), F('sol', -c, 0, c, b, 'alt'), F('sag', a, 0, c, b, 'alt'), F('arka', -a, -c, a, c, 'on'), F('ust', a + c, 0, a, b, 'sag')],
  },
  uzunDuvar: {
    id: 'uzunDuvar',
    name: 'Bir duvar fazla uzun',
    why: 'Sağ yüzün bir kenarı diğer duvarlardan 1 birim uzun: katlayınca kutunun üstünden taşar, kapak yerine oturmaz.',
    faces: (a, b, c) => [F('alt', 0, 0, a, b), F('on', 0, -c, a, c, 'alt'), F('arka', 0, b, a, c, 'alt'), F('sol', -c, 0, c, b, 'alt'), F('sag', a, 0, c + 1, b, 'alt'), F('ust', 0, b + c, a, b, 'arka')],
  },
}

/* ───────────── menteşe ağacı ───────────── */

const near = (x: number, y: number) => Math.abs(x - y) < 1e-6
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0) > 1e-6

export interface NetNode {
  f: FaceDef
  /** menteşe üzerindeki bir nokta (kökte 0,0) */
  o: [number, number]
  axis: 'x' | 'y' | null
  dir: 1 | -1
  depth: number
  kids: NetNode[]
}

function hinge(f: FaceDef, p: FaceDef): Pick<NetNode, 'o' | 'axis' | 'dir'> {
  if (overlap(f.u, f.u + f.w, p.u, p.u + p.w)) {
    if (near(f.v, p.v + p.h)) return { o: [f.u, f.v], axis: 'x', dir: 1 }
    if (near(f.v + f.h, p.v)) return { o: [f.u, p.v], axis: 'x', dir: -1 }
  }
  if (overlap(f.v, f.v + f.h, p.v, p.v + p.h)) {
    if (near(f.u, p.u + p.w)) return { o: [f.u, f.v], axis: 'y', dir: -1 }
    if (near(f.u + f.w, p.u)) return { o: [p.u, f.v], axis: 'y', dir: 1 }
  }
  throw new Error(`${f.id} yüzü ${p.id} yüzüne bir kenarla bağlı değil`)
}

export function tree(faces: FaceDef[]): NetNode {
  const byId = new Map(faces.map((f) => [f.id, f]))
  const make = (f: FaceDef, depth: number): NetNode => {
    const h = f.parent ? hinge(f, byId.get(f.parent)!) : { o: [0, 0] as [number, number], axis: null, dir: 1 as const }
    return { f, ...h, depth, kids: faces.filter((k) => k.parent === f.id).map((k) => make(k, depth + 1)) }
  }
  return make(faces.find((f) => !f.parent)!, 0)
}
export const maxDepth = (n: NetNode): number => Math.max(n.depth, ...n.kids.map(maxDepth))

/** Kademeli katlama: önce alt yüze bağlı duvarlar, sonra onlara bağlı yüzler kalkar */
export function angleAt(t: number, depth: number, K: number) {
  if (depth === 0) return 0
  if (K <= 1) return (Math.PI / 2) * t
  const L = 0.6
  const start = ((depth - 1) * (1 - L)) / (K - 1)
  const k = Math.min(1, Math.max(0, (t - start) / L))
  return (Math.PI / 2) * k
}

/**
 * Ağacı Object3D hiyerarşisine çevirir. Her düğüm grubunun orijini menteşesindedir.
 * mesh(f, node) her yüz için çağrılır; dönen nesne yüzün merkezine yerleştirilir (yüz yerel z = 0 düzleminde).
 */
export function buildHierarchy(root: NetNode, mesh?: (f: FaceDef) => THREE.Object3D | null) {
  const groups = new Map<FaceId, { g: THREE.Group; n: NetNode }>()
  const make = (n: NetNode, parent: NetNode | null): THREE.Group => {
    const g = new THREE.Group()
    if (parent) g.position.set(n.o[0] - parent.o[0], n.o[1] - parent.o[1], 0)
    const m = mesh?.(n.f)
    if (m) {
      m.position.set(n.f.u + n.f.w / 2 - n.o[0], n.f.v + n.f.h / 2 - n.o[1], 0)
      g.add(m)
    }
    groups.set(n.f.id, { g, n })
    n.kids.forEach((k) => g.add(make(k, n)))
    return g
  }
  const top = make(root, null)
  return { top, groups }
}

export function setFold(groups: Map<FaceId, { g: THREE.Group; n: NetNode }>, t: number, K: number) {
  for (const { g, n } of groups.values()) {
    if (!n.axis) continue
    const ang = n.dir * angleAt(t, n.depth, K)
    g.rotation.set(n.axis === 'x' ? ang : 0, n.axis === 'y' ? ang : 0, 0)
  }
}

/* ───────────── kutu yüzleri ───────────── */

export interface Slot { id: FaceId; c: THREE.Vector3; dims: [number, number]; normal: 'x' | 'y' | 'z' }
export function slots(a: number, b: number, c: number): Slot[] {
  return [
    { id: 'alt', c: new THREE.Vector3(a / 2, b / 2, 0), dims: [a, b], normal: 'z' },
    { id: 'ust', c: new THREE.Vector3(a / 2, b / 2, c), dims: [a, b], normal: 'z' },
    { id: 'on', c: new THREE.Vector3(a / 2, 0, c / 2), dims: [a, c], normal: 'y' },
    { id: 'arka', c: new THREE.Vector3(a / 2, b, c / 2), dims: [a, c], normal: 'y' },
    { id: 'sol', c: new THREE.Vector3(0, b / 2, c / 2), dims: [b, c], normal: 'x' },
    { id: 'sag', c: new THREE.Vector3(a, b / 2, c / 2), dims: [b, c], normal: 'x' },
  ]
}

export interface Analysis { ok: boolean; bad: FaceId[]; holes: FaceId[]; where: Partial<Record<FaceId, FaceId>> }

/** Tamamen katlanınca: hangi yüz kutunun hangi yüzüne oturdu, hangileri taştı ya da üst üste bindi, nereler boş kaldı */
export function analyze(faces: FaceDef[], a: number, b: number, c: number): Analysis {
  const root = tree(faces)
  const { top, groups } = buildHierarchy(root)
  setFold(groups, 1, maxDepth(root))
  top.updateMatrixWorld(true)
  const S = slots(a, b, c)
  const where: Partial<Record<FaceId, FaceId>> = {}
  const taken = new Map<FaceId, FaceId[]>()
  for (const { g, n } of groups.values()) {
    const f = n.f
    const center = g.localToWorld(new THREE.Vector3(f.u + f.w / 2 - n.o[0], f.v + f.h / 2 - n.o[1], 0))
    const s = S.find((x) => x.c.distanceTo(center) < 1e-3)
    const fits = s && ((near(s.dims[0], f.w) && near(s.dims[1], f.h)) || (near(s.dims[0], f.h) && near(s.dims[1], f.w)))
    if (s && fits) {
      where[f.id] = s.id
      taken.set(s.id, [...(taken.get(s.id) ?? []), f.id])
    }
  }
  const bad = faces.map((f) => f.id).filter((id) => !where[id] || (taken.get(where[id]!)?.length ?? 0) > 1 && taken.get(where[id]!)![0] !== id)
  const holes = S.map((s) => s.id).filter((id) => !taken.has(id))
  return { ok: !bad.length && !holes.length, bad, holes, where }
}

/** Açınımın kâğıttaki sınırları */
export function bounds(faces: FaceDef[]) {
  const u0 = Math.min(...faces.map((f) => f.u))
  const u1 = Math.max(...faces.map((f) => f.u + f.w))
  const v0 = Math.min(...faces.map((f) => f.v))
  const v1 = Math.max(...faces.map((f) => f.v + f.h))
  return { u0, u1, v0, v1, w: u1 - u0, h: v1 - v0 }
}

export const surfaceArea = (a: number, b: number, c: number) => 2 * (a * b + a * c + b * c)
