import type { CSSProperties } from 'react'

/** Arayüz simgeleri (24×24, currentColor) */
const P: Record<string, string> = {
  cursor: 'M5 3l13 7.5-5.6 1.4 3.3 6.2-2.4 1.3-3.3-6.2L6 17.3z',
  pen: 'M15.5 4.5l4 4L9 19H5v-4zM13 7l4 4',
  'geo-line': 'M5 19L19 5M5 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M19 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  'geo-construction': 'M12 3l-6 17M12 3l6 17M12 3a1.5 1.5 0 1 0 0 .1M8 13a8 8 0 0 0 8 0',
  'geo-point': 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'geo-circle': 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 12h.01',
  'geo-rectangle': 'M4 6h16v12H4z',
  'geo-angle': 'M4 19h16M4 19L15 6M10 19a6 6 0 0 0-2-4.5',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  equation: 'M4 8h6M7 5v6M14 8h6M4 17l5-5M4 12l5 5M14 15h6M14 18h6',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  grid: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
  controls: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  fullscreen: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  'fullscreen-exit': 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  screenshot: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'zoom-in': 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.8-4.8M10.5 7.5v6M7.5 10.5h6',
  'zoom-out': 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.8-4.8M7.5 10.5h6',
  move: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  shapes: 'M7 3l4 7H3zM17 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 14h8v7H3zM17 13l4 4-4 4-4-4z',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  lightbulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01',
  geometry: 'M12 3l9 16H3z',
  numbers: 'M4 9h16M4 15h16M10 3L8 21M16 3l-2 18',
  fractions: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v9l6.4 6.4M12 12L3.5 9',
  algebra: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM15 16.5h3M16.5 15v3',
  probability: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
  applications: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  chevron: 'M9 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.5-2',
  flip: 'M12 3v18M8 7L3 12l5 5zM16 7l5 5-5 5',
  front: 'M8 8h12v12H8zM4 16V4h12',
  back: 'M4 4h12v12H4zM8 20h12V8',
  palette: 'M12 3a9 9 0 0 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-7.8-9-7.8zM7.5 11.5h.01M10 7.5h.01M14 7.5h.01M16.5 11h.01',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  home: 'M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  rotate: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  check: 'M4 12l5 5L20 6',
  back2: 'M10 6l-6 6 6 6M4 12h16',
  folder: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}

export function Icon({ name, size = 24, style, className }: { name: string; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={style} className={className}>
      <path d={P[name] ?? P.help} />
    </svg>
  )
}
