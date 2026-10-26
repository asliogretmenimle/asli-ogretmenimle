import type { ManipulativeTool } from '../data/types'
import type { ToolDef } from './types'
import { base10, money, numberline, tenframe } from './numberTools'
import { clock, fractions } from './measureTools'
import { angle, coordinate, geoboard, nets, symmetry } from './geometryTools'
import { algebra, balance, bargraph, probability } from './algebraDataTools'

export const tools: Record<ManipulativeTool, ToolDef<any>> = {
  tenframe,
  base10,
  numberline,
  fractions,
  clock,
  money,
  geoboard,
  symmetry,
  angle,
  balance,
  algebra,
  bargraph,
  probability,
  coordinate,
  nets,
}

