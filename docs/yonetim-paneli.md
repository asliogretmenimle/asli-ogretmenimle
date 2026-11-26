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
| **Ders başvuruları** | /online-ozel-ders sayfasındaki formdan gelen ön kayıtlar: durum (Yeni / Arandı / Kayıt oldu / Kapandı), not, tek dokunuşla arama ve WhatsApp, CSV. Menüde yeni başvuru sayısı görünür. |
| **Analiz** | Ziyaretçi, görüntülenme, oturum, en çok açılan sayfalar, bölümler, kaynak siteler, cihaz ve saat dağılımı. Çerez yok, IP saklanmaz; panel ve önizleme sayılmaz. “Bu tarayıcıdaki ziyaretlerimi sayma” ile kendi ziyaretlerinizi dışarıda bırakın. |
| **Sayfalar ve ana sayfa** | Ana sayfa düzeni (Klasik / Odak / Vitrin / Öğretmen), bölümlerin sırası ve görünürlüğü, tüm karşılama metinleri; Oyunlar, Etkileşimler, Manipülatifler, Konu Anlatımı, Test Çöz, Çarpım Tablosu, Yaklaşımımız ve Online Özel Ders sayfalarının metinleri (form soruları dahil). |
| **Ayarlar** | OpenAI anahtarı (yalnızca panel sahibi değiştirir, sunucuda gizli saklanır), Stüdyo modeli, düşünme düzeyi, kalıcı yönergeler; yöneticiler; siteyi yeniden derle |

Tüm düzenleyicilerde sağda **canlı önizleme** vardır: sitenin gerçek sayfası, kaydedilmemiş değişikliklerle telefon, tablet ve bilgisayar genişliğinde açılır. Her düzenleyicide **Taslak** (sitede görünmez) ve **Yayınla** vardır; Ctrl/Cmd + S kaydeder.

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
Supabase → **SQL Editor** → `supabase/migrations/20261126120000_cms.sql` dosyasının tamamını yapıştırıp **Run**. (Dosyayı bu güncellemeden önce çalıştırdıysanız yalnızca `20261126130000_cms_grants.sql` dosyasını çalıştırın: yeni projelerde tablolara okuma izni otomatik verilmiyor.)

Ardından `supabase/migrations/20261126140000_cms_v2.sql` dosyasını da çalıştırın (sayfa içerikleri, ders başvuruları, ziyaret analizi, OpenAI anahtarı tablosu).

### 2. Giriş ayarları
- **Authentication → Sign In / Providers**: “Allow new users to sign up” kapalı olsun. Hesapları panel sahibi açar.
- **Authentication → URL Configuration**: Site URL `https://www.asliogretmenimle.com`; Redirect URLs `https://www.asliogretmenimle.com/yonetim`, `http://localhost:5173/yonetim` (şifre sıfırlama bağlantısı için).

### 3. Site anahtarı
Supabase → **Project Settings → API Keys** → *publishable* anahtar (`sb_publishable_…`).
- Yerelde `.env.local` (hazır).
- Vercel → Settings → **Environment Variables**: `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY`, sonra yeniden deploy.

Bu anahtar Edge Function Secrets'a eklenmez; fonksiyon Supabase'in kendi anahtarlarını kullanır.

### 4. Stüdyo sunucusu (OpenAI)
OpenAI anahtarı tarayıcıya hiç gitmez; Edge Function'da gizli tutulur.

**Panelden (en kolay):**
1. Edge Functions → **Deploy a new function → Via Editor**, adı `studio`.
2. `supabase/functions/studio/index.ts` dosyasının tamamını yapıştırıp **Deploy**.
3. Fonksiyonun **Details/Settings** bölümünde **Verify JWT** (Enforce JWT verification) **kapalı** olsun; yetkiyi fonksiyon kendisi denetler.
4. OpenAI anahtarını panelde **Ayarlar → OpenAI anahtarı**'ndan girin (ya da Edge Functions → Secrets: `OPENAI_API_KEY`). İsteğe bağlı secret'lar: `OPENAI_MODEL`, `VERCEL_DEPLOY_HOOK`.

`index.ts` her güncellendiğinde fonksiyonun kodunu aynı şekilde yeniden yapıştırıp **Deploy** edin.

**CLI ile:** tarayıcı girişi çalışmazsa https://supabase.com/dashboard/account/tokens adresinden bir erişim belirteci oluşturun:
```bash
supabase login --token sbp_…
supabase functions deploy studio --project-ref swwfgmgxqqmynmjpchxv --no-verify-jwt
supabase secrets set OPENAI_API_KEY=sk-… --project-ref swwfgmgxqqmynmjpchxv
```
`VERCEL_DEPLOY_HOOK`, GitHub'daki aynı adlı secret ile aynı adrestir (Vercel → Settings → Git → Deploy Hooks).

### 5. İlk giriş (e-posta + şifre)
1. Supabase → **Authentication → Users → Add user → Create new user**: e-posta ve şifre girin, **Auto Confirm User** işaretli olsun.
2. `/yonetim` → bu e-posta ve şifreyle **Giriş yap** → **Panel sahibi ol**.
3. Diğer öğretmenlerin hesaplarını panelde **Ayarlar → Yöneticiler**'den e-posta + şifreyle oluşturun. Herkes şifresini Ayarlar → “Şifremi değiştir”den değiştirebilir; unutulursa giriş ekranındaki “Şifremi unuttum” e-postayla sıfırlar.

## Dosyalar

```
supabase/migrations/…_cms.sql   tablolar, yetkiler (RLS), geçmiş tetikleyicisi
supabase/functions/studio/      OpenAI köprüsü ve asistan yönergesi (tek dosya: index.ts)
src/cms/                        sitenin panel katmanı: overlay, yükleme, HTML çerçevesi, SEO
src/admin/                      panel arayüzü (yalnızca /yonetim açılınca indirilir)
  studio/                       Stüdyo
  editors/                      etkinlik/test ve oyun/etkileşim/manipülatif/rehber düzenleyicileri
  pages/                        genel bakış, sınıf, kütüphane, bağlantılar, SEO, geçmiş, ayarlar
```

Stüdyo'nun ürettiği HTML'in siteyle konuşma yolu (`src/cms/bridge.ts`): `AO.grade`, `AO.finish({ stars, summary, score, insight })`, `AO.sound('ok' | 'bad' | 'win')`.
