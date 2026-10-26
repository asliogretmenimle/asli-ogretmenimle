import type { Grade } from '../../data/types'
import type { Axes, Pt, Spec } from './graf'

/* ───────────────────────── bağlamlar (hikâye yazma) ───────────────────────── */

export type Ctx = 'uzaklik' | 'su' | 'para'
export type Chip = 'upSlow' | 'upFast' | 'flat' | 'downSlow' | 'downFast'
export const CHIPS: Chip[] = ['upSlow', 'upFast', 'flat', 'downSlow', 'downFast']

export interface CtxInfo {
  name: string
  emoji: string
  who: string
  yLabel: string
  xLabel: string
  /** 7–8: soyut birim × scale */
  scale: number
  yUnit: string
  xUnit: string
  /** "dakikada kaç metre" */
  rateWord: string
  chips: Record<Chip, string>
}

export const CTX: Record<Ctx, CtxInfo> = {
  uzaklik: {
    name: 'Ali’nin yürüyüşü',
    emoji: '🚶',
    who: 'Ali',
    yLabel: 'Evden uzaklık',
    xLabel: 'Zaman',
    scale: 100,
    yUnit: 'm',
    xUnit: 'dk',
    rateWord: 'dakikada kaç metre',
    chips: {
      upSlow: 'evden yavaş yavaş uzaklaştı',
      upFast: 'evden hızla uzaklaştı',
      flat: 'bir süre olduğu yerde kaldı',
      downSlow: 'eve doğru ağır ağır yürüdü',
      downFast: 'hızla eve geri döndü',
    },
  },
  su: {
    name: 'Küvetteki su',
    emoji: '🛁',
    who: 'Küvetteki su',
    yLabel: 'Su yüksekliği',
    xLabel: 'Zaman',
    scale: 5,
    yUnit: 'cm',
    xUnit: 'dk',
    rateWord: 'dakikada kaç santimetre',
    chips: {
      upSlow: 'musluk az açıkken yavaşça yükseldi',
      upFast: 'musluk tam açılınca hızla yükseldi',
      flat: 'musluk kapalıyken hiç değişmedi',
      downSlow: 'yavaş yavaş boşaldı',
      downFast: 'tıpa çekilince hızla boşaldı',
    },
  },
  para: {
    name: 'Ada’nın kumbarası',
    emoji: '🐷',
    who: 'Ada',
    yLabel: 'Kumbaradaki para',
    xLabel: 'Zaman',
    scale: 10,
    yUnit: 'TL',
    xUnit: 'hafta',
    rateWord: 'haftada kaç TL',
    chips: {
      upSlow: 'kumbaraya azar azar para attı',
      upFast: 'kumbaraya hızla para biriktirdi',
      flat: 'ne para attı ne de harcadı',
      downSlow: 'parasını azar azar harcadı',
      downFast: 'bir anda çok para harcadı',
    },
  },
}

export const chipKind = (c: Chip) => (c === 'flat' ? 'flat' : c.startsWith('up') ? 'up' : 'down')
export const chipSpeed = (c: Chip) => (c === 'flat' ? null : c.endsWith('Fast') ? 'fast' : 'slow')

/** Bağlama göre eksenler (soyut grafik: x 0–12, y 0–10) */
export function ctxAxes(ctx: Ctx | null, numbers: boolean): Axes {
  const c = ctx ? CTX[ctx] : null
  const s = numbers && c ? c.scale : 1
  return {
    xMax: 12,
    yMax: 10 * s,
    xStep: 1,
    yStep: s,
    xLabel: c ? (numbers ? `${c.xLabel} (${c.xUnit})` : c.xLabel) : 'Zaman',
    yLabel: c ? (numbers ? `${c.yLabel} (${c.yUnit})` : c.yLabel) : '?',
    numbers: numbers && !!c,
  }
}

/* ───────────────────────── görev türleri ───────────────────────── */

export interface MatchGraph {
  id: string
  pts: Pt[]
  /** Doğru hikâye (yoksa çeldirici) */
  story?: string
  /** Yanlış eşleşmede: hikâye kimliği → soru (+ yanılgı) */
  why?: Record<string, { q: string; mis?: string }>
}
export interface MatchTask {
  kind: 'match'
  title: string
  prompt: string
  stories: { id: string; text: string }[]
  graphs: MatchGraph[]
  xMax: number
  yMax: number
  yLabel?: string
  xTicks?: number[]
  yTicks?: number[]
  xUnit?: string
}

