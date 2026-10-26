import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'acik-uclu-lab',
  no: 76,
  name: 'Açık Uçlu Problem Laboratuvarı',
  description: 'Birden fazla doğru sonucu olabilen problemleri araştır.',
  emoji: '🔭',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Bir öğretmen “Alanı 24 olan bir dikdörtgen çiz.” dedi. Sınıftaki herkes farklı bir dikdörtgen çizdi ve hepsi doğruydu! Bu laboratuvarda tek bir cevapla yetinmeyeceğiz: ne kadar çok cevap bulursak gizli örüntüyü o kadar iyi göreceğiz.',
  reflect: 'Galerindeki cevapları düzenleyince hangi örüntüyü fark ettin? Yeni bir cevabı bulmak için eski bir cevabı nasıl değiştirdin?',
  bigIdea: 'Açık uçlu problemlerin pek çok doğru cevabı vardır. Cevapları sistemli üretmek (birini artırıp ötekini dengelemek) ve düzenleyip karşılaştırmak, tek bir cevabın gösteremeyeceği ilişkileri (ör. alan sabitken çevrenin değişmesi) ortaya çıkarır.',
  skills: {
    3: 'Toplamı 20 olan sayılar, alanı 6 ve çevresi 12 olan şekiller, 12 boncuğun eşit sıraları',
    4: 'Alanı 24 olan dikdörtgenler, toplamı 1 olan sekizde birler, çarpımı 36 olan çiftler',
    5: 'Çevresi 24 olan dikdörtgenler, [[1/2]]’ye denk kesirler, işlem önceliği, alanı 16 olan şekiller',
    6: 'Ortalaması 7 olan sayılar, toplamı 1 olan üç kesir, EKOK’u 12 ve EBOB’u 4 olan çiftler',
    7: 'Toplamı −3 olan tam sayılar, olasılığı [[1/4]] olan torbalar, hacmi 24 olan prizmalar, ortalama ve ortanca',
    8: 'Eğimi 2 olan ve (0, 1)’den geçen doğrular, karekök aralıkları, Pisagor üçlüleri',
  },
  outcomes: [
    'MAT.3.2.2', 'MAT.3.3.4', 'MAT.3.2.4',
    'MAT.4.3.4', 'MAT.4.1.11', 'MAT.4.2.5',
    'MAT.5.4.3', 'MAT.5.1.3', 'MAT.5.2.2',
    'MAT.6.5.1', 'MAT.6.1.7', 'MAT.6.1.4',
    'MAT.7.1.4', 'MAT.7.7.1', 'MAT.7.4.4', 'MAT.7.6.1',
    'MAT.8.2.2', 'MAT.8.1.2', 'MAT.8.3.5',
  ],
}
