# Yönetim paneli ve Stüdyo

Adres: **`/yonetim`** (ör. https://www.asliogretmenimle.com/yonetim). Arama motorlarına kapalıdır.

## Ne yapılabilir?

| Bölüm | İşlev |
|---|---|
| **Genel bakış** | Sayılar, son değişiklikler, son Stüdyo çalışmaları, kurulum durumu |
| **Stüdyo (AI)** | Öğretmen ne istediğini yazar (isterse ekran görüntüsü/çalışma kâğıdı ekler), yapay zekâ oyun, etkileşim, manipülatif ya da test üretir. Sağda canlı önizleme (telefon/tablet/geniş, sınıf seçimi), sohbetle düzelttirme, sürümler arasında gezinme, kodu elle düzenleme, önizlemedeki hatayı “AI’ya düzelttir”. **Yayınla** ile başlık, URL, açıklama, sınıflar, öğrenme çıktısı vb. belirlenip sitede yayınlanır. |
| **Sınıflar (1–8)** | Her sınıfın Etkinlikler, Testler, Oyunlar, Etkileşimler ve Manipülatifler sekmeleri: düzenle, gizle, sil, yeni ekle, başka sınıftaki oyunu bu sınıfa ekle, bu sınıftan çıkar. Testler sekmesi her temanın Test Çöz soru havuzunu gösterir. |
| **Kütüphane** | Oyunlar, etkileşimler, manipülatifler, konu anlatımları (rehberler), dış bağlantılar |
| **Sayfa başlıkları (SEO)** | Her sayfanın Google başlığı/açıklaması, noindex; Google önizlemesi |
| **Değişiklik geçmişi** | Her kayıt saklanır; tek tıkla eski hâle dönülür (silinen de geri gelir) |
| **Ayarlar** | Stüdyo modeli, düşünme düzeyi, kalıcı yönergeler; yöneticiler; siteyi yeniden derle |

Etkinlik/test düzenleyicisi sitenin gerçek etkinlik motorlarıyla **canlı önizleme** gösterir. Her düzenleyicide **Taslak** (sitede görünmez) ve **Yayınla** vardır; Ctrl/Cmd + S kaydeder.

## Nasıl çalışır?

Sitedeki içerik kodda durmaya devam eder (`src/data`, `src/games`, `src/interactions` …). Panel değişiklikleri Supabase'deki `cms_entries` tablosuna yazılır ve koddaki içeriğin **üstüne** uygulanır (`src/cms/overlay.ts`):

- Koddaki bir öğe düzenlenirse yalnızca değişen alanlar saklanır; **Orijinale dön** kaydı siler.
- **Gizle** öğeyi listelerden ve sayfasından kaldırır; **Geri getir** geri açar.
- Panelden/Stüdyo'dan eklenen öğeler (`origin = custom`) tamamen veritabanındadır. Oyun/etkileşim/manipülatifler tek dosyalık HTML olarak saklanır ve sitede `sandbox` bir iframe'de çalışır (sitenin oturumuna/verisine erişemez). Testler sitenin kendi test motoruyla çalışır ve Test Çöz sayfalarına otomatik katılır.
- Site açılışta yayındaki kayıtları okur (önceki ziyaretten önbellekte tutulur, beklemez). Değişiklikler **anında** sitededir.
- `pnpm build` sırasında prerender de kayıtları uygular; böylece yeni sayfalar Google için de üretilir. Bunun için yayından sonra site yeniden derlenmelidir (Ayarlar → “Siteyi şimdi yeniden derle” ya da otomatik derleme).
- Supabase anahtarı tanımlı değilse site koddaki içerikle aynen çalışır.

> Koddaki hazır oyunların **oynanış kodu** panelden değiştirilemez (adı, açıklaması, sınıfları, tanıtım metinleri değiştirilebilir, gizlenebilir). Bir oyunun farklı bir sürümünü istiyorsanız Stüdyo'da yenisini üretip eskisini gizleyin.

## Kurulum (bir kez)

### 1. Veritabanı
Supabase → **SQL Editor** → `supabase/migrations/20261126120000_cms.sql` dosyasının tamamını yapıştırıp **Run**.

### 2. Giriş ayarları
Supabase → **Authentication → URL Configuration**
- Site URL: `https://www.asliogretmenimle.com`
- Redirect URLs: `https://www.asliogretmenimle.com/yonetim`, `http://localhost:5173/yonetim`

(İsterseniz Authentication → Providers → Email altında “Confirm email”i kapatabilirsiniz; açıksa yeni hesaplar e-postadaki bağlantıyla doğrulanır.)

### 3. Site anahtarı
Supabase → **Project Settings → API** → *anon / publishable* anahtarı.
- Yerelde proje köküne `.env.local`:
  ```
  VITE_SUPABASE_URL=https://swwfgmgxqqmynmjpchxv.supabase.co
  VITE_SUPABASE_ANON_KEY=…
  ```
- Vercel → Project → Settings → **Environment Variables**: aynı iki değişken (Production + Preview), sonra yeniden deploy.

### 4. Stüdyo sunucusu (OpenAI)
OpenAI anahtarı tarayıcıya hiç gitmez; Supabase Edge Function'da gizli tutulur.
```bash
supabase login                      # projenin sahibi olan hesapla
supabase functions deploy studio --project-ref swwfgmgxqqmynmjpchxv
supabase secrets set OPENAI_API_KEY=sk-… --project-ref swwfgmgxqqmynmjpchxv
# isteğe bağlı:
supabase secrets set OPENAI_MODEL=gpt-5 --project-ref swwfgmgxqqmynmjpchxv
supabase secrets set VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/… --project-ref swwfgmgxqqmynmjpchxv
```
`VERCEL_DEPLOY_HOOK`, GitHub'daki aynı adlı secret ile aynı adrestir (Vercel → Settings → Git → Deploy Hooks).

Stüdyo, OpenAI **Responses API**'yi arka plan modunda kullanır (uzun üretimler zaman aşımına uğramaz; sayfa kapansa da iş sürer, açınca kaldığı yerden devam eder). Model ve düşünme düzeyi panelde Ayarlar'dan değiştirilebilir.

### 5. İlk giriş
`/yonetim` → **Hesap oluştur** → giriş yapınca **Panel sahibi ol**. Diğer öğretmenler önce hesap oluşturur, sonra sahip onları Ayarlar → Yöneticiler'den ekler.

## Dosyalar

```
supabase/migrations/…_cms.sql   tablolar, yetkiler (RLS), geçmiş tetikleyicisi
supabase/functions/studio/      OpenAI köprüsü (index.ts) ve asistan yönergesi (prompt.ts)
src/cms/                        sitenin panel katmanı: overlay, yükleme, HTML çerçevesi, SEO
src/admin/                      panel arayüzü (yalnızca /yonetim açılınca indirilir)
  studio/                       Stüdyo
  editors/                      etkinlik/test ve oyun/etkileşim/manipülatif/rehber düzenleyicileri
  pages/                        genel bakış, sınıf, kütüphane, bağlantılar, SEO, geçmiş, ayarlar
```

Stüdyo'nun ürettiği HTML'in siteyle konuşma yolu (`src/cms/bridge.ts`): `AO.grade`, `AO.finish({ stars, summary, score, insight })`, `AO.sound('ok' | 'bad' | 'win')`.
