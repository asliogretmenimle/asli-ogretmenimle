import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'yuzluk-gizem',
  no: 24,
  name: 'Yüzlük Tablo Gizemi',
  description: 'Gizlenen sayıları satır-sütun ilişkilerinden bul.',
  emoji: '🔍',
  color: '#2563eb',
  category: 'sayilar',
  grades: [1, 2, 3],
  ready: true,
  launch: 'Uğur böcekleri sayı tablosunun üstüne kondu ve bazı sayıları sakladı! Baştan saymadan, komşulara bakarak saklı sayıları bulabilir misin?',
  reflect: 'Yüzlük tabloda bir kare aşağı inince sayı neden 10 artıyor? Bir arkadaşına tablodan bir örnekle anlat.',
  bigIdea: 'Yüzlük tablo, onluk sistemin bir haritasıdır: sağa bir adım 1, aşağı bir adım 10 ekler. Bu yapı sayma yerine ilişkiyle düşünmeyi ve zihinden toplamayı (↓ ↓ → = +21) destekler.',
  skills: {
    1: '1–40 tablosunda komşu sayılar (bir önce, bir sonra) ve aynı sütunda 10 fazla',
    2: '100’e kadar tabloda ±1 ve ±10 ilişkileri, yapboz parçaları, ok kodlarıyla toplama',
    3: '100’den büyük tablolarda yüzlük sınırı, çapraz komşular (+11, +9), farklı ok yolları',
  },
  outcomes: ['MAT.1.1.5', 'MAT.1.1.6', 'MAT.2.1.3', 'MAT.2.1.4', 'MAT.2.1.5', 'MAT.3.1.3', 'MAT.3.1.4', 'MAT.3.2.1'],
}
