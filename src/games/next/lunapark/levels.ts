import type { Grade } from '../../../data/types'

/* ───────────── Görev türleri ───────────── */

/** Dönme dolap tasarımı: kabin × koltuk × tur = need (tam) */
export interface WheelLevel {
  kind: 'wheel'
  need: number
  /** Bir saatteki/akşamki tur sayısı (1 → tek tur) */
  turns: number
  turnWord: 'tur' | 'saat'
  seatOpts: number[]
  maxCabins: number
  start: [number, number]
  goal: number
  /** 5. sınıf: maliyet (kabin başı, koltuk başı) → en ucuzunu seç */
  cost?: { cabin: number; seat: number }
}

/** Kabinlere bindirme: bölme (kalanı yorumlama) */
export interface LoadLevel {
  kind: 'load'
  people: number
  seats: number
  ask: 'needed' | 'full'
  chunks: number[]
  /** Kabin başına kiralama ücreti (5. sınıf, çok adımlı) */
  costPer?: number
  estimate?: { options: string[]; correct: number }
  question: string
}

export interface TicketType { id: string; n: number; price: number; label: string; color: string }
/** Bilet paketleri: tam ihtiyaç ya da en az ihtiyaç + bütçe */
export interface TicketLevel {
  kind: 'tickets'
  need: number
  who: string
  types: TicketType[]
  mode: 'exact' | 'atLeast'
  budget?: number
  goal: number
  follow: { q: string; kind: 'saving' | 'left' }
}

export interface RideItem { id: string; name: string; emoji: string; price: number; color: string }
/** Lunapark kartını tam harcama */
export interface SpendLevel {
  kind: 'spend'
  budget: number
  items: RideItem[]
  goal: number
}

/** 3. sınıf: çeteleden sütun grafiği oluştur, sonra karşılaştır */
export interface BarsLevel {
  kind: 'bars'
  data: { name: string; emoji: string; value: number; color: string }[]
  max: number
  question: { q: string; answer: number; diagnose: (n: number) => { msg: string; mis?: string } }
}

/** 4–5. sınıf: kapasite çizgisini aşan saatleri seç, sonra hesapla */
export interface PeakLevel {
  kind: 'peak'
  labels: string[]
  groups: { name: string; color: string; values: number[] }[]
  cap: number
  capLabel: string
  max: number
  question: { q: string; answer: number; unit: string; diagnose: (n: number) => { msg: string; mis?: string } }
}

export type RideId = 'dd' | 'ht' | 'ca' | 'ak' | 'kg' | 'ku'
export interface RideSpec { id: RideId; name: string; emoji: string; w: number; h: number; cost: number; cap: number; price: number; weight: number; color: string }

/** 5. sınıf: alan ve bütçe sınırlı park yerleşimi + günlük simülasyon */
export interface LayoutLevel {
  kind: 'layout'
  cols: number
  rows: number
  rides: RideId[]
  budget: number
  areaMax: number
  minRides: number
  obstacles: { x: number; y: number; w: number; h: number; label: string; kind: 'gol' | 'giris' }[]
  survey?: { id: RideId; votes: number }[]
  mustTop?: number
  goal: number
  askArea: boolean
}

export type Task = WheelLevel | LoadLevel | TicketLevel | SpendLevel | BarsLevel | PeakLevel | LayoutLevel

export interface Level {
  task: Task
  title: string
  prompt: string
  hints: string[]
  note?: string
  picker?: { q: string; options: string[] }
  /** Modelle dene aracı */
  tool?: 'dizilim' | 'bargraph' | 'grafiklab' | 'money'
}

/* ───────────── Sabitler ───────────── */

/** 1 kare = 5 m × 5 m */
export const CELL_M = 5

