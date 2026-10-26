import type { ReactNode } from 'react'
import type { Grade } from '../../data/types'
import { fmtN, fmtQ, q, qAdd, qEq, qSub, qNum } from '../islem-zinciri/kit'
import { ek } from '../../lib/generators'
import { type Ans, type Sandbox, MiniCells, MiniRect, canon, connected, eqText, gcd, lcm, lineEq, perimeter, sg } from './boards'

/**
 * 76. Açık Uçlu Problem Laboratuvarı — görev bankası.
 * Her görev: çok sayıda doğru cevabı olan bir problem + cevabı denetleyen check()
 * + galeride ortaya çıkacak örüntüye dair bir “Örüntü avı” sorusu.
 */

export type Good = { ok: true; key: string; label: string; sort: number; measure?: number; mini?: ReactNode }
export type Bad = { ok: false; q: string; misc?: string }
export type Verdict = Good | Bad

export interface PatternOpt {
  t: string
  good?: boolean
  why: string
  misc?: string
}

export interface Task {
  title: string
  emoji: string
  prompt: string
  box: Sandbox
  check: (a: Ans) => Verdict
  /** Örüntü avına geçmeden önce bulunacak en az cevap sayısı */
  goal: number
  /** Galeride gösterilen ölçü (ör. Çevre) */
  measure?: string
  /** Aynı cevap ikinci kez eklenince */
  dupe: string
  pattern: { q: string; options: PatternOpt[] }
  strategies?: string[]
  hints: string[]
  insight: string
}

const bad = (qq: string, misc?: string): Bad => ({ ok: false, q: qq, misc })
const sorted = (v: number[]) => [...v].sort((a, b) => a - b)

// ───────────────────────── ortak denetleyiciler ─────────────────────────

function cellsArea(A: number) {
  return (a: Ans): Verdict => {
    if (a.k !== 'cells') return bad('')
    const n = a.pts.length
    if (!n) return bad('Önce kareleri boya: dokun ya da parmağını sürükle.')
    if (!connected(a.pts)) return bad('Bazı kareler ötekilere kenarından değmiyor. Tek parça bir şekil olsun: ayrı kalan kareyi nereye taşırsın?')
    if (n < A) return bad(`Alanı ${n} çıktı; ${A - n} kare daha nereye eklenebilir?`)
    if (n > A) return bad(`Alanı ${n} çıktı; hangi ${n - A} kareyi çıkarırsan şekil yine tek parça kalır?`)
    const p = perimeter(a.pts)
    return { ok: true, key: canon(a.pts), label: `Çevre ${p}`, sort: p, measure: p, mini: <MiniCells pts={a.pts} /> }
  }
}

function cellsPerim(P: number) {
  return (a: Ans): Verdict => {
    if (a.k !== 'cells') return bad('')
    if (!a.pts.length) return bad('Önce kareleri boya: dokun ya da parmağını sürükle.')
    if (!connected(a.pts)) return bad('Bazı kareler ötekilere kenarından değmiyor. Tek parça bir şekil olsun: ayrı kalan kareyi nereye taşırsın?')
    const p = perimeter(a.pts)
    if (p < P) return bad(`Çevresi ${p} birim çıktı; ${ek(P, 'dat')} ${P - p} birim eksik. Şekli bir yöne uzatırsan çevre ne olur?`)
    if (p > P) return bad(`Çevresi ${p} birim çıktı; ${ek(P, 'abl')} ${p - P} birim fazla. Kareleri birbirine daha çok değecek biçimde toplarsan ne olur?`)
    return { ok: true, key: canon(a.pts), label: `Alan ${a.pts.length}`, sort: a.pts.length, measure: a.pts.length, mini: <MiniCells pts={a.pts} color="#0d9488" /> }
  }
}

function rectArea(A: number) {
  return (a: Ans): Verdict => {
    if (a.k !== 'rect') return bad('')
    const { w, h } = a
    if (w * h !== A) return bad(`${w} × ${h} = ${w * h}. Alanın ${A} olması için ${w * h < A ? 'kenarlardan birini uzatabilir misin' : 'kenarlardan birini kısaltabilir misin'}? ${w} ile hangi sayıyı çarparsan ${A} olur?`)
    const [s, l] = sorted([w, h])
    return { ok: true, key: `${s}x${l}`, label: `${l} × ${s}`, sort: 2 * (w + h), measure: 2 * (w + h), mini: <MiniRect w={l} h={s} /> }
  }
}

function rectPerim(P: number) {
  return (a: Ans): Verdict => {
    if (a.k !== 'rect') return bad('')
    const { w, h } = a
    const p = 2 * (w + h)
    if (p !== P) return bad(`Çevre: ${w} + ${h} + ${w} + ${h} = ${p}. ${P} olması için genişlik ile yükseklik toplamı kaç olmalı?`)
    const [s, l] = sorted([w, h])
    return { ok: true, key: `${s}x${l}`, label: `${l} × ${s}`, sort: w * h, measure: w * h, mini: <MiniRect w={l} h={s} /> }
  }
}

// ───────────────────────── görevler ─────────────────────────

const sum20: Task = {
  title: 'Toplamı 20',
  emoji: '🔢',
  prompt: 'Toplamı 20 olan iki sayı bul. Kaç farklı çift bulabilirsin?',
  box: { k: 'nums', init: [12, 3], min: 0, max: 20, labels: ['1. sayı', '2. sayı'], view: { t: 'tape', target: 20 } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const [x, y] = a.v
    const s = x + y
    if (s < 20) return bad(`${x} + ${y} = ${s}. ${ek(20, 'dat')} ulaşmak için ${20 - s} daha gerek. Hangi sayıyı büyütürsün?`)
    if (s > 20) return bad(`${x} + ${y} = ${s}. ${ek(20, 'acc')} ${s - 20} geçtin. Hangisini küçültürsün?`)
    const [p, r] = sorted([x, y])
    return { ok: true, key: `${p}+${r}`, label: `${p} + ${r}`, sort: p }
  },
  goal: 4,
  dupe: 'Bu çift galeride var: sayıların yerini değiştirmek yeni bir çift yapmaz (6 + 14 ile 14 + 6 aynı). Başka bir çift dene!',
  pattern: {
    q: 'Galerin küçükten büyüğe dizildi. Küçük sayı 1 artınca büyük sayıya ne oluyor?',
    options: [
      { t: '1 azalıyor', good: true, why: 'Evet! Birinden 1 alıp ötekine verince toplam hep 20 kalır: 9 + 11, 10 + 10…' },
      { t: 'O da 1 artıyor', why: 'Dene: 8 + 12 = 20. İkisini de 1 artırırsan 9 + 13 kaç olur? Hâlâ 20 mi?', misc: 'Toplam sabitken iki toplananın da arttığını düşündü' },
      { t: 'Hiç değişmiyor', why: 'Galerine bak: küçük sayı değişince büyük sayı da değişiyor mu?' },
    ],
  },
  strategies: ['Birinden 1 alıp ötekine verdim', '10 + 10’dan başladım', 'Rastgele denedim'],
  hints: ['20’yi iki parçaya ayır: biri 10 ise öteki kaç?', 'Bir sayıyı 1 artırırsan toplam 20 kalsın diye ötekine ne yapmalısın?'],
  insight: 'Toplam sabitse biri ne kadar artarsa öteki o kadar azalır.',
}

