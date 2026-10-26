import type { ManipulativeTool } from '../../../data/types'
import { bounceAngles, dist, fmtN, slopeFrac, type Block, type Mirror, type Pt, type Seg, type Target, type Trace } from './optics'

/**
 * Lazer Laboratuvarı görevleri. Geometri `optics.solve` ile doğrulandı (çözüm sayıları ve en az ayna sayısı).
 * 6. sınıf: açı ölçme, doğru açı, ters/bütünler açılar, paralel aynalar (iç ters açılar), üçgende açılar.
 * 7. sınıf: yansıma dönüşümü (görüntüye nişan al), açıortay olarak normal, koordinatlarda yansıma, üçgende açılar.
 * 8. sınıf: ışın doğrusunun eğimi ve denklemi, yansımada eğimin değişimi, öteleme ve paralel doğrular, Pisagor, karekök tahmini.
 */

export interface NudgeMsg {
  q: string
  mis?: string
  tool?: ManipulativeTool
}

export interface Ctx {
  traces: Trace[]
  mirrors: Mirror[]
}

type Txt = string | ((c: Ctx) => string)
type Num = number | ((c: Ctx) => number)

/** Açı işareti: b = sekme sırası; k = hangi açı */
export interface Mark {
  e?: number
  b: number
  k: 'in' | 'out' | 'between' | 'normal' | 'dev' | 'outWide'
  hide?: boolean
}

export type Step =
  | { kind: 'predict'; text: Txt; tol?: number; hints?: string[] }
  | { kind: 'build'; text: Txt; inventory: number; goal: number; best?: number; ok: Txt; hints?: string[]; miss?: NudgeMsg; reveal?: string[] }
  | { kind: 'measure'; text: Txt; b: number; ray: 'in' | 'out'; ok?: Txt; hints?: string[] }
  | { kind: 'number'; text: Txt; answer: Num; unit?: string; start: Num; steps: number[]; min: number; max: number; tol?: number; marks?: Mark[]; nudge: (v: number, ans: number, c: Ctx) => NudgeMsg; ok: Txt; hints?: string[]; skip?: (c: Ctx) => boolean }
  | { kind: 'point'; text: Txt; answer: Pt; label: string; nudge: (p: Pt) => NudgeMsg; ok: Txt; hints?: string[]; reveal?: string[] }
  | { kind: 'slope'; text: Txt; answer: Num; nudge: (r: number, run: number, ans: number) => NudgeMsg; ok: Txt; hints?: string[]; skip?: (c: Ctx) => boolean }
  | { kind: 'strategy'; text: string; options: string[] }

export interface EmitterDef {
  x: number
  y: number
  dir: Pt
  aim: 'fixed' | 'rotate' | 'lattice'
  label?: string
}

export interface Mission {
  id: string
  title: string
  story: string
  room: { w: number; h: number }
  /** görünür alan (ayna dünyası için genişletilebilir) */
  view?: { xMin: number; xMax: number; yMin: number; yMax: number }
  /** odanın dışında gösterilen “ayna dünyası” */
  ghost?: { x0: number; y0: number; x1: number; y1: number }
  walls: Seg[]
  blocks: Block[]
  targets: (Target & { hidden?: boolean })[]
  fixed: Mirror[]
  emitters: EmitterDef[]
  angleStep: number
  show: { angles?: boolean; normal?: boolean; coords?: boolean; slope?: boolean; legs?: boolean; axes?: boolean }
  /** köşe açısı süsü */
  corners?: { at: Pt; a1: number; a2: number; label: string }[]
  /** ilk iki sekme noktası ve bu köşe bir üçgen oluşturur */
  tri?: Pt
  steps: Step[]
}

const seg = (x1: number, y1: number, x2: number, y2: number): Seg => ({ a: { x: x1, y: y1 }, b: { x: x2, y: y2 } })
const D = (a: number): Pt => ({ x: Math.cos((a * Math.PI) / 180), y: Math.sin((a * Math.PI) / 180) })

/* ───────────── bağlam yardımcıları ───────────── */
export const angAt = (c: Ctx, b: number, e = 0) => {
  const bb = c.traces[e]?.bounces[b]
  return bb ? bounceAngles(bb) : { mirror: 0, normal: 0, between: 0 }
}
const r0 = (v: number) => Math.round(v)
const bouncePt = (c: Ctx, b: number, e = 0) => c.traces[e]?.bounces[b]?.p ?? { x: 0, y: 0 }
const segOf = (c: Ctx, i: number, e = 0) => {
  const pts = c.traces[e]?.pts ?? []
  const a = pts[i] ?? { x: 0, y: 0 }, b = pts[i + 1] ?? a
  return { a, b, dx: b.x - a.x, dy: b.y - a.y, len: dist(a, b) }
}

const ANGLE_TOOL: ManipulativeTool = 'angle'

