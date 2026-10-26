import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Lunapark Tasarımcısı — yapım aşamasında */
export default function Lunapark({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
