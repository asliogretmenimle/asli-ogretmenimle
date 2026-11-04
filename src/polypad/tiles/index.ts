import type { ActionSpec, TileDef } from '../types'
import { basicActions, basicTiles } from './basic'
import { polygonActions, polygonTiles } from './polygons'
import { geometryActions, geometryTiles } from './geometry'
import { numbersActions, numbersTiles } from './numbers'
import { algebraActions, algebraTiles } from './algebra'
import { probabilityActions, probabilityTiles } from './probability'
import { appsActions, appsTiles } from './apps'

const registry = new Map<string, TileDef>()
for (const d of [...basicTiles, ...polygonTiles, ...geometryTiles, ...numbersTiles, ...algebraTiles, ...probabilityTiles, ...appsTiles]) registry.set(d.type, d)

export const getDef = (type: string) => registry.get(type)

/** Parçaya özel eylem çubuğu öğeleri (Polypad'deki kayıt sırasıyla) */
export const tileActions: ActionSpec[] = [...polygonActions, ...geometryActions, ...numbersActions, ...algebraActions, ...probabilityActions, ...appsActions, ...basicActions]
