import type { Grade } from '../../../data/types'
import type { Num } from './frac'
import type { IslandKind } from './Chart'

interface Base {
  title: string
  prompt: string
  view: [number, number]
  range: [number, number]
  dens: number[]
  /** 10'a bölününce ondalık mod (yakınlaştırınca yüzde birler) */
  decimal?: boolean
  half?: boolean
  minSpan?: number
}

export type Level =
  | (Base & { kind: 'place'; target: Num; refine: string; island: IslandKind; name: string })
  | (Base & { kind: 'order'; cards: Num[]; trap?: 'unit' | 'decimal' })
  | (Base & { kind: 'harbor'; target: Num; goal: number; pattern: string })
  | (Base & { kind: 'between'; a: Num; b: Num; goal: number })
  | (Base & { kind: 'compare'; a: Num; b: Num; equal?: boolean; nudgeA: string; nudgeEq?: string; misconception: string; strategies: string[] })
  | (Base & { kind: 'share'; total: number; frac: Num; groups: number[] })

const F = (n: number, d: number): Num => ({ n, d })
const M = (n: number, d: number): Num => ({ n, d, fmt: 'mixed' })
const D = (n: number, d: number): Num => ({ n, d, fmt: 'dec' })

const g4: Level[] = [
  {
    kind: 'place', title: 'Martı Adası', name: 'Martı Adası', island: 'palm', half: true,
    prompt: 'Martı Adası, fenerden [[3/4]] yol uzakta. Önce tekneyi tahmin ettiğin yere sürükle ve “Çapa at”a bas.',
    refine: 'Şimdi rotayı eş parçalara böl ve tekneyi tam [[3/4]] noktasına götür.',
    target: F(3, 4), view: [-0.14, 1.18], range: [0, 1], dens: [2, 3, 4, 5, 6, 8],
  },
  {
    kind: 'order', title: 'Birim kesir adaları', half: true, trap: 'unit',
    prompt: 'Dört adanın her biri birim kesir uzaklıkta. Fenere en yakın adadan en uzağa doğru adalara dokunarak rotanı çiz.',
    cards: [F(1, 4), F(1, 2), F(1, 8), F(1, 3)], view: [-0.14, 1.18], range: [0, 1], dens: [2, 3, 4, 6, 8],
  },
  {
    kind: 'compare', title: 'Köprü kur', half: true,
    prompt: 'Köprü, fenerden daha uzaktaki adaya kurulacak. Hangi ada daha uzakta? İstersen önce rotada tekneyle araştır.',
    a: F(5, 8), b: F(3, 8), view: [-0.14, 1.18], range: [0, 1], dens: [2, 4, 8],
    nudgeA: 'İki kesirde de bütün 8 eş parçaya bölünmüş; parçalar aynı büyüklükte. Hangisinde daha çok parça var?',
    misconception: 'Paydaları eşit kesirleri karşılaştırırken payı küçük olanı büyük sandı',
    strategies: ['Parçaları saydım', 'Şeritlere baktım', 'Yarımla karşılaştırdım'],
  },
  {
    kind: 'harbor', title: 'Aynı liman', half: true, goal: 3,
    prompt: 'Altın liman tam [[1/2]] noktasında. Bu limana başka hangi kesir adlarıyla varabilirsin? Rotayı farklı biçimlerde böl ya da yakınlaştır.',
    pattern: 'Hepsinde bütünün yarısı kadar parça var: pay, paydanın yarısı!',
    target: F(1, 2), view: [-0.14, 1.18], range: [0, 1], dens: [2, 3, 4, 5, 6, 8, 10],
  },
  {
    kind: 'share', title: 'Yük iskelesi',
    prompt: 'İskelede 12 sandık var. Kaptan, sandıkların [[3/4]]’ünün gemiye yüklenmesini istiyor. Sandıkları eş gruplara ayır ve doğru sayıda sandık yükle.',
    total: 12, frac: F(3, 4), groups: [2, 3, 4, 5, 6], view: [0, 1], range: [0, 1], dens: [],
  },
  {
    kind: 'place', title: 'Kaya Adası', name: 'Kaya Adası', island: 'rock', half: true,
    prompt: 'Kaya Adası fenerden [[2/3]] yol uzakta. [[1/2]] şamandırasını kullanarak tahmin et ve “Çapa at”a bas.',
    refine: 'Rotayı eş parçalara böl ve tekneyi tam [[2/3]] noktasına götür.',
    target: F(2, 3), view: [-0.14, 1.18], range: [0, 1], dens: [2, 3, 4, 5, 6, 8],
  },
]

