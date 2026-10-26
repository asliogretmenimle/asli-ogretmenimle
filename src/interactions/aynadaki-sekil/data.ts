import type { Grade } from '../../data/types'
import type { Pt } from '../sekil-insa-et/ortak'

/** Ayna doğrusu (ekran koordinatı, y aşağı): v: x=c, h: y=c, d: y=x+c (╲), a: y=−x+c (╱) */
export type Orient = 'v' | 'h' | 'd' | 'a'
export type Mirror = { o: Orient; c: number }

export const reflectPt = ([x, y]: Pt, m: Mirror): Pt => (m.o === 'v' ? [2 * m.c - x, y] : m.o === 'h' ? [x, 2 * m.c - y] : m.o === 'd' ? [y - m.c, x + m.c] : [m.c - y, m.c - x])

/** Kare (x,y) → yansıyan kare (merkezini yansıt) */
export const reflectCell = ([x, y]: Pt, m: Mirror): Pt => {
  const [a, b] = reflectPt([x + 0.5, y + 0.5], m)
  return [Math.round(a - 0.5), Math.round(b - 0.5)]
}

export const ORIENT_LABEL: Record<Orient, string> = { v: 'Dikey', h: 'Yatay', d: 'Çapraz ╲', a: 'Çapraz ╱' }

const grid = (rows: string[]): Pt[] => rows.flatMap((r, y) => [...r].map((ch, x) => (ch === '#' ? ([x, y] as Pt) : null)).filter((p): p is Pt => !!p))

/** 7×7 figürler (merkez 3,5): simetri doğruları v: x=3,5; h: y=3,5; d: y=x; a: y=−x+7 */
export const FIGS: Record<string, { name: string; emoji: string; cells: Pt[] }> = {
  A: { name: 'A harfi', emoji: '🔤', cells: grid(['...#...', '..#.#..', '.#...#.', '.#####.', '.#...#.', '.#...#.', '.#...#.']) },
  H: { name: 'H harfi', emoji: '🔤', cells: grid(['.#...#.', '.#...#.', '.#...#.', '.#####.', '.#...#.', '.#...#.', '.#...#.']) },
  E: { name: 'E harfi', emoji: '🔤', cells: grid(['.#####.', '.#.....', '.#.....', '.####..', '.#.....', '.#.....', '.#####.']) },
  S: { name: 'S harfi', emoji: '🔤', cells: grid(['.#####.', '.#.....', '.#.....', '.#####.', '.....#.', '.....#.', '.#####.']) },
  X: { name: 'X harfi', emoji: '🔤', cells: grid(['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#']) },
  arti: { name: 'Artı logosu', emoji: '➕', cells: grid(['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...']) },
  kalp: { name: 'Kalp logosu', emoji: '❤️', cells: grid(['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...', '.......']) },
  kose: { name: 'Köşe logosu', emoji: '📐', cells: grid(['####...', '##.....', '#.#....', '#..#...', '....#..', '.....#.', '......#']) },
  cerceve: { name: 'Çerçeve logosu', emoji: '🖼️', cells: grid(['#######', '#.....#', '#.###.#', '#.#.#.#', '#.###.#', '#.....#', '#######']) },
}
export const FIG_LINES: Record<Orient, Mirror> = { v: { o: 'v', c: 3.5 }, h: { o: 'h', c: 3.5 }, d: { o: 'd', c: 0 }, a: { o: 'a', c: 7 } }

export type CompleteTask = { kind: 'complete'; cols: number; rows: number; mirror: Mirror; given: Pt[]; emoji: string; text: string }
export type LinesTask = { kind: 'lines'; fig: string; orients: Orient[]; text: string }
export type ReflectTask = { kind: 'reflect'; cols: number; rows: number; mirror: Mirror; pts: Pt[]; text: string; bisector?: boolean }
export type FindTask = { kind: 'find'; cols: number; rows: number; mirror: Mirror; pts: Pt[]; start: Mirror; orients: Orient[]; text: string }
export type Task = CompleteTask | LinesTask | ReflectTask | FindTask

const half = (rows: string[], side: 'left' | 'top'): Pt[] => {
  const all = grid(rows)
  if (side === 'left') return all.filter(([x]) => x < rows[0].length / 2)
  return all.filter(([, y]) => y < rows.length / 2)
}

const TREE = ['...##...', '..####..', '.######.', '########', '..####..', '...##...', '...##...']
const BUTTERFLY = ['##....##', '###..###', '.######.', '..####..', '.######.', '###..###', '.#....#.']
const GAP = ['#......#', '##....##', '.#....#.', '.##..##.', '..#..#..', '.##..##.', '##....##']
// yatay ayna: üst yarı verilir
const ROCKET = ['..##..', '.####.', '.#..#.', '######', '######', '.#..#.', '.####.', '..##..']

