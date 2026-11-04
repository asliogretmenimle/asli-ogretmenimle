import type { Props, Tile } from './types'
import { commit, getState, makeTile, resetView, setState } from './store'

type Maker = () => Tile[]

const T = (type: string, p: Props, x: number, y: number, extra: Partial<Tile> = {}) => ({ ...makeTile(type, p, x, y), ...extra })
const text = (s: string, x: number, y: number, width = 360, size = 22) => {
  const t = makeTile('text', {}, x, y)
  return { ...t, p: { ...t.p, text: s, width, size } }
}

const EXAMPLES: { title: string; desc: string; grade: string; make: Maker }[] = [
  {
    title: 'Örüntü bloklarıyla altıgen',
    desc: 'Altıgeni yamuk, eşkenar dörtgen ve üçgenlerle kaç farklı şekilde kaplayabilirsin?',
    grade: '1–4',
    make: () => [
      text('Altıgeni farklı parçalarla kapla. Hangi parçadan kaç tane gerekiyor?', 0, -200, 460),
      T('polygon', { shape: 'reg-hexagon' }, -220, 0),
      T('polygon', { shape: 'trapezium' }, -20, -40),
      T('polygon', { shape: 'trapezium' }, -20, 40, { rot: 180 }),
      T('polygon', { shape: 'rhombus' }, 140, -60),
      T('polygon', { shape: 'rhombus' }, 220, -60),
      T('polygon', { shape: 'rhombus' }, 180, 40),
      ...[0, 1, 2, 3, 4, 5].map((i) => T('polygon', { shape: 'equ-triangle' }, -150 + i * 70, 160)),
    ],
  },
  {
    title: 'Onluk taban blokları',
    desc: '243 sayısını yüzlük, onluk ve birliklerle modelle; bir onluğu parçalayarak 10 birlik elde et.',
    grade: '2–4',
    make: () => [
      text('243 sayısını bloklarla göster. Bir onluğu seçip “Parçala” ile birliklere ayır.', 0, -260, 480),
      T('number-tile', { width: 10, value: 100 }, -280, 0),
      T('number-tile', { width: 10, value: 100 }, -80, 0),
      ...[0, 1, 2, 3].map((i) => T('number-tile', { width: 10, value: 10 }, 80 + i * 44, 0)),
      ...[0, 1, 2].map((i) => T('number-tile', { width: 1, value: 1 }, 290, -60 + i * 44)),
      T('number-card', { value: 243 }, 0, 220),
    ],
  },
  {
    title: 'Denk kesirler',
    desc: 'Kesir şeritlerini alt alta dizerek 1/2 = 2/4 = 4/8 olduğunu keşfet.',
    grade: '3–5',
    make: () =>
      [1, 2, 4, 8, 3, 6].map((d, i) => T('fraction-bar', { count: d, denominator: d, labels: 'fraction' }, 0, -150 + i * 60)).concat([text('Hangi şeritler yarıma denk geliyor?', 0, -240, 420)]),
  },
  {
    title: 'Kesir daireleri',
    desc: 'Bir bütünü farklı paydalarla parçala, parçaları karşılaştır.',
    grade: '3–5',
    make: () => [1, 2, 3, 4, 6, 8].map((d, i) => T('fraction-circle', { denominator: d, labels: 'fraction', showUnitLabel: true }, -330 + (i % 3) * 330, -110 + Math.floor(i / 3) * 220)),
  },
  {
    title: 'Cebir karoları: x² + 3x + 2',
    desc: 'Karoları bir dikdörtgen oluşturacak şekilde yerleştir ve çarpanlarına ayır.',
    grade: '7–8',
    make: () => [
      T('equation', { src: 'x^2 + 3x + 2' }, 0, -220),
      T('algebra', { expr: 'x2' }, -200, 0),
      ...[0, 1, 2].map((i) => T('algebra', { expr: 'x', rot: 90 }, -30 + i * 50, 0)),
      T('algebra', { expr: '1' }, 160, -30),
      T('algebra', { expr: '1' }, 160, 30),
    ],
  },
  {
    title: 'Terazi ile denklem',
    desc: 'Terazinin iki kefesini dengede tutarak bilinmeyeni bul.',
    grade: '6–7',
    make: () => [
      T('balance', {}, 0, 60),
      ...[0, 1, 2].map((i) => T('token', { shape: 'circle' }, -160 + i * 40, -80)),
      ...[0, 1, 2, 3, 4].map((i) => T('token', { shape: 'square' }, 90 + (i % 3) * 40, -100 + Math.floor(i / 3) * 40)),
      text('Kefelere pul yerleştir. Terazi ne zaman dengede kalıyor?', 0, -230, 440),
    ],
  },
  {
    title: 'Sayı doğrusunda toplama',
    desc: '7 + 5 işlemini sayı doğrusunda atlamalarla göster.',
    grade: '1–3',
    make: () => [T('number-line', {}, 0, 40), T('multi-jump', { single: true }, -60, -20), T('equation', { src: '7 + 5 = ?' }, 0, -140)],
  },
  {
    title: 'Olasılık deneyi',
    desc: 'Zarları ve çarkı çevir, sonuçları sütun grafiğine kaydet.',
    grade: '5–8',
    make: () => [T('dice', {}, -260, -120), T('dice', {}, -180, -120), T('spinner', {}, -220, 80), T('chart', {}, 180, 0), text('Her denemenin sonucunu grafiğe işle.', 0, -260, 380)],
  },
  {
    title: 'Saat okuma',
    desc: 'İbreleri sürükleyerek verilen saati göster.',
    grade: '1–3',
    make: () => [T('clock', { clock: 'geared', ms: 6300 }, -150, 0), T('clock', { clock: 'free', h: 2, m: 45, s: 0 }, 150, 0), text('Saat 3:15’i göster.', 0, -200, 280)],
  },
  {
    title: 'Tangram kare',
    desc: 'Yedi tangram parçasıyla bir kare, sonra bir kedi oluştur.',
    grade: '2–6',
    make: () => [0, 1, 2, 3, 4, 5, 6].map((i) => T('tangram', { index: i, rot: [-90, 0, 0, 0, -90, 0, 90][i] }, -300 + (i % 4) * 200, -100 + Math.floor(i / 4) * 200)),
  },
  {
    title: 'Asal çarpanlar',
    desc: 'Asal çarpan dairelerini birbirinin üstüne bırakarak çarp, büyük sayıları çarpanlarına ayır.',
    grade: '6',
    make: () => [2, 3, 4, 6, 12, 18].map((v, i) => T('prime-disk', { value: v }, -250 + i * 100, 0)),
  },
  {
    title: 'Mantık devresi',
    desc: 'İki anahtar ve bir VE kapısıyla lambayı yak.',
    grade: '5–8',
    make: () => {
      const a = T('logic-switch', {}, -220, -60)
      const b = T('logic-switch', {}, -220, 60)
      const g = T('logic-gate', { gate: 'and' }, 0, 0)
      g.p = { ...g.p, inputs: [`${a.id}:0`, `${b.id}:0`] }
      const l = T('logic-bulb', {}, 200, 0)
      l.p = { ...l.p, inputs: [`${g.id}:0`] }
      return [a, b, g, l]
    },
  },
]

export function ExamplesPanel() {
  const load = (m: Maker) => {
    const st = getState()
    if (st.tiles.length && !window.confirm('Tuvaldeki çalışma örnekle değiştirilsin mi? (Geri al ile geri dönebilirsiniz.)')) return
    setState({ tiles: m(), sel: [], editing: null, tool: 'move' })
    commit()
    requestAnimationFrame(resetView)
    if (window.innerWidth < 700) setState({ sidebarOpen: false })
  }
  return (
    <div className="pp-examples">
      <p className="pp-caption">Bir örneğe dokunun; tuvale yüklenir ve hemen keşfetmeye başlayabilirsiniz.</p>
      {EXAMPLES.map((e) => (
        <button key={e.title} type="button" className="pp-example" onClick={() => load(e.make)}>
          <span className="pp-example-title">{e.title}</span>
          <span className="pp-example-desc">{e.desc}</span>
          <span className="pp-example-grade">{e.grade}. sınıf</span>
        </button>
      ))}
    </div>
  )
}