export interface WriteTask {
  kind: 'write'
  title: string
  pts: Pt[]
  numbers: boolean
  /** 7–8: hızı sorulacak parça */
  rateSeg?: number
}

export interface EditTask {
  kind: 'edit'
  title: string
  story: string
  axes: Axes
  start: Pt[]
  spec: Spec
  /** Başarıdan sonra ek soru */
  follow?: { kind: 'num'; q: string; answer: number; unit: string; hint: string } | { kind: 'chips'; q: string; options: { text: string; ok: boolean; why?: string }[] }
}

export type Task = MatchTask | WriteTask | EditTask

/* ── eşleştirme setleri ── */

const M1 = (decoy: boolean): MatchTask => ({
  kind: 'match',
  title: 'Hangi hikâye hangi grafik?',
  prompt: 'Her grafik birinin evden uzaklığını gösteriyor. Hikâye kartını uyan grafiğe sürükle (ya da karta, sonra grafiğe dokun).',
  yLabel: 'evden uzaklık',
  xMax: 10,
  yMax: 10,
  stories: [
    { id: 'a', text: 'Zeynep evden parka yürüdü ve parkta oynadı.' },
    { id: 'b', text: 'Mert bakkala gitti, alışveriş yaptı ve eve döndü.' },
    { id: 'c', text: 'Ece bisikletle yokuş yukarı yavaşça çıktı, sonra yokuştan hızla inip yoluna devam etti.' },
  ],
  graphs: [
    {
      id: 'g1', story: 'b', pts: [{ x: 0, y: 0 }, { x: 3, y: 6 }, { x: 6, y: 6 }, { x: 9, y: 0 }],
      why: { a: { q: 'Bu grafiğin sonunda uzaklık sıfıra iniyor. Zeynep eve döndü mü?' }, c: { q: 'Bu grafikte düz bir parça var. Ece yolda durdu mu? Sonunda evden uzaklığı ne oluyor?' } },
    },
    {
      id: 'g2', story: 'c', pts: [{ x: 0, y: 0 }, { x: 6, y: 3 }, { x: 9, y: 9 }],
      why: { a: { q: 'Bu grafikte hiç düz parça yok. Parkta oynarken Zeynep’in evden uzaklığı değişir mi?' }, b: { q: 'Bu grafik hiç aşağı inmiyor. Mert eve döndüyse evden uzaklığı ne olur?' } },
    },
    {
      id: 'g3', story: 'a', pts: [{ x: 0, y: 0 }, { x: 4, y: 6 }, { x: 10, y: 6 }],
      why: { b: { q: 'Bu grafik sonunda aşağı inmiyor. Eve dönen birinin evden uzaklığı ne olur?' }, c: { q: 'Bu grafikte uzun bir düz parça var. Ece bir yerde durdu mu?' } },
    },
    ...(decoy
      ? [{
          id: 'g4', pts: [{ x: 0, y: 0 }, { x: 5, y: 8 }, { x: 10, y: 0 }],
          why: {
            c: { q: 'Bu grafik bir tepeye benziyor, ama y ekseni evden uzaklığı gösteriyor. Ece yokuştan inerken eve mi yaklaşıyor, yoluna mı devam ediyor?', mis: 'Grafiği yolun resmi gibi okuma (tepe biçimli grafik)' },
            b: { q: 'Bakkalda alışveriş yaparken Mert’in evden uzaklığı değişir mi? Bu grafikte bunu gösteren düz bir parça var mı?' },
            a: { q: 'Bu grafiğin sonunda uzaklık sıfıra iniyor. Zeynep eve döndü mü?' },
          },
        }]
      : []),
  ],
})

