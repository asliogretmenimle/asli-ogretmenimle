import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'soruyu-sen-yaz',
  no: 72,
  name: 'Soruyu Sen Yaz',
  description: 'Verilen şekil, tablo ya da modele uygun problem oluştur.',
  emoji: '📝',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [2, 3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Bu sefer soruyu öğretmen değil, sen yazıyorsun! Elinde bir resim, şerit, tablo ya da denklem var. Kim? Ne oldu? Ne soruyoruz? Kartlarla bu modele uyan bir problem kur, sonra kendi problemini çöz. Aynı modele kaç farklı problem yazabilirsin?',
  reflect: 'Yazdığın iki problem aynı modele uyuyordu ama hikâyeleri farklıydı. Bir arkadaşına, bir problemin bir modele “uyduğunu” nasıl anlayacağını anlat.',
  bigIdea: 'Problem kurmak, problem çözmenin tersidir: öğrenci sayıların modeldeki yerini, işlemin anlamını (birleştirme, ayırma, karşılaştırma, eş gruplar, kat, oran, doğrusal değişim) ve sorunun bilinmeyeni sorup sormadığını düşünmek zorundadır. Aynı model (8 + ? = 15, 3x + 50 = 200, y = 2x + 3) birçok farklı bağlamı ve yapıyı temsil eder.',
  skills: {
    2: 'Resim ve şerit modellerine toplama-çıkarma (ekleme, ayırma, karşılaştırma, parça-bütün) ve eş grup problemleri yazma',
    3: 'Şerit ve dizi modellerine çarpma-bölme, iki adımlı ve çevre problemleri kurma',
    4: 'Sütun grafiği ve fiyat tablosundan çok adımlı problem; “kaç katı” karşılaştırması',
    5: 'Bir çokluğun kesri, parçadan bütüne, alan ve çevre modellerine problem yazma',
    6: 'Yüzde, ondalık gösterim, oran tablosu, x + a = b denklemi ve EBOB durumları',
    7: 'Tam sayılar, doğru orantı, 3x + 50 = 200 denklemi ve kesirlerle bölme bağlamları',
    8: 'Doğrusal ilişki tablosu ve grafiği, Pisagor bağıntısı, üslü ve kareköklü ifadeler',
  },
  outcomes: ['MAT.2.2.1', 'MAT.2.2.4', 'MAT.3.2.6', 'MAT.3.2.7', 'MAT.3.3.4', 'MAT.4.2.7', 'MAT.4.2.8', 'MAT.4.4.2', 'MAT.4.1.10', 'MAT.5.1.2', 'MAT.5.1.3', 'MAT.5.4.1', 'MAT.5.4.4', 'MAT.6.1.4', 'MAT.6.1.7', 'MAT.6.2.1', 'MAT.7.1.4', 'MAT.7.1.7', 'MAT.7.2.2', 'MAT.8.1.1', 'MAT.8.1.2', 'MAT.8.2.2', 'MAT.8.3.6'],
}
