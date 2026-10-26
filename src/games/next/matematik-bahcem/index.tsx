import type { GameProps } from '../../kit'
import { Scene, TaskCard } from '../../kit2'

/** Matematik Bahçem — yapım aşamasında */
export default function MatematikBahcem({ grade }: GameProps) {
  return (
    <Scene grade={grade}>
      <TaskCard>Bu oyun hazırlanıyor.</TaskCard>
    </Scene>
  )
}
