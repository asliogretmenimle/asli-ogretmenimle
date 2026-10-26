import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'eksik-parca',
  no: 25,
  name: 'Eksik Parça',
  description: 'Bütünü ve bir parçayı görerek eksik parçayı modelle.',
  emoji: '🧩',
  color: '#2563eb',
  category: 'sayilar',
  grades: [1, 2, 3, 4],
  ready: true,
  launch: 'Toplam 8 misket var ama yalnızca 5’ini görüyorsun; gerisi bardağın altına saklandı. Bardağı kaldırmadan kaç misket saklandığını nasıl bulursun?',
  reflect: '5 + ? = 8 ile 8 − 5 = ? aynı soruyu mu soruyor? Modelini kullanarak bir arkadaşına anlat.',
  bigIdea: 'Bütün ve parçalarından biri biliniyorsa eksik parça bulunabilir. Eksik parçayı bütüne kadar ileri sayarak (toplama) ya da bütünden çıkararak bulmak aynı ilişkiyi anlatır; şerit modeli bu parça-bütün ilişkisini görünür kılar.',
  skills: {
    1: '20’ye kadar bardak altındaki eksik parçayı onluk çerçevede ileri sayarak modelleme',
    2: 'Şerit modeli ve boş sayı doğrusunda onluklarla ileri sayarak eksik parçayı bulma',
    3: '1000’e kadar eksik parça, karşılaştırma (fark) ve “? + 48 = 130” problemleri',
    4: 'Dört basamaklı sayılarda eksik parça, eşit parçalı şeritte eksik çarpan, iki adımlı problemler',
  },
  outcomes: ['MAT.1.2.1', 'MAT.1.2.4', 'MAT.2.2.1', 'MAT.2.2.3', 'MAT.3.2.2', 'MAT.3.2.6', 'MAT.4.2.7', 'MAT.4.2.9'],
}
