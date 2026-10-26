import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Link2, Scale, X } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { Nudge, Scene, StrategyPicker, useSolutions } from '../../games/kit2'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { Choice, NextButton, Panel, Stepper, TopBar, fmtN, fmtQ, parseQ, q, qAdd, qDiv, qEq, qMul, qNum, qSub, useDragDrop, useLook, type Look, type Q } from '../islem-zinciri/kit'

/**
 * 33. İşlem Doğru mu?
 *  Eşitliği hesaplamadan, ilişkilerle değerlendir:
 *   1) Karar: Doğru / Yanlış (terazi gizli)
 *   2) Kanıt: soldaki her sayıyı sağdaki eşine bağla (sürükle ya da dokun-dokun) → ok üzerinde ilişki (+1, ×2, ters işaret…)
 *   3) Gerekçe: ilişkiyi açıklayan cümleyi seç (çeldiriciler gerçek kavram yanılgıları)
 *   4) Terazi açılır: iki tarafın değeri görünür
 *  Son görev: verilen sol tarafa eşit kendi eşitliklerini terazide kur (birden çok çözüm).
 */

type OpK = '+' | '−' | '×' | '÷' | 'frac'
interface Tok { t: string; v: Q }
interface Opt { t: string; ok: boolean; why?: string; mis?: string }
interface Item {
  kind: 'item'
  /** eşleştirilebilir iki terimli biçim */
  L?: [Tok, OpK, Tok]
  R?: [Tok, OpK, Tok]
  left: string
  right: string
  ok: boolean
  show: [string, string]
  reasons: Opt[]
}
interface Build { kind: 'build'; title: string; left: string; mode: 'add' | 'mul' | 'frac' | 'int' | 'pow' | 'dec'; target: Q; init: [number, number]; need: number }
type Task = Item | Build

const T = (s: string): Tok => ({ t: s, v: parseQ(s.replace(/[()]/g, ''))! })
const opStr = (k: OpK) => (k === 'frac' ? '/' : k)
const pairText = (a: Tok, k: OpK, b: Tok) => (k === 'frac' ? `[[${a.t}/${b.t}]]` : `${a.t} ${k} ${b.t}`)
function pair(a: string, k: OpK, b: string, c: string, k2: OpK, d: string, ok: boolean, show: [string, string], reasons: Opt[]): Item {
  const L: [Tok, OpK, Tok] = [T(a), k, T(b)]
  const R: [Tok, OpK, Tok] = [T(c), k2, T(d)]
  return { kind: 'item', L, R, left: pairText(...L), right: pairText(...R), ok, show, reasons }
}
const free = (left: string, right: string, ok: boolean, show: [string, string], reasons: Opt[]): Item => ({ kind: 'item', left, right, ok, show, reasons })
const num = (s: string) => parseFloat(s.replace('≈', '').replace(/\s/g, '').replace(',', '.'))
const o = (t: string, ok = false, why?: string, mis?: string): Opt => ({ t, ok, why, mis })

const MIS_SAME = 'Eşittir işaretini “iki taraf aynı sayılardan oluşmalı” diye yorumladı'

