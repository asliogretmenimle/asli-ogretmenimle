# Yeni Nesil Oyun ve Manipülatif Geliştirme Rehberi

Bu rehber, “Aslı Öğretmenimle” sitesine eklenecek **yeni nesil oyunlar** ve **sanal manipülatifler** için ortak kuralları ve altyapıyı anlatır. Önce `docs/van-de-walle-tasarim.md` dosyasını okuyun.

## 1. Felsefe (Van de Walle)

| Klasik oyun | Yeni nesil oyun |
|---|---|
| “8 + 7 = ? Doğru balonu patlat.” | “8 kırmızı ve 7 mavi blok var. Yeniden gruplayarak toplamı en kolay nasıl bulursun? Başka bir yol daha keşfet.” |
| “3/4 kesrini seç.” | “Aynı büyüklükteki üç pastayı farklı biçimlerde böl. Hangilerinde aynı miktar pasta var, kanıtla.” |

Her oyun ve manipülatif için zorunlu standartlar:

1. **Matematiksel keşif** — Önce bir problem/görev sunulur. Formül ya da yöntem verilmez; öğrenci nesneleri hareket ettirerek ilişkiyi keşfeder.
2. **Birden fazla çözüm yolu** — Uygun görevlerde tek bir doğru işlem dizisi zorunlu değildir. Farklı geçerli çözümler `useSolutions()` ile toplanır ve ödüllendirilir (“Başka bir yol bul!”).
3. **Somut → Görsel → Sembolik** — Seviyeler önce nesnelerle, sonra modellerle, en son sembollerle çalışır. Sembol, öğrencinin hareketinden *türeyerek* ekranda belirir (ör. blokları gruplayınca `8 + 7 = 10 + 5` yazısı oluşur).
4. **Akıllı geri bildirim** — Yanlışta kırmızı “yanlış” yok. `<Nudge question=… tool=…>` ile hatanın kaynağını düşündüren bir soru ve gerekirse “Modelle dene” düğmesiyle uygun manipülatif açılır. Kavram yanılgısı `misconception` olarak rapora yazılır.
5. **Strateji yakalama** — Çözümden sonra uygun yerlerde `<StrategyPicker>` (“Nasıl düşündün?”) gösterilir; seçim öğretmen raporuna yazılır. Oyun, hamlelerden stratejiyi kendisi de çıkarabilir (`useTracker().strategy('10’a tamamlama')`).
6. **Süre baskısı yok** — Zamanlayıcı, can, ceza yok. Yıldız “keşif/çözüm” ödülüdür.
7. **Yaşa uygun görsel tasarım** — `useAge(grade)`:
   - `mini` (1–3): sevimli karakterler (emoji/SVG), büyük dokunma alanları (≥ 56 px), somut nesneler, sıcak renkler.
   - `kesif` (4–6): keşif ve inşa ortamları (harita, atölye, ızgara), orta yoğunluk.
   - `atolye` (7–8): olgun simülasyon/laboratuvar görünümü (koyu zemin `Scene` otomatik), veri ve grafik ağırlıklı.
8. **Öğretmen değerlendirmesi** — `useTracker()`: `attempt(ok)`, `item(firstTry)`, `hint()`, `strategy(ad)`, `misconception(metin)`, `solutions(n)`. Her görev/tur bitince `item()` çağrılmalıdır.

## 2. Tablet UX kuralları (öğretmen çoğunlukla tablet kullanır)

- Hedef cihaz: 10–13" tablet, hem dikey hem yatay. Yatayda (≥ 1024 px) oyun alanı solda, görev/kontrol paneli sağda (`lg:grid-cols-[1fr_340px]`); dikeyde alt alta.
- Dokunma hedefi en az 48 px (1–3. sınıfta 56 px). Hover’a bağlı bilgi yok.
- **Her grafik ve sahne dokunmatik ve dinamik olmalı:**
  - Matematiksel eksenler (sayı doğrusu, koordinat düzlemi, grafik) için `<Plane>`: iki parmakla anlamsal yakınlaştırma (çentikler 1 → 0,5 → 0,1… yeniden hesaplanır), boş alanda sürükleyerek kaydırma, ± ve ⤢ düğmeleri.
  - Nesneler: `<DragPoint>` (sürüklenebilir nokta, ızgaraya yapışma), `<Pinchable>` (nesne üzerinde iki parmak: ölçekle/döndür; tek parmak: taşı). Örnek: bir doğru parçası iki parmakla uzayıp kısalır.
  - Resim/sahne türü içerik için `<ZoomBox>`: görsel yakınlaştırma + kaydırma.
  - Sürüklenebilir öğeler `data-handle` niteliği taşımalı (kaydırmayı tetiklemesin), `touch-action: none` olmalı. Chrome’da `touch-action` SVG alt öğelerinde dikkate alınmaz; `<svg>` ya da onu saran HTML öğesine verin.
- Sürükle-bırak için `@use-gesture/react` (`useDrag`, `useGesture`) ya da `@dnd-kit` kullanın; her sürüklemenin bir dokun-dokun alternatifi olsun.
- Animasyonlar kısa ve anlamlı; `prefers-reduced-motion` saygı görür (global CSS hallediyor).
- Metinler Türkçe, kısa, sıcak. Sayılardan sonra ekler doğru: 2’yi, 3’ten, 6’ya, 9’u, 10’a (gerekirse `ek()` — `src/lib/generators.ts`).

