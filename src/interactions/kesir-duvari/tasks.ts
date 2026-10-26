import type { Grade } from '../../data/types'

/**
 * Kesir Duvarı görevleri.
 *  - cover: Hedef uzunluğu (n/d) kesir çubuklarıyla tam ört. Her farklı örtü bir çözüm.
 *  - ruler: Hazır duvarda dikey cetveli kaydır; en az `minRows` sıranın çizgisinin buluştuğu yerleri bul (denklik).
 *  - order: Kesirleri önce sembolle sırala, sonra duvarda gerçek uzunluklarıyla kanıtla.
 */

export type Frac = { n: number; d: number }

export interface CoverTask {
  kind: 'cover'
  target: Frac
  tray: number[]
  goal: number
  /** Bir sırada farklı büyüklükte çubuklar kullanılabilir mi? */
  mixed?: boolean
  /** Görevin bitmesi için en az bir karışık örtü gerekir */
  needMixed?: boolean
  /** Her örtüde en az bu kadar farklı büyüklük */
  minKinds?: number
  /** Her örtüde en çok bu kadar çubuk */
  maxPieces?: number
  /** Önce tahmin: "Kaç tane 1/d gerekir?" */
  predict?: { d: number; choices: number[] }
  prompt: string
  title: string
  strategy?: boolean
}

export interface RulerTask {
  kind: 'ruler'
  rows: number[]
  minRows: number
  goal: number
  prompt: string
  title: string
}

export interface OrderTask {
  kind: 'order'
  items: Frac[]
  prompt: string
  title: string
}

export type Task = CoverTask | RulerTask | OrderTask

const f = (n: number, d: number): Frac => ({ n, d })

