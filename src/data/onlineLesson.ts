/**
 * Online özel ders sayfasının metinleri.
 * Hem sayfa (pages/OnlineLesson.tsx) hem de arama motorları için üretilen statik HTML (scripts/prerender.ts) bu dosyayı kullanır.
 */

/**
 * Ön kayıt formunun adresi (Google Form).
 * docs.google.com/forms/... biçimindeki tam adres verilirse form sayfanın altına da gömülür;
 * forms.gle kısa linki verilirse yalnızca düğmeler formu yeni sekmede açar.
 */
export const LESSON_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd4L6v2T0r8e4bV_a4p8QFMGDEUTjyao8DykD1N9My4HOHISg/viewform'

export const lessonAreas = ['Antakya', 'Samandağ', 'Hatay'] as const

export const lessonIntro =
  'Aslı Öğretmen, Hatay’da Antakya ve Samandağ’daki öğrencilere internet üzerinden birebir ya da 3–4 kişilik küçük gruplar hâlinde online matematik dersi veriyor. Dersler 1. sınıftan 8. sınıfa kadar, Türkiye Yüzyılı Maarif Modeli matematik öğretim programına uygun ve öğrencinin kendi hızına göre ilerler.'

export const lessonHero = {
  kicker: 'Birebir ve küçük grup · Online · 1–8. sınıf',
  title: 'Çocuğunuz matematiği ezberlemesin, gerçekten anlasın.',
  lead: 'Aslı Öğretmen ile birebir ya da 3–4 kişilik küçük grup online matematik derslerinde çocuğunuz evinden katılır, kendi hızında ilerler ve “anlamadım” demekten çekinmez. Konular modellerle, oyunlarla ve somut araçlarla önce anlaşılır, sonra pekiştirilir.',
  promise: 'Ön kayıt 1 dakika sürer, ücretsizdir ve hiçbir yükümlülük getirmez. Formu doldurun, Aslı Öğretmen sizinle iletişime geçsin.',
}

export const lessonTrust = ['Birebir ya da 3–4 kişilik grup', '1–8. sınıf + LGS', 'Maarif Modeli’ne uygun', 'Evden katılım', 'Veliye düzenli bilgi']

/** “Bu cümleler tanıdık mı?” bölümü: velinin kendini tanıdığı anlar */
export const lessonPains = [
  '“Okulda anladım ama evde yapamıyorum.”',
  'Ödev saati her akşam gerginliğe dönüşüyor.',
  'Çarpım tablosu, kesirler ya da problemler bir türlü oturmuyor.',
  'Notlar düşüyor ama nedenini kimse tam söyleyemiyor.',
  '“Ben matematikte zaten kötüyüm” demeye başladı.',
  'LGS yaklaşıyor, eksikler gözünüzü korkutuyor.',
  'Kalabalık kursta soru sormaya çekiniyor, geride kalıyor.',
  'Siz anlatmaya çalışıyorsunuz ama yöntemler okuldakinden farklı.',
]

/**
 * “Size en uygun durumu seçin” bölümü.
 * Her ziyaretçi tipi için ayrı yanıt: hiç duymamış, duymuş ama bilmeyen, güvenmeyen, hiç duymamış ve güvenmeyen, kararsız.
 */