export const RIDES: Record<RideId, RideSpec> = {
  dd: { id: 'dd', name: 'Dönme dolap', emoji: '🎡', w: 4, h: 4, cost: 2_400_000, cap: 300, price: 120, weight: 5, color: '#f472b6' },
  ht: { id: 'ht', name: 'Hız treni', emoji: '🎢', w: 6, h: 3, cost: 3_200_000, cap: 240, price: 150, weight: 6, color: '#f97316' },
  ca: { id: 'ca', name: 'Çarpışan arabalar', emoji: '🚗', w: 4, h: 3, cost: 1_300_000, cap: 180, price: 90, weight: 4, color: '#38bdf8' },
  ak: { id: 'ak', name: 'Atlıkarınca', emoji: '🎠', w: 3, h: 3, cost: 800_000, cap: 200, price: 70, weight: 3, color: '#facc15' },
  kg: { id: 'kg', name: 'Korsan gemisi', emoji: '🏴‍☠️', w: 4, h: 2, cost: 1_100_000, cap: 160, price: 100, weight: 3, color: '#a78bfa' },
  ku: { id: 'ku', name: 'Serbest düşüş kulesi', emoji: '🗼', w: 2, h: 2, cost: 1_600_000, cap: 120, price: 130, weight: 4, color: '#34d399' },
}

/** Simülasyonda saat saat parka gelen ziyaretçi (10.00–18.00) */
export const ARRIVALS = [300, 450, 620, 760, 720, 600, 420, 260]

export const tl = (n: number) => `${n.toLocaleString('tr-TR')} TL`
export const num = (n: number) => n.toLocaleString('tr-TR')

/* ───────────── Seviyeler ───────────── */

