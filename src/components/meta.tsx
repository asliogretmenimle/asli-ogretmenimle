import {
  Shapes, Calculator, Ruler, BarChart3, Dices, FlipHorizontal2, Sigma, Hash,
  Link2, ListOrdered, PencilLine, Puzzle, LayoutGrid, CircleHelp, Hand,
  Gamepad2, PlayCircle, FileText, Globe, Blocks, Image, Binary, Lightbulb,
} from 'lucide-react'
import type { ActivityType, ExternalLink, Stage, ThemeIcon } from '../data/types'

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

/** Van de Walle aşamaları: somuttan soyuta */
export const stageMeta: Record<Stage, { label: string; short: string; icon: typeof Shapes; color: string; bg: string; step: number; desc: string }> = {
  somut: { label: 'Yap ve Keşfet', short: 'Keşfet', icon: Blocks, color: '#a16207', bg: '#fef3c7', step: 1, desc: 'Sanal materyalle yaparak keşfet.' },
  model: { label: 'Resimle Düşün', short: 'Model', icon: Image, color: '#0f766e', bg: '#ccfbf1', step: 2, desc: 'Resim ve modellerle düşün.' },
  sembol: { label: 'Sembolle Çöz', short: 'Sembol', icon: Binary, color: '#1d4ed8', bg: '#dbeafe', step: 3, desc: 'Sayı ve sembollerle stratejini kullan.' },
  problem: { label: 'Problem ve Gerekçe', short: 'Problem', icon: Lightbulb, color: '#7e22ce', bg: '#f3e8ff', step: 4, desc: 'Gerçek hayat problemi çöz, nedenini açıkla.' },
}

export function StageBadge({ stage, compact }: { stage: Stage; compact?: boolean }) {
  const m = stageMeta[stage]
  if (!m) return null
  const Icon = m.icon
  return (
    <span className="chip shrink-0" style={{ color: m.color, background: m.bg }} title={m.desc}>
      <Icon size={13} strokeWidth={2.6} />
      {compact ? m.short : m.label}
    </span>
  )
}
