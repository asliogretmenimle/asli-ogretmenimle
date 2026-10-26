import type { Grade } from '../../data/types'
import { pick, shuffle } from './kit'

/**
 * Veri Toplama Stüdyosu: sınıfa göre araştırma bağlamları.
 *  kind 'cat'  : kategorik veri (1–5), çetele → sıklık tablosu → resim/sütun grafiği
 *  kind 'disc' : sayılarak elde edilen nicel veri (6), çetele → sıklık tablosu → nokta/sütun grafiği
 *  kind 'cont' : sürekli nicel veri (7–8), ham liste → eşit aralıklı gruplama → histogram
 */

export interface Cat { id: string; label: string; emoji: string; color: string }
export interface Q { t: string; ok: boolean; why?: string; mis?: string }
export type DisplayId = 'picto' | 'object' | 'bar' | 'line' | 'dot' | 'hist' | 'pie'
export interface Inv {
  kind: 'cat' | 'disc' | 'cont'
  topic: string
  emoji: string
  questions: Q[]
  /** 7–8: örneklem sorusu */
  sample?: { q: string; opts: Q[] }
  cats: Cat[]
  /** her öğrencinin cevabı: cat → kategori indeksi, disc/cont → sayı */
  answers: number[]
  unit?: string
  /** cont: aralık genişliği seçenekleri (eşit olmayan seçenek de olabilir) */
  bins?: { id: string; label: string; edges: number[]; ok: boolean; why?: string }[]
  displays: { id: DisplayId; ok: boolean; why?: string; mis?: string }[]
  /** resim grafiği anahtarı (1 simge = key öğrenci) */
  key: number
  /** sütun grafiği ölçeği */
  scale: number
}

const PAL = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
const mk = (items: [string, string][]): Cat[] => items.map(([label, emoji], i) => ({ id: String(i), label, emoji, color: PAL[i % PAL.length] }))

/** sayaç vektörü → karışık cevap listesi */
const spread = (counts: number[]) => shuffle(counts.flatMap((c, i) => Array(c).fill(i) as number[]))

export const NAMES = ['Ali', 'Ece', 'Mert', 'Zeynep', 'Can', 'Elif', 'Emir', 'Defne', 'Kerem', 'Asel', 'Yusuf', 'Ada', 'Ömer', 'Nil', 'Aras', 'Duru', 'Efe', 'Lina', 'Tuna', 'Mira', 'Kaan', 'Ela', 'Arda', 'İpek', 'Baran', 'Ceren', 'Deniz', 'Selin', 'Umut', 'Beren']
export const FACES = ['🧒', '👧', '👦', '🧒🏽', '👧🏻', '👦🏼', '🧑', '👧🏽', '👦🏻', '🧒🏻']