export function tasksFor(grade: Grade): Task[] {
  const tree: CompleteTask = { kind: 'complete', cols: 8, rows: 7, mirror: { o: 'v', c: 4 }, given: half(TREE, 'left'), emoji: '🌳', text: 'Ağacın yarısı aynada. Aynanın öbür yanını boyayarak ağacı **tamamla**.' }
  const butterfly: CompleteTask = { kind: 'complete', cols: 8, rows: 7, mirror: { o: 'v', c: 4 }, given: half(BUTTERFLY, 'left'), emoji: '🦋', text: 'Kelebeğin bir kanadı hazır. Aynanın öbür yanına **öbür kanadı** boya.' }
  const gap: CompleteTask = { kind: 'complete', cols: 8, rows: 7, mirror: { o: 'v', c: 4 }, given: half(GAP, 'left'), emoji: '🪞', text: 'Bu desen aynaya değmiyor! Aynanın öbür yanındaki **görüntüsünü** boya.' }
  const rocket: CompleteTask = { kind: 'complete', cols: 6, rows: 8, mirror: { o: 'h', c: 4 }, given: half(ROCKET, 'top'), emoji: '🚀', text: 'Bu kez ayna **yatay**! Suya yansıyan roketin görüntüsünü boya.' }
  const L = (fig: string, orients: Orient[], text?: string): LinesTask => ({ kind: 'lines', fig, orients, text: text ?? `${FIGS[fig].name}: önce **tahmin et**, hangi doğrular boyunca katlarsan iki yarı tam üst üste gelir? Doğruları seç, sonra aynayla test et.` })
  const r = (mirror: Mirror, pts: Pt[], text: string, cols = 10, rows = 8, bisector?: boolean): ReflectTask => ({ kind: 'reflect', cols, rows, mirror, pts, text, bisector })
  const f = (mirror: Mirror, pts: Pt[], start: Mirror, orients: Orient[], cols = 10, rows = 8): FindTask => ({ kind: 'find', cols, rows, mirror, pts, start, orients, text: 'Turuncu şekil ile mavi görüntüsü arasında bir ayna var. **Aynayı** sürükleyip döndürerek doğru yere koy.' })

  const rv1 = r({ o: 'v', c: 5 }, [[2, 1], [4, 3], [1, 5]], 'Üçgenin aynadaki görüntüsünü **tahmin et**: A′, B′ ve C′ noktalarını çivilere koy, sonra aynayı aç.')
  const rh1 = r({ o: 'h', c: 4 }, [[2, 1], [6, 1], [3, 3]], 'Ayna yatay. Görüntünün köşelerini (A′, B′, C′) **tahmin et** ve yerleştir.')
  const rv2 = r({ o: 'v', c: 5 }, [[0, 1], [2, 1], [3, 4], [1, 6]], 'Bu dörtgen aynadan uzakta. Görüntüsü nerede olur? Köşeleri **tahmin et**.')
  const rh2 = r({ o: 'h', c: 4 }, [[1, 1], [4, 2], [7, 0]], 'Her köşenin aynaya uzaklığını düşün ve görüntünün köşelerini yerleştir.')
  const rd1 = r({ o: 'd', c: 0 }, [[3, 0], [6, 1], [5, 3]], 'Ayna bu kez **çapraz**! Görüntünün köşelerini tahmin et ve yerleştir.', 8, 8)
  const ra1 = r({ o: 'a', c: 8 }, [[1, 1], [4, 1], [1, 3]], 'Ayna öbür çaprazda. Köşeleri tahmin et ve yerleştir.', 8, 8)
  const ra2 = r({ o: 'a', c: 8 }, [[2, 3], [5, 2], [4, 5]], 'Bu üçgen aynanın **üstünden geçiyor**! Görüntüsünü tahmin et.', 8, 8)
  const rd7 = r({ o: 'd', c: 1 }, [[4, 1], [7, 2], [5, 4]], 'Çapraz aynada görüntüyü tahmin et. Sonra her noktayla görüntüsünü birleştiren çizgiyi incele.', 8, 8, true)

  const fv = f({ o: 'v', c: 5 }, [[1, 2], [3, 1], [2, 5]], { o: 'v', c: 2 }, ['v', 'h'])
  const fh = f({ o: 'h', c: 4 }, [[2, 1], [5, 0], [6, 2]], { o: 'v', c: 5 }, ['v', 'h'])
  const fd = f({ o: 'd', c: 0 }, [[2, 0], [5, 1], [4, 3]], { o: 'v', c: 6 }, ['v', 'h', 'd', 'a'], 8, 8)
  const fa = f({ o: 'a', c: 8 }, [[0, 1], [3, 0], [2, 3]], { o: 'h', c: 2 }, ['v', 'h', 'd', 'a'], 8, 8)

  if (grade === 2) return [tree, L('A', ['v', 'h']), butterfly, L('H', ['v', 'h']), L('arti', ['v', 'h'])]
  if (grade === 3) return [tree, rocket, L('H', ['v', 'h', 'd', 'a']), L('arti', ['v', 'h', 'd', 'a']), L('E', ['v', 'h', 'd', 'a'])]
  if (grade === 4) return [gap, rv1, rh1, L('kose', ['v', 'h', 'd', 'a']), rv2]
  if (grade === 5) return [rv1, rh2, fv, fh, L('S', ['v', 'h', 'd', 'a'])]
  if (grade === 6) return [rv2, rd1, fd, L('X', ['v', 'h', 'd', 'a']), ra1]
  return [rd7, ra2, fa, fd, L('cerceve', ['v', 'h', 'd', 'a'])]
}
