import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Çarpan Fabrikası — yapım aşamasında */
export default function CarpanFabrikasi({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
