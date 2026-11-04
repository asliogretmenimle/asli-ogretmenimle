/** @jsxRuntime automatic @jsxImportSource react */
/**
 * Tuval parçaları için duman testi: kenar çubuğundaki her kaynağı oluşturur, çizer,
 * sınırlarını, tutamaklarını ve eylemlerini denetler. Kullanım: pnpm tsx --tsconfig tsconfig.app.json scripts/polypad-smoke.tsx [tür]
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { CATALOG } from '../src/polypad/catalog'
import { getDef } from '../src/polypad/tiles'
import { api, makeTile } from '../src/polypad/store'

const only = process.argv[2]
let errors = 0
let count = 0
const missing = new Set<string>()

for (const cat of CATALOG)
  for (const sec of cat.sections)
    for (const grp of sec.groups)
      for (const src of grp.sources) {
        if (only && src.t !== only) continue
        const def = getDef(src.t)
        if (!def) {
          missing.add(src.t)
          continue
        }
        count++
        const where = `${sec.key} › ${src.t} ${JSON.stringify(src.p ?? {})}`
        try {
          const t = makeTile(src.t, src.p ?? {})
          const b = def.bounds(t)
          if (![b.x, b.y, b.w, b.h].every(Number.isFinite) || b.w <= 0 || b.h <= 0) throw new Error(`geçersiz bounds ${JSON.stringify(b)}`)
          for (const selected of [false, true]) {
            const html = renderToStaticMarkup(<svg>{def.render(t, { selected, thumb: !selected, tiles: [t] })}</svg>)
            if (/NaN|undefined|\[object Object\]/.test(html)) throw new Error(`çıktıda NaN/undefined: ${html.slice(0, 300)}`)
          }
          if (def.thumb) renderToStaticMarkup(<svg>{def.thumb(t)}</svg>)
          def.outline?.(t).forEach((p) => {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('outline NaN')
          })
          def.handles?.(t).forEach((h) => {
            if (!Number.isFinite(h.x) || !Number.isFinite(h.y)) throw new Error(`tutamak NaN: ${h.id}`)
          })
          def.actions?.(t, api)
          def.name(t)
        } catch (e) {
          errors++
          console.error(`✗ ${where}\n  ${(e as Error).stack?.split('\n').slice(0, 4).join('\n  ')}`)
        }
      }

if (missing.size) console.log(`Tanımı olmayan türler (${missing.size}): ${[...missing].join(', ')}`)
console.log(`${count} kaynak denendi, ${errors} hata`)
process.exit(errors ? 1 : 0)
