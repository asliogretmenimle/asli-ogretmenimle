import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'sepetlere-grupla',
  no: 94,
  name: 'Sepetlere Grupla',
  description: 'Masadaki elmaları, yumurtaları ya da topları 4’erli, 3’erli, 5’erli sepetlere sürükle; sepeti dolduramayan nesnelerin neden dışarıda kaldığını keşfet ve bölmeyi önce cümleyle, sonra ÷ işaretiyle yaz.',
  emoji: '🧺',
  color: '#2563eb',
  category: 'sayilar',
  grades: [3],
  ready: true,
  launch: 'Masaya bir sürü elma geldi. Her sepete tam 4 elma sığıyor ve sepet dolunca kapanıyor. Hepsini sepetlere koyabilir miyiz? Koyamazsak dışarıda kaç elma kalır ve neden?',
  reflect: 'Bir arkadaşın “4’erli sepetlere koydum, 6 elma kaldı” diyor. Ona ne söylersin? 4’erli sepetlerde kalan en çok kaç olabilir, neden?',
  bigIdea: 'Bölme, bir çokluğu eşit gruplara ayırmaktır (ölçme anlamında bölme: “kaç tane 4’lü grup çıkar?”). Gruplar oluşturulduktan sonra bir grubu tamamlayamayan nesneler kalandır. Kalan her zaman grup büyüklüğünden (bölenden) küçüktür; aksi hâlde bir grup daha oluşurdu. Kalan 0 ise sayı tam bölünür. Çocuk aynı sayıyı farklı büyüklükte gruplara ayırarak bölüm ile kalanın birlikte değiştiğini görür, kalanı ritmik sayarak tahmin eder. Gösterim somuttan soyuta ilerler: sepetler → “15 elmayı 4’erli sepetlere koydum, 3 sepet doldu, 3 elma kaldı” → 15 ÷ 4 = 3, kalan 3 → 3 × 4 + 3 = 15.',
  skills: {
    3: 'Nesneleri eşit gruplara ayırarak bölme yapma; kalanı bir grubu tamamlayamayan nesneler olarak açıklama, kalanın bölenden küçük olduğunu gerekçelendirme, kalanı tahmin etme, tam bölünmeyi tanıma ve bölmeyi önce cümleyle sonra ÷ işaretiyle yazıp çarpmayla kontrol etme',
  },
  outcomes: ['MAT.3.2.4', 'MAT.3.2.3', 'MAT.3.2.8'],
}