const M2 = (decoy: boolean): MatchTask => ({
  kind: 'match',
  title: 'Üç hikâye, üç değişim',
  prompt: 'Bu grafiklerde y ekseninde ne olduğu yazmıyor! Hikâyeyi oku: zamanla ne artıyor, ne sabit kalıyor, ne azalıyor?',
  yLabel: '?',
  xMax: 10,
  yMax: 10,
  stories: [
    { id: 'a', text: 'Küveti doldurdum, banyo yaptım, sonra tıpayı çektim. (su yüksekliği)' },
    { id: 'b', text: 'Bir yaz günü sabahtan öğlene hava ısındı, akşama doğru serinledi. (sıcaklık)' },
    { id: 'c', text: 'Fidan her hafta aynı miktarda uzadı. (fidanın boyu)' },
  ],
  graphs: [
    {
      id: 'g1', story: 'b', pts: [{ x: 0, y: 3 }, { x: 2, y: 6 }, { x: 5, y: 8.5 }, { x: 8, y: 6.5 }, { x: 10, y: 4.5 }],
      why: { a: { q: 'Bu grafikte düz bir parça yok. Banyo yaparken küvetteki su yüksekliği değişir mi?' }, c: { q: 'Fidan uzadıktan sonra kısalır mı? Bu grafiğin sonu ne yapıyor?' } },
    },
    {
      id: 'g2', story: 'a', pts: [{ x: 0, y: 0 }, { x: 3, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 0 }],
      why: { b: { q: 'Bu grafik başta sıfırda ve en sonunda birden sıfıra iniyor. Hava sıcaklığı böyle mi değişir?' }, c: { q: 'Fidan bir süre büyümeyip sonra birden kısalır mı?' } },
    },
    {
      id: 'g3', story: 'c', pts: [{ x: 0, y: 1 }, { x: 10, y: 9 }],
      why: { a: { q: 'Bu grafik hep aynı hızla yükseliyor. Banyo yaparken ve tıpa çekilince su ne oluyor?' }, b: { q: 'Akşam serinleyince sıcaklık ne olur? Bu grafik hiç aşağı iniyor mu?' } },
    },
    ...(decoy
      ? [{
          id: 'g4', pts: [{ x: 0, y: 0 }, { x: 4, y: 8 }, { x: 10, y: 8 }],
          why: {
            a: { q: 'Tıpa çekilince küvetteki su ne olur? Bu grafikte bunu gösteren bir iniş var mı?' },
            b: { q: 'Akşama doğru serinleme bu grafikte nerede?' },
            c: { q: 'Fidan her hafta uzadıysa grafikte düz bir parça olur mu?' },
          },
        }]
      : []),
  ],
})

const M3 = (g8: boolean): MatchTask => ({
  kind: 'match',
  title: g8 ? 'Kural, hikâye ve grafik' : 'Sayılı hikâyeler',
  prompt: g8 ? 'x dakika, y evden uzaklık (metre). Her hikâyeyi uyan grafiğe sürükle; eğime ve noktaların değerlerine bak.' : 'Grafiklerde zaman (dakika) ve evden uzaklık (metre) var. Her hikâyeyi uyan grafiğe sürükle; değerleri oku.',
  xMax: 30,
  yMax: 3000,
  xTicks: [0, 10, 20, 30],
  yTicks: [0, 1000, 2000, 3000],
  xUnit: 'dk',
  stories: [
    { id: 'a', text: g8 ? 'Deniz’in uzaklığı ilk 20 dakika y = 100x kuralına uydu, sonra 10 dakika dinlendi.' : 'Deniz 20 dakika boyunca dakikada 100 m koştu, sonra 10 dakika dinlendi.' },
    { id: 'b', text: g8 ? 'Bora’nın evden uzaklığı y = 50x kuralına uyuyor.' : 'Bora 30 dakika boyunca dakikada 50 m hızla yürüdü.' },
    { id: 'c', text: 'Selin, evden 3000 m uzaktaki dedesinin evinden bisikletle 15 dakikada eve döndü ve evde kaldı.' },
  ],
  graphs: [
    {
      id: 'g1', story: 'b', pts: [{ x: 0, y: 0 }, { x: 30, y: 1500 }],
      why: { a: { q: 'Bu grafikte düz parça yok. Deniz’in dinlendiği 10 dakika nerede?' }, c: { q: 'Selin başta evden ne kadar uzaktaydı? Bu grafik nereden başlıyor?' } },
    },
    {
      id: 'g2', story: 'a', pts: [{ x: 0, y: 0 }, { x: 20, y: 2000 }, { x: 30, y: 2000 }],
      why: { b: { q: g8 ? 'y = 50x ise 20. dakikada y kaç olur? Bu grafikte 20. dakikada kaç metre var?' : 'Bora hiç durmadı. Bu grafikteki düz parça neyi anlatıyor?' }, c: { q: 'Bu grafik sıfırdan başlıyor. Selin başta evde miydi?' } },
    },
    {
      id: 'g3', story: 'c', pts: [{ x: 0, y: 3000 }, { x: 15, y: 0 }, { x: 30, y: 0 }],
      why: { a: { q: 'Bu grafik 3000 m’den başlıyor ve iniyor. Deniz eve mi dönüyor, evden mi uzaklaşıyor?' }, b: { q: 'Bora evden uzaklaşıyor mu, eve mi yaklaşıyor? Bu grafik aşağı iniyor.' } },
    },
    {
      id: 'g4', pts: [{ x: 0, y: 0 }, { x: 30, y: 3000 }],
      why: {
        b: { q: g8 ? 'y = 50x kuralında x = 30 olunca y kaç olur? Bu grafiğin son noktası kaç metre?' : 'Dakikada 50 m giden biri 30 dakikada kaç metre yol alır? Bu grafiğin son noktası kaç metre?', mis: 'Hızı (eğimi) grafikteki değerlerden okuyamama' },
        a: { q: 'Deniz 20. dakikadan sonra dinlendi. Bu grafikte dinlenmeyi gösteren düz parça var mı?' },
        c: { q: 'Selin başta evden 3000 m uzaktaydı. Bu grafik nereden başlıyor?' },
      },
    },
  ],
})

