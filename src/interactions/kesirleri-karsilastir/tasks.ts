import type { Grade } from '../../data/types'

/** Bir kesir ve nasıl yazılacağı */
export interface Num {
  n: number
  d: number
  show?: 'dec' | 'mix'
}

/** Karşılaştırma gerekçeleri (stratejiler) */
export type SKey = 'esPayda' | 'esPay' | 'yarim' | 'kalan' | 'birim' | 'denk' | 'ondalik' | 'tam'

export const S_LABEL: Record<SKey, string> = {
  esPayda: 'Paydalar aynı',
  esPay: 'Paylar aynı',
  yarim: '½ ile karşılaştırdım',
  kalan: '1’e kalan parçaya baktım',
  birim: 'Birim kesirleri düşündüm',
  denk: 'Denk kesir düşündüm',
  ondalik: 'Ondalık ↔ kesir çevirdim',
  tam: 'Tam kısımlara baktım',
}

export interface Task {
  a: Num
  b: Num
  /** Bu çift için işe yarayan gerekçeler */
  valid: SKey[]
  /** Kısa bağlam (somut durum) */
  ctx?: string
}

export const OPTIONS: Record<number, SKey[]> = {
  3: ['esPayda', 'birim', 'yarim'],
  4: ['esPayda', 'esPay', 'birim', 'yarim', 'denk'],
  5: ['esPayda', 'esPay', 'yarim', 'kalan', 'birim', 'denk'],
  6: ['esPayda', 'esPay', 'yarim', 'kalan', 'birim', 'denk', 'ondalik', 'tam'],
}

const f = (n: number, d: number, show?: Num['show']): Num => ({ n, d, show })

export function makeTasks(grade: Grade): Task[] {
  if (grade <= 3)
    return [
      { a: f(1, 2), b: f(1, 4), valid: ['birim', 'yarim'], ctx: 'Aynı büyüklükte iki pizza var: biri 2, öbürü 4 eş dilime bölündü. Hangi dilim daha büyük?' },
      { a: f(2, 4), b: f(3, 4), valid: ['esPayda', 'yarim'], ctx: 'İki eş çikolata da 4 eş parçaya bölündü. Ece 2 parça, Can 3 parça yedi.' },
      { a: f(1, 6), b: f(1, 3), valid: ['birim'], ctx: 'Aynı uzunlukta iki kurdele: biri 6, öbürü 3 eş parçaya kesildi. Hangi parça daha uzun?' },
      { a: f(1, 2), b: f(2, 4), valid: ['yarim', 'birim'], ctx: 'Ali pizzanın yarısını, Ayşe aynı büyüklükteki pizzanın 4 diliminden 2’sini yedi.' },
      { a: f(5, 8), b: f(3, 8), valid: ['esPayda', 'yarim'], ctx: 'İki eş pasta 8’er eş dilime bölündü. Birinden 5, öbüründen 3 dilim alındı.' },
    ]
  if (grade === 4)
    return [
      { a: f(1, 5), b: f(1, 3), valid: ['birim'], ctx: 'Aynı büyüklükteki iki pastadan biri 5 kişiye, öbürü 3 kişiye eşit paylaştırıldı. Kimin dilimi daha büyük?' },
      { a: f(7, 10), b: f(9, 10), valid: ['esPayda'], ctx: 'İki eş yol 10 eş parçaya bölündü. Elif 7 parça, Mert 9 parça yürüdü.' },
      { a: f(2, 3), b: f(4, 6), valid: ['denk', 'birim'], ctx: 'Bir şerit 3, öbürü 6 eş parçaya bölündü. Hangisinde daha çok boyalı yer var?' },
      { a: f(2, 5), b: f(2, 3), valid: ['esPay', 'birim', 'yarim'], ctx: 'İki kişi aynı büyüklükte birer bahçenin 2’şer parçasını suladı; ama bahçelerin parça sayısı farklı.' },
      { a: f(5, 4), b: f(3, 4), valid: ['esPayda'], ctx: 'Çeyrek litrelik bardaklarla süt dolduruldu: bir sürahiye 5, öbürüne 3 bardak.' },
    ]
  if (grade === 5)
    return [
      { a: f(3, 8), b: f(4, 7), valid: ['yarim'], ctx: 'Paydalar da paylar da farklı. Ortak payda bulmadan karar verebilir misin?' },
      { a: f(3, 4), b: f(5, 6), valid: ['kalan'], ctx: 'İkisinde de bütünü tamamlamaya bir parça eksik. Peki eşitler mi?' },
      { a: f(3, 5), b: f(3, 8), valid: ['esPay', 'yarim', 'birim'], ctx: 'İki tarlanın 3’er parçası ekildi; tarlalar aynı büyüklükte, parça sayıları farklı.' },
      { a: f(4, 6), b: f(2, 3), valid: ['denk', 'birim'], ctx: 'Sayıları büyük olan kesir daha mı büyüktür?' },
      { a: f(5, 12), b: f(3, 5), valid: ['yarim'], ctx: 'Bir kesir 12’de, öbürü 5’te. Hangi referans noktası işine yarar?' },
      { a: f(9, 10), b: f(7, 8), valid: ['kalan'], ctx: 'İkisi de 1’e çok yakın. Hangisi daha yakın?' },
    ]
  return [
    { a: f(4, 9), b: f(5, 8), valid: ['yarim'], ctx: 'Ortak payda bulmadan, bir referans noktasıyla karar ver.' },
    { a: f(6, 7), b: f(11, 12), valid: ['kalan'], ctx: 'İkisi de 1’e çok yakın. Hangisi daha yakın?' },
    { a: f(3, 8), b: f(4, 10, 'dec'), valid: ['ondalik', 'yarim'], ctx: 'Biri kesir, öbürü ondalık gösterimle yazılmış.' },
    { a: f(7, 4), b: f(5, 3, 'mix'), valid: ['tam', 'kalan'], ctx: 'Biri bileşik kesir, öbürü tam sayılı kesir.' },
    { a: f(4, 5), b: f(4, 7), valid: ['esPay', 'birim'], ctx: 'Paylar aynı, paydalar farklı.' },
    { a: f(75, 100, 'dec'), b: f(6, 8), valid: ['ondalik', 'denk'], ctx: 'Biri ondalık, öbürü kesir. Aynı sayı olabilirler mi?' },
  ]
}

