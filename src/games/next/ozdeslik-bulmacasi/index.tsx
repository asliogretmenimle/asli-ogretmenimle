import { useRef, useState } from 'react'
import { Trophy } from 'lucide-react'
import type { GameProps } from '../../kit'
import { starsFor } from '../../kit'
import { Scene } from '../../kit2'
import { MathText } from '../../../components/MathText'
import { Header, NextButton } from '../../../interactions/donusum-studyosu/ortak'
import { FactorLevel, FrameLevel, type FactorDef, type FrameDef, type Identity, type Solved } from './levels'
import { CutLevel, SubtractLevel } from './puzzles'
import { AB, AB_KINDS, XS, X_KINDS } from './shapes'

/**
 * Özdeşlik Bulmacası (8. sınıf) — cebir karolarıyla özdeşlikleri geometriyle kurma.
 *  1. (x + 1)²: kare çerçeveyi karolarla doldur → x² + 2x + 1 karolardan türer
 *  2. (x + 3)²: önce “x² + 9 yeter mi?” tahmini; boşluklar parlar
 *  3. (x + 2)(x + 3): dikdörtgen çerçeve
 *  4. x² + 5x + 6: verilen karolarla dikdörtgen kur, kenarları oku (çarpanlara ayırma)
 *  5. (a + b)²: harfli karolar
 *  6. a² − b²: kes ve taşı → (a − b)(a + b)
 *  7. (a − b)²: iki şerit çıkar, iki kez çıkarılan köşeyi geri ekle
 * Puan: her seviye 100; ilk denemede +50; az hamlede +30. Her özdeşlik koleksiyona eklenir.
 */

type Level = FrameDef | FactorDef | { kind: 'cut' | 'sub'; title: string; emoji: string; identity: Identity; par: number }

const ORDER_X = ['x2', 'x', '1']
const ORDER_AB = ['a2', 'ab', 'b2']

const levels: Level[] = [
  {
    kind: 'frame',
    title: '(x + 1)² karesini döşe',
    emoji: '🟦',
    prompt: 'Kenarları (x + 1) olan kare çerçeveyi karolarla boşluksuz ve taşmadan doldur. Hangi karolardan kaç tane gerekecek?',
    syms: XS,
    kinds: X_KINDS,
    frame: { w: [1, 1], h: [1, 1] },
    order: ORDER_X,
    identity: { lhs: '(x + 1)^{2}', rhs: 'x^{2} + 2x + 1' },
    par: 6,
    strategy: ['Önce büyük kareyi yerleştirdim', 'Kenarlara bakarak karoları seçtim', 'Deneyip düzelttim'],
  },
  {
    kind: 'frame',
    title: '(x + 3)²: x² + 9 yeter mi?',
    emoji: '🤔',
    prompt: 'Kenarları (x + 3) olan kareyi döşe. Karoları sayınca alanı kendiliğinden yazılacak.',
    syms: XS,
    kinds: X_KINDS,
    frame: { w: [1, 3], h: [1, 3] },
    order: ORDER_X,
    identity: { lhs: '(x + 3)^{2}', rhs: 'x^{2} + 6x + 9' },
    par: 18,
    predict: {
      q: 'Arkadaşın “(x + 3)² için bir x² ve 9 birim kare yeter” diyor. Sence?',
      options: [
        { id: 'yeter', label: 'Haklı: x² ve 9 birim kare yeter' },
        { id: 'eksik', label: 'Eksik: başka karolar da gerekir' },
      ],
      answer: 'eksik',
      misconception: '(x + 3)² = x² + 9 sanmak',
      after: '(x + 3)² ≠ x^{2} + 9. Aradaki 6x, büyük karenin yanına ve altına gelen 3’er tane x karosudur.',
    },
    squareOnly: { text: 'x² ve birim kareler kondu ama çerçevede hâlâ uzun boşluklar var. Bu boşlukların bir kenarı x, diğeri 1 uzunluğunda. Hangi karo tam oraya sığar? Arkadaşının x² + 9 tahmini doğru muydu?', misconception: '(x + 3)² = x² + 9 sanmak' },
  },
  {
    kind: 'frame',
    title: '(x + 2)(x + 3) dikdörtgeni',
    emoji: '📏',
    prompt: 'Bu kez çerçeve kare değil: yatay kenarı (x + 2), dikey kenarı (x + 3). Döşe ve alanını karolardan oku.',
    syms: XS,
    kinds: X_KINDS,
    frame: { w: [1, 2], h: [1, 3] },
    order: ORDER_X,
    identity: { lhs: '(x + 2)(x + 3)', rhs: 'x^{2} + 5x + 6' },
    par: 14,
    strategy: ['Kenarlardaki 1’leri sayıp x karolarını yerleştirdim', 'Köşedeki birim kareleri 2 × 3 dizdim', 'Önce büyük kareyi yerleştirdim'],
  },
  {
    kind: 'factor',
    title: 'Ters yönde: x² + 5x + 6',
    emoji: '🔁',
    prompt: 'Elinde 1 tane x², 5 tane x ve 6 tane birim karo var. Hepsini kullanarak tek bir dikdörtgen kur; sonra kenarlarını oku.',
    syms: XS,
    kinds: X_KINDS,
    limits: { x2: 1, x: 5, '1': 6 },
    mat: XS[0].value + 4,
    order: ORDER_X,
    identity: { lhs: 'x^{2} + 5x + 6', rhs: '(x + 2)(x + 3)' },
    par: 14,
    options: ['x + 1', 'x + 2', 'x + 3', 'x + 5', 'x + 6', '2x + 3'],
  },
  {
    kind: 'frame',
    title: 'Genel kural: (a + b)²',
    emoji: '🔤',
    prompt: 'Artık uzunluklar harf: a ve b. Kenarları (a + b) olan kareyi a², ab ve b² karolarıyla döşe.',
    syms: AB,
    kinds: AB_KINDS,
    frame: { w: [1, 1], h: [1, 1] },
    order: ORDER_AB,
    identity: { lhs: '(a + b)^{2}', rhs: 'a^{2} + 2ab + b^{2}' },
    par: 6,
  },
  { kind: 'cut', title: 'İki kare farkı: kes ve taşı', emoji: '✂️', identity: { lhs: 'a^{2} − b^{2}', rhs: '(a + b)(a − b)' }, par: 4 },
  { kind: 'sub', title: '(a − b)²: çıkar ve geri ekle', emoji: '🟪', identity: { lhs: '(a − b)^{2}', rhs: 'a^{2} − 2ab + b^{2}' }, par: 4 },
]

