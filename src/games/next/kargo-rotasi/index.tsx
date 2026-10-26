import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Kargo Rotası — yapım aşamasında */
export default function KargoRotasi({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
