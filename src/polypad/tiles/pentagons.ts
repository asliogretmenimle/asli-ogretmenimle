import type { Pt } from '../types'

/** 15 dışbükey beşgen döşeme türü (pentagon-1…15) ve özel durumlar (pentagon-16 prizmatik, 17 Kahire, 18 çiçek) */
export const PENTAGONS: Record<string, { pts: Pt[]; color: string }> = {}
