/** Panelden eklenen oyun / etkileşimler için bileşenler: sayfaların giriş ve bitiş akışı aynen kullanılır */
import type { ComponentType } from 'react'
import type { GameProps } from '../games/kit'
import type { InteractionProps } from '../interactions/types'
import { HtmlFrame } from './HtmlFrame'

const gameFrames = new Map<string, ComponentType<GameProps>>()
const interactionFrames = new Map<string, ComponentType<InteractionProps>>()

export function gameFrame(cmsId: string) {
  let C = gameFrames.get(cmsId)
  if (!C) {
    C = ({ grade, onFinish }: GameProps) => <HtmlFrame kind="game" cmsId={cmsId} grade={grade} onFinish={onFinish} />
    gameFrames.set(cmsId, C)
  }
  return C
}

export function interactionFrame(cmsId: string) {
  let C = interactionFrames.get(cmsId)
  if (!C) {
    C = ({ grade, onFinish }: InteractionProps) => <HtmlFrame kind="interaction" cmsId={cmsId} grade={grade} onFinish={onFinish} />
    interactionFrames.set(cmsId, C)
  }
  return C
}
