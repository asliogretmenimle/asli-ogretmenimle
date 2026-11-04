import type { Category, Props, Source, SourceGroup } from './types'

const s = (t: string, label: string, p?: Props, cap?: string): Source => ({ t, label, p, cap })
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const g = (sources: Source[], extra: Omit<SourceGroup, 'sources'> = {}): SourceGroup => ({ sources, ...extra })

const currencies: [string, string, number[]][] = [
  ['TRY', 'Türk lirası', [0.01, 0.05, 0.1, 0.25, 0.5, 1, 5, 10, 20, 50, 100, 200]],
  ['USD', 'ABD doları', [1, 5, 10, 25, 100]],
  ['EUR', 'Euro', [1, 2, 5, 10, 20, 50, 100, 200]],
  ['GBP', 'İngiliz sterlini', [1, 2, 5, 10, 20, 50, 100, 200]],
]

/** Kenar çubuğundaki "Parçalar" sekmesi: kategoriler → bölümler → kaynaklar */
export const CATALOG: Category[] = [
  {
    key: 'geometry',
    title: 'Geometri',
    color: '#eb4726',
    icon: 'geometry',
    sections: [
      {
        key: 'polygons',
        title: 'Çokgenler ve Şekiller',
        groups: [
          g([
            s('polygon', 'Eşkenar üçgen', { shape: 'equ-triangle' }),
            s('polygon', 'Kare', { shape: 'square' }),
            s('polygon', 'Düzgün beşgen', { shape: 'reg-pentagon' }),
            s('polygon', 'Düzgün altıgen', { shape: 'reg-hexagon' }),
            s('polygon', 'Düzgün yedigen', { shape: 'reg-heptagon' }),
            s('polygon', 'Düzgün sekizgen', { shape: 'reg-octagon' }),
          ], { max: 56, fit: true }),
          g([
            s('polygon', 'Yamuk', { shape: 'trapezium' }),
            s('polygon', 'Eşkenar dörtgen', { shape: 'rhombus' }),
            s('polygon', 'İnce eşkenar dörtgen', { shape: 'rhombus-2' }),
            s('polygon', 'Dikdörtgen', { shape: 'rectangle' }),
            s('polygon', 'Dik üçgen', { shape: 'right-triangle' }),
            s('polygon', 'Dik üçgen', { shape: 'right-triangle-2' }),
            s('polygon', 'Ok ucu', { shape: 'chevron' }),
            s('polygon', 'Deltoid', { shape: 'kite' }),
            s('polygon', 'Ok', { shape: 'dart' }),
          ], { max: 56, fit: true }),
          g(
            [
              s('rectangle', 'Dikdörtgen', {}, 'Dikdörtgen'),
              s('reg-polygon', 'Düzgün çokgen', {}, 'Düzgün'),
              s('custom-polygon', 'Çokgen', {}, 'Serbest'),
              s('circle', 'Çember', {}, 'Daire'),
              s('circle', 'Elips', { isEllipse: true, radius: 90, radiusY: 50 }, 'Elips'),
            ],
            { max: 64 },
          ),
        ],
      },
      {
        key: 'polyominoes',
        title: 'Poliominolar',
        groups: [
          g(range(0, 11).map((i) => s('polyomino', 'Pentomino', { index: i })), { subtitle: 'Pentominolar', max: 70 }),
          g(range(12, 16).map((i) => s('polyomino', 'Tetromino', { index: i })), { subtitle: 'Tetrominolar', max: 60 }),
        ],
      },
      {
        key: 'tangram',
        title: 'Tangram',
        groups: [
          g(
            [
              s('tangram', 'Tangram parçası', { index: 0, rot: -90 }),
              s('tangram', 'Tangram parçası', { index: 1, rot: 0 }),
              s('tangram', 'Tangram parçası', { index: 2, rot: 0 }),
              s('tangram', 'Tangram parçası', { index: 3, rot: 0 }),
              s('tangram', 'Tangram parçası', { index: 4, rot: -90 }),
              s('tangram', 'Tangram parçası', { index: 5, rot: 0 }),
              s('tangram', 'Tangram parçası', { index: 6, rot: 90 }),
            ],
            { subtitle: 'Klasik tangram', max: 90 },
          ),
          g(
            [
              [0, -22.5],
              [1, 22.5],
              [2, 45],
              [3, -45],
              [4, 135],
              [5, -135],
              [6, 180],
              [7, 45],
              [8, -45],
            ].map(([i, r]) => s('egg', 'Sihirli yumurta parçası', { index: i, rot: r })),
            { subtitle: 'Sihirli yumurta', max: 80 },
          ),
        ],
      },
      {
        key: 'aperiodic',
        title: 'Periyodik Olmayan Karolar',
        groups: [
          g([s('aperiodic-hat', 'Einstein şapkası')], { subtitle: 'Einstein şapkası', caption: 'Bilinen ilk periyodik olmayan tek karo.', max: 90 }),
          g([s('penrose', 'Penrose uçurtması'), s('penrose', 'Penrose oku', { index: 1 })], { subtitle: 'Penrose karoları', caption: 'Komşu karolar birleşirken beyaz yaylar birbirini tamamlamalı.', max: 90 }),
          g([1, 3, 4, 0, 6, 7, 2, 5].map((i) => s('garden', 'Doğa karosu', { index: i })), { subtitle: 'Doğa karoları', max: 64 }),
        ],
      },
      {
        key: 'pentagons',
        title: 'Beşgen Döşemeleri',
        groups: [
          g(range(1, 15).map((i) => s('polygon', `Beşgen döşemesi ${i}`, { shape: `pentagon-${i}` })), { max: 56, fit: true }),
          g(
            [
              s('polygon', 'Prizmatik', { shape: 'pentagon-16' }, 'Prizmatik'),
              s('polygon', 'Kahire', { shape: 'pentagon-17' }, 'Kahire'),
              s('polygon', 'Çiçek', { shape: 'pentagon-18' }, 'Çiçek'),
            ],
            { subtitle: 'Özel durumlar', max: 64 },
          ),
        ],
      },
      {
        key: 'solids',
        title: '3B Cisimler',
        groups: [
          g(
            [
              ['Tetrahedron', 'Düzgün dörtyüzlü'],
              ['Cube', 'Küp'],
              ['Octahedron', 'Düzgün sekizyüzlü'],
              ['Dodecahedron', 'Düzgün onikiyüzlü'],
              ['Icosahedron', 'Düzgün yirmiyüzlü'],
            ].map(([n, l]) => s('polyhedron', l, { net: n }, l)),
            { subtitle: 'Platon cisimleri', max: 72 },
          ),
          g(
            [
              s('polyhedron', 'Prizma', { net: 'Prism' }, 'Prizma'),
              s('polyhedron', 'Piramit', { net: 'Pyramid' }, 'Piramit'),
            ],
            { subtitle: 'Diğer çokyüzlüler', max: 72 },
          ),
        ],
      },
      {
        key: 'linkage',
        title: 'Bağlantı Çubukları',
        groups: [g([5, 7.07, 8.66, 10, 12.24, 14.14].map((l) => s('linkage', `Bağlantı çubuğu (${l})`, { length: l })), { max: 120 })],
      },
      {
        key: 'measuring',
        title: 'Ölçme Araçları',
        groups: [
          g(
            [
              s('ruler', 'Cetvel', {}, 'Cetvel'),
              s('protractor', 'İletki', {}, 'İletki'),
              s('set-triangle', 'Gönye', {}, 'Gönye'),
              s('compass', 'Pergel', {}, 'Pergel'),
              s('angle', 'Açı', {}, 'Açı'),
            ],
            { max: 90 },
          ),
        ],
      },
      {
        key: 'patterns',
        title: 'Örüntüler ve Sanat',
        groups: [
          g(range(0, 13).map((i) => s('tantrix', 'Tantrix karosu', { index: i })), { subtitle: 'Tantrix karoları', max: 56 }),
          g(range(0, 4).map((i) => s('fractal', 'Fraktal', { index: i })), { subtitle: 'Fraktallar', max: 72 }),
          g(range(0, 5).map((i) => s('kolam', 'Kolam karosu', { index: i })), { subtitle: 'Kolam karoları', max: 56 }),
          g([s('arrow', 'Ok')], { subtitle: 'Diğer şekiller', max: 80 }),
        ],
      },
    ],
  },
  {
    key: 'numbers',
    title: 'Sayılar',
    color: '#fd8c00',
    icon: 'numbers',
    sections: [
      {
        key: 'number-tiles',
        title: 'Sayı Karoları ve Küpleri',
        groups: [
          g(
            [
              s('number-tile', 'Birlik', { width: 1, value: 1 }),
              s('number-tile', 'Onluk', { width: 10, value: 10 }),
              s('number-tile', 'Yüzlük', { width: 10, value: 100 }),
            ],
            { max: 110 },
          ),
          g(
            [
              s('number-cube', 'Birlik küp'),
              s('number-cube', 'Onluk çubuk', { vx: 1, vy: 1, vz: 10 }),
              s('number-cube', 'Yüzlük plaka', { vx: 10, vy: 1, vz: 10 }),
              s('number-cube', 'Binlik küp', { vx: 10, vy: 10, vz: 10 }),
              s('number-cube', 'Küp 5×5×5', { vx: 5, vy: 5, vz: 5 }),
            ],
            { max: 90 },
          ),
          g(['#fd8c00', '#0f82f2', '#22ab24'].map((c) => s('snap-cube', 'Takılan küp', { colors: c })), { max: 50 }),
        ],
      },
      {
        key: 'number-bars',
        title: 'Sayı Çubukları',
        groups: [g([...[1, 10, 2, 9, 3, 8, 4, 7, 5, 6].map((v) => s('number-bar', `Sayı çubuğu ${v}`, { value: v })), { ...s('number-bar', 'Ayarlanabilir sayı çubuğu', { value: 25, adjustable: true }), edit: { key: 'value', numeric: true, label: 'Çubuğun uzunluğu' } }], { max: 130 })],
      },
      {
        key: 'number-frames',
        title: 'Sayı Çerçeveleri',
        groups: [
          g([s('ten-frame', 'Onluk çerçeve'), s('ten-frame-counter', 'Sayma pulu'), s('ten-frame-counter', 'Negatif sayma pulu', { value: -1 })], { max: 120 }),
          g(range(1, 10).map((v) => s('number-frame', `Sayı çerçevesi ${v}`, { value: v })), { max: 64 }),
        ],
      },
      {
        key: 'number-cards',
        title: 'Sayı Kartları',
        groups: [g([...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 1000].map((v) => s('number-card', `Sayı kartı ${v}`, { value: v })), { ...s('number-card', 'İstediğin sayı', { valueStr: '25' }), edit: { key: 'valueStr', label: 'Kartın sayısı' } }], { max: 56 })],
      },
      {
        key: 'number-line',
        title: 'Sayı Doğrusu',
        groups: [
          g(
            [
              s('number-line', 'Sayı doğrusu'),
              s('multi-jump', 'Geri atlama', { single: true, isFlipped: true, color: '#cd0e66' }),
              s('multi-jump', 'Atlama', { single: true }),
              s('multi-jump', 'Çoklu atlama'),
            ],
            { max: 120 },
          ),
        ],
      },
      {
        key: 'primes',
        title: 'Asal Çarpan Daireleri',
        groups: [g([...range(1, 20).map((v) => s('prime-disk', `${v} asal çarpan dairesi`, { value: v })), { ...s('prime-disk', 'İstediğin sayı', { value: 25 }), edit: { key: 'value', numeric: true, label: 'Dairenin sayısı' } }], { max: 48 })],
      },
      {
        key: 'number-dots',
        title: 'Nokta Dizilimleri',
        groups: [g([...range(2, 17).map((v) => s('number-dot', `${v} nokta`, { value: v }, String(v))), { ...s('number-dot', 'İstediğin sayı', { value: 18 }), edit: { key: 'value', numeric: true, label: 'Nokta sayısı' } }], { max: 56 })],
      },
      {
        key: 'number-grid',
        title: 'Sayı Tabloları',
        groups: [
          g(
            [
              s('number-grid', 'Toplama tablosu', { kind: 'addition', rows: 6, cols: 6 }, 'Toplama'),
              s('number-grid', 'Çarpım tablosu', { kind: 'multiplication', rows: 6, cols: 6 }, 'Çarpma'),
              s('number-grid', 'Yüzlük tablo'),
              s('decimal-grid', 'Ondalık tablo'),
            ],
            { max: 100 },
          ),
        ],
      },
      {
        key: 'number-tools',
        title: 'Ek Araçlar',
        groups: [
          g(range(0, 5).map((v) => s('hand-tile', `${v} parmak`, { value: v })), { subtitle: 'El karoları', max: 56 }),
          g([s('abacus', 'Abaküs')], { subtitle: 'Abaküs ya da rekenrek', max: 200 }),
          g([s('dot', 'Nokta'), s('dot', 'Karşı nokta', { value: -1 }), s('dot-machine', 'Patlayan noktalar makinesi')], { subtitle: 'Patlayan noktalar', max: 120 }),
          g([s('bucket', 'Sıfır kovası'), s('algebra', '+1 karosu', { expr: '1' }), s('algebra', '−1 karosu', { expr: '-1' })], { subtitle: 'Sıfır kovası', max: 100 }),
        ],
      },
    ],
  },
  {
    key: 'fractions',
    title: 'Kesirler',
    color: '#bfc212',
    icon: 'fractions',
    sections: [
      {
        key: 'fraction-bars',
        title: 'Kesir Şeritleri',
        groups: [g(range(1, 12).map((d) => s('fraction-bar', d === 1 ? 'Bütün' : `1/${d} kesir şeridi`, { count: d, denominator: d, labels: 'fraction' })), { max: 250 })],
      },
      {
        key: 'fraction-circles',
        title: 'Kesir Daireleri',
        groups: [g(range(1, 12).map((d) => s('fraction-circle', d === 1 ? 'Bütün daire' : `1/${d} daire dilimi`, { denominator: d, labels: 'fraction', showUnitLabel: true })), { max: 72 })],
      },
    ],
  },
  {
    key: 'algebra',
    title: 'Cebir',
    color: '#22ab24',
    icon: 'algebra',
    sections: [
      {
        key: 'algebra-tiles',
        title: 'Cebir Karoları',
        groups: [
          g(
            [
              s('algebra', '1', { expr: '1' }),
              s('algebra', 'x', { expr: 'x' }),
              s('algebra', 'y', { expr: 'y' }),
              s('algebra', 'xy', { expr: 'xy' }),
              s('algebra', 'x²', { expr: 'x2' }),
              s('algebra', 'y²', { expr: 'y2' }),
              s('algebra', 'x', { expr: 'x', rot: 90 }),
              s('algebra', 'y', { expr: 'y', rot: 90 }),
              s('algebra', 'xy', { expr: 'xy', rot: 90 }),
              s('algebra', '−1', { expr: '-1' }),
              s('algebra', '−x', { expr: '-x' }),
              s('algebra', '−y', { expr: '-y' }),
              s('algebra', '−xy', { expr: '-xy' }),
              s('algebra', '−x²', { expr: '-x2' }),
              s('algebra', '−y²', { expr: '-y2' }),
            ],
            { max: 76 },
          ),
        ],
      },
      {
        key: 'balance',
        title: 'Eşit Kollu Terazi',
        groups: [
          g(['circle', 'square', 'cross', 'weight', 'star', 'heart'].map((sh) => s('token', 'Pul', { shape: sh })), { max: 40 }),
          g([s('balance', 'Terazi')], { max: 220 }),
        ],
      },
      {
        key: 'functions',
        title: 'Fonksiyon Makineleri',
        groups: [
          g([...range(1, 8).map((v) => s('number-card', `Sayı kartı ${v}`, { value: v })), { ...s('number-card', 'İstediğin sayı', { valueStr: '10' }), edit: { key: 'valueStr', label: 'Kartın sayısı' } }], { max: 44 }),
          g([s('function-machine', 'Fonksiyon makinesi', { inputs: 1 }), s('function-machine', 'İki girdili fonksiyon makinesi', { inputs: 2 })], { max: 120 }),
        ],
      },
      {
        key: 'axes',
        title: 'Koordinat Eksenleri ve Tablolar',
        groups: [g([s('axes', 'Koordinat düzlemi'), s('table', 'Tablo')], { max: 110 })],
      },
      {
        key: 'sliders',
        title: 'Değişken Kaydırıcıları',
        groups: [
          g(
            [
              s('slider', 'a değişkeni', { variable: 'a', color: '#cd0e66' }),
              s('slider', 'b değişkeni', { variable: 'b', color: '#0f82f2' }),
              s('slider', 'c değişkeni', { variable: 'c', color: '#22ab24' }),
              s('slider', 'd değişkeni', { variable: 'd', color: '#fd8c00' }),
            ],
            { max: 120 },
          ),
        ],
      },
    ],
  },
  {
    key: 'probability',
    title: 'Olasılık ve Veri',
    color: '#009ea6',
    icon: 'probability',
    sections: [
      {
        key: 'random',
        title: 'Para, Zar ve Çarklar',
        groups: [
          g(
            [
              s('dice', 'Zar', {}, 'Zar'),
              s('coin', 'Madeni para', {}, 'Para'),
              s('random', 'Rastgele sayı', {}, 'Rastgele sayı'),
              s('spinner', 'Eşit çark', {}, 'Eşit'),
              s('custom-spinner', 'Özel çark', {}, 'Özel'),
            ],
            { max: 64 },
          ),
        ],
      },
      {
        key: 'charts',
        title: 'Grafikler ve İstatistik',
        groups: [
          g(
            [
              s('chart', 'Sütun grafiği', {}, 'Sütun grafiği'),
              s('chart', 'Çubuk grafiği', { kind: 'row' }, 'Çubuk grafiği'),
              s('chart', 'Çizgi grafiği', { kind: 'line' }, 'Çizgi grafiği'),
              s('chart', 'Alan grafiği', { kind: 'area', layout: 'stacked' }, 'Alan grafiği'),
              s('pie-chart', 'Daire grafiği', {}, 'Daire grafiği'),
              s('pie-chart', 'Halka grafiği', { kind: 'donut' }, 'Halka grafiği'),
              s('box-whisker', 'Kutu grafiği', {}, 'Kutu grafiği'),
            ],
            { max: 90 },
          ),
          g([s('axes', 'Koordinat düzlemi'), s('table', 'Tablo')], { max: 110 }),
        ],
      },
      {
        key: 'playing-cards',
        title: 'Oyun Kâğıtları',
        groups: [
          g(
            [
              ...['2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K', 'A'].map((r) => s('card', 'Oyun kâğıdı', { cards: `${r}C` })),
              s('card', 'Joker', { cards: 'JJ' }),
              s('card', '52 kartlık deste', { cards: 'deck' }, '52’lik deste'),
            ],
            { max: 56 },
          ),
        ],
      },
      {
        key: 'polyhedral-dice',
        title: 'Çokyüzlü Zarlar',
        groups: [g([4, 6, 8, 10, 12, 20].map((n) => s('polyhedral-dice', `${n} yüzlü zar`, n === 4 ? {} : { faceCount: n }, `z${n}`)), { max: 60 })],
      },
      {
        key: 'non-trans-dice',
        title: 'Geçişsiz Zarlar',
        groups: [
          g(
            [
              ['3,3,3,3,3,6', '#cd0e66'],
              ['2,2,2,5,5,5', '#0f82f2'],
              ['1,4,4,4,4,4', '#22ab24'],
            ].map(([f, c]) => s('dice', 'Geçişsiz zar', { faces: f, color: c })),
            { subtitle: 'Klasik zarlar', max: 56 },
          ),
          g(
            [
              ['3,3,3,3,3,3', '#cd0e66'],
              ['2,2,2,2,6,6', '#0f82f2'],
              ['1,1,1,5,5,5', '#22ab24'],
              ['0,0,4,4,4,4', '#fd8c00'],
            ].map(([f, c]) => s('dice', 'Efron zarı', { faces: f, color: c })),
            { subtitle: 'Efron zarları', max: 56 },
          ),
          g(
            [
              ['2,2,2,7,7,7', '#cd0e66'],
              ['1,1,6,6,6,6', '#0f82f2'],
              ['0,5,5,5,5,5', '#22ab24'],
              ['4,4,4,4,4,9', '#fd8c00'],
              ['3,3,3,3,8,8', '#eb4726'],
            ].map(([f, c]) => s('dice', 'Grime zarı', { faces: f, color: c })),
            { subtitle: 'Grime zarları', max: 56 },
          ),
        ],
      },
    ],
  },
  {
    key: 'applications',
    title: 'Oyunlar ve Uygulamalar',
    color: '#0f82f2',
    icon: 'applications',
    sections: [
      {
        key: 'music',
        title: 'Müzik',
        groups: [g([s('piano', 'Klavye', {}, 'Klavye'), s('song', 'Parça', {}, 'Parça')], { max: 120 })],
      },
      {
        key: 'logic',
        title: 'Mantık ve Bilgisayar',
        groups: [
          g([s('logic-button', 'Düğme', {}, 'Düğme'), s('logic-switch', 'Anahtar', {}, 'Anahtar'), s('logic-metronome', 'Metronom', {}, 'Metronom')], { subtitle: 'Girişler', max: 60 }),
          g([s('logic-bulb', 'Lamba', {}, 'Lamba'), s('logic-speaker', 'Hoparlör', {}, 'Hoparlör'), s('logic-display', 'Gösterge', {}, 'Gösterge')], { subtitle: 'Çıkışlar', max: 60 }),
          g(
            ['and', 'or', 'xor', 'buffer', 'nand', 'nor', 'xnor', 'not'].map((k) => s('logic-gate', `${k.toUpperCase()} kapısı`, { gate: k }, k.toUpperCase())),
            { subtitle: 'Mantık kapıları', max: 56 },
          ),
          g(['sr', 't', 'd', 'jk'].map((k) => s('logic-gate', `${k.toUpperCase()} mandalı`, { gate: k }, k.toUpperCase())), { subtitle: 'Bellek', max: 56 }),
        ],
      },
      {
        key: 'chess',
        title: 'Satranç',
        groups: [
          g([s('chess-board', 'Satranç tahtası')], { max: 150 }),
          g(
            [false, true].flatMap((dark) => ['p', 'b', 'n', 'r', 'k', 'q'].map((piece) => s('chess-piece', 'Satranç taşı', dark ? { dark, piece } : { piece }))),
            { max: 40 },
          ),
        ],
      },
      {
        key: 'currency',
        title: 'Paralar',
        groups: currencies.map(([cur, name, vals]) => g(vals.map((v) => s('currency', `${name} ${v}`, { value: v, currency: cur })), { subtitle: name, max: 90 })),
      },
      {
        key: 'clocks',
        title: 'Saatler',
        groups: [
          g(
            [
              s('clock', 'Canlı saat', { clock: 'live' }, 'Canlı'),
              s('clock', 'Dişli saat', { clock: 'geared', ms: 6300 }, 'Dişli'),
              s('clock', 'Serbest saat', { clock: 'free', h: 2, m: 45, s: 0 }, 'Serbest'),
            ],
            { max: 80 },
          ),
        ],
      },
      {
        key: 'dominoes',
        title: 'Domino Taşları',
        groups: [g(range(0, 6).flatMap((a) => range(0, a).map((b) => s('domino', `Domino ${a}–${b}`, { a, b }))), { max: 56 })],
      },
      {
        key: 'diagrams-and-concept-maps',
        title: 'Diyagramlar ve Kavram Haritaları',
        groups: [
          g(
            [
              s('line', 'Eğri çizgi', { lineStyle: 'curved' }, 'Eğri'),
              s('line', 'Düz çizgi', { lineStyle: 'straight' }, 'Düz'),
              s('line', 'Kırık çizgi', { lineStyle: 'custom' }, 'Kırık'),
              s('text', 'Metin kutusu', { fill: '#dfe189', stroke: '#111111', width: 170, height: 145, shadow: true }, 'Metin kutusu'),
            ],
            { max: 72 },
          ),
        ],
      },
    ],
  },
]
