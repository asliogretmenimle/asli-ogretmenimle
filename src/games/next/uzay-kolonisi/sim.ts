import { ekD, fmt } from './util'

/**
 * Uzay Kolonisi — basit, açıklanabilir koloni simülasyonu.
 * Bir kaynak (su ya da enerji) birimlere bölünür; her birim bir modüle gider.
 *  - Sera: yiyecek (ve biraz oksijen) üretir.
 *  - Oksijen: oksijen üretir.
 *  - Yaşam: kişi başına su / enerji. Yetmezse nüfus büyümez, çok azsa koloni zorlanır.
 *  - Isıtma (7. sınıf): dış sıcaklık düştükçe daha çok enerji ister; yetmezse iç sıcaklık düşer.
 * Oksijen hem çok düşük (< 19) hem çok yüksek (> 23, yangın riski) olamaz → denge gerekir.
 */

export type SegId = 'sera' | 'oksijen' | 'yasam' | 'isitma' | 'lab'

export interface SimCfg {
  /** toplam birim sayısı (ör. 12 blok, 20 × %5) */
  units: number
  /** başlangıç nüfusu */
  p0: number
  /** en çok nüfus (yaşam modülü kapasitesi) */
  cap: number
  sols: number
  /** dış sıcaklıklar (°C), yalnız ısıtmalı modelde */
  temps?: number[]
}

export interface SimRow {
  sol: number
  pop: number
  o2: number
  food: number
  /** kişi başına yaşam payı (birim/kişi × 10) */
  care: number
  inside?: number
  heatNeed?: number
}

export interface SimResult {
  rows: SimRow[]
  fail: null | { sol: number; why: 'o2low' | 'o2high' | 'food' | 'care' | 'cold'; text: string }
}

const r1 = (v: number) => Math.round(v * 10) / 10

/** plan: her segmente verilen birim sayısı */
export function simulate(plan: Partial<Record<SegId, number>>, cfg: SimCfg): SimResult {
  const U = cfg.units
  const heat = plan.isitma ?? 0
  const s = (plan.sera ?? 0) / U
  const o = (plan.oksijen ?? 0) / U
  const y = (plan.yasam ?? 0) / U
  let pop = cfg.p0
  let o2 = 21
  let food = 6
  const rows: SimRow[] = [{ sol: 0, pop, o2, food, care: r1((y * 120) / pop), inside: cfg.temps ? 21 : undefined }]
  const scale = cfg.temps ? 1.55 : 1 // ısıtmalı modelde kalan enerji daha az: üretim katsayısı daha yüksek
  for (let t = 1; t <= cfg.sols; t++) {
    const care = (y * 120 * scale) / pop
    food += 30 * s * scale - pop
    o2 += (6.2 * o * scale + 1.8 * s * scale - 0.24 * pop) * 0.55
    let inside: number | undefined
    let heatNeed: number | undefined
    if (cfg.temps) {
      const T = cfg.temps[(t - 1) % cfg.temps.length]
      heatNeed = (21 - T) * 1.2 // kWh
      const H = heat * 15 // 1 birim = 15 kWh
      inside = r1(Math.min(21, 21 - Math.max(0, heatNeed - H) / 1.2))
    }
    const row: SimRow = { sol: t, pop, o2: r1(o2), food: r1(food), care: r1(care), inside, heatNeed: heatNeed === undefined ? undefined : r1(heatNeed) }
    rows.push(row)
    if (inside !== undefined && inside < 15) return { rows, fail: { sol: t, why: 'cold', text: `${t}. solda dışarısı ${fmt(cfg.temps![(t - 1) % cfg.temps!.length])} °C oldu; ısıtmaya giden enerji yetmedi, üs içi ${fmt(inside)} °C’ye düştü.` } }
    if (o2 < 19) return { rows, fail: { sol: t, why: 'o2low', text: `${t}. solda oksijen %${ekD(r1(o2), 'dat')} düştü. Nefes almak zorlaştı!` } }
    if (o2 > 23) return { rows, fail: { sol: t, why: 'o2high', text: `${t}. solda oksijen %${fmt(r1(o2))} oldu. Fazla oksijen yangın riski demek!` } }
    if (food < 0) return { rows, fail: { sol: t, why: 'food', text: `${t}. solda yiyecek bitti. Seralar ${pop} kişiye yetmedi.` } }
    if (care < 3) return { rows, fail: { sol: t, why: 'care', text: `${t}. solda yaşam modülünün payı ${pop} kişiye yetmedi.` } }
    // büyüme: yiyecek, yaşam payı ve oksijen iyiyse yeni bir kâşif gelir
    if (food >= pop * 0.5 && care >= 4 && o2 >= 20 && pop < cfg.cap) pop++
    row.pop = pop
  }
  return { rows, fail: null }
}


