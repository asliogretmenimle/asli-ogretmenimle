import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'carpmaya-giris',
  no: 90,
  name: 'Çarpmaya Giriş: Eşit Gruplar',
  description: 'Tabaklara meyve koyarak eşit gruplar kur, her tabakla büyüyen 4 + 4 + 4 toplamını “3 tane 4” ve 3 × 4 ile yaz, sıra kartlarıyla dizi kurup döndürerek 3 × 4 = 4 × 3 olduğunu keşfet.',
  emoji: '🍓',
  color: '#2563eb',
  category: 'sayilar',
  grades: [2, 3],
  ready: true,
  launch: 'Annen 3 tabağa çilek koyacak, her tabağa 4 tane. Hepsi kaç çilek eder? Tek tek saymadan bulmanın bir yolu var mı? Bir de bir tabağa 5 çilek konsaydı ne olurdu?',
  reflect: '3 × 4 ile 4 × 3 aynı şeyi mi anlatır? Tabaklarla düşündüğünde farkları ne, diziyle düşündüğünde neden aynı sayıda nesne var? Bir arkadaşına göstermek için hangi modeli seçerdin?',
  bigIdea: 'Çarpma, eşit grupları saymanın kısa yoludur ve “eşit grup” fikri çarpmanın kalbidir: gruplar eşit değilse çarpma yazılamaz. Çocuklar önce eşit grupları fiziksel olarak kurar, sonra her yeni grupla büyüyen tekrarlı toplamayı (4 + 4 + 4) görür ve bunu “3 tane 4” diye söyler; × işareti ancak bu noktada, “tane” anlamıyla tanıtılır. Dizi (satır ve sütun) modeli eşit grupları düzenli bir biçimde gösterir ve döndürülünce 3 × 4 ile 4 × 3’ün aynı sayıda nesne olduğunu kanıtlar (değişme özelliği). Van de Walle’ın vurguladığı gibi asıl hedef modeller arası geçiştir: aynı çarpmayı hikâye, eşit gruplar, tekrarlı toplama, dizi ve sembolle eşleştirebilen çocuk, çarpım tablosunu ezberlemeden önce çarpmanın anlamını kurmuş olur.',
  skills: {
    2: 'Eşit grupları kurma ve tanıma; tekrarlı toplamayı “… tane …” ve × ile yazma; 2, 3, 4, 5 ve 10 ile çarpmayı modelleme',
    3: 'Çarpmayı eşit gruplar, tekrarlı toplama ve dizi modelleriyle ilişkilendirme; dizileri döndürerek değişme özelliğini gerekçelendirme; verilen çarpmayı uygun modelle kurma',
  },
  outcomes: ['MAT.2.2.4', 'MAT.2.2.5', 'MAT.3.2.3', 'MAT.3.2.4'],
}
