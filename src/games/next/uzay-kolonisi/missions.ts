import type { Grade, ManipulativeConfig, ManipulativeTool } from '../../../data/types'
import type { Mod } from './art'
import type { PlotSet } from './charts'
import type { SimCfg, SimResult } from './sim'
import { ekD, fmt, near } from './util'

export type Diag = { msg: string; mis?: string }
export type Plan = Partial<Record<Mod, number>>

export type Ask =
  | { kind: 'num'; q: string; answer: number; unit?: string; decimal?: boolean; negative?: boolean; diagnose?: (n: number) => Diag | null; ok: string }
  | { kind: 'multi'; q: string; options: { label: string; ok: boolean; why?: string; mis?: string }[]; ok: string }
  | { kind: 'choice'; q: string; options: { label: string; ok: boolean; why: string; mis?: string }[] }

export interface Rule {
  text: string
  test: (p: Plan) => boolean
  diag?: (p: Plan) => Diag | null
}

interface Base {
  title: string
  prompt: string
  hints: string[]
  tool?: ManipulativeTool
  toolConfig?: ManipulativeConfig
  toolTitle?: string
  picker?: string[]
  pickerQ?: string
}

export type Mission = Base &
  (
    | { kind: 'grid'; cols: number; rows: number; palette: Mod[]; targets: Partial<Record<Mod, number>>; diag: (c: Record<Mod, number>) => Diag | null; meter?: { mod: Mod; per: number; target: number; unit: string }; estimate?: { q: string; options: string[]; correct: number }; okText: string; asks: Ask[] }
    | { kind: 'alloc'; units: number; start: number[]; segs: Mod[]; label: (k: number) => string; rules: Rule[]; goal: number; solLabel: (p: Plan) => string; resource: string; asks: (p: Plan) => Ask[] }
    | { kind: 'compare'; total: number; unit: string; bars: { name: string; color: string; den: number; num: number }[]; asks: Ask[] }
    | { kind: 'chart'; names: string[]; data: number[]; max: number; unit: string; okText: string; asks: Ask[] }
    | { kind: 'mean'; values: number[]; step: number; unit: string; yRange: [number, number]; start: number; okText: string; asks: Ask[] }
    | { kind: 'share'; colonies: { name: string; color: string; people: number; water: number }[]; step: number; asks: Ask[] }
    | { kind: 'thermo'; marks: { id: string; label: string; color: string; target: number; desc: string }[]; asks: Ask[] }
    | { kind: 'prop'; sets: PlotSet[]; asks: Ask[] }
    | { kind: 'sim'; units: number; start: number[]; unitValue: number; unit: string; resource: string; segs: Mod[]; label: (k: number) => string; cfg: SimCfg; minPop?: number; goal: number; asks: (p: Plan, r: SimResult) => Ask[] }
  )

const frac12 = (k: number) => (k === 0 ? '0' : `[[${k}/12]]`)
const pct20 = (k: number) => `%${k * 5}`

/** Bir çokluğun kesri için tanı: payda kadar parsel koyma yanılgısı vb. */
function fracDiag(name: string, count: number, need: number, total: number, den: number, f: string): Diag | null {
  if (count === need) return null
  if (count === den) return { msg: `${name} için ${count} parsel ayırdın. ${f} demek ${total} parseli ${den} eş gruba ayırınca bir grup. Bir grupta kaç parsel olur?`, mis: 'Bir çokluğun kesrinde paydayı adet sandı' }
  return { msg: `${name} ${count} parsel. ${total} parseli ${den} eş gruba ayırsan bir grupta kaç parsel olurdu? ${count > need ? 'Biraz fazla olabilir.' : 'Biraz az olabilir.'}` }
}

// ════════════════════════════ 5. SINIF ════════════════════════════

