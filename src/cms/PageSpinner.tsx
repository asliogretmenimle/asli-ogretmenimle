export function PageSpinner() {
  return (
    <div className="grid h-[60vh] place-items-center">
      <span className="size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-label="Yükleniyor" />
    </div>
  )
}
