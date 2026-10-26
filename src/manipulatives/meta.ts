import type { ManipulativeTool } from '../data/types'

export interface ToolMeta {
  id: ManipulativeTool
  name: string
  description: string
  emoji: string
  /** Önerilen sınıf aralığı, ör. "1–2" */
  grades: string
}

/** Manipülatiflerin hafif tanımları (bileşenleri yüklemeden listelemek için) */
export const toolMeta: ToolMeta[] = [
  { id: 'tenframe', name: 'Onluk Çerçeve', description: 'Sayaçları yerleştirerek 20’ye kadar sayıları modelle.', emoji: '🔴', grades: '1–2' },
  { id: 'base10', name: 'Onluk Taban Blokları', description: 'Birlik, onluk, yüzlük ve binlik bloklarla sayıları oluştur, boz ve çözümle.', emoji: '🟧', grades: '1–4' },
  { id: 'numberline', name: 'Sayı Doğrusu', description: 'Sayı doğrusunda noktalar işaretle, sıçramalarla toplama-çıkarma yap.', emoji: '📏', grades: '1–8' },
  { id: 'fractions', name: 'Kesir Şeritleri', description: 'Bir bütünü eş parçalara böl, parçaları boya ve kesirleri karşılaştır.', emoji: '🍕', grades: '2–6' },
  { id: 'clock', name: 'Saat', description: 'Akrep ve yelkovanı ayarla; analog ve dijital saati karşılaştır.', emoji: '🕒', grades: '2–3' },
  { id: 'money', name: 'Paralarımız', description: 'Madenî ve kâğıt paralarla tutar oluştur, para üstü hesapla.', emoji: '💰', grades: '1–3' },
  { id: 'geoboard', name: 'Geometri Tahtası', description: 'Çivilere dokunarak çokgenler oluştur; kenar sayısını, çevresini ve alanını keşfet.', emoji: '📐', grades: '1–6' },
  { id: 'symmetry', name: 'Simetri Tahtası', description: 'Simetri doğrusuna göre şeklin diğer yarısını tamamla.', emoji: '🦋', grades: '2–7' },
  { id: 'angle', name: 'Açı Ölçer', description: 'Işını döndürerek açı oluştur ve iletki ile ölç.', emoji: '📐', grades: '4–8' },
  { id: 'balance', name: 'Eşit Kollu Terazi', description: 'Eşitliğin korunumunu keşfet: teraziyi dengede tutarak bilinmeyeni bul.', emoji: '⚖️', grades: '1–7' },
  { id: 'algebra', name: 'Cebir Karoları', description: 'x², x ve 1 karolarıyla cebirsel ifadeleri modelle; sıfır çiftlerini keşfet.', emoji: '🟪', grades: '6–8' },
  { id: 'bargraph', name: 'Grafik Oluşturucu', description: 'Verileri sütun grafiğine dönüştür, en çok ve en az olanı karşılaştır.', emoji: '📊', grades: '1–8' },
  { id: 'probability', name: 'Olasılık Deneyleri', description: 'Para at, zar at, çark çevir ya da torbadan top çek; sonuçları kaydet ve olasılığı tahmin et.', emoji: '🎲', grades: '4–8' },
  { id: 'coordinate', name: 'Koordinat Düzlemi', description: 'Noktaları yerleştir, koordinatlarını oku, şekilleri ötele ve yansıt.', emoji: '📍', grades: '6–8' },
  { id: 'nets', name: 'Cisimler ve Açınımlar', description: 'Geometrik cisimleri ve açınımlarını incele, küpü katlayarak oluştur.', emoji: '🧊', grades: '2–8' },
]

export const toolMetaById = Object.fromEntries(toolMeta.map((t) => [t.id, t])) as Record<ManipulativeTool, ToolMeta>
