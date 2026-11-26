/** Sayfa içerikleri: panel kayıtları (kind = 'page') varsayılanların üstüne uygulanır */
import { mergePatch } from './overlay'
import type { PageDef } from './pages/types'
import { useCmsVersion } from './runtime'
import { pageData } from './pageStore'


/** Derlemede (prerender) ve tarayıcıda kullanılabilir */
export function getPageContent<T extends Record<string, unknown>>(def: PageDef<T>): T {
  // Boşaltılan (null) alanlar varsayılana döner
  const patch = Object.fromEntries(Object.entries(pageData.get(def.id) ?? {}).filter(([, v]) => v !== null && v !== undefined))
  return mergePatch(def.defaults, patch)
}

/** Sayfa bileşenlerinde: panelde değişince yeniden çizilir */
export function usePageContent<T extends Record<string, unknown>>(def: PageDef<T>): T {
  useCmsVersion()
  return getPageContent(def)
}
