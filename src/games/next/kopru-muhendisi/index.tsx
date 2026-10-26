import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Köprü Mühendisi — yapım aşamasında */
export default function KopruMuhendisi({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