export function makeLevels(grade: Grade): Level[] {
  if (grade <= 3) {
    return [
      {
        task: { kind: 'load', people: 32, seats: 4, ask: 'needed', chunks: [1], question: 'Kaç kabin doldu?' },
        title: 'Kabinlere bindir',
        prompt: 'Sırada 32 çocuk var. Dönme dolabın her kabininde 4 koltuk var. “Kabin doldur” düğmesiyle çocukları bindir. Herkes binince kaç kabin dolmuş olur?',
        hints: ['Her kabine 4 çocuk biniyor. Dörder say: 4, 8, 12, …', '32’ye ulaşınca dur. Kaç kabin doldurdun?'],
        note: '4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 = 32, yani 8 × 4 = 32. 32 ÷ 4 = 8 kabin.',
        tool: 'dizilim',
      },
      {
        task: { kind: 'wheel', need: 24, turns: 1, turnWord: 'tur', seatOpts: [2, 3, 4, 6], maxCabins: 12, start: [4, 2], goal: 3 },
        title: 'Dolabını tasarla',
        prompt: 'Yeni bir dönme dolap yapıyoruz! Bir turda tam 24 kişi binebilmeli, boş koltuk kalmamalı. Kabin sayısını ve kabindeki koltuk sayısını seç. 3 farklı dolap tasarla!',
        hints: ['Kabinlerde 4 koltuk olsun: kaç kabin 24 eder? Dörder say.', 'Koltuk sayısını ikiye katlarsan kabin sayısına ne olur?', '2’şer, 3’er, 4’er, 6’şar sayarak 24’e ulaşmayı dene.'],
        note: '12 × 2, 8 × 3, 6 × 4, 4 × 6: hepsi 24! Koltuk artınca kabin sayısı azalıyor.',
        picker: { q: 'Yeni dolapları nasıl buldun?', options: ['Ritmik sayma', 'Koltuk sayısını ikiye katlayıp kabini yarıladım', 'Çarpım tablosunu düşündüm', 'Deneyerek'] },
        tool: 'dizilim',
      },
      {
        task: {
          kind: 'spend', budget: 300, goal: 3,
          items: [
            { id: 'ak', name: 'Atlıkarınca', emoji: '🎠', price: 40, color: '#facc15' },
            { id: 'dd', name: 'Dönme dolap', emoji: '🎡', price: 60, color: '#f472b6' },
            { id: 'ca', name: 'Çarpışan araba', emoji: '🚗', price: 80, color: '#38bdf8' },
          ],
        },
        title: 'Kartı harca',
        prompt: 'Lunapark kartında 300 TL var. Oyuncaklara bin, kartta hiç para kalmasın! Kartı tam 300 TL harcamanın 3 farklı yolunu bul.',
        hints: ['Yalnız dönme dolaba binsen kaç kez binebilirsin? 60, 120, …', 'Kartta 40 TL kaldıysa hangi oyuncağa binebilirsin?', 'Bir çarpışan araba (80 TL) iki atlıkarıncayla (40 + 40) aynı paraya!'],
        note: 'Aynı 300 TL’yi farklı oyuncaklarla harcadın. Toplamı aynı tutan farklı parçalar bulmak matematikçilerin işi!',
        picker: { q: 'Nasıl planladın?', options: ['Önce pahalı bileti aldım', 'Kalan paraya baktım', 'Bir bileti iki ucuz biletle değiştirdim', 'Deneyerek'] },
        tool: 'money',
      },
      {
        task: {
          kind: 'tickets', need: 7, who: 'çocuk', mode: 'exact', goal: 2,
          types: [
            { id: 't1', n: 1, price: 60, label: 'Tek bilet', color: '#f472b6' },
            { id: 't4', n: 4, price: 200, label: '4’lü paket', color: '#8b5cf6' },
          ],
          follow: { q: 'Paket kullanan yol, yalnız tek bilet alan yoldan kaç TL daha ucuz?', kind: 'saving' },
        },
        title: 'Bilet gişesi',
        prompt: '7 arkadaş dönme dolaba binecek. Tek bilet 60 TL, 4’lü paket 200 TL. Herkese birer bilet al, fazla bilet kalmasın. 2 farklı yol bul ve karşılaştır!',
        hints: ['Hepsine tek bilet alırsan: 60, 120, 180, … diye say.', '4’lü paketle 4 kişi bilet alır. Geriye kaç kişi kalır?'],
        note: '7 × 60 = 420 TL; 200 + 3 × 60 = 380 TL. Paket kullanınca 40 TL kazançlı!',
      },
      {
        task: {
          kind: 'bars', max: 15,
          data: [
            { name: 'Dönme dolap', emoji: '🎡', value: 8, color: '#f472b6' },
            { name: 'Atlıkarınca', emoji: '🎠', value: 12, color: '#facc15' },
            { name: 'Çarpışan araba', emoji: '🚗', value: 10, color: '#38bdf8' },
            { name: 'Gondol', emoji: '⛵', value: 5, color: '#a78bfa' },
          ],
          question: {
            q: 'Atlıkarıncaya binen çocuk sayısı, gondola binenlerden kaç fazla?',
            answer: 7,
            diagnose: (n) => (n === 17 ? { msg: 'İki sütunu topladın. “Kaç fazla” sorusunda iki sütunun boyları arasındaki farka bakarız. Gondol sütununun tepesinden atlıkarıncaya kadar kaç kare var?', mis: '“Kaç fazla” sorusunda toplama yaptı' } : n === 12 || n === 5 ? { msg: 'Bu sayı tek bir sütunun boyu. İki sütunu yan yana düşün: biri ötekinden kaç kare uzun?' } : { msg: 'Grafikte iki sütunu karşılaştır. Kısa olanın tepesinden uzun olanın tepesine kadar say.' }),
          },
        },
        title: 'Ziyaretçi grafiği',
        prompt: 'Sabah her oyuncağın girişinde çocuklar çetele tuttu. Çetelelere bakarak sütun grafiğini sen oluştur! Sütunun tepesini sürükle ya da ▲ ▼ düğmelerini kullan.',
        hints: ['Çetelede her demet 5 çocuk demek. Önce demetleri say: 5, 10, …', 'Grafiğin solundaki sayılara bakarak sütunu doğru çizgiye kadar uzat.'],
        note: 'Grafik, çetelenin aynısını anlatıyor: sütunlar karşılaştırmayı bir bakışta gösterir.',
        tool: 'bargraph',
      },
      {
        task: { kind: 'wheel', need: 48, turns: 4, turnWord: 'tur', seatOpts: [2, 3, 4, 6], maxCabins: 12, start: [5, 2], goal: 2 },
        title: 'Akşam turları',
        prompt: 'Akşam sırada 48 çocuk var. Dolap 4 tur dönecek: 4 turun sonunda herkes binmiş olmalı, hiç koltuk boş kalmamalı. Her turda kaç kişi binmeli? Dolabını kur ve “Turları başlat”a bas. 2 farklı dolap bul!',
        hints: ['48 çocuğu 4 tura eşit paylaştır: her turda kaç çocuk biner?', 'Her turda 12 kişi binecekse: 12 = kabin × koltuk. 3 koltuklu kabinden kaç tane gerekir?'],
        note: '48 ÷ 4 = 12 kişi her turda. 12 = 6 × 2 = 4 × 3 = 3 × 4 = 2 × 6.',
        tool: 'dizilim',
      },
    ]
  }

  if (grade === 4) {
    return [
      {
        task: { kind: 'wheel', need: 288, turns: 6, turnWord: 'saat', seatOpts: [4, 6, 8], maxCabins: 16, start: [10, 4], goal: 2 },
        title: 'Saatlik kapasite',
        prompt: 'Hafta sonu saatte 288 ziyaretçi dolaba binmek istiyor. Dolap 10 dakikada bir tur atıyor, yani saatte 6 tur. Kuyruk birikmesin, koltuk da boş kalmasın! Kabin (en çok 16) ve koltuk sayısını seç, “1 saati başlat”a bas. 2 farklı dolap bul.',
        hints: ['Önce bir turda kaç kişi binmesi gerektiğini bul: 288 kişi 6 tura eşit bölünür.', 'Bir turda 48 kişi: 48 = kabin × koltuk. 6 koltuklu kabinden kaç tane?', '12 × 4 bulduysan koltuğu ikiye katla, kabini yarıla.'],
        note: '288 ÷ 6 = 48 kişi her turda. 12 × 4 = 8 × 6 = 6 × 8 = 48: farklı dolaplar, aynı kapasite!',
        picker: { q: 'Bir turdaki kişi sayısını nasıl buldun?', options: ['Zihinden bölme', '6 × ? = 288 diye düşündüm', 'Deneyerek ve simülasyonla', 'Çarpanlara ayırma'] },
      },
      {
        task: {
          kind: 'load', people: 157, seats: 6, ask: 'needed', chunks: [1, 5, 10], question: 'Herkesin binmesi için kaç kabin gerekir?',
          estimate: { options: ['20’den az', '20 ile 30 arası', '30’dan çok'], correct: 1 },
        },
        title: 'Okul gezisi',
        prompt: '157 kişilik okul gezisi geldi! Her kabinde 6 koltuk var. Herkesin binmesi için kaç kabin gerekir? Önce tahmin et, sonra kabinleri 10’ar, 5’er ya da tek tek doldurarak ya da hesaplayarak bul.',
        hints: ['10 kabin 60 kişi taşır. 157 kişide kaç tane 60 var?', '26 kabin 156 kişi taşır. Geriye kalan 1 kişi ne olacak?'],
        note: '157 ÷ 6 = 26, kalan 1. Kalan 1 kişi de binmeli; bu yüzden 27 kabin gerekir!',
        picker: { q: 'Nasıl buldun?', options: ['Gruplarla doldurma (10’ar, 5’er kabin)', 'Tek tek kabin doldurma', 'Zihinden bölme', 'Tahmin edip düzelttim'] },
      },
      {
        task: { kind: 'load', people: 250, seats: 8, ask: 'full', chunks: [1, 5, 10], question: 'Kaç kabin tam dolu kalkar?' },
        title: 'Gece turu',
        prompt: 'Gece turunda 250 kişi var. Bu kez kural farklı: bir kabin ancak 8 kişi dolunca kalkıyor. Kaç kabin tam dolu kalkar? Kalanlar ne yapar?',
        hints: ['10 kabin kaç kişi taşır? 8 × 10 = ?', '31 kabin 248 kişi taşır. Geriye kalanlar bir kabini doldurabilir mi?'],
        note: '250 ÷ 8 = 31, kalan 2. Bu kez yalnızca dolu kabinler kalkıyor: 31 kabin, 2 kişi sonraki turu bekliyor.',
      },
      {
        task: {
          kind: 'peak', max: 360, cap: 288, capLabel: 'Dolabın kapasitesi: saatte 288 kişi',
          labels: ['11.00', '13.00', '15.00', '17.00', '19.00'],
          groups: [
            { name: 'Cumartesi', color: '#f472b6', values: [180, 260, 310, 270, 200] },
            { name: 'Pazar', color: '#38bdf8', values: [220, 300, 340, 250, 160] },
          ],
          question: {
            q: 'Pazar 15.00’te bir saatte dolaba binemeyen kaç kişi kuyrukta kalır?',
            answer: 52, unit: 'kişi',
            diagnose: (n) => (n === 628 ? { msg: 'Gelenlerle kapasiteyi topladın. Gelen 340 kişiden 288’i binebiliyor; binemeyenler kaç kişi?', mis: 'Fark sorusunda toplama yaptı' } : n === 340 || n === 288 ? { msg: 'Bu, sütunlardan birinin değeri. Kuyrukta kalanlar, sütunun kapasite çizgisini aşan kısmı. Ne kadar aşıyor?' } : n === 30 ? { msg: '30 kişi Cumartesi 15.00’in farkı. Pazar sütununa bak.' } : { msg: 'Pazar 15.00 sütunu 340. Kapasite 288. Çizginin üstünde kalan kısım kaç kişi?' }),
          },
        },
        title: 'Kuyruk ne zaman?',
        prompt: 'Grafikte geçen hafta sonu dolaba gelen ziyaretçiler var. Dolap saatte 288 kişi taşıyabiliyor. Hangi saatlerde kuyruk oluşur? O sütunlara dokun, sonra “Kontrol et”e bas.',
        hints: ['Kapasite çizgisini bul. Hangi sütunların tepesi çizginin üstünde?', 'İki günün sütunlarını da kontrol et: pembe Cumartesi, mavi Pazar.'],
        note: 'Kapasite çizgisinin üstündeki her kişi kuyrukta bekler. Planlama yaparken en kalabalık saate bakarız.',
        tool: 'grafiklab',
      },
      {
        task: {
          kind: 'tickets', need: 8, who: 'kişi', mode: 'exact', goal: 3,
          types: [
            { id: 't1', n: 1, price: 75, label: 'Tek bilet', color: '#f472b6' },
            { id: 't3', n: 3, price: 200, label: '3’lü paket', color: '#8b5cf6' },
            { id: 't5', n: 5, price: 300, label: '5’li aile paketi', color: '#0ea5e9' },
          ],
          follow: { q: 'En ucuz yolla alırsan, 8 tek bilete göre kaç TL tasarruf edersin?', kind: 'saving' },
        },
        title: 'Paket mi, tek mi?',
        prompt: 'İki aile birlikte geldi: 8 kişi. Tek bilet 75 TL, 3’lü paket 200 TL, 5’li aile paketi 300 TL. Herkese birer bilet al, fazla bilet kalmasın. 3 farklı yol bul, sonra en ucuzunu düşün!',
        hints: ['8 = 5 + 3 olabilir mi? 8 = 3 + 3 + 2 olabilir mi?', 'Paketlerde bir bilet kaç TL’ye geliyor? 300 TL ÷ 5 kişi = ?'],
        note: 'Bilet başına: tek 75 TL, 3’lüde yaklaşık 67 TL, 5’lide 60 TL. Büyük paket daha ucuz, ama tam 8 bilet olmalı: 5’li + 3’lü = 500 TL.',
        picker: { q: 'En ucuz yolu nasıl buldun?', options: ['Paketlerin bilet başı fiyatını karşılaştırdım', 'Tüm yolların toplamını hesapladım', 'Önce büyük paketi aldım', 'Deneyerek'] },
      },
      {
        task: {
          kind: 'spend', budget: 600, goal: 3,
          items: [
            { id: 'ak', name: 'Atlıkarınca', emoji: '🎠', price: 90, color: '#facc15' },
            { id: 'dd', name: 'Dönme dolap', emoji: '🎡', price: 120, color: '#f472b6' },
            { id: 'ht', name: 'Hız treni', emoji: '🎢', price: 150, color: '#f97316' },
          ],
        },
        title: 'Kartı harca',
        prompt: 'Doğum günü hediyesi: 600 TL’lik lunapark kartı! Atlıkarınca 90 TL, dönme dolap 120 TL, hız treni 150 TL. Kartta hiç para kalmayacak şekilde 3 farklı plan yap.',
        hints: ['Yalnız hız trenine kaç kez binebilirsin? 600 ÷ 150 = ?', 'İki hız treni 2 × 150 = 300 TL eder. Aynı 300 TL’ye 120 + 90 + 90 da alınır!', 'Dönme dolap ve atlıkarıncayı karıştır: 4 × 90 = 360, kalan?'],
        note: 'Aynı 600 TL, farklı planlar. Bir bileti başka biletlerle değiştirmek (2 × 150 = 120 + 90 + 90) yeni planlar üretir.',
        picker: { q: 'Planları nasıl buldun?', options: ['Önce pahalı bileti aldım', 'Bir bileti başka biletlerle değiştirdim', 'Kalan paraya baktım', 'Deneyerek'] },
      },
    ]
  }

  // 5. sınıf
  return [
    {
      task: { kind: 'wheel', need: 360, turns: 6, turnWord: 'saat', seatOpts: [4, 6, 8, 10], maxCabins: 16, start: [10, 4], goal: 2, cost: { cabin: 180_000, seat: 15_000 } },
      title: 'Dolap ihalesi',
      prompt: 'Saatte 360 kişi taşıyan bir dönme dolap sipariş edeceğiz. Dolap saatte 6 tur atıyor; koltuk boş kalmamalı. Kabin (en çok 16) ve koltuk sayısını seç, “1 saati başlat”a bas. 2 farklı tasarım bul. Her kabin 180.000 TL, her koltuk 15.000 TL!',
      hints: ['Bir turda kaç kişi binmeli? 360 ÷ 6', 'Bir turda 60 kişi: 60 = kabin × koltuk. 10 koltuklu kabinden kaç tane?', 'Maliyet: kabin sayısı × 180.000 + toplam koltuk × 15.000.'],
      note: 'Bütün tasarımlarda 60 koltuk var, koltukların maliyeti aynı: 900.000 TL. Farkı kabin sayısı yaratıyor!',
    },
    {
      task: {
        kind: 'peak', max: 480, cap: 288, capLabel: 'Bugünkü dolap: 8 kabin × 6 koltuk × 6 tur = 288 kişi/saat',
        labels: ['10', '11', '12', '13', '14', '15', '16', '17'],
        groups: [{ name: 'Gelen ziyaretçi', color: '#8b5cf6', values: [180, 240, 300, 420, 390, 330, 260, 200] }],
        question: {
          q: 'En kalabalık saatte bile kuyruk olmasın istiyoruz. Her kabin 6 kişilik, dolap saatte 6 tur atıyor. Dolaba en az kaç kabin eklemeliyiz?',
          answer: 4, unit: 'kabin',
          diagnose: (n) => (n === 12 ? { msg: '12 kabin, dolabın toplam ihtiyacı. Ama dolapta zaten 8 kabin var. Kaç kabin eklenmeli?', mis: 'Toplam ile eklenecek miktarı karıştırdı' } : n === 3 ? { msg: '11 kabin bir turda 66 kişi taşır, 6 turda 396. 420 kişiye yetiyor mu? Kalan kişiler için ne gerekir?', mis: 'Kalanlı bölmede kalanı yok saydı' } : n === 70 ? { msg: '70, bir turda binmesi gereken kişi sayısı. Bu 70 kişi 6 kişilik kabinlere kaç kabin eder?' } : n === 11 ? { msg: '11 kabin yetmiyor ve dolapta zaten 8 kabin var. Önce toplam kaç kabin gerektiğini, sonra kaç tane ekleneceğini düşün.' } : { msg: 'Adım adım düşün: en kalabalık saat kaç kişi? Bir turda kaç kişi binmeli? Bu kaç kabin eder? Dolapta kaç kabin var?' }),
        },
      },
      title: 'Veriyle karar',
      prompt: 'Grafik dünkü ziyaretçileri saat saat gösteriyor. Bugünkü dolap saatte 288 kişi taşıyor. Önce kuyruk oluşan saatleri seç; sonra dolabı büyütmek için hesap yap.',
      hints: ['Çizginin üstündeki sütunlarda kuyruk oluşur.', 'En kalabalık saat 420 kişi. 420 ÷ 6 tur = bir turda kaç kişi?', 'Bir turda 70 kişi binmeli. 6 kişilik kabinlerle 70 kişi için kaç kabin gerekir? Kalanı unutma!'],
      note: '420 ÷ 6 = 70 kişi her turda; 70 ÷ 6 = 11, kalan 4 → 12 kabin. Dolapta 8 var: 4 kabin eklenmeli.',
      tool: 'grafiklab',
    },
    {
      task: {
        kind: 'tickets', need: 28, who: 'öğrenci', mode: 'atLeast', budget: 3500, goal: 3,
        types: [
          { id: 't1', n: 1, price: 140, label: 'Tek bilet', color: '#f472b6' },
          { id: 't5', n: 5, price: 600, label: '5’li paket', color: '#8b5cf6' },
          { id: 't10', n: 10, price: 1100, label: '10’lu grup paketi', color: '#0ea5e9' },
        ],
        follow: { q: 'Bulduğun yollardan en ucuzuyla bütçeden kaç TL artar? (Daha ucuz bir yol var mı?)', kind: 'left' },
      },
      title: 'Sınıf gezisi bütçesi',
      prompt: '28 öğrenci geziye gidiyor, bilet bütçesi 3.500 TL. Tek bilet 140 TL, 5’li paket 600 TL, 10’lu grup paketi 1.100 TL. Herkese en az bir bilet alınmalı, bütçe aşılmamalı. Bütçeye uyan 3 farklı yol bul!',
      hints: ['3 tane 10’lu paket 30 bilet eder: 2 bilet artar ama fiyatı bütçeye uyuyor mu?', '28 = 10 + 10 + 5 + 3 olabilir. Toplam kaç TL?', 'Bilet başına fiyat: 10’luda 110 TL, 5’lide 120 TL, tekte 140 TL.'],
      note: 'Fazla bilet almak bazen daha ucuz olabilir (3 × 10’lu = 3.300 TL), ama en ucuzu tam 28 bilet: 2 × 10’lu + 5’li + 3 tek = 3.220 TL.',
      picker: { q: 'En ucuz yolu nasıl buldun?', options: ['Paketlerin bilet başı fiyatını karşılaştırdım', 'Önce büyük paketi aldım', 'Tüm yolları hesaplayıp karşılaştırdım', 'Deneyerek'] },
    },
    {
      task: { kind: 'load', people: 121, seats: 8, ask: 'needed', chunks: [1, 5, 10], costPer: 480, question: 'Kabin kiralamak için toplam kaç TL ödenir?' },
      title: 'Kabin kiralama',
      prompt: 'Okul şenliği: 4 sınıftan 27, 29, 26 ve 31 öğrenci ile 8 öğretmen dolaba binecek (toplam 121 kişi). Kabinler 8 kişilik ve kabin başına 480 TL kiralanıyor. Okul toplam kaç TL öder?',
      hints: ['Önce kaç kabin gerektiğini bul: 121 kişide kaç tane 8 var?', '15 kabin 120 kişi taşır. 1 kişi kalıyor: o da binmeli!', 'Kabin sayısı × 480 TL.'],
      note: '121 ÷ 8 = 15, kalan 1 → 16 kabin. 16 × 480 = 7.680 TL. Kalan 1 kişi için de bir kabin kiralandı!',
      picker: { q: 'Nasıl çözdün?', options: ['Önce kabin sayısını, sonra maliyeti buldum', 'Gruplarla doldurma (10’ar, 5’er kabin)', 'Zihinden bölme', 'Tahmin edip düzelttim'] },
    },
    {
      task: { kind: 'layout', cols: 12, rows: 8, rides: ['dd', 'ht', 'ca', 'ak', 'kg', 'ku'], budget: 6_000_000, areaMax: 1200, minRides: 3, goal: 2, askArea: true, obstacles: [{ x: 0, y: 7, w: 2, h: 1, label: 'Giriş', kind: 'giris' }] },
      title: 'Parkını kur',
      prompt: 'Arsa 60 m × 40 m. Her kare 5 m × 5 m. Oyuncaklara en çok 1.200 m² ayrılabilir, bütçe 6.000.000 TL. En az 3 oyuncak yerleştir ve parkı aç. 2 farklı park tasarla, sonra bir günlük simülasyonla karşılaştır!',
      hints: ['Bir oyuncağın alanı: kenarlar çarpılır. Dönme dolap 20 m × 20 m = 400 m².', 'Hız treni hem büyük hem pahalı. Onu alırsan geriye ne kadar bütçe ve alan kalır?', 'Atlıkarınca ucuz ve küçük: 15 m × 15 m.'],
      note: 'Aynı bütçe ve alanla çok farklı parklar kurulabilir. Simülasyon, hangi tasarımın daha çok ziyaretçiye hizmet ettiğini gösterdi.',
      picker: { q: 'Hangi parkı açardın? Neden?', options: ['Daha çok gelir getireni', 'Kuyruğu kısa olanı', 'Daha ucuza kurulanı', 'Daha çok oyuncak olanı'] },
    },
    {
      task: {
        kind: 'layout', cols: 12, rows: 8, rides: ['dd', 'ht', 'ca', 'ak', 'kg', 'ku'], budget: 7_500_000, areaMax: 1300, minRides: 3, goal: 2, askArea: false, mustTop: 2,
        obstacles: [{ x: 0, y: 7, w: 2, h: 1, label: 'Giriş', kind: 'giris' }, { x: 8, y: 5, w: 4, h: 3, label: 'Göl', kind: 'gol' }],
        survey: [{ id: 'ht', votes: 46 }, { id: 'dd', votes: 38 }, { id: 'ca', votes: 31 }, { id: 'ku', votes: 24 }, { id: 'kg', votes: 17 }, { id: 'ak', votes: 12 }],
      },
      title: 'Anketle tasarla',
      prompt: '168 ziyaretçiye “Hangi oyuncağı isterdin?” diye sorduk. Anketteki en çok istenen 2 oyuncak parkta mutlaka olsun! Bütçe 7.500.000 TL, alan en çok 1.300 m². Gölün üstüne yapı kurulamaz. 2 farklı park tasarla ve günleri karşılaştır.',
      hints: ['Anket grafiğinde en uzun iki sütun hangisi?', 'Hız treni + dönme dolap = 5.600.000 TL ve 850 m². Geriye ne kadar bütçe ve alan kaldı?', 'Kalan bütçeyle hangi oyuncaklar alınabilir? İki küçük oyuncak mı, bir büyük mü?'],
      note: 'Veriye dayalı karar: en çok istenenleri koyduk, kalan bütçe ve alanla farklı seçenekleri denedik.',
      picker: { q: 'Hangi parkı seçerdin? Neden?', options: ['Anketteki en çok istenenleri seçtim', 'Daha çok gelir getireni', 'Kuyruğu kısa olanı', 'Simülasyonla karşılaştırdım'] },
    },
  ]
}

export const insightFor = (grade: Grade) =>
  grade <= 3
    ? 'Dönme dolapta kabin sayısı × koltuk sayısı, bir turda binen kişi sayısını verir. 24 kişiyi 6 × 4, 8 × 3 ya da 12 × 2 ile taşıyabilirsin; 32 çocuğu 4’erli kabinlere bölünce 8 kabin dolar.'
    : grade === 4
      ? 'Kalanlı bölmede kalanı soruya göre yorumlarız: herkes binecekse 157 ÷ 6 için 27 kabin gerekir; yalnızca dolu kabinler kalkıyorsa 250 ÷ 8 için 31 kabin kalkar, 2 kişi bekler.'
      : 'Bir tasarımı seçmek için birden çok adımı birleştiririz: alan (kenar × kenar), maliyet (adet × fiyat), kapasite (kabin × koltuk × tur) ve veriler. Simülasyon, farklı tasarımların sonuçlarını karşılaştırmamızı sağlar.'
