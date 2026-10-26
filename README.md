# Aslı Öğretmenimle

1–8. sınıf öğrencileri için **Türkiye Yüzyılı Maarif Modeli** matematik öğretim programlarına uygun oyunlar, interaktif etkinlikler ve sanal manipülatifler.

- 8 sınıf, 56 tema, 211 öğrenme çıktısının her biri için en az bir etkinlik
- Etkinlik türleri: eşleştirme, boşluk doldurma, sürükle-sırala, sürükle-grupla, test, manipülatif görevleri
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

Etkinlikler `src/data/activities/gradeN.ts` dosyalarındadır. Veri yapısı `src/data/types.ts` içinde açıklanmıştır; çalışma anında rastgele soru üreten üreteçler `src/lib/generators.ts` içindedir. Ekledikten sonra `pnpm validate` çalıştırın.

## Proje yapısı

```
src/
  data/          müfredat (curriculum.ts), etkinlikler, dış linkler, tipler
  engine/        etkinlik motorları (Quiz, FillBlank, MatchGame, SortOrder, Categorize, ManipulativeTask)
  manipulatives/ sanal manipülatifler
  components/    ortak arayüz bileşenleri ve SVG görseller
  pages/         sayfalar
  lib/           üreteçler, biçimlendirme, ses ve kutlama efektleri
scripts/         içerik doğrulama
```
