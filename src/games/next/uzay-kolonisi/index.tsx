import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Uzay Kolonisi — yapım aşamasında */
export default function UzayKolonisi({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