/* ───────────────────────────── 6. SINIF ───────────────────────────── */
const G6: Mission[] = [
  {
    id: 'g6-ayna-acisi',
    title: 'Aynadaki açılar',
    story: 'Laboratuvarın zemininde uzun bir ayna var. Lazer ışını aynaya eğik çarpınca ne olur? Önce tahmin et, sonra ölç.',
    room: { w: 12, h: 8 },
    walls: [seg(2, 1, 11, 1)],
    blocks: [],
    targets: [],
    fixed: [],
    emitters: [{ x: 1, y: 6, dir: D(-30), aim: 'fixed' }],
    angleStep: 15,
    show: { angles: true },
    steps: [
      { kind: 'predict', text: 'Işın aynadan sekip duvara çarpacak. Nereye çarpar? Tahminin olan noktaya dokun, sonra Ateşle!', tol: 1.3, hints: ['Işın aynaya hangi eğimle iniyorsa, aynadan nasıl kalkar? Elinle havada göster.'] },
      { kind: 'measure', b: 0, ray: 'in', text: 'Açıölçerin kolunu sürükle: gelen ışınla ayna arasındaki açıyı ölç.', hints: ['Açıölçerin merkezi ışının aynaya çarptığı noktada. Kolu gelen ışının üstüne getir.'] },
      { kind: 'measure', b: 0, ray: 'out', text: 'Şimdi yansıyan ışınla ayna arasındaki açıyı ölç.', ok: 'İki açı eşit! Işın aynaya hangi açıyla gelirse aynı açıyla yansır.' },
      {
        kind: 'number',
        text: (c) => `Aynanın üstünde yan yana üç açı var: ${r0(angAt(c, 0).mirror)}°, ? ve ${r0(angAt(c, 0).mirror)}°. Gelen ve yansıyan ışın arasındaki açı kaç derece?`,
        answer: (c) => r0(angAt(c, 0).between),
        unit: '°',
        start: 90,
        steps: [1, 10],
        min: 0,
        max: 180,
        marks: [{ b: 0, k: 'in' }, { b: 0, k: 'out' }, { b: 0, k: 'between', hide: true }],
        nudge: (v, ans) =>
          v === 180 - ans
            ? { q: 'Bu, iki küçük açının toplamı. Ayna boyunca yan yana duran üç açı birlikte bir doğru açı oluşturur: doğru açı kaç derece?', mis: 'Doğru açının 180° olduğunu kullanmadı', tool: ANGLE_TOOL }
            : v === (180 - ans) / 2
              ? { q: 'Bu, ışınla ayna arasındaki açı. Sorulan, iki ışının arasındaki açı. Üç açı yan yana bir doğru açı oluşturuyor.', tool: ANGLE_TOOL }
              : { q: 'Ayna düz bir doğru. Üzerinde yan yana duran açıların toplamı kaç derece olmalı?', tool: ANGLE_TOOL },
        ok: (c) => `${r0(angAt(c, 0).mirror)}° + ${r0(angAt(c, 0).between)}° + ${r0(angAt(c, 0).mirror)}° = 180°: ayna üzerindeki açılar bir doğru açı oluşturur.`,
        hints: ['Bir doğru üzerindeki açıların toplamı kaç derecedir?', '180° − 30° − 30° = ?'],
      },
    ],
  },
  {
    id: 'g6-tek-ayna',
    title: 'Tek aynayla hedef',
    story: 'Kristal, ışının yolunun dışında. Bir ayna koyup ışını kristale yönlendir. Farklı yerlere ve açılara koyarak birden fazla yol bulabilirsin!',
    room: { w: 12, h: 8 },
    walls: [],
    blocks: [],
    targets: [{ id: 'K', x: 8, y: 6 }],
    fixed: [],
    emitters: [{ x: 1, y: 2, dir: D(0), aim: 'fixed' }],
    angleStep: 15,
    show: { angles: true },
    steps: [
      { kind: 'build', inventory: 1, goal: 3, best: 1, text: 'Izgarada bir noktaya dokunarak ayna koy. Aynayı iki parmakla ya da düğmelerle döndür, sonra Ateşle!', ok: 'Kristal yandı! Aynadaki iki açıya bak: eşit mi?', hints: ['Işın sağa gidiyor. Aynayı ışının yolu üzerine koymalısın.', 'Aynayı 45° çevirirsen ışın kaç derece döner? Peki 30° ya da 60° çevirirsen?'] },
      {
        kind: 'number',
        text: (c) => `Senin aynanda ışın aynayla ${r0(angAt(c, 0).mirror)}° yapıyor. Işın düz gitseydi kesikli çizgide ilerlerdi. Yansıyan ışın bu kesikli çizgiyle kaç derece yapıyor?`,
        answer: (c) => 2 * r0(angAt(c, 0).mirror),
        unit: '°',
        start: 0,
        steps: [1, 10],
        min: 0,
        max: 180,
        marks: [{ b: 0, k: 'in' }, { b: 0, k: 'out' }, { b: 0, k: 'dev', hide: true }],
        nudge: (v, ans) =>
          v === ans / 2
            ? { q: 'Kesikli çizgiyle ayna arasındaki açı da bu kadar (ters açılar eşit!). Kesikli çizgiden yansıyan ışına giderken kaç açı geçiyorsun?', mis: 'Ters açıları ve açıların toplanmasını birleştiremedi', tool: ANGLE_TOOL }
            : v === 180 - ans
              ? { q: 'Bu, iki ışın arasındaki açı. Sorulan, kesikli devam çizgisi ile yansıyan ışın arası.', tool: ANGLE_TOOL }
              : { q: 'Kesikli çizgi gelen ışının devamı. Aynayla yaptığı açı, gelen ışının açısının ters açısı. İki açıyı topla.', tool: ANGLE_TOOL },
        ok: (c) => `Işın ${2 * r0(angAt(c, 0).mirror)}° döndü: ters açı + yansıma açısı = ${r0(angAt(c, 0).mirror)}° + ${r0(angAt(c, 0).mirror)}°.`,
        hints: ['Ters açılar eşittir.', 'Kesikli çizgi ile ayna arası + ayna ile yansıyan ışın arası = ?'],
      },
      { kind: 'strategy', text: 'Kristale giden yolu nasıl buldun?', options: ['Önce açıyı tahmin ettim', 'Aynayı döndürerek denedim', 'Kristalden geriye doğru düşündüm', 'Işının dönme açısını hesapladım'] },
    ],
  },
  {
    id: 'g6-paralel',
    title: 'Paralel aynalar',
    story: 'Bir koridorun tavanı ve tabanı birbirine paralel iki ayna. Işın aralarında zikzak çizerek ilerliyor. Açılar nasıl değişiyor?',
    room: { w: 12, h: 8 },
    walls: [seg(0, 1, 12, 1), seg(0, 7, 12, 7)],
    blocks: [],
    targets: [{ id: 'K', x: 11.6, y: 5, hidden: true }],
    fixed: [],
    emitters: [{ x: 1, y: 4, dir: D(60), aim: 'rotate' }],
    angleStep: 15,
    show: { angles: true },
    steps: [
      { kind: 'predict', text: 'Işın iki paralel ayna arasında sekecek. Sağ duvarda nereye varır? Tahmin et, sonra ateşle.', tol: 1.3, hints: ['Her sekmede ışın aynı eğimle mi ilerliyor?'] },
      { kind: 'measure', b: 0, ray: 'out', text: 'Üst ayna: ışın aynadan ayrılırken aynayla kaç derece yapıyor? Ölç.' },
      { kind: 'measure', b: 1, ray: 'in', text: 'Alt ayna: aynı ışın alt aynaya kaç derecelik açıyla çarpıyor? Ölç.', ok: 'Eşit! Paralel iki doğruyu bir kesen kestiğinde iç ters açılar eşittir. Z harfini görüyor musun?' },
      {
        kind: 'number',
        text: (c) => `Üst aynada ışınla ayna arasındaki dar açı ${r0(angAt(c, 0).mirror)}°. Aynı noktadaki geniş açı (?) kaç derece?`,
        answer: (c) => 180 - r0(angAt(c, 0).mirror),
        unit: '°',
        start: 90,
        steps: [1, 10],
        min: 0,
        max: 180,
        marks: [{ b: 0, k: 'out' }, { b: 0, k: 'outWide', hide: true }],
        nudge: (v, ans) =>
          v === 180 - ans
            ? { q: 'Bu dar açının kendisi. Geniş açı ile dar açı yan yana durup aynayı (bir doğruyu) tamamlıyor: toplamları kaç?', mis: 'Bütünler açıları fark etmedi', tool: ANGLE_TOOL }
            : { q: 'Ayna bir doğru. Aynı noktada yan yana duran iki açının toplamı kaç derece olmalı?', tool: ANGLE_TOOL },
        ok: (c) => `${r0(angAt(c, 0).mirror)}° + ${180 - r0(angAt(c, 0).mirror)}° = 180°: bütünler açılar.`,
      },
      { kind: 'build', inventory: 0, goal: 3, reveal: ['K'], text: 'Sağ duvarda bir kristal belirdi! Yayıcıyı döndürerek ışını kristale ulaştır. Birden fazla açı işe yarar!', ok: 'Kristal yandı! Başka bir açı da işe yarar mı?', hints: ['Yayıcıyı seç ve döndürme düğmelerini kullan ya da iki parmakla çevir.', 'Işını aşağı doğru da gönderebilirsin.'], miss: { q: 'Işın kristalin üstünden mi altından mı geçti? Açıyı büyütünce sekme sayısı nasıl değişiyor?', tool: ANGLE_TOOL } },
    ],
  },
  {
    id: 'g6-kose',
    title: 'Köşe aynası',
    story: 'İki ayna birbirine dik duruyor. Işın iki kez sekecek. Işın ve aynalar bir üçgen oluşturacak!',
    room: { w: 12, h: 8 },
    walls: [seg(6, 1, 11, 1), seg(11, 1, 11, 6)],
    blocks: [],
    targets: [],
    fixed: [],
    emitters: [{ x: 1, y: 6, dir: D(-30), aim: 'fixed' }],
    angleStep: 15,
    show: { angles: true },
    corners: [{ at: { x: 11, y: 1 }, a1: 90, a2: 180, label: '90°' }],
    tri: { x: 11, y: 1 },
    steps: [
      { kind: 'predict', text: 'Işın iki aynaya çarpacak. Sonunda nereye varır? Tahmin et, sonra ateşle.', tol: 1.5 },
      {
        kind: 'number',
        text: (c) => `Sarı üçgenin köşedeki açısı 90°, ilk aynadaki açısı ${r0(angAt(c, 0).mirror)}°. İkinci aynadaki açısı (?) kaç derece?`,
        answer: (c) => 90 - r0(angAt(c, 0).mirror),
        unit: '°',
        start: 0,
        steps: [1, 10],
        min: 0,
        max: 180,
        marks: [{ b: 0, k: 'out' }, { b: 1, k: 'in', hide: true }],
        nudge: () => ({ q: 'Bir üçgenin iç açılarının toplamı kaç derece? Bildiğin iki açıyı topla, kalanı bul.', mis: 'Üçgenin iç açıları toplamını kullanmadı', tool: 'dinamikucgen' }),
        ok: (c) => `90° + ${r0(angAt(c, 0).mirror)}° + ${90 - r0(angAt(c, 0).mirror)}° = 180°: üçgenin iç açıları.`,
        hints: ['Üçgenin iç açıları toplamı 180°.'],
      },
      {
        kind: 'number',
        text: 'Işın ikinci aynadan kaç derecelik açıyla ayrılır? (Yansıyan ışınla ayna arasındaki açı)',
        answer: (c) => r0(angAt(c, 1).mirror),
        unit: '°',
        start: 0,
        steps: [1, 10],
        min: 0,
        max: 180,
        marks: [{ b: 1, k: 'in' }, { b: 1, k: 'out', hide: true }],
        nudge: () => ({ q: 'İlk görevde gelen ve yansıyan ışının aynayla yaptığı açılar hakkında ne keşfetmiştin?', tool: ANGLE_TOOL }),
        ok: 'Yine eşit! Bu yüzden ışın geldiği yöne paralel olarak geri döner. Bisikletlerin arkasındaki reflektörler böyle çalışır.',
      },
      { kind: 'strategy', text: 'Üçgendeki açıyı nasıl buldun?', options: ['Üçgenin açıları toplamı 180°', 'Açıölçerle ölçmeyi düşündüm', 'Yansıma açılarının eşitliği', 'Tahmin edip kontrol ettim'] },
    ],
  },
  {
    id: 'g6-duvar',
    title: 'Duvarın arkası',
    story: 'Kristal yüksek bir duvarın arkasında. Işın duvarı delip geçemez; onu aynalarla duvarın üstünden aşırmalısın.',
    room: { w: 12, h: 8 },
    walls: [],
    blocks: [{ x0: 5, y0: 0, x1: 6, y1: 4 }],
    targets: [{ id: 'K', x: 9, y: 3 }],
    fixed: [],
    emitters: [{ x: 1, y: 1, dir: D(0), aim: 'fixed' }],
    angleStep: 15,
    show: { angles: true },
    steps: [
      { kind: 'build', inventory: 2, goal: 3, best: 2, text: 'İki aynayla ışını duvarın üstünden kristale ulaştır. Farklı yollar bulabilir misin?', ok: 'Kristal yandı! Aynalardaki açı çiftlerine bak.', hints: ['Önce ışını yukarı gönder: hangi açı ışını 90° döndürür?', 'Kristalden geriye doğru düşün: kristale hangi yönden ışın gelebilir?'] },
      { kind: 'strategy', text: 'Bu yolu nasıl planladın?', options: ['Önce ışını yukarı gönderdim', 'Kristalden geriye doğru düşündüm', 'Açıları hesapladım', 'Deneyerek buldum'] },
    ],
  },
  {
    id: 'g6-en-az',
    title: 'En az ayna',
    story: 'Laboratuvarda ayna pahalı! Işını rafın altındaki kristale ulaştır. İki aynayla kolay… Ya tek aynayla?',
    room: { w: 12, h: 8 },
    walls: [],
    blocks: [{ x0: 2, y0: 3, x1: 9, y1: 4 }],
    targets: [{ id: 'K', x: 11, y: 2 }],
    fixed: [],
    emitters: [{ x: 1, y: 7, dir: D(0), aim: 'fixed' }],
    angleStep: 15,
    show: { angles: true },
    steps: [
      { kind: 'build', inventory: 2, goal: 2, best: 1, text: 'Kristali yak. Sonra daha az aynayla yapmayı dene!', ok: 'Kristal yandı!', hints: ['Tek aynayla: ışın aynadan eğik çıkabilir. 60° ya da 75° dönüş dene.', 'Aynayı 150° ya da 135° çevirince ışın hangi yöne gider?'] },
      { kind: 'strategy', text: 'En az aynalı yolu nasıl düşündün?', options: ['Eğik açılar denedim', 'Kristalden geriye düşündüm', 'Önce iki aynayla yapıp sadeleştirdim', 'Açıyı hesapladım'] },
    ],
  },
]

