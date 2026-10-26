import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Trafik Simülatörü — yapım aşamasında */
export default function TrafikSimulatoru({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
