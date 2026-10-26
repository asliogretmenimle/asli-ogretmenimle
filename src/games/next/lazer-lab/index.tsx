import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Lazer Laboratuvarı — yapım aşamasında */
export default function LazerLab({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
