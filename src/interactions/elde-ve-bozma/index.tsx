import { useRef, useState, type ReactNode } from 'react'
import type { InteractionProps } from '../types'
import { Scene, StrategyPicker } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { sfx } from '../../lib/feedback'
import { ek } from '../../lib/generators'
import { Card, CheckButton, Header, NextButton, Nudge, Prompt, Split, Stage, useChecks } from '../donusum-studyosu/ortak'
import { AskBox, COLS, Mat, PLACE, Written, canFinish, colName, countsOf, dig, digits, expr, valueOf, type Ask, type Blk, type Cells, type Grab, type MatRow, type Spot } from './tuval'

/**
 * 86. Elde ve Bozma Atölyesi (3–5. sınıf, doğal sayılarla toplama ve çıkarma)
 * Polypad’deki taban blokları tuvalinin dokunmatik karşılığı: Yüzlükler · Onluklar · Birlikler sütunları, her satırda bir sayı.
 * Her şey sürükle-bırakla yapılır; kısa dokunuş yalnızca seçme ve geri alma içindir.
 *  add: sayıları parça kutusundan sürükleyerek kur (isteğe bağlı), sağdan sola blokları toplam satırına sürükle;
 *       10 ya da daha fazla blok biriken sütun “kalabalık” olur, öğrenci 10 bloğu seçip komşu sütuna sürükler
 *       ve 10 blok bir büyük birime birleşir (elde).
 *  sub: eksileni kur (isteğe bağlı), çıkanın bloklarını alınanlar satırına sürükle; yetmeyen sütun için soldaki
 *       bir bloğu hemen sağındaki sütuna sürükle, 10 küçük birime bozulsun. Gereksiz bozma (sonunda bir sütunda
 *       9’dan fazla kalacaksa) engellenir.
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
      why: 'Evet! 10 birlik tam 1 onluk eder. Değer değişmez, yalnızca daha az blokla gösterilir. Şimdi 10 küpe tek tek dokunup seç, sonra onları onluklar sütununa sürükle.',
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
    intro: 'Şimdi çıkarma: önce 252’yi tuvale kur. Sonra 138’i sağdan başlayarak sütun sütun al: blokları alttaki alınanlar satırına sürükle.',
    crisis: {
      q: 'Birlikler bitti ama 8 birlik almamız gerekiyordu; daha 6 tane eksik. Ne yapabiliriz?',
      options: [
        { label: 'Onluklar sütunundan 1 çubuğu bozup 10 birliğe çeviririz', ok: true },
        { label: 'Ters çevirip 8 − 2 = 6 yazarız', nudge: '8 − 2, 8 birlikten 2 birlik almak demek. Bizde ise 2 birlik var ve 8 birlik almamız gerekiyor. Eksik birlikler nereden gelebilir?', mis: 'Basamakta küçükten büyüğü çıkaramayınca büyükten küçüğü çıkardı' },
        { label: 'Bu çıkarma yapılamaz; 2’den 8 çıkmaz', nudge: '252, 138’den büyük; toplamda yeterince blok var. Yalnızca birlikler sütunu yetmiyor. Komşu sütundaki 1 onluk kaç birlik eder?', mis: 'Bir basamakta yetmeyince çıkarmanın imkânsız olduğunu sandı' },
      ],
      why: 'Evet! 1 onluk = 10 birlik. Onluklar sütunundaki bir çubuğu birlikler sütununa sürükle: 10 küpe bozulacak.',
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
        { label: 'Yüzlüklerden doğrudan birlik aldım', nudge: 'Bir yüzlüğü sürükleyip bozduğunda neye dönüştü: birliklere mi, onluklara mı? Hangi sütuna bırakmıştın?' },
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

const blank = (): Cells => PLACE.map(() => [])
const clone = (rs: Cells[]) => rs.map((c) => c.map((x) => [...x]))
const SHAPE = ['küpü', 'çubuğu', 'karesi']

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
  const [carry, setCarry] = useState<(number | null)[]>([])
  const [result, setResult] = useState<(number | null)[]>(() => PLACE.map(() => null))
  const [fb, setFb] = useState<Fb>(null)
  const chk = useChecks()
  /** Hızlı art arda bırakmalarda bir sonraki çizimi beklemeden güncel durum */
  const live = useRef({ rows, e, sel })
  live.current = { rows, e, sel }
  const put = (rs: Cells[]) => {
    live.current.rows = rs
    setRows(rs)
  }
  const pick = (s: Set<number>) => {
    live.current.sel = s
    setSel(s)
  }

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
    pick(new Set())
    if (col >= COLS) {
      setStage('end')
      return
    }
    if (!add && need[col] === 0) return resolve(col, rs)
    live.current.e = col
    setE(col)
  }
  const resolve = (col: number, rs: Cells[]) => {
    setResult((r) => r.map((x, i) => (i === col ? rs[res][col].length : x)))
    if (col === 0 && task.mid) return setAsk('mid')
    goTo(col + 1, rs)
  }

  /* ── kurma: parça kutusundan sürükle ── */
  const buildRow = stage === 'build1' ? 1 : 0
  const target = buildRow === 0 ? a : b
  const rowName = add && buildRow === 1 ? `+ ${b}` : String(a)
  const dropBuild = (g: Grab, to: Spot) => {
    const { rows } = live.current
    if (g.row === -1) {
      if (to === null || to === 'tray') return
      if (to.row !== buildRow) return tell(`Şu an ${target} sayısını kuruyoruz: blokları “${rowName}” satırına bırak.`)
      if (to.e !== g.e) return tell(`Bu bir ${PLACE[g.e].unit} ${SHAPE[g.e]}: ${colName(g.e)} sütununa bırak.`)
      if (rows[to.row][to.e].length >= 15) return tell('Bu sütunda zaten çok blok var. Fazlasını parça kutusuna geri sürükle.')
      const rs = clone(rows)
      rs[to.row][to.e].push(...blocks(1))
      put(rs)
      return setFb(null)
    }
    if (g.row !== buildRow) return
    if (to === null || to === 'tray') {
      const rs = clone(rows)
      rs[g.row][g.e] = rs[g.row][g.e].filter((x) => x.id !== g.id)
      put(rs)
      return setFb(null)
    }
    if (to.e !== g.e) tell(`Bu bir ${PLACE[g.e].unit} ${SHAPE[g.e]}: ${colName(g.e)} sütununda durmalı.`)
  }
  const checkBuild = () => {
    const { rows } = live.current
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

  /* ── toplama: aşağı sürükle, 10’u komşuya sürükle ── */
  const dropAdd = (g: Grab, to: { row: number; e: number }) => {
    const { rows, e, sel } = live.current
    if (g.row < 2) {
      if (to.row === g.row) return
      if (g.e !== e) return tell(`Sağdan başlıyoruz: önce ${colName(e)} sütununu topla.`)
      if (to.row !== 2) return tell('Blokları çizginin altındaki Toplam satırına sürükle.')
      if (to.e !== g.e) return say(`${PLACE[g.e].unit} blokları toplamda da ${colName(g.e)} sütununa gider: aynı basamaktakiler toplanır.`, 'Basamakları hizalamadan topladı')
      const rs = clone(rows)
      const n = rs[g.row][e].length
      rs[2][e].push(...rs[g.row][e])
      rs[g.row][e] = []
      put(rs)
      if (rs[0][e].length || rs[1][e].length) return good(`${n} ${PLACE[e].unit} indi. Diğer sayının ${PLACE[e].unit} bloklarını da indir.`)
      setMerged((m) => m.map((x, i) => (i === e ? true : x)))
      return afterMerge(rs)
    }
    if (to.row !== 2 || to.e === g.e) return
    if (g.e !== e) return tell(`Sağdan başlıyoruz: şimdi ${colName(e)} sütunu.`)
    if (to.e > e + 1) return tell(`Bloklar sütun atlayamaz: 10 ${PLACE[e].unit} 1 ${PLACE[e + 1].unit} eder; komşu sütuna sürükle.`)
    if (to.e < e) return tell('Bloklar sola, bir büyük basamağa taşınır.')
    if (rows[2][e].length < 10) return say(`${PLACE[e].name} sütununda ${rows[2][e].length} blok var; 1 ${PLACE[e + 1].unit} için tam 10 ${PLACE[e].unit} gerekir.`, 'Gruplamayı 10’dan az birimle yaptı')
    if (sel.size !== 10 || !sel.has(g.id)) return tell(`1 ${PLACE[e + 1].unit} yapmak için tam 10 ${PLACE[e].unit} gerekir. Önce 10 bloğa dokunup seç (seçilen: ${sel.size}), sonra seçtiklerinden birini ${colName(e + 1)} sütununa sürükle.`)
    bind(rows, e, sel)
  }
  const afterMerge = (rs: Cells[]) => {
    const { e } = live.current
    const n = rs[2][e].length
    if (n >= 10) {
      if (task.crowd) {
        setFb(null)
        return setAsk('crowd')
      }
      return tell(`${PLACE[e].name} sütununda ${n} blok birikti: kalabalık! 10 tanesine dokunup seç ve ${colName(e + 1)} sütununa sürükle.`)
    }
    sfx.ok()
    good(`${n} ${PLACE[e].unit}: sütun kalabalık değil, kâğıda ${n} yazabiliriz.`)
    resolve(e, rs)
  }
  const bind = (rows: Cells[], e: number, sel: Set<number>) => {
    const rs = clone(rows)
    rs[2][e] = rs[2][e].filter((x) => !sel.has(x.id))
    rs[2][e + 1].push(...blocks(1, 'elde'))
    put(rs)
    pick(new Set())
    setCarry((c) => { const n = [...c]; n[e + 1] = 1; return n })
    sfx.ok()
    const left = rs[2][e].length
    good(`10 ${PLACE[e].unit} birleşti: 1 ${PLACE[e + 1].unit}! Komşu sütuna taşıdığın bu blok, kâğıttaki “elde 1”. ${PLACE[e].name} sütununda ${left} kaldı.`)
    if (left <= 9) resolve(e, rs)
  }

  /* ── çıkarma: alınanlara sürükle, sağa sürükleyip boz ── */
  const remOf = (rs: Cells[], e: number) => need.map((x, c) => (c < e ? 0 : x - rs[1][c].length))
  const dropSub = (g: Grab, to: { row: number; e: number }) => {
    const { rows, e } = live.current
    if (g.row !== 0) return
    if (to.row === 1) {
      if (g.e !== e) return tell(`Sağdan başlıyoruz: şimdi ${colName(e)} sütunundan ${need[e]} ${PLACE[e].unit} alıyoruz.`)
      if (to.e !== g.e) return say(`${PLACE[g.e].unit} blokları alınanlar satırında da ${colName(g.e)} sütununa gider.`, 'Basamakları hizalamadan çıkardı')
      return take(rows, e, g.id)
    }
    if (to.e === g.e) return
    if (to.e === g.e - 1) return breakUp(rows, e, g.e, g.id)
    if (to.e < g.e) return tell(`Bir ${PLACE[g.e].unit} önce ${colName(g.e - 1)} sütununa bozulur: onu hemen sağındaki sütuna sürükle.`)
    tell('Bozmak için bir bloğu hemen sağındaki sütuna sürükle; almak için alınanlar satırına sürükle.')
  }
  const take = (rows: Cells[], col: number, id: number) => {
    const rs = clone(rows)
    const i = rs[0][col].findIndex((x) => x.id === id)
    rs[1][col].push(...rs[0][col].splice(i, 1))
    put(rs)
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
      return tell(`${PLACE[col].name} bitti ama daha ${rem} ${PLACE[col].unit} alman gerek. Soldaki sütundan bir bloğu ${colName(col)} sütununa sürükleyip boz.`)
    }
    setFb(null)
  }
  const breakUp = (rows: Cells[], e: number, col: number, id: number) => {
    const c = countsOf(rows[0])
    const rem = remOf(rows, e)
    const after = c.map((x, i) => (i === col ? x - 1 : i === col - 1 ? x + 10 : x))
    if (!canFinish(after, rem)) {
      if (c[e] >= rem[e]) return say(`Bozmana gerek yok: ${PLACE[e].name} sütununda ${c[e]} blok var, ${rem[e]} tanesini doğrudan alınanlar satırına sürükleyebilirsin.`)
      return say(`Bu bozma fazla gelir: ${PLACE[col - 1].name} sütununda ${after[col - 1]} blok birikir ve işin sonunda bile 9’dan fazlası kalır. Almak istediğin sütunun hemen solundaki sütuna bak.`)
    }
    const rs = clone(rows)
    rs[0][col] = rs[0][col].filter((x) => x.id !== id)
    rs[0][col - 1].push(...blocks(10, 'boz'))
    put(rs)
    sfx.ok()
    const enough = rs[0][e].length >= rem[e]
    good(`1 ${PLACE[col].unit} → 10 ${PLACE[col - 1].unit}. Sayının değeri değişmedi, yalnızca görünüşü değişti.${enough ? ' Şimdi blokları alınanlar satırına sürükle.' : ''}`)
  }

  /* ── sürükle-bırak ve dokunuş ── */
  const building = stage === 'build0' || stage === 'build1'
  const onDrop = (g: Grab, to: Spot) => {
    if (ask) return
    if (building) return dropBuild(g, to)
    if (stage !== 'cols' || to === null || to === 'tray') return
    return add ? dropAdd(g, to) : dropSub(g, to)
  }
  const onTap = (g: Grab) => {
    const { rows, e, sel } = live.current
    if (ask) return
    if (building) return dropBuild(g, g.row === -1 ? { row: buildRow, e: g.e } : 'tray')
    if (stage !== 'cols') return
    if (add && g.row === 2 && g.e === e && rows[2][e].length >= 10) {
      const s = new Set(sel)
      if (s.has(g.id)) s.delete(g.id)
      else if (s.size >= 10) return tell(`10 tane seçtin. Şimdi seçtiklerinden birini ${colName(e + 1)} sütununa sürükle.`)
      else s.add(g.id)
      setFb(null)
      return pick(s)
    }
    tell(add ? 'Blokları sürükleyerek taşı: önce iki sayının bloklarını Toplam satırına indir.' : 'Bloğu sürükle: alınanlar satırına bırakırsan alırsın, hemen sağındaki sütuna bırakırsan bozarsın.')
  }

  /* ── görünüm ── */
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
      if (which === 'mid') goTo(1, live.current.rows)
    }, 1400)
  }

  let step: string
  let prompt: ReactNode
  const intro = !task.build && stage === 'cols' && e === 0 ? <>{task.intro} </> : null
  if (building) {
    step = `Kur: ${target}`
    prompt = <>{stage === 'build0' ? <>{task.intro} </> : null}<b>{target}</b> sayısını kur: parça kutusundan blokları sürükleyip doğru sütuna bırak. Fazla bloğu kutuya geri sürükle.</>
  } else if (stage === 'cols' && add) {
    step = `${PLACE[e].name} sütunu`
    prompt = !merged[e]
      ? <>{intro}İki sayının <b>{PLACE[e].unit}</b> bloklarını sürükleyip çizginin altındaki <b>Toplam</b> satırına, {colName(e)} sütununa bırak.</>
      : crowded
        ? <>{PLACE[e].name} sütununda <b>{rows[2][e].length} {PLACE[e].unit}</b> var. <b>10 tanesine</b> dokunup seç, sonra seçtiklerinden birini <b>{colName(e + 1)}</b> sütununa sürükle. <span className="text-ink-soft">Seçilen: {sel.size} / 10</span></>
        : <>Tuvale ve kâğıda bak.</>
  } else if (stage === 'cols') {
    step = `${PLACE[e].name} sütunu`
    prompt = <>{intro}{b} sayısında <b>{need[e]} {PLACE[e].unit}</b> var: {colName(e)} sütunundan {need[e]} bloğu <b>alınanlar</b> satırına sürükle. Yetmezse soldaki bir bloğu hemen sağındaki sütuna sürükleyip boz. <span className="text-ink-soft">Alınan: {rows[1][e].length} / {need[e]}</span></>
  } else {
    step = 'Sonuç'
    prompt = <>Tuvaldeki sonuç: <b>{expr(rows[res])}</b>. {a} {add ? '+' : '−'} {b} = <b>{answer}</b></>
  }

  return (
    <Split
      work={
        <Stage className="p-3">
          <Mat rows={matRows} sel={sel} palette={building} group={(g) => (sel.has(g.id) ? sel.size : 1)} onDrop={onDrop} onTap={onTap} />
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
