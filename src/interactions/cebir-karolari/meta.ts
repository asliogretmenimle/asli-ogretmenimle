import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'cebir-karolari',
  no: 60,
  name: 'Cebir Karolarıyla Denklem',
  description: 'Değişkenleri ve sabitleri karolarla temsil ederek denklem çöz.',
  emoji: '🟪',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [6, 7, 8],
  ready: true,
  launch: 'Yeşil uzun karonun değeri bilinmiyor: ona x diyoruz. Sarı kareler 1, kırmızılar −1. Bir sarı ile bir kırmızı yan yana gelince ne olur? Karoları hareket ettirerek ifadeleri sadeleştirecek ve x’in değerini bulacağız.',
  reflect: 'x − 3 = 5 denklemini karolarla çözerken iki tarafa neden 3 tane +1 ekledin? Sıfır çiftini kullanarak bir arkadaşına açıkla.',
  bigIdea: 'Cebir karoları bir ifadenin alan modelidir: aynı türden karolar toplanır, farklı türler birleşmez (x + 1 ≠ 2x). Zıt iki karo bir sıfır çifti oluşturur; sıfır çifti eklemek ya da kaldırmak değeri değiştirmez. Denklemde her hamle iki tarafa birden yapıldığında eşitlik korunur; karoları eş gruplara ayırmak bölmenin modelidir. Bulunan değer yerine konunca iki taraf eşit çıkar.',
  skills: {
    6: 'Cebirsel ifadeleri karolarla kurma, benzer terimleri toplama, ifadeye değer verme, karolarla basit denklemler',
    7: 'Negatif karolar ve sıfır çiftleri; ifadeleri toplama, bir sayıyla çarpma (dağılma); negatif terimli denklemler',
    8: 'Aynı ifadenin farklı modelleri, iki tarafta bilinmeyen olan denklemler, çözümü yerine koyarak doğrulama',
  },
  outcomes: ['MAT.6.2.1', 'MAT.6.2.3', 'MAT.7.2.1', 'MAT.7.2.2'],
}
