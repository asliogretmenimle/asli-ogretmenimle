import type { Grade } from '../../data/types'
import type { Shape } from './ortak'

/**
 * Özellik kartları. Her kart: hangi özellikler isteniyor, kaç farklı şekil, yanlışta hangi soruyu soralım,
 * 4–5. sınıfta “her zaman / bazen / asla” sorusu.
 */

export type Freq = 'her' | 'bazen' | 'asla'
export interface Follow {
  q: string
  answer: Freq
  why: string
  nudge: Partial<Record<Freq, string>>
}
export interface ShapeCard {
  id: string
  emoji: string
  text: string
  /** kaç farklı (eş olmayan) şekil */
  need: number
  test: (s: Shape) => boolean
  /** yanlış şekil için düşündüren soru */
  why: (s: Shape) => { q: string; mis?: string }
  follow?: Follow
  /** yapılamaz kart: “Bence yapılamaz” doğru cevap */
  impossible?: { reasons: { t: string; ok: boolean; nudge?: string }[]; insight: string }
  /** yapılabilir ama çoğu öğrenci yapılamaz sanar */
  tricky?: string
  /** bulunan şeklin adı */
  name?: (s: Shape) => string
}

const kenar = (s: Shape) => `Şeklinin kaç kenarı var? Kenarları tek tek say: ${s.n} oldu.`
const axisAligned = (s: Shape) => s.sides.every(([x, y]) => x === 0 || y === 0)
const triKind = (s: Shape) => (s.right ? 'dik açılı üçgen' : s.angles.includes('genis') ? 'geniş açılı üçgen' : 'dar açılı üçgen')

export const FREQ_LABEL: Record<Freq, string> = { her: 'Her zaman', bazen: 'Bazen', asla: 'Asla' }

