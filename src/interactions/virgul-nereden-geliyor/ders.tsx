import { Block, LessonFrame, PLACES, longDiv, quotientText, shareText, snapshots, type Place, type Scene } from './bolme'

/**
 * Mini konu anlatımı senaryosu: a ÷ b paylaştırmasının durumlarından (snapshots) sahneler üretir.
 * focus anlatımın vurgusunu belirler:
 *  - virgul: bölümde virgülün neden ve nereye konduğu
 *  - kir:    1 bütünün 10 onda birliğe dönüşmesi
 *  - sifir:  kalanın yanına yazılan sıfırın “kırmak” demek olduğu
 */
export type Focus = 'virgul' | 'kir' | 'sifir'

const chip = (t: string, c = '#db2777') => <span className="rounded-full px-3 py-1 text-sm font-black text-white" style={{ background: c }}>{t}</span>

/** 1 bütün = 10 onda bir: büyük tablet ve yanında tek tek sayılan şeritler */
function TenthsZoom() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
      <div className="flex flex-col items-center gap-1">
        <Block p={0} u={11} />
        <span className="text-lg font-black text-amber-800">1 bütün</span>
      </div>
      <span className="text-4xl font-black text-ink">=</span>
      <div className="flex items-end gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="flex flex-col items-center gap-1 animate-fade-up" style={{ animationDelay: `${i * 260}ms` }}>
            <Block p={1} u={11} />
            <span className="text-xs font-black text-sky-700 tabular-nums">{i + 1}</span>
          </span>
        ))}
      </div>
      <div className="w-full text-center text-xl font-black text-sky-800">10 onda bir · her biri 1/10 = 0,1</div>
    </div>
  )
}

/** Kalanın yanına sıfır = birim değişimi: 3 bütün → 30 onda bir */
function ZeroMeaning({ n }: { n: number }) {
  return (
    <div className="grid gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div className="flex flex-col items-center gap-2">
        <span className="flex gap-1">{Array.from({ length: Math.min(n, 3) }, (_, i) => <Block key={i} p={0} u={7} />)}</span>
        <span className="text-2xl font-black text-amber-800 tabular-nums">{n} bütün</span>
      </div>
      <span className="text-center text-4xl font-black text-ink">=</span>
      <div className="flex flex-col items-center gap-2">
        <span className="flex gap-[2px]">{Array.from({ length: Math.min(n * 10, 30) }, (_, i) => <Block key={i} p={1} u={7} />)}</span>
        <span className="text-2xl font-black text-sky-700 tabular-nums">{n}<span className="rounded bg-sky-200 px-0.5">0</span> onda bir</span>
      </div>
      <p className="text-center text-lg font-black text-ink sm:col-span-3">Sayı büyümedi: birim 10 kat küçüldü, parça sayısı 10 kat arttı.</p>
    </div>
  )
}