const g5: Level[] = [
  {
    kind: 'place', title: 'Fener Adası', name: 'Fener Adası', island: 'house', half: true,
    prompt: 'Fener Adası [[7/4]] yol uzakta. Bir bütünü geçecek misin? Tahmin et ve “Çapa at”a bas.',
    refine: 'Rotayı eş parçalara böl ve tekneyi tam [[7/4]] noktasına götür.',
    target: F(7, 4), view: [-0.16, 2.35], range: [0, 2.25], dens: [2, 3, 4, 5, 6, 8],
  },
  {
    kind: 'compare', title: 'Yarım çizgisi', half: true,
    prompt: 'Köprü, fenerden daha uzaktaki adaya kurulacak. [[5/12]] mi, [[4/7]] mi? Sayılar seni yanıltmasın; [[1/2]] şamandırası yardımcı olabilir.',
    a: F(4, 7), b: F(5, 12), view: [-0.14, 1.18], range: [0, 1], dens: [2, 3, 4, 6, 7, 12],
    nudgeA: 'Pay ve payda daha büyük diye kesir büyük olmaz. [[5/12]] yarımdan az mı, çok mu? 12 parçanın yarısı kaç parça? Peki [[4/7]]?',
    misconception: 'Kesirleri pay ve paydanın doğal sayı büyüklüğüne bakarak karşılaştırdı',
    strategies: ['Yarımla karşılaştırdım', 'Ortak paydaya çevirdim', 'Rotada yerleştirdim'],
  },
  {
    kind: 'compare', title: 'Eksik parça', half: true, equal: true,
    prompt: 'İki ada da 1 bütüne çok yakın: [[6/7]] ve [[7/8]]. Köprü daha uzaktakine kurulacak. Hangisi? Yoksa eşit mi?',
    a: F(7, 8), b: F(6, 7), view: [-0.14, 1.18], range: [0, 1], dens: [2, 4, 7, 8],
    nudgeA: 'İkisinde de 1’e bir parça eksik. Ama eksik parça hangisinde daha küçük: [[1/7]] mi, [[1/8]] mi?',
    nudgeEq: 'İkisine de bir parça eksik, ama parçalar aynı büyüklükte mi? [[1/7]] ile [[1/8]]’i şeritte karşılaştır.',
    misconception: 'Bütüne bir parça eksik olan kesirlerin eşit olduğunu düşündü (parça büyüklüğünü göz ardı etti)',
    strategies: ['1’e kalan parçaya baktım', 'Ortak paydaya çevirdim', 'Rotada yerleştirdim'],
  },
  {
    kind: 'harbor', title: 'Bir buçuk limanı', half: true, goal: 3,
    prompt: 'Altın liman [[3/2]] noktasında; bir bütünü geçiyor. Bu limana kaç farklı adla varabilirsin? Bileşik kesir ve tam sayılı kesir adlarını keşfet.',
    pattern: 'Hepsi 1 bütün ve bir yarım: [[3/2]] = [[6/4]] = [[1 1/2]]. Pay, paydanın bir buçuk katı!',
    target: F(3, 2), view: [-0.16, 2.35], range: [0, 2.25], dens: [2, 3, 4, 5, 6, 8],
  },
  {
    kind: 'order', title: 'Bütünü aşan adalar', half: true,
    prompt: 'Bu adaların bazıları 1 bütünü geçiyor. Fenere en yakından en uzağa doğru adalara dokunarak rotanı çiz.',
    cards: [F(5, 4), F(2, 3), M(4, 3), F(3, 2)], view: [-0.16, 2.35], range: [0, 2.25], dens: [2, 3, 4, 6, 12],
  },
  {
    kind: 'place', title: 'Uzak Ada', name: 'Uzak Ada', island: 'hill', half: true,
    prompt: 'Uzak Ada [[2 1/3]] yol uzakta. Önce kaç bütün gideceğini düşün, tahmin et ve “Çapa at”a bas.',
    refine: 'Rotayı eş parçalara böl ve tekneyi tam [[2 1/3]] noktasına götür.',
    target: M(7, 3), view: [-0.16, 3.3], range: [0, 3], dens: [2, 3, 4, 6],
  },
]