const sum20x3: Task = {
  title: 'Üç sayıyla 20',
  emoji: '🧮',
  prompt: 'Toplamı 20 olan üç sayı bul. Her seferinde farklı bir üçlü olsun.',
  box: { k: 'nums', init: [5, 5, 5], min: 0, max: 20, labels: ['1. sayı', '2. sayı', '3. sayı'], view: { t: 'tape', target: 20 } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const s = a.v.reduce((p, x) => p + x, 0)
    if (s !== 20) return bad(`${a.v.join(' + ')} = ${s}. ${s < 20 ? `${20 - s} daha nereye eklenebilir?` : `${s - 20} fazlayı hangi sayıdan alırsın?`}`)
    const v = sorted(a.v)
    return { ok: true, key: v.join('+'), label: v.join(' + '), sort: v[0] }
  },
  goal: 3,
  dupe: 'Bu üçlü galeride var: sırayı değiştirmek yeni bir üçlü yapmaz. Sayıları değiştir!',
  pattern: {
    q: 'Galerindeki bir üçlüde bir sayıyı 2 artırırsan, toplam yine 20 olsun diye ne yapmalısın?',
    options: [
      { t: 'Öteki sayılardan toplam 2 azaltmalıyım', good: true, why: 'Evet! 2 fazlalığı başka sayılardan alırsan toplam 20’de kalır: 5 + 7 + 8 → 7 + 5 + 8.' },
      { t: 'Başka bir sayıyı da 2 artırmalıyım', why: 'O zaman toplama 2 + 2 = 4 eklenir. Toplam 20 kalır mı, 24 mü olur?', misc: 'Toplamı korumak için bir toplananı artırınca diğerini de artırdı' },
      { t: 'Hiçbir şey; toplam değişmez', why: 'Tezgâhta dene: bir sayıyı 2 artır ve şeride bak. Toplam aynı mı kaldı?' },
    ],
  },
  strategies: ['Birinden alıp ötekine verdim', 'Önce iki sayıyı seçip üçüncüyü buldum', '10’luklar kullandım'],
  hints: ['İlk iki sayıyı seç; üçüncü sayı 20’ye ne kadar kaldıysa o olsun.', 'Galerindeki bir üçlüden başla, birinden 1 alıp ötekine ver.'],
  insight: 'Toplam sabitken bir parçayı büyütürsen başka parçalar o kadar küçülmeli.',
}

const area6: Task = {
  title: 'Alanı 6 olan şekiller',
  emoji: '🟪',
  prompt: 'Kareli tezgâhta alanı 6 birimkare olan şekiller yap. Kareler kenarlarıyla birbirine değsin. Kaç farklı şekil bulabilirsin?',
  box: { k: 'cells', cols: 6, rows: 5 },
  check: cellsArea(6),
  goal: 3,
  measure: 'Çevre',
  dupe: 'Bu şekil galeride var: döndürünce ya da ters çevirince aynı oluyor. Farklı bir şekil dene!',
  pattern: {
    q: 'Galerin çevreye göre dizildi. Çevresi en uzun olan şekil nasıl bir şekil?',
    options: [
      { t: 'Tek sıra hâlinde uzanan, ince uzun şekil', good: true, why: 'Evet! Kareler tek sıra olunca birbirine daha az değer, dışarıya bakan kenar çoğalır: 6 karelik şeridin çevresi 14.' },
      { t: 'Toplu, kareye benzeyen şekil', why: 'Toplu şekilde kareler birbirine çok değer. Değen kenarlar dışarıda mı kalır, içeride mi? Galerindeki çevrelere bak.' },
      { t: 'Hepsinin çevresi aynı, çünkü alanları aynı', why: 'Galerindeki çevre sayılarına bak: hepsi aynı mı? Alan aynı olsa da kareler farklı dizilince dış kenar sayısı değişir.', misc: 'Alanı eşit şekillerin çevresinin de eşit olduğunu düşündü' },
    ],
  },
  strategies: ['Bir kareyi başka yere taşıdım', 'Önce dikdörtgen yaptım, sonra değiştirdim', 'Rastgele denedim'],
  hints: ['6 kare boya; hepsi kenarlarıyla birbirine değsin.', '2 sıra × 3 kare bir şekil. Bir kareyi köşeye taşırsan yeni bir şekil olur mu?'],
  insight: 'Alanları aynı olan şekillerin çevreleri farklı olabilir; kareler ne kadar toplu olursa çevre o kadar kısalır.',
}

const area10: Task = {
  ...area6,
  title: 'Alanı 10 olan şekiller',
  prompt: 'Kareli tezgâhta alanı 10 birimkare olan şekiller yap. Kareler kenarlarıyla birbirine değsin.',
  box: { k: 'cells', cols: 7, rows: 5 },
  check: cellsArea(10),
  pattern: {
    q: 'Galerin çevreye göre dizildi. Çevresi en kısa olan şekiller nasıl şekiller?',
    options: [
      { t: 'Toplu, dikdörtgene ya da kareye yakın şekiller', good: true, why: 'Evet! Kareler birbirine çok değince değen kenarlar içeride kalır, dış kenar azalır. 2 × 5 dikdörtgenin çevresi 14.' },
      { t: 'İnce uzun şekiller', why: 'Galerindeki en uzun şekle bak: çevresi en kısa mı, en uzun mu?' },
      { t: 'Hepsinin çevresi aynı, çünkü alanları aynı', why: 'Galerindeki çevre sayılarına bak: hepsi aynı mı?', misc: 'Alanı eşit şekillerin çevresinin de eşit olduğunu düşündü' },
    ],
  },
  hints: ['10 kare boya; hepsi kenarlarıyla birbirine değsin.', '2 sıra × 5 kare bir şekil. Bir kareyi yerinden alıp başka yere koy.'],
}

const area16: Task = {
  ...area6,
  title: 'Alanı 16 olan şekiller',
  prompt: 'Alanı 16 birimkare olan şekiller yap (parmağını sürükleyerek hızlı boyayabilirsin). Kaç farklı şekil bulabilirsin?',
  box: { k: 'cells', cols: 8, rows: 6 },
  check: cellsArea(16),
  pattern: {
    q: 'Galerin çevreye göre dizildi. Alanı 16 olan şekiller arasında çevresi en kısa olan hangisi?',
    options: [
      { t: '4 × 4 kare: kareler birbirine en çok değiyor', good: true, why: 'Evet! Alan sabitken şekil kareye yaklaştıkça çevre kısalır: 4 × 4 karenin çevresi 16, 2 × 8’in 20, 1 × 16’nın 34.' },
      { t: 'En uzun, en ince şekil', why: 'İnce uzun şeklin çevresini galerinde bul: en kısa mı, en uzun mu?' },
      { t: 'Hepsinin çevresi aynı', why: 'Galerindeki çevre sayılarını karşılaştır.', misc: 'Alanı eşit şekillerin çevresinin de eşit olduğunu düşündü' },
    ],
  },
  hints: ['Parmağını sürükleyerek bir sıra boya, sonra say.', '4 sıra × 4 kare de 16, 2 sıra × 8 kare de. Çevreleri aynı mı?'],
  insight: 'Alan sabitken şekil kareye yaklaştıkça çevre kısalır; ince uzun şekillerin çevresi uzundur.',
}

const perim12: Task = {
  title: 'Çevresi 12 olan şekiller',
  emoji: '🧵',
  prompt: 'Kareli tezgâhta çevresi 12 birim olan şekiller yap. Şekillerin alanları da aynı mı olacak?',
  box: { k: 'cells', cols: 6, rows: 5 },
  check: cellsPerim(12),
  goal: 3,
  measure: 'Alan',
  dupe: 'Bu şekil galeride var: döndürünce ya da ters çevirince aynı oluyor. Farklı bir şekil dene!',
  pattern: {
    q: 'Galerin alana göre dizildi. Çevresi 12 olan şekillerin alanları için ne söylersin?',
    options: [
      { t: 'Alanları farklı olabilir: aynı çevre, farklı alan', good: true, why: 'Evet! Çevre aynı kalsa da içeride kalan kare sayısı değişebilir: 3 × 3 karenin alanı 9, 1 × 5 şeridin alanı 5.' },
      { t: 'En büyük alan, kareye en çok benzeyen şekilde', good: true, why: 'Evet! 3 × 3 karenin çevresi 12, alanı 9: çevresi 12 olan şekillerin en büyük alanlısı.' },
      { t: 'Hepsinin alanı aynıdır', why: 'Galerindeki alan sayılarına bak: hepsi aynı mı?', misc: 'Çevresi eşit şekillerin alanının da eşit olduğunu düşündü' },
    ],
  },
  strategies: ['Önce dikdörtgen yaptım', 'Köşeden kare ekleyip çıkardım', 'Kenarları tek tek saydım'],
  hints: ['3 × 3 bir kare yap: çevresi kaç?', 'Bir köşedeki kareyi çıkarınca çevre değişir mi? Say ve gör!'],
  insight: 'Çevreleri aynı olan şekillerin alanları farklı olabilir; kareye yakın şekil daha çok alan kaplar.',
}