/* ───────────────────────────── 7. SINIF ───────────────────────────── */
const G7: Mission[] = [
  {
    id: 'g7-goruntu',
    title: 'Aynadaki kristal',
    story: 'Sağ duvar boydan boya bir ayna (x = 7 doğrusu). Rafın arkasındaki kristale doğrudan nişan alamazsın. Aynanın içinde bir “ayna dünyası” var…',
    room: { w: 7, h: 8 },
    view: { xMin: -0.6, xMax: 14.6, yMin: -0.6, yMax: 8.6 },
    ghost: { x0: 7, y0: 0, x1: 14, y1: 8 },
    walls: [seg(7, 0, 7, 8)],
    blocks: [{ x0: 1.5, y0: 3, x1: 4.5, y1: 4 }],
    targets: [{ id: 'T', x: 3, y: 6, label: 'T' }],
    fixed: [],
    emitters: [{ x: 1, y: 1, dir: { x: 3, y: 1 }, aim: 'lattice' }],
    angleStep: 15,
    show: { normal: true, coords: true, axes: true },
    steps: [
      {
        kind: 'point',
        label: 'T′',
        text: 'Kristal T(3, 6). Ayna x = 7 doğrusu. Kristalin aynadaki görüntüsü T′ nerede? Ayna dünyasında o noktaya dokun, sonra onayla.',
        answer: { x: 11, y: 6 },
        nudge: (p) =>
          p.y !== 6
            ? { q: 'Kristal ile görüntüsünü birleştiren doğru aynaya dik olmalı. Ayna dikey; bu doğru nasıl durur? T′’nün y koordinatı ne olur?', mis: 'Yansımada görüntüyü aynaya dik doğru üzerinde almadı', tool: 'donusum' }
            : p.x <= 7
              ? { q: 'Görüntü aynanın arkasında, ayna dünyasında oluşur. x = 7’nin sağına bak.', tool: 'donusum' }
              : { q: 'Kristal aynadan kaç birim uzakta? Görüntü aynanın arkasında aynı uzaklıkta olmalı.', mis: 'Yansımada aynaya uzaklığın korunduğunu kullanmadı', tool: 'donusum' },
        ok: 'T′(11, 6): T ile aynaya aynı uzaklıkta (4 birim) ve aynaya dik doğru üzerinde.',
        hints: ['T aynadan kaç birim uzakta?', 'Ayna dünyasında da aynı uzaklığa git.'],
      },
      { kind: 'build', inventory: 0, goal: 1, text: 'Nişangâhı (beyaz halka) sürükle: ışını T′’ye doğru gönder ve ateşle!', ok: 'Işın aynadan sekip T’ye ulaştı; sanki T′’ye dümdüz gidiyormuş gibi!', hints: ['Nişangâhı T′’nün tam üstüne sürükleyebilirsin.'], miss: { q: 'Işın hangi noktaya yöneldi? T′’ye giden düz çizgi aynayı nerede kesiyor?', tool: 'donusum' } },
      {
        kind: 'number',
        text: 'Işın aynaya hangi noktada çarptı? O noktanın y koordinatı kaç?',
        answer: (c) => Math.round(bouncePt(c, 0).y * 10) / 10,
        start: 0,
        steps: [1],
        min: 0,
        max: 8,
        tol: 0.05,
        nudge: () => ({ q: 'E(1, 1)’den T′(11, 6)’ya: x 10 artarken y 5 artıyor. x 1’den 7’ye 6 artınca y kaç artar?', tool: 'coordinate' }),
        ok: 'y = 4: ışın (7, 4) noktasında yansıdı. Oran: x 6 artınca y 3 artar.',
        hints: ['x’teki artış ile y’deki artış orantılı.'],
      },
    ],
  },
  {
    id: 'g7-aciortay',
    title: 'Normal ve açıortay',
    story: 'Aynanın normali, aynaya dik olan kesikli çizgidir. Gelen ve yansıyan ışınla normal arasında gizli bir ilişki var.',
    room: { w: 12, h: 8 },
    walls: [],
    blocks: [],
    targets: [{ id: 'K', x: 6, y: 7 }],
    fixed: [],
    emitters: [{ x: 1, y: 4, dir: D(0), aim: 'fixed' }],
    angleStep: 15,
    show: { angles: true, normal: true, coords: true },
    steps: [
      { kind: 'build', inventory: 1, goal: 3, best: 1, text: 'Tek aynayla kristali yak. Farklı yerlerde farklı açılar işe yarar!', ok: 'Kristal yandı! Normal ile iki ışın arasındaki açılara bak.', hints: ['Ayna ışının yolu (y = 4) üzerinde olmalı.', 'Kristale ışının yolundan hangi açıyla bakılıyor?'] },
      {
        kind: 'number',
        text: (c) => `Gelen ve yansıyan ışın arasındaki açı ${r0(angAt(c, 0).between)}°. Normal ile gelen ışın arasındaki açı kaç derece?`,
        answer: (c) => r0(angAt(c, 0).normal),
        unit: '°',
        start: 0,
        steps: [1, 10],
        min: 0,
        max: 180,
        marks: [{ b: 0, k: 'between' }, { b: 0, k: 'normal', hide: true }],
        nudge: (v, ans, c) =>
          v === r0(angAt(c, 0).between)
            ? { q: 'Bu, iki ışın arasındaki açının tamamı. Normal bu açıyı nasıl bölüyor?', tool: ANGLE_TOOL }
            : v === 90 - ans
              ? { q: 'Bu, ışınla AYNA arasındaki açı. Normal aynaya dik: 90°’den ne kadar eksik?', mis: 'Normal ile ayna açısını karıştırdı', tool: ANGLE_TOOL }
              : { q: 'Gelme açısı = yansıma açısı. Normal, iki ışının arasındaki açıyı iki eş parçaya bölüyor mu?', mis: 'Normalin açıortay olduğunu fark etmedi', tool: ANGLE_TOOL },
        ok: (c) => `${r0(angAt(c, 0).between)}° ÷ 2 = ${r0(angAt(c, 0).normal)}°: normal, gelen ve yansıyan ışın arasındaki açının açıortayıdır.`,
      },
      { kind: 'strategy', text: 'Aynanın açısını nasıl buldun?', options: ['Açıortayı düşündüm', 'Aynayı döndürerek denedim', 'Kristalden geriye düşündüm', 'Gelme = yansıma eşitliğini kullandım'] },
    ],
  },
  {
    id: 'g7-x-ekseni',
    title: 'Zemin aynası',
    story: 'Zemin, x ekseni boyunca uzanan bir ayna. Kristal K, engelin arkasında. Koordinatlarla düşün!',
    room: { w: 10, h: 5 },
    view: { xMin: -0.6, xMax: 10.6, yMin: -5.6, yMax: 5.6 },
    ghost: { x0: 0, y0: -5, x1: 10, y1: 0 },
    walls: [seg(0, 0, 10, 0)],
    blocks: [{ x0: 3.5, y0: 2.5, x1: 4.5, y1: 4.2 }],
    targets: [{ id: 'K', x: 7, y: 2, label: 'K' }],
    fixed: [],
    emitters: [{ x: 1, y: 4, dir: { x: 2, y: -1 }, aim: 'lattice' }],
    angleStep: 15,
    show: { normal: true, coords: true, axes: true },
    steps: [
      {
        kind: 'point',
        label: 'K′',
        text: 'K(7, 2) kristalinin x eksenine göre yansıması K′ nerede? Noktaya dokun, sonra onayla.',
        answer: { x: 7, y: -2 },
        nudge: (p) =>
          p.x === -7 && p.y === 2
            ? { q: 'Bu, y eksenine göre yansıma. Ayna x ekseni: yansıyınca hangi koordinat değişmez?', mis: 'x eksenine göre yansımayı y eksenine göre yansımayla karıştırdı', tool: 'donusum' }
            : p.x === 2 && p.y === 7
              ? { q: 'Koordinatların yerini değiştirdin. Aynaya dik in: x aynı kalır mı?', tool: 'donusum' }
              : p.x !== 7
                ? { q: 'K’den aynaya dik inen doğru dikeydir. Bu doğru üzerinde x değişir mi?', tool: 'donusum' }
                : { q: 'K, x ekseninden 2 birim yukarıda. Görüntüsü aynanın öbür yanında, kaç birim aşağıda?', mis: 'Yansımada aynaya uzaklığın korunduğunu kullanmadı', tool: 'donusum' },
        ok: '(x, y) → (x, −y): x aynı kaldı, y’nin işareti değişti. K′(7, −2).',
        hints: ['Ayna x ekseni. K’den eksene dik in.'],
      },
      { kind: 'build', inventory: 0, goal: 1, text: 'Nişangâhı K′’ye yönelt ve ateşle!', ok: 'Tam isabet! Işın zemin aynasından sekti ve K’ye ulaştı.', hints: ['Nişangâhı ayna dünyasındaki K′’nün üstüne sürükle.'], miss: { q: 'Işının yönü K′’ye giden doğruyla aynı mı? Nişangâhı K′’ye taşı.', tool: 'donusum' } },
      {
        kind: 'number',
        text: 'Işın x eksenine hangi noktada çarptı? x = ?',
        answer: (c) => Math.round(bouncePt(c, 0).x * 10) / 10,
        start: 0,
        steps: [1],
        min: 0,
        max: 10,
        tol: 0.05,
        nudge: () => ({ q: 'E(1, 4)’ten K′(7, −2)’ye: x 6 artarken y 6 azalıyor. y’nin 0 olması için 4 azalması gerek; x kaç artar?', tool: 'coordinate' }),
        ok: 'x = 5: ışın (5, 0) noktasında yansıdı. Aynaya uzaklıklar oranı 4 : 2 = 2 : 1, yatay yollar da 4 : 2!',
      },
    ],
  },
  {
    id: 'g7-ucgen',
    title: 'Açılı aynalar',
    story: 'İki ayna arasında 60°’lik bir açı var. Işın iki kez sekip bir üçgen çizecek. Hesapla, sonra kontrol et!',
    room: { w: 12, h: 8 },
    walls: [seg(2, 1, 11, 1), seg(11, 1, 8, 1 + 6 * Math.sin(Math.PI / 3))],
    blocks: [],
    targets: [],
    fixed: [],
    emitters: [{ x: 1, y: 6, dir: D(-45), aim: 'fixed' }],
    angleStep: 15,
    show: { angles: true },
    corners: [{ at: { x: 11, y: 1 }, a1: 120, a2: 180, label: '60°' }],
    tri: { x: 11, y: 1 },
    steps: [
      { kind: 'predict', text: 'Işın iki aynaya çarpacak. Sonunda nereye varır? Tahmin et, sonra ateşle.', tol: 1.5 },
      {
        kind: 'number',
        text: 'Sarı üçgende iki açı belli: 45° ve 60°. Işının ikinci aynaya çarptığı köşedeki açı (?) kaç derece?',
        answer: (c) => 180 - 60 - r0(angAt(c, 0).mirror),
        unit: '°',
        start: 0,
        steps: [1, 10],
        min: 0,
        max: 180,
        marks: [{ b: 0, k: 'out' }, { b: 1, k: 'in', hide: true }],
        nudge: () => ({ q: 'Üçgenin iç açılarının toplamı kaç derece? 45° + 60° + ? = …', mis: 'Üçgenin iç açıları toplamını kullanmadı', tool: 'dinamikucgen' }),
        ok: '45° + 60° + 75° = 180°.',
      },
      {
        kind: 'number',
        text: 'Işın ikinci aynadan hangi açıyla ayrılır? (Yansıyan ışın ile ayna arası)',
        answer: (c) => r0(angAt(c, 1).mirror),
        unit: '°',
        start: 0,
        steps: [1, 10],
        min: 0,
        max: 180,
        marks: [{ b: 1, k: 'in' }, { b: 1, k: 'out', hide: true }],
        nudge: () => ({ q: 'Yansıma bir simetri: gelen ışın ile yansıyan ışın normale göre birbirinin yansıması. Açıları hakkında ne söyleyebilirsin?', tool: 'donusum' }),
        ok: 'Yine 75°: gelen ışın ve yansıyan ışın normale göre simetrik.',
      },
      { kind: 'strategy', text: 'Nasıl buldun?', options: ['Üçgende açılar toplamı 180°', 'Gelme açısı = yansıma açısı', 'Simetriyi kullandım', 'Tahmin edip kontrol ettim'] },
    ],
  },
  {
    id: 'g7-periskop',
    title: 'Periskop',
    story: 'Denizaltıdaki periskop, iki aynayla duvarın üstünü görmeni sağlar. Işını yüksek duvarın üstündeki kristale ulaştır.',
    room: { w: 12, h: 8 },
    walls: [],
    blocks: [{ x0: 5, y0: 0, x1: 6, y1: 6 }],
    targets: [{ id: 'K', x: 11, y: 7 }],
    fixed: [],
    emitters: [{ x: 1, y: 1, dir: D(0), aim: 'fixed' }],
    angleStep: 15,
    show: { angles: true, normal: true },
    steps: [
      { kind: 'build', inventory: 2, goal: 3, best: 2, text: 'İki aynayla periskop yap. Aynaları farklı yerlere koyarak başka yollar da bul!', ok: 'Kristal yandı! Çıkan ışın, giren ışına paralel.', hints: ['Işını önce dümdüz yukarı gönder.', 'İkinci ayna ışını yeniden sağa çevirmeli. İki aynanın açılarını karşılaştır.'] },
      { kind: 'strategy', text: 'İki aynan birbirine göre nasıl duruyor?', options: ['Aynalar paralel', 'Aynalar birbirine dik', 'Açılarını hesapladım', 'Deneyerek yerleştirdim'] },
    ],
  },
  {
    id: 'g7-geri-donus',
    title: 'Geri dönüş',
    story: 'Kristal yayıcının hemen üstünde ama arada bir raf var. Işını odada dolaştırıp geri getirmelisin. En az kaç ayna gerekir?',
    room: { w: 12, h: 8 },
    walls: [],
    blocks: [{ x0: 0, y0: 2, x1: 5, y1: 3 }],
    targets: [{ id: 'K', x: 1, y: 5 }],
    fixed: [],
    emitters: [{ x: 1, y: 1, dir: D(0), aim: 'fixed' }],
    angleStep: 15,
    show: { angles: true, normal: true },
    steps: [
      { kind: 'build', inventory: 3, goal: 3, best: 2, text: 'Işını kristale geri getir. Önce bir yol bul, sonra daha az aynayla dene.', ok: 'Kristal yandı!', hints: ['Işın sağa gidiyor; kristal sol üstte. Işını iki kez döndürmen gerekebilir.', 'İkinci ayna, rafın sağında ve kristalle aynı yükseklikte olabilir mi?'] },
      { kind: 'strategy', text: 'En az aynalı yolu nasıl buldun?', options: ['Kristalin görüntüsünü düşündüm', 'Kristalden geriye düşündüm', 'Açıları hesapladım', 'Deneyerek buldum'] },
    ],
  },
]