export const lessonPersonas = [
  {
    id: 'yeni',
    label: 'Online özel dersi ilk kez duyuyorum',
    title: 'Kısaca: öğretmen yalnızca çocuğunuzla ya da 3–4 kişilik küçük bir grupla ders yapar, ekran üzerinden.',
    body: 'Online ders, bildiğiniz özel dersin evinizden yapılan hâlidir. Çocuğunuz bilgisayar, tablet ya da telefonla görüntülü olarak bağlanır; Aslı Öğretmen ekranda modeller, şekiller ve sanal araçlarla konuyu onunla birlikte çalışır. Sınıfta 30 kişiden biri değil; derste ya tek öğrencidir ya da 3–4 kişilik küçük bir grubun parçasıdır.',
    points: ['Yol, servis, bekleme yok', 'Birebir ya da en fazla 4 kişilik grup', 'Kurulum gerekmez, bağlantı linki yeterli'],
    cta: 'Bilgi almak için ön kayıt bırakın',
    more: { href: '#nasil', label: 'Adım adım nasıl işliyor?' },
  },
  {
    id: 'icerik',
    label: 'Duydum ama derste ne yapıldığını bilmiyorum',
    title: 'Bir dersin içinde ne olduğunu açıkça görün.',
    body: 'Ders, konu anlatıp test çözdürmekten ibaret değildir. Önce çocuğunuzun nerede takıldığı bulunur; konu somut modellerle keşfedilir, birlikte soru çözülür, sonra çocuk kendi başına dener. Ders sonunda bir sonraki adım ve evde yapılacak kısa çalışma belirlenir.',
    points: ['Eksik konu tespiti ile başlar', 'Okuldaki konuyla paralel ilerler', 'Ders dışı tekrar için ücretsiz etkinlikler'],
    cta: 'Çocuğum için ne yapılacağını öğrenmek istiyorum',
    more: { href: '#ders', label: 'Bir ders nasıl geçer?' },
  },
  {
    id: 'supheli',
    label: 'Duydum ama online dersin işe yarayacağından emin değilim',
    title: 'Şüpheniz çok haklı. Bu yüzden önce görüşüyoruz.',
    body: 'Online dersin verimi; grubun küçüklüğüne, öğretmenin yöntemine ve çocuğun aktif tutulmasına bağlıdır. Aslı Öğretmen’in derslerinde çocuk izleyici değil, ekranda kendisi yapan, söyleyen, açıklayan kişidir. Kayıt bırakmanız sizi hiçbir şeye bağlamaz: önce ihtiyacı konuşur, sonra karar verirsiniz.',
    points: ['Pasif dinleme yok, çocuk sürekli aktif', 'Veli her aşamadan haberdar', 'Ön kayıt bağlayıcı değil'],
    cta: 'Önce konuşalım, sonra karar vereyim',
    more: { href: '#karsilastir', label: 'Kurs ve etütle karşılaştırın' },
  },
  {
    id: 'ilk-kez-supheli',
    label: 'Hiç denemedim, açıkçası pek güvenmiyorum',
    title: 'Bize inanmanızı beklemiyoruz. Önce kendiniz bakın.',
    body: 'Aslı Öğretmen’in derslerde kullandığı yaklaşımın aynısı bu sitede ücretsiz: 800’den fazla etkinlik, matematik oyunları ve sanal manipülatifler. Çocuğunuzla birkaç tanesini birlikte deneyin; hoşunuza giderse derslerin bunun öğretmen eşliğinde, çocuğunuza göre uyarlanmış hâli olduğunu bilin.',
    points: ['Üyeliksiz, ücretsiz deneyin', 'Yöntemi önceden görün', 'Kayıt bırakmak sadece bir görüşme talebidir'],
    cta: 'Yöntemi beğendim, bilgi almak istiyorum',
    more: { href: '#deneyin', label: 'Ücretsiz araçları deneyin' },
  },
  {
    id: 'kararsiz',
    label: 'Güveniyorum ama karar veremiyorum',
    title: 'Matematikteki eksikler beklerken kapanmaz, büyür.',
    body: 'Matematik üst üste kurulan bir derstir: bugün oturmayan kesirler yarın ondalıkları, oran-orantıyı ve denklemleri zorlaştırır. Ders saatleri ve grup kontenjanları bir öğretmenin gününe sığdığı kadardır. Ön kayıt bırakmak size yer ayırmak ve konuşmak için bir adımdır; vazgeçmek her zaman serbesttir.',
    points: ['1 dakikalık form', 'Ücretsiz ve yükümlülüksüz', 'Uygun saatler dolmadan yer ayırtın'],
    cta: 'Şimdi ön kayıt bırakıyorum',
    more: { href: '#sss', label: 'Kalan sorularınız için SSS' },
  },
] as const

/** Ders seçenekleri: birebir ve küçük grup */
export const lessonFormats = [
  {
    e: '👩‍🏫',
    t: 'Birebir ders',
    tag: '1 öğrenci',
    d: 'Ders tamamen çocuğunuza göre kurulur: onun eksikleri, onun hızı, onun soruları.',
    points: ['Ders boyunca bütün ilgi tek öğrencide', 'Eksik konulara doğrudan odaklanma', 'Saat ve tempo öğrenciye göre'],
    who: 'Belirgin eksikleri olan, kendine özel plan isteyen ya da LGS’ye yoğun hazırlanan öğrenciler için.',
  },
  {
    e: '👧👦',
    t: 'Küçük grup dersi',
    tag: '3–4 öğrenci',
    d: 'Benzer düzeydeki 3–4 öğrenciyle, herkesin söz aldığı küçük ve canlı bir ders ortamı.',
    points: ['Kalabalık değil: herkes konuşur, herkes çözer', 'Arkadaşlarıyla birlikte düşünme ve tartışma', 'Akranından öğrenme, motivasyon'],
    who: 'Konuları düzenli takip etmek, pekiştirmek ve arkadaşlarıyla birlikte öğrenmekten keyif alan öğrenciler için.',
  },
]

