import type { TileDef } from '../types'
import { basicTiles } from './basic'
import { polygonTiles } from './polygons'
import { geometryTiles } from './geometry'
import { numbersTiles } from './numbers'
import { algebraTiles } from './algebra'
import { probabilityTiles } from './probability'
import { appsTiles } from './apps'

const registry = new Map<string, TileDef>()
for (const d of [...basicTiles, ...polygonTiles, ...geometryTiles, ...numbersTiles, ...algebraTiles, ...probabilityTiles, ...appsTiles]) registry.set(d.type, d)

export const getDef = (type: string) => registry.get(type)
