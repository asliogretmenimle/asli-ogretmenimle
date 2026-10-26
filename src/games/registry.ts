import { lazy, type ComponentType } from 'react'
import type { GameId } from './meta'
import type { GameProps } from './kit'

export const games: Record<GameId, ComponentType<GameProps>> = {
  balon: lazy(() => import('./Balloons')),
  kurbaga: lazy(() => import('./FrogJump')),
  'gizli-sayi': lazy(() => import('./SecretNumber')),
  'bir-islem': lazy(() => import('./TargetNumber')),
  pizza: lazy(() => import('./PizzaShop')),
  kasa: lazy(() => import('./Cashier')),
  robot: lazy(() => import('./RobotCode')),
  tahmin: lazy(() => import('./NumberLineGuess')),
  makine: lazy(() => import('./RuleMachine')),
  labirent: lazy(() => import('./NumberMaze')),
  gemiler: lazy(() => import('./Battleship')),
  aci: lazy(() => import('./AngleCannon')),
  'at-yarisi': lazy(() => import('./DiceRace')),
}