export function lessonScenes(a: number, b: number, focus: Focus): Scene[] {
  const snaps = snapshots(a, b)
  const steps = longDiv(a, b)
  const qt = quotientText(steps)
  const division = focus !== 'kir'
  const out: Scene[] = []
  const frame = (k: number, s: (typeof snaps)[number], extra: Partial<Parameters<typeof LessonFrame>[0]> = {}) => <LessonFrame key={k} a={a} b={b} st={s.st} division={division} {...extra} />
  let zoomed = false

  snaps.forEach((s, k) => {
    const u = PLACES[s.p].unit
    const name = PLACES[s.p].name.toLowerCase()
    switch (s.kind) {
      case 'start':
        out.push({
          say:
            focus === 'virgul'
              ? `${a} çikolatayı ${b} arkadaşa eşit paylaştıracağız. Bu bir bölme işlemi: ${a} ÷ ${b}. Bölüme virgül neden ve nereye konuyor? Birlikte izleyelim.`
              : focus === 'kir'
                ? `${a} çikolatayı ${b} arkadaşa eşit paylaştıracağız: ${a} ÷ ${b}. Bütün çikolatalar yetmezse ne yaparız? Kırıcıyı izle!`
                : `${a} ÷ ${b}. Solda çikolatalarla, sağda yazılı bölmeyle aynı işlemi yapacağız. Kalanın yanına neden sıfır yazdığımızı birlikte görelim.`,
          view: frame(k, s, { banner: chip('Başlıyoruz', '#0f172a') }),
        })
        break
      case 'deal': {
        const first = s.round === 1
        const lastR = s.round === s.rounds
        out.push({
          say: first ? `Herkese birer ${u} veriyoruz.${s.rounds! > 1 ? ' Yetiyorsa bir tur daha…' : ''}` : lastR ? `Herkeste ${s.round} ${u} oldu.` : '',
          view: frame(k, s, { banner: chip(`${s.round}. tur`, PLACES[s.p].color) }),
          dur: first || lastR ? undefined : 750,
        })
        break
      }
      case 'stuck':
        out.push({
          say:
            s.p === 0 && s.st.each[0] === 0
              ? `Ama ${s.n} bütün ${b} kişiye birer birer yetmiyor. Kimse bütün bir çikolata alamaz!`
              : `Masada ${s.n} ${u} kaldı. ${b} kişiye birer tane daha veremeyiz; verirsek kimi alır, kimi alamaz.`,
          view: frame(k, s, { banner: chip('Yetmiyor!', '#dc2626') }),
        })
        break
      case 'digit': {
        const v = s.st.digits[s.p]!
        const st = steps[s.p]
        const done = s.st.pool[s.p] === 0
        let say =
          s.p === 0 && v === 0
            ? 'Bir kişinin payında hiç bütün yok. Bu yüzden bölümün birler basamağına 0 yazıyoruz.'
            : s.p === 0
              ? `Herkes ${v} bütün aldı. Bölümün birler basamağına ${v} yazıyoruz.`
              : `Herkes ${v} ${u} aldı: bölümün ${name} basamağına ${v} yazıyoruz.`
        if (division && st.q > 0) say += ` Yazılı bölmede: ${b} × ${v} = ${st.used}, kalan ${st.rem}.`
        if (done) say += ' Masada hiç parça kalmadı.'
        out.push({ say, view: frame(k, s, { hot: { board: s.p, div: { k: s.p, kind: 'q' } }, banner: chip('Bölüme yaz', '#0f172a') }) })
        break
      }
      case 'comma':
        out.push({
          say:
            focus === 'virgul'
              ? `Dikkat! Bütünler burada bitti. Bundan sonra herkese vereceğimiz parçalar bütünden küçük olacak. Bu sınırı bölümde virgülle gösteriyoruz: ${steps[0].q} virgül…`
              : focus === 'kir'
                ? 'Bütünler bitti, bölüme virgül koyuyoruz. Virgülden sonrası bütünden küçük parçalar.'
                : 'Bütünler bitti: bölüme virgül koyuyoruz. Virgülden sonra onda birleri yazacağız.',
          view: frame(k, s, { hot: { board: 'comma', div: { k: 0, kind: 'comma' } }, banner: chip('Virgül') }),
          dur: 5200,
        })
        if (focus === 'virgul')
          out.push({
            say: 'Virgülün solunda bir kişinin aldığı bütün çikolatalar, sağında ise bütünden küçük parçalar yazılır. Virgül, bütünle parçanın sınır çizgisi!',
            view: frame(k, s, { hot: { board: 'comma' }, banner: chip('Sol: bütün · Sağ: parça') }),
          })
        break
      case 'break': {
        const n = s.n!
        const next = PLACES[(s.p + 1) as Place].unit
        out.push({
          say:
            focus === 'sifir'
              ? `Kalan ${n} ${u}. Bunları 10 eş küçük parçaya kırıyoruz: ${n} ${u} = ${n * 10} ${next}. Yazılı bölmede bu kırmayı kalanın yanına sıfır yazarak gösteriyoruz: ${n} → ${n * 10}.`
              : focus === 'kir'
                ? `Kalan ${n} ${u} kırıcıya giriyor… Her ${u} 10 eş parçaya ayrıldı: ${n} ${u} = ${n * 10} ${next}! Çikolata azalmadı, sadece parçalar küçüldü.`
                : `Kalan ${n} ${u} 10’ar eş parçaya kırılıyor: ${n * 10} ${next} oldu. Şimdi bunları paylaştırabiliriz.`,
          view: frame(k, s, { burst: { p: s.p as 0 | 1, n, key: k }, hot: { div: { k: s.p, kind: 'zero' } }, banner: chip('🔨 Kır', '#334155') }),
          dur: 5600,
        })
        if (focus === 'kir' && !zoomed && s.p === 0) {
          zoomed = true
          out.push({ say: 'Sayalım: 1, 2, 3 … 10. Bir bütünün içinde tam 10 tane onda bir var. Her biri bütünün onda biri, yani 0,1.', view: <TenthsZoom key="zoom" />, dur: 6000 })
        }
        if (focus === 'sifir' && s.p === 0)
          out.push({ say: `Sıfır keyfi bir kural değil: ${n} bütün ile ${n * 10} onda bir aynı miktar. Sıfır, “artık onda birleri sayıyorum” demek!`, view: <ZeroMeaning key="zm" n={n} />, dur: 6000 })
        break
      }
      case 'end': {
        const share = shareText(s.st.each)
        out.push({
          say: `Bitti! ${a} ÷ ${b} = ${qt}. Her arkadaşa ${share} düştü. Yani ${a}/${b} = ${qt}.`,
          view: frame(k, s, { banner: chip(`${a} ÷ ${b} = ${qt}`, '#059669') }),
          dur: 5200,
        })
        out.push({
          say:
            focus === 'virgul'
              ? `Özetle: bütünler paylaştırılınca birler basamağı yazılır ve virgül konur. Virgülden sonraki her basamak bir öncekinden 10 kat küçük parçaları gösterir.`
              : focus === 'kir'
                ? 'Özetle: paylaştıramadığın bütünü 10 onda bire, onda biri de 10 yüzde bire kırabilirsin. Miktar değişmez, parçalar küçülür.'
                : 'Özetle: kalanın yanına yazılan her sıfır, kalan parçaları 10 kat küçük parçalara kırmak demektir. Sayı büyümüyor, birim küçülüyor.',
          view: frame(k, s, { banner: chip('Özet', '#059669') }),
          dur: 6000,
        })
        break
      }
    }
  })
  return out
}