const beads12: Task = {
  title: '12 boncuk',
  emoji: '📿',
  prompt: '12 boncuğu eşit sıralara diz: her sırada aynı sayıda boncuk olsun. Kaç farklı dizilim bulabilirsin?',
  box: { k: 'rect', maxW: 12, maxH: 6, beads: true, init: [2, 2] },
  check: (a) => {
    if (a.k !== 'rect') return bad('')
    const { w, h } = a
    if (w * h !== 12) return bad(`${h} sıra × ${w} boncuk = ${w * h} boncuk. ${w * h < 12 ? `${12 - w * h} boncuk dışarıda kaldı.` : `${w * h - 12} boncuk fazla.`} Sıra sayısını ya da bir sıradaki boncuğu değiştir.`)
    const [s, l] = sorted([w, h])
    return { ok: true, key: `${s}x${l}`, label: `${h} sıra × ${w}`, sort: s, mini: <MiniRect w={w} h={h} beads /> }
  },
  goal: 3,
  dupe: 'Bu dizilim galeride var: döndürünce sıralar sütun olur, boncuk sayısı değişmez! Başka bir sıra sayısı dene.',
  pattern: {
    q: 'Neden 12 boncuğu 5’erli sıralara dizemiyoruz?',
    options: [
      { t: '5’er 5’er sayınca 10’dan sonra 2 boncuk artıyor', good: true, why: 'Evet! 5, 10… 15 olmadan 12’de kalıyoruz: 2 boncuk eşit dağılmıyor.' },
      { t: '5 tek sayı olduğu için', why: 'Ama 3 de tek sayı ve 4 sıra × 3 boncuk = 12 oluyor! Başka bir neden olmalı.', misc: 'Eşit gruplara ayırmayı tek-çift olmaya bağladı' },
      { t: '5 çok büyük olduğu için', why: '6’şar boncuklu sıralar oluyor; 6 da 5’ten büyük. Demek ki neden büyüklük değil.' },
    ],
  },
  strategies: ['Ritmik saydım', 'Bir dizilimi döndürdüm', 'Boncukları ikiye böldüm'],
  hints: ['2’şer 2’şer say: 12’ye ulaşınca kaç sıra oldu?', '3’er 3’er, 4’er 4’er saymayı da dene.'],
  insight: '12 boncuk 1, 2, 3, 4, 6 ve 12’şerli eşit sıralara dizilebilir; döndürülen dizilimde boncuk sayısı değişmez.',
}

const rect24: Task = {
  title: 'Alanı 24 olan dikdörtgenler',
  emoji: '📐',
  prompt: 'Alanı 24 birimkare olan dikdörtgenler kur (köşeyi sürükle ya da düğmeleri kullan). Hepsinin çevresi aynı mı?',
  box: { k: 'rect', maxW: 24, maxH: 8, init: [3, 3] },
  check: rectArea(24),
  goal: 3,
  measure: 'Çevre',
  dupe: 'Bu dikdörtgen galeride var: 4 × 6 ile 6 × 4 döndürülmüş aynı dikdörtgen. Başka kenar uzunlukları dene!',
  pattern: {
    q: 'Galerin çevreye göre dizildi. Ne fark ediyorsun?',
    options: [
      { t: 'İnce uzun olan (24 × 1) en uzun çevreli', good: true, why: 'Evet! 24 × 1’in çevresi 50 birim; kenarlar birbirinden uzaklaştıkça çevre uzuyor.' },
      { t: 'Kenarları birbirine yakın olan (6 × 4) en kısa çevreli', good: true, why: 'Evet! 6 × 4’ün çevresi 20 birim; kenarlar birbirine yaklaştıkça çevre kısalıyor.' },
      { t: 'Alanları aynı olduğu için çevreleri de aynı', why: 'Galerindeki çevre sayılarına bak. 24 × 1 ile 6 × 4’ün çevresi aynı mı?', misc: 'Alanı eşit dikdörtgenlerin çevresinin de eşit olduğunu düşündü' },
    ],
  },
  strategies: ['24’ün çarpanlarını düşündüm', 'Bir kenarı 2 katına çıkarıp ötekini yarıya indirdim', 'Kareleri tek tek saydım'],
  hints: ['Hangi iki sayının çarpımı 24? 1 × 24’ten başla.', '2 × 12 bir dikdörtgen. Bir kenarı 2 katına çıkarıp ötekini yarıya indirirsen?'],
  insight: 'Alan sabitken dikdörtgenin kenarları birbirine yaklaştıkça çevre kısalır, uzaklaştıkça uzar.',
}

const perim24: Task = {
  title: 'Çevresi 24 olan dikdörtgenler',
  emoji: '🧱',
  prompt: 'Çevresi 24 birim olan dikdörtgenler kur. Hepsinin alanı aynı mı?',
  box: { k: 'rect', maxW: 12, maxH: 8, init: [3, 2] },
  check: rectPerim(24),
  goal: 4,
  measure: 'Alan',
  dupe: 'Bu dikdörtgen galeride var: döndürmek alanı ve çevreyi değiştirmez. Başka kenar uzunlukları dene!',
  pattern: {
    q: 'Galerin alana göre dizildi. Ne fark ediyorsun?',
    options: [
      { t: 'Kare (6 × 6) en büyük alanlı', good: true, why: 'Evet! Çevresi 24 olan dikdörtgenlerin en büyük alanlısı 6 × 6 kare: 36 birimkare.' },
      { t: 'Kenarlar birbirine yaklaştıkça alan büyüyor', good: true, why: 'Evet! 11 × 1 → 11, 9 × 3 → 27, 7 × 5 → 35, 6 × 6 → 36: kenarlar yaklaştıkça alan artıyor.' },
      { t: 'Çevreleri aynı olduğu için alanları da aynı', why: 'Galerindeki alan sayılarına bak: 11 × 1 ile 6 × 6’nın alanı aynı mı?', misc: 'Çevresi eşit dikdörtgenlerin alanının da eşit olduğunu düşündü' },
    ],
  },
  strategies: ['Genişlik + yükseklik = 12 olmalı dedim', 'Birini 1 artırıp ötekini 1 azalttım', 'Deneme yanılma'],
  hints: ['Çevre 24 ise genişlik + yükseklik kaç olmalı?', 'Genişliği 1 artırırsan, çevre değişmesin diye yüksekliğe ne yapmalısın?'],
  insight: 'Çevre sabitken dikdörtgenin kenarları birbirine yaklaştıkça alan büyür; en büyük alan karede.',
}