function tasksFor(grade: Grade): Task[] {
  switch (grade) {
    case 3:
      return [
        pair('37', '+', '48', '38', '+', '47', true, ['85', '85'], [o('37 bir arttı, 48 bir azaldı; toplam aynı kalır', true), o('İki sayı da değişti, toplam da değişir', false, '1 alıp öbürüne verirsen toplam değişir mi? 2 elma + 3 elma ile 3 elma + 2 elmayı düşün.', 'Telafi (birinden alıp diğerine verme) ilişkisini görmedi'), o('Sayılar farklı, eşit olamaz', false, 'Eşittir “aynı sayılar” demek mi, yoksa “aynı değer” mi?', MIS_SAME)]),
        pair('25', '+', '19', '26', '+', '20', false, ['44', '46'], [o('İki sayı da 1 arttı; sağ taraf 2 fazla', true), o('Biri arttı, biri azaldı; toplam aynı', false, 'Oklara bak: 19’dan 20’ye ve 25’ten 26’ya. İkisi de ne yöne gitti?'), o('Sağdaki sayılar daha yuvarlak, bu yüzden eşit', false, 'Yuvarlak olmak değeri korur mu? İki sayı da ne kadar değişti?')]),
        pair('50', '−', '18', '52', '−', '20', true, ['32', '32'], [o('İki sayı da 2 arttı; aradaki fark aynı kalır', true), o('Çıkarmada da biri artarsa öbürü azalmalı', false, 'Sayı doğrusunda 18 ile 50 arasını düşün. İkisini de 2 ileri kaydırınca aradaki uzaklık değişir mi?', 'Toplamadaki telafiyi çıkarmaya aynen uyguladı'), o('Sağ taraf daha büyük sayılardan oluşuyor, sonuç daha büyük', false, 'Hem 52 büyüdü hem de çıkarılan 20 büyüdü. Fark ne olur?')]),
        pair('6', '×', '4', '3', '×', '8', true, ['24', '24'], [o('6’nın yarısı 3, 4’ün iki katı 8; çarpım aynı kalır', true), o('6’dan 3 azaldı, 4’e 4 eklendi; eşit olamaz', false, 'Çarpmada “kaç azaldı” yerine “kaç katı” diye düşün. 6 sırayı 3 sıraya indirip her sırayı ikiye katlarsan?', 'Çarpmada toplamsal düşündü'), o('Çarpmada sayılar aynı kalmalı', false, MIS_SAME, MIS_SAME)]),
        free('46 + 46', '2 × 46', true, ['92', '92'], [o('İki tane 46, 2 kere 46 demek', true), o('Biri toplama, biri çarpma; eşit olamaz', false, '46 + 46’yı kaç tane 46 olarak okuyabilirsin?', 'Toplama ile çarpma arasındaki ilişkiyi görmedi'), o('2 × 46 daha küçük, çünkü 2 küçük bir sayı', false, '2 × 46: iki tane 46. Bu 46 + 46’dan küçük mü?')]),
        { kind: 'build', title: 'Kendi doğru eşitliğini kur: 47 + 38 = ? + ?', left: '47 + 38', mode: 'add', target: q(85), init: [40, 40], need: 3 },
      ]
    case 4:
      return [
        pair('299', '+', '456', '300', '+', '455', true, ['755', '755'], [o('299 bir arttı, 456 bir azaldı; toplam aynı', true), o('300 yuvarlak, o yüzden sağ taraf daha büyük', false, 'Oklara bak: biri 1 arttıysa öbürü ne oldu?'), o('Sayılar farklı, eşit olamaz', false, 'Eşittir “aynı değer” mi demek, “aynı sayılar” mı?', MIS_SAME)]),
        pair('25', '×', '16', '50', '×', '8', true, ['400', '400'], [o('25 iki katına çıktı, 16 yarıya indi; çarpım aynı', true), o('25’e 25 eklendi, 16’dan 8 çıktı; eşit değil', false, 'Çarpmada “kaç eklendi” değil “kaç katı” önemli. 25 kaç katına çıktı, 16 kaçta birine indi?', 'Çarpmada toplamsal düşündü'), o('İki sayı da değişti, çarpım değişir', false, 'Dikdörtgeni düşün: boyu iki katına, eni yarıya inerse alan değişir mi?')]),
        pair('120', '÷', '4', '60', '÷', '2', true, ['30', '30'], [o('Bölünen de bölen de yarıya indi; bölüm aynı', true), o('Bölmede biri yarıya inerse öbürü iki katına çıkmalı', false, '120 şekeri 4 kişiye paylaştır; 60 şekeri 2 kişiye. Herkese kaç düşer?', 'Çarpmadaki iki katı–yarısı ilişkisini bölmeye aynen uyguladı'), o('60 ÷ 2 daha küçük sayılarla, sonuç da küçük', false, 'Hem şeker hem kişi sayısı yarıya indi. Kişi başına düşen değişir mi?')]),
        pair('72', '−', '29', '73', '−', '28', false, ['43', '45'], [o('72 bir arttı, 29 bir azaldı; fark 2 büyüdü', true), o('Biri arttı, biri azaldı; fark aynı kalır', false, 'Sayı doğrusunda 29 ile 72’yi düşün. Biri sağa, biri sola giderse aradaki uzaklık ne olur?', 'Toplamadaki telafiyi çıkarmaya aynen uyguladı'), o('Rakamlar benziyor, eşittir', false, 'Benzer rakamlar aynı değer mi demek? Oklara bak.')]),
        pair('14', '×', '5', '7', '×', '10', true, ['70', '70'], [o('14 yarıya indi, 5 iki katına çıktı; çarpım aynı', true), o('14’ten 7 azaldı, 5’e 5 eklendi; eşit değil', false, 'Çarpmada “kaç katı” diye düşün.', 'Çarpmada toplamsal düşündü'), o('7 × 10 daha kolay, o yüzden daha küçük', false, 'Kolay olmak değeri değiştirir mi?')]),
        { kind: 'build', title: 'Kendi doğru eşitliğini kur: 16 × 25 = ? × ?', left: '16 × 25', mode: 'mul', target: q(400), init: [16, 25], need: 3 },
      ]
    case 5:
      return [
        pair('25', '×', '16', '100', '×', '4', true, ['400', '400'], [o('25 dört katına çıktı, 16 dörtte birine indi; çarpım aynı', true), o('25’e 75 eklendi, 16’dan 12 çıktı; eşit olamaz', false, 'Çarpmada “kaç katı” diye düşün: 25 kaç katına çıktı?', 'Çarpmada toplamsal düşündü'), o('100 × 4 daha büyük, çünkü 100 büyük', false, 'Bir çarpan büyürken öbürü küçüldü. Kaç kat büyüdü, kaç kat küçüldü?')]),
        pair('3', 'frac', '4', '6', 'frac', '8', true, ['0,75', '0,75'], [o('Pay da payda da 2 katına çıktı; aynı büyüklük', true), o('6 ve 8 daha büyük sayılar, kesir de büyük', false, 'Bir pastayı 8 dilime bölüp 6’sını almak, 4 dilime bölüp 3’ünü almaktan çok mu?', 'Kesrin büyüklüğünü pay ve paydanın büyüklüğüne göre değerlendirdi'), o('Paydalar farklı, karşılaştırılamaz', false, 'Kesir şeritlerini alt alta koyduğunu düşün. Aynı yere mi gelirler?')]),
        pair('2', 'frac', '3', '4', 'frac', '5', false, ['≈ 0,67', '0,8'], [o('Pay ve paydaya aynı sayıyı eklemek kesri korumaz', true), o('İkisine de 2 eklendi, eşittir', false, '[[1/2]] için dene: pay ve paydaya 1 ekle → [[2/3]]. [[1/2]] ile [[2/3]] eşit mi?', 'Denk kesirde toplamsal düşündü'), o('4 ve 5 ardışık, 2 ve 3 de ardışık; eşittir', false, '[[1/2]] ile [[9/10]] da ardışık. Eşitler mi?')]),
        pair('48', '÷', '6', '96', '÷', '3', false, ['8', '32'], [o('Bölünen iki katına çıktı, bölen yarıya indi; bölüm 4 katına çıkar', true), o('Biri iki katı, öbürü yarısı; bölüm aynı', false, '96 şekeri 3 kişiye paylaştırınca, 48 şekeri 6 kişiye paylaştırmaktan kişi başı daha az mı düşer?', 'Çarpmadaki iki katı–yarısı ilişkisini bölmeye uyguladı'), o('Sayılar farklı, eşit olamaz', false, MIS_SAME, MIS_SAME)]),
        free('37 × 99', '37 × 100 − 37', true, ['3663', '3663'], [o('99 tane 37, 100 tane 37’den bir 37 eksik', true), o('100 − 37 değil 100 − 1 olmalıydı', false, '99 tane 37 düşün. 100 tane 37’den kaç tane çıkarmalısın? Bir tane 37 kaç eder?'), o('Sağ tarafta fazladan işlem var, sonuç büyür', false, 'Fazladan bir çıkarma var: büyütür mü, küçültür mü?')]),
        { kind: 'build', title: 'Kendi denk kesrini kur: [[3/4]] = ?', left: '[[3/4]]', mode: 'frac', target: q(3, 4), init: [1, 2], need: 3 },
      ]
    case 6:
      return [
        pair('0,5', '×', '18', '1', '×', '9', true, ['9', '9'], [o('0,5 iki katına çıktı, 18 yarıya indi; çarpım aynı', true), o('0,5 ile 1 arasında 0,5 fark var, 18 ile 9 arasında 9; eşit değil', false, 'Çarpmada “kaç katı” diye düşün: 0,5’ten 1’e kaç katı?', 'Çarpmada toplamsal düşündü'), o('Ondalıklı çarpma sonucu hep küçültür', false, '0,5 ile çarpmak 18’in yarısını almak demek. 9 da 9 × 1. Hangisi küçük?', 'Ondalıkla çarpmanın her zaman küçülttüğünü sandı')]),
        pair('4,7', '+', '2,8', '5', '+', '2,5', true, ['7,5', '7,5'], [o('4,7’ye 0,3 eklendi, 2,8’den 0,3 çıkarıldı; toplam aynı', true), o('5 tam sayı, sağ taraf daha büyük', false, 'Oklara bak: biri ne kadar arttı, öbürü ne kadar azaldı?'), o('Ondalık basamak sayısı farklı, eşit olamaz', false, '2,5 ile 2,50 farklı mı?')]),
        pair('3,6', '÷', '0,4', '36', '÷', '4', true, ['9', '9'], [o('Bölünen de bölen de 10 katına çıktı; bölüm aynı', true), o('36 ÷ 4 sayıları daha büyük, bölüm de büyük', false, '3,6 metre ipten 0,4 metrelik parçalar ile 36 dm ipten 4 dm’lik parçalar: kaç parça?'), o('Virgül kaldırılınca sonuç değişmez, her zaman böyle', false, 'Yalnız birini 10 katına çıkarsaydık ne olurdu? Neden ikisi birden?', 'Virgülü kaydırmayı anlamdan kopuk bir kural olarak kullandı')]),
        pair('1,2', '+', '0,9', '1,3', '+', '1', false, ['2,1', '2,3'], [o('İki sayı da 0,1 arttı; sağ taraf 0,2 fazla', true), o('Biri arttı biri azaldı; toplam aynı', false, 'Oklara bak: 0,9’dan 1’e, 1,2’den 1,3’e. Ne yöne gittiler?'), o('1 tam sayı, toplam da yuvarlak, eşittir', false, 'Yuvarlak olmak değeri korur mu?')]),
        free('[[1/2]] + [[1/4]]', '[[2/6]]', false, ['0,75', '≈ 0,33'], [o('Sol taraf [[1/2]]’den büyük, [[2/6]] ise [[1/2]]’den küçük', true), o('Paylar ve paydalar toplanınca doğru sonuç çıkar', false, '[[1/2]] + [[1/2]] için dene: [[2/4]] mü olur, 1 mi?', 'Kesirleri toplarken pay ve paydaları ayrı ayrı topladı'), o('Paydalar farklı, toplanamaz', false, 'Toplanabilir! [[1/2]] kaç dörtte bir eder?')]),
        { kind: 'build', title: 'Kendi doğru eşitliğini kur: 4,5 + 3,5 = ? + ?', left: '4,5 + 3,5', mode: 'dec', target: q(8), init: [4, 3], need: 3 },
      ]
    case 7:
      return [
        pair('−5', '−', '(−3)', '−5', '+', '3', true, ['−2', '−2'], [o('Bir sayıyı çıkarmak, ters işaretlisini eklemektir', true), o('İki eksi yan yana gelince −5 de +5 olmalı', false, '−5’in önünde bir işlem yok; yalnız −(−3) değişir. Sayı doğrusunda −5’ten başla.', 'İşaret kuralını işlemden bağımsız her sayıya uyguladı'), o('Çıkarma ve toplama farklı işlemler, eşit olamaz', false, '−(−3): 3 tane “borcu” silmek, 3 eklemek gibi değil mi?')]),
        pair('−8', '+', '5', '8', '−', '5', false, ['−3', '3'], [o('Sol taraf negatif (−3), sağ taraf pozitif (3)', true), o('Aynı sayılar, yalnız yerleri değişti; eşittir', false, '−8 ile 8 aynı sayı mı? Sayı doğrusunda nereler?', 'Negatif sayının işaretini görmezden geldi'), o('İkisinde de 8 ile 5 var, fark 3', false, 'Fark 3 ama hangi yönde? −8’den 5 ileri gidince nereye varırsın?')]),
        pair('(−4)', '×', '6', '4', '×', '(−6)', true, ['−24', '−24'], [o('İkisinde de bir negatif çarpan var ve 4 × 6 aynı', true), o('Negatif sayı yer değiştirince sonuç pozitif olur', false, 'Her iki tarafta kaç negatif çarpan var?', 'Çarpmada işaret kuralını yanlış uyguladı'), o('Sayılar farklı, eşit olamaz', false, MIS_SAME, MIS_SAME)]),
        pair('7', '−', '(−2)', '7', '−', '2', false, ['9', '5'], [o('−(−2), 2 eklemek demek; sol taraf 9', true), o('Parantez önemli değil, ikisi de 7 − 2', false, '−2 TL borcu silmek ile 2 TL harcamak aynı mı?', 'Çıkarılan negatif sayının işaretini görmezden geldi'), o('Eksi eksi artı yapar, sağ taraf da 9', false, 'Sağ tarafta kaç eksi var? 7 − 2 kaç?')]),
        pair('−12', '÷', '3', '12', '÷', '(−3)', true, ['−4', '−4'], [o('İkisinde de bir negatif sayı var ve 12 ÷ 3 = 4', true), o('Bölmede negatif yer değiştirirse işaret değişir', false, 'Her iki tarafta kaç negatif sayı var?'), o('Bölünen pozitif, sonuç pozitif', false, 'Bölen negatif. Negatif ÷ pozitif ile pozitif ÷ negatif aynı işaret mi verir?')]),
        { kind: 'build', title: 'Kendi doğru eşitliğini kur: −7 − 4 = ? + ?', left: '−7 − 4', mode: 'int', target: q(-11), init: [0, 0], need: 3 },
      ]
    default:
      return [
        free('4^{3}', '2^{6}', true, ['64', '64'], [o('4 = 2^{2}, (2^{2})^{3} = 2^{6}', true), o('4 × 3 = 12 ve 2 × 6 = 12, o yüzden eşit', false, '4^{3}, 4 × 3 mü demek? 2^{3} ile 3^{2}’yi düşün: 2 × 3 = 3 × 2 ama 8 ile 9!', 'Tabanla üssü çarptı'), o('Tabanlar farklı, eşit olamaz', false, '4’ü 2’nin kuvveti olarak yazabilir misin?')]),
        free('2^{5} + 2^{5}', '2^{6}', true, ['64', '64'], [o('İki tane 2^{5}, yani 2 × 2^{5} = 2^{6}', true), o('Toplamada üsler toplanır, sonuç 2^{10}', false, '2^{5} + 2^{5}: aynı şeyden iki tane. 2^{10} = 1024 bu kadar büyük mü?', 'Toplamada üsleri topladı'), o('Toplama varken kuvvet yazılamaz', false, 'x + x = 2x gibi düşün.')]),
        free('3^{2} + 4^{2}', '7^{2}', false, ['25', '49'], [o('9 + 16 = 25, ama 7^{2} = 49', true), o('Kareler toplanınca tabanlar toplanır', false, '1^{2} + 1^{2} = 2 ama 2^{2} = 4. Bu kural doğru mu?', 'Kareler toplamını toplamın karesi sandı'), o('3 + 4 = 7, o yüzden eşit', false, 'Karesini almak sayıları nasıl değiştirir? 3^{2} kaç?')]),
        free('10^{3} × 10^{2}', '10^{6}', false, ['100 000', '1 000 000'], [o('Çarpımda üsler toplanır: 10^{5}', true), o('Üsler çarpılır: 3 × 2 = 6, eşittir', false, '1000 × 100 kaç sıfırlı?', 'Aynı tabanlı çarpımda üsleri çarptı'), o('10’un kuvvetleri hep eşittir', false, '10^{2} ile 10^{3} eşit mi?')]),
        free('√{12}', '2√{3}', true, ['≈ 3,46', '≈ 3,46'], [o('12 = 4 × 3 ve √{4} = 2', true), o('√{12} = 6, çünkü 12’nin yarısı', false, '6 × 6 kaç eder? Karekök yarısı mı demek?', 'Karekökü ikiye bölmekle karıştırdı'), o('Kök dışına sayı çıkamaz', false, '√{4 × 3} = √{4} × √{3} olabilir mi?')]),
        { kind: 'build', title: 'Kendi doğru eşitliğini kur: 2^{3} × 2^{4} = 2^{?} × 2^{?}', left: '2^{3} × 2^{4}', mode: 'pow', target: q(7), init: [1, 1], need: 3 },
      ]
  }
}