export default function OzdeslikBulmacasi({ grade, onFinish }: GameProps) {
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [solved, setSolved] = useState<{ pts: number; first: boolean; fast: boolean } | null>(null)
  const [collection, setCollection] = useState<Identity[]>([])
  const firsts = useRef(0)
  const lv = levels[idx]
  const last = idx === levels.length - 1

  const onSolved = ({ first, moves }: Solved) => {
    const fast = moves <= lv.par
    const pts = 100 + (first ? 50 : 0) + (fast ? 30 : 0)
    if (first) firsts.current++
    setScore((s) => s + pts)
    setSolved({ pts, first, fast })
    setCollection((c) => [...c, lv.identity])
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(null)
      return
    }
    onFinish({
      stars: starsFor(firsts.current / levels.length),
      score,
      summary: `${levels.length} bulmacayı çözdün ve ${collection.length} özdeşliği koleksiyonuna ekledin.`,
      insight: 'Bir dikdörtgenin alanı kenarlarının çarpımıdır; kenarlar cebirsel ifadeyse alan karoların toplamıdır. (a + b)² = a² + 2ab + b² özdeşliğindeki 2ab karenin içindeki iki eş dikdörtgendir; parçaları kesip yeniden dizmek alanı değiştirmediği için a² − b² = (a − b)(a + b) olur.',
    })
  }

  const footer = solved && (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-400/15 px-3 py-2 text-sm font-black text-amber-200 animate-pop">
        <Trophy size={18} />+{solved.pts} puan
        {solved.first && <span className="chip bg-amber-400/25 text-amber-100">ilk denemede +50</span>}
        {solved.fast && <span className="chip bg-amber-400/25 text-amber-100">az hamle +30</span>}
      </div>
      <NextButton last={last} onClick={next} />
    </>
  )

  const common = { onSolved, footer, solved: !!solved }
  return (
    <Scene grade={grade}>
      <Header
        dark
        emoji={lv.emoji}
        kicker="Bulmaca"
        title={lv.title}
        idx={idx}
        total={levels.length}
        right={<span className="chip bg-amber-400/20 px-3 py-1.5 text-sm text-amber-200 ring-1 ring-amber-400/40"><Trophy size={15} />{score}</span>}
      />
      <div key={idx}>
        {lv.kind === 'frame' ? (
          <FrameLevel def={lv} {...common} />
        ) : lv.kind === 'factor' ? (
          <FactorLevel def={lv} {...common} />
        ) : lv.kind === 'cut' ? (
          <CutLevel identity={lv.identity} {...common} />
        ) : (
          <SubtractLevel identity={lv.identity} {...common} />
        )}
      </div>
      {collection.length > 0 && (
        <div className="mt-4 rounded-2xl bg-slate-800/70 p-3 ring-1 ring-slate-600">
          <p className="mb-2 text-xs font-black tracking-wide text-slate-300 uppercase">Özdeşlik koleksiyonun · {collection.length} / {levels.length}</p>
          <div className="flex flex-wrap gap-2">
            {collection.map((c) => (
              <span key={c.lhs} className="rounded-xl bg-violet-500/20 px-3 py-1.5 text-sm font-black text-violet-100 ring-1 ring-violet-400/40"><MathText text={`${c.lhs} = ${c.rhs}`} /></span>
            ))}
          </div>
        </div>
      )}
    </Scene>
  )
}
