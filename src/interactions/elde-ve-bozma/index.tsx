import { useRef, useState, type ReactNode } from 'react'
import { Hammer, Hand, Link2, MoveDown } from 'lucide-react'
import type { InteractionProps } from '../types'
import { Scene, StrategyPicker } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { Card, CheckButton, GhostButton, Header, NextButton, Nudge, Prompt, Split, Stage, useChecks } from '../donusum-studyosu/ortak'
import { AskBox, COLS, Mat, PLACE, Written, canFinish, countsOf, dig, digits, expr, valueOf, type Ask, type Blk, type Cells, type MatRow } from './tuval'

/**
 * 86. Elde ve Bozma Atölyesi (3–5. sınıf, doğal sayılarla toplama ve çıkarma)
 * Polypad’deki taban blokları tuvalinin dokunmatik karşılığı: Yüzlükler · Onluklar · Birlikler sütunları, her satırda bir sayı.
 *  add: sayıları kur (isteğe bağlı), sağdan sola sütunları toplam satırına indir; 10 ya da daha fazla blok
 *       biriken sütun “kalabalık” olur, öğrenci 10 bloğu seçip bir büyük birime bağlar (elde) ve komşuya taşır.
 *  sub: eksileni kur (isteğe bağlı), ✋ Al ile çıkanın bloklarını alt satıra al; yetmeyen sütun için 🔨 Boz ile
 *       soldaki bir bloğu 10 küçük birime boz. Gereksiz bozma (sonunda bir sütunda 9’dan fazla kalacaksa) engellenir.
 *  err: bir öğrencinin yazılı işlemindeki hatayı bul.
 * Kâğıttaki işlem her adımda tuvalle birlikte dolar: elde 1 ve bozulan rakamın üstü çizilip yenisi yazılır.
 */

type OpTask = { kind: 'add' | 'sub'; a: number; b: number; title: string; build: boolean; intro: string; crowd?: Ask; mid?: Ask; crisis?: Ask; end: Ask; strategy?: string[] }
type ErrTask = { kind: 'err'; op: '+' | '−'; a: number; b: number; wrong: string; who: string; whose: string; title: string; ask: Ask; top: (number | null)[]; right: number[] }
type Task = OpTask | ErrTask

