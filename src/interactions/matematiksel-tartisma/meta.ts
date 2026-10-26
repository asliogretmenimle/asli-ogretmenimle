import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'matematiksel-tartisma',
  no: 75,
  name: 'Matematiksel Tartışma',
  description: 'İki farklı çözümün neden doğru ya da yanlış olduğunu karşılaştır.',
  emoji: '🗣️',
  color: '#ea580c',
  category: 'muhakeme',
  grades: [3, 4, 5, 6, 7, 8],
  ready: true,
  skills: { 3: 'İşlem özelliklerini örnek ve temsille açıklama', 4: 'Toplama ve çarpma ilişkileri için gerekçe kurma', 5: 'Genellemeleri örneklerle tartışma', 6: 'Alan ve çevre ilişkilerini karşılaştırma', 7: 'Karşı örnekle genellemeyi değerlendirme', 8: 'Matematiksel iddia için kanıt ve gerekçe sunma' },
  launch: 'İki öğrenci aynı iddia hakkında farklı gerekçeler sundu. Hangisi yalnızca sonucu söylüyor, hangisi nedenini açıklıyor?',
  reflect: 'Bir matematiksel açıklamayı ikna edici yapan nedir? Tek bir örnek neyi kanıtlayabilir?',
  bigIdea: 'Matematiksel tartışmada iddiayı örnek, model, ilişki veya karşı örnekle gerekçelendirmek gerekir.',
}
