import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Sayı Treni — yapım aşamasında */
export default function SayiTreni({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