const fracs8: Task = {
  title: 'Toplamı 1 olan sekizde birler',
  emoji: '🍫',
  prompt: 'Paydası 8 olan üç kesir seç; toplamları 1 bütün olsun. Kaç farklı üçlü bulabilirsin?',
  box: { k: 'fracs', init: [[1, 8], [2, 8], [3, 8]], maxDen: 8, fixedDen: 8, view: 'sum' },
  check: (a) => {
    if (a.k !== 'fracs') return bad('')
    const s = a.f.reduce((p, [n]) => p + n, 0)
    if (s !== 8) return bad(`Toplam [[${s}/8]] oldu. 1 bütün = [[8/8]]. ${s < 8 ? `${8 - s} tane sekizde bir daha nereye eklenebilir?` : `${s - 8} tane sekizde biri hangi kesirden alırsın?`}`)
    const v = sorted(a.f.map(([n]) => n))
    return { ok: true, key: v.join('+'), label: v.map((n) => `[[${n}/8]]`).join(' + '), sort: v[0] }
  },
  goal: 3,
  dupe: 'Bu üçlü galeride var: kesirlerin sırasını değiştirmek toplamı değiştirmez. Payları değiştir!',
  pattern: {
    q: 'Galerindeki her toplamda payların toplamı kaç?',
    options: [
      { t: '8; çünkü 1 bütün = [[8/8]]', good: true, why: 'Evet! Sekizde birlik parçalardan 8 tane bir bütünü tamamlar; paydalar parça büyüklüğünü gösterir, toplanmaz.' },
      { t: '24; çünkü paydalar da toplanır: 8 + 8 + 8', why: 'Sekizde birlik parçaları birleştirince parçaların büyüklüğü değişir mi? Şerit hâlâ 8 eş parçaya bölünmüş.', misc: 'Kesirleri toplarken paydaları da topladı' },
      { t: 'Her seferinde farklı', why: 'Galerindeki üçlülerin paylarını topla: 1 + 2 + 5, 2 + 3 + 3… Ne buluyorsun?' },
    ],
  },
  strategies: ['8’i üç parçaya ayırdım', 'Birinden alıp ötekine verdim', 'Şeridi doldurdum'],
  hints: ['Şerit 8 eş parçaya bölünmüş. Hepsini doldurmak için üç kesrin payları toplamı kaç olmalı?', '8’i üç sayıya ayır: 1 + 2 + 5 gibi.'],
  insight: 'Paydaları eşit kesirleri toplarken eş parçaları sayarız: payların toplamı 8 olunca [[8/8]] = 1 bütün olur.',
}

const prod36: Task = {
  title: 'Çarpımı 36',
  emoji: '✖️',
  prompt: 'Çarpımı 36 olan iki sayı bul. Kaç farklı çift var?',
  box: { k: 'nums', init: [3, 6], min: 1, max: 36, labels: ['1. çarpan', '2. çarpan'], view: { t: 'area' } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const [x, y] = a.v
    if (x * y !== 36) return bad(`${x} × ${y} = ${x * y}. ${36 % x === 0 ? `${x} ile hangi sayıyı çarparsan 36 olur?` : `36’yı ${ek(x, 'dat')} eşit bölebilir misin?`}`)
    const [s, l] = sorted([x, y])
    return { ok: true, key: `${s}x${l}`, label: `${s} × ${l}`, sort: s }
  },
  goal: 4,
  dupe: 'Bu çift galeride var: çarpmada çarpanların yeri değişince sonuç değişmez (4 × 9 = 9 × 4). Başka bir çift dene!',
  pattern: {
    q: 'Galerin dizildi: 1 × 36, 2 × 18, 3 × 12… Bir çarpan 2 katına çıkınca öteki ne oluyor?',
    options: [
      { t: 'Yarısına iniyor', good: true, why: 'Evet! 2 × 18 → 4 × 9: biri 2 katına çıkınca öteki yarıya inerse çarpım değişmez.' },
      { t: 'O da 2 katına çıkıyor', why: '2 × 18 = 36. İkisini de 2 katına çıkarırsan 4 × 36 olur: çarpım hâlâ 36 mı?', misc: 'Çarpımı korurken iki çarpanın da arttığını düşündü' },
      { t: '2 azalıyor', why: '2 × 18 → 4 × 16 olsaydı çarpım kaç olurdu? Galerindeki 4’ün eşi 16 mı?', misc: 'Çarpımı korumayı toplamadaki gibi ekleyip çıkararak düşündü' },
    ],
  },
  strategies: ['Bölme yaptım', 'Birini 2 katına çıkarıp ötekini yarıya indirdim', 'Çarpım tablosunu düşündüm'],
  hints: ['36’yı hangi sayılara tam bölebilirsin?', '6 × 6 = 36. 6’yı yarıya indirirsen öteki 6’ya ne yapmalısın?'],
  insight: 'Çarpım sabitken bir çarpan 2 katına çıkınca öteki yarıya iner.',
}

const half: Task = {
  title: 'Yarıma denk kesirler',
  emoji: '🌓',
  prompt: '[[1/2]]’ye denk olan kesirler bul. Şeritte boyalı kısım tam yarım olmalı.',
  box: { k: 'fracs', init: [[1, 3]], maxDen: 20, view: 'half' },
  check: (a) => {
    if (a.k !== 'fracs') return bad('')
    const [n, d] = a.f[0]
    if (2 * n !== d) return bad(`[[${n}/${d}]], [[1/2]]’den ${2 * n < d ? 'küçük' : 'büyük'}: boyalı kısım yarım çizgisine ${2 * n < d ? 'ulaşmıyor' : 'taşıyor'}. ${d} parçanın yarısı kaç parça eder?`)
    return { ok: true, key: `${n}/${d}`, label: `[[${n}/${d}]]`, sort: d, measure: d }
  },
  goal: 4,
  measure: 'Payda',
  dupe: 'Bu kesir galeride var. Başka bir paydayla dene!',
  pattern: {
    q: 'Galerin paydaya göre dizildi. Her kesirde pay ile payda arasında hangi ilişki var?',
    options: [
      { t: 'Payda, payın 2 katı', good: true, why: 'Evet! Bütünü kaç parçaya bölersen böl, yarısı payda ÷ 2 parça eder: [[3/6]], [[5/10]], [[9/18]].' },
      { t: 'Payda, paydan 1 fazla', why: 'Bu [[1/2]] için doğru. [[2/4]]’te de doğru mu? 4, 2’den 1 fazla mı?', misc: 'Denk kesirleri toplamsal ilişkiyle (pay+1=payda) genelledi' },
      { t: 'Pay hep 1', why: 'Galerine bak: [[2/4]], [[3/6]]… Pay hep 1 mi?' },
    ],
  },
  strategies: ['Paydayı ikiye böldüm', 'Payı ve paydayı aynı sayıyla çarptım', 'Şeride bakıp boyadım'],
  hints: ['Şeridi 4 parçaya böl. Yarısı kaç parça?', 'Payda çift sayı olmalı mı? Neden?'],
  insight: 'Bir kesir [[1/2]]’ye denkse payda payın 2 katıdır; bütün kaç eş parçaya bölünürse bölünsün yarısı aynı büyüklüktedir.',
}

const order20: Task = {
  title: 'İşlem önceliği atölyesi',
  emoji: '⚙️',
  prompt: '□ + □ × □ = 20 olacak biçimde kutulara 1’den 10’a kadar sayılar yerleştir. Kaç farklı yol bulabilirsin?',
  box: { k: 'nums', init: [2, 3, 3], min: 1, max: 10, labels: ['a', 'b', 'c'], view: { t: 'expr' } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const [x, y, z] = a.v
    const r = x + y * z
    if (r !== 20) {
      if ((x + y) * z === 20) return bad(`Soldan sağa yaparsan (${x} + ${y}) × ${z} = 20 oluyor; ama önce çarpma yapılır: ${x} + ${y * z} = ${r}. Sayıları değiştir!`, 'İşlem önceliğini göz ardı edip soldan sağa işlem yaptı')
      return bad(`Önce çarpma: ${y} × ${z} = ${y * z}, sonra ${x} + ${y * z} = ${r}. ${ek(20, 'dat')} ulaşmak için hangi sayıyı değiştirirsin?`)
    }
    const [s, l] = sorted([y, z])
    return { ok: true, key: `${x}|${s}x${l}`, label: `${x} + ${y} × ${z}`, sort: x, measure: y * z }
  },
  goal: 4,
  measure: 'Çarpım',
  dupe: 'Bu galeride var: b ile c’nin yerini değiştirmek sonucu değiştirmez (çarpmada sıra fark etmez). Başka bir yol dene!',
  pattern: {
    q: 'a + b × c’de b ile c’nin yerini değiştirirsen sonuç ne olur?',
    options: [
      { t: 'Değişmez; önce çarpma yapılır ve çarpmada sıra fark etmez', good: true, why: 'Evet! 4 + 2 × 8 ile 4 + 8 × 2 ikisi de 4 + 16 = 20.' },
      { t: 'Değişir, çünkü sayıların sırası değişti', why: 'Tezgâhta dene: b ile c’yi değiştir. Çarpım değişiyor mu?', misc: 'Çarpmanın değişme özelliğini kullanmadı' },
      { t: 'Bazen değişir, bazen değişmez', why: 'Galerindeki her örnekte b × c ile c × b’yi karşılaştır. Hiç farklı çıkan oldu mu?' },
    ],
  },
  strategies: ['Önce a’yı seçip b × c’yi buldum', 'Çarpımı sabit tutup a’yı değiştirdim', 'Deneme yanılma'],
  hints: ['a = 4 seçersen b × c kaç olmalı?', 'b × c = 18 olacak iki sayı bulursan a kaç olmalı?'],
  insight: 'a + b × c’de önce çarpma yapılır; b × c’ye eşit farklı çarpımlar aynı sonucu verir.',
}