// ───────────────────────── Terazi ─────────────────────────

function Balance({ look, left, right, tilt, hidden, lv, rv }: { look: Look; left: string; right: string; tilt: number; hidden?: boolean; lv?: string; rv?: string }) {
  const a = hidden ? 0 : Math.max(-9, Math.min(9, tilt * 9))
  const beam = look.dark ? '#94a3b8' : '#475569'
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-label={hidden ? 'Terazi kapalı' : tilt === 0 ? 'Terazi dengede' : 'Terazi dengede değil'}>
      <svg viewBox="0 0 400 240" className="block w-full">
        <polygon points="200,120 178,230 222,230" fill={beam} />
        <rect x={150} y={226} width={100} height={10} rx={5} fill={beam} />
        <g style={{ transform: `rotate(${a}deg)`, transformOrigin: '200px 120px', transition: 'transform 700ms cubic-bezier(.34,1.56,.64,1)' }}>
          <rect x={30} y={114} width={340} height={10} rx={5} fill={beam} />
          <circle cx={200} cy={119} r={10} fill={hidden ? '#f59e0b' : tilt === 0 ? '#22c55e' : '#ef4444'} stroke="#fff" strokeWidth={3} />
          {hidden && <text x={200} y={124} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">?</text>}
          <line x1={60} y1={124} x2={60} y2={154} stroke={beam} strokeWidth={2} />
          <line x1={340} y1={124} x2={340} y2={154} stroke={beam} strokeWidth={2} />
          <path d="M 10 154 L 110 154 L 96 170 L 24 170 Z" fill={look.dark ? '#334155' : '#e0e7ff'} stroke={beam} strokeWidth={2} />
          <path d="M 290 154 L 390 154 L 376 170 L 304 170 Z" fill={look.dark ? '#334155' : '#e0e7ff'} stroke={beam} strokeWidth={2} />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-[1%] text-center">
        <span className="w-[32%] text-[clamp(16px,3.6vw,22px)] font-black"><MathText text={left} />{!hidden && lv && <span className="block text-brand">= <MathText text={lv} /></span>}</span>
        <span className="w-[32%] text-[clamp(16px,3.6vw,22px)] font-black"><MathText text={right} />{!hidden && rv && <span className="block text-brand">= <MathText text={rv} /></span>}</span>
      </div>
    </div>
  )
}

