import type { Grade } from '../data/types'

export type InteractionCategory = 'sayilar' | 'kesirler' | 'geometri' | 'cebir-veri' | 'muhakeme'

export const categoryInfo: Record<InteractionCategory, { label: string; color: string }> = {
  sayilar: { label: 'Sayılar ve işlemler', color: '#2563eb' },
  kesirler: { label: 'Kesirler, ondalıklar ve oranlar', color: '#0d9488' },
  geometri: { label: 'Geometri ve ölçme', color: '#db2777' },
  'cebir-veri': { label: 'Cebir, veri ve olasılık', color: '#7c3aed' },
  muhakeme: { label: 'Muhakeme ve problem çözme', color: '#ea580c' },
}

export interface InteractionMeta {
  id: string
  /** Plan numarası (21–77) */
  no: number
  name: string
  /** Öğrenci ne yapacak? */
  description: string
  emoji: string
  color: string
  category: InteractionCategory
  grades: Grade[]
  /** Hazır mı (false ise listede "yakında" görünür) */
  ready: boolean
  /** Başlarken: kısa problem/durum */
  launch?: string
  /** Düşün ve Paylaş sorusu */
  reflect?: string
  /** Öğretmen için büyük fikir */
  bigIdea?: string
  /** Her sınıfta ne çalışılır */
  skills?: Partial<Record<Grade, string>>
  /** İlgili öğrenme çıktıları */
  outcomes?: string[]
  /** Tema sayfasında bu öğrenme çıktılarının başlığı altında kart olarak gösterilir (ör. 6. sınıf “Kesir ve bölme”) */
  showUnder?: string[]
}

export interface InteractionProps {
  grade: Grade
  /** Etkileşim bittiğinde (ya da öğrenci "Bitirdim" dediğinde) çağrılır */
  onFinish: (r: { summary: string; insight?: string; stars?: 1 | 2 | 3 }) => void
}
