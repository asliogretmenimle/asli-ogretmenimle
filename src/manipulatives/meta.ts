import type { Grade, ManipulativeTool } from '../data/types'
import type { InteractionCategory } from '../interactions/types'

export interface ToolMeta {
  id: ManipulativeTool
  name: string
  description: string
  emoji: string
  /** Önerilen sınıf aralığı, ör. "1–2" */
  grades: string
  /** Konu alanı (Keşif Atölyesi ile aynı kategoriler) */
  category: InteractionCategory
}

/** Manipülatiflerin hafif tanımları (bileşenleri yüklemeden listelemek için) */
export const toolMeta: ToolMeta[] = [
  { id: 'tenframe', name: 'Onluk Çerçeve', description: 'Sayaçları yerleştirerek 20’ye kadar sayıları modelle.', emoji: '🔴', grades: '1–2', category: 'sayilar' },
  { id: 'base10', name: 'Onluk Taban Blokları', description: 'Birlik, onluk, yüzlük ve binlik bloklarla sayıları oluştur, boz ve çözümle.', emoji: '🟧', grades: '1–4', category: 'sayilar' },
  { id: 'numberline', name: 'Sayı Doğrusu', description: 'Sayı doğrusunda noktalar işaretle, sıçramalarla toplama-çıkarma yap.', emoji: '📏', grades: '1–8', category: 'sayilar' },
  { id: 'fractions', name: 'Kesir Şeritleri', description: 'Bir bütünü eş parçalara böl, parçaları boya ve kesirleri karşılaştır.', emoji: '🍕', grades: '2–6', category: 'kesirler' },
  { id: 'clock', name: 'Saat', description: 'Akrep ve yelkovanı ayarla; analog ve dijital saati karşılaştır.', emoji: '🕒', grades: '2–3', category: 'geometri' },
  { id: 'money', name: 'Paralarımız', description: 'Madenî ve kâğıt paralarla tutar oluştur, para üstü hesapla.', emoji: '💰', grades: '1–3', category: 'sayilar' },
  { id: 'geoboard', name: 'Geometri Tahtası', description: 'Çivilere dokunarak çokgenler oluştur; kenar sayısını, çevresini ve alanını keşfet.', emoji: '📐', grades: '1–6', category: 'geometri' },
  { id: 'symmetry', name: 'Simetri Tahtası', description: 'Simetri doğrusuna göre şeklin diğer yarısını tamamla.', emoji: '🦋', grades: '2–7', category: 'geometri' },
  { id: 'angle', name: 'Açı Ölçer', description: 'Işını döndürerek açı oluştur ve iletki ile ölç.', emoji: '📐', grades: '4–8', category: 'geometri' },
  { id: 'balance', name: 'Eşit Kollu Terazi', description: 'Eşitliğin korunumunu keşfet: teraziyi dengede tutarak bilinmeyeni bul.', emoji: '⚖️', grades: '1–7', category: 'cebir-veri' },
  { id: 'algebra', name: 'Cebir Karoları', description: 'x², x ve 1 karolarıyla cebirsel ifadeleri modelle; sıfır çiftlerini keşfet.', emoji: '🟪', grades: '6–8', category: 'cebir-veri' },
  { id: 'bargraph', name: 'Grafik Oluşturucu', description: 'Verileri sütun grafiğine dönüştür, en çok ve en az olanı karşılaştır.', emoji: '📊', grades: '1–8', category: 'cebir-veri' },
  { id: 'probability', name: 'Olasılık Deneyleri', description: 'Para at, zar at, çark çevir ya da torbadan top çek; sonuçları kaydet ve olasılığı tahmin et.', emoji: '🎲', grades: '4–8', category: 'cebir-veri' },
  { id: 'coordinate', name: 'Koordinat Düzlemi', description: 'Noktaları yerleştir, koordinatlarını oku, şekilleri ötele ve yansıt.', emoji: '📍', grades: '6–8', category: 'geometri' },
  { id: 'nets', name: 'Cisimler ve Açınımlar', description: 'Geometrik cisimleri ve açınımlarını incele, küpü katlayarak oluştur.', emoji: '🧊', grades: '2–8', category: 'geometri' },
  { id: 'rekenrek', name: 'Rekenrek (Sayı Boncuğu)', description: 'Beşli ve onlu boncuk gruplarıyla sayıları yapılandır.', emoji: '🧮', grades: '1–3', category: 'sayilar' },
  { id: 'yuzluk', name: 'Yüzlük Tablo', description: 'Sayı örüntülerini renklendir, satır-sütun ilişkilerini keşfet.', emoji: '💯', grades: '1–4', category: 'sayilar' },
  { id: 'sayikartlari', name: 'Sayı Kartları', description: 'Rakam kartlarını sürükleyerek sayılar oluştur, basamak değerini gör.', emoji: '🔢', grades: '1–5', category: 'sayilar' },
  { id: 'noktakartlari', name: 'Nokta Kartları', description: 'Hızlı bakışla sayı algısı ve gruplama.', emoji: '🎴', grades: '1–3', category: 'sayilar' },
  { id: 'dizilim', name: 'Çarpma Dizilim Tahtası', description: 'Satır-sütun dizilimi oluştur, böl ve çarpmayı modelle.', emoji: '🔳', grades: '2–5', category: 'sayilar' },
  { id: 'carpanagaci', name: 'Çarpan Ağacı', description: 'Sayıları dallara ayırarak asal çarpanlarını bul.', emoji: '🌳', grades: '5–6', category: 'sayilar' },
  { id: 'kesirdaireleri', name: 'Kesir Daireleri', description: 'Kesirleri dairesel modellerle oluştur ve karşılaştır.', emoji: '🥧', grades: '3–6', category: 'kesirler' },
  { id: 'kesirdogrusu', name: 'Kesir Sayı Doğrusu', description: 'Kesir ve ondalıkları yakınlaştırılabilir sayı doğrusunda incele.', emoji: '📏', grades: '3–7', category: 'kesirler' },
  { id: 'yuzdeizgarasi', name: 'Yüzde Izgarası', description: '100 karelik ızgarada yüzde, kesir ve ondalığı birlikte gör.', emoji: '🟩', grades: '5–7', category: 'kesirler' },
  { id: 'orantablosu', name: 'Oran Tablosu', description: 'Eşdeğer oranları tabloda büyüt, küçült, karşılaştır.', emoji: '📊', grades: '6–7', category: 'kesirler' },
  { id: 'ciftdogru', name: 'Çift Sayı Doğrusu', description: 'İki ölçeği aynı anda gösteren sayı doğrularıyla oransal ilişkiler.', emoji: '↔️', grades: '5–7', category: 'kesirler' },
  { id: 'tangram', name: 'Tangram', description: 'Yedi parçayı döndür, çevir ve birleştir; şekiller oluştur.', emoji: '🔺', grades: '1–6', category: 'geometri' },
  { id: 'oruntubloklari', name: 'Örüntü Blokları', description: 'Altıgen, yamuk, eşkenar dörtgen ve üçgenlerle desen ve kaplama.', emoji: '🔷', grades: '1–6', category: 'geometri' },
  { id: 'izometrik', name: 'İzometrik Küp Tahtası', description: 'Küplerle yapı kur, farklı yönlerden görünümlerini incele.', emoji: '🧊', grades: '4–8', category: 'geometri' },
  { id: 'alancevre', name: 'Alan ve Çevre Tahtası', description: 'Kareleri yeniden düzenle: alan aynı kalırken çevre nasıl değişiyor?', emoji: '📐', grades: '3–7', category: 'geometri' },
  { id: 'dinamikucgen', name: 'Dinamik Üçgen', description: 'Köşeleri sürükle; açı ve kenar ilişkilerini canlı izle.', emoji: '📐', grades: '5–8', category: 'geometri' },
  { id: 'donusum', name: 'Dönüşüm Düzlemi', description: 'Şekilleri ötele, yansıt, döndür; koordinatların değişimini gör.', emoji: '🔄', grades: '5–8', category: 'geometri' },
  { id: 'grafiklab', name: 'Grafik Çizim Laboratuvarı', description: 'Veriyi tablo, sütun, çizgi ve nokta grafiğine dönüştür.', emoji: '📈', grades: '5–8', category: 'cebir-veri' },
  { id: 'egim', name: 'Eğim ve Doğru Aracı', description: 'Doğruyu sürükle ve iki parmakla döndür; eğim ve denklemi canlı gör.', emoji: '📉', grades: '8', category: 'cebir-veri' },
  { id: 'rastgeledeney', name: 'Rastgele Deney Tasarımcısı', description: 'Kendi torba, çark ve zar deneyini tasarla; binlerce deneme yap.', emoji: '🎲', grades: '5–8', category: 'cebir-veri' },
  { id: 'kalbur', name: 'Eratosthenes Kalburu', description: 'Asal sayıların katlarını kalburdan elerek asal sayıları bul; elemenin neden karekökte bittiğini keşfet.', emoji: '🧺', grades: '6–8', category: 'sayilar' },
]

export const toolMetaById = Object.fromEntries(toolMeta.map((t) => [t.id, t])) as Record<ManipulativeTool, ToolMeta>

/** "2–6" → [2, 3, 4, 5, 6] */
export function toolGrades(t: ToolMeta): Grade[] {
  const [a, b = a] = t.grades.split('–').map(Number)
  return Array.from({ length: b - a + 1 }, (_, i) => (a + i) as Grade)
}
