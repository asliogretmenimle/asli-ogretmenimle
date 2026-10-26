import {
  Shapes, Calculator, Ruler, BarChart3, Dices, FlipHorizontal2, Sigma, Hash,
  Link2, ListOrdered, PencilLine, Puzzle, LayoutGrid, CircleHelp, Hand,
  Gamepad2, PlayCircle, FileText, Globe,
} from 'lucide-react'
import type { ActivityType, ExternalLink, ThemeIcon } from '../data/types'

export const themeIcon: Record<ThemeIcon, typeof Shapes> = {
  numbers: Hash,
  operations: Calculator,
  geometry: Shapes,
  measure: Ruler,
  data: BarChart3,
  probability: Dices,
  transform: FlipHorizontal2,
  algebra: Sigma,
}

export const typeMeta: Record<ActivityType, { label: string; icon: typeof Shapes; color: string; bg: string }> = {
  match: { label: 'Eşleştirme', icon: Link2, color: '#7c3aed', bg: '#f3e8ff' },
  fill: { label: 'Boşluk Doldurma', icon: PencilLine, color: '#0369a1', bg: '#e0f2fe' },
  sort: { label: 'Sürükle-Sırala', icon: ListOrdered, color: '#c2410c', bg: '#ffedd5' },
  categorize: { label: 'Sürükle-Grupla', icon: LayoutGrid, color: '#be185d', bg: '#fce7f3' },
  quiz: { label: 'Test', icon: CircleHelp, color: '#047857', bg: '#d1fae5' },
  manipulative: { label: 'Manipülatif', icon: Hand, color: '#b45309', bg: '#fef3c7' },
}

export const linkMeta: Record<NonNullable<ExternalLink['kind']>, { label: string; icon: typeof Shapes }> = {
  oyun: { label: 'Oyun', icon: Gamepad2 },
  video: { label: 'Video', icon: PlayCircle },
  geogebra: { label: 'GeoGebra', icon: Globe },
  'calisma-kagidi': { label: 'Çalışma kâğıdı', icon: FileText },
  diger: { label: 'Bağlantı', icon: Puzzle },
}

export function TypeBadge({ type, compact }: { type: ActivityType; compact?: boolean }) {
  const m = typeMeta[type]
  const Icon = m.icon
  return (
    <span className="chip shrink-0" style={{ color: m.color, background: m.bg }}>
      <Icon size={13} strokeWidth={2.6} />
      {!compact && m.label}
    </span>
  )
}
