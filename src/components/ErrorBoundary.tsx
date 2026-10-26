import { Component, type ReactNode } from 'react'

/** Yeni sürüm yayınlandığında eski parçalar yüklenemezse sayfayı yenilemeyi önerir */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <p className="text-6xl" aria-hidden>🛠️</p>
        <h1 className="mt-4 text-2xl font-black">Bir şeyler ters gitti</h1>
        <p className="mt-2 font-semibold text-ink-soft">Sayfayı yenilemek genellikle sorunu çözer.</p>
        <button type="button" className="btn-primary mt-6" onClick={() => window.location.reload()}>Sayfayı yenile</button>
      </div>
    )
  }
}
