# Aslı Öğretmenimle

1–8. sınıf öğrencileri için **Türkiye Yüzyılı Maarif Modeli** matematik öğretim programlarına uygun oyunlar, interaktif etkinlikler ve sanal manipülatifler.

Tüm etkinlikler **John A. Van de Walle’ün gelişimsel, problem çözme odaklı yaklaşımına** göre tasarlanmıştır: her etkinlik *Başlarken → Keşfet → Düşün ve Paylaş* akışıyla ilerler, her öğrenme çıktısında etkinlikler *somut → model → sembol → problem* sırasıyla dizilir. Ayrıntılar: [docs/van-de-walle-tasarim.md](docs/van-de-walle-tasarim.md) ve sitedeki **Yaklaşımımız** sayfası.

- 8 sınıf, 56 tema, 211 öğrenme çıktısının her biri için en az bir etkinlik
- Etkinlik türleri: eşleştirme, boşluk doldurma, sürükle-sırala, sürükle-grupla, test, “Hangisi farklı?”, hızlı bakış, manipülatif görevleri
- Strateji odaklı üreteçler (10’a tamamlama, ikizler, toplamayı düşünerek çıkarma, türetilmiş çarpma, telafi), kavram yanılgısına göre geri bildirim, kademeli ipuçları
- 13 matematik oyunu (`/oyunlar`), her biri seçilen sınıfa göre zorlaşır: Balon Patlat, Kurbağa Zıplatma, Gizli Sayı Dedektifi, Bir İşlem, Kesir Pizzacısı, Bakkal Kasası, Robot Kodlama, Sayı Doğrusu Tahmini, Sihirli Makine, Sayı Labirenti, Koordinat Amirali, Açı Topçusu, Zar Yarışı
- 15 sanal manipülatif: onluk çerçeve, onluk taban blokları, sayı doğrusu, kesir şeritleri, saat, paralar, geometri tahtası, simetri tahtası, açı ölçer, terazi, cebir karoları, grafik oluşturucu, olasılık deneyleri, koordinat düzlemi, cisimler ve açınımlar
- Her etkinliğin kendi linki vardır (`/etkinlik/...`); **Paylaş** düğmesi linki kopyalar ya da telefonun paylaşım menüsünü açar
- Veritabanı ve üyelik yoktur; telefon, tablet ve bilgisayarda çalışır

