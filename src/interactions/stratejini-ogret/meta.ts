import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'stratejini-ogret',
  no: 77,
  name: 'Kendi Stratejini Öğret',
  description: 'Bir çözüm yolunu görsel adımlarla başka öğrenciye anlat.',
  emoji: '👩‍🏫',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [2, 3, 4, 5, 6, 7, 8],
  ready: true,
  skills: { 2: 'Toplama ve çıkarma için adımları açıklama', 3: 'Onluğa tamamlama ve telafi stratejileri', 4: 'Çarpma ve bölme stratejilerini sıralama', 5: 'İşlem özellikleriyle çözüm açıklama', 6: 'Kesir işlemlerinde eşdeğer gösterimleri kullanma', 7: 'Strateji seçimini gerekçelendirme', 8: 'Matematiksel çözümü açık ve sıralı anlatma' },
  launch: 'Bir arkadaşın çözümünü anlamakta zorlandı. İşlemi adım adım anlatarak stratejini öğretebilir misin?',
  reflect: 'Hangi adım çözümü daha anlaşılır yaptı? Bir stratejiyi anlatırken nedenini açıklamak neden önemlidir?',
  bigIdea: 'Matematiksel iletişim, stratejileri adım adım ve gerekçeleriyle açıklayarak başkalarının düşünmesini destekler.',
}
