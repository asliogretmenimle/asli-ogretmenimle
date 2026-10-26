import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Su Mühendisi — yapım aşamasında */
export default function SuMuhendisi({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
