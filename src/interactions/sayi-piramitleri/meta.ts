import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'sayi-piramitleri',
  no: 29,
  name: 'Sayı Piramitleri',
  description: 'Komşu kutular arasındaki ilişkiyle piramidin eksiklerini tamamla.',
  emoji: '🔺',
  color: '#2563eb',
  category: 'sayilar',
  grades: [2, 3, 4, 5, 6],
  ready: true,
  launch: 'Bir duvarcı, her taşa altındaki iki taşın toplamını yazıyor. Bazı taşlar kaybolmuş! Tepeden aşağı inebilir misin? Ya tepeyi seçip tabanı sen kurarsan?',
  reflect: 'Alt sıradaki ortadaki taşı 1 artırınca tepe neden 2 artıyor? Bir arkadaşına piramitle göster.',
  bigIdea: 'Toplama-çıkarma ve çarpma-bölme birbirinin tersidir; yukarı çıkarken birleştirir, aşağı inerken ters işlemle parçayı buluruz. Taban taşları tepeye farklı sayıda yoldan katılır (1-2-1, 1-3-3-1): bu yapı bilinmeyeni akıl yürüterek bulmayı sağlar.',
  skills: {
    2: 'Üç katlı piramitlerde 100’e kadar toplama; eksik alt taşı çıkarmayla bulma; hedef tepeye farklı tabanlar',
    3: 'Dört katlı piramitler, yüzlüklerle zihinden işlem, eksik orta taş, “en güçlü taş” keşfi',
    4: 'Tepeden aşağı ters işlem; çarpım piramidi ve bölme; hedef tepe 100',
    5: 'Taban taşlarının tepeye katılma sayısı (1-2-1, 1-3-3-1); çarpım piramidinde açık uçlu hedef',
    6: 'Gizli orta taşı muhakemeyle bulma (a + 2x + c); ondalık ve çarpım piramitleri',
  },
  outcomes: ['MAT.2.2.2', 'MAT.2.2.3', 'MAT.3.2.1', 'MAT.3.2.8', 'MAT.4.2.1', 'MAT.4.2.9', 'MAT.5.2.1', 'MAT.6.2.1'],
}