const TASKS: Task[] = [
  {
    kind: 'add', a: 137, b: 145, title: '137 + 145: elde nereden geliyor?', build: true,
    intro: 'Polypad tuvalindeki gibi üç sütun var; her satıra bir sayı kuracağız. Önce 137’yi, sonra 145’i bloklarla kur. Sonra sütunları sağdan başlayarak toplam satırına indir.',
    crowd: {
      q: 'Birlikler sütununda 12 küp birikti. Kâğıtta birler basamağına yalnızca tek bir rakam yazabiliriz. Ne yapmalıyız?',
      options: [
        { label: '10 küpü bir araya getirip 1 onluk yapmalı ve onluklar sütununa taşımalıyız', ok: true },
        { label: 'Birler basamağına 12 yazıp devam etmeliyiz', nudge: 'Birler basamağına 12 yazarsak 1 rakamı onlar basamağına kayar ve sonuç 2712 gibi bir sayıya döner. Oysa 137 + 145 yaklaşık 300 olmalı. 12 küpü daha az blokla nasıl gösterebiliriz?', mis: 'Basamakta 9’u geçen toplamı olduğu gibi yazdı' },
        { label: 'Fazla olan 2 küpü kaldırıp 10 küp bırakmalıyız', nudge: 'Küpleri atarsak toplam azalır; 12 küpün hepsini korumalıyız. 10 küpün yerine hangi tek blok konabilir?', mis: 'Fazla birlikleri yok saydı' },
      ],
      why: 'Evet! 10 birlik tam 1 onluk eder. Değer değişmez, yalnızca daha az blokla gösterilir. Şimdi 10 küpe tek tek dokunup seç.',
    },
    mid: {
      q: 'Birlikler tamamlandı. Kâğıttaki işlemde birler basamağına ne yazarız?',
      options: [
        { label: '2 yazarız; oluşan 1 onluğu onlar basamağının üstüne “elde 1” diye yazarız', ok: true },
        { label: '12 yazarız', nudge: 'Tuvalde birlikler sütununda şimdi kaç küp var? Onluğa dönüşen 10 küp nereye gitti?', mis: 'Basamakta 9’u geçen toplamı olduğu gibi yazdı' },
        { label: '1 yazarız, 2’yi elde tutarız', nudge: 'Birlikler sütununda kalan küpleri say. Komşu sütuna taşınan blok kaç tane? Elde, taşınan bloktur.', mis: 'Eldeyi ve basamağa yazılan rakamı karıştırdı' },
      ],
      why: 'Kâğıttaki küçük “1”, tuvalde onluklar sütununa taşıdığın çubuktur: 1 onluk = 10 birlik.',
    },
    end: {
      q: 'Sonuç 282. Neden işleme birliklerden, yani sağdan başladık?',
      options: [
        { label: 'Birliklerden çıkan elde onluklara eklenir; önce onlukları toplasaydık gelen eldeyle onları yeniden düzeltmemiz gerekirdi', ok: true },
        { label: 'Kural böyle; soldan başlasak da hiçbir şey değişmez', nudge: 'Önce onlukları toplasaydın 3 + 4 = 7 yazardın. Sonra birliklerden 1 onluk gelince o 7’ye ne olurdu?' },
        { label: 'Sayıları sağdan sola okuduğumuz için', nudge: 'Sayıları soldan sağa okuruz: “yüz otuz yedi”. Tuvalde elde hangi yöne taşındı: sağa mı, sola mı?' },
      ],
      why: 'Elde hep sola, bir büyük basamağa taşınır. Sağdan başlayınca her sütun yalnızca bir kez tamamlanır.',
    },
  },
  {
    kind: 'add', a: 268, b: 157, title: '268 + 157: iki kez kalabalık', build: false,
    intro: 'Bu kez bloklar hazır. Sütunları sağdan sola birleştir; kalabalıklaşan her sütunda 10 bloğu seçip bağla.',
    end: {
      q: 'Sonuç 425. Bu işlemde kaç kez gruplama (elde) yaptın?',
      options: [
        { label: 'İki kez: birlikler 15 oldu, onluklar eldeyle birlikte 12 oldu', ok: true },
        { label: 'Bir kez: yalnızca birlikler taştı', nudge: 'Onlukları birleştirince eldeyle birlikte kaç çubuk olmuştu: 6 + 5 + 1 = ? Bu sayı 9’u geçiyor mu?', mis: 'Eldeyi sonraki basamağa eklemeyi unuttu' },
        { label: 'Üç kez: her sütunda bir kez', nudge: 'Yüzlükler sütununda kaç blok oldu: 2 + 1 + 1? 9’u geçti mi?' },
      ],
      why: 'Her sütun 9’u geçtiğinde bir kez bağladık: 10 birlik → 1 onluk, 10 onluk → 1 yüzlük. Kâğıtta iki tane “elde 1” görüyorsun.',
    },
    strategy: ['Önce tahmin ettim (270 + 160 ≈ 430)', 'Blokları birleştirip saydım', 'Kafamda hesapladım, bloklarla kontrol ettim'],
  },
  {
    kind: 'sub', a: 252, b: 138, title: '252 − 138: birlikler yetmezse', build: true,
    intro: 'Şimdi çıkarma: önce 252’yi tuvale kur. Sonra 138’i sağdan başlayarak sütun sütun ✋ Al aracıyla al; aldığın bloklar alttaki satıra iner.',
    crisis: {
      q: 'Birlikler bitti ama 8 birlik almamız gerekiyordu; daha 6 tane eksik. Ne yapabiliriz?',
      options: [
        { label: 'Onluklar sütunundan 1 çubuğu bozup 10 birliğe çeviririz', ok: true },
        { label: 'Ters çevirip 8 − 2 = 6 yazarız', nudge: '8 − 2, 8 birlikten 2 birlik almak demek. Bizde ise 2 birlik var ve 8 birlik almamız gerekiyor. Eksik birlikler nereden gelebilir?', mis: 'Basamakta küçükten büyüğü çıkaramayınca büyükten küçüğü çıkardı' },
        { label: 'Bu çıkarma yapılamaz; 2’den 8 çıkmaz', nudge: '252, 138’den büyük; toplamda yeterince blok var. Yalnızca birlikler sütunu yetmiyor. Komşu sütundaki 1 onluk kaç birlik eder?', mis: 'Bir basamakta yetmeyince çıkarmanın imkânsız olduğunu sandı' },
      ],
      why: 'Evet! 1 onluk = 10 birlik. 🔨 Boz aracı seçildi: onluklar sütunundaki bir çubuğa dokun.',
    },
    end: {
      q: 'Sonuç 114. Bir onluğu bozduktan sonra elimizdeki sayı hâlâ 252 miydi?',
      options: [
        { label: 'Evet: 2 yüzlük + 4 onluk + 12 birlik yine 252 eder; yalnızca görünüşü değişti', ok: true },
        { label: 'Hayır, bir onluk eksildi: 242 oldu', nudge: 'Bozduğun çubuk kayboldu mu, yoksa 10 küpe mi dönüştü? 4 onluk + 12 birlik kaç eder?', mis: 'Bozmanın sayının değerini azalttığını sandı' },
        { label: 'Hayır, 10 birlik eklendi: 262 oldu', nudge: 'O 10 birlik dışarıdan mı geldi? Hangi blok onlara dönüştü?', mis: 'Bozmanın sayının değerini artırdığını sandı' },
      ],
      why: 'Bozma, 1 onluğu aynı değerdeki 10 birliğe çevirir. Kâğıtta 5’in üstünü çizip 4, birliklere de 12 yazmamızın nedeni bu.',
    },
  },
  {
    kind: 'sub', a: 403, b: 167, title: '403 − 167: boş sütun', build: false,
    intro: '403’te hiç onluk yok! 167’yi sağdan başlayarak al. Birlikler yetmediğinde bozacak onluk bulamazsan ne yapacaksın?',
    end: {
      q: 'Sonuç 236. Onluklar sütunu boşken birlik bulmak için ne yaptın?',
      options: [
        { label: 'Önce 1 yüzlüğü 10 onluğa, sonra o onluklardan birini 10 birliğe bozdum', ok: true },
        { label: 'Onluklarda 0 olduğu için 0 − 6 = 0 yazdım', nudge: 'Sıfırdan 6 onluk alınabilir mi? Tuvalde aldığın 6 onluk çubuğu nereden geldi?', mis: 'Sıfırdan çıkarmayı 0 kabul etti' },
        { label: 'Yüzlüklerden doğrudan birlik aldım', nudge: 'Bir yüzlük bozulunca neye dönüştü: birliklere mi, onluklara mı? 🔨 ile ne olduğunu hatırla.' },
      ],
      why: 'Bozdukça değer aynı kaldı: 403 = 3 yüzlük + 9 onluk + 13 birlik. Kâğıtta 4 → 3, 0 → 9 (önce 10 oldu, 1’ini birliklere verdi), 3 → 13.',
    },
    strategy: ['Önce yüzlüğü, sonra onluğu bozdum', 'Kafamda 400 − 167 yapıp 3 ekledim', 'Toplamayla kontrol ettim: 236 + 167 = 403'],
  },
  {
    kind: 'err', op: '+', a: 137, b: 145, wrong: '2712', who: 'Elif', whose: 'Elif’in', title: 'Hata avcısı: Elif’in defteri', top: [null, 1, null], right: [2, 8, 2],
    ask: {
      q: 'Elif 137 + 145 = 2712 buldu. Nerede yanıldı?',
      options: [
        { label: 'Birliklerde 7 + 5 = 12’yi olduğu gibi yazdı; 10 birliği onluğa taşımadı', ok: true },
        { label: 'Yüzlükleri yanlış topladı', nudge: 'Yüzlüklere bak: 1 + 1 = 2 ve Elif de 2 yazmış. Asıl tuhaflık sonucun basamak sayısında: 137 + 145, 1000’i geçebilir mi?' },
        { label: 'Yanlış yok, 2712 doğru', nudge: 'Tahmin et: 137 yaklaşık 140, 145 yaklaşık 150. Toplam 300 civarında olmalı. 2712 mantıklı mı?', mis: 'Sonucun büyüklüğünü tahminle kontrol etmedi' },
      ],
      why: 'Doğrusu 282. Bir basamakta en fazla 9 durabilir; 12 birliğin 10’u 1 onluk olarak onlar basamağına geçer.',
    },
  },
  {
    kind: 'err', op: '−', a: 252, b: 138, wrong: '126', who: 'Can', whose: 'Can’ın', title: 'Hata avcısı: Can’ın defteri', top: [12, 4, null], right: [4, 1, 1],
    ask: {
      q: 'Can 252 − 138 = 126 buldu. Nerede yanıldı?',
      options: [
        { label: 'Birliklerde 2 − 8 yapamayınca 8 − 2 yaptı; onluk bozmadı', ok: true },
        { label: 'Onlukları yanlış çıkardı', nudge: 'Onluklarda 5 − 3 = 2 yazmış; bozma olmasaydı bu doğru olurdu. Birlikler sütununa bak: 2 birlikten 8 birlik nasıl alınmış?' },
        { label: 'Yanlış yok; toplamayla kontrol edince tutuyor', nudge: 'Kontrol et: 126 + 138 = 264. 252 mi çıktı?', mis: 'Sonucu toplamayla kontrol etmedi' },
      ],
      why: 'Doğrusu 114. Can her sütunda büyük rakamdan küçüğü çıkardı. Kontrol: 114 + 138 = 252.',
    },
  },
]

