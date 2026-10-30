import type { ManipulativeTool } from '../data/types'
import type { ToolDef } from './types'
import { base10, money, numberline, tenframe } from './numberTools'
import { clock, fractions } from './measureTools'
import { angle, coordinate, geoboard, nets, symmetry } from './geometryTools'
import { algebra, balance, bargraph, probability } from './algebraDataTools'
import { rekenrek } from './new/rekenrek'
import { yuzluk } from './new/yuzluk'
import { sayikartlari } from './new/sayikartlari'
import { noktakartlari } from './new/noktakartlari'
import { dizilim } from './new/dizilim'
import { carpanagaci } from './new/carpanagaci'
import { kesirdaireleri } from './new/kesirdaireleri'
import { kesirdogrusu } from './new/kesirdogrusu'
import { yuzdeizgarasi } from './new/yuzdeizgarasi'
import { orantablosu } from './new/orantablosu'
import { ciftdogru } from './new/ciftdogru'
import { tangram } from './new/tangram'
import { oruntubloklari } from './new/oruntubloklari'
import { izometrik } from './new/izometrik'
import { alancevre } from './new/alancevre'
import { dinamikucgen } from './new/dinamikucgen'
import { donusum } from './new/donusum'
import { grafiklab } from './new/grafiklab'
import { egim } from './new/egim'
import { rastgeledeney } from './new/rastgeledeney'
import { kalbur } from './new/kalbur'

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
  rekenrek,
  yuzluk,
  sayikartlari,
  noktakartlari,
  dizilim,
  carpanagaci,
  kesirdaireleri,
  kesirdogrusu,
  yuzdeizgarasi,
  orantablosu,
  ciftdogru,
  tangram,
  oruntubloklari,
  izometrik,
  alancevre,
  dinamikucgen,
  donusum,
  grafiklab,
  egim,
  rastgeledeney,
  kalbur,
}