const g5: Mission[] = [
  {
    kind: 'grid',
    title: 'Üs planı',
    prompt: 'Üs alanı 24 parsel. Parsellerin [[1/3]]’ü sera, [[1/4]]’ü yaşam modülü, [[1/6]]’sı güneş paneli olacak. Modülü seç, parsellere dokun ya da parmağını sürükle.',
    cols: 6,
    rows: 4,
    palette: ['sera', 'yasam', 'gunes'],
    targets: { sera: 8, yasam: 6, gunes: 4 },
    diag: (c) => fracDiag('Seralar', c.sera, 8, 24, 3, '[[1/3]]') ?? fracDiag('Yaşam modülleri', c.yasam, 6, 24, 4, '[[1/4]]') ?? fracDiag('Güneş panelleri', c.gunes, 4, 24, 6, '[[1/6]]'),
    okText: 'Plan tuttu! 24’ün [[1/3]]’ü 8, [[1/4]]’ü 6, [[1/6]]’sı 4 parsel.',
    asks: [
      { kind: 'num', q: 'Kaç parsel boş kaldı?', answer: 6, unit: 'parsel', ok: '24 − 8 − 6 − 4 = 6 parsel boş.', diagnose: (n) => (n === 18 ? { msg: '18, dolu parsellerin sayısı. Boş olanları sor kendine: 24’ten kaç parsel kullanıldı?' } : null) },
      {
        kind: 'multi',
        q: 'Boş parseller üssün kaçta kaçı? Doğru olanların hepsini seç.',
        options: [
          { label: '[[6/24]]', ok: true },
          { label: '[[1/6]]', ok: false, why: '[[1/6]] güneş panellerinin payıydı: 4 parsel.' },
          { label: '[[1/4]]', ok: true },
          { label: '[[6/18]]', ok: false, why: 'Bütün, 24 parselin hepsi; 18 yalnızca dolu parseller.', mis: 'Kesirde bütünü yanlış seçti' },
          { label: '[[3/12]]', ok: true },
        ],
        ok: '[[6/24]], [[3/12]] ve [[1/4]] aynı miktarı gösteren denk kesirler: 24 parseli 4 eş gruba ayırınca bir grup boş.',
      },
    ],
    hints: ['24 parseli 3 eş gruba ayırmayı dene: her satırda 6 parsel var.', 'Bir satır 24’ün [[1/4]]’ü. [[1/3]] için kaç parsel gerekir?', '[[1/6]] için 24’ü 6 eş gruba ayır.'],
    tool: 'kesirdogrusu',
    toolTitle: 'Kesir doğrusunda dene',
    picker: ['24’ü eş gruplara böldüm', 'Satırlarla düşündüm (1 satır = 6 parsel)', 'Önce 1/6’yı bulup katladım'],
  },
  {
    kind: 'alloc',
    title: 'Enerji paylaşımı',
    prompt: 'Güneş panelleri bir solda 24 kWh enerji üretiyor; enerjiyi 12 eş bloğa ayırdık. Kurallara uyan bir plan kur. Sonra farklı bir plan daha bul!',
    units: 12,
    start: [3, 3, 3, 3],
    segs: ['sera', 'oksijen', 'yasam', 'lab'],
    label: frac12,
    resource: '24 kWh enerji',
    rules: [
      { text: 'Sera en az [[1/3]] almalı.', test: (p) => (p.sera ?? 0) >= 4, diag: (p) => ((p.sera ?? 0) === 3 ? { msg: 'Seraya 3 blok verdin, yani [[3/12]]. 12 bloğu 3 eş gruba ayırınca bir grupta kaç blok olur?', mis: 'Bir çokluğun kesrinde paydayı adet sandı' } : null) },
      { text: 'Oksijen en az [[1/4]] almalı.', test: (p) => (p.oksijen ?? 0) >= 3 },
      { text: 'Yaşam modülü en az [[1/6]] almalı.', test: (p) => (p.yasam ?? 0) >= 2 },
      { text: 'Laboratuvara da en az 1 blok kalsın.', test: (p) => (p.lab ?? 0) >= 1 },
    ],
    goal: 2,
    solLabel: (p) => `🌱${p.sera} 🫧${p.oksijen} 🏠${p.yasam} 🔬${p.lab}`,
    asks: (p) => [
      {
        kind: 'num',
        q: `Son planında sera [[${p.sera}/12]] aldı. Bu kaç kWh enerji?`,
        answer: (p.sera ?? 0) * 2,
        unit: 'kWh',
        ok: `Bir blok 24 kWh’nin [[1/12]]’si, yani 2 kWh. ${p.sera} blok = ${(p.sera ?? 0) * 2} kWh.`,
        diagnose: (n) => (n === p.sera ? { msg: 'Bu blok sayısı. Bir blok kaç kWh? 24 kWh 12 bloğa paylaştırıldı.', mis: 'Blok sayısı ile enerji miktarını karıştırdı' } : null),
      },
    ],
    hints: ['[[1/3]] için 12 bloğu 3 eş gruba ayır: bir grup kaç blok?', '[[1/4]] ve [[1/6]] için de 12 bloğu eş gruplara ayır.', 'Kuralların hepsi “en az” diyor: kalan blokları istediğin modüle verebilirsin.'],
    tool: 'kesirdogrusu',
    toolTitle: 'Kesir doğrusunda karşılaştır',
    picker: ['Kesirleri 12’lik bloklara çevirdim', 'Önce en küçük payları verdim, kalanı dağıttım', 'Deneyip kuralları kontrol ettim'],
  },
  {
    kind: 'compare',
    title: 'Su paylaşımı',
    prompt: 'İki koloninin deposunda da 40 L su var. Kızıl koloni suyun [[2/5]] kadarını, Mavi koloni [[3/8]] kadarını seraya veriyor. Önce iki modeli boya.',
    total: 40,
    unit: 'L',
    bars: [
      { name: 'Kızıl koloni', color: '#f97316', den: 5, num: 2 },
      { name: 'Mavi koloni', color: '#38bdf8', den: 8, num: 3 },
    ],
    asks: [
      {
        kind: 'choice',
        q: 'Modellere bak: hangi koloni seraya daha çok su veriyor?',
        options: [
          { label: 'Kızıl koloni ([[2/5]])', ok: true, why: 'Evet! Boyalı kısım Kızıl’da biraz daha uzun.' },
          { label: 'Mavi koloni ([[3/8]])', ok: false, why: '3, 2’den büyük ama sekizde birlik parçalar beşte birlik parçalardan küçük. Boyalı uzunlukları yan yana karşılaştır.', mis: 'Kesirleri yalnız paylara bakarak karşılaştırdı' },
          { label: 'İkisi eşit', ok: false, why: 'Boyalı kısımlar tam aynı hizada mı bitiyor? Modele yakından bak; iki parmakla yakınlaştırabilirsin.' },
        ],
      },
      { kind: 'num', q: 'Kanıtla: Kızıl koloni seraya kaç L su veriyor?', answer: 16, unit: 'L', ok: '40’ın [[1/5]]’i 8 L, [[2/5]]’i 16 L.', diagnose: (n) => (n === 8 ? { msg: '8 L, 40’ın [[1/5]]’i. [[2/5]] kaç tane [[1/5]]?' } : n === 2 ? { msg: '2 parça boyadın ama her parça kaç litre?', mis: 'Kesrin payını miktar sandı' } : null) },
      { kind: 'num', q: 'Mavi koloni seraya kaç L su veriyor?', answer: 15, unit: 'L', ok: '40’ın [[1/8]]’i 5 L, [[3/8]]’i 15 L. 16 L > 15 L: Kızıl daha çok veriyor.', diagnose: (n) => (n === 5 ? { msg: '5 L, 40’ın [[1/8]]’i. [[3/8]] için kaç tane gerekir?' } : null) },
    ],
    hints: ['İki model aynı uzunlukta: ikisi de 40 L. Boyalı uzunlukları karşılaştır.', '[[2/5]] ve [[3/8]] [[1/2]]’ye ne kadar yakın?', '40 L’nin [[1/5]]’i kaç litre? [[1/8]]’i kaç litre?'],
    tool: 'kesirdogrusu',
    toolTitle: 'Kesirleri sayı doğrusunda karşılaştır',
    picker: ['Modeldeki uzunlukları karşılaştırdım', 'Litreye çevirdim', '½’ye yakınlığa baktım', 'Ortak paydaya çevirdim'],
  },
  {
    kind: 'chart',
    title: 'Sera üretimi',
    prompt: 'Dört seranın bir soldaki ürün miktarı tabloda. Sütunların tepesindeki turuncu noktaları sürükleyerek (ya da yüksekliğe dokunarak) sütun grafiğini çiz.',
    names: ['Sera 1', 'Sera 2', 'Sera 3', 'Sera 4'],
    data: [6, 9, 3, 6],
    max: 12,
    unit: 'kg',
    okText: 'Grafik tabloyla aynı! Şimdi grafiği yorumlayalım.',
    asks: [
      { kind: 'num', q: 'Dört sera toplam kaç kg ürün verdi?', answer: 24, unit: 'kg', ok: '6 + 9 + 3 + 6 = 24 kg.' },
      {
        kind: 'multi',
        q: 'Hangi seralar toplam ürünün [[1/4]]’ünü tek başına veriyor? Hepsini seç.',
        options: [
          { label: 'Sera 1', ok: true },
          { label: 'Sera 2', ok: false, why: 'Sera 2 9 kg verdi; 24’ün [[1/4]]’ü 6 kg.' },
          { label: 'Sera 3', ok: false, why: 'Sera 3 3 kg verdi; bu 24’ün [[1/8]]’i.' },
          { label: 'Sera 4', ok: true },
        ],
        ok: '24’ün [[1/4]]’ü 6 kg: Sera 1 ve Sera 4.',
      },
      {
        kind: 'multi',
        q: 'Sera 3’ün ürünü, Sera 2’ninkinin kaçta kaçı? Doğru olanların hepsini seç.',
        options: [
          { label: '[[3/9]]', ok: true },
          { label: '[[9/3]]', ok: false, why: '[[9/3]], Sera 2’nin Sera 3’ün kaç katı olduğunu söyler.', mis: 'Kesirde parça ile bütünü yer değiştirdi' },
          { label: '[[1/3]]', ok: true },
          { label: '[[3/24]]', ok: false, why: '[[3/24]], Sera 3’ün toplam ürünün kaçta kaçı olduğu. Burada bütün Sera 2.' },
        ],
        ok: 'Sera 2’nin sütununu 3 eş parçaya bölsen bir parça Sera 3 kadar: [[3/9]] = [[1/3]].',
      },
    ],
    hints: ['Turuncu noktayı yukarı-aşağı sürükle; tablodaki sayıya gelince bırak.', 'Toplamın [[1/4]]’ü için toplamı 4 eş parçaya böl.'],
    tool: 'grafiklab',
    toolTitle: 'Grafik laboratuvarı',
    picker: ['Sütunları karşılaştırdım', 'Tablodaki sayılarla hesapladım', 'Sütunu eş parçalara böldüm'],
  },
  {
    kind: 'sim',
    title: 'Koloni simülasyonu',
    prompt: 'Koloniye her sol 120 L su geliyor, su 12 bloğa ayrıldı. Suyu sera, oksijen ve yaşam modülü arasında paylaştır, sonra 10 sol simüle et. Koloni 10 sol boyunca sağlıklı kalmalı. İki farklı plan bul!',
    units: 12,
    start: [6, 2, 4],
    unitValue: 10,
    unit: 'L',
    resource: '120 L su',
    segs: ['sera', 'oksijen', 'yasam'],
    label: frac12,
    cfg: { units: 12, p0: 8, cap: 12, sols: 10 },
    goal: 2,
    asks: (p, r) => [
      { kind: 'num', q: 'Grafiğe bak: son planında 10. solun sonunda kolonide kaç kişi vardı?', answer: r.rows[r.rows.length - 1].pop, unit: 'kişi', ok: 'Grafiği doğru okudun!' },
      { kind: 'num', q: `Son planında sera [[${p.sera}/12]] aldı. Seraya her sol kaç L su gitti?`, answer: (p.sera ?? 0) * 10, unit: 'L', ok: `120 L’nin [[1/12]]’si 10 L; ${p.sera} blok = ${(p.sera ?? 0) * 10} L.`, diagnose: (n) => (n === p.sera ? { msg: 'Bu blok sayısı. Bir blokta kaç litre su var?', mis: 'Blok sayısı ile su miktarını karıştırdı' } : null) },
    ],
    hints: ['Önce her modüle eşit su vermeyi dene: 12 bloğu 3’e böl.', 'Grafikte hangi çizgi güvenli bölgeden çıkıyor? O modülün payını değiştir.', 'Oksijen çok yükselirse oksijenin payını azalt; yiyecek biterse seranın payını artır.'],
    tool: 'kesirdogrusu',
    picker: ['Bir şeyi değiştirip grafiğe baktım', 'Önce eşit paylaştırıp sonra ayarladım', 'Kişi başına suyu önce hesapladım'],
  },
]