const mean7: Task = {
  title: 'Ortalaması 7 olan 5 sayı',
  emoji: '⚖️',
  prompt: 'Ortalaması 7 olan 5 sayı bul. Noktaları sürükle ya da düğmeleri kullan. ▲ denge noktasıdır.',
  box: { k: 'nums', init: [4, 6, 7, 9, 10], min: 0, max: 14, labels: ['1.', '2.', '3.', '4.', '5.'], view: { t: 'dots', min: 0, max: 14 } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const s = a.v.reduce((p, x) => p + x, 0)
    if (s !== 35) return bad(`Toplam ${s}; ortalama ${s} ÷ 5 = ${fmtN(s / 5)}. Ortalamanın 7 olması için toplam kaç olmalı?`, s === 7 ? 'Ortalamayı toplamla karıştırdı' : undefined)
    const v = sorted(a.v)
    return { ok: true, key: v.join(','), label: v.join(', '), sort: v[4] - v[0], measure: v[4] - v[0] }
  },
  goal: 3,
  measure: 'Açıklık',
  dupe: 'Bu sayı grubu galeride var (sıra fark etmez). Birini artırıp başka birini azaltmayı dene!',
  pattern: {
    q: 'Galerindeki her sayı grubunun toplamı kaç?',
    options: [
      { t: 'Hep 35, çünkü 5 × 7 = 35', good: true, why: 'Evet! Ortalama 7 ise 5 sayı “hepsi 7” gibi davranır: toplam hep 5 × 7 = 35.' },
      { t: 'Hep 7', why: '7 ortalama. 4 + 6 + 7 + 8 + 10 toplamı kaç?', misc: 'Ortalamayı toplamla karıştırdı' },
      { t: 'Her seferinde farklı', why: 'Galerindeki iki grubun toplamını hesapla. Farklı mı çıktı?' },
    ],
  },
  strategies: ['Birini artırıp ötekini azalttım', 'Hepsini 7 yapıp dengeledim', 'Önce toplamı 35 yaptım'],
  hints: ['Hepsi 7 olursa ortalama kaç olur?', 'Bir sayıyı 2 artırırsan dengeyi korumak için ne yapmalısın?'],
  insight: 'Ortalaması 7 olan 5 sayının toplamı hep 5 × 7 = 35’tir; birini artırınca bir başkası o kadar azalmalı.',
}

const frac3: Task = {
  title: 'Toplamı 1 olan üç kesir',
  emoji: '🥧',
  prompt: 'Toplamı 1 olan üç kesir bul (paydalar farklı olabilir). Kaç farklı üçlü bulabilirsin?',
  box: { k: 'fracs', init: [[1, 2], [1, 4], [1, 8]], maxDen: 12, view: 'sum' },
  check: (a) => {
    if (a.k !== 'fracs') return bad('')
    const s = a.f.reduce((p, [n, d]) => qAdd(p, q(n, d)), q(0))
    if (!qEq(s, q(1))) {
      const diff = qSub(q(1), s)
      const lt = qNum(diff) > 0
      return bad(`Toplam ${fmtQ(s, 'frac')} oldu; 1 bütüne ${fmtQ(lt ? diff : qSub(s, q(1)), 'frac')} ${lt ? 'eksik' : 'fazla'}. Hangi kesri değiştirirsin?`)
    }
    const vals = a.f.map(([n, d]) => q(n, d)).sort((x, y) => qNum(x) - qNum(y))
    return { ok: true, key: vals.map((v) => `${v.n}/${v.d}`).join('+'), label: vals.map((v) => fmtQ(v, 'frac')).join(' + '), sort: qNum(vals[2]) }
  },
  goal: 3,
  dupe: 'Bu üçlü galeride var ([[2/4]] ile [[1/2]] aynı büyüklük, sıra da fark etmez). Başka kesirler dene!',
  pattern: {
    q: 'Toplamı 1 olan üç kesrin üçü de [[1/3]]’ten büyük olabilir mi?',
    options: [
      { t: 'Hayır; üçü de [[1/3]]’ten büyükse toplam 1’i geçer', good: true, why: 'Evet! [[1/3]] + [[1/3]] + [[1/3]] = 1. Üçü de daha büyük olursa toplam 1’den büyük olur. Galerinde de en az biri [[1/3]] ya da daha küçük.' },
      { t: 'Evet, paydaları büyük seçersem', why: 'Payda büyüdükçe birim kesir büyür mü küçülür mü? [[1/12]] ile [[1/3]]’ü şeritte karşılaştır.', misc: 'Paydası büyük kesrin daha büyük olduğunu düşündü' },
      { t: 'Evet: [[1/2]] + [[1/2]] + [[1/2]] gibi', why: 'Bu toplam 1 mi? Tezgâhta dene, şerit 1’i geçiyor mu?' },
    ],
  },
  strategies: ['[[1/2]]’den başlayıp kalanı paylaştırdım', 'Ortak payda kullandım', 'Şeridi doldurdum'],
  hints: ['[[1/2]]’yi seç. Geriye kalan [[1/2]]’yi iki kesre nasıl ayırırsın?', '12’de birlerle düşün: payların toplamı 12 olan üç kesir.'],
  insight: 'Toplamı 1 olan üç kesrin en az biri [[1/3]] ya da daha küçüktür; kesirleri ortak bir birimle (ör. 12’de bir) düşününce yeni üçlüler kolay bulunur.',
}

const lcm12: Task = {
  title: 'EKOK’u 12 olan çiftler',
  emoji: '🔁',
  prompt: 'En küçük ortak katı (EKOK) 12 olan iki sayı bul. Kaç farklı çift var?',
  box: { k: 'nums', init: [2, 3], min: 1, max: 12, labels: ['1. sayı', '2. sayı'], view: { t: 'lcm', upto: 36 } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const [x, y] = a.v
    const l = lcm(x, y)
    if (l !== 12) return bad(`${ek(x, 'gen')} ve ${ek(y, 'gen')} ortak katlarının en küçüğü ${l}. EKOK’un 12 olması için iki sayı da ${ek(12, 'gen')} neyi olmalı?`)
    const [s, r] = sorted([x, y])
    return { ok: true, key: `${s},${r}`, label: `${s} ve ${r}`, sort: s }
  },
  goal: 4,
  dupe: 'Bu çift galeride var. Başka bir çift dene!',
  pattern: {
    q: 'Galerindeki sayıların hepsi 12’nin neyi?',
    options: [
      { t: '12’nin bölenleri: 12’yi tam bölüyorlar', good: true, why: 'Evet! Bir sayının katı 12 olacaksa o sayı 12’yi tam bölmeli: 1, 2, 3, 4, 6, 12.' },
      { t: '12’nin katları', why: '24 ile 36’nın EKOK’u kaç? 12’den küçük olabilir mi?', misc: 'Bölen ile katı karıştırdı' },
      { t: 'Hepsi çift sayı', why: 'Galerinde 3 ile 4 ya da 3 ile 12 var mı? 3 çift mi?' },
    ],
  },
  strategies: ['12’nin bölenlerinden seçtim', 'Katları yazıp karşılaştırdım', 'Deneme yanılma'],
  hints: ['12’yi tam bölen sayılar hangileri?', '4 ile 6’nın katlarını yaz: ilk ortak kat hangisi?'],
  insight: 'EKOK’u 12 olan sayılar 12’nin bölenlerinden seçilir; ama her bölen çifti olmaz: 2 ile 6’nın EKOK’u 6.',
}