export const val = (q: Num) => q.n / q.d

/** MathText biçiminde etiket */
export function label(q: Num): string {
  if (q.show === 'dec') return (q.n / q.d).toLocaleString('tr-TR', { maximumFractionDigits: 3 })
  if (q.show === 'mix' && q.n >= q.d) {
    const w = Math.floor(q.n / q.d)
    const r = q.n - w * q.d
    return r ? `[[${w} ${r}/${q.d}]]` : `${w}`
  }
  return `[[${q.n}/${q.d}]]`
}

/** Doğru cevap: 'a' büyük, 'b' büyük ya da 'eq' */
export type Pick = 'a' | 'b' | 'eq'
export function truth(t: Task): Pick {
  const d = val(t.a) - val(t.b)
  return Math.abs(d) < 1e-9 ? 'eq' : d > 0 ? 'a' : 'b'
}

/** Yanlış tahminin ardındaki olası kavram yanılgısı */
export function misconceptionFor(t: Task, pick: Pick): string | null {
  const ok = truth(t)
  if (pick === ok) return null
  const { a, b } = t
  if (pick === 'eq') {
    if (a.d - a.n === b.d - b.n && a.n < a.d) return 'Eksik parça sayısı aynıysa kesirler eşittir sandı (1’e kalan parçaların büyüklüğüne bakmadı)'
    return 'Farklı büyüklükteki kesirleri eşit sandı'
  }
  const P = pick === 'a' ? a : b
  const Q = pick === 'a' ? b : a
  if (ok === 'eq') return 'Denk kesirlerde sayıları büyük olanı daha büyük sandı'
  if (P.n === 1 && Q.n === 1) return 'Payda büyüdükçe kesir büyür sandı (birim kesirler)'
  if (P.n === Q.n) return 'Paylar aynıyken paydası büyük olan kesri büyük sandı'
  if (P.show === 'dec' || Q.show === 'dec') return 'Ondalık gösterimle kesri karşılaştırırken yanıldı'
  if (P.show === 'mix' || Q.show === 'mix') return 'Bileşik kesri tam sayılı kesirle karşılaştırırken yanıldı'
  if (P.d === Q.d) return 'Paydaları eşit kesirlerde payı küçük olanı büyük sandı'
  if (P.n > Q.n || P.d > Q.d) return 'Kesri yalnızca pay ya da paydanın büyüklüğüne bakarak karşılaştırdı'
  return 'Kesirlerin büyüklüğünü yanlış tahmin etti'
}

/** Model yanlış tahmini gösterdiğinde sorulacak soru */
export function revealQuestion(t: Task, pick: Pick): string {
  const ok = truth(t)
  const { a, b } = t
  if (ok === 'eq') return 'Modelde iki şerit tam aynı yerde bitiyor. Sayılar farklı görünüyor ama miktar ne durumda? Şimdi yeniden seç.'
  if (pick === 'eq' && a.d - a.n === b.d - b.n) return 'İkisinde de 1’e bir parça kalıyor ama o parçalar aynı büyüklükte mi? Modelde hangi şerit 1’e daha yakın? Yeniden seç.'
  if (a.n === b.n) return 'İki şerit aynı bütün. Daha çok parçaya bölünen şeridin parçaları büyük mü, küçük mü? Modele bakıp yeniden seç.'
  return 'Modelde hangi şerit daha uzun? Şeritlerin sağ uçlarını karşılaştır ve yeniden seç.'
}

