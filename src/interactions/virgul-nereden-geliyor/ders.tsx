import { Bar, Kids, LongDivision, Piece, ShareBox, SplitBar, Stuff, Table, amount, longDiv, quotientText, snapshots, type Scene, type SimState } from './bolme'

/**
 * Adım adım mini ders senaryosu: a ÷ b paylaştırmasından kısa, tek cümlelik adımlar üretir.
 * focus anlatımın vurgusunu belirler:
 *  - virgul: virgülün neden ve nereye konduğu
 *  - kir:    1 bütünün 10 parçaya (onda bire) bölünmesi
 *  - sifir:  yazılı bölmede kalanın yanına yazılan sıfır
 */
export type Focus = 'virgul' | 'kir' | 'sifir'

function Pic({ a, b, st, splitting, hot, division, zeroHot, warn }: { a: number; b: number; st: SimState; splitting?: number; hot?: number | 'comma'; division?: boolean; zeroHot?: boolean; warn?: boolean }) {
  const steps = longDiv(a, b)
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-3">
        <Table st={st} splitting={splitting} warn={warn} />
        <Kids b={b} each={st.each} />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <ShareBox digits={st.digits} comma={st.comma} places={steps.length} hot={hot} />
        {division && <LongDivision a={a} b={b} steps={steps} show={{ digits: st.digits, comma: st.comma, broke: st.broke }} zeroHot={zeroHot} />}
      </div>
    </div>
  )
}

/** 1 bütün = 10 parça: tablet ve yanında tek tek sayılan parçaları */
function TenPieces() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="flex flex-col items-center gap-1"><Bar s={20} /><span className="text-lg font-black text-amber-900">1 bütün</span></span>
        <span className="text-4xl font-black">=</span>
        <span className="flex flex-col items-center gap-1"><SplitBar s={20} count /><span className="text-lg font-black text-sky-800">10 parça</span></span>
      </div>
      <p className="text-center text-xl font-black text-sky-900">Her parça bütünün onda biri: <span className="rounded-lg bg-white px-2">0,1</span></p>
    </div>
  )
}

/** Virgülün anlamı: solu bütünler, sağı parçalar */
function CommaMeaning({ w, t }: { w: number; t: number | null }) {
  return (
    <div className="rounded-2xl bg-pink-50 p-4 ring-1 ring-pink-200">
      <div className="flex items-end justify-center gap-3">
        <span className="flex w-36 flex-col items-center gap-1 rounded-2xl bg-amber-100 p-3">
          <span className="text-7xl leading-none font-black text-amber-800">{w}</span>
          <span className="text-center text-base font-black text-amber-900">bütün çikolata</span>
        </span>
        <span className="pb-10 text-8xl leading-none font-black text-pink-600 animate-pop">,</span>
        <span className="flex w-36 flex-col items-center gap-1 rounded-2xl bg-sky-100 p-3">
          <span className="text-7xl leading-none font-black text-sky-700">{t ?? '?'}</span>
          <span className="text-center text-base font-black text-sky-900">parça (onda bir)</span>
        </span>
      </div>
      <p className="mt-3 text-center text-xl font-black text-pink-800">← bütünler · virgül · parçalar →</p>
    </div>
  )
}

/** Kalanın yanına sıfır: n bütün = n0 parça */
function ZeroMeaning({ n }: { n: number }) {
  return (
    <div className="grid gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div className="flex flex-col items-center gap-2">
        <Stuff w={n} s={12} />
        <span className="text-3xl font-black text-amber-900 tabular-nums">{n} bütün</span>
      </div>
      <span className="text-center text-5xl font-black">=</span>
      <div className="flex flex-col items-center gap-2">
        <Stuff t={n * 10} s={12} />
        <span className="text-3xl font-black text-sky-800 tabular-nums">{n}<span className="rounded-lg bg-sky-300 px-1">0</span> parça</span>
      </div>
      <p className="text-center text-xl font-black text-ink sm:col-span-3">Kalan {n} → yanına 0 yazınca {n}0. Çikolata çoğalmadı, sadece parçalara bölündü.</p>
    </div>
  )
}

/** Küçük bir resimle birlikte “ipucu” kutusu */
const PieceNote = () => <span className="inline-flex items-center gap-1.5 align-middle"><Piece s={10} /> = onda bir</span>