const gcd4: Task = {
  title: 'EBOB’u 4 olan çiftler',
  emoji: '🧩',
  prompt: 'En büyük ortak böleni (EBOB) 4 olan, 40’tan küçük iki sayı bul.',
  box: { k: 'nums', init: [6, 10], min: 1, max: 40, labels: ['1. sayı', '2. sayı'], view: { t: 'gcd' } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const [x, y] = a.v
    const g = gcd(x, y)
    if (g !== 4) return bad(`EBOB(${x}, ${y}) = ${g}. ${x % 4 || y % 4 ? 'İki sayı da 4’e tam bölünüyor mu?' : 'İki sayı da 4’e bölünüyor ama 4’ten büyük bir ortak bölenleri de var. Hangisi?'}`)
    const [s, r] = sorted([x, y])
    return { ok: true, key: `${s},${r}`, label: `${s} ve ${r}`, sort: s }
  },
  goal: 3,
  dupe: 'Bu çift galeride var. Başka bir çift dene!',
  pattern: {
    q: 'Galerindeki sayıların hepsi hangi sayının katı?',
    options: [
      { t: '4’ün katı', good: true, why: 'Evet! 4 ortak bölen olacaksa iki sayı da 4’ün katı olmalı; ama 8 gibi daha büyük ortak bölenleri olmamalı.' },
      { t: '8’in katı', why: '4 ile 12’nin EBOB’u 4. 12, 8’in katı mı?' },
      { t: 'Hiçbir ortak yanları yok', why: 'Her sayıyı 4’e bölmeyi dene. Kalan çıkıyor mu?' },
    ],
  },
  strategies: ['4’ün katlarından seçtim', 'Bölenleri yazıp karşılaştırdım', 'Deneme yanılma'],
  hints: ['4’ün katlarını yaz: 4, 8, 12, 16…', '8 ile 16’nın EBOB’u 8 çıkar. 8 ile 12’yi dene.'],
  insight: 'EBOB’u 4 olan sayıların ikisi de 4’ün katıdır, ama 4’ten büyük ortak bölenleri yoktur.',
}

const sumNeg3: Task = {
  title: 'Toplamı −3',
  emoji: '🌡️',
  prompt: 'Toplamı −3 olan iki tam sayı bul. Kaç farklı çift bulabilirsin?',
  box: { k: 'nums', init: [2, 4], min: -10, max: 10, labels: ['1. sayı', '2. sayı'], view: { t: 'line', min: -10, max: 10, target: -3 } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const [x, y] = a.v
    const s = x + y
    if (s !== -3) return bad(`${fmtN(x)} + ${sg(y)} = ${fmtN(s)}. ${s > -3 ? `−3 için sonucu ${s + 3} azaltmalısın: hangi sayıyı küçültürsün?` : `−3 için sonucu ${-3 - s} artırmalısın: hangi sayıyı büyütürsün?`}`)
    const [p, r] = sorted([x, y])
    return { ok: true, key: `${p},${r}`, label: `${fmtN(p)} + ${sg(r)}`, sort: p }
  },
  goal: 4,
  dupe: 'Bu çift galeride var (sıra fark etmez). Başka bir çift dene!',
  pattern: {
    q: 'Galerin küçükten büyüğe dizildi. Ne fark ediyorsun?',
    options: [
      { t: 'Bir sayı 1 artınca öteki 1 azalıyor', good: true, why: 'Evet! Toplam sabit −3 iken biri ne kadar artarsa öteki o kadar azalır: −8 + 5, −7 + 4…' },
      { t: 'Her çiftte en az bir sayı negatif', good: true, why: 'Evet! İki sayı da 0 ya da pozitif olsaydı toplam negatif olamazdı.' },
      { t: 'İki sayı da negatif olmak zorunda', why: 'Galerinde 2 + (−5) gibi bir çift var mı? 2 negatif mi?', misc: 'Negatif toplam için iki sayının da negatif olması gerektiğini düşündü' },
    ],
  },
  strategies: ['Sayı doğrusunda zıpladım', 'Birini artırıp ötekini azalttım', '0 + (−3)’ten başladım'],
  hints: ['0 + (−3) bir çift. Birinci sayıyı 1 artırırsan ikinciye ne yapmalısın?', 'Sayı doğrusunda 5’ten başla: −3’e varmak için kaç adım geri gitmelisin?'],
  insight: 'Toplam sabitken biri artınca öteki o kadar azalır; negatif bir toplam için sayılardan en az biri negatiftir.',
}

const meanMed: Task = {
  title: 'Ortalama 7, ortanca 6',
  emoji: '📊',
  prompt: 'Ortalaması 7, ortancası 6 olan 5 sayı bul. Noktaları sürükle; ▲ ortalama, yeşil çizgi ortanca.',
  box: { k: 'nums', init: [3, 5, 7, 9, 11], min: 0, max: 15, labels: ['1.', '2.', '3.', '4.', '5.'], view: { t: 'dots', min: 0, max: 15, median: true } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const v = sorted(a.v)
    const s = v.reduce((p, x) => p + x, 0)
    if (v[2] !== 6) return bad(`Sıraladığında ortadaki sayı ${v[2]}. Ortancanın 6 olması için ortadaki sayı ne olmalı?`)
    if (s !== 35) return bad(`Ortanca 6, ama toplam ${s}; ortalama ${fmtN(s / 5)}. Ortalama 7 için toplam kaç olmalı? Ortancayı bozmadan hangi sayıyı değiştirirsin?`)
    return { ok: true, key: v.join(','), label: v.join(', '), sort: v[4], measure: v[4] }
  },
  goal: 3,
  measure: 'En büyük',
  dupe: 'Bu sayı grubu galeride var (sıra fark etmez). Başka bir grup dene!',
  pattern: {
    q: 'Ortanca 6, ortalama 7. Galerindeki gruplarda ortak olan ne?',
    options: [
      { t: 'Toplam hep 35, ortadaki sayı hep 6', good: true, why: 'Evet! Ortalama 7 → toplam 35; ortanca 6 → sıralayınca ortadaki 6.' },
      { t: 'Büyük sayılar 6’dan daha uzakta; ortalamayı yukarı çekiyorlar', good: true, why: 'Evet! Ortalama ortancadan büyükse sağdaki değerler denge noktasını sağa çeker.' },
      { t: 'Ortalama ile ortanca hep eşittir', why: 'Bu görevde ortanca 6, ortalama 7. Eşit mi?', misc: 'Ortalama ile ortancanın hep eşit olduğunu düşündü' },
    ],
  },
  strategies: ['Önce ortancayı 6 yaptım, sonra toplamı ayarladım', 'Sağdaki sayıyı büyüttüm', 'Deneme yanılma'],
  hints: ['Ortadaki sayıyı 6 yap. İki sayı 6’dan küçük ya da eşit, iki sayı büyük ya da eşit olsun.', 'Toplam 35 olmalı. 6’yı ayırırsan diğer dördünün toplamı kaç?'],
  insight: 'Ortalama toplamla, ortanca sıralamadaki yerle ilgilidir; büyük bir değer ortalamayı çeker ama ortancayı değiştirmez.',
}

