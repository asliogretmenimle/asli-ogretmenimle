import { Component, type ReactNode } from 'react'
import { isChunkError, reloadOnce } from '../lib/chunkReload'

/**
 * Bir sayfa hata verirse o sayfanın yerine hata ekranı gösterir.
 * resetKey (ör. adres) değişince kendini sıfırlar; yeni sürüm yüzünden parça yüklenemediyse sayfayı bir kez yeniler.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null; reloading: boolean }> {
  state = { error: null as Error | null, reloading: false }

  static getDerivedStateFromError(error: Error) {
    return { error, reloading: isChunkError(error) }
  }

  componentDidCatch(error: Error) {
    if (isChunkError(error) && !reloadOnce()) this.setState({ reloading: false })
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null, reloading: false })
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.state.reloading) {
      return (
        <div className="grid h-[50vh] place-items-center">
          <span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yeni sürüm yükleniyor" />
        </div>
      )
    }
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <p className="text-6xl" aria-hidden>🛠️</p>
        <h1 className="mt-4 text-2xl font-black">Bir şeyler ters gitti</h1>
        <p className="mt-2 font-semibold text-ink-soft">İnternet bağlantını kontrol edip sayfayı yenilemeyi dene.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Sayfayı yenile</button>
          <a href="/" className="btn-ghost">Ana sayfa</a>
        </div>
      </div>
    )
  }
}
