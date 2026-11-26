/** Stüdyo'nun küçük ortak parçaları */
import { useRef, useState, type ClipboardEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { useToast } from '../ui'
import { resizeImage } from './model'

const MAX_IMAGES = 4

/** Görsel ekleme: dosya seçici + küçük önizlemeler */
export function useImageAttach() {
  const [images, setImages] = useState<string[]>([])
  const input = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const add = async (files: FileList | File[] | null) => {
    if (!files) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const room = MAX_IMAGES - images.length
    if (list.length > room) toast(`En fazla ${MAX_IMAGES} görsel ekleyebilirsiniz.`, 'info')
    try {
      const urls = await Promise.all(list.slice(0, Math.max(0, room)).map((f) => resizeImage(f)))
      setImages((x) => [...x, ...urls].slice(0, MAX_IMAGES))
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => {
        add(e.target.files)
        e.target.value = ''
      }}
    />
  )

  const button = (className = '') => (
    <button
      type="button"
      onClick={() => input.current?.click()}
      disabled={images.length >= MAX_IMAGES}
      title="Görsel ekle (çalışma kâğıdı, ekran görüntüsü, çizim)"
      aria-label="Görsel ekle"
      className={`grid size-9 shrink-0 place-items-center rounded-xl text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-40 ${className}`}
    >
      <ImagePlus size={18} />
    </button>
  )

  const thumbs = images.length ? (
    <div className="flex flex-wrap gap-2">
      {images.map((src, i) => (
        <div key={i} className="group relative">
          <img src={src} alt={`Ek ${i + 1}`} className="size-14 rounded-xl object-cover ring-1 ring-line" />
          <button
            type="button"
            onClick={() => setImages((x) => x.filter((_, j) => j !== i))}
            aria-label="Görseli kaldır"
            className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-white shadow"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  ) : null

  /** Yapıştırılan görselleri de al (Ctrl+V) */
  const onPaste = (e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'))
    if (files.length) {
      e.preventDefault()
      add(files)
    }
  }

  return { images, setImages, picker, button, thumbs, onPaste, add }
}

/** Yanıp sönen üç nokta */
export function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${i * 140}ms` }} />
      ))}
    </span>
  )
}
