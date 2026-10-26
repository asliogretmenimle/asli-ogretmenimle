/**
 * Online özel ders sayfasının metinleri.
 * Hem sayfa (pages/OnlineLesson.tsx) hem de arama motorları için üretilen statik HTML (scripts/prerender.ts) bu dosyayı kullanır.
 */

export const lessonAreas = ['Antakya', 'Samandağ', 'Hatay'] as const

export const lessonIntro =
  'Aslı Öğretmen, Hatay’da Antakya ve Samandağ’daki öğrencilere internet üzerinden birebir online matematik dersi veriyor. Dersler 1. sınıftan 8. sınıfa kadar, Türkiye Yüzyılı Maarif Modeli matematik öğretim programına uygun ve öğrencinin kendi hızına göre ilerler.'

export const lessonHighlights = [
  { e: '👩‍🏫', t: 'Birebir ders', d: 'Her ders yalnızca bir öğrenciyle yapılır; anlatım, soru ve tekrar tamamen çocuğunuzun ihtiyacına göre şekillenir.' },
  { e: '💻', t: 'İnternet üzerinden', d: 'Öğrenci evinden bilgisayar, tablet ya da telefonla katılır. Yol, servis ve zaman kaybı olmaz.' },
  { e: '🧩', t: 'Anlayarak öğrenme', d: 'Ezber yerine model, oyun ve sanal manipülatiflerle önce “neden”i keşfeder, sonra işleme geçeriz.' },
  { e: '📍', t: 'Hatay’dan öğrencilere', d: 'Antakya ve Samandağ başta olmak üzere Hatay’daki ilkokul ve ortaokul öğrencileri için.' },
]

export const lessonLevels = [
  { t: 'İlkokul (1–4. sınıf)', d: 'Sayı duyusu, toplama-çıkarma stratejileri, çarpım tablosunu anlamlandırma, kesirlere giriş, ölçme ve geometri.' },
  { t: 'Ortaokul (5–8. sınıf)', d: 'Kesirler ve ondalıklar, oran-orantı, tam sayılar, cebirsel ifadeler ve denklemler, geometri, veri ve olasılık.' },
]

export const lessonFaq = [
  {
    q: 'Online özel ders nasıl yapılıyor?',
    a: 'Dersler internet üzerinden, görüntülü ve birebir yapılır. Öğrenci evinden bilgisayar, tablet ya da telefonla katılır; konu, ekranda modeller ve sanal manipülatiflerle birlikte çalışılır.',
  },
  {
    q: 'Hangi sınıflara matematik dersi veriliyor?',
    a: '1. sınıftan 8. sınıfa kadar tüm ilkokul ve ortaokul öğrencilerine, Türkiye Yüzyılı Maarif Modeli matematik öğretim programına uygun ders verilir.',
  },
  {
    q: 'Antakya ve Samandağ’da yüz yüze ders yerine neden online ders?',
    a: 'Online derste yol ve zaman kaybı olmaz, ders evin rahat ortamında yapılır. Birebir olduğu için öğretmen, öğrencinin nerede zorlandığını anında görür ve dersi ona göre yönlendirir.',
  },
  {
    q: 'Ders dışında evde nasıl çalışılabilir?',
    a: 'Aslı Öğretmenimle sitesindeki matematik oyunları, etkileşimli etkinlikler ve sanal manipülatifler ücretsizdir; üyelik gerekmez. Her sınıf ve konu için etkinlikler ders dışında tekrar ve pekiştirme için kullanılabilir.',
  },
]
