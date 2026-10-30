import type { Grade } from './types'

/** Sınıf seviyelerine göre öncelikli matematiksel odak ve öne çıkan yeni içerikler (ürün planı) */
export const gradePlan: Record<Grade, { focus: string; featured: { kind: 'oyun' | 'etkilesim'; id: string }[] }> = {
  1: { focus: 'Sayı hissi, 20’ye kadar sayılar, somut gruplama, örüntüler', featured: [{ kind: 'oyun', id: 'sayi-adalari' }, { kind: 'etkilesim', id: 'hizli-noktalar' }, { kind: 'oyun', id: 'sayi-treni' }, { kind: 'oyun', id: 'sayi-konusmalari' }] },
  2: { focus: 'Basamak değeri, toplama-çıkarma ilişkileri, geometrik özellikler', featured: [{ kind: 'oyun', id: 'denge-kulesi' }, { kind: 'etkilesim', id: 'sayi-piramitleri' }, { kind: 'oyun', id: 'matematik-bahcem' }, { kind: 'oyun', id: 'hata-avcisi' }] },
  3: { focus: 'Sayı temsilleri, çarpma-bölme ilişkileri, ölçme', featured: [{ kind: 'oyun', id: 'kurabiye-fabrikasi' }, { kind: 'etkilesim', id: 'carpim-dikdortgenleri' }, { kind: 'oyun', id: 'matematik-sehri' }, { kind: 'oyun', id: 'sayi-konusmalari' }] },
  4: { focus: 'Çok basamaklı sayılar, kesirler, geometrik muhakeme', featured: [{ kind: 'oyun', id: 'kesir-takimadalari' }, { kind: 'oyun', id: 'mozaik-ustasi' }, { kind: 'etkilesim', id: 'alani-kesfet' }, { kind: 'oyun', id: 'hata-avcisi' }] },
  5: { focus: 'Sayılar ve nicelikler, kesir ilişkileri, geometrik şekiller, veri', featured: [{ kind: 'oyun', id: 'uzay-kolonisi' }, { kind: 'etkilesim', id: 'kesir-duvari' }, { kind: 'oyun', id: 'veri-dedektifleri' }, { kind: 'oyun', id: 'matematik-sehri' }] },
  6: { focus: 'Çarpanlar ve katlar, oran ilişkileri, cebirsel düşünme', featured: [{ kind: 'oyun', id: 'carpan-fabrikasi' }, { kind: 'etkilesim', id: 'oran-karistirici' }, { kind: 'oyun', id: 'denklem-kapilari' }, { kind: 'oyun', id: 'veri-dedektifleri' }] },
  7: { focus: 'Sayısal ve cebirsel ilişkiler, oransal düşünme, veri', featured: [{ kind: 'oyun', id: 'iklim-istasyonu' }, { kind: 'etkilesim', id: 'matematiksel-tartisma' }, { kind: 'oyun', id: 'lazer-lab' }, { kind: 'oyun', id: 'denklem-kapilari' }] },
  8: { focus: 'LGS konu sırasıyla: çarpanlar ve katlar, üslü ve kareköklü ifadeler, özdeşlikler, doğrusal denklemler, geometri', featured: [{ kind: 'oyun', id: 'asal-bekci' }, { kind: 'etkilesim', id: 'ebob-tiyatrosu' }, { kind: 'oyun', id: 'kok-dukkani' }, { kind: 'oyun', id: 'egim-parkuru' }] },
}
