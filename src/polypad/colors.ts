/** Polypad renk paleti (araç çubuğundaki renk seçicisiyle aynı sıra) */
export const PALETTE: { c: string; name: string }[] = [
  { c: '#fec680', name: 'Açık turuncu' },
  { c: '#f5a393', name: 'Açık kırmızı' },
  { c: '#e687b3', name: 'Açık pembe' },
  { c: '#b69ddf', name: 'Açık mor' },
  { c: '#87c1f9', name: 'Açık mavi' },
  { c: '#80cfd3', name: 'Açık turkuaz' },
  { c: '#91d592', name: 'Açık yeşil' },
  { c: '#dfe189', name: 'Açık sarı' },
  { c: '#eeeeee', name: 'Beyaz' },
  { c: '#fd8c00', name: 'Turuncu' },
  { c: '#eb4726', name: 'Kırmızı' },
  { c: '#cd0e66', name: 'Pembe' },
  { c: '#6d3bbf', name: 'Mor' },
  { c: '#0f82f2', name: 'Mavi' },
  { c: '#009ea6', name: 'Turkuaz' },
  { c: '#22ab24', name: 'Yeşil' },
  { c: '#bfc212', name: 'Sarı' },
  { c: '#777777', name: 'Gri' },
  { c: '#b16200', name: 'Koyu turuncu' },
  { c: '#a5321b', name: 'Koyu kırmızı' },
  { c: '#900a47', name: 'Koyu pembe' },
  { c: '#4c2986', name: 'Koyu mor' },
  { c: '#0b5ba9', name: 'Koyu mavi' },
  { c: '#006f74', name: 'Koyu turkuaz' },
  { c: '#187819', name: 'Koyu yeşil' },
  { c: '#86880d', name: 'Koyu sarı' },
  { c: '#111111', name: 'Siyah' },
]

export const C = {
  orange: '#fd8c00',
  red: '#eb4726',
  pink: '#cd0e66',
  purple: '#6d3bbf',
  blue: '#0f82f2',
  teal: '#009ea6',
  green: '#22ab24',
  yellow: '#bfc212',
  grey: '#777777',
  dark: '#242436',
  black: '#111111',
  white: '#ffffff',
  lOrange: '#fec680',
  lRed: '#f5a393',
  lPink: '#e687b3',
  lPurple: '#b69ddf',
  lBlue: '#87c1f9',
  lTeal: '#80cfd3',
  lGreen: '#91d592',
  lYellow: '#dfe189',
  dOrange: '#b16200',
  dRed: '#a5321b',
  dPink: '#900a47',
  dPurple: '#4c2986',
  dBlue: '#0b5ba9',
  dTeal: '#006f74',
  dGreen: '#187819',
  dYellow: '#86880d',
} as const

/** Kalem araçlarının hazır renkleri (araç çubuğundaki kalemler) */
export const PEN_COLORS = ['#242436', '#fd8c00', '#cd0e66', '#6d3bbf', '#0f82f2', '#22ab24']

/** Sayı çubukları 1–10 renkleri */
export const BAR_COLORS = ['#eeeeee', '#eb4726', '#91d592', '#cd0e66', '#fec680', '#22ab24', '#777777', '#6d3bbf', '#0f82f2', '#fd8c00']

/** Tuval ve parça kenar rengi (CSS değişkeni; yüksek karşıtlıkta koyulaşır) */
export const STROKE = 'var(--pp-tile-stroke)'
export const CANVAS_BG = 'var(--pp-canvas-bg)'