/* ── hikâye yazma grafikleri (soyut: x 0–12, y 0–10) ── */

const W1 = (numbers: boolean): WriteTask => ({
  kind: 'write',
  title: 'Bu grafiğin hikâyesini yaz',
  pts: [{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 6, y: 3 }, { x: 8, y: 9 }, { x: 12, y: 0 }],
  numbers,
  rateSeg: numbers ? 0 : undefined,
})
const W2 = (numbers: boolean): WriteTask => ({
  kind: 'write',
  title: 'Başka bir grafik, başka hikâyeler',
  pts: [{ x: 0, y: 8 }, { x: 3, y: 8 }, { x: 5, y: 2 }, { x: 9, y: 0 }, { x: 12, y: 0 }],
  numbers,
  rateSeg: numbers ? 1 : undefined,
})

/* ── grafik düzenleme ── */

const qual = (yLabel: string): Axes => ({ xMax: 10, yMax: 10, xStep: 1, yStep: 1, xLabel: 'Zaman', yLabel, numbers: false })

const E1: EditTask = {
  kind: 'edit',
  title: 'Grafiği hikâyeye uydur',
  story: 'Elif evden kırtasiyeye yürüdü, kırtasiyede biraz durdu, sonra koşarak okula gitti. Okul, kırtasiyeden de uzakta.',
  axes: qual('Evden uzaklık'),
  start: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 6, y: 0 }, { x: 9, y: 0 }],
  spec: {
    start: { y: 0, q: 'Elif yola nereden başladı? Evdeyken evden uzaklığı ne kadardır?' },
    phases: [
      { kind: 'up', q: 'Elif önce kırtasiyeye yürüdü. Evden uzaklaşırken grafik ne yapmalı?' },
      { kind: 'flat', q: 'Elif kırtasiyede durdu. Dururken evden uzaklığı değişir mi? Bunu gösteren düz bir parça var mı?' },
      { kind: 'up', q: 'Kırtasiyeden sonra Elif okula gitti. Okul evden daha uzak; grafik son parçada ne yapmalı?' },
    ],
    faster: [{ a: 2, b: 0, q: 'Elif okula koşarak gitti. Koşarken aynı sürede daha çok yol alır. Son parça ilk parçadan daha dik mi?', mis: 'Hızı çizginin dikliğiyle gösterememe' }],
  },
}

const E2: EditTask = {
  kind: 'edit',
  title: 'Havuzun grafiği',
  story: 'Boş havuza musluktan su doldu. Havuz yarıya gelince musluk kapatıldı. Bir süre sonra havuzun suyu hızla boşaltıldı.',
  axes: qual('Su yüksekliği'),
  start: [{ x: 0, y: 3 }, { x: 4, y: 3 }, { x: 7, y: 3 }, { x: 10, y: 3 }],
  spec: {
    start: { y: 0, q: 'Havuz başta boştu. Grafiğin ilk noktası nerede olmalı?' },
    phases: [
      { kind: 'up', q: 'Musluktan su akarken su yüksekliği ne olur? İlk parça yükseliyor mu?' },
      { kind: 'flat', q: 'Musluk kapalıyken su yüksekliği değişir mi? Bunu gösteren düz bir parça var mı?' },
      { kind: 'down', q: 'Havuz boşaltılınca su yüksekliği ne olur? Son parça ne yapmalı?' },
    ],
    end: { y: 0, q: 'Havuzun suyu tamamen boşaltıldı. Grafiğin sonunda su yüksekliği kaç olmalı?' },
    faster: [{ a: 2, b: 0, q: 'Havuz hızla boşaltıldı. Boşalma parçası dolma parçasından daha dik mi?', mis: 'Hızı çizginin dikliğiyle gösterememe' }],
  },
}