export default function EldeVeBozma({ grade, onFinish }: InteractionProps) {
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const firsts = useRef<boolean[]>([])
  const task = TASKS[idx]
  const last = idx === TASKS.length - 1

  const onSolved = (first: boolean) => {
    if (firsts.current.length <= idx) firsts.current.push(first)
    setSolved(true)
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(false)
      return
    }
    const f = firsts.current.filter(Boolean).length
    onFinish({
      stars: starsFor(f / TASKS.length),
      summary: 'Taban bloklarıyla iki eldeli toplama ve iki bozarak çıkarma yaptın, iki defterdeki hatayı buldun.',
      insight: 'Bir basamakta en fazla 9 bulunabilir. Toplamada 10 birlik 1 onluğa bağlanıp sola taşınır (elde); çıkarmada yetmeyen basamak için soldaki 1 blok 10 küçük birime bozulur. İkisi de sayının değerini değiştirmez, yalnızca gösterimini değiştirir.',
    })
  }
  const footer = solved ? <NextButton last={last} onClick={next} /> : null

  return (
    <Scene grade={grade}>
      <Header emoji="🧱" kicker="Görev" title={task.title} idx={idx} total={TASKS.length} />
      {task.kind === 'err' ? <ErrorTask key={idx} task={task} footer={footer} onSolved={onSolved} /> : <OperationTask key={idx} task={task} footer={footer} onSolved={onSolved} />}
    </Scene>
  )
}

