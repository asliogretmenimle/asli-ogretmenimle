import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Kristal Mağarası — yapım aşamasında */
export default function KristalMagarasi({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