## Geliştirme

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm validate     # içerik denetimi (tüm çıktılar kapsanıyor mu, cevaplar tutarlı mı)
pnpm build        # dist/ klasörüne üretim çıktısı
pnpm preview      # üretim çıktısını yerelde dene
```

## Vercel'de yayınlama

1. Projeyi bir GitHub deposuna yükleyin.
2. [vercel.com](https://vercel.com) → **Add New → Project** → depoyu seçin.
3. Framework olarak **Vite** otomatik algılanır (Build: `pnpm build`, Output: `dist`). **Deploy**'a basın.
4. İsterseniz **Settings → Domains** bölümünden kendi alan adınızı bağlayın.

`vercel.json` dosyası, paylaşılan linklerin (ör. `/etkinlik/g3-tek-cift`) doğrudan açılabilmesini sağlar.

## Arama motorları (SEO)

- `pnpm build`, Vite derlemesinden sonra `scripts/prerender.ts` çalıştırır: her etkinlik, oyun, tema, keşif ve manipülatif sayfası için `dist/` içine kendi başlığı, açıklaması, canonical adresi, Open Graph etiketleri, JSON-LD'si ve okunabilir içeriği olan ayrı bir `.html` yazar. Ayrıca `sitemap.xml` ve gerçek 404 durum kodu döndüren `404.html` üretir.
- Başlık ve açıklama metinleri tek yerde, `src/lib/seo.ts` içinde üretilir. Aynı fonksiyonlar tarayıcıda sayfalar arası geçişte de kullanılır (`usePageTitle`).
- Başlıklar müfredat adlarından değil, **aranan konu adlarından** kurulur: `src/data/seoKeywords.ts` her öğrenme çıktısı, tema, oyun, manipülatif ve etkileşim için Google'da aranan ifadeyi tutar (ör. `MAT.5.1.4` → “Kesirleri Karşılaştırma”, `pizza` → “Kesir Oyunu”). Yeni içerik eklerken buraya da bir satır ekleyin; eksik olanlar ve yinelenen başlıklar `pnpm build` sırasında uyarı olarak yazılır.
- Konu anlatımları (`/rehber/...`) `src/data/guides.ts` içindedir; her rehber bağlı olduğu öğrenme çıktılarının etkinliklerine, oyunlara ve araçlara bağlanır, etkinlik sayfaları da rehbere geri bağlantı verir.
- Prerender sayfanın altına bir `<section id="seo-article">` (örnek sorular ve cevaplar, açıklamalar, iç bağlantılar) yazar. React `#root`'u silerken bu bölüm `src/lib/seoArticle.ts` ile korunup sayfanın altına geri konur; böylece Google'ın JavaScript çalıştırdıktan sonra gördüğü sayfada da kalır.
- Test Çöz sayfaları (`/test`, `/test/7`, `/test/7/<tema>`) “matematik test çöz”, “7. sınıf matematik testi”, “… testi” aramalarını hedefler. Sorular etkinliklerdeki çoktan seçmeli sorulardan `src/data/tests.ts` ile toplanır; yeni quiz etkinliği eklendikçe testler kendiliğinden büyür.
- Her derleme `docs/seo-envanter.csv` dosyasını yeniler: her adresin hedef kelimesi, title, description, H1 ve kelime sayısı.
- Online özel ders sayfasının (`/online-ozel-ders`) metinleri `src/data/onlineLesson.ts` içindedir.
- Alan adı `src/lib/seo.ts` içindeki `SITE_URL`, `index.html` ve `public/robots.txt` dosyalarında yazılıdır (`https://www.asliogretmenimle.com`).
- Yayından sonra: [Google Search Console](https://search.google.com/search-console)'a alan adını ekleyin ve `https://www.asliogretmenimle.com/sitemap.xml` adresini gönderin.

## Aslı Hoca için: dış link ekleme

Wordwall, GeoGebra, YouTube gibi sitelerden link eklemek için `src/data/links.ts` dosyasını açın ve listeye yeni bir öğe ekleyin:

```ts
{
  title: 'Kesir Duvarı',
  url: 'https://www.geogebra.org/m/xxxxxxx',
  target: 'MAT.4.1.7',            // öğrenme çıktısı kodu ya da "4/sayilar-ve-nicelikler-2" (tema)
  kind: 'geogebra',               // 'oyun' | 'video' | 'geogebra' | 'calisma-kagidi' | 'diger'
  note: 'Denk kesirleri keşfet',
},
```

Link, bağlı olduğu temanın sayfasında “Öğretmenimin önerdiği bağlantılar” bölümünde görünür. Değişikliği GitHub'a gönderdiğinizde Vercel siteyi otomatik günceller.

## Yeni etkinlik ekleme

Etkinlikler `src/data/activities/gradeN.ts` dosyalarındadır (her dosya ayrıca temaların “büyük fikirlerini” içeren `gradeNNotes` dışa aktarır). Veri yapısı `src/data/types.ts` içinde açıklanmıştır; çalışma anında soru üreten üreteçler `src/lib/generators.ts` içindedir. Yeni etkinlik yazarken `docs/van-de-walle-tasarim.md` kurallarına uyun ve ardından `pnpm validate` çalıştırın (aşama, Başlarken, Düşün ve Paylaş alanları ile her temada bir “Hangisi farklı?” etkinliği denetlenir).

## Proje yapısı

```
src/
  data/          müfredat (curriculum.ts), etkinlikler, dış linkler, tipler
  engine/        etkinlik motorları (Quiz, FillBlank, MatchGame, SortOrder, Categorize, ManipulativeTask)
  manipulatives/ sanal manipülatifler
  games/         oyunlar (meta.ts: liste ve sınıflar, registry.ts: bileşenler, kit.tsx: ortak parçalar)
  components/    ortak arayüz bileşenleri ve SVG görseller
  pages/         sayfalar
  lib/           üreteçler, biçimlendirme, ses ve kutlama efektleri
scripts/         içerik doğrulama
```