/** Başlama süreci */
export const lessonSteps = [
  { t: 'Formu doldurun', d: 'Öğrencinin sınıfı, zorlandığı konular ve uygun saatleriniz. Yaklaşık 1 dakika.' },
  { t: 'Aslı Öğretmen sizi arasın', d: 'İhtiyacı birlikte konuşur; birebir mi grup mu, ders sıklığı ve ücret hakkında net bilgi alırsınız.' },
  { t: 'Eksikleri birlikte bulalım', d: 'İlk derslerde öğrencinin nerede takıldığı tespit edilir ve ona özel bir yol çizilir.' },
  { t: 'Düzenli ders, görünür ilerleme', d: 'Belirlenen saatlerde dersler yapılır; veli gelişmeden düzenli olarak haberdar edilir.' },
]

/** Bir dersin akışı */
export const lessonFlow = [
  { e: '👋', t: 'Isınma', d: 'Kısa bir tekrar ya da merak uyandıran bir soruyla derse giriş.' },
  { e: '🧩', t: 'Keşfet', d: 'Konu modeller, şekiller ve sanal manipülatiflerle ekranda birlikte kurulur.' },
  { e: '🤝', t: 'Birlikte çöz', d: 'Öğretmen yönlendirir, öğrenci düşünür ve sesli açıklar.' },
  { e: '✍️', t: 'Kendin dene', d: 'Öğrenci benzer soruları kendi başına çözer, hatalar anında konuşulur.' },
  { e: '🎯', t: 'Kapanış', d: 'Bugün ne öğrendik, sırada ne var, evde hangi kısa çalışma yapılacak.' },
]

export const lessonHighlights = [
  { e: '👩‍🏫', t: 'Birebir ya da küçük grup', d: 'Dersler tek öğrenciyle ya da en fazla 3–4 kişilik gruplarla yapılır; anlatım, soru ve tekrar öğrencinin ihtiyacına göre şekillenir.' },
  { e: '💻', t: 'İnternet üzerinden', d: 'Öğrenci evinden bilgisayar, tablet ya da telefonla katılır. Yol, servis ve zaman kaybı olmaz.' },
  { e: '🧩', t: 'Anlayarak öğrenme', d: 'Ezber yerine model, oyun ve sanal manipülatiflerle önce “neden”i keşfeder, sonra işleme geçeriz.' },
  { e: '📍', t: 'Hatay’dan öğrencilere', d: 'Antakya ve Samandağ başta olmak üzere Hatay’daki ilkokul ve ortaokul öğrencileri için.' },
]

/** Karşılaştırma tablosu: birebir ya da küçük grup online ders, kalabalık kurs/etüt, tek başına çalışma */
export const lessonCompare = {
  cols: ['Birebir / 3–4 kişilik grup', 'Kalabalık kurs / etüt', 'Tek başına çalışma'],
  rows: [
    { t: 'Öğretmenin ilgisi', v: ['Tek öğrenciye ya da 3–4 kişiye', 'Sınıfa bölünür', 'Yok'] },
    { t: 'İlerleme hızı', v: ['Öğrencinin hızında', 'Sınıfın ortalamasında', 'Takılınca durur'] },
    { t: 'Soru sorma rahatlığı', v: ['Küçük ortamda çekinme yok', 'Çoğu çocuk çekinir', 'Soracak kimse yok'] },
    { t: 'Eksik konu tespiti', v: ['Kişiye özel', 'Genel', 'Fark edilmez'] },
    { t: 'Yol ve zaman', v: ['Evden, kayıpsız', 'Gidiş-dönüş gerekir', 'Evden'] },
    { t: 'Veliye geri bildirim', v: ['Düzenli', 'Sınırlı', 'Yok'] },
  ],
  /** Her satırda hangi sütunun “iyi” sayıldığı: 0 Aslı Öğretmen’in dersleri */
  good: [[0], [0], [0], [0], [0, 2], [0]],
}

export const lessonLevels = [
  { t: 'İlkokul (1–4. sınıf)', d: 'Sayı duyusu, toplama-çıkarma stratejileri, çarpım tablosunu anlamlandırma, kesirlere giriş, ölçme ve geometri. Temeli sağlam atmak, sonraki yılların yükünü hafifletir.' },
  { t: 'Ortaokul (5–8. sınıf) ve LGS', d: 'Kesirler ve ondalıklar, oran-orantı, tam sayılar, cebirsel ifadeler ve denklemler, geometri, veri ve olasılık. LGS’ye hazırlıkta konu eksiklerini kapatma ve yeni nesil soru pratiği.' },
]

