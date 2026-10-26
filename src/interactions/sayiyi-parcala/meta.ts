import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'sayiyi-parcala',
  no: 23,
  name: 'Sayıyı Parçala',
  description: 'Bir sayıyı farklı toplamlar ve modellerle oluştur.',
  emoji: '✂️',
  color: '#2563eb',
  category: 'sayilar',
  grades: [1, 2, 3, 4],
  ready: true,
  launch: 'Bir sayının tek bir adı yoktur! 7, “3 ve 4” de olabilir, “5 ve 2” de. Sayaçları çevirerek, şeridi keserek ve blokları kırarak bir sayıyı kaç farklı yolla oluşturabileceğini keşfet.',
  reflect: 'Bulduğun yollardan hangisi işlem yaparken en çok işine yarar? Neden? Bir parça büyüyünce diğerine ne oluyor?',
  bigIdea: 'Bir sayı pek çok parçaya ayrılabilir ve aynı sayının birçok adı vardır (47 = 40 + 7 = 30 + 17). Parça-parça-bütün ilişkisi ve yeniden gruplama (bir onluğu 10 birliğe kırmak), zihinden işlemin ve basamak değerinin temelidir.',
  skills: {
    1: '10’a kadar sayıları iki parçaya ayırma, 10’un dostları, sayı bağı',
    2: 'Onluk-birlik ile aynı sayıyı farklı biçimlerde gösterme, üç parçaya ayırma',
    3: 'Yüzlükleri ve onlukları kırarak yeniden gruplama, 100’ü ve 1000’i parçalama',
    4: 'Binlikleri kırma, büyük sayıları kolay parçalara ayırma',
  },
  outcomes: ['MAT.1.1.2', 'MAT.1.2.4', 'MAT.2.1.2', 'MAT.2.2.2', 'MAT.3.1.2', 'MAT.3.2.1', 'MAT.4.1.2', 'MAT.4.2.1'],
}
