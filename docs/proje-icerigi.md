# Aslı Öğretmenimle — Proje İçeriği

1–8. sınıf öğrencileri için **Türkiye Yüzyılı Maarif Modeli** matematik programına uygun, **Van de Walle** yaklaşımıyla tasarlanmış oyunlar, etkinlikler, etkileşimler ve sanal manipülatifler sunan web sitesi.

- Adres: `https://www.asliogretmenimle.com`
- Veritabanı ve üyelik yok; telefon, tablet ve bilgisayarda çalışır
- Her içeriğin kendi paylaşılabilir linki vardır

## Özet

| Bölüm | Adet | Adres |
|---|---|---|
| Etkinlik (sınıf/tema bazlı) | 827 | `/etkinlik/:id` |
| Kapsanan öğrenme çıktısı | 211 / 211 | `/sinif/:grade/:slug` |
| Oyun (13 klasik + 22 yeni nesil) | 35 | `/oyun/:id` |
| Etkileşim | 55 | `/etkilesim/:id` |
| Sanal manipülatif (15 temel + 20 yeni) | 35 | `/manipulatif/:tool` |

Sınıflara göre etkinlik sayısı: 1. sınıf 78 · 2. sınıf 97 · 3. sınıf 120 · 4. sınıf 118 · 5. sınıf 104 · 6. sınıf 102 · 7. sınıf 109 · 8. sınıf 99

## Teknoloji

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS 4** (stil), **Nunito** (yazı tipi), **lucide-react** (ikonlar)
- **react-router-dom** (yönlendirme), **@dnd-kit** ve **@use-gesture/react** (sürükle-bırak, dokunmatik hareketler), **canvas-confetti** (kutlama efektleri)
- **Vercel** üzerinde yayın; derleme sonrası her sayfa için SEO uyumlu statik HTML üretilir (prerender)

## Komutlar

```bash
pnpm install
pnpm dev          # geliştirme sunucusu (http://localhost:5173)
pnpm validate     # içerik denetimi (tüm çıktılar kapsanıyor mu, cevaplar tutarlı mı)
pnpm typecheck    # TypeScript denetimi
pnpm build        # derleme + prerender → dist/
pnpm preview      # üretim çıktısını yerelde dene
```

## Sayfalar

| Adres | Sayfa |
|---|---|
| `/` | Ana sayfa |
| `/sinif/:grade` | Seçilen sınıfın etkinlikleri |
| `/sinif/:grade/:slug` | Tema sayfası (etkinlikler, büyük fikirler, öğretmen bağlantıları) |
| `/etkinlik/:id` | Tek etkinlik |
| `/oyunlar`, `/oyun/:id` | Oyun listesi ve oyun |
| `/etkilesimler`, `/etkilesim/:id` | Etkileşim listesi ve etkileşim |
| `/manipulatifler`, `/manipulatif/:tool` | Manipülatif listesi ve manipülatif |
| `/yaklasim` | Yaklaşımımız (Van de Walle) |
| `/online-ozel-ders` | Online özel ders tanıtımı |
| `/rapor` | Öğrencinin gönderdiği rapor linkini görüntüleme |

## Pedagojik yaklaşım

Ayrıntılar: [van-de-walle-tasarim.md](van-de-walle-tasarim.md) ve [oyun-gelistirme-rehberi.md](oyun-gelistirme-rehberi.md)

