import type { Activity, Grade, ManipulativeTool, ThemeIcon } from './types'
import type { GameId } from '../games/meta'

/**
 * Konu başlıkları: tema yerine ünite/konu sırasıyla düzenlenen sınıflar için (şimdilik 8. sınıf, LGS konu sırası).
 * Sınıf sayfasında her konunun altında etkinlikler, materyaller (manipülatifler) ve oyunlar ayrı ayrı listelenir.
 * Etkileşimler (Keşif Atölyesi) “etkinlik” olarak gösterilir.
 */
export interface Topic {
  /** Sayfa içi bağlantı: #konu-<slug> */
  slug: string
  /** Ünite numarası */
  unit: number
  title: string
  icon: ThemeIcon
  /** Konuda neler çalışılıyor (tek satır) */
  summary: string
  /**
   * Konunun etkinlikleri: öğrenme çıktısı kodu (ilk çıktısı bu olan bütün etkinlikler)
   * ya da tek tek etkinlik kimliği ("g8-...")
   */
  activities: string[]
  /** Keşif Atölyesi etkinlikleri (etkileşim kimlikleri) */
  interactions: string[]
  /** Materyaller (sanal manipülatifler) */
  tools: ManipulativeTool[]
  games: GameId[]
}

const topic8: Topic[] = [
  {
    slug: 'carpanlar-ve-katlar',
    unit: 1,
    title: 'Çarpanlar ve Katlar',
    icon: 'numbers',
    summary: 'Çarpanlar, asal çarpanlara ayırma, EBOB ve EKOK, aralarında asal sayılar',
    activities: [],
    interactions: ['carpan-kutulari', 'dikdortgen-alanlari', 'ebob-tiyatrosu', 'ekok-tiyatrosu', 'ebob-simulasyonu', 'ekok-simulasyonu'],
    tools: ['kalbur', 'carpanagaci', 'dizilim'],
    games: ['gokkusagi-carpanlar', 'asal-agaci', 'bolen-merdiveni', 'asal-bekci'],
  },
  {
    slug: 'uslu-ifadeler',
    unit: 1,
    title: 'Üslü İfadeler',
    icon: 'numbers',
    summary: 'Tam sayıların kuvvetleri, sıfırıncı ve negatif kuvvet, üslü ifadelerle işlemler, bilimsel gösterim',
    activities: ['MAT.8.1.1'],
    interactions: ['us-oruntu-tablosu', 'oruntu-tasarimcisi', 'islem-zinciri', 'islem-dogru-mu', 'sonsuz-cozum'],
    tools: ['carpanagaci'],
    games: ['kristal-magarasi', 'sayi-konusmalari', 'bir-islem'],
  },
  {
    slug: 'karekoklu-ifadeler',
    unit: 2,
    title: 'Kareköklü İfadeler',
    icon: 'numbers',
    summary: 'Tam kareler, karekök tahmini, a√b biçimi, kareköklü ifadelerle işlemler, gerçek sayılar',
    activities: ['MAT.8.1.2', 'MAT.8.1.3', 'g8-gercek-sayilari-yerlestir', 'g8-gercek-sayilari-sirala'],
    interactions: ['hangisi-mantikli', 'her-zaman-mi', 'karsi-ornek', 'hangisi-farkli-2'],
    tools: ['geoboard', 'numberline'],
    games: ['kok-dukkani', 'tahmin', 'labirent', 'hata-avcisi'],
  },
  {
    slug: 'veri-analizi',
    unit: 2,
    title: 'Veri Analizi',
    icon: 'data',
    summary: 'Sütun ve çizgi grafikleri, veriyi yorumlama, merkez ve yayılım, yanıltıcı grafikler',
    activities: ['MAT.8.6.1', 'MAT.8.6.2'],
    interactions: ['veri-toplama', 'yaniltici-grafikler'],
    tools: ['bargraph', 'grafiklab'],
    games: ['veri-dedektifleri'],
  },
  {
    slug: 'olasilik',
    unit: 3,
    title: 'Basit Olayların Olma Olasılığı',
    icon: 'probability',
    summary: 'Olası durumlar, eş olasılık, deneysel ve teorik olasılık',
    activities: ['MAT.8.7.1'],
    interactions: ['olasilik-simulatoru', 'adil-mi', 'tahmin-test-acikla'],
    tools: ['probability', 'rastgeledeney'],
    games: ['at-yarisi'],
  },
  {
    slug: 'cebirsel-ifadeler-ve-ozdeslikler',
    unit: 3,
    title: 'Cebirsel İfadeler ve Özdeşlikler',
    icon: 'algebra',
    summary: 'Cebirsel ifadelerle çarpma, özdeşlikler, çarpanlara ayırma',
    activities: [],
    interactions: ['cebir-karolari'],
    tools: ['algebra'],
    games: ['ozdeslik-bulmacasi'],
  },
  {
    slug: 'dogrusal-denklemler',
    unit: 4,
    title: 'Doğrusal Denklemler',
    icon: 'algebra',
    summary: 'Koordinat sistemi, doğrusal ilişkiler, eğim, doğrusal denklemlerin grafikleri',
    activities: ['MAT.8.2.1', 'MAT.8.2.2', 'MAT.8.2.3', 'MAT.8.2.4'],
    interactions: ['dogrusal-iliski', 'oruntuden-kurala', 'grafik-hikayeleri', 'grafik-ciz-anlat', 'acik-uclu-lab'],
    tools: ['coordinate', 'egim'],
    games: ['egim-parkuru', 'trafik-simulatoru', 'denklem-kapilari', 'makine', 'lazer-lab'],
  },
  {
    slug: 'esitsizlikler',
    unit: 4,
    title: 'Eşitsizlikler',
    icon: 'algebra',
    summary: 'Sayı doğrusunda aralıklar, birinci dereceden bir bilinmeyenli eşitsizlikler',
    activities: ['g8-araliklari-oku', 'g8-aralik-gosterimleri', 'g8-aralikta-mi'],
    interactions: ['esitligi-koru'],
    tools: ['numberline', 'balance'],
    games: ['denklem-kapilari'],
  },
  {
    slug: 'ucgenler',
    unit: 5,
    title: 'Üçgenler',
    icon: 'geometry',
    summary: 'Açı-kenar ilişkisi, üçgen eşitsizliği, Pisagor bağıntısı',
    activities: ['MAT.8.3.1', 'MAT.8.3.2', 'MAT.8.3.5', 'MAT.8.3.6'],
    interactions: ['ucgen-olusturucu', 'pisagor-kesif'],
    tools: ['dinamikucgen', 'geoboard'],
    games: ['kopru-muhendisi', 'hata-avcisi'],
  },
  {
    slug: 'eslik-ve-benzerlik',
    unit: 5,
    title: 'Eşlik ve Benzerlik',
    icon: 'geometry',
    summary: 'Eş ve benzer üçgenler, eşlik ve benzerlik için yeterli bilgi, benzerlik oranı',
    activities: ['MAT.8.3.3', 'MAT.8.3.4'],
    interactions: ['ucgen-olusturucu'],
    tools: ['dinamikucgen', 'geoboard'],
    games: [],
  },
  {
    slug: 'donusum-geometrisi',
    unit: 6,
    title: 'Dönüşüm Geometrisi',
    icon: 'transform',
    summary: 'Öteleme, eksenlere göre yansıma, ardışık dönüşümler',
    activities: ['MAT.8.5.1', 'MAT.8.5.2', 'MAT.8.5.3'],
    interactions: ['donusum-studyosu', 'katla-ac'],
    tools: ['donusum', 'coordinate'],
    games: ['gemiler', 'lazer-lab'],
  },
  {
    slug: 'geometrik-cisimler',
    unit: 6,
    title: 'Geometrik Cisimler',
    icon: 'measure',
    summary: 'Prizma, piramit, silindir ve koni; açınımlar, yüzey alanı ve hacim',
    activities: ['MAT.8.4.1', 'MAT.8.4.2', 'MAT.8.4.3'],
    interactions: ['acinim-bulmacasi', 'hacim-insaati'],
    tools: ['nets', 'izometrik'],
    games: [],
  },
]

export const topicsByGrade: Partial<Record<Grade, Topic[]>> = { 8: topic8 }

/** Etkinlik bu konuya mı ait? (kimliği listede ya da ilk öğrenme çıktısı listede) */
export const inTopic = (t: Topic, a: Activity) => t.activities.includes(a.id) || (a.outcomes[0] !== undefined && t.activities.includes(a.outcomes[0]))
