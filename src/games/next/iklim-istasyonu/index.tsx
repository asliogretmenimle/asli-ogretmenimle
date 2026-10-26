import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** İklim İstasyonu — yapım aşamasında */
export default function IklimIstasyonu({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
