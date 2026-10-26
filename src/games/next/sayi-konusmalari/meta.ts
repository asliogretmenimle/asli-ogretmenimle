import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'sayi-konusmalari',
  name: 'Sayı Konuşmaları',
  description: 'Aynı işlemi farklı zihinsel stratejilerle çöz, yolları karşılaştır.',
  emoji: '💬',
  color: '#e11d48',
  grades: [1, 2, 3, 4, 5, 6, 7, 8],
  nextGen: true,
  skills: {
    1: '20’ye kadar zihinden toplama-çıkarma: 10’a tamamlama, ikizler, toplamayı düşünerek çıkarma',
    2: '100’e kadar zihinden işlem: onluklara ayırma, yuvarlak sayıya zıplama, telafi',
    3: '1000’e kadar zihinden toplama-çıkarma; çarpmayı parçalayarak (dağılma) türetme',
    4: 'Dört basamaklıya kadar zihinden işlem; kısa yoldan çarpma: birleşme, yarılama-ikileme, telafi',
    5: 'Çarpma özellikleri: birleşme (4 × 25), dağılma, telafi (99 × 12); çok basamaklı çıkarma',
    6: 'Ondalık gösterimlerle zihinden işlem: bir tama tamamlama, telafi, ondalık sayı doğrusu',
    7: 'Tam sayılar ve rasyonel sayılarla işlem: sıfıra tamamlama (ters sayılar), sayı doğrusunda zıplama',
    8: 'Üslü ifadelerle işlem: aynı tabanda üsleri toplama, (a·b)ⁿ, çarpanları yeniden gruplama',
  },
  howTo: [
    'Problemi oku ve hesaplamadan tahmin et: sonuç referans sayıdan büyük mü, küçük mü?',
    'Bir yol seç (parçala-birleştir, sayı doğrusu, yuvarla-düzelt, alan modeli) ve adım adım kur; sonucu zihinden bul.',
    'Arkadaşlarının yollarına bak: hangisi seninkine benziyor, hangisi en verimli?',
    'İstersen aynı problemi başka bir yolla da çöz; her yeni strateji panoya eklenir.',
  ],
  launch: 'Sınıfça halkaya oturduk. Öğretmen tahtaya 49 + 26 yazdı ve “Kâğıt kalem yok! Kafanızdan nasıl çözersiniz?” dedi. Elif 49’u 50 yaptı, Can sayıları onluk ve birliklere ayırdı. Sen nasıl düşünürsün?',
  reflect: 'Bugün gördüğün stratejilerden hangisi senin için yeniydi? Hangi sayılar o stratejiyi kullanmayı kolaylaştırır? Bir örnekle anlat.',
  bigIdea: 'Zihinden işlem, sayıların yapısını (basamak değeri, 10 ve 100 gibi referanslar, işlem özellikleri) esnek kullanmaktır. Aynı işlemin birçok doğru yolu vardır; verimli strateji sayılara bakarak seçilir. Stratejileri karşılaştırmak ve açıklamak anlamayı derinleştirir.',
  strategies: ['10’a tamamlama', 'Yuvarlak sayıya tamamlama', 'Sıfıra tamamlama (ters sayılar)', 'Basamak değerine göre ayırma', 'Telafi: yuvarla ve düzelt', 'Sabit fark', 'Toplamayı düşünerek çıkarma', 'İkizler (ikizlere yakın)', 'Sayı doğrusunda zıplama', 'Birleşme: önce 10/100 yap', 'Yarılama-ikileme', 'Dağılma: parçalara ayırarak çarp', 'Çarpanlara ayırıp yeniden grupla', 'Aynı tabanda üsleri topla', 'Üsler aynı: tabanları çarp', 'Değerleri hesapla', 'Doğrudan hesap', 'Parçalayarak işlem'],
  outcomes: ['MAT.1.2.2', 'MAT.2.2.2', 'MAT.3.2.1', 'MAT.3.2.3', 'MAT.4.2.1', 'MAT.4.2.4', 'MAT.5.2.1', 'MAT.6.1.7', 'MAT.7.1.4', 'MAT.8.1.1'],
}