// ════════════════════════════ 6. SINIF ════════════════════════════

function pctDiag(name: string, count: number, need: number, given: string, wrongs: Record<number, Diag>): Diag | null {
  if (count === need) return null
  if (wrongs[count]) return wrongs[count]
  return { msg: `${name} ${count} parsel, yani üssün %${ekD(count * 5, 'poss')}. ${given} için 20 parselin kaçı gerekir? Bir parsel üssün yüzde kaçı?` }
}

const g6: Mission[] = [
  {
    kind: 'grid',
    title: 'Üs planı',
    prompt: 'Üs alanı 20 parsel. Alanın %40’ı sera, 0,25’i yaşam modülü, [[1/5]]’i güneş paneli olacak. Modülü seç, parsellere dokun ya da parmağını sürükle.',
    cols: 5,
    rows: 4,
    palette: ['sera', 'yasam', 'gunes'],
    targets: { sera: 8, yasam: 5, gunes: 4 },
    diag: (c) =>
      pctDiag('Seralar', c.sera, 8, '%40', { 4: { msg: 'Seralar 4 parsel. %40 demek her 100’de 40; 20 parselde kaç olur? Yüzde ızgarasında dene.', mis: 'Yüzdeyi parsel sayısı sandı' } }) ??
      pctDiag('Yaşam modülleri', c.yasam, 5, '0,25', { 2: { msg: '0,25 = [[25/100]] = [[1/4]]. 20 parselin [[1/4]]’ü kaç?', mis: 'Ondalık gösterimi basamaklarına bakarak yorumladı' }, 3: { msg: '0,25 = [[25/100]] = [[1/4]]. 20 parselin [[1/4]]’ü kaç?' } }) ??
      pctDiag('Güneş panelleri', c.gunes, 4, '[[1/5]]', { 5: { msg: '[[1/5]] için 20 parseli 5 eş gruba ayır. Bir grup kaç parsel?', mis: 'Bir çokluğun kesrinde paydayı adet sandı' } }),
    okText: 'Plan tuttu! %40 → 8, 0,25 → 5, [[1/5]] → 4 parsel.',
    asks: [
      { kind: 'num', q: 'Boş kalan alan, üssün yüzde kaçı?', answer: 15, unit: '%', ok: '3 boş parsel; her parsel %5 → %15.', diagnose: (n) => (n === 3 ? { msg: '3 boş parsel var. 20 parsel %100 ise bir parsel yüzde kaç?', mis: 'Parsel sayısını yüzde sandı' } : null) },
      { kind: 'num', q: 'Boş alanı ondalık gösterimle yaz.', answer: 0.15, decimal: true, ok: '%15 = [[15/100]] = 0,15.', diagnose: (n) => (near(n, 1.5) ? { msg: '1,5 bir bütünden büyük! %15 = [[15/100]]: yüzde birler basamağına kadar yaz.', mis: 'Yüzdeyi ondalığa çevirirken basamak hatası yaptı' } : n === 15 ? { msg: '%15 = [[15/100]]. Bunu virgülle nasıl yazarsın?' } : null) },
    ],
    hints: ['20 parsel %100. Bir parsel yüzde kaç?', '0,25’i kesre çevir: [[25/100]]. Daha sade nasıl yazılır?', '[[1/5]] için 20 parseli 5 eş gruba ayır.'],
    tool: 'yuzdeizgarasi',
    toolTitle: 'Yüzde ızgarasında dene',
    picker: ['Hepsini parsele çevirdim', 'Hepsini yüzdeye çevirdim', 'Hepsini kesre çevirdim'],
  },
  {
    kind: 'alloc',
    title: 'Enerji bütçesi',
    prompt: 'Panellerin bir soldaki üretimi 240 kWh. Enerjiyi %5’lik bloklarla paylaştır. Kurallara uyan bir plan kur, sonra farklı bir plan daha bul!',
    units: 20,
    start: [5, 5, 5, 5],
    segs: ['sera', 'yasam', 'oksijen', 'lab'],
    label: pct20,
    resource: '240 kWh enerji',
    rules: [
      { text: 'Sera en az %35 almalı.', test: (p) => (p.sera ?? 0) >= 7 },
      { text: 'Yaşam modülü en az %25 almalı.', test: (p) => (p.yasam ?? 0) >= 5 },
      { text: 'Oksijen en az %20 almalı.', test: (p) => (p.oksijen ?? 0) >= 4 },
      { text: 'Laboratuvar %5 ile %15 arasında almalı.', test: (p) => (p.lab ?? 0) >= 1 && (p.lab ?? 0) <= 3 },
    ],
    goal: 2,
    solLabel: (p) => `🌱%${(p.sera ?? 0) * 5} 🏠%${(p.yasam ?? 0) * 5} 🫧%${(p.oksijen ?? 0) * 5} 🔬%${(p.lab ?? 0) * 5}`,
    asks: (p) => [
      {
        kind: 'num',
        q: `Son planında sera %${(p.sera ?? 0) * 5} aldı. Bu kaç kWh?`,
        answer: (p.sera ?? 0) * 12,
        unit: 'kWh',
        ok: `240’ın %10’u 24, %5’i 12 kWh. %${(p.sera ?? 0) * 5} = ${p.sera} × 12 = ${(p.sera ?? 0) * 12} kWh.`,
        diagnose: (n) => (n === (p.sera ?? 0) * 5 ? { msg: 'Bu yüzde! 240 kWh’nin %10’u kaç? Oradan %5’ini bul.', mis: 'Yüzdeyi miktar sandı' } : null),
      },
      {
        kind: 'num',
        q: `Laboratuvarın payını (%${(p.lab ?? 0) * 5}) ondalık gösterimle yaz.`,
        answer: (p.lab ?? 0) * 0.05,
        decimal: true,
        ok: `%${(p.lab ?? 0) * 5} = [[${(p.lab ?? 0) * 5}/100]] = ${fmt((p.lab ?? 0) * 0.05)}.`,
        diagnose: (n) => (near(n, (p.lab ?? 0) * 0.5) ? { msg: `%${(p.lab ?? 0) * 5}, 100’de ${(p.lab ?? 0) * 5} demek. Yüzde birler basamağı nerede?`, mis: 'Yüzdeyi ondalığa çevirirken basamak hatası yaptı' } : null),
      },
    ],
    hints: ['Her blok %5. %35 kaç blok?', 'Toplam 20 blok, yani %100. Hepsini paylaştırmalısın.', 'Kurallar “en az” ve “arasında” diyor: farklı planlar mümkün.'],
    tool: 'yuzdeizgarasi',
    toolTitle: 'Yüzde ızgarasında dene',
    picker: ['%10’dan yola çıktım (24 kWh)', '%5’i bulup katladım (12 kWh)', 'Kesre çevirdim'],
  },
  {
    kind: 'mean',
    title: 'Su çıkarıcının ortalaması',
    prompt: 'Su çıkarıcı 5 solda bu kadar su üretti. Turuncu çizgiyi sürükle: çizginin üstünde kalan yeşil fazlalar, alttaki boşlukları tam doldurduğunda çizgi ortalamadır. Dengeleyince “Dengeledim” de.',
    values: [12.5, 14, 11.5, 13, 14],
    step: 0.5,
    unit: 'L',
    yRange: [-1.6, 17],
    start: 15,
    okText: 'Dengede! Çizginin üstündeki fazlalar (1 + 1 = 2 L), alttaki boşlukları (0,5 + 1,5 = 2 L) tam dolduruyor.',
    asks: [
      { kind: 'num', q: 'Su çıkarıcı bir solda ortalama kaç L su üretmiş?', answer: 13, unit: 'L', decimal: true, ok: '12,5 + 14 + 11,5 + 13 + 14 = 65; 65 ÷ 5 = 13 L.' },
      {
        kind: 'num',
        q: '6. sol 16 L su üretirse 6 solun ortalaması kaç L olur?',
        answer: 13.5,
        unit: 'L',
        decimal: true,
        ok: '65 + 16 = 81 L; 81 ÷ 6 = 13,5 L. 16 L ortalamanın 3 L üstünde: bu fazlalık 6 sol arasında paylaşılınca ortalama 0,5 L artar.',
        diagnose: (n) => (near(n, 14.5) ? { msg: '(13 + 16) ÷ 2 yaptın galiba. Ama 13, beş solun ortalaması; yeni sol tek bir sol. Toplam kaç litre, kaç sol?', mis: 'Ortalamaları ağırlıksız birleştirdi' } : null),
      },
    ],
    hints: ['Çizginin üstünde kalan yeşil parçaları, altındaki boşluklara taşıdığını düşün.', 'Terazi sola eğikse çizgiyi aşağı, sağa eğikse yukarı götür.'],
    tool: 'grafiklab',
    toolTitle: 'Grafik laboratuvarında dengele',
    picker: ['Fazlaları eksiklere taşıdım (dengeledim)', 'Topladım ve böldüm', 'Tahmin edip çizgiyi ayarladım'],
  },
  {
    kind: 'share',
    title: 'Kişi başına su',
    prompt: 'Kızıl kolonide 8 kişi 20 L suyu, Mavi kolonide 12 kişi 27 L suyu eşit paylaşacak. Her kolonide kişi başına payı ayarla: depo tam boşalınca paylaşım adil olur.',
    colonies: [
      { name: 'Kızıl koloni', color: '#f97316', people: 8, water: 20 },
      { name: 'Mavi koloni', color: '#38bdf8', people: 12, water: 27 },
    ],
    step: 0.25,
    asks: [
      {
        kind: 'choice',
        q: 'Hangi kolonide kişi başına daha çok su düşüyor?',
        options: [
          { label: 'Kızıl koloni', ok: true, why: 'Evet: 20 ÷ 8 = 2,5 L, 27 ÷ 12 = 2,25 L.' },
          { label: 'Mavi koloni', ok: false, why: 'Mavi’nin deposu daha büyük ama kişi sayısı da daha çok. Kişi başına düşen payları karşılaştır.', mis: 'Oranı yalnız toplam miktara bakarak karşılaştırdı' },
          { label: 'İkisi eşit', ok: false, why: 'Kişi başına payları yan yana yaz: 2,5 L ile 2,25 L aynı mı?' },
        ],
      },
      {
        kind: 'num',
        q: 'Mavi kolonide de kişi başına 2,5 L su düşmesi için depoda kaç L su olmalı?',
        answer: 30,
        unit: 'L',
        decimal: true,
        ok: '12 kişi × 2,5 L = 30 L. Kişi : su oranı 8 : 20 = 12 : 30 = 2 : 5.',
        diagnose: (n) => (n === 31 ? { msg: '8 kişiden 12 kişiye 4 kişi arttı diye suya 4 L mi ekledin? Her kişi 2,5 L istiyor.', mis: 'Oranı toplamsal düşündü' } : null),
      },
    ],
    hints: ['Depoda kalan su 0 olunca herkes eşit pay almış olur.', 'Kalan su eksiye düştüyse pay fazla; çok su kaldıysa pay az.', '20 L’yi 8 kişiye paylaştırmak 20 ÷ 8 demek.'],
    tool: 'orantablosu',
    toolTitle: 'Oran tablosunda dene',
    picker: ['Birim oran: 1 kişiye düşeni buldum', 'Ortak kişi sayısına ölçekledim', 'Paylaştırmayı deneyerek buldum'],
  },
  {
    kind: 'sim',
    title: 'Koloni simülasyonu',
    prompt: 'Koloniye her sol 120 L su geliyor. Suyu %5’lik bloklarla paylaştır ve 10 sol simüle et. Koloni sağlıklı kalmalı ve en az 10 kişiye büyümeli. İki farklı plan bul!',
    units: 20,
    start: [10, 5, 5],
    unitValue: 6,
    unit: 'L',
    resource: '120 L su',
    segs: ['sera', 'oksijen', 'yasam'],
    label: pct20,
    cfg: { units: 20, p0: 8, cap: 12, sols: 10 },
    minPop: 10,
    goal: 2,
    asks: (p) => [
      { kind: 'num', q: `Son planında yaşam modülü %${(p.yasam ?? 0) * 5} aldı. Bu her sol kaç L su?`, answer: (p.yasam ?? 0) * 6, unit: 'L', decimal: true, ok: `120 L’nin %5’i 6 L; %${(p.yasam ?? 0) * 5} = ${(p.yasam ?? 0) * 6} L.`, diagnose: (n) => (n === (p.yasam ?? 0) * 5 ? { msg: 'Bu yüzde. 120 L’nin %5’i kaç litre?', mis: 'Yüzdeyi miktar sandı' } : null) },
      { kind: 'num', q: `Oksijenin payını (%${(p.oksijen ?? 0) * 5}) ondalık gösterimle yaz.`, answer: (p.oksijen ?? 0) * 0.05, decimal: true, ok: `%${(p.oksijen ?? 0) * 5} = ${fmt((p.oksijen ?? 0) * 0.05)}.` },
    ],
    hints: ['Önce bir plan dene; grafikte hangi çizginin güvenli bölgeden çıktığına bak.', 'Nüfus büyümüyorsa yaşam modülünün ya da seranın payı az olabilir.', 'Oksijen yükseliyorsa oksijen payını %5 azalt, seraya ver.'],
    tool: 'yuzdeizgarasi',
    picker: ['Bir şeyi değiştirip grafiğe baktım', 'Önce kişi başına suyu hesapladım', 'Önceki planımı küçük adımlarla değiştirdim'],
  },
]