/* ───────────────────────────── 8. SINIF ───────────────────────────── */
const G8: Mission[] = [
  {
    id: 'g8-egim',
    title: 'Eğimle nişan',
    story: 'Yayıcı (0, 1) noktasında. Nişangâhı ızgara noktalarına sürükleyerek ışının eğimini belirle. Hangi eğim kristale ulaşır?',
    room: { w: 12, h: 8 },
    walls: [],
    blocks: [],
    targets: [{ id: 'K', x: 8, y: 5, label: 'K' }],
    fixed: [],
    emitters: [{ x: 0, y: 1, dir: { x: 1, y: 0 }, aim: 'lattice' }],
    angleStep: 45,
    show: { coords: true, slope: true, axes: true },
    steps: [
      { kind: 'build', inventory: 0, goal: 1, text: 'Nişangâhı sürükle (ya da Δx, Δy düğmelerini kullan). Eğim canlı yazılır. Kristale ulaşan eğimi bul ve ateşle!', ok: 'Kristal yandı! Eğim [[1/2]]: x 2 artınca y 1 artıyor.', hints: ['Yayıcıdan kristale: x kaç artıyor, y kaç artıyor?', 'Yükselme ÷ ilerleme = eğim.'], miss: { q: 'Işın kristalin üstünden mi geçti altından mı? Eğimi büyütmek mi küçültmek mi gerek?', tool: 'egim' } },
      {
        kind: 'number',
        text: 'Işın durmasaydı, x = 12’de hangi yükseklikte (y kaç) olurdu?',
        answer: 7,
        start: 0,
        steps: [1],
        min: 0,
        max: 20,
        nudge: (v) =>
          v === 6
            ? { q: 'Başlangıç yüksekliğini unuttun mu? Işın y = 1’den başladı.', mis: 'Doğrunun y eksenini kestiği noktayı hesaba katmadı', tool: 'egim' }
            : { q: 'Eğim [[1/2]]: x 12 artarsa y kaç artar? Işın y = 1’den başladı.', tool: 'egim' },
        ok: 'y = [[1/2]] · 12 + 1 = 7. Işının doğrusu: y = [[1/2]]x + 1.',
      },
      { kind: 'strategy', text: 'Eğimi nasıl buldun?', options: ['Yükselme ÷ ilerleme', 'Kristale doğrudan nişan aldım', 'Deneyerek düzelttim', 'Doğrunun denklemini düşündüm'] },
    ],
  },
  {
    id: 'g8-tavan',
    title: 'Tavan aynası',
    story: 'Tavan, y = 7 doğrusu boyunca bir ayna. Yayıcının eğimi [[3/4]]. Işın aynadan sekince eğimine ne olur?',
    room: { w: 12, h: 7 },
    walls: [seg(0, 7, 12, 7)],
    blocks: [],
    targets: [],
    fixed: [],
    emitters: [{ x: 0, y: 1, dir: { x: 4, y: 3 }, aim: 'fixed' }],
    angleStep: 45,
    show: { coords: true, slope: true, axes: true, normal: true },
    steps: [
      { kind: 'predict', text: 'Işın tavandaki aynadan sekecek. Sağ duvarda (x = 12) nereye çarpar? Tahmin et, sonra ateşle.', tol: 1, hints: ['Işın tavana nerede çarpar? y 6 artmalı; eğim [[3/4]] ise x kaç artar?'] },
      {
        kind: 'slope',
        text: 'Yansıyan ışının eğimi ne? Yükselme ve ilerlemeyi ayarla.',
        answer: -3 / 4,
        nudge: (r, run, ans) =>
          Math.abs(r / run + ans) < 1e-6
            ? { q: 'Yansıdıktan sonra ışın yükseliyor mu, alçalıyor mu? Eğimin işareti ne olmalı?', mis: 'Yansımada eğimin işaret değiştirdiğini fark etmedi', tool: 'egim' }
            : Math.abs(run / r + 1 / ans) < 1e-6 || Math.abs(Math.abs(r / run) - 4 / 3) < 1e-6
              ? { q: 'Yükselme ile ilerlemeyi karıştırdın mı? x 4 artınca y kaç değişiyor?', tool: 'egim' }
              : { q: 'Işın (8, 7)’den (12, 4)’e gidiyor. x kaç değişti, y kaç değişti?', tool: 'egim' },
        ok: '[[3/4]] → −[[3/4]]: yatay aynada eğimin büyüklüğü aynı kalır, işareti değişir.',
      },
      {
        kind: 'number',
        text: 'Yansıyan ışının doğrusu y = −[[3/4]]x + b. Bu doğru (8, 7)’den geçiyor. b kaç?',
        answer: 13,
        start: 0,
        steps: [1],
        min: -20,
        max: 30,
        nudge: (v) =>
          v === 7
            ? { q: '7, aynaya çarptığı yükseklik. Doğruyu x = 0’a kadar uzatırsan y kaç olur?', tool: 'egim' }
            : { q: '(8, 7) noktasını yerine koy: 7 = −[[3/4]] · 8 + b. −[[3/4]] · 8 kaç eder?', mis: 'Bir noktadan geçen doğrunun denklemini kuramadı', tool: 'egim' },
        ok: 'b = 13: y = −[[3/4]]x + 13. Kontrol: x = 12 → y = −9 + 13 = 4. ✓',
      },
    ],
  },
  {
    id: 'g8-pisagor',
    title: 'Işının yolu',
    story: 'Işın (4, 5)’teki aynadan sekip kristale ulaşıyor. Işın toplam ne kadar yol alıyor? Cetvel yok; dik üçgenler var!',
    room: { w: 12, h: 9 },
    walls: [],
    blocks: [],
    targets: [{ id: 'K', x: 8, y: 8, label: 'K' }],
    fixed: [{ id: 900, x: 4, y: 5, a: 45, fixed: true }],
    emitters: [{ x: 1, y: 1, dir: { x: 3, y: 4 }, aim: 'fixed' }],
    angleStep: 45,
    show: { coords: true, legs: true, axes: true, slope: true },
    steps: [
      { kind: 'predict', text: 'Işının eğimi [[4/3]]. 45°’lik aynadan sekince nereye gider? Tahmin et, sonra ateşle.', tol: 1.3, hints: ['45°’lik ayna, ışının x ve y değişimlerinin yerini değiştirir.'] },
      {
        kind: 'number',
        text: 'Işın kristalin merkezine kadar toplam kaç birim yol aldı? Kesikli dik üçgenler yardımcı olabilir.',
        answer: 10,
        unit: ' birim',
        start: 0,
        steps: [1],
        min: 0,
        max: 30,
        nudge: (v) =>
          v === 14
            ? { q: 'Işın dik kenarlar boyunca değil, hipotenüs boyunca gidiyor. 3² + 4² = ?', mis: 'Hipotenüs yerine dik kenarları topladı', tool: 'dinamikucgen' }
            : v === 5
              ? { q: 'Bu bir parçanın uzunluğu. Işının kaç parçası var?', tool: 'dinamikucgen' }
              : { q: 'Her parça bir dik üçgenin hipotenüsü: √{3^{2} + 4^{2}} = ?', tool: 'dinamikucgen' },
        ok: '5 + 5 = 10 birim: her parça 3-4-5 dik üçgeninin hipotenüsü.',
        hints: ['İlk parça: Δx = 3, Δy = 4.', 'a^{2} + b^{2} = c^{2}'],
      },
      { kind: 'strategy', text: 'Uzunluğu nasıl buldun?', options: ['Pisagor bağıntısı', '3-4-5 üçgenini tanıdım', 'Izgaradan saydım', 'Tahmin ettim'] },
    ],
  },
  {
    id: 'g8-karekok',
    title: 'Duvarın ardı',
    story: 'Kristal yüksek duvarın arkasında. Bir ayna ve nişangâhla ona ulaş; sonra ışının yolunu karekökle tahmin et.',
    room: { w: 10, h: 8 },
    walls: [],
    blocks: [{ x0: 4, y0: 0, x1: 5, y1: 5 }],
    targets: [{ id: 'K', x: 8, y: 2, label: 'K' }],
    fixed: [],
    emitters: [{ x: 1, y: 1, dir: { x: 1, y: 1 }, aim: 'lattice' }],
    angleStep: 45,
    show: { coords: true, slope: true, legs: true, axes: true },
    steps: [
      { kind: 'build', inventory: 1, goal: 3, best: 1, text: 'Bir ayna koy (0°, 45°, 90°, 135°) ve nişangâhı ayarla. Birden fazla yol var!', ok: 'Kristal yandı!', hints: ['Yatay bir ayna eğimin işaretini değiştirir: yukarı çıkan ışın aşağı iner.', 'Kristalin, tavana yakın yatay aynadaki görüntüsüne nişan al.'], miss: { q: 'Işın duvarın üstünden geçti mi? Yatay bir ayna yukarı çıkan ışını nasıl aşağı indirir?', tool: 'egim' } },
      {
        kind: 'number',
        text: (c) => {
          const s = segOf(c, 0)
          return `Işının ilk parçası (yayıcıdan aynaya): Δx = ${fmtN(Math.abs(s.dx), 1)}, Δy = ${fmtN(Math.abs(s.dy), 1)}. Uzunluğu yaklaşık kaç birim? (Bir ondalık basamak)`
        },
        answer: (c) => Math.round(segOf(c, 0).len * 10) / 10,
        unit: ' birim',
        start: (c) => Math.floor(segOf(c, 0).len),
        steps: [0.1, 1],
        min: 0,
        max: 20,
        tol: 0.11,
        nudge: (v, _ans, c) => {
          const s = segOf(c, 0)
          const N = s.dx * s.dx + s.dy * s.dy
          if (Math.abs(v - (Math.abs(s.dx) + Math.abs(s.dy))) < 0.11) return { q: 'Dik kenarları topladın; ışın hipotenüs boyunca gidiyor. Hipotenüs dik kenarların toplamından kısadır.', mis: 'Hipotenüs yerine dik kenarları topladı', tool: 'dinamikucgen' }
          return v * v < N
            ? { q: `${fmtN(v, 1)}² = ${fmtN(v * v)}; bu, ${fmtN(Δ(s.dx))}² + ${fmtN(Δ(s.dy))}² = ${fmtN(N)}’den küçük. Biraz büyüt.`, tool: 'dinamikucgen' }
            : { q: `${fmtN(v, 1)}² = ${fmtN(v * v)}; bu, ${fmtN(Δ(s.dx))}² + ${fmtN(Δ(s.dy))}² = ${fmtN(N)}’den büyük. Biraz küçült.`, tool: 'dinamikucgen' }
        },
        ok: (c) => {
          const s = segOf(c, 0)
          const N = s.dx * s.dx + s.dy * s.dy
          return `√{${fmtN(N)}} ≈ ${fmtN(s.len, 1)} birim. (${fmtN(s.len, 1)}² = ${fmtN(Math.round(s.len * 10) ** 2 / 100)})`
        },
        hints: ['Önce karesini düşün: uzunluğun karesi = Δx² + Δy².', 'Hangi iki tam sayının karesi arasında?'],
      },
      { kind: 'strategy', text: 'Kristale nasıl ulaştın?', options: ['Kristalin aynadaki görüntüsüne nişan aldım', 'Eğimi hesapladım', 'Deneyerek buldum', 'Simetriyi kullandım'] },
    ],
  },
  {
    id: 'g8-oteleme',
    title: 'Paralel ışınlar',
    story: 'E₁ yayıcısı T₁ kristalini vuruyor. Tüm düzenek 3 birim yukarı ötelenirse ne olur? İkinci yayıcı E₂ hazır.',
    room: { w: 12, h: 9 },
    walls: [],
    blocks: [],
    targets: [{ id: 'T1', x: 8, y: 5, label: 'T₁' }, { id: 'T2', x: 8, y: 8, label: 'T₂', hidden: true }],
    fixed: [],
    emitters: [{ x: 0, y: 1, dir: { x: 2, y: 1 }, aim: 'fixed', label: 'E₁' }, { x: 0, y: 4, dir: { x: 1, y: 0 }, aim: 'lattice', label: 'E₂' }],
    angleStep: 45,
    show: { coords: true, slope: true, axes: true },
    steps: [
      {
        kind: 'point',
        label: 'T₂',
        reveal: ['T2'],
        text: 'T₁(8, 5) kristali 3 birim yukarı ötelendi. Yeni kristal T₂ nerede? Noktaya dokun, sonra onayla.',
        answer: { x: 8, y: 8 },
        nudge: (p) =>
          p.x === 11 && p.y === 5
            ? { q: 'x’e ekledin. Yukarı öteleme hangi koordinatı değiştirir?', mis: 'Ötelemede yatay ve dikey yönü karıştırdı', tool: 'donusum' }
            : p.y === 2
              ? { q: 'Yukarı öteleme y’yi artırır mı azaltır mı?', tool: 'donusum' }
              : { q: '(x, y) → (x, y + 3). T₁’in koordinatlarına uygula.', tool: 'donusum' },
        ok: 'T₂(8, 8): (x, y) → (x, y + 3).',
      },
      { kind: 'build', inventory: 0, goal: 1, text: 'E₂ de E₁’in 3 birim yukarısında. E₂’nin nişangâhını ayarla: ışını T₂’ye gönder ve ateşle.', ok: 'İki ışın paralel: eğimleri aynı!', hints: ['E₁’in eğimi kaç? Ötelenen bir doğrunun eğimi değişir mi?'], miss: { q: 'E₁’in ışınıyla E₂’nin ışını paralel mi? Eğimlerini karşılaştır.', tool: 'egim' } },
      {
        kind: 'number',
        text: 'E₁’in ışını y = [[1/2]]x + 1. E₂’nin ışını y = [[1/2]]x + b. b kaç?',
        answer: 4,
        start: 0,
        steps: [1],
        min: -10,
        max: 20,
        nudge: (v) => (v === 1 ? { q: 'İki doğru paralel ama aynı değil: E₂’nin ışını y eksenini nerede kesiyor?', tool: 'egim' } : { q: 'Öteleme her noktayı 3 birim yukarı taşıdı. y eksenini kestiği nokta da 3 yukarı çıkar mı?', tool: 'egim' }),
        ok: 'b = 4: öteleme eğimi değiştirmez, yalnızca doğruyu 3 birim yukarı taşır (b: 1 → 4).',
      },
    ],
  },
  {
    id: 'g8-iki-ayna',
    title: 'Eğim dönüşümleri',
    story: 'Işının eğimi [[1/2]]. Aynalar (0°, 45°, 90°, 135°) eğimi değiştirir. Kristale engelin üstünden ulaş ve eğimlerin nasıl değiştiğini keşfet.',
    room: { w: 12, h: 8 },
    walls: [],
    blocks: [{ x0: 4.5, y0: 0, x1: 5.5, y1: 4.5 }],
    targets: [{ id: 'K', x: 6, y: 7, label: 'K' }],
    fixed: [],
    emitters: [{ x: 0, y: 1, dir: { x: 2, y: 1 }, aim: 'fixed' }],
    angleStep: 45,
    show: { coords: true, slope: true, axes: true },
    steps: [
      { kind: 'build', inventory: 3, goal: 3, best: 2, text: 'Aynalarla ışını kristale ulaştır. Her parçanın eğimi yazılacak. En az aynayla yapabilir misin?', ok: 'Kristal yandı! Her aynada eğim nasıl değişti?', hints: ['45°’lik ayna eğimi [[1/2]]’den 2’ye çevirir.', 'Dikey (90°) ayna eğimin işaretini değiştirir.'] },
      {
        kind: 'slope',
        text: 'Işının ikinci parçasının (ilk aynadan sonraki) eğimi ne?',
        answer: (c) => {
          const s = segOf(c, 1)
          return s.dy / s.dx
        },
        skip: (c) => Math.abs(segOf(c, 1).dx) < 1e-6,
        nudge: (r, run, ans) =>
          Math.abs(r / run - 1 / ans) < 1e-6
            ? { q: 'Yükselme ile ilerlemeyi karıştırdın mı? x kaç değişiyor, y kaç?', tool: 'egim' }
            : Math.abs(r / run + ans) < 1e-6
              ? { q: 'Işın bu parçada yükseliyor mu, alçalıyor mu? Soldan sağa mı gidiyor?', mis: 'Eğimin işaretini yanlış belirledi', tool: 'egim' }
              : { q: 'Bu parça üzerinde iki ızgara noktası seç: x ne kadar, y ne kadar değişiyor?', tool: 'egim' },
        ok: (c) => {
          const s = segOf(c, 1)
          return `Eğim ${slopeFrac(s.dx, s.dy).text}. 45°’lik ayna eğimi tersine çevirir (½ → 2); yatay ya da dikey ayna işaretini değiştirir (½ → −½).`
        },
      },
      { kind: 'strategy', text: 'Yolu nasıl planladın?', options: ['Eğimin nasıl değişeceğini hesapladım', 'Kristalden geriye düşündüm', 'Yansımaları düşündüm', 'Deneyerek buldum'] },
    ],
  },
]

const Δ = (v: number) => Math.abs(v)

export const MISSIONS: Record<6 | 7 | 8, Mission[]> = { 6: G6, 7: G7, 8: G8 }

export const INSIGHT: Record<6 | 7 | 8, string> = {
  6: 'Işın aynaya hangi açıyla gelirse aynı açıyla yansır; ayna üzerindeki açılar 180° eder, paralel aynalar arasında iç ters açılar eşittir ve ışının çizdiği üçgenin açıları toplamı 180°’dir.',
  7: 'Bir aynadan yansıyarak hedefi vurmak için hedefin aynadaki görüntüsüne nişan almak yeter: yansıma aynaya uzaklığı korur ve normal, gelen ile yansıyan ışın arasındaki açının açıortayıdır.',
  8: 'Yatay ya da dikey bir aynadan yansıyan ışının eğimi işaret değiştirir; ötelenen ışınların eğimi aynı kalır ve her ışın parçasının uzunluğu Pisagor bağıntısıyla bulunur.',
}
