/**
 * Yeni sürüm yayınlandığında, açık sekmedeki eski JS parçalarının adresleri artık sunucuda yoktur (404).
 * Böyle bir yükleme hatasında sayfa bir kez yenilenir ve yeni sürüm yüklenir.
 * Aynı hata 10 sn içinde tekrarlarsa (ör. internet yok) döngüye girmemek için yenilenmez; hata ekranı görünür.
 */
const KEY = 'ao-chunk-reload'

export function isChunkError(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e)
  return /dynamically imported module|Importing a module script failed|Unable to preload|ChunkLoadError|Loading chunk|valid JavaScript MIME type/i.test(msg)
}

/** Son 10 sn içinde yenilenmediyse sayfayı yeniler; yenileme başladıysa true döner */
export function reloadOnce(): boolean {
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < 10_000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

export function installChunkReload() {
  // Vite, dinamik import ve ön yükleme hatalarında bu olayı yayar
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadOnce()) e.preventDefault()
  })
  window.addEventListener('unhandledrejection', (e) => {
    if (isChunkError(e.reason)) reloadOnce()
  })
}