// ───────────────────────── Eşleştirme ─────────────────────────

function relation(a: Tok, b: Tok, k: OpK): string {
  if (qEq(a.v, b.v)) return 'aynı'
  if (qEq(a.v, q(-b.v.n, b.v.d))) return 'ters işaret'
  if (k === '+' || k === '−') {
    const d = qSub(b.v, a.v)
    return `${d.n > 0 ? '+' : '−'}${fmtN(Math.abs(qNum(d)))}`
  }
  const r = qDiv(b.v, a.v)
  if (r.n < 0) return 'işaret değişti'
  if (r.d === 1) return `×${fmtN(r.n)}`
  if (r.n === 1) return `÷${fmtN(r.d)}`
  return `×${fmtQ(r)}`
}

function TokChip({ tok, look, side, idx, sel, linked, onTap, onDropTo }: { tok: Tok; look: Look; side: 'L' | 'R'; idx: number; sel: boolean; linked: boolean; onTap: () => void; onDropTo: (t: string | null) => void }) {
  const dd = useDragDrop({ onDrop: onDropTo, onTap, disabled: side === 'R' })
  const base = `grid ${look.big ? 'min-h-16 min-w-16' : 'min-h-14 min-w-14'} place-items-center rounded-2xl px-3 text-2xl font-black tabular-nums transition sm:text-3xl`
  const cls = sel ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-200' : linked ? (look.dark ? 'bg-cyan-500/20 text-cyan-100 ring-2 ring-cyan-400' : 'bg-sky-100 text-sky-900 ring-2 ring-sky-300') : look.dark ? 'bg-slate-800 text-white ring-2 ring-slate-600' : 'bg-white text-ink ring-2 ring-line shadow-[0_3px_0_#e7e8f2]'
  if (side === 'R')
    return (
      <button type="button" data-drop={`R${idx}`} data-tok={`R${idx}`} onClick={onTap} className={`${base} ${cls}`} aria-label={`Sağdaki ${tok.t}`}>
        {tok.t}
      </button>
    )
  return (
    <button type="button" {...dd.bind()} onClick={dd.onClick} style={dd.style} data-handle data-tok={`L${idx}`} className={`${base} ${cls} cursor-grab`} aria-label={`Soldaki ${tok.t}`} aria-pressed={sel}>
      {tok.t}
    </button>
  )
}

function LinkBoard({ look, item, links, setLinks, enabled }: { look: Look; item: Item; links: Record<number, number>; setLinks: (l: Record<number, number>) => void; enabled: boolean }) {
  const L = item.L!, R = item.R!
  const box = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState<number | null>(null)
  const [geo, setGeo] = useState<{ w: number; h: number; pts: Record<string, { x: number; y: number }> }>({ w: 0, h: 0, pts: {} })
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const pts: Record<string, { x: number; y: number }> = {}
      el.querySelectorAll<HTMLElement>('[data-tok]').forEach((n) => {
        const b = n.getBoundingClientRect()
        pts[n.dataset.tok!] = { x: b.left - r.left + b.width / 2, y: b.bottom - r.top }
      })
      setGeo({ w: r.width, h: r.height, pts })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [item])
  const link = (li: number, rj: number) => {
    if (!enabled) return
    setLinks({ ...links, [li]: rj })
    setSel(null)
    sfx.ok()
  }
  const toks = (side: 'L' | 'R', tr: [Tok, OpK, Tok]) => {
    const frac = tr[1] === 'frac'
    const chip = (i: 0 | 2) => {
      const idx = i === 0 ? 0 : 1
      return (
        <TokChip key={`${side}${idx}`} tok={tr[i] as Tok} look={look} side={side} idx={idx} sel={side === 'L' && sel === idx} linked={side === 'L' ? links[idx] !== undefined : Object.values(links).includes(idx)}
          onTap={() => (side === 'L' ? enabled && setSel(sel === idx ? null : idx) : sel !== null && link(sel, idx))}
          onDropTo={(t) => t?.startsWith('R') && link(idx, Number(t.slice(1)))} />
      )
    }
    if (frac)
      return (
        <span className="inline-flex flex-col items-center gap-1">
          {chip(0)}
          <span className={`h-1 w-16 rounded-full ${look.dark ? 'bg-slate-300' : 'bg-ink'}`} />
          {chip(2)}
        </span>
      )
    return (
      <span className="inline-flex items-center gap-2">
        {chip(0)}
        <span className={`text-3xl font-black ${look.muted}`}>{opStr(tr[1])}</span>
        {chip(2)}
      </span>
    )
  }
  const arcs = Object.entries(links).map(([li, rj]) => {
    const a = geo.pts[`L${li}`], b = geo.pts[`R${rj}`]
    if (!a || !b) return null
    const k = L[1] === 'frac' ? L[1] : L[1]
    const lab = relation(L[Number(li) === 0 ? 0 : 2] as Tok, R[rj === 0 ? 0 : 2] as Tok, k === 'frac' ? '×' : k)
    const dip = 30 + Number(li) * 26
    const my = Math.max(a.y, b.y) + dip
    return (
      <g key={li}>
        <path d={`M ${a.x} ${a.y + 4} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y + 10}`} fill="none" stroke={look.dark ? '#22d3ee' : '#0284c7'} strokeWidth={3} markerEnd="url(#arrowhead)" />
        <g transform={`translate(${b.x + Math.max(30, lab.length * 4.6 + 8) + 4} ${b.y + 22})`}>
          <rect x={-Math.max(30, lab.length * 4.6 + 8)} y={-14} width={Math.max(60, lab.length * 9.2 + 16)} height={26} rx={13} fill={look.dark ? '#0e7490' : '#0284c7'} />
          <text textAnchor="middle" y={5} fontSize={14} fontWeight={900} fill="#fff">{lab}</text>
        </g>
      </g>
    )
  })
  return (
    <div ref={box} className="relative pb-24">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
        {toks('L', L)}
        <span className={`text-4xl font-black ${look.strong}`}>=</span>
        {toks('R', R)}
      </div>
      <svg className="pointer-events-none absolute inset-0" width={geo.w} height={geo.h} aria-hidden>
        <defs>
          <marker id="arrowhead" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill={look.dark ? '#22d3ee' : '#0284c7'} /></marker>
        </defs>
        {arcs}
      </svg>
      {enabled && <p className={`absolute inset-x-0 bottom-0 text-center text-sm font-bold ${look.muted}`}>{sel !== null ? 'Şimdi sağdaki eşine dokun.' : 'Soldaki bir sayıyı sağdaki eşine sürükle ya da sırayla ikisine dokun.'}</p>}
    </div>
  )
}