// ════════════════════════════ 7. SINIF ════════════════════════════

const TEMPS = [-55, -62, -70, -58, -81, -66, -49, -60, -73, -64]

const g7: Mission[] = [
  {
    kind: 'grid',
    title: 'Güneş tarlası',
    prompt: 'Testte 4 güneş paneli bir solda 30 kWh üretti. Üsse 75 kWh lazım. Panelleri parsellere yerleştir ve üretimi izle.',
    cols: 6,
    rows: 3,
    palette: ['gunes'],
    targets: { gunes: 10 },
    meter: { mod: 'gunes', per: 7.5, target: 75, unit: 'kWh' },
    estimate: { q: 'Önce tahmin et: 75 kWh için kaç panel gerekir?', options: ['8’den az', '8 ile 12 arası', '12’den çok'], correct: 1 },
    diag: (c) => (c.gunes * 7.5 < 75 ? { msg: `${c.gunes} panel ${fmt(c.gunes * 7.5)} kWh üretiyor; henüz yetmiyor.` } : { msg: `${c.gunes} panel ${fmt(c.gunes * 7.5)} kWh üretiyor; tam 75 kWh olsun.` }),
    okText: '10 panel tam 75 kWh! 4 panel → 30 kWh ise 2 panel → 15 kWh, 10 panel → 75 kWh.',
    asks: [
      { kind: 'num', q: '1 panel bir solda kaç kWh üretir?', answer: 7.5, unit: 'kWh', decimal: true, ok: '30 ÷ 4 = 7,5 kWh. Bu birim oran.', diagnose: (n) => (n === 7 || n === 8 ? { msg: '30’u 4’e paylaştır; sonuç tam sayı olmak zorunda değil.' } : null) },
      { kind: 'num', q: 'Gece için 120 kWh depolanacak. Bunu kaç panel üretir?', answer: 16, unit: 'panel', ok: '120 ÷ 7,5 = 16 panel. Ya da 4 panel → 30 kWh olduğundan 120 kWh için 4 × 4 = 16 panel.', diagnose: (n) => (n === 94 ? { msg: '30’dan 120’ye 90 kWh arttı diye 90 panel mi ekledin? Panel ve kWh aynı oranda artar: 120, 30’un kaç katı?', mis: 'Orantıyı toplamsal düşündü' } : null) },
    ],
    hints: ['4 panel 30 kWh ise 2 panel kaç kWh?', '75 kWh’yi 15 kWh’lik paketlere ayır: kaç paket?', '1 panel 30 ÷ 4 kWh üretir.'],
    tool: 'ciftdogru',
    toolTitle: 'Çift sayı doğrusunda dene',
    picker: ['Birim oran: 1 panel = 7,5 kWh', 'Ölçekleme: 2 panel → 15 kWh', 'Çift sayı doğrusu / tablo'],
  },
  {
    kind: 'thermo',
    title: 'Gece ısıtması',
    prompt: 'Mars’ta gece dışarısı −63 °C. Üssün içi 21 °C tutulacak. Noktaları sayı doğrusunda yerleştir: önce noktayı seç, sonra doğruya dokun ya da noktayı sürükle.',
    marks: [
      { id: 'dis', label: 'Dış', color: '#2563eb', target: -63, desc: 'Gece dışarısı' },
      { id: 'ic', label: 'İç', color: '#ea580c', target: 21, desc: 'Üs içi' },
    ],
    asks: [
      { kind: 'num', q: 'İç ve dış sıcaklık arasındaki fark kaç °C?', answer: 84, unit: '°C', negative: true, ok: '−63’ten 0’a 63 derece, 0’dan 21’e 21 derece: 63 + 21 = 84 °C. Yani 21 − (−63) = 84.', diagnose: (n) => (n === 42 ? { msg: '63 − 21 yaptın galiba. İki sıcaklık sıfırın farklı yanlarında: sayı doğrusunda aradaki uzaklığı iki parça hâlinde düşün.', mis: 'İşaretli sayıların farkını mutlak değerleri çıkararak buldu' } : n === -84 ? { msg: 'Fark bir uzaklık: sayı doğrusunda kaç birim? Uzaklık eksi olur mu?' } : null) },
      { kind: 'num', q: 'Isıtıcı her 1 °C fark için saatte 0,5 kWh harcıyor. Gece saatte kaç kWh harcar?', answer: 42, unit: 'kWh', decimal: true, ok: '84 × 0,5 = 42 kWh: 0,5 ile çarpmak yarısını almak demek.', diagnose: (n) => (n === 168 ? { msg: '0,5 ile çarpmak sayıyı büyütür mü, küçültür mü? 0,5 = [[1/2]].', mis: 'Ondalık sayıyla çarpmanın sonucu hep büyütür sandı' } : null) },
      { kind: 'num', q: 'Gündüz dışarısı −18 °C’ye çıkınca ısıtıcı saatte kaç kWh harcar?', answer: 19.5, unit: 'kWh', decimal: true, ok: '21 − (−18) = 39 °C fark; 39 × 0,5 = 19,5 kWh.', diagnose: (n) => (near(n, 1.5) ? { msg: '21 − 18 = 3 mü aldın? −18, sıfırın altında: fark 21 + 18 olur.', mis: 'Negatif sayıyı çıkarırken işareti gözden kaçırdı' } : null) },
    ],
    hints: ['Sıfır, iki sıcaklığın arasında. Önce −63’ten 0’a, sonra 0’dan 21’e kaç derece?', 'Fark, sayı doğrusundaki uzaklıktır; her zaman pozitiftir.', '0,5 ile çarpmak, yarısını almaktır.'],
    tool: 'numberline',
    toolConfig: { min: -80, max: 30, step: 10 },
    toolTitle: 'Sayı doğrusunda dene',
    picker: ['Sıfıra kadar ve sıfırdan sonra ayrı saydım', 'Uzaklık olarak düşündüm', '21 − (−63) = 21 + 63 yaptım'],
  },
  {
    kind: 'prop',
    title: 'Oksijen serası verisi',
    prompt: 'İki deneme serasının ölçümleri tabloda. Her ölçümü grafikte işaretle: noktanın yerine dokun.',
    sets: [
      { name: 'Sera A', color: '#16a34a', pts: [[2, 30], [4, 60], [6, 90]] },
      { name: 'Sera B', color: '#7c3aed', pts: [[2, 40], [4, 60], [6, 80]] },
    ],
    asks: [
      {
        kind: 'choice',
        q: 'Hangi serada oksijen üretimi alanla doğru orantılı?',
        options: [
          { label: 'Sera A', ok: true, why: 'Evet: her noktada oksijen ÷ alan = 15 ve doğru (0, 0)’dan geçiyor.' },
          { label: 'Sera B', ok: false, why: 'B’de 2 m² → 40 L, 4 m² → 60 L: alan 2 katına çıkınca oksijen 2 katına çıkmadı. Doğrusu (0, 0)’dan geçmiyor.', mis: 'Doğrusal artışı doğru orantı sandı' },
          { label: 'İkisi de', ok: false, why: 'İkisi de düzenli artıyor ama oksijen ÷ alan oranı ikisinde de sabit mi? B için 40 ÷ 2 ile 80 ÷ 6’yı karşılaştır.', mis: 'Doğrusal artışı doğru orantı sandı' },
        ],
      },
      { kind: 'num', q: 'Sera A’da 1 m² alan kaç L oksijen üretir?', answer: 15, unit: 'L', decimal: true, ok: '30 ÷ 2 = 60 ÷ 4 = 90 ÷ 6 = 15 L: orantı sabiti 15.' },
      { kind: 'num', q: 'Sera A 9 m² olsaydı kaç L oksijen üretirdi?', answer: 135, unit: 'L', ok: '9 × 15 = 135 L.', diagnose: (n) => (n === 105 || n === 120 ? { msg: 'Son noktadan sonra her 2 m²’de 30 L arttı. 6’dan 9’a 3 m² var: 1 m² kaç litre?', mis: 'Orantıyı toplamsal düşündü' } : null) },
    ],
    hints: ['Noktanın x değeri alan, y değeri oksijen. (2, 30) için x = 2’ye git, sonra 30’a kadar çık.', 'Doğru orantıda alan 2 katına çıkınca oksijen de 2 katına çıkar.', 'Her nokta için oksijen ÷ alan hesapla.'],
    tool: 'orantablosu',
    toolTitle: 'Oran tablosunda dene',
    picker: ['Oksijen ÷ alan oranlarını karşılaştırdım', 'Grafiğin (0, 0)’dan geçip geçmediğine baktım', 'Alan 2 katına çıkınca oksijen 2 katına çıkıyor mu baktım'],
  },
  {
    kind: 'alloc',
    title: 'Oranlı enerji planı',
    prompt: 'Üssün günlük enerjisi 60 kWh; 3 kWh’lik 20 bloğa ayrıldı. Kurallara uyan bir plan kur, sonra farklı bir plan daha bul!',
    units: 20,
    start: [5, 5, 5, 5],
    segs: ['sera', 'yasam', 'oksijen', 'lab'],
    label: (k) => `${k * 3} kWh`,
    resource: '60 kWh enerji',
    rules: [
      {
        text: 'Sera ve yaşam modülü enerjisi 3 : 2 oranında olmalı.',
        test: (p) => (p.sera ?? 0) > 0 && (p.sera ?? 0) * 2 === (p.yasam ?? 0) * 3,
        diag: (p) => ((p.sera ?? 0) - (p.yasam ?? 0) === 1 && (p.sera ?? 0) > 3 ? { msg: `Sera ${(p.sera ?? 0) * 3} kWh, yaşam ${(p.yasam ?? 0) * 3} kWh. 3 : 2’de sera, yaşamdan 1 fazla değil; yaşamın 1,5 katı olmalı.`, mis: 'Oranı toplamsal düşündü' } : null),
      },
      { text: 'Oksijen en az [[1/5]] almalı.', test: (p) => (p.oksijen ?? 0) >= 4 },
      { text: 'Oksijen en fazla %40 alabilir.', test: (p) => (p.oksijen ?? 0) <= 8 },
      { text: 'Laboratuvar en fazla %25 alabilir.', test: (p) => (p.lab ?? 0) <= 5 },
    ],
    goal: 2,
    solLabel: (p) => `🌱${(p.sera ?? 0) * 3} : 🏠${(p.yasam ?? 0) * 3} · 🫧${(p.oksijen ?? 0) * 3} · 🔬${(p.lab ?? 0) * 3}`,
    asks: () => [
      { kind: 'num', q: 'Sera 27 kWh alsaydı, oranı koruyan yaşam modülü kaç kWh alırdı?', answer: 18, unit: 'kWh', decimal: true, ok: '27 : 18 = 3 : 2 (ikisi de 9’a bölünür). 27, 3’ün 9 katı; 2’nin 9 katı 18.', diagnose: (n) => (n === 26 ? { msg: '3 : 2’de fark 1 diye 27 − 1 mi yaptın? Oran, katlarla korunur: 27, 3’ün kaç katı?', mis: 'Oranı toplamsal düşündü' } : null) },
      { kind: 'num', q: 'Planlarında sera ile yaşam birlikte 5 eş parça gibi düşünülebilir. Bu ikisi toplam 45 kWh alsaydı sera kaç kWh alırdı?', answer: 27, unit: 'kWh', decimal: true, ok: '45 kWh 5 eş parça: bir parça 9 kWh. Sera 3 parça → 27 kWh.', diagnose: (n) => (n === 18 ? { msg: '18 kWh yaşamın payı (2 parça). Sera kaç parça?' } : n === 15 ? { msg: '45’i 3’e böldün; ama toplam 3 + 2 = 5 parça.', mis: 'Parça-bütün oranını parça-parça oranıyla karıştırdı' } : null) },
    ],
    hints: ['3 : 2 oranı: sera 3 blok iken yaşam 2 blok; sera 6 blok iken yaşam kaç?', '[[1/5]] ve %40, 20 bloğun kaçı?', 'Önce sera ile yaşamı oranlı seç, kalanı oksijen ve laboratuvara paylaştır.'],
    tool: 'orantablosu',
    toolTitle: 'Oran tablosunda dene',
    picker: ['3 : 2’yi katlarına genişlettim (6 : 4, 9 : 6)', '5 parçalık şeritle düşündüm', 'Önce oksijeni ayarlayıp kalanı paylaştım'],
  },
  {
    kind: 'mean',
    title: 'Ortalama dış sıcaklık',
    prompt: 'Bir hafta boyunca 6 gecenin dış sıcaklığı ölçüldü. Turuncu çizgiyi sürükle: çizgiyi aşan soğuk parçalar, çizgiye ulaşmayan boşlukları tam doldurunca çizgi ortalamadır.',
    values: [-52, -47.5, -61, -55, -49.5, -65],
    step: 0.5,
    unit: '°C',
    yRange: [-72, 7],
    start: -40,
    okText: 'Dengede! Çizgiyi aşan kısımlar (6 + 10 = 16) boşlukları (3 + 7,5 + 5,5 = 16) tam dolduruyor.',
    asks: [
      { kind: 'num', q: 'Ortalama dış sıcaklık kaç °C?', answer: -55, unit: '°C', decimal: true, negative: true, ok: 'Toplam −330; −330 ÷ 6 = −55 °C.', diagnose: (n) => (n === 55 ? { msg: 'Bütün ölçümler sıfırın altında; ortalama nerede olmalı?', mis: 'Negatif sayıların ortalamasında işareti kaybetti' } : null) },
      { kind: 'num', q: 'Üs içi 20 °C. İç sıcaklık, ortalama dış sıcaklıktan kaç °C yüksek?', answer: 75, unit: '°C', decimal: true, negative: true, ok: '20 − (−55) = 20 + 55 = 75 °C.', diagnose: (n) => (n === 35 ? { msg: '55 − 20 mi yaptın? −55’ten 0’a, sonra 0’dan 20’ye kaç derece?', mis: 'İşaretli sayıların farkını mutlak değerleri çıkararak buldu' } : null) },
    ],
    hints: ['Çizginin altına taşan mavi parçaları, çizgiye ulaşmayan sütunların boşluklarına taşıdığını düşün.', 'Terazi hangi yana eğikse çizgiyi o yana götür.'],
    tool: 'grafiklab',
    toolTitle: 'Grafik laboratuvarında dengele',
    picker: ['Fazlaları eksiklere taşıdım (dengeledim)', 'Topladım ve böldüm', 'Bir referans sıcaklığa (−50) göre farkları topladım'],
  },
  {
    kind: 'sim',
    title: 'Kış simülasyonu',
    prompt: 'Üssün günlük enerjisi 300 kWh, %5’lik bloklara ayrıldı. Mars’ta geceler çok soğuk: ısıtma yetmezse üs içi soğur. 10 sol simüle et: üs içi 15 °C’nin altına düşmesin, oksijen ve yiyecek yetsin, nüfus en az 10 olsun. İki farklı plan bul!',
    units: 20,
    start: [5, 5, 5, 5],
    unitValue: 15,
    unit: 'kWh',
    resource: '300 kWh enerji',
    segs: ['isitma', 'sera', 'oksijen', 'yasam'],
    label: (k) => `${k * 15}`,
    cfg: { units: 20, p0: 8, cap: 12, sols: 10, temps: TEMPS },
    minPop: 10,
    goal: 2,
    asks: (p) => [
      { kind: 'num', q: 'Dış sıcaklık tablosuna bak: en soğuk gece kaçıncı solda?', answer: 5, ok: '5. solda −81 °C: listedeki en küçük sayı.', diagnose: (n) => (n === 7 ? { msg: '7. solda −49 °C; en büyük (en sıcak) değer bu. En soğuk, en küçük sayıdır.', mis: 'Negatif sayılarda büyüklük sıralamasını ters yaptı' } : null) },
      { kind: 'num', q: 'Isıtıcı her 1 °C fark için 1,2 kWh harcıyor. En soğuk gece içeriyi 21 °C tutmak kaç kWh ister?', answer: 122.4, unit: 'kWh', decimal: true, ok: `21 − (−81) = 102 °C; 102 × 1,2 = 122,4 kWh. Senin planında ısıtma ${(p.isitma ?? 0) * 15} kWh alıyor.`, diagnose: (n) => (near(n, 72) ? { msg: '81 − 21 = 60 mı aldın? −81 ile 21 sıfırın farklı yanlarında.', mis: 'İşaretli sayıların farkını mutlak değerleri çıkararak buldu' } : null) },
    ],
    hints: ['Grafikte “Üs içi” sekmesine bak: hangi solda soğudu? O gece dışarısı kaç derece?', 'Isıtmayı artırınca başka bir modülden azaltman gerekir; oksijen ve yiyecek grafiğini de kontrol et.', 'En soğuk gece −81 °C. Isıtma bu gece yetiyorsa diğer geceler de yeter.'],
    tool: 'grafiklab',
    picker: ['En soğuk geceye göre ısıtmayı hesapladım', 'Grafiğe bakıp adım adım düzelttim', 'Önce oksijen ve yiyeceği sabitleyip kalanı ısıtmaya verdim'],
  },
]

export const TEMPS7 = TEMPS

export function missionsFor(grade: Grade): Mission[] {
  return grade <= 5 ? g5 : grade === 6 ? g6 : g7
}

export function insightFor(grade: Grade): string {
  if (grade <= 5) return 'Bir kesir hep bir bütüne göre anlam kazanır: 24 parselin [[1/4]]’ü 6 parsel, 40 L’nin [[2/5]]’i 16 L. Payı büyük olan kesir her zaman büyük değildir; parçaların büyüklüğüne bakarız.'
  if (grade === 6) return 'Yüzde, ondalık ve kesir aynı payın farklı yazılışlarıdır (%25 = 0,25 = [[1/4]]). Ortalama, fazlaların eksikleri doldurduğu denge noktasıdır; kişi başına pay ise oranı karşılaştırmanın adil yoludur.'
  return 'Doğru orantılı iki nicelikte oran sabittir ve grafik (0, 0)’dan geçer; birim oranla her soru çözülür. Sıfırın iki yanındaki sıcaklıklar arasındaki fark bir uzaklıktır: 21 − (−63) = 84.'
}