const E3: EditTask = {
  kind: 'edit',
  title: 'Sayılarla grafik',
  story: 'Kaan evden çıktı, 10 dakikada 500 m yürüyerek arkadaşına gitti. Orada 10 dakika kaldı. Sonra 5 dakikada koşarak eve döndü.',
  axes: { xMax: 30, yMax: 1000, xStep: 1, yStep: 50, xGrid: 5, xLabel: 'Zaman (dk)', yLabel: 'Evden uzaklık (m)', numbers: true },
  start: [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 16, y: 0 }, { x: 24, y: 0 }],
  spec: {
    start: { y: 0, q: 'Kaan yola evden başladı. 0. dakikada evden uzaklığı kaç metre?' },
    phases: [
      { kind: 'up', q: 'Kaan önce arkadaşına yürüdü. Evden uzaklaşırken grafik ne yapmalı?' },
      { kind: 'flat', q: 'Kaan arkadaşının yanında 10 dakika kaldı. Bu sürede evden uzaklığı değişir mi?' },
      { kind: 'down', q: 'Kaan sonunda eve döndü. Eve yaklaşırken evden uzaklık ne olur?' },
    ],
    checkpoints: [
      { x: 10, y: 500, q: '10. dakikada Kaan arkadaşına varmıştı. O anda evden kaç metre uzakta? Grafikte 10. dakikanın değerine bak.' },
      { x: 20, y: 500, q: 'Kaan arkadaşının yanında 10 dakika kaldı. Hangi dakikaya kadar orada? Düz parça nerede bitmeli?' },
      { x: 25, y: 0, q: 'Kaan 5 dakikada eve döndü. Hangi dakikada evde olur? O anda evden uzaklığı kaç?' },
    ],
  },
  follow: { kind: 'num', q: 'Kaan eve dönerken dakikada kaç metre koştu?', answer: 100, unit: 'm', hint: '5 dakikada 500 m. Bir dakikada?' },
}

const E4: EditTask = {
  kind: 'edit',
  title: 'Depo dolarken',
  story: 'Bir depoda 200 L su var. Musluk açılınca depoya dakikada 40 L su doluyor. 10 dakika sonra musluk kapanıyor ve depo 5 dakika öyle kalıyor.',
  axes: { xMax: 20, yMax: 800, xStep: 1, yStep: 20, xGrid: 2, xLabel: 'Zaman (dk)', yLabel: 'Su (L)', numbers: true },
  start: [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 16, y: 0 }],
  spec: {
    start: { y: 200, q: 'Başlangıçta depoda kaç litre su var? Grafiğin ilk noktası 0. dakikada hangi değerde olmalı?', mis: 'Başlangıç değerini (y kesişimini) sıfır sanma' },
    phases: [
      { kind: 'up', q: 'Musluk açıkken depodaki su ne olur?' },
      { kind: 'flat', q: 'Musluk kapanınca depodaki su miktarı değişir mi?' },
    ],
    checkpoints: [
      { x: 10, y: 600, q: '10 dakikada depoya kaç litre su eklenir? 200 L’nin üstüne eklersen 10. dakikada kaç litre olur?' },
      { x: 15, y: 600, q: 'Musluk 10. dakikada kapandı ve depo 5 dakika öyle kaldı. Düz parça hangi dakikaya kadar sürmeli?' },
    ],
  },
  follow: {
    kind: 'chips',
    q: 'İlk 10 dakikayı hangi kural anlatıyor? (x: dakika, y: litre)',
    options: [
      { text: 'y = 40x + 200', ok: true },
      { text: 'y = 200x + 40', ok: false, why: 'Her dakika 200 L mi ekleniyor, 40 L mi? x’in katsayısı her dakikadaki artışı gösterir.' },
      { text: 'y = 40x', ok: false, why: 'x = 0 iken depoda kaç litre su var? y = 40x bunu veriyor mu?' },
      { text: 'y = 600x', ok: false, why: '600, 10. dakikadaki değer. Bir dakikada kaç litre ekleniyor?' },
    ],
  },
}

export function makeTasks(grade: Grade): Task[] {
  if (grade === 5) return [M1(false), E1, W1(false), M2(false), E2]
  if (grade === 6) return [M1(true), E1, W1(false), M2(true), E2, W2(false)]
  if (grade === 7) return [M3(false), W1(true), E3, M2(true), W2(true)]
  return [M3(true), E4, W1(true), E3, W2(true)]
}
