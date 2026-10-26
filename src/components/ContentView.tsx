import type { Content } from '../data/types'
import { MathText } from './MathText'
import { VisualView } from './Visual'

export function ContentView({ c, size = 'md', className = '' }: { c: Content; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  if (typeof c === 'string') return <MathText text={c} className={className} />
  return (
    <span className={`flex flex-col items-center gap-2 ${className}`}>
      {c.visual && <VisualView v={c.visual} size={size} />}
      {c.text && <MathText text={c.text} />}
    </span>
  )
}

export const contentKey = (c: Content) => (typeof c === 'string' ? c : JSON.stringify(c))

export const hasVisual = (c: Content) => typeof c !== 'string' && !!c.visual