export function lessonScenes(a: number, b: number, focus: Focus): Scene[] {
  const snaps = snapshots(a, b)
  const steps = longDiv(a, b)
  const qt = quotientText(steps)
  const division = focus === 'sifir'
  const out: Scene[] = []
  const pic = (st: SimState, extra: Partial<Parameters<typeof Pic>[0]> = {}) => <Pic a={a} b={b} st={st} division={division} {...extra} />
  let w = 0

  for (const s of snaps) {
    switch (s.kind) {
      case 'start':
        out.push({ say: `${a} çikolatamız var. Bunları ${b} arkadaşa eşit paylaştıracağız.`, note: `Bu bir bölme işlemi: ${a} ÷ ${b}`, view: pic(s.st) })
        break
      case 'deal':
        if (s.round === 1) out.push({ say: s.p === 0 ? 'Herkese 1’er çikolata veriyoruz.' : 'Şimdi parçaları dağıtıyoruz. Herkese 1’er parça.', view: pic(s.st) })
        else if (s.round === s.rounds) out.push({ say: s.p === 0 ? `Yettiği kadar vermeye devam ediyoruz. Herkesin ${s.round} çikolatası oldu.` : `Parçalar bitene kadar devam ediyoruz. Herkesin ${s.round} parçası oldu.`, view: pic(s.st) })
        break
      case 'stuck':
        out.push({
          say: s.p === 0 && s.st.each[0] === 0 ? `${s.n} çikolata ${b} arkadaşa yetmiyor. Kimse bütün çikolata alamaz!` : `${s.n} çikolata kaldı. Ama ${b} arkadaşa yetmez!`,
          note: 'Birine verirsek ötekiler alamaz. Bu adil olmaz.',
          view: pic(s.st, { warn: true }),
        })
        break
      case 'digit': {
        const v = s.st.digits[s.p]!
        const st = steps[s.p]
        if (s.p === 0) w = v
        out.push({
          say: s.p === 0 ? (v === 0 ? 'Kimse bütün çikolata almadı. “Bütün” kutusuna 0 yazıyoruz.' : `Herkes ${v} bütün çikolata aldı. “Bütün” kutusuna ${v} yazıyoruz.`) : `Herkes ${v} parça aldı. “Onda bir” kutusuna ${v} yazıyoruz.`,
          note: division && st.q > 0 ? `Yazılı bölmede: ${b} × ${v} = ${st.used}, kalan ${st.rem}` : undefined,
          view: pic(s.st, { hot: s.p }),
        })
        break
      }
      case 'comma':
        out.push({ say: 'Bütün çikolatalar bitti. Şimdi virgül koyuyoruz.', note: 'Virgülün solu: bütünler · Virgülün sağı: parçalar', view: pic(s.st, { hot: 'comma' }) })
        if (focus === 'virgul') out.push({ say: 'Virgül bir sınır çizgisi gibidir.', note: 'Virgülden sonra gelen sayı, bütün değil PARÇA sayısıdır.', view: <CommaMeaning w={w} t={null} /> })
        break
      case 'break': {
        const n = s.n!
        out.push({
          say: n === 1 ? 'Kalan 1 çikolatayı 10 eşit parçaya bölüyoruz.' : `Kalan ${n} çikolatanın her birini 10 eşit parçaya bölüyoruz.`,
          note: n === 1 ? '1 bütün = 10 parça' : `${n} bütün = ${n * 10} parça`,
          view: pic(s.st, { splitting: n, zeroHot: division }),
        })
        if (focus === 'kir') out.push({ say: 'Hadi sayalım! Bir bütün çikolatanın içinde tam 10 parça var.', note: <>Her parçaya “onda bir” denir: <PieceNote /></>, view: <TenPieces /> })
        if (focus === 'sifir') out.push({ say: 'Yazılı bölmede bunu kalanın yanına 0 yazarak gösteriyoruz.', note: `${n} bütün = ${n}0 parça`, view: <ZeroMeaning n={n} /> })
        break
      }
      case 'end':
        out.push({ say: `Herkes ${amount(s.st.each)} aldı.`, note: `${a} ÷ ${b} = ${qt}`, view: pic(s.st) })
        if (focus === 'virgul') out.push({ say: `Virgülün solunda bütünler, sağında parçalar var.`, note: `${qt} = ${s.st.each[0]} bütün ve ${s.st.each[1]} onda bir`, view: <CommaMeaning w={s.st.each[0]} t={s.st.each[1]} /> })
        if (focus === 'kir') out.push({ say: 'Bütün çikolata yetmeyince 10 eşit parçaya böleriz.', note: 'Bölünce çikolata azalmaz, sadece parçalar küçülür.', view: <TenPieces /> })
        if (focus === 'sifir') out.push({ say: 'Kalanın yanına yazılan 0, çikolatayı 10 parçaya bölmek demektir.', note: 'Sayı büyüdü ama parçalar küçüldü; çikolata aynı.', view: <ZeroMeaning n={steps[0].rem} /> })
        break
    }
  }
  return out
}