/* ───────────────────────── Toplama / çıkarma tuvali ───────────────────────── */

type Fb = { ok: boolean; text: string; mis?: string } | null
type Phase = 'build0' | 'build1' | 'cols' | 'end' | 'done'

function ActionButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="btn-primary min-h-14 w-full text-lg">{children}</button>
}

const blank = (): Cells => PLACE.map(() => [])
const clone = (rs: Cells[]) => rs.map((c) => c.map((x) => [...x]))

function OperationTask({ task, footer, onSolved }: { task: OpTask; footer: ReactNode; onSolved: (first: boolean) => void }) {
  const { kind, a, b } = task
  const add = kind === 'add'
  const uid = useRef(0)
  const blocks = (n: number, k: Blk['k'] = 'n') => Array.from({ length: n }, () => ({ id: ++uid.current, k }))
  const build = (v: number) => digits(v).map((d) => blocks(d))

  const [rows, setRows] = useState<Cells[]>(() => (add ? [task.build ? blank() : build(a), task.build ? blank() : build(b), blank()] : [task.build ? blank() : build(a), blank()]))
  const [stage, setStage] = useState<Phase>(task.build ? 'build0' : 'cols')
  const [e, setE] = useState(0)
  const [ask, setAsk] = useState<'crowd' | 'mid' | 'crisis' | null>(null)
  const [merged, setMerged] = useState<boolean[]>(() => PLACE.map(() => false))
  const [sel, setSel] = useState<Set<number>>(() => new Set())
  const [tool, setTool] = useState<'al' | 'boz'>('al')
  const [carry, setCarry] = useState<(number | null)[]>([])
  const [result, setResult] = useState<(number | null)[]>(() => PLACE.map(() => null))
  const [fb, setFb] = useState<Fb>(null)
  const chk = useChecks()

  const need = digits(b)
  const res = add ? 2 : 0
  const say = (text: string, mis?: string) => {
    chk.fail()
    setFb({ ok: false, text, mis })
  }
  const tell = (text: string) => setFb({ ok: false, text })
  const good = (text: string) => setFb({ ok: true, text })

  /* ── sütun akışı ── */
  const goTo = (col: number, rs: Cells[]) => {
    setSel(new Set())
    if (col >= COLS) {
      setStage('end')
      return
    }
    if (!add && need[col] === 0) return resolve(col, rs)
    setE(col)
    setTool('al')
  }
  const resolve = (col: number, rs: Cells[]) => {
    setResult((r) => r.map((x, i) => (i === col ? rs[res][col].length : x)))
    if (col === 0 && task.mid) return setAsk('mid')
    goTo(col + 1, rs)
  }

  /* ── kurma ── */
  const buildRow = stage === 'build1' ? 1 : 0
  const target = buildRow === 0 ? a : b
  const addBlock = (ri: number, col: number) => {
    if (ri !== buildRow) return tell(`Şu an ${target} sayısını kuruyoruz: “${add && buildRow === 1 ? `+ ${b}` : a}” satırına ekle.`)
    if (rows[ri][col].length >= 15) return tell('Bu sütunda zaten çok blok var. Fazla bloklara dokunarak geri alabilirsin.')
    const rs = clone(rows)
    rs[ri][col].push(...blocks(1))
    setRows(rs)
    setFb(null)
  }
  const checkBuild = () => {
    const c = countsOf(rows[buildRow])
    const d = digits(target)
    if (c.every((x, i) => x === d[i])) {
      sfx.ok()
      good(`${target} tuvalde: ${expr(rows[buildRow])}.`)
      if (add && buildRow === 0) return setStage('build1')
      setStage('cols')
      return goTo(0, rows)
    }
    if (c.every((x, i) => x === d[COLS - 1 - i]) && d[0] !== d[COLS - 1]) return say(`Tuvaldeki sayı ${expr(rows[buildRow])}. ${target} sayısını soldan okuyunca ilk rakam ${d[COLS - 1]}: bu rakam kaç yüzlük, kaç birlik demek?`, 'Basamakları ters yerleştirdi')
    const m = [...PLACE.keys()].reverse().find((i) => c[i] !== d[i])!
    say(`${ek(target, 'loc')} kaç ${PLACE[m].unit} var? ${PLACE[m].name} sütununda şu an ${c[m]} blok duruyor.`)
  }

  /* ── toplama: birleştir ve bağla ── */
  const mergeCol = () => {
    const rs = clone(rows)
    rs[2][e] = [...rs[2][e], ...rs[0][e], ...rs[1][e]]
    rs[0][e] = []
    rs[1][e] = []
    setRows(rs)
    setMerged((m) => m.map((x, i) => (i === e ? true : x)))
    const n = rs[2][e].length
    if (n >= 10) {
      if (task.crowd) {
        setFb(null)
        return setAsk('crowd')
      }
      return tell(`${PLACE[e].name} sütununda ${n} blok birikti: kalabalık! 10 tanesini seç ve 1 ${PLACE[e + 1]?.unit ?? 'binlik'} olarak bağla.`)
    }
    sfx.ok()
    good(`${n} ${PLACE[e].unit}: sütun kalabalık değil, kâğıda ${n} yazabiliriz.`)
    resolve(e, rs)
  }
  const bind = () => {
    const rs = clone(rows)
    rs[2][e] = rs[2][e].filter((x) => !sel.has(x.id))
    rs[2][e + 1].push(...blocks(1, 'elde'))
    setRows(rs)
    setSel(new Set())
    setCarry((c) => { const n = [...c]; n[e + 1] = 1; return n })
    sfx.ok()
    const left = rs[2][e].length
    good(`10 ${PLACE[e].unit} = 1 ${PLACE[e + 1].unit}! Yeni ${PLACE[e + 1].unit} komşu sütuna taşındı: kâğıttaki “elde 1” bu. ${PLACE[e].name} sütununda ${left} kaldı.`)
    if (left <= 9) resolve(e, rs)
  }

  /* ── çıkarma: al ve boz ── */
  const remOf = (rs: Cells[]) => need.map((x, c) => (c < e ? 0 : x - rs[1][c].length))
  const take = (col: number, id: number) => {
    if (col !== e) return tell(`Sağdan başlıyoruz: şimdi ${PLACE[e].name} sütunundan ${need[e]} ${PLACE[e].unit} alıyoruz.`)
    const rs = clone(rows)
    const i = rs[0][col].findIndex((x) => x.id === id)
    rs[1][col].push(...rs[0][col].splice(i, 1))
    setRows(rs)
    const rem = need[col] - rs[1][col].length
    if (rem === 0) {
      sfx.ok()
      good(`${need[col]} ${PLACE[col].unit} alındı, ${rs[0][col].length} kaldı.`)
      return resolve(col, rs)
    }
    if (rs[0][col].length === 0) {
      if (task.crisis) {
        setFb(null)
        return setAsk('crisis')
      }
      return tell(`${PLACE[col].name} bitti ama daha ${rem} ${PLACE[col].unit} alman gerek. 🔨 Boz aracıyla soldaki sütundan bir blok boz.`)
    }
    setFb(null)
  }
  const breakUp = (col: number, id: number) => {
    if (col === 0) return tell('Birlik küpü en küçük parçadır, daha fazla bozulamaz. Onluklar ya da yüzlükler sütunundan bir bloğa dokun.')
    const c = countsOf(rows[0])
    const rem = remOf(rows)
    const after = c.map((x, i) => (i === col ? x - 1 : i === col - 1 ? x + 10 : x))
    if (!canFinish(after, rem)) {
      if (c[e] >= rem[e]) return say(`Bozmana gerek yok: ${PLACE[e].name} sütununda ${c[e]} blok var, ${rem[e]} tanesini doğrudan alabilirsin. ✋ Al aracına geç.`)
      return say(`Bu bozma fazla gelir: ${PLACE[col - 1].name} sütununda ${after[col - 1]} blok birikir ve işin sonunda bile 9’dan fazlası kalır. Almak istediğin sütunun hemen solundaki sütuna bak.`)
    }
    const rs = clone(rows)
    rs[0][col] = rs[0][col].filter((x) => x.id !== id)
    rs[0][col - 1].push(...blocks(10, 'boz'))
    setRows(rs)
    sfx.ok()
    const enough = rs[0][e].length >= rem[e]
    if (enough) setTool('al')
    good(`1 ${PLACE[col].unit} → 10 ${PLACE[col - 1].unit}. Sayının değeri değişmedi, yalnızca görünüşü değişti.${enough ? ' Şimdi ✋ Al ile devam et.' : ''}`)
  }

  /* ── dokunma ── */
  const onBlock = (ri: number, col: number, id: number) => {
    if (ask) return
    if (stage === 'build0' || stage === 'build1') {
      if (ri !== buildRow) return
      const rs = clone(rows)
      rs[ri][col] = rs[ri][col].filter((x) => x.id !== id)
      setRows(rs)
      return
    }
    if (stage !== 'cols') return
    if (!add) {
      if (ri !== 0) return
      return tool === 'al' ? take(col, id) : breakUp(col, id)
    }
    if (ri !== 2 || col !== e || rows[2][e].length < 10) {
      if (col === e && !merged[e]) return tell(`Önce “${PLACE[e].name.toLowerCase()} toplam satırına indir” düğmesine bas.`)
      if (col !== e) return tell(`Sağdan başlıyoruz: şimdi ${PLACE[e].name} sütunu.`)
      return
    }
    const s = new Set(sel)
    if (s.has(id)) s.delete(id)
    else if (s.size >= 10) return tell('10 tane seçtin. Şimdi “bağla” düğmesine bas.')
    else s.add(id)
    setSel(s)
  }

  /* ── görünüm ── */
  const building = stage === 'build0' || stage === 'build1'
  const active = stage === 'cols' ? e : null
  const matRows: MatRow[] = add
    ? [
        { label: String(a), color: '#2563eb', cells: rows[0], faded: stage === 'build1', active },
        { label: `+ ${b}`, color: '#7c3aed', cells: rows[1], faded: stage === 'build0', active },
        { label: 'Toplam', color: '#0f172a', cells: rows[2], crowd: true, faded: building, active, sep: <span className="mt-1 h-1 rounded-full bg-ink" /> },
      ]
    : [
        { label: `${a} (elimizdeki)`, color: '#2563eb', cells: rows[0], active },
        { label: `− ${b} (alınanlar)`, color: '#db2777', cells: rows[1], faded: building, sep: <span className="mt-1 h-1 rounded-full bg-ink" /> },
      ]
  const top = add || building ? carry : PLACE.map((_, c) => { const now = rows[0][c].length + rows[1][c].length; return now !== dig(a, c) ? now : null })
  const crowded = add && stage === 'cols' && merged[e] && rows[2][e].length >= 10
  const askObj = ask === 'crowd' ? task.crowd : ask === 'mid' ? task.mid : ask === 'crisis' ? task.crisis : null
  const answer = valueOf(rows[res])

  const onAskOk = () => {
    sfx.ok()
    const which = ask
    window.setTimeout(() => {
      setAsk(null)
      if (which === 'mid') goTo(1, rows)
      if (which === 'crisis') setTool('boz')
    }, 1400)
  }

  let step: string
  let prompt: ReactNode
  if (building) {
    step = `Kur: ${target}`
    prompt = <>{task.intro && stage === 'build0' ? <>{task.intro} </> : null}<b>{target}</b> sayısını tuvale kur: her sütunun <b>+ 1</b> düğmesiyle blok ekle, fazla bloğa dokunarak geri al.</>
  } else if (stage === 'cols' && add) {
    step = `${PLACE[e].name} sütunu`
    prompt = !merged[e]
      ? <>{!task.build && e === 0 ? <>{task.intro} </> : null}İki sayının <b>{PLACE[e].unit}</b> bloklarını toplam satırına indir.</>
      : crowded
        ? <>{PLACE[e].name} sütununda <b>{rows[2][e].length} {PLACE[e].unit}</b> var. <b>10 tanesine</b> dokunup seç, sonra 1 {PLACE[e + 1].unit} olarak bağla.</>
        : <>Tuvale ve kâğıda bak.</>
  } else if (stage === 'cols') {
    step = `${PLACE[e].name} sütunu`
    prompt = <>{!task.build && e === 0 ? <>{task.intro} </> : null}{b} sayısında <b>{need[e]} {PLACE[e].unit}</b> var: {PLACE[e].name.toLowerCase()} sütunundan {need[e]} blok al. <span className="text-ink-soft">Alınan: {rows[1][e].length} / {need[e]}</span></>
  } else {
    step = 'Sonuç'
    prompt = <>Tuvaldeki sonuç: <b>{expr(rows[res])}</b>. {a} {add ? '+' : '−'} {b} = <b>{answer}</b></>
  }

  return (
    <Split
      work={
        <Stage className="p-3">
          <Mat rows={matRows} sel={sel} onBlock={onBlock} onAdd={building ? addBlock : undefined} />
        </Stage>
      }
      panel={
        <>
          <Card>
            <p className="mb-1 text-[11px] font-black tracking-wide text-pink-700 uppercase">Kâğıtta</p>
            <div className="flex justify-center"><Written op={add ? '+' : '−'} a={a} b={b} top={top} result={result} /></div>
          </Card>
          <Prompt step={step}>{prompt}</Prompt>
          {askObj && <AskBox key={ask} ask={askObj} chk={chk} onOk={onAskOk} />}
          {!askObj && building && <CheckButton onClick={checkBuild}>Sayıyı kontrol et</CheckButton>}
          {!askObj && stage === 'cols' && add && !merged[e] && (
            <ActionButton onClick={mergeCol}><MoveDown size={20} />{PLACE[e].name} toplam satırına indir</ActionButton>
          )}
          {!askObj && crowded && (
            <ActionButton onClick={bind} disabled={sel.size !== 10}><Link2 size={20} />Seçilen: {sel.size} / 10 · bağla</ActionButton>
          )}
          {!askObj && stage === 'cols' && !add && (
            <div className="grid grid-cols-2 gap-2">
              <GhostButton active={tool === 'al'} onClick={() => { setTool('al'); setFb(null) }}><Hand size={18} />Al</GhostButton>
              <GhostButton active={tool === 'boz'} onClick={() => { setTool('boz'); setFb(null) }}><Hammer size={18} />Boz</GhostButton>
            </div>
          )}
          {fb && (fb.ok ? <Nudge tone="ok" question={fb.text} /> : <Nudge key={chk.tries} question={fb.text} misconception={fb.mis} />)}
          {stage === 'end' && (
            <AskBox ask={task.end} chk={chk} onOk={() => { onSolved(chk.pass()); setStage('done') }} />
          )}
          {stage === 'done' && task.strategy && <StrategyPicker question="Nasıl düşündün?" options={task.strategy} onPick={() => undefined} />}
          {stage === 'done' && footer}
        </>
      }
    />
  )
}

/* ───────────────────────── Hata avcısı ───────────────────────── */

function ErrorTask({ task, footer, onSolved }: { task: ErrTask; footer: ReactNode; onSolved: (first: boolean) => void }) {
  const chk = useChecks()
  const [done, setDone] = useState(false)
  return (
    <Split
      work={
        <Stage className="p-4">
          <div className="flex flex-wrap items-start justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-black text-ink-soft">{task.whose} defteri</p>
              <Written op={task.op} a={task.a} b={task.b} result={task.wrong} wrong />
            </div>
            {done && (
              <div className="flex flex-col items-center gap-2 animate-fade-up">
                <p className="text-sm font-black text-emerald-700">Bloklarla doğrusu</p>
                <Written op={task.op} a={task.a} b={task.b} top={task.top} result={task.right} />
              </div>
            )}
          </div>
        </Stage>
      }
      panel={
        <>
          <Prompt step="Hata avcısı">{task.who} işlemi tuval açmadan, ezberle yaptı. Blokları düşün: her sütunda gerçekte ne olurdu?</Prompt>
          <AskBox ask={task.ask} chk={chk} onOk={() => { onSolved(chk.pass()); setDone(true) }} />
          {done && footer}
        </>
      }
    />
  )
}