## 3. Altyapı (dosyalar)

| Dosya | İçerik |
|---|---|
| `src/interactive/Plane.tsx` | `Plane` (seçenekler: `mode`, `onTap`, `tickPx`, `fixedStep`, `equalUnits={false}` ile bağımsız y ölçeği, `locked`), `usePlane`, `DragPoint`, `Pinchable` (`onScale`, `onRotate`, `onMove`, `onEnd`) |
| `src/interactive/ZoomBox.tsx` | Görsel yakınlaştırma kabı |
| `src/interactive/axis.ts` | `niceStep`, `ticks`, `fmtTick`, `snap`, `clamp` |
| `src/games/kit.tsx` | `GameProps`, `GameResult`, `starsFor`, `useWidth`, `useFrame`, `Toast` |
| `src/games/kit2.tsx` | `useAge`, `Scene`, `TaskCard`, `LevelDots`, `Nudge`, `StrategyPicker`, `useSolutions`, `SolutionList`, `BigButton` |
| `src/games/ToolSheet.tsx` | Manipülatifi alttan açılan panelde gösterir |
| `src/lib/trackerContext.tsx` | `useTracker()` |
| `src/components/Visual.tsx`, `MathText.tsx` | Ortak SVG görseller ve matematik yazımı (`[[3/4]]`, `x^{2}`, `√{16}`) |
| `src/manipulatives/types.ts`, `ui.tsx` | `ToolDef`, `Stepper`, `ToolButton`, `Readout` |

Referans uygulamalar: `src/manipulatives/new/egim.tsx` (doğruyu iki parmakla ölçekleme/döndürme, sürüklenebilir noktalar, canlı eğim) ve `src/manipulatives/new/kesirdogrusu.tsx` (anlamsal yakınlaştırmalı sayı doğrusu).

## 4. Oyun sözleşmesi

Her yeni nesil oyun `src/games/next/<id>/` klasöründedir:

- `index.tsx` — `export default function Oyun({ grade, onFinish }: GameProps)`.
  - Oyun kendi seviyelerini (en az 4–6 görev) sınıfa göre üretir: 1–2. sınıf ile 3–4. sınıf aynı oyunun yalnızca büyük sayılı hâli olmamalı; **matematiksel yapı, temsil ve beklenen düşünme düzeyi** değişmeli.
  - Bittiğinde `onFinish({ stars, summary, score, insight })` çağırır. `insight`: öğrencinin keşfettiği fikri özetleyen tek cümle.
- `meta.ts` — `GameMeta` (bkz. `src/games/meta.ts`): `name`, `description`, `emoji`, `color`, `grades`, `nextGen: true`, `skills` (her sınıf için ne çalışılıyor), `howTo` (3–4 kısa adım), `launch` (Başlarken hikâyesi), `reflect` (Düşün ve Paylaş sorusu), `bigIdea`, `strategies` (yakalanabilen stratejiler), `outcomes` (ilgili öğrenme çıktısı kodları, `src/data/curriculum.ts`).
- Oyun sayfası (Başlarken ekranı, sınıf seçimi, bitiş, rapor gönderme) `src/pages/Games.tsx` tarafından sağlanır; oyunun içinde tekrar etmeyin.

## 5. Manipülatif sözleşmesi

Her yeni manipülatif `src/manipulatives/new/<id>.tsx` dosyasında `ToolDef` dışa aktarır (adı ve açıklaması `src/manipulatives/meta.ts`’te hazır):

- `Component({ value, onChange, config, target, locked })` kontrollü bileşen. `target` yoksa serbest mod: keşif için zengin geri bildirim (`Readout`). `target` varsa görev modu: cevabı ele veren göstergeleri gizle.
- `check(value, target, config)` görev denetimi. Desteklenen hedef biçimini dosyanın başında yorumla belgeleyin.
- **Önemli:** Manipülatif yalnızca hareket ettirilebilen nesnelerden ibaret olmamalı; öğrenci parçaları hareket ettirdiğinde **matematiksel ilişki görünür hâle gelmeli** (ör. Alan-Çevre Tahtası’nda kareler yeniden düzenlenince alan sabit kalırken çevrenin değiştiği canlı gösterilir).

## 6. Kalite kontrolü

- `npx tsc -p tsconfig.app.json --noEmit` hatasız.
- Geliştirme sunucusu: `http://localhost:5174` (çalışıyor). Oyunlar: `/oyun/<id>?sinif=N`, manipülatifler: `/manipulatif/<id>`.
- Ekran görüntüsü ile kontrol için Playwright kurulu: `/private/tmp/claude-501/-Users-dancho-Desktop-asli-ogretmenimle/e0d1e2f0-2fac-4dfc-8d8c-dc63f626d153/scratchpad/pw` (bkz. `shot.cjs`, dokunmatik pinch için `pinch.cjs`). Kendi geçici dosyalarınızı **kendi alt klasörünüzde** tutun (ör. `scratchpad/<id>-work/`), ortak dosya adları kullanmayın.
- 820×1180 (tablet dikey), 1180×820 (tablet yatay) ve 390×844 (telefon) boyutlarında kontrol edin.