const g6: Level[] = [
  {
    kind: 'place', title: 'Mercan Adası', name: 'Mercan Adası', island: 'palm', decimal: true, minSpan: 0.03,
    prompt: 'Mercan Adası 0,35 yol uzakta. Önce tahmin et ve “Çapa at”a bas.',
    refine: 'Rotayı 10’a böl, sonra iki parmakla yakınlaştır: yüzde birler belirecek. Tekneyi tam 0,35’e götür.',
    target: D(35, 100), view: [-0.12, 1.15], range: [0, 1], dens: [2, 4, 5, 8, 10],
  },
  {
    kind: 'harbor', title: 'Çeyrek limanı', decimal: true, goal: 3, minSpan: 0.03,
    prompt: 'Altın liman [[1/4]] noktasında. Hem kesir hem ondalık adlarla buraya varabilirsin. En az üç farklı ad bul.',
    pattern: '[[1/4]], [[2/8]], [[3/12]] ve 0,25 aynı noktadır: aynı sayının farklı adları!',
    target: F(1, 4), view: [-0.12, 1.15], range: [0, 1], dens: [2, 4, 8, 10, 12],
  },
  {
    kind: 'compare', title: 'Ondalık mı, kesir mi?', decimal: true, equal: true, minSpan: 0.03,
    prompt: 'Köprü daha uzaktaki adaya kurulacak: 0,45 mi, [[2/5]] mi? Yoksa eşitler mi?',
    a: D(45, 100), b: F(2, 5), view: [-0.12, 1.15], range: [0, 1], dens: [2, 4, 5, 10],
    nudgeA: '[[2/5]] kaç onda bire eşit? Rotayı önce 5’e, sonra 10’a bölüp aynı noktaya bak. 0,45 ise kaç yüzde bir?',
    nudgeEq: 'Eşit olsalardı rotada aynı noktaya düşerlerdi. [[2/5]] = [[4/10]] = 0,4 olur mu? 0,45 ile karşılaştır.',
    misconception: 'Kesir ile ondalık gösterimi karşılaştırırken basamak değerini göz ardı etti',
    strategies: ['Kesri ondalığa çevirdim', 'Ondalığı kesre çevirdim', 'Rotada yerleştirdim'],
  },
  {
    kind: 'order', title: 'Karışık takımada', decimal: true, trap: 'decimal', minSpan: 0.03,
    prompt: 'Kesirler ve ondalıklar aynı denizde! Fenere en yakından en uzağa doğru adalara dokunarak rotanı çiz.',
    cards: [D(6, 10), F(5, 8), D(55, 100), F(2, 5)], view: [-0.12, 1.15], range: [0, 1], dens: [2, 4, 5, 8, 10],
  },
  {
    kind: 'between', title: 'Aradaki ada', goal: 2, decimal: true, minSpan: 0.02,
    prompt: '[[2/5]] ile [[1/2]] arasında yeni adalar kurmak istiyoruz. Aralarında bir kesir ya da ondalık bul. Yakınlaştırmak işe yarayabilir!',
    a: F(2, 5), b: F(1, 2), view: [-0.12, 1.15], range: [0, 1], dens: [2, 4, 5, 8, 10],
  },
  {
    kind: 'between', title: 'Yoğun deniz', goal: 2, decimal: true, minSpan: 0.012,
    prompt: '0,3 ile 0,31 o kadar yakın ki arada hiç yer yok gibi. Gerçekten yok mu? Yakınlaştır ve iki yeni ada kur.',
    a: D(3, 10), b: D(31, 100), view: [-0.12, 1.15], range: [0, 1], dens: [10],
  },
]

export function makeLevels(grade: Grade): Level[] {
  if (grade <= 4) return g4
  if (grade === 5) return g5
  return g6
}