export const lessonFaq = [
  {
    q: 'Online özel ders nasıl yapılıyor?',
    a: 'Dersler internet üzerinden, görüntülü olarak birebir ya da 3–4 kişilik küçük gruplar hâlinde yapılır. Öğrenci evinden bilgisayar, tablet ya da telefonla katılır; konu, ekranda modeller ve sanal manipülatiflerle birlikte çalışılır.',
  },
  {
    q: 'Online ders yüz yüze ders kadar verimli olur mu?',
    a: 'Birebir ya da küçük grupla yapıldığı ve öğrenci ders boyunca aktif tutulduğu sürece evet. Öğretmen, öğrencinin ekrandaki her adımını görür, hatayı anında yakalar. Yol ve hazırlık süresi olmadığı için dersin tamamı öğrenmeye ayrılır.',
  },
  {
    q: 'Çocuğum ekran başında dikkatini toplayabilir mi?',
    a: 'Dersler video izletmek gibi pasif değildir: öğrenci sürekli bir şey kurar, yazar, söyler ve açıklar. Kısa adımlar, oyunlaştırılmış etkinlikler ve sık soru-cevap dikkatin dağılmasını önler. Ders süresi ve temposu çocuğun yaşına göre ayarlanır.',
  },
  {
    q: 'Hangi sınıflara matematik dersi veriliyor?',
    a: '1. sınıftan 8. sınıfa kadar tüm ilkokul ve ortaokul öğrencilerine, Türkiye Yüzyılı Maarif Modeli matematik öğretim programına uygun ders verilir. Ortaokulda LGS hazırlığı da yapılır.',
  },
  {
    q: 'Birebir mi, grup dersi mi seçmeliyim?',
    a: 'Belirgin eksikleri olan ya da kendine özel bir plan gereken öğrenciler için birebir ders daha uygundur. Konuları düzenli takip edip pekiştirmek isteyen, arkadaşlarıyla birlikte daha istekli çalışan öğrenciler için 3–4 kişilik grup dersi iyi bir seçenektir. Karar veremediyseniz ön kayıttan sonraki görüşmede birlikte belirleriz.',
  },
  {
    q: 'Ders ücreti ne kadar?',
    a: 'Ücret; ders türüne (birebir ya da grup), sınıf düzeyine ve haftalık ders sayısına göre belirlenir. Ön kayıt formunu doldurduğunuzda Aslı Öğretmen sizinle iletişime geçer ve net bilgi verir. Ön kayıt ücretsizdir, sizi hiçbir şeye bağlamaz.',
  },
  {
    q: 'Ne gerekiyor? Özel bir program kurmak zorunda mıyız?',
    a: 'İnternet bağlantısı olan bir bilgisayar, tablet ya da telefon yeterlidir. Derse bağlanmak için gereken link size iletilir; karmaşık bir kurulum yoktur.',
  },
  {
    q: 'Veli olarak süreci nasıl takip ederim?',
    a: 'Öğrencinin hangi konularda ilerlediği ve nerelerde desteğe ihtiyaç duyduğu veliyle düzenli olarak paylaşılır. Aklınıza takılan her konuda öğretmenle iletişim kurabilirsiniz.',
  },
  {
    q: 'Antakya ve Samandağ’da yüz yüze ders yerine neden online ders?',
    a: 'Online derste yol ve zaman kaybı olmaz, ders evin rahat ortamında yapılır. Birebir ya da küçük grup olduğu için öğretmen, her öğrencinin nerede zorlandığını anında görür ve dersi ona göre yönlendirir.',
  },
  {
    q: 'Ön kayıt bıraktıktan sonra vazgeçebilir miyim?',
    a: 'Elbette. Ön kayıt yalnızca bir görüşme talebidir. Görüştükten sonra size uygun değilse devam etmek zorunda değilsiniz.',
  },
  {
    q: 'Ders dışında evde nasıl çalışılabilir?',
    a: 'Aslı Öğretmenimle sitesindeki matematik oyunları, etkileşimli etkinlikler ve sanal manipülatifler ücretsizdir; üyelik gerekmez. Her sınıf ve konu için etkinlikler ders dışında tekrar ve pekiştirme için kullanılabilir.',
  },
]