- Her etkinlik **Başlarken → Keşfet → Düşün ve Paylaş** akışıyla ilerler
- Her öğrenme çıktısında etkinlikler **somut → model → sembol → problem** sırasıyla dizilir
- Strateji odaklı soru üreteçleri (10'a tamamlama, ikizler, telafi, türetilmiş çarpma…)
- Yanlış cevapta kavram yanılgısına göre geri bildirim ve kademeli ipuçları; süre baskısı, can ya da ceza yok
- Yaşa uygun görünüm: 1–3. sınıf (`mini`), 4–6. sınıf (`kesif`), 7–8. sınıf (`atolye`)

## Öğretmen raporu

Veritabanı kullanılmaz. Öğrenci bir etkinliği ya da oyunu bitirince oturum özeti (ilk denemede doğru, yanlış deneme, ipucu, süre, kullanılan stratejiler, kavram yanılgıları) sıkıştırılarak bir linke gömülür: `/rapor#...`. Öğretmen linki açarak raporu görüntüler.

## Etkinlik türleri

Etkinlik motorları `src/engine/` altındadır:

- **Quiz** — çoktan seçmeli test, “Hangisi farklı?”
- **FillBlank** — boşluk doldurma
- **MatchGame** — eşleştirme (temsiller arası çeviri)
- **SortOrder** — sürükle-sırala
- **Categorize** — sürükle-grupla
- **ManipulativeTask** — manipülatif üzerinde görev

## Oyunlar

### Klasik oyunlar (13)

| Oyun | Sınıf |
|---|---|
| Balon Sınıflandırıcı | 1–6 |
| Kurbağa Zıplatma | 1–4 |
| Gizli Sayı Dedektifi | 1–4, 6–7 |
| Bir İşlem: Çözüm Atölyesi | 3–8 |
| Kesir Pizzacısı | 2–5 |
| Bakkal Kasası | 1–4 |
| Robot Kodlama | 1–4 |
| Sayı Doğrusu Tahmini | 1–8 |
| Sihirli Makine | 3–8 |
| Sayı Labirenti | 2–8 |
| Koordinat Amirali | 5–8 |
| Açı Topçusu | 4–8 |
| Zar Yarışı | 4–8 |

### Yeni nesil oyunlar (22)

Keşif ve inşa odaklıdır; her biri `src/games/next/<oyun>/` klasöründedir.

| Oyun | Sınıf | Ne yapılıyor? |
|---|---|---|
| Sayı Adaları | 1–2 | Hedef sayıyı farklı parçalardan oluşturarak adalar arasına köprü kur |
| Sayı Treni | 1–2 | Rakam, nokta deseni, onluk çerçeve ve blokları aynı trene bağla, vagonları sırala |
| Kurabiye Fabrikası | 1–3 | Kurabiyeleri eşit diz; 3 × 4 ile 4 × 3'ü keşfet |
| Matematik Bahçem | 1–3 | Çiçekleri kurala göre ek, örüntü tasarla |
| Denge Kulesi | 1–4 | Terazide dengeyi kur, eşitliğin yazılışını gör |
| Mozaik Ustası | 2–6 | Şekilleri döndür, birleştir; yüzeyi boşluksuz kapla |
| Hata Avcısı | 2–8 | Kurgusal çözümlerdeki hatayı bul, açıkla, düzelt |
| Sayı Konuşmaları | 1–8 | Aynı işlemi farklı zihinsel stratejilerle çöz |
| Matematik Şehri | 3–5 | Şehir kur: yol uzunluğu, çevre, alan, bütçe |
| Lunapark Tasarımcısı | 3–5 | Dönme dolap tasarla, bilet paketlerini karşılaştır, parkını kur |
| Kargo Rotası | 3–6 | Rotaları karşılaştır, en uygununu gerekçelendir |
| Su Mühendisi | 3–6 | Depolar arasında su aktararak hedef miktara ulaş |
| Kesir Takımadaları | 4–6 | Kesir adaları arasında köprü aç, denk kesirleri keşfet |
| Çarpan Fabrikası | 5–6 | Sayıları üretim hattında çarpanlarına ayır |
| Uzay Kolonisi | 5–7 | Enerji, su ve malzemeyi oranlayarak üs kur |
| İklim İstasyonu | 5–7 | Sıcaklık ve yağış verilerinden grafik oluştur, tahmin yap |
| Köprü Mühendisi | 5–8 | Uzunluk, açı ve oran seçerek köprü tasarla |
| Veri Dedektifleri | 5–8 | Yanıltıcı ölçekleri bul, iddiaları sına |
| Denklem Kapıları | 6–8 | Denklemin iki yanına aynı işlemi uygulayarak kapıları aç |
| Lazer Laboratuvarı | 6–8 | Ayna ve açılarla lazeri hedefe yönlendir |
| Trafik Simülatörü | 7–8 | Araç hareketini grafiklerle modelle |
| Kristal Mağarası | 7–8 | Cisimlerin kesit, yüzey ve hacimlerini keşfet |

## Etkileşimler (55)

Her biri `src/interactions/<etkilesim>/` klasöründedir ve beş kategoriye ayrılır.

### Sayılar ve işlemler

| Etkileşim | Sınıf |
|---|---|
| Hızlı Noktalar | 1–2 |
| Sayıyı Parçala | 1–4 |
| Yüzlük Tablo Gizemi | 1–3 |
| Eksik Parça | 1–4 |
| Basamak Laboratuvarı | 1–5 |
| İşlem Ailesi | 2–4 |
| Çarpım Dikdörtgenleri | 2–5 |
| Sayı Piramitleri | 2–6 |
| Sayı Örüntüsü Tasarımcısı | 2–8 |
| Hangisi Daha Mantıklı? | 2–8 |
| İşlem Zinciri Tasarla | 3–8 |
| İşlem Doğru mu? | 3–8 |
| Sonsuz Çözüm Atölyesi | 3–8 |

### Kesirler, ondalıklar ve oranlar

| Etkileşim | Sınıf |
|---|---|
| Kesir Duvarı | 3–6 |
| Bütünü Değiştir | 3–6 |
| Kesir Tahmincisi | 3–6 |
| Kesirleri Karşılaştır | 3–6 |
| Kesir Yanılgıları | 4–7 |
| Ondalık Yakınlaştırıcı | 4–6 |
| Yüzde Boyama | 5–7 |
| Tarif Ölçekleyici | 5–7 |
| Oran Karıştırıcısı | 6–7 |
| İndirim Araştırmacısı | 6–8 |

### Geometri ve ölçme

| Etkileşim | Sınıf |
|---|---|
| Şekil İnşa Et | 1–5 |
| Tangram Stüdyosu | 1–6 |
| Aynadaki Şekil | 2–7 |
| Katla ve Aç | 2–8 |
| Alanı Keşfet | 3–6 |
| Çevre Tuzağı | 3–6 |
| Açıyı Oluştur | 4–7 |
| Cisim Açınımı Bulmacası | 4–8 |
| Geometrik Dönüşüm Stüdyosu | 5–8 |
| Üçgen Oluşturucu | 5–8 |
| Hacim İnşaatı | 5–8 |
| Pisagor Keşif Alanı | 8 |

### Cebir, veri ve olasılık

| Etkileşim | Sınıf |
|---|---|
| Veri Toplama Stüdyosu | 1–8 |
| Örüntüden Kurala | 4–8 |
| Eşitliği Koru | 4–8 |
| Grafik Hikâyeleri | 5–8 |
| Grafik Çiz ve Anlat | 5–8 |
| Yanıltıcı Grafikler | 5–8 |
| Olasılık Simülatörü | 5–8 |
| Rastgele mi, Adil mi? | 5–8 |
| Cebir Karolarıyla Denklem | 6–8 |
| Doğrusal İlişki Atölyesi | 8 |

### Muhakeme ve problem çözme

| Etkileşim | Sınıf |
|---|---|
| Tahmin Et, Test Et, Açıkla | 1–8 |
| Hangisi Farklı? 2.0 | 1–8 |
| Birden Fazla Çözüm | 2–8 |
| Soruyu Sen Yaz | 2–8 |
| Kendi Stratejini Öğret | 2–8 |
| Her Zaman mı, Bazen mi? | 3–8 |
| Eksik Bilgiyi Bul | 3–8 |
| Matematiksel Tartışma | 3–8 |
| Açık Uçlu Problem Laboratuvarı | 3–8 |
| Karşı Örnek Avcısı | 5–8 |

## Sanal manipülatifler (35)

### Temel manipülatifler

| Manipülatif | Sınıf |
|---|---|
| Onluk Çerçeve | 1–2 |
| Onluk Taban Blokları | 1–4 |
| Sayı Doğrusu | 1–8 |
| Kesir Şeritleri | 2–6 |
| Saat | 2–3 |
| Paralarımız | 1–3 |
| Geometri Tahtası | 1–6 |
| Simetri Tahtası | 2–7 |
| Açı Ölçer | 4–8 |
| Eşit Kollu Terazi | 1–7 |
| Cebir Karoları | 6–8 |
| Grafik Oluşturucu | 1–8 |
| Olasılık Deneyleri | 4–8 |
| Koordinat Düzlemi | 6–8 |
| Cisimler ve Açınımlar | 2–8 |

### Yeni manipülatifler

| Manipülatif | Sınıf |
|---|---|
| Rekenrek (Sayı Boncuğu) | 1–3 |
| Yüzlük Tablo | 1–4 |
| Sayı Kartları | 1–5 |
| Nokta Kartları | 1–3 |
| Çarpma Dizilim Tahtası | 2–5 |
| Çarpan Ağacı | 5–6 |
| Kesir Daireleri | 3–6 |
| Kesir Sayı Doğrusu | 3–7 |
| Yüzde Izgarası | 5–7 |
| Oran Tablosu | 6–7 |
| Çift Sayı Doğrusu | 5–7 |
| Tangram | 1–6 |
| Örüntü Blokları | 1–6 |
| İzometrik Küp Tahtası | 4–8 |
| Alan ve Çevre Tahtası | 3–7 |
| Dinamik Üçgen | 5–8 |
| Dönüşüm Düzlemi | 5–8 |
| Grafik Çizim Laboratuvarı | 5–8 |
| Eğim ve Doğru Aracı | 8 |
| Rastgele Deney Tasarımcısı | 5–8 |

## Klasör yapısı

```
asli-ogretmenimle/
├── docs/                    Tasarım ve geliştirme rehberleri
├── public/                  Logo, ikonlar, OG görseli, robots.txt, manifest
├── scripts/
│   ├── prerender.ts         Her sayfa için SEO'lu HTML, sitemap.xml ve 404.html üretir
│   └── validate-content.ts  İçerik denetimi (pnpm validate)
├── src/
│   ├── App.tsx              Rotalar
│   ├── components/          Ortak arayüz bileşenleri (Layout, Kartlar, Paylaş, Rapor gönder, SVG görseller)
│   ├── data/
│   │   ├── curriculum.ts    Müfredat: sınıflar, temalar, öğrenme çıktıları
│   │   ├── activities/      grade1.ts … grade8.ts — etkinlikler ve temaların büyük fikirleri
│   │   ├── links.ts         Öğretmenin eklediği dış linkler (Wordwall, GeoGebra, YouTube…)
│   │   ├── onlineLesson.ts  Online özel ders sayfası metinleri
│   │   └── types.ts         Veri tipleri
│   ├── engine/              Etkinlik motorları (Quiz, FillBlank, MatchGame, SortOrder, Categorize, ManipulativeTask)
│   ├── games/
│   │   ├── *.tsx            Klasik oyunlar
│   │   ├── next/            Yeni nesil oyunlar (her biri kendi klasöründe)
│   │   ├── meta.ts          Oyun listesi ve tanımları
│   │   ├── metaNext.ts      Yeni nesil oyun tanımları
│   │   ├── registry.ts      Oyun bileşenleri
│   │   └── kit.tsx, kit2.tsx Ortak oyun parçaları
│   ├── interactions/        Etkileşimler (her biri kendi klasöründe; meta.ts, registry.ts, types.ts)
│   ├── interactive/         Koordinat düzlemi, yakınlaştırma kutusu gibi ortak etkileşimli parçalar
│   ├── manipulatives/       Sanal manipülatifler (temel araçlar + new/ altında yeni araçlar)
│   ├── pages/               Sayfalar
│   └── lib/                 Soru üreteçleri, biçimlendirme, geri bildirim, rapor, SEO, rastgelelik
├── index.html
├── vercel.json              Temiz URL'ler ve önbellek ayarları
└── vite.config.ts
```

## İçerik ekleme

- **Dış link:** `src/data/links.ts` dosyasına öğe ekle; ilgili tema sayfasında “Öğretmenimin önerdiği bağlantılar” bölümünde görünür.
- **Etkinlik:** `src/data/activities/gradeN.ts` dosyasına ekle, ardından `pnpm validate` çalıştır.
- **Oyun / manipülatif:** [oyun-gelistirme-rehberi.md](oyun-gelistirme-rehberi.md) kurallarına uy.