export function cardsFor(grade: Grade): ShapeCard[] {
  const tri: ShapeCard = {
    id: 'ucgen',
    emoji: '🔺',
    text: 'Üç köşeli bir şekil yap. Sonra ondan **farklı** bir tane daha!',
    need: 2,
    test: (s) => s.n === 3,
    why: (s) => ({ q: `Köşeleri parmağınla say. Kaç köşe oldu? (${s.n}) Kartta kaç köşe istiyor?` }),
    name: () => 'üçgen',
  }
  const sq: ShapeCard = {
    id: 'kare',
    emoji: '🟪',
    text: 'Dört kenarı eşit, köşeleri kitap köşesi gibi olan bir **kare** yap. Bir büyük, bir küçük kare!',
    need: 2,
    test: (s) => s.kind === 'kare',
    why: (s) =>
      s.n !== 4
        ? { q: kenar(s) + ' Karenin kaç kenarı olmalı?' }
        : s.right === 4
          ? { q: 'Köşelerin güzel! Kenarlarını say: hepsi aynı uzunlukta mı?', mis: 'Dikdörtgeni kare sandı' }
          : { q: 'Köşelerinden biri kitap köşesine benziyor mu? Bir kâğıdın köşesini şeklinin köşesine koyduğunu düşün.' },
    name: () => 'kare',
  }
  const rect: ShapeCard = {
    id: 'dikdortgen',
    emoji: '🟩',
    text: 'Kare **olmayan** iki farklı dikdörtgen yap.',
    need: 2,
    test: (s) => s.kind === 'dikdörtgen',
    why: (s) =>
      s.kind === 'kare'
        ? { q: 'Bu bir kare: dört kenarı da eşit. Kartta “kare olmasın” diyor. Bir kenarını uzatabilir misin?' }
        : s.n !== 4
          ? { q: kenar(s) + ' Dikdörtgenin kaç kenarı var?' }
          : { q: 'Dikdörtgenin dört köşesi de kitap köşesi gibidir. Seninkinde hangi köşe eğik duruyor?' },
    name: () => 'dikdörtgen',
  }
  const odd4: ShapeCard = {
    id: 'dortgen',
    emoji: '🪁',
    text: 'Dört köşeli ama **kare de dikdörtgen de olmayan** bir şekil yap. İki farklı tane!',
    need: 2,
    test: (s) => s.n === 4 && s.kind !== 'kare' && s.kind !== 'dikdörtgen',
    why: (s) => (s.n !== 4 ? { q: `Köşelerini say: ${s.n} oldu. Kart kaç köşe istiyor?` } : { q: 'Bu bir ' + s.kind + '! Bir köşesini başka bir çiviye kaydırırsan ne olur?' }),
    name: (s) => (s.kind === 'dörtgen' ? 'dörtgen' : s.kind),
  }
  const tilted: ShapeCard = {
    id: 'egikkare',
    emoji: '💠',
    text: '**Eğik duran** bir kare yap: kenarları çizgilerin üstünde olmasın.',
    need: 1,
    test: (s) => s.kind === 'kare' && !axisAligned(s),
    why: (s) =>
      s.kind === 'kare'
        ? { q: 'Bu kare dimdik duruyor. Kareyi döndürsen yine kare olur mu? Bir köşeden “2 sağa 1 aşağı” gidip sonra köşeyi döndürerek devam etmeyi dene.' }
        : s.n === 4 && s.allEq
          ? { q: 'Dört kenar eşit, harika! Peki köşeler kare köşesi mi? Kâğıdın köşesini koyduğunu düşün.', mis: 'Kenarları eşit dörtgeni (eşkenar dörtgen) kare sandı' }
          : s.n === 4
            ? { q: 'Dört kenarını karşılaştır: hepsi aynı uzunlukta mı? Her kenarda kaç sağa, kaç aşağı gittin?', mis: 'Eğik duran kareyi kenar eşitliğine bakmadan kurdu' }
            : { q: kenar(s) + ' Karenin kaç kenarı var?' },
    name: () => 'eğik kare',
  }
  const penta: ShapeCard = {
    id: 'besgen',
    emoji: '🏠',
    text: 'Beş kenarlı iki farklı şekil yap.',
    need: 2,
    test: (s) => s.n === 5,
    why: (s) => ({ q: `${kenar(s)} Bir kenarın ortasına yeni bir köşe ekleyince ne olur? (Dümdüz bir çizgi üstündeki nokta köşe sayılmaz!)` }),
    name: () => 'beşgen',
  }
  const hexa: ShapeCard = {
    id: 'altigen',
    emoji: '⬡',
    text: 'Altı kenarlı bir şekil yap.',
    need: 1,
    test: (s) => s.n === 6,
    why: (s) => ({ q: `${kenar(s)} Altı köşe koymak için bir kenarı “kırabilir” misin?` }),
    name: () => 'altıgen',
  }
  const noRight4: ShapeCard = {
    id: 'dikyok4',
    emoji: '🔷',
    text: 'Dört kenarlı, **hiç kare köşesi (dik açısı) olmayan** iki farklı şekil yap.',
    need: 2,
    test: (s) => s.n === 4 && s.right === 0,
    why: (s) => (s.n !== 4 ? { q: kenar(s) } : { q: `Şeklinde ${s.right} tane kare köşesi var. Bir köşeyi bir çivi kaydırınca köşe nasıl değişir?` }),
    name: (s) => (s.kind === 'dörtgen' ? 'dörtgen' : s.kind),
  }
  const rightTri: ShapeCard = {
    id: 'dikucgen',
    emoji: '📐',
    text: '**Dik açısı olan** bir üçgen yap. Sonra farklı bir tane daha!',
    need: 2,
    test: (s) => s.n === 3 && s.right === 1,
    why: (s) => (s.n !== 3 ? { q: kenar(s) + ' Üçgenin kaç kenarı var?' } : { q: 'Üçgeninin köşelerinden hangisi kare köşesine benziyor? Hiçbiri değilse, bir köşeyi çizgilerin kesiştiği gibi yapmayı dene.' }),
    name: () => 'dik üçgen',
  }
  const acuteTri: ShapeCard = {
    id: 'darucgen',
    emoji: '🔻',
    text: '**Hiç dik açısı olmayan** iki farklı üçgen yap.',
    need: 2,
    test: (s) => s.n === 3 && s.right === 0,
    why: (s) => (s.n !== 3 ? { q: kenar(s) } : { q: 'Bu üçgenin bir köşesi tam kare köşesi! Bir köşesini bir çivi kaydırırsan açı nasıl değişir?' }),
    name: (s) => triKind(s),
  }
  const twoRight: ShapeCard = {
    id: 'ikidik',
    emoji: '🧱',
    text: '**Tam 2 dik açısı** olan dört kenarlı iki farklı şekil yap.',
    need: 2,
    test: (s) => s.n === 4 && s.right === 2,
    why: (s) =>
      s.n !== 4
        ? { q: kenar(s) }
        : s.right === 4
          ? { q: 'Dört köşen de dik oldu. Sadece bir kenarı eğik yapsan kaç dik açı kalır?' }
          : { q: `Şeklinde ${s.right} dik açı var. İki komşu köşeyi dik yapmak için kenarlardan biri tahtanın çizgisi boyunca gidebilir mi?` },
    name: (s) => (s.kind === 'dörtgen' ? 'dörtgen' : s.kind),
  }
  const concave6: ShapeCard = {
    id: 'icbukey6',
    emoji: '🌙',
    text: 'Altı kenarlı, **içe göçük** (girintili) bir şekil yap.',
    need: 1,
    test: (s) => s.n === 6 && !s.convex,
    why: (s) => (s.n !== 6 ? { q: kenar(s) } : { q: 'Altı kenar tamam! Bir köşeyi şeklin içine doğru it: kenarlar içeri göçüyor mu?' }),
    name: () => 'iç bükey altıgen',
  }
  const obtuseTri: ShapeCard = {
    id: 'genisucgen',
    emoji: '🔼',
    text: '**Geniş açılı** bir üçgen yap (bir açısı dik açıdan büyük). Sonra farklı bir tane daha!',
    need: 2,
    test: (s) => s.n === 3 && s.angles.includes('genis'),
    why: (s) =>
      s.n !== 3
        ? { q: kenar(s) }
        : s.right
          ? { q: 'Bu açı tam dik. Dik açıdan biraz daha “açmak” için hangi köşeyi kaydırmalısın?' }
          : { q: 'Üç açının üçü de dik açıdan küçük. Bir köşeyi diğer ikisinin arasına doğru basık hâle getirirsen ne olur?', mis: 'Uzun kenarlı üçgeni geniş açılı sandı' },
    name: () => 'geniş açılı üçgen',
    follow: {
      q: 'Geniş açılı bir üçgenin **diğer iki açısı** dar açıdır.',
      answer: 'her',
      why: 'Üçgende ikinci bir geniş (ya da dik) açı açılınca kenarlar bir daha birleşemez; diğer iki açı her zaman dardır.',
      nudge: { bazen: 'Tahtada iki geniş açılı bir üçgen yapmayı dene. Kenarlar buluşabiliyor mu?', asla: 'Az önce yaptığın üçgene bak: geniş açı dışındaki iki açı dik açıdan küçük mü, büyük mü?' },
    },
  }
  const rightTri4: ShapeCard = {
    ...rightTri,
    follow: {
      q: 'Bir üçgenin **iki dik açısı** olabilir.',
      answer: 'asla',
      why: 'İki köşe dik olunca o iki kenar birbirine paralel olur, hiç buluşmaz; üçgen kapanmaz.',
      nudge: { her: 'Tahtada iki dik açılı bir üçgen yapmayı dene. Dik kenarlar nerede buluşuyor?', bazen: 'Bir örnek bulabildin mi? İki dik kenarı aynı kenarın iki ucuna dik çizince ne olur?' },
    },
  }
  const rhombus: ShapeCard = {
    id: 'eskenar',
    emoji: '🔶',
    text: '**Dört kenarı eşit** ama kare **olmayan** bir dörtgen yap.',
    need: 1,
    test: (s) => s.n === 4 && s.allEq && s.right === 0,
    why: (s) =>
      s.n !== 4
        ? { q: kenar(s) }
        : s.kind === 'kare'
          ? { q: 'Dört kenarı eşit, ama bu bir kare! Köşeleri dik olmayan, “yatırılmış” bir kare düşünebilir misin?' }
          : { q: 'Kenarları karşılaştır: her kenarda kaç sağa, kaç yukarı gidiyorsun? Hepsi aynı adımlar mı?' },
    name: () => 'eşkenar dörtgen',
    follow: {
      q: 'Dört kenarı eşit olan bir dörtgen **karedir**.',
      answer: 'bazen',
      why: 'Köşeleri dik olursa kare, değilse eşkenar dörtgendir. Az önce kare olmayan bir örnek yaptın!',
      nudge: { her: 'Az önce yaptığın şekle bak: dört kenarı eşit. Köşeleri dik mi?', asla: 'Kare de dört kenarı eşit bir dörtgen değil mi?' },
    },
  }
  const twoRight4: ShapeCard = {
    ...twoRight,
    follow: {
      q: 'Bir dikdörtgenin **dört açısı da** dik açıdır.',
      answer: 'her',
      why: 'Dikdörtgeni dikdörtgen yapan özellik budur: dört açısı da diktir. Senin şekillerinde yalnızca iki dik açı vardı; onlar dikdörtgen değil.',
      nudge: { bazen: 'Dik açısı eksik olan bir dikdörtgen çizebilir misin? Çizince ona hâlâ dikdörtgen der miyiz?', asla: 'Bir defterin sayfasının köşelerine bak. Kaçı dik?' },
    },
  }
  const three: ShapeCard = {
    id: 'ucdik',
    emoji: '🤔',
    text: '**Tam 3 dik açısı** olan bir dörtgen yap. Yapamıyorsan nedenini düşün!',
    need: 1,
    test: (s) => s.n === 4 && s.right === 3,
    why: (s) =>
      s.n === 4 && s.right === 4
        ? { q: 'Üç köşeyi dik yapınca dördüncü köşe ne oldu? Dik olmaktan kaçabilir mi?' }
        : s.n === 4
          ? { q: `Şeklinde ${s.right} dik açı var. Üçüncü dik açıyı eklemeyi dene: dördüncü köşeye ne oluyor?` }
          : { q: kenar(s) + ' Dörtgenin kaç kenarı var?' },
    impossible: {
      reasons: [
        { t: 'Üç köşe dik olunca dördüncü de dik olmak zorunda.', ok: true },
        { t: 'Tahta küçük olduğu için yapılamıyor.', ok: false, nudge: 'Çok büyük bir kâğıtta denediğini düşün. Üç köşeyi dik yapınca dördüncü köşe yine ne oluyor?' },
        { t: 'Dik açı yalnızca karede olur.', ok: false, nudge: 'Dik üçgenin de bir dik açısı vardı. Dik açılar başka şekillerde de olur. Dördüncü köşeye ne olduğuna bak.' },
      ],
      insight: 'Bir dörtgenin üç açısı dik olunca dördüncü kenar zorunlu olarak dik gelir: ya 4 dik açı olur ya da en fazla 2.',
    },
  }
  const trap: ShapeCard = {
    id: 'yamuk',
    emoji: '⏢',
    text: '4 kenarlı, **yalnızca 2 kenarı paralel** bir şekil yap. Sonra farklı bir tane daha!',
    need: 2,
    test: (s) => s.n === 4 && s.parallelPairs === 1,
    why: (s) =>
      s.n !== 4
        ? { q: kenar(s) }
        : s.parallelPairs === 2
          ? { q: 'Şeklinde kaç çift paralel kenar var? Kart “yalnızca 2 kenar” diyor. Bir kenarı eğik yapabilir misin?', mis: 'Paralelkenarı yamuk saydı (yalnızca bir çift paralel kenar isteniyordu)' }
          : { q: 'Hiç paralel kenarın yok. Hangi iki kenarı aynı yönde (raylar gibi) yapabilirsin?' },
    name: () => 'yamuk',
    follow: {
      q: 'Bir yamuğun **dik açısı** olur.',
      answer: 'bazen',
      why: 'Dik yamuklar vardır ama her yamuk dik değildir. Örnekle göstermek yeter!',
      nudge: { her: 'Yaptığın yamuklardan dik açısı olmayan var mı? Tek örnek “her zaman”ı bozar.', asla: 'Bir yamuğun bir kenarını tahta çizgisine dik koymayı dene.' },
    },
  }
  const para: ShapeCard = {
    id: 'paralelkenar',
    emoji: '▱',
    text: '**İki çift paralel kenarı** olan ama **hiç dik açısı olmayan** bir dörtgen yap. İki farklı tane!',
    need: 2,
    test: (s) => s.n === 4 && s.parallelPairs === 2 && s.right === 0,
    why: (s) =>
      s.n !== 4
        ? { q: kenar(s) }
        : s.parallelPairs < 2
          ? { q: `Şeklinde ${s.parallelPairs} çift paralel kenar var. Karşılıklı kenarlarda aynı “sağa–yukarı” adımlarını kullanırsan ne olur?` }
          : { q: 'İki çift paralel kenar tamam! Ama dik açısı var: bu bir dikdörtgen ya da kare. Üst kenarı yana kaydır.' },
    name: (s) => s.kind,
    follow: {
      q: 'Bir paralelkenarın **karşılıklı kenarları** eşit uzunluktadır.',
      answer: 'her',
      why: 'Karşılıklı kenarlar aynı adımlarla (aynı sağa–yukarı) çizilir; uzunlukları hep eşittir.',
      nudge: { bazen: 'Karşılıklı kenarları eşit olmayan bir paralelkenar çizmeyi dene. Kenarlar yine paralel kalıyor mu?', asla: 'Az önce yaptığın paralelkenarın karşılıklı kenarlarını say: kaç sağa, kaç yukarı?' },
    },
  }
  const concave5: ShapeCard = {
    id: 'icbukey5',
    emoji: '🌙',
    text: '**İç bükey** (bir köşesi içe göçük) bir beşgen yap. İki farklı tane!',
    need: 2,
    test: (s) => s.n === 5 && !s.convex,
    why: (s) => (s.n !== 5 ? { q: kenar(s) } : { q: 'Bütün köşeler dışa bakıyor. Bir köşeyi şeklin içine doğru itersen ne olur?' }),
    name: () => 'iç bükey beşgen',
    follow: {
      q: 'Bir **üçgen** iç bükey olabilir.',
      answer: 'asla',
      why: 'Üçgenin bir köşesini içeri itmek için yer yok: köşe içeri girince diğer iki kenarın arasına düşer ve şekil yine dışa bakan bir üçgen olur.',
      nudge: { her: 'Tahtada bir üçgen yap ve bir köşesini içeri itmeyi dene. Göçük oluşuyor mu?', bazen: 'İç bükey bir üçgen çizebildin mi? Göçük yapmak için kaç köşe gerekiyor?' },
    },
  }
  const twoRightNoPar: ShapeCard = {
    id: 'ikidikparalelsiz',
    emoji: '🧩',
    text: '**2 dik açısı** olan ama **hiç paralel kenarı olmayan** bir dörtgen yap.',
    need: 1,
    test: (s) => s.n === 4 && s.right === 2 && s.parallelPairs === 0,
    why: (s) =>
      s.n !== 4
        ? { q: kenar(s) }
        : s.right === 2
          ? { q: 'Dik açıların yan yana: ikisine de dik kenarlar paralel oluyor. Dik açıları karşılıklı köşelere koymayı dene!', mis: '2 dik açılı her dörtgende paralel kenar olduğunu düşündü' }
          : { q: `Şeklinde ${s.right} dik açı var. Önce bir dik açı kur, sonra karşı köşede ikincisini ara.` },
    tricky: 'Henüz pes etme! Dik açıları yan yana mı koydun? Karşılıklı iki köşeyi dik yapmayı dene.',
    name: () => 'dörtgen',
  }

  if (grade === 1) return [tri, sq, rect, odd4]
  if (grade === 2) return [tri, tilted, penta, noRight4, hexa]
  if (grade === 3) return [rightTri, acuteTri, tilted, twoRight, concave6]
  if (grade === 4) return [rightTri4, obtuseTri, rhombus, twoRight4, three]
  return [trap, para, concave5, twoRightNoPar, three]
}
