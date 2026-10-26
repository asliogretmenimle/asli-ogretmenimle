import type { ExternalLink } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  DIŞ BAĞLANTILAR — Aslı Hoca bu listeye istediği kadar link ekleyebilir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  Her link, bir öğrenme çıktısına ("MAT.3.1.4") ya da bir temaya
 *  ("3/sayilar-ve-nicelikler-1") bağlanır ve o sayfada otomatik görünür.
 *
 *  Örnek:
 *    {
 *      title: 'Kesir Duvarı',
 *      url: 'https://www.geogebra.org/m/xxxxxxx',
 *      target: 'MAT.4.1.7',
 *      kind: 'geogebra',            // 'oyun' | 'video' | 'geogebra' | 'calisma-kagidi' | 'diger'
 *      note: 'Denk kesirleri keşfet',
 *    },
 *
 *  Tema adlarını (target için) sitedeki tema sayfasının adres çubuğundan
 *  kopyalayabilirsiniz: siteadresi/sinif/3/sayilar-ve-nicelikler-1 → "3/sayilar-ve-nicelikler-1"
 */
export const externalLinks: ExternalLink[] = [
  // ── Örnekler (silebilir ya da değiştirebilirsiniz) ──
  {
    title: 'GeoGebra Klasik',
    url: 'https://www.geogebra.org/classic',
    target: '5/geometrik-sekiller',
    kind: 'geogebra',
    note: 'Çizim ve inşalar için',
  },
  {
    title: 'GeoGebra Klasik',
    url: 'https://www.geogebra.org/classic',
    target: '8/cebirsel-dusunme-ve-degisimler',
    kind: 'geogebra',
    note: 'Doğrusal fonksiyonların grafiklerini çiz',
  },
]

export const linksFor = (outcomeCodes: string[], themeKey?: string) =>
  externalLinks.filter((l) => outcomeCodes.includes(l.target) || (themeKey && l.target === themeKey))
