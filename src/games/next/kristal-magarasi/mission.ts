import type { ComponentType } from 'react'
import type { ManipulativeTool } from '../../../data/types'
import type { GemName } from './ui'

/** Oyun kabuğunun görev bileşenlerine verdiği denetim nesnesi */
export interface Ctl {
  /** Paneldeki görev cümlesini değiştirir */
  task: (t: string) => void
  /** Doğru bir hamle (rapora attempt(true)); açık bir ipucu balonu varsa kapatır */
  ok: () => void
  /** Henüz değil: soru soran geri bildirim; mis verilirse kavram yanılgısı olarak raporlanır */
  miss: (q: string, mis?: string, tool?: ManipulativeTool) => void
  /** Bilgilendirici not (hata sayılmaz) */
  info: (q: string) => void
  /** Keşif defterine bir bulgu yazar */
  note: (t: string) => void
  /** Farklı bir çözüm yolu; yeniyse true */
  solve: (key: string, label: string) => boolean
  /** Hamleden çıkarılan strateji */
  strat: (name: string) => void
  /** Yalnızca kavram yanılgısını raporlar (tahminlerde, hata saymadan) */
  misconception: (t: string) => void
  /** Görev bitti */
  complete: () => void
}

export interface MissionDef {
  id: string
  title: string
  gem: GemName
  /** Odanın kısa hikâyesi */
  story: string
  hints: string[]
  /** Bitişte "Nasıl düşündün?" seçenekleri */
  strategies?: string[]
  Comp: ComponentType<{ ctl: Ctl }>
}
