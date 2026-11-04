import { boundsOf, boxCorners, pad } from './geom'
import { getState, worldBox } from './store'

/** CSS değişkenlerinin dışa aktarılan dosyadaki karşılıkları */
const VARS: Record<string, string> = {
  '--pp-tile-stroke': 'rgba(36,36,54,.55)',
  '--pp-canvas-bg': '#ffffff',
  '--pp-accent': '#0f82f2',
  '--canvas-bg': '#ffffff',
}

function standaloneSvg(): { svg: string; w: number; h: number } | null {
  const st = getState()
  const world = document.querySelector('.pp-world')
  if (!world || !st.tiles.length) return null
  const b = pad(boundsOf(st.tiles.flatMap((t) => boxCorners(worldBox(t)))), 24)
  const clone = world.cloneNode(true) as SVGGElement
  clone.removeAttribute('transform')
  clone.removeAttribute('filter')
  // Seçim ve canlı çizim öğeleri çıkmasın
  clone.querySelectorAll('[data-export="skip"]').forEach((n) => n.remove())
  const defs = document.querySelector('.pp-svg defs')?.outerHTML ?? ''
  let inner = clone.innerHTML
  for (const [k, v] of Object.entries(VARS)) inner = inner.split(`var(${k})`).join(v)
  const w = Math.ceil(b.w)
  const h = Math.ceil(b.h)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" font-family="Nunito, ui-rounded, system-ui, sans-serif">${defs}<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${st.bg}"/>${inner}</svg>`
  return { svg, w, h }
}

function download(href: string, name: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function exportImage(kind: 'png' | 'jpg' | 'svg'): Promise<boolean> {
  const out = standaloneSvg()
  if (!out) return false
  const blob = new Blob([out.svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  if (kind === 'svg') {
    download(url, 'tuval.svg')
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return true
  }
  const img = new Image()
  img.decoding = 'async'
  const loaded = new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('görüntü yüklenemedi'))
  })
  img.src = url
  await loaded
  // Büyük tuvallerde tarayıcı sınırını aşmamak için ölçek
  const scale = Math.min(2, 8000 / Math.max(out.w, out.h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(out.w * scale)
  canvas.height = Math.round(out.h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = getState().bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)
  const type = kind === 'png' ? 'image/png' : 'image/jpeg'
  const data = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.92))
  if (!data) return false
  const u = URL.createObjectURL(data)
  download(u, `tuval.${kind}`)
  setTimeout(() => URL.revokeObjectURL(u), 4000)
  return true
}