export function invFor(grade: Grade): Inv {
  switch (grade) {
    case 1: {
      const cats = mk([['Elma', '🍎'], ['Muz', '🍌'], ['Çilek', '🍓']])
      return {
        kind: 'cat', topic: 'En sevdiğimiz meyve', emoji: '🍎', cats, key: 1, scale: 1,
        answers: spread(pick([[5, 4, 3], [3, 6, 3], [4, 3, 5]])),
        questions: [
          { t: 'Sınıfımızda en çok hangi meyve seviliyor?', ok: true },
          { t: 'Ece hangi meyveyi seviyor?', ok: false, why: 'Bu soruyu kaç kişiye soracağız? Yalnız Ece’nin cevabı sınıfı anlatır mı?', mis: 'Tek kişiye yönelik soruyu veri sorusu sandı' },
          { t: 'Elma kırmızı mıdır?', ok: false, why: 'Bu sorunun cevabı arkadaşlarımıza göre değişir mi? Cevabını toplamak için kimseye sormamız gerekir mi?' },
        ],
        displays: [
          { id: 'object', ok: true },
          { id: 'line', ok: false, why: 'Meyveler arasında bir sıra ya da zaman var mı? Kaç kişinin seçtiğini en kolay nasıl karşılaştırırız?' },
        ],
      }
    }
    case 2: {
      const cats = mk([['Yürüyerek', '🚶'], ['Servisle', '🚌'], ['Arabayla', '🚗'], ['Bisikletle', '🚲']])
      return {
        kind: 'cat', topic: 'Okula nasıl geliyoruz?', emoji: '🚌', cats, key: 1, scale: 1,
        answers: spread(pick([[6, 4, 4, 2], [5, 6, 3, 2], [4, 3, 7, 2]])),
        questions: [
          { t: 'Sınıfımızdaki öğrenciler okula nasıl geliyor?', ok: true },
          { t: 'Okul servisi kaçta geliyor?', ok: false, why: 'Bu sorunun tek bir cevabı var. Arkadaşlarımıza sorunca farklı cevaplar alır mıyız?' },
          { t: 'Mert bugün okula nasıl geldi?', ok: false, why: 'Yalnız Mert’e sorarsak sınıfımız hakkında bir şey öğrenir miyiz?', mis: 'Tek kişiye yönelik soruyu veri sorusu sandı' },
        ],
        displays: [
          { id: 'picto', ok: true },
          { id: 'line', ok: false, why: 'Çizgi grafiği zamanla değişimi gösterir. Okula geliş yolları arasında zaman sırası var mı?' },
        ],
      }
    }
    case 3: {
      const cats = mk([['Kış', '❄️'], ['İlkbahar', '🌸'], ['Yaz', '☀️'], ['Sonbahar', '🍂']])
      return {
        kind: 'cat', topic: 'En sevdiğimiz mevsim', emoji: '🌸', cats, key: 2, scale: 1,
        answers: spread(pick([[4, 5, 8, 3], [3, 6, 9, 2], [5, 4, 7, 4]])),
        questions: [
          { t: 'Sınıfımızda en çok hangi mevsim seviliyor?', ok: true },
          { t: 'Yaz en güzel mevsim değil mi?', ok: false, why: 'Bu soru cevabı önceden söylüyor gibi. Arkadaşların “hayır” demekte rahat olur mu?', mis: 'Yönlendirici soruyu fark etmedi' },
          { t: 'Bir yılda kaç mevsim vardır?', ok: false, why: 'Bu sorunun herkes için aynı tek bir cevabı var. Veri toplamaya gerek var mı?' },
        ],
        displays: [
          { id: 'picto', ok: true },
          { id: 'bar', ok: true },
          { id: 'line', ok: false, why: 'Çizgi grafiği zamanla değişimi gösterir. Burada her mevsimi seçen kişi sayısını mı karşılaştırıyoruz, zamanla değişimi mi?' },
        ],
      }
    }
    case 4: {
      const cats = mk([['Futbol', '⚽'], ['Basketbol', '🏀'], ['Voleybol', '🏐'], ['Yüzme', '🏊'], ['Tenis', '🎾']])
      return {
        kind: 'cat', topic: 'En sevdiğimiz spor', emoji: '⚽', cats, key: 2, scale: 2,
        answers: spread(pick([[8, 5, 6, 3, 2], [6, 7, 4, 5, 2], [7, 4, 8, 3, 2]])),
        questions: [
          { t: 'Sınıfımızdaki öğrencilerin en sevdiği spor hangisi?', ok: true },
          { t: 'Futbolu sevmeyen var mı?', ok: false, why: 'Bu soruya “evet” ya da “hayır” deriz. Hangi sporun daha çok sevildiğini öğrenebilir miyiz?' },
          { t: 'Basketbol topu kaç gramdır?', ok: false, why: 'Bu sorunun cevabı arkadaşlarımıza göre değişir mi?' },
        ],
        displays: [
          { id: 'bar', ok: true },
          { id: 'picto', ok: true },
          { id: 'line', ok: false, why: 'Sporlar arasında bir zaman sırası var mı? Çizgiyle birleştirmek ne anlatırdı?', mis: 'Kategorik veri için çizgi grafiği seçti' },
        ],
      }
    }
    case 5: {
      const cats = mk([['Kedi', '🐱'], ['Köpek', '🐶'], ['Kuş', '🐦'], ['Balık', '🐟'], ['Tavşan', '🐰']])
      return {
        kind: 'cat', topic: 'Hangi evcil hayvanı isterdik?', emoji: '🐶', cats, key: 2, scale: 2,
        answers: spread(pick([[8, 7, 3, 2, 4], [6, 9, 2, 3, 4], [9, 6, 4, 2, 3]])),
        questions: [
          { t: 'Sınıfımızdaki öğrenciler en çok hangi evcil hayvanı beslemek isterdi?', ok: true },
          { t: 'Kediler köpeklerden daha iyi değil mi?', ok: false, why: 'Bu soru bir cevaba yönlendiriyor. Arkadaşların gerçek tercihini rahatça söyleyebilir mi?', mis: 'Yönlendirici soruyu fark etmedi' },
          { t: 'Bir kedi kaç yıl yaşar?', ok: false, why: 'Bu bir araştırma sorusu ama cevabını sınıftan veri toplayarak bulabilir miyiz?' },
          { t: 'Evcil hayvanını seviyor musun?', ok: false, why: 'Evcil hayvanı olmayanlar ne cevap verir? Hangi hayvanın tercih edildiğini öğrenebilir miyiz?' },
        ],
        displays: [
          { id: 'bar', ok: true },
          { id: 'picto', ok: true },
          { id: 'line', ok: false, why: 'Hayvanlar arasında zaman sırası yok. Çizgi grafiği neyi gösterir?', mis: 'Kategorik veri için çizgi grafiği seçti' },
        ],
      }
    }
    case 6: {
      const counts = pick([[3, 9, 7, 3, 2], [4, 8, 6, 4, 2], [2, 10, 7, 4, 1]])
      return {
        kind: 'disc', topic: 'Kaç kardeşimiz var?', emoji: '👨‍👩‍👧‍👦', key: 1, scale: 2, unit: 'kardeş',
        cats: [0, 1, 2, 3, 4].map((v, i) => ({ id: String(v), label: String(v), emoji: String(v), color: PAL[i] })),
        answers: spread(counts),
        questions: [
          { t: 'Sınıfımızdaki öğrencilerin kaç kardeşi var?', ok: true },
          { t: 'Sınıfımızda kaç öğrenci var?', ok: false, why: 'Bu sorunun tek bir cevabı var. Cevaplarda değişkenlik bekliyor muyuz?', mis: 'İstatistiksel soru ile tek cevaplı soruyu ayırt etmedi' },
          { t: 'Senin kaç kardeşin var?', ok: false, why: 'Bu soru tek kişiye soruluyor. Sınıf hakkında karar vermek için kimin cevapları gerekir?', mis: 'İstatistiksel soru ile tek cevaplı soruyu ayırt etmedi' },
        ],
        displays: [
          { id: 'dot', ok: true },
          { id: 'bar', ok: true },
          { id: 'line', ok: false, why: 'Çizgi grafiği zamanla değişimi gösterir. Burada zaman var mı?' },
          { id: 'pie', ok: false, why: 'Daire grafiği bütünün parçalarını gösterir; 0, 1, 2… kardeş sayılarının sırası ve dağılımın şekli görünür mü?' },
        ],
      }
    }
    case 7:
    default: {
      const g8 = grade === 8
      const base = g8 ? [3, 5, 6, 8, 9, 10, 11, 12, 12, 13, 14, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 27, 29] : [4, 6, 7, 8, 9, 11, 12, 12, 13, 14, 15, 15, 16, 17, 18, 19, 21, 22, 24, 26, 28, 31, 34, 38]
      const answers = shuffle(base.map((v) => Math.max(1, v + pick([-1, 0, 0, 1]))))
      const mx = Math.max(...answers)
      const top = Math.ceil((mx + 1) / 10) * 10
      const edges = (w: number) => Array.from({ length: Math.ceil(top / w) + 1 }, (_, i) => i * w)
      return {
        kind: 'cont', topic: g8 ? 'Haftada kaç saat ekran başındayız?' : 'Okula kaç dakikada geliyoruz?', emoji: g8 ? '📱' : '⏱️', key: 1, scale: 2,
        unit: g8 ? 'saat' : 'dakika',
        cats: [],
        answers,
        questions: g8
          ? [
              { t: 'Okulumuzdaki öğrenciler bir haftada kaç saat ekran başında geçiriyor?', ok: true },
              { t: 'Dün kaç saat ekran başındaydın?', ok: false, why: 'Bu soru tek bir kişiye ve tek bir güne soruluyor. Öğrenciler hakkında genel bir sonuca ulaşabilir miyiz?', mis: 'İstatistiksel soru ile tek cevaplı soruyu ayırt etmedi' },
              { t: 'Çok fazla ekran başında kalmak zararlı değil mi?', ok: false, why: 'Bu soru bir cevaba yönlendiriyor ve ölçülebilir bir veri üretmiyor. Neyi ölçmek istiyoruz?', mis: 'Yönlendirici soruyu fark etmedi' },
            ]
          : [
              { t: 'Sınıfımızdaki öğrenciler okula kaç dakikada geliyor?', ok: true },
              { t: 'Okul saat kaçta başlıyor?', ok: false, why: 'Bu sorunun tek bir cevabı var. Cevaplarda değişkenlik bekliyor muyuz?', mis: 'İstatistiksel soru ile tek cevaplı soruyu ayırt etmedi' },
              { t: 'Okula yürüyerek gelmek daha sağlıklı değil mi?', ok: false, why: 'Bu soru bir görüşe yönlendiriyor. Sayısal bir veri toplar mıyız?', mis: 'Yönlendirici soruyu fark etmedi' },
            ],
        sample: g8
          ? { q: 'Okulun tamamı hakkında karar vermek istiyoruz. Kimlere soralım?', opts: [
              { t: 'Her sınıftan rastgele seçilen öğrencilere', ok: true },
              { t: 'Yalnız bilgisayar kulübündeki öğrencilere', ok: false, why: 'Bilgisayar kulübündekiler okulu temsil eder mi? Onların ekran süresi diğerlerinden farklı olabilir mi?', mis: 'Yanlı örneklemi fark etmedi' },
              { t: 'Yalnız en yakın arkadaşlarıma', ok: false, why: 'Arkadaşların okulun tamamına benziyor mu? Herkesin seçilme şansı eşit mi?', mis: 'Yanlı örneklemi fark etmedi' },
            ] }
          : { q: 'Sınıfımız hakkında karar vereceğiz. Kimlere soralım?', opts: [
              { t: 'Sınıftaki herkese', ok: true },
              { t: 'Yalnız servisle gelenlere', ok: false, why: 'Servisle gelenlerin süreleri yürüyenlerinkine benzer mi? Sınıfı temsil ederler mi?', mis: 'Yanlı örneklemi fark etmedi' },
              { t: 'Yalnız okula en yakın oturanlara', ok: false, why: 'Yakında oturanlar sınıfın tamamını temsil eder mi?', mis: 'Yanlı örneklemi fark etmedi' },
            ] },
        bins: [
          { id: 'w5', label: '5’er', edges: edges(5), ok: true },
          { id: 'w10', label: '10’ar', edges: edges(10), ok: true },
          { id: 'odd', label: g8 ? '0–5, 5–20, 20–30' : '0–5, 5–20, 20–40', edges: g8 ? [0, 5, 20, top] : [0, 5, 20, top], ok: false, why: 'Aralıklar eşit genişlikte mi? 5–20 aralığı 0–5’ten kaç kat geniş? Histogramda geniş aralık neden daha kalabalık görünür?', mis: 'Eşit olmayan aralıklarla gruplama yaptı' },
          { id: 'w1', label: '1’er', edges: Array.from({ length: top + 1 }, (_, i) => i), ok: false, why: '1’er dakikalık/saatlik aralıklarla kaç sütun olur? Çoğu aralıkta 0 ya da 1 kişi olursa dağılımın şeklini görebilir misin?' },
        ],
        displays: [
          { id: 'hist', ok: true },
          { id: 'bar', ok: false, why: 'Sütun grafiğinde sütunlar arası boşluk ayrı kategorileri gösterir. Bizim aralıklarımız birbirini izliyor mu, araları boş mu?', mis: 'Sürekli veri için sütun grafiği ile histogramı ayırt etmedi' },
          { id: 'line', ok: false, why: 'Çizgi grafiği zamanla değişimi gösterir. Bu veride zaman sırası var mı?' },
          { id: 'pie', ok: false, why: 'Daire grafiği bütünün parçalarını gösterir. Aralıkların sırası ve dağılımın şekli görünür mü?' },
        ],
      }
    }
  }
}

export const DISPLAY_NAME: Record<DisplayId, string> = {
  picto: 'Resim grafiği',
  object: 'Nesne grafiği',
  bar: 'Sütun grafiği',
  line: 'Çizgi grafiği',
  dot: 'Nokta grafiği',
  hist: 'Histogram',
  pie: 'Daire grafiği',
}