const bag: Task = {
  title: 'Çeyrek olasılıklı torbalar',
  emoji: '🎒',
  prompt: 'Torbadan kırmızı top çekme olasılığı [[1/4]] olsun. Torbaya kaç kırmızı, kaç mavi top koyarsın? Farklı torbalar kur.',
  box: { k: 'nums', init: [2, 3], min: 0, max: 24, labels: ['Kırmızı', 'Mavi'], view: { t: 'bag' } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const [r, b] = a.v
    if (r === 0) return bad('Torbada hiç kırmızı yokken kırmızı çekmek imkânsız: olasılık 0. Kırmızı top ekle.')
    if (4 * r !== r + b) return bad(`Kırmızı olasılığı [[${r}/${r + b}]]. [[1/4]] için tüm topların sayısı kırmızının kaç katı olmalı?`, b === 4 * r ? 'Parça-bütün oranını parça-parça oranıyla karıştırdı' : undefined)
    return { ok: true, key: `${r},${b}`, label: `${r} kırmızı, ${b} mavi`, sort: r + b, measure: r + b }
  },
  goal: 3,
  measure: 'Toplam top',
  dupe: 'Bu torba galeride var. Başka sayılarla dene!',
  pattern: {
    q: 'Galerindeki torbalarda mavi top sayısı kırmızının kaç katı?',
    options: [
      { t: '3 katı: her kırmızıya 3 mavi düşüyor', good: true, why: 'Evet! 1 kırmızı + 3 mavi = 4 top; kırmızı 4’te 1. Bu oranı katlayınca olasılık değişmez.' },
      { t: '4 katı', why: '1 kırmızı, 4 mavi olsaydı torbada 5 top olurdu; kırmızı olasılığı [[1/5]]. Payda tüm topları sayar.', misc: 'Parça-bütün oranını parça-parça oranıyla karıştırdı' },
      { t: 'Her torbada farklı', why: 'Galerindeki torbalarda mavi ÷ kırmızı hesapla. Ne buluyorsun?' },
    ],
  },
  strategies: ['Kırmızıyı 1 artırınca 3 mavi ekledim', 'Toplamı 4’ün katı yaptım', 'Deneme yanılma'],
  hints: ['1 kırmızı top varsa torbada toplam kaç top olmalı?', 'Toplam top sayısı kırmızının 4 katı olmalı.'],
  insight: 'Olasılık [[1/4]] ise toplam top kırmızının 4 katıdır: 1 : 3 oranını korudukça torba büyüse de olasılık değişmez.',
}

const prism24: Task = {
  title: 'Hacmi 24 olan kutular',
  emoji: '📦',
  prompt: 'Hacmi 24 birimküp olan dikdörtgenler prizmaları kur (ayrıtlar tam sayı). En az ambalaj kâğıdı hangisine gider?',
  box: { k: 'nums', init: [2, 2, 2], min: 1, max: 24, labels: ['En', 'Boy', 'Yükseklik'], view: { t: 'prism' } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const [x, y, z] = a.v
    const V = x * y * z
    if (V !== 24) return bad(`${x} × ${y} × ${z} = ${V} birimküp. ${V < 24 ? 'Hangi ayrıtı büyütürsün?' : 'Hangi ayrıtı küçültürsün?'} 24’ü üç çarpana nasıl ayırabilirsin?`)
    const v = sorted(a.v)
    const S = 2 * (x * y + y * z + x * z)
    return { ok: true, key: v.join('x'), label: v.join(' × '), sort: S, measure: S }
  },
  goal: 4,
  measure: 'Yüzey alanı',
  dupe: 'Bu kutu galeride var: kutuyu döndürmek hacmi ve yüzey alanını değiştirmez. Başka ayrıtlar dene!',
  pattern: {
    q: 'Galerin yüzey alanına göre dizildi. En az ambalaj kâğıdı hangi kutuya gider?',
    options: [
      { t: 'Ayrıtları birbirine en yakın olana (2 × 3 × 4)', good: true, why: 'Evet! 2 × 3 × 4 kutunun yüzey alanı 52; küpe yaklaştıkça yüzey alanı azalır.' },
      { t: 'Hacimleri aynı olduğu için hepsine aynı', why: 'Galerindeki yüzey alanlarına bak: 1 × 1 × 24 ile 2 × 3 × 4 aynı mı?', misc: 'Hacmi eşit prizmaların yüzey alanının da eşit olduğunu düşündü' },
      { t: 'En uzun kutuya (1 × 1 × 24)', why: '1 × 1 × 24’ün yüzey alanını galerinde bul. En küçük mü, en büyük mü?' },
    ],
  },
  strategies: ['24’ün çarpanlarını kullandım', 'Bir ayrıtı 2 katına çıkarıp ötekini yarıya indirdim', 'Katman katman düşündüm'],
  hints: ['24 = 2 × 12 = 2 × 3 × 4. Başka nasıl üç çarpana ayırırsın?', 'Ayrıtlardan biri 1 olabilir mi?'],
  insight: 'Hacim sabitken prizma küpe yaklaştıkça yüzey alanı küçülür; ince uzun kutular daha çok kâğıt ister.',
}

const slope2: Task = {
  title: 'Eğimi 2 olan doğrular',
  emoji: '📈',
  prompt: 'İki nokta yerleştirerek eğimi 2 olan doğrular çiz. Kaç farklı doğru bulabilirsin?',
  box: { k: 'pts', range: 5 },
  check: (a) => {
    if (a.k !== 'pts') return bad('')
    const { a: A, b: B } = a
    if (A[0] === B[0] && A[1] === B[1]) return bad('A ile B aynı nokta. İki farklı nokta bir doğru belirler: B’yi taşı.')
    const e = lineEq(A, B)
    if (!e) return bad('Bu doğru dikey: x değişmediği için eğim tanımsız. B’yi sağa ya da sola taşı.')
    if (!qEq(e.m, q(2))) return bad(`Eğim = [[${B[1] - A[1]}/${B[0] - A[0]}]] = ${fmtQ(e.m, 'frac')}. Eğimin 2 olması için x 1 artınca y kaç artmalı?`, qEq(e.m, q(1, 2)) ? 'Eğimi yatay değişim ÷ dikey değişim olarak aldı' : undefined)
    return { ok: true, key: `${e.n.n}/${e.n.d}`, label: eqText(e.m, e.n), sort: qNum(e.n), measure: qNum(e.n) }
  },
  goal: 3,
  measure: 'n',
  dupe: 'Bu doğru galeride var: aynı doğru üzerinde başka iki nokta seçmişsin. Doğruyu yukarı ya da aşağı kaydır!',
  pattern: {
    q: 'Galerindeki doğrular için ne söylersin?',
    options: [
      { t: 'Hepsi birbirine paralel', good: true, why: 'Evet! Eğimleri aynı olduğu için hiç kesişmezler: aynı dikliğe sahip, kaydırılmış doğrular.' },
      { t: 'Yalnız y eksenini kestikleri nokta (n) değişiyor', good: true, why: 'Evet! y = 2x + n’de 2 sabit; n doğruyu yukarı-aşağı kaydırıyor.' },
      { t: 'Hepsi orijinden geçer', why: 'y = 2x + 3 doğrusu (0, 0)’dan geçer mi? x = 0 koy.', misc: 'Eğimi aynı olan doğruların hep orijinden geçtiğini düşündü' },
    ],
  },
  strategies: ['A’dan 1 sağa, 2 yukarı gittim', 'Galerideki bir doğruyu kaydırdım', 'Denklemi düşündüm'],
  hints: ['A noktasından 1 birim sağa, 2 birim yukarı git: B orada olsun.', 'Galerideki doğruyu 1 birim yukarı kaydırmak için A’yı nereye koyarsın?'],
  insight: 'Eğimi 2 olan sonsuz doğru vardır; hepsi paraleldir ve yalnız y eksenini kestikleri nokta değişir.',
}