/** Seçilen gerekçe bu çifte uymuyorsa sorulacak nazik soru */
export function wrongStrategyQuestion(k: SKey, t: Task): string {
  const A = label(t.a)
  const B = label(t.b)
  switch (k) {
    case 'esPayda':
      return `Paydalar gerçekten aynı mı? ${A} ve ${B} kesirlerinin alt sayılarına bir daha bak. Hangi yol işe yarar?`
    case 'esPay':
      return `Paylar gerçekten aynı mı? ${A} ve ${B} kesirlerinin üst sayılarına bak. Başka hangi yol işe yarar?`
    case 'yarim':
      return 'İki kesir yarımın farklı taraflarında mı? İkisi de aynı taraftaysa yarım tek başına karar veremez. Hangi yol işe yarar?'
    case 'kalan':
      return 'Bütünü tamamlamaya kalan parçalar kolayca karşılaştırılabiliyor mu? Başka bir yol daha kolay olabilir.'
    case 'birim':
      return 'İki kesir de birim kesir mi ya da aynı sayıda parçadan mı oluşuyor? Hangi yol işe yarar?'
    case 'denk':
      return 'Bir kesri öbürünün parçalarıyla kolayca yeniden adlandırabiliyor musun? Başka bir yol daha kolay olabilir.'
    case 'ondalik':
      return 'Burada ondalık gösterim var mı? Hangi yol işe yarar?'
    case 'tam':
      return 'Kesirlerden biri 1’den büyük mü? Tam kısım yoksa başka bir yol dene.'
  }
}

/** Gerekçe uyduğunda çocuğun düşüncesini sembolle özetleyen cümle */
export function strategyNote(k: SKey, t: Task): string {
  const { a, b } = t
  const A = label(a)
  const B = label(b)
  const side = (q: Num) => (Math.abs(val(q) - 0.5) < 1e-9 ? 'tam yarım' : val(q) < 0.5 ? 'yarımdan küçük' : 'yarımdan büyük')
  const rest = (q: Num) => {
    const w = Math.ceil(val(q) - 1e-9)
    const r = w * q.d - q.n
    return `[[${r}/${q.d}]]`
  }
  switch (k) {
    case 'esPayda':
      return `Parçalar aynı büyüklükte (${a.d} eş parça). Daha çok parça alan daha büyük.`
    case 'esPay':
      return `İkisinde de ${a.n} parça var. Parçası büyük olan (daha az parçaya bölünen) daha büyük.`
    case 'birim':
      return 'Bütün daha çok parçaya bölündükçe her parça küçülür.'
    case 'yarim':
      return `${A} ${side(a)}, ${B} ${side(b)}.`
    case 'kalan':
      return `${A} için ${val(a) > 1 ? 'sonraki tama' : '1’e'} ${rest(a)}, ${B} için ${rest(b)} kalıyor. Kalan parçası küçük olan daha yakın.`
    case 'denk':
      return 'Büyük parçayı eş küçük parçalara bölünce aynı miktar yeni bir adla yazılır.'
    case 'ondalik':
      return a.show === 'dec' || b.show === 'dec' ? 'Ondalık gösterim de bir kesirdir: onda birler, yüzde birler…' : 'Ondalığı kesir olarak düşünebilirsin.'
    case 'tam':
      return `Önce tam kısımlara bak: ${A}${a.show !== 'mix' && a.n > a.d ? ` = [[${Math.floor(a.n / a.d)} ${a.n % a.d}/${a.d}]]` : ''} ve ${B}${b.show !== 'mix' && b.n > b.d ? ` = [[${Math.floor(b.n / b.d)} ${b.n % b.d}/${b.d}]]` : ''}.`
  }
}

/** Model kurarken ipucu (cevabı söylemeden) */
export function buildHint(q: Num): string {
  if (q.show === 'dec') {
    const txt = label(q)
    return q.d === 10
      ? `${txt} onda kaç demek? Bütünü 10 eş parçaya bölersen onda birleri görürsün. (5 parça da işe yarar mı?)`
      : `${txt} yüzde ${q.n} demek. 100 parça çok fazla; aynı miktarı 4, 8 ya da 12 parçayla gösterebilir misin?`
  }
  if (q.n > q.d) return `${label(q)} kaç tane [[1/${q.d}]] eder? Her bütünü ${q.d} eş parçaya böl ve o kadar parça boya.`
  return `${label(q)} için bütünü kaç eş parçaya bölmelisin? Sonra kaç parça boyamalısın?`
}