export function makeTasks(grade: Grade): Task[] {
  if (grade <= 3)
    return [
      { kind: 'cover', title: 'Bütünü ört', target: f(1, 1), tray: [2, 3, 4, 6, 8], goal: 3, prompt: 'Bütünün altındaki boş sırayı **aynı büyüklükte** çubuklarla tam ört. 3 farklı yol bul!' },
      { kind: 'cover', title: 'Yarımı ört', target: f(1, 2), tray: [3, 4, 6, 8], goal: 2, predict: { d: 4, choices: [2, 3, 4] }, prompt: 'Hangi çubuklar [[1/2]]’yi tam örter? 2 farklı yol bul.', strategy: true },
      { kind: 'order', title: 'Parçaları sırala', items: [f(1, 4), f(1, 2), f(1, 8), f(1, 3)], prompt: 'Bu parçaları en büyükten en küçüğe sırala. Sonra duvarda kontrol et!' },
      { kind: 'cover', title: 'Çeyreği ört', target: f(1, 4), tray: [3, 6, 8], goal: 1, prompt: 'Hangi çubuklar [[1/4]]’ü tam örter? Hepsini dene.' },
      { kind: 'cover', title: 'Üç çeyreği ört', target: f(3, 4), tray: [2, 3, 4, 8], goal: 2, prompt: '[[3/4]] kadar yer var. Aynı büyüklükte çubuklarla 2 farklı yolla ört.', strategy: true },
    ]
  if (grade === 4)
    return [
      { kind: 'cover', title: 'Yarımın adları', target: f(1, 2), tray: [3, 4, 5, 6, 8, 10, 12], goal: 4, predict: { d: 8, choices: [2, 4, 6, 8] }, prompt: '[[1/2]]’yi aynı büyüklükte çubuklarla tam ört. 4 farklı yol bul!' },
      { kind: 'cover', title: 'Üçte biri ört', target: f(1, 3), tray: [2, 4, 5, 6, 8, 12], goal: 2, prompt: 'Hangi çubuklar [[1/3]]’ü tam örter? 2 yol bul.', strategy: true },
      { kind: 'ruler', title: 'Duvar cetveli', rows: [2, 3, 4, 6, 8, 12], minRows: 3, goal: 3, prompt: 'Kırmızı cetveli kaydır. En az **3 sıranın** çizgisinin buluştuğu 3 yer bul. Orada hangi kesirler aynı uzunlukta?' },
      { kind: 'order', title: 'Birim kesirleri sırala', items: [f(1, 5), f(1, 3), f(1, 10), f(1, 4), f(1, 8)], prompt: 'Birim kesirleri en büyükten en küçüğe sırala, sonra duvarda kanıtla.' },
      { kind: 'cover', title: 'İki üçte bir', target: f(2, 3), tray: [2, 4, 6, 8, 12], goal: 2, prompt: '[[2/3]]’ü aynı büyüklükte çubuklarla 2 farklı yolla ört.' },
      { kind: 'cover', title: 'Üç çeyrek', target: f(3, 4), tray: [2, 3, 6, 8, 12], goal: 2, prompt: '[[3/4]]’ü 2 farklı yolla ört. Hangi çubuklar işe yaramıyor, neden?', strategy: true },
    ]
  if (grade === 5)
    return [
      { kind: 'cover', title: 'Yarımı karışık ört', target: f(1, 2), tray: [3, 4, 6, 8, 10, 12], goal: 3, mixed: true, needMixed: true, prompt: '[[1/2]]’yi 3 farklı yolla ört. En az birinde **farklı büyüklükte** çubukları birlikte kullan.' },
      { kind: 'ruler', title: 'Duvar cetveli', rows: [2, 3, 4, 5, 6, 8, 10, 12], minRows: 3, goal: 4, prompt: 'Cetveli kaydır: en az 3 sıranın çizgisinin buluştuğu 4 yer bul. Her yerin kaç adı var?' },
      { kind: 'cover', title: 'Beşte üç', target: f(3, 5), tray: [2, 4, 10, 6], goal: 2, mixed: true, prompt: '[[3/5]]’i 2 farklı yolla ört. Karışık çubuk kullanabilirsin.', strategy: true },
      { kind: 'cover', title: 'Altıda beş', target: f(5, 6), tray: [2, 3, 4, 12], goal: 2, mixed: true, needMixed: true, prompt: '[[5/6]]’yı 2 yolla ört; biri yalnızca **2 farklı büyüklükte** çubukla olsun.' },
      { kind: 'cover', title: 'Bütünü üç çeşitle', target: f(1, 1), tray: [2, 3, 4, 6, 8, 12], goal: 2, mixed: true, minKinds: 3, prompt: 'Bütünü örten bir sıra yap: her sırada **en az 3 farklı büyüklükte** çubuk olsun. 2 yol bul!' },
      { kind: 'order', title: 'Duvarla sırala', items: [f(2, 3), f(3, 5), f(3, 4), f(5, 12)], prompt: 'Bu kesirleri en büyükten en küçüğe sırala. [[1/2]] ve 1’e uzaklık sana yardım edebilir.' },
    ]
  return [
    { kind: 'cover', title: 'Beşte iki', target: f(2, 5), tray: [3, 4, 10, 15], goal: 2, prompt: '[[2/5]]’i aynı büyüklükte çubuklarla 2 yolla ört. Onda birlik çubukta ondalık adı da var!' },
    { kind: 'ruler', title: 'Duvar cetveli', rows: [2, 3, 4, 5, 6, 8, 10, 12], minRows: 3, goal: 5, prompt: 'Cetveli kaydır: en az 3 sıranın buluştuğu 5 yer bul. Ondalık adı olanlar hangileri?' },
    { kind: 'cover', title: 'En az çubukla', target: f(7, 12), tray: [2, 3, 4, 6, 12], goal: 2, mixed: true, maxPieces: 2, prompt: '[[7/12]]’yi **yalnızca 2 çubukla** ört. 2 farklı yol var!', strategy: true },
    { kind: 'cover', title: 'Altıda beş', target: f(5, 6), tray: [2, 3, 4, 6, 12], goal: 3, mixed: true, needMixed: true, prompt: '[[5/6]]’yı 3 farklı yolla ört; en az biri karışık olsun.' },
    { kind: 'cover', title: 'Mısır kesirleri', target: f(1, 1), tray: [2, 3, 4, 5, 6, 8, 10, 12], goal: 2, mixed: true, minKinds: 3, prompt: 'Eski Mısırlılar kesirleri birim kesirlerin toplamı olarak yazardı. Bütünü **en az 3 farklı** birim kesirle ört. 2 yol bul!' },
    { kind: 'order', title: 'Duvarla sırala', items: [f(5, 8), f(7, 12), f(2, 3), f(3, 5), f(4, 10)], prompt: 'En büyükten en küçüğe sırala, sonra duvarda kanıtla. [[1/2]]’ye ve 1’e uzaklığı düşün.' },
  ]
}