const thru01: Task = {
  title: '(0, 1)’den geçen doğrular',
  emoji: '📍',
  prompt: 'A noktası (0, 1)’de sabit. B’yi yerleştirerek A’dan geçen farklı doğrular çiz.',
  box: { k: 'pts', range: 5, fixedA: [0, 1] },
  check: (a) => {
    if (a.k !== 'pts') return bad('')
    const { a: A, b: B } = a
    if (A[0] === B[0] && A[1] === B[1]) return bad('B ile A aynı nokta. B’yi başka bir yere koy.')
    const e = lineEq(A, B)
    if (!e) return bad('Bu doğru dikey (x = 0): y = mx + n biçiminde yazılamaz. B’yi sağa ya da sola taşı.')
    return { ok: true, key: `${e.m.n}/${e.m.d}`, label: eqText(e.m, e.n), sort: qNum(e.m), measure: qNum(e.m) }
  },
  goal: 4,
  measure: 'Eğim',
  dupe: 'Bu doğru galeride var: B’yi aynı doğru üzerinde kaydırmışsın. Doğruyu döndür!',
  pattern: {
    q: 'Galerindeki doğruların denklemlerinde ortak olan ne?',
    options: [
      { t: 'Hepsinde n = 1: y eksenini (0, 1)’de kesiyorlar', good: true, why: 'Evet! x = 0 iken y = 1 olduğu için y = mx + 1; değişen yalnız eğim m.' },
      { t: 'Hepsinin eğimi aynı', why: 'Galerindeki eğimlere bak. Hepsi aynı mı? Doğrular aynı dikliğe mi sahip?' },
      { t: 'Hepsi paralel', why: 'Hepsi (0, 1)’den geçiyor. Ortak bir noktası olan iki doğru paralel olabilir mi?', misc: 'Ortak noktası olan doğruları paralel sandı' },
    ],
  },
  strategies: ['B’yi farklı yönlere koydum', 'Eğimi önce seçtim', 'Eksenleri kullandım'],
  hints: ['B’yi (1, 3)’e koy: eğim kaç?', 'B’yi A’nın altına, sağa koyarsan eğim negatif olur mu?'],
  insight: 'Bir noktadan sonsuz doğru geçer; (0, 1)’den geçen her doğru y = mx + 1 biçimindedir, yalnız eğim değişir.',
}

const roots: Task = {
  title: 'Karekökü 4 ile 5 arasında',
  emoji: '√',
  prompt: 'Karekökü 4 ile 5 arasında olan tam sayılar bul. Hepsini bulabilir misin?',
  box: { k: 'nums', init: [10], min: 1, max: 40, labels: ['Sayı'], view: { t: 'root' } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const n = a.v[0]
    if (n === 16 || n === 25) return bad(`√{${n}} = ${Math.sqrt(n)}: tam sınırda, arasında değil. Bir yanındaki sayıyı dene.`, 'Kesin sınırı aralığa dâhil etti')
    if (n < 16) return bad(`√{${n}} ≈ ${fmtN(Math.round(Math.sqrt(n) * 100) / 100, 2)}, 4’ten küçük. 4’ün karesi kaç?`)
    if (n > 25) return bad(`√{${n}} ≈ ${fmtN(Math.round(Math.sqrt(n) * 100) / 100, 2)}, 5’ten büyük. 5’in karesi kaç?`)
    return { ok: true, key: `${n}`, label: `√{${n}}`, sort: n }
  },
  goal: 4,
  dupe: 'Bu sayı galeride var. Başka bir sayı dene!',
  pattern: {
    q: 'Karekökü 4 ile 5 arasında olan kaç tam sayı var?',
    options: [
      { t: '8 tane: 17’den 24’e kadar', good: true, why: 'Evet! 4² = 16 ile 5² = 25 arasındaki tam sayılar: 17, 18, …, 24.' },
      { t: '10 tane: 16’dan 25’e kadar', why: '√16 tam olarak 4, √25 tam olarak 5. Bunlar arasında mı, sınırda mı?', misc: 'Kesin sınırı aralığa dâhil etti' },
      { t: 'Sonsuz tane', why: 'Tam sayılardan söz ediyoruz: 16 ile 25 arasında kaç tam sayı var? (Kesirleri sayarsak durum değişir!)' },
    ],
  },
  strategies: ['4² ve 5²’yi hesapladım', 'Sayı doğrusuna bakıp kaydırdım', 'Deneme yanılma'],
  hints: ['4’ün karesi kaç? 5’in karesi kaç?', '16 ile 25 arasındaki bir sayıyı dene.'],
  insight: '√n, 4 ile 5 arasındaysa n, 4² = 16 ile 5² = 25 arasındadır: 17’den 24’e 8 tam sayı.',
}

const triples: Task = {
  title: 'Tam sayı kenarlı dik üçgenler',
  emoji: '📏',
  prompt: 'Kenarları tam sayı olan dik üçgenler bul: a² + b² = c² olsun (c en uzun kenar). Kaç tane bulabilirsin?',
  box: { k: 'nums', init: [3, 4, 6], min: 1, max: 30, labels: ['a', 'b', 'c'], view: { t: 'tri' } },
  check: (a) => {
    if (a.k !== 'nums') return bad('')
    const [x, y, z] = a.v
    if (x + y === z) return bad(`${x} + ${y} = ${z}, ama dik üçgende kenarların kareleri toplanır: ${x * x} + ${y * y} = ${x * x + y * y}. ${z}² = ${z * z}. Eşit mi?`, 'Pisagor bağıntısı yerine kenarları topladı')
    if (x * x + y * y !== z * z) {
      const s = sorted(a.v)
      if (s[0] ** 2 + s[1] ** 2 === s[2] ** 2) return bad('Bu üç sayı bir dik üçgen oluşturuyor, ama c en uzun kenar (hipotenüs) olmalı. Yerlerini değiştir.')
      return bad(`a² + b² = ${x * x + y * y}, c² = ${z * z}. Eşit değil. c’yi değiştirerek eşitliği sağlayabilir misin?`)
    }
    const [p, r] = sorted([x, y])
    return { ok: true, key: `${p},${r},${z}`, label: `(${p}, ${r}, ${z})`, sort: z, measure: z }
  },
  goal: 3,
  measure: 'c',
  dupe: 'Bu üçgen galeride var: a ile b’nin yerini değiştirmek aynı üçgeni verir. Başka bir üçlü dene!',
  pattern: {
    q: 'Galerindeki üçlülerde ne fark ediyorsun?',
    options: [
      { t: 'Bir dik üçgenin kenarlarını aynı sayıyla çarpınca yine dik üçgen oluyor', good: true, why: 'Evet! (3, 4, 5) → (6, 8, 10) → (9, 12, 15): benzer üçgenler, açılar değişmez.' },
      { t: 'a + b = c olmalı', why: '(3, 4, 5)’te 3 + 4 = 5 mi? Kenarlar değil, kareleri toplanıyor.', misc: 'Pisagor bağıntısı yerine kenarları topladı' },
      { t: 'Kenarlar hep ardışık sayılar', why: '(6, 8, 10) ardışık mı? (3, 4, 5) için doğru ama hep değil.' },
    ],
  },
  strategies: ['(3, 4, 5)’i katladım', 'a ve b’yi seçip c²’yi hesapladım', 'Kareler tablosunu kullandım'],
  hints: ['(3, 4, 5) ile başla: 9 + 16 = 25.', 'Her kenarı 2 ile çarparsan ne olur? (5, 12, 13)’ü de dene.'],
  insight: 'a² + b² = c²’yi sağlayan sonsuz tam sayı üçlüsü vardır; bir üçlüyü aynı sayıyla çarpmak yeni bir dik üçgen verir.',
}

export function bank(grade: Grade): Task[] {
  switch (grade) {
    case 3:
      return [sum20, area6, beads12, perim12]
    case 4:
      return [rect24, fracs8, area10, prod36]
    case 5:
      return [perim24, half, order20, area16]
    case 6:
      return [mean7, frac3, lcm12, gcd4]
    case 7:
      return [sumNeg3, bag, prism24, meanMed]
    case 8:
      return [slope2, thru01, roots, triples]
    default:
      return [sum20, sum20x3, area6, beads12]
  }
}