// ───────────────────────── Görevler ─────────────────────────

type Say = { q: string; tone?: 'ok'; mis?: string; k: number } | null
interface Res { first: boolean; ways: number }

function ItemTask({ item, grade, look, onDone, last }: { item: Item; grade: Grade; look: Look; onDone: (r: Res) => void; last: boolean }) {
  const track = useTracker()
  const [say, setSay] = useState<Say>(null)
  const nudge = (q: string, tone?: 'ok', mis?: string) => setSay((s) => ({ q, tone, mis, k: (s?.k ?? 0) + 1 }))
  const pairs = !!item.L
  const [phase, setPhase] = useState<'verdict' | 'link' | 'reason' | 'reveal'>('verdict')
  const [verdict, setVerdict] = useState<boolean | null>(null)
  const [links, setLinks] = useState<Record<number, number>>({})
  const [bad, setBad] = useState<string[]>([])
  const misses = useRef(0)
  const firstVerdict = useRef<boolean | null>(null)
  const order = useMemo(() => [...item.reasons].sort(() => Math.random() - 0.5), [item])

  const decide = (v: boolean) => {
    setVerdict(v)
    if (firstVerdict.current === null) firstVerdict.current = v
    setSay(null)
    setPhase(pairs ? 'link' : 'reason')
  }
  const linkedAll = Object.keys(links).length >= 2
  const pickReason = (r: Opt) => {
    if (!r.ok) {
      misses.current++
      track.attempt(false)
      setBad((b) => [...b, r.t])
      return nudge(r.why ?? 'Bir daha düşün.', undefined, r.mis)
    }
    const right = verdict === item.ok
    track.attempt(right)
    if (!right) misses.current++
    sfx.ok()
    setPhase('reveal')
    track.item(firstVerdict.current === item.ok && misses.current === 0)
    nudge(right ? `Hem kararın hem gerekçen doğru! Hesaplamadan ${item.ok ? 'eşit olduğunu' : 'eşit olmadığını'} gösterdin.` : `Gerekçe doğru! Ama ilk kararın “${verdict ? 'Doğru' : 'Yanlış'}” idi. Gerekçeye göre eşitlik ${item.ok ? 'doğru' : 'yanlış'}. Teraziye bak.`, right ? 'ok' : undefined)
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Scene grade={grade}>
        <Balance look={look} left={item.left} right={item.right} tilt={item.ok ? 0 : num(item.show[0]) > num(item.show[1]) ? -1 : 1} hidden={phase !== 'reveal'} lv={item.show[0]} rv={item.show[1]} />
        <div className="mt-2">
          {pairs ? (
            <LinkBoard look={look} item={item} links={links} setLinks={setLinks} enabled={phase === 'link'} />
          ) : (
            <p className={`py-4 text-center text-3xl font-black sm:text-4xl ${look.strong}`}><MathText text={`${item.left} = ${item.right}`} /></p>
          )}
        </div>
      </Scene>
      <div className="space-y-3 lg:sticky lg:top-20">
        <Panel look={look} title={phase === 'verdict' ? 'Hesaplamadan karar ver' : phase === 'link' ? 'Kanıtla: sayıları eşleştir' : phase === 'reason' ? 'Neden? Gerekçeni seç' : 'Terazi açıldı!'} icon={<Scale size={20} className="mt-0.5 shrink-0 text-violet-500" />}>
          {phase === 'verdict' && (
            <>
              <p className={`mb-3 text-[15px] font-semibold ${look.muted}`}>İşlem yapmak yok! Sayılar arasındaki ilişkiye bak. Bu eşitlik doğru mu?</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => decide(true)} className={`${look.h} rounded-2xl bg-emerald-500 text-lg font-black text-white shadow-[0_4px_0_#15803d] active:translate-y-0.5`}><Check className="mr-1 inline" size={22} />Doğru</button>
                <button type="button" onClick={() => decide(false)} className={`${look.h} rounded-2xl bg-rose-500 text-lg font-black text-white shadow-[0_4px_0_#be123c] active:translate-y-0.5`}><X className="mr-1 inline" size={22} />Yanlış</button>
              </div>
            </>
          )}
          {phase !== 'verdict' && verdict !== null && <p className={`mb-2 text-sm font-black ${look.muted}`}>Kararın: <span className={verdict ? 'text-emerald-500' : 'text-rose-500'}>{verdict ? 'Doğru' : 'Yanlış'}</span></p>}
          {phase === 'link' && (
            <>
              <p className={`text-[15px] font-semibold ${look.muted}`}>Soldaki iki sayıyı sağdaki eşlerine bağla. Oklar her sayının nasıl değiştiğini gösterecek.</p>
              <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" disabled={!linkedAll} onClick={() => setPhase('reason')}><Link2 size={20} />Bağladım</button>
              <button type="button" className={`btn-ghost mt-2 w-full ${look.dark ? '!bg-slate-700 !text-white !ring-slate-500' : ''}`} onClick={() => setPhase('verdict')}>Kararımı değiştir</button>
            </>
          )}
          {phase === 'reason' && <div className="grid gap-2">{order.map((r) => <Choice key={r.t} look={look} text={r.t} state={bad.includes(r.t) ? 'wrong' : 'idle'} onClick={() => pickReason(r)} />)}</div>}
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} misconception={say.mis} onClose={() => setSay(null)} />}
          {phase === 'reveal' && (
            <>
              <StrategyPicker question="Nasıl karar verdin?" options={['Sayıların nasıl değiştiğine baktım', 'Kafamdan hesapladım', 'Tahmin ettim', 'Bir model düşündüm']} onPick={() => {}} />
              <NextButton last={last} onClick={() => onDone({ first: firstVerdict.current === item.ok && misses.current === 0, ways: 0 })} />
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

function DoubleHalf({ look, label, value, onChange }: { look: Look; label: string; value: number; onChange: (v: number) => void }) {
  const b = `min-h-12 rounded-xl px-3 text-base font-black transition active:scale-95 disabled:opacity-30 ${look.key}`
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-xs font-black tracking-wide uppercase ${look.muted}`}>{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" className={b} disabled={value % 2 !== 0} onClick={() => onChange(value / 2)} aria-label={`${label} yarıya indir`}>÷2</button>
        <button type="button" className={b} disabled={value % 5 !== 0} onClick={() => onChange(value / 5)} aria-label={`${label} beşte birine indir`}>÷5</button>
        <span className={`grid min-w-16 place-items-center text-2xl font-black tabular-nums ${look.strong}`}>{value}</span>
        <button type="button" className={b} disabled={value > 400} onClick={() => onChange(value * 2)} aria-label={`${label} iki katına çıkar`}>×2</button>
        <button type="button" className={b} disabled={value > 400} onClick={() => onChange(value * 5)} aria-label={`${label} beş katına çıkar`}>×5</button>
      </div>
    </div>
  )
}

function BuildTask({ t, grade, look, onDone, sols }: { t: Build; grade: Grade; look: Look; onDone: (r: Res) => void; sols: ReturnType<typeof useSolutions> }) {
  const track = useTracker()
  const [x, setX] = useState(t.init[0])
  const [y, setY] = useState(t.init[1])
  const [say, setSay] = useState<Say>(null)
  const [found, setFound] = useState<string[]>([])
  const [phase, setPhase] = useState<'build' | 'done'>('build')
  const nudge = (q: string, tone?: 'ok') => setSay((s) => ({ q, tone, k: (s?.k ?? 0) + 1 }))
  const X = q(Math.round(x * 100), 100), Y = q(Math.round(y * 100), 100)
  const val: Q = t.mode === 'add' || t.mode === 'dec' || t.mode === 'int' ? qAdd(X, Y) : t.mode === 'mul' ? qMul(X, Y) : t.mode === 'frac' ? (y === 0 ? q(NaN) : qDiv(X, Y)) : q(x + y)
  const eq = Number.isFinite(val.n) && qEq(val, t.target)
  const right =
    t.mode === 'frac' ? `[[${x}/${y}]]` : t.mode === 'pow' ? `2^{${x}} × 2^{${y}}` : t.mode === 'mul' ? `${x} × ${y}` : `${fmtN(x)} + ${y < 0 ? `(${fmtN(y)})` : fmtN(y)}`
  const key = t.mode === 'frac' ? `${x}/${y}` : [x, y].sort((a, b) => a - b).join('|')
  const sameAsLeft = t.mode === 'frac' ? x === 3 && y === 4 : t.mode === 'add' ? key === '38|47' : t.mode === 'mul' ? key === '16|25' : t.mode === 'pow' ? key === '3|4' : t.mode === 'dec' ? key === '3.5|4.5' : key === '-7|-4'
  const tilt = !Number.isFinite(val.n) ? 0 : eq ? 0 : qNum(val) > qNum(t.target) ? 1 : -1
  const save = () => {
    if (!eq) {
      track.attempt(false)
      return nudge(t.mode === 'pow' ? 'Terazi dengede mi? 2^{3} × 2^{4}’te toplam kaç tane 2 çarpılıyor? Senin tarafında kaç tane?' : 'Terazi dengede değil. Hangi tarafa eğik? Bir sayıyı artırınca öbürünü ne yapmalısın?')
    }
    if (sameAsLeft) return nudge('Bu, sol tarafın aynısı! Sayıları değiştirerek yeni bir eşitlik kur.')
    if (found.includes(key)) return nudge('Bu eşitliği zaten buldun. Başka sayılar dene.')
    track.attempt(true)
    sfx.ok()
    sols.add(`b:${key}`, `${t.left} = ${right}`)
    const nf = [...found, key]
    setFound(nf)
    if (nf.length >= t.need) {
      track.item(true)
      setPhase('done')
      nudge(`${nf.length} farklı doğru eşitlik kurdun! Sonsuz sayıda olabilir mi?`, 'ok')
    } else nudge(`Harika! ${t.need - nf.length} tane daha bulabilir misin?`, 'ok')
  }
  const controls: ReactNode =
    t.mode === 'mul' ? (
      <div className="grid gap-3"><DoubleHalf look={look} label="1. çarpan" value={x} onChange={setX} /><DoubleHalf look={look} label="2. çarpan" value={y} onChange={setY} /></div>
    ) : (
      <div className="flex flex-wrap justify-center gap-4">
        <Stepper look={look} label={t.mode === 'frac' ? 'Pay' : t.mode === 'pow' ? '1. üs' : '1. sayı'} value={x} onChange={setX} min={t.mode === 'int' ? -30 : t.mode === 'frac' || t.mode === 'pow' ? 0 : 0} max={t.mode === 'frac' ? 60 : t.mode === 'pow' ? 10 : 100} step={t.mode === 'dec' ? 0.5 : 1} />
        <Stepper look={look} label={t.mode === 'frac' ? 'Payda' : t.mode === 'pow' ? '2. üs' : '2. sayı'} value={y} onChange={setY} min={t.mode === 'int' ? -30 : t.mode === 'frac' ? 1 : 0} max={t.mode === 'frac' ? 80 : t.mode === 'pow' ? 10 : 100} step={t.mode === 'dec' ? 0.5 : 1} />
      </div>
    )
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Scene grade={grade}>
        <Balance look={look} left={t.left} right={right} tilt={tilt} lv={undefined} />
        <p className={`mt-2 text-center text-3xl font-black sm:text-4xl ${look.strong}`}><MathText text={`${t.left} ${eq ? '=' : '≠'} ${right}`} /></p>
        <div className="mt-4">{controls}</div>
      </Scene>
      <div className="space-y-3 lg:sticky lg:top-20">
        <Panel look={look} title={`Doğru eşitliklerin: ${found.length} / ${t.need}`} icon={<Scale size={20} className="mt-0.5 shrink-0 text-violet-500" />}>
          <p className={`text-[15px] font-semibold ${look.muted}`}>Sağ taraftaki sayıları değiştir. Terazi dengeye gelince kaydet.</p>
          {phase === 'build' && <button type="button" className="btn-primary mt-3 min-h-14 w-full text-lg" onClick={save}><Check size={20} />Eşitliği kaydet</button>}
          <ul className="mt-3 space-y-1.5">{sols.list.filter((s) => s.key.startsWith('b:')).map((s) => <li key={s.key} className={`rounded-xl px-3 py-2 text-[15px] font-extrabold ${look.dark ? 'bg-emerald-400/10 text-emerald-200' : 'bg-emerald-50 text-emerald-900'}`}><MathText text={s.label} /></li>)}</ul>
          {say && <Nudge key={say.k} question={say.q} tone={say.tone} onClose={() => setSay(null)} />}
          {phase === 'done' && (
            <>
              <StrategyPicker question="Yeni eşitlikleri nasıl kurdun?" options={['Birini artırıp öbürünü azalttım', 'Birini katlayıp öbürünü böldüm', 'Deneyerek', 'Önce sonucu hesapladım']} onPick={() => {}} />
              <NextButton last onClick={() => onDone({ first: true, ways: found.length })} />
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}

// ───────────────────────── Ana bileşen ─────────────────────────

export default function IslemDogruMu({ grade, onFinish }: InteractionProps) {
  const look = useLook(grade)
  const tasks = useMemo(() => tasksFor(grade), [grade])
  const [i, setI] = useState(0)
  const sols = useSolutions()
  const firsts = useRef(0)
  const t = tasks[i]
  const last = i === tasks.length - 1
  const done = (r: Res) => {
    if (r.first) firsts.current++
    if (!last) {
      setI(i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const judged = tasks.filter((x) => x.kind === 'item').length
    const stars = (firsts.current >= judged ? 3 : firsts.current >= Math.ceil(judged / 2) ? 2 : 1) as 1 | 2 | 3
    onFinish({
      summary: `${judged} eşitliği hesaplamadan değerlendirdin; ilk kararında ${Math.min(firsts.current, judged)} kez isabet ettin ve ${sols.list.length} kendi eşitliğini kurdun.`,
      insight:
        grade <= 4
          ? 'Eşittir işareti “iki taraf aynı değerde” demektir. Toplamada birinden alıp diğerine verirsen, çarpmada birini katlayıp diğerini bölersen değer korunur.'
          : grade <= 6
            ? 'İlişkilere bakmak hesaplamaktan hızlıdır: pay ve paydayı aynı sayıyla çarpmak, bölünen ve böleni aynı sayıyla çarpmak değeri korur; aynı sayıyı eklemek korumaz.'
            : grade === 7
              ? 'Bir sayıyı çıkarmak, ters işaretlisini eklemektir; çarpım ve bölümün işaretini negatif çarpanların sayısı belirler.'
              : 'Üslü ifadelerde ilişkiler: aynı tabanlı çarpımda üsler toplanır, kuvvetin kuvvetinde çarpılır; kareler toplamı toplamın karesi değildir.',
      stars,
    })
  }
  const title = t.kind === 'build' ? t.title : 'Bu eşitlik doğru mu? Hesaplamadan karar ver.'
  return (
    <div>
      <TopBar look={look} step={i} total={tasks.length} title={title} emoji={t.kind === 'build' ? '⚖️' : '🤔'} />
      {t.kind === 'item' ? <ItemTask key={i} item={t} grade={grade} look={look} onDone={done} last={last} /> : <BuildTask key={i} t={t} grade={grade} look={look} onDone={done} sols={sols} />}
    </div>
  )
}
