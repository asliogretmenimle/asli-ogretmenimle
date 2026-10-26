import { useMemo, useRef, useState } from 'react'
import { Lock, Minus, Plus } from 'lucide-react'
import type { Grade } from '../../data/types'
import type { InteractionProps } from '../types'
import { MathText } from '../../components/MathText'
import { StrategyPicker } from '../../games/kit2'
import { ActivityLayout, DoneNote, randInt, tr, useNudge, useSession } from '../hizli-noktalar/kit'
import { ChipSentence, Opt, PinNote, Rich, Steps, isDark, sentenceDone, tapH, type SentencePart } from './ortak'
import {
  ChanceSim,
  CircleSim,
  JarSim,
  MeanSim,
  MeasureSim,
  ParitySim,
  PatternSim,
  ScaleSim,
  ShareSim,
  sticks,
  type ChanceP,
  type CircleP,
  type JarP,
  type MeanP,
  type MeasureP,
  type ParityP,
  type PatternP,
  type ScaleP,
  type ShareP,
  type SimOut,
  type SimPhase,
} from './sims'

/**
 * 73. Tahmin Et, Test Et, Açıkla
 * Her görev bir döngü: 1) tahmin et ve kilitle (görünür not) → 2) modelle/simülasyonla test et
 * → 3) tahminle karşılaştır (öz değerlendirme) → 4) cümle çipleriyle nedenini açıkla.
 * Tahminin tutmaması ceza değildir; değerlendirilen, açıklamadır.
 */

type Pred = { kind: 'choice'; options: string[] } | { kind: 'number'; min: number; max: number; steps: number[]; start: number; unit: string }
interface XOpt {
  t: string
  ok: boolean
  nudge?: string
  misc?: string
}
type XPart = string | { id: string; opts: XOpt[]; ph?: string }
type Sim =
  | { k: 'jar'; p: JarP }
  | { k: 'measure'; p: MeasureP }
  | { k: 'share'; p: ShareP }
  | { k: 'parity'; p: ParityP }
  | { k: 'scale'; p: ScaleP }
  | { k: 'chance'; p: ChanceP }
  | { k: 'pattern'; p: PatternP }
  | { k: 'mean'; p: MeanP }
  | { k: 'circle'; p: CircleP }

interface Task {
  title: string
  q: string
  predict: Pred
  /** Seçenek tahmininde doğru (kuramsal) seçenek; sayı tahmininde deney sonucu kullanılır */
  truth?: number
  sim: Sim
  explain: XPart[]
  hints: string[]
  insight: string
  how: string[]
}

const o = (t: string, ok: boolean, nudge?: string, misc?: string): XOpt => ({ t, ok, nudge, misc })
const S = (id: string, ...opts: XOpt[]): XPart => ({ id, opts })

/** Seçenekleri karıştır (doğruluk bilgisi seçenekte) */
function mix(parts: XPart[]): XPart[] {
  return parts.map((p) => (typeof p === 'string' ? p : { ...p, opts: p.opts.slice().sort(() => Math.random() - 0.5) }))
}

const RATIO = ['2 katı', '3 katı', '4 katı', '8 katı']

// ───────────────────────── Görev bankası ─────────────────────────

function jarTask(g: Grade, ref?: number): Task {
  const n = g === 1 ? (ref ? randInt(14, 19) : randInt(12, 18)) : g === 2 ? (ref ? randInt(36, 48) : randInt(28, 47)) : ref ? randInt(62, 88) : randInt(55, 95)
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const times = ref ? Math.round(n / ref) : 0
  const mode = g === 1 ? 'tap' : 'scoop'
  const explain: XPart[] = ref
    ? [
        'Büyük kavanoza yaklaşık ',
        S('k', o(`${times}`, true), o(`${times + 1}`, true), o(`${times * 3}`, false, `Küçük kavanozu büyüğün içine kaç kez koyabilirdin? ${n} fasulye, ${ref} fasulyenin kaç katına yakın?`)),
        ' küçük kavanoz dolusu fasulye sığıyor. Bu yüzden ',
        S('r',
          o(g === 1 ? `${ref} ${ref} ${ref} diye sayarak tahmin etmek` : `${ref}’ar ${ref}’ar sayarak tahmin etmek`, true),
          o('fasulyelerin rengine bakarak tahmin etmek', false, 'Renk, fasulye sayısı hakkında bilgi verir mi? Küçük kavanozdaki sayı sana nasıl yardım edebilir?'),
          o('kavanozun kapağına bakarak tahmin etmek', false, 'Kapak her iki kavanozda da benzer. Hangi kavanozun içi daha çok yer kaplıyor?'),
        ),
        ' işe yarar.',
      ]
    : g === 1
      ? [
          'Saymak kolaylaştı, çünkü ',
          S('r', o('10 fasulye bir çerçeveyi doldurdu', true), o('fasulyeler kahverengiydi', false, 'Renk sayıyı değiştirir mi? Çerçevenin dolması sana ne gösterdi?'), o('kavanoz şeffaftı', false, 'Kavanozun şeffaf olması saymayı nasıl düzenler? Çerçeve neyi gösterdi?')),
          '. Sonuç: 10 ve ',
          S('n', o(`${ones}`, true), o(`${ones + 1}`, false, `İkinci çerçevede kaç fasulye var? Bir daha say.`), o(`${n}`, false, `${n} fasulyenin hepsi. İlk çerçevedeki 10’dan sonra kaç tane daha var?`)),
          ' tane daha.',
        ]
      : [
          'Saymak hızlandı, çünkü ',
          S('r', o('fasulyeleri 10’ar 10’ar grupladım', true), o('fasulyeleri tek tek saydım', false, 'Çerçeveleri doldururken kaçar kaçar aldın? Hangi gruplar saymayı hızlandırdı?'), o('kavanoz çok büyüktü', false, 'Kavanozun büyüklüğü saymayı hızlandırır mı? Fasulyeleri nasıl grupladın?')),
          '. Sonuç: ',
          S('t', o(`${tens} onluk`, true), o(`${ones} onluk`, false, 'Dolu çerçeveleri say: kaç onluk var?', 'Onluk ve birlik basamaklarını karıştırdı')),
          ' ve ',
          S('o', o(`${ones} birlik`, true), o(`${tens} birlik`, false, 'Dolmamış çerçevede kaç fasulye var?', 'Onluk ve birlik basamaklarını karıştırdı')),
          '.',
        ]
  return {
    title: ref ? 'Referans kavanoz' : 'Fasulye kavanozu',
    q: ref ? `Küçük kavanozda **${ref}** fasulye var. Büyük kavanozda kaç fasulye olabilir? Önce tahmin et!` : 'Kavanozda kaç fasulye var? Saymadan önce tahmin et!',
    predict: { kind: 'number', min: 1, max: g === 1 ? 20 : g === 2 ? 60 : 100, steps: g === 1 ? [1] : [1, 10], start: g === 1 ? 10 : g === 2 ? 30 : 50, unit: 'fasulye' },
    sim: { k: 'jar', p: { n, mode, ref, seed: randInt(1, 9999) } },
    explain,
    hints: ref
      ? ['Küçük kavanozu büyük kavanozun içine kaç kez koyabilirsin, gözünde canlandır.', `Küçük kavanoz ${ref} fasulye ise iki küçük kavanoz kaç fasulye eder?`]
      : ['Önce kavanozun bir köşesine bak: orada kaç fasulye var?', g === 1 ? 'Çerçeveye koyduğun fasulyeler 10’a ulaşınca ne oldu?' : 'Dolu bir çerçevede kaç fasulye var?'],
    insight: ref ? 'Bilinen bir miktar (referans) tahmini güçlendirir: “küçük kavanozun kaç katı?” diye düşünmek, rastgele bir sayı söylemekten daha iyidir.' : '10’luk gruplar saymayı düzenler: dolu çerçeveler onlukları, kalanlar birlikleri gösterir.',
    how: ref ? ['Küçük kavanozla karşılaştırdım', 'Bir bölümü sayıp çoğalttım', 'Göz kararı söyledim'] : ['Bir bölümü sayıp çoğalttım', '10’luk gruplar düşündüm', 'Göz kararı söyledim'],
  }
}

function measureTask(): Task {
  const len = randInt(5, 7)
  return {
    title: 'Ataşla ölç',
    q: 'Kalem kaç ataş uzunluğunda? Önce tahmin et, sonra ataşları uç uca koyarak ölç.',
    predict: { kind: 'number', min: 1, max: 15, steps: [1], start: 3, unit: 'ataş' },
    sim: { k: 'measure', p: { len, unit: 'ataş', unitLen: 1, obj: 'kalem', objEmoji: '✏️' } },
    explain: [
      'Kalem ',
      S('n', o(`${len}`, true), o(`${len + 1}`, false, 'Kalemin üzerinde kaç ataş var? Bir daha say.'), o(`${len - 1}`, false, 'Kalemin üzerinde kaç ataş var? Bir daha say.')),
      ' ataş uzunluğunda, çünkü ataşları ',
      S('r',
        o('uç uca, boşluk bırakmadan', true),
        o('aralarında boşluk bırakarak', false, 'Ataşlar arasında boşluk kalırsa kalemin bir kısmı ölçülmeden kalır mı?', 'Birimleri arada boşluk bırakarak yerleştirmeyi doğru buldu'),
        o('üst üste', false, 'Üst üste konan ataşlar kalemin uzunluğunu kaplar mı?', 'Birimleri üst üste koymayı doğru buldu'),
      ),
      ' koydum.',
    ],
    hints: ['Ataş kalemin yanında ne kadar yer kaplıyor? Kalem kaç ataş boyu olabilir?', 'İlk ataşı kalemin ucuna koy; sıradakini tam onun bittiği yere.'],
    insight: 'Ölçerken aynı birimi boşluk bırakmadan, üst üste koymadan uç uca sıralarız; ölçüm kaç birimin sığdığını söyler.',
    how: ['Ataşı kalemin yanında gözümde sıraladım', 'Parmağımla adımladım', 'Göz kararı söyledim'],
  }
}

function unitTask(g: Grade): Task {
  const big = g === 1 ? { unit: 'silgi' as const, ul: 2 } : { unit: 'kalem' as const, ul: 3 }
  const n = g === 1 ? randInt(2, 3) : 3
  const len = n * big.ul
  const obj = g === 1 ? 'cetvel' : 'kitap'
  return {
    title: 'Birim değişince',
    q: `${obj.charAt(0).toUpperCase() + obj.slice(1)} ${len} ataş uzunluğunda. Şimdi ${big.unit} ile ölçeceğiz. Sayı ne olur?`,
    predict: { kind: 'choice', options: [`Daha çok ${big.unit} gerekir`, `Daha az ${big.unit} gerekir`, `Ataşla aynı: ${len} ${big.unit}`] },
    truth: 1,
    sim: { k: 'measure', p: { len, unit: big.unit, unitLen: big.ul, obj, objEmoji: g === 1 ? '📏' : '📘', prev: `${len} ataş` } },
    explain: [
      `${big.unit.charAt(0).toUpperCase() + big.unit.slice(1)} ataştan `,
      S('a', o('daha uzun', true), o('daha kısa', false, `${big.unit.charAt(0).toUpperCase() + big.unit.slice(1)} ile ataşı yan yana düşün: hangisi daha uzun?`)),
      ' olduğu için ',
      S('b',
        o(`daha az ${big.unit}`, true),
        o(`daha çok ${big.unit}`, false, `${n} ${big.unit} mı, ${len} ataş mı? Uzun bir birim ${obj} boyunu kaç adımda kaplar?`, 'Büyük birimle ölçünce sayının da büyüyeceğini düşündü'),
      ),
      ' gerekti.',
    ],
    hints: [`Bir ${big.unit} kaç ataş boyunda?`, `Uzun adımlarla mı kısa adımlarla mı odayı daha az adımda geçersin?`],
    insight: 'Birim büyüdükçe gereken birim sayısı azalır: uzun birimle daha az, kısa birimle daha çok sayarız.',
    how: ['Birimleri karşılaştırdım', 'Uzun adım–kısa adım gibi düşündüm', 'Göz kararı söyledim'],
  }
}

function shareTask(g: Grade): Task {
  const n = g === 1 ? randInt(6, 11) : randInt(11, 17)
  const even = n % 2 === 0
  const half = Math.floor(n / 2)
  return {
    title: 'Eşit paylaş',
    q: `**${n}** şekeri Ela ile Can’a eşit paylaştırabilir miyiz? Artan kalır mı?`,
    predict: { kind: 'choice', options: ['Evet, ikisi eşit alır, artan kalmaz', 'Hayır, 1 şeker artar'] },
    truth: even ? 0 : 1,
    sim: { k: 'share', p: { n, emoji: '🍬' } },
    explain: [
      `Sırayla birer birer verince ikisi de ${half} şeker aldı ve `,
      S('a', o(even ? 'hiç şeker artmadı' : '1 şeker arttı', true), o(even ? '1 şeker arttı' : 'hiç şeker artmadı', false, 'Yığına bak: ortada şeker kaldı mı?')),
      ', çünkü ',
      S('b',
        o(even ? `${n} eşit iki gruba ayrılabilir: ${half} ve ${half}` : `${n} eşit iki gruba ayrılamaz: ${half} ve ${half + 1}`, true),
        o('şekerler çok azdı', false, `Şeker sayısı az ya da çok olsa da önemli olan ne? ${n} şekeri ikişer ikişer eşleştirebilir misin?`),
        o('Can daha küçük', false, 'Paylaşım herkese eşit olsun istiyoruz. Artan şeker neden kaldı ya da kalmadı?'),
      ),
      '.',
    ],
    hints: ['Şekerleri ikişer ikişer eşleştir: her eşten biri Ela’ya, biri Can’a.', 'Eşleştirince eşsiz kalan şeker var mı?'],
    insight: 'Bir çokluğu ikişer ikişer eşleştirince hiç artan kalmıyorsa eşit iki gruba ayrılabilir; 1 artıyorsa ayrılamaz.',
    how: ['İkişer ikişer düşündüm', 'Yarısını bulmaya çalıştım', 'Göz kararı söyledim'],
  }
}

function parityTask(terms: ('o' | 'e')[]): Task {
  const name = (t: 'o' | 'e') => (t === 'o' ? 'tek' : 'çift')
  const odd = terms.filter((t) => t === 'o').length % 2 === 1
  const desc = terms.length === 3 ? 'Üç tek sayıyı' : terms[0] === terms[1] ? `İki ${name(terms[0])} sayıyı` : 'Bir tek ve bir çift sayıyı'
  const lead =
    terms.length === 3
      ? 'İlk iki tek sayının eşsiz noktaları '
      : terms[0] === 'o' && terms[1] === 'o'
        ? 'İki tek sayının eşsiz kalan birer noktası '
        : 'Tek sayının eşsiz noktası '
  return {
    title: terms.length === 3 ? 'Üç tek sayı' : `${name(terms[0])} + ${name(terms[1])}`,
    q: `${desc} toplarsak sonuç tek mi olur, çift mi? Önce tahmin et, sonra noktalarla en az 3 deneme yap.`,
    predict: { kind: 'choice', options: ['Her zaman tek', 'Her zaman çift', 'Bazen tek, bazen çift'] },
    truth: odd ? 0 : 1,
    sim: { k: 'parity', p: { terms, need: 3 } },
    explain:
      terms.length === 2 && terms[0] === 'o' && terms[1] === 'o'
        ? [
            lead,
            S('a', o('birleşip yeni bir çift oluşturur', true), o('yine eşsiz kalır', false, 'Turuncu ve mavi eşsiz noktaları yan yana koy: eşleşiyorlar mı?')),
            '; bu yüzden toplam hep ',
            S('b', o('çift', true), o('tek', false, 'Toplamın noktalarında eşsiz kalan nokta var mı?', 'Tek + tek toplamının tek olduğunu düşündü')),
            ' olur.',
          ]
        : terms.length === 3
          ? [
              lead,
              S('a', o('birbiriyle eşleşir, ama üçüncü sayının eşsiz noktası', true), o('hepsi birbiriyle eşleşir ve', false, 'Üç eşsiz nokta var. Üç noktayı ikişer eşleştirince biri artar mı?')),
              ' yalnız kalır; bu yüzden toplam hep ',
              S('b', o('tek', true), o('çift', false, 'Toplamda eşsiz kalan bir nokta var mı? Kırmızı çember neyi gösteriyor?', 'Üç tek sayının toplamının çift olduğunu düşündü')),
              ' olur.',
            ]
          : [
              lead,
              S('a', o('çift sayıda eşleşecek bir nokta bulamaz', true), o('çift sayının bir noktasıyla eşleşir', false, 'Çift sayının noktalarının hepsi zaten eşli. Eşsiz bir noktası var mı?')),
              '; bu yüzden toplam hep ',
              S('b', o('tek', true), o('çift', false, 'Toplamda eşsiz kalan nokta var mı?')),
              ' olur.',
            ],
    hints: ['Noktaları ikişer ikişer eşleştir. Eşsiz kalan nokta var mı?', 'Farklı sayılarla dene: sonuç hep aynı mı oluyor?'],
    insight: odd ? 'Tek sayıda “tek” toplanınca bir eşsiz nokta yalnız kalır; toplam tek olur.' : 'İki tek sayının eşsiz birer noktası birbirine eş olur; bu yüzden tek + tek her zaman çifttir.',
    how: ['Örneklerle denedim', 'Noktaları eşleştirdim', 'Daha önce biliyordum'],
  }
}

function scaleTask(_g: Grade, kind: 'area2' | 'area1' | 'per2' | 'area3' | 'cube2' | 'cubeS3' | 'cube3' | 'cylR'): Task {
  const RATIOS: Record<string, string[]> = {
    area3: ['3 katı', '6 katı', '9 katı', '27 katı'],
    cubeS3: ['3 katı', '6 katı', '9 katı', '27 katı'],
    cube3: ['3 katı', '9 katı', '18 katı', '27 katı'],
    cylR: ['2 katı', '4 katı', '8 katı', 'π katı'],
  }
  const T: Record<typeof kind, { p: ScaleP; q: string; truth: number; explain: XPart[]; insight: string }> = {
    area2: {
      p: { shape: 'rect', measure: 'area', base: [2, 2], target: [4, 4], grid: [10, 7] },
      q: 'Sarı karenin kenarlarını **2 katına** çıkarırsak alanı kaç katına çıkar?',
      truth: 2,
      explain: [
        'Kenarlar 2 katına çıkınca ',
        S('a', o('hem taban hem yükseklik', true), o('yalnız taban', false, 'Yükseklik de değişti mi? 2’den kaça çıktı?')),
        ' 2 katı oldu; içine ',
        S('b', o('2 × 2 = 4', true), o('2', false, 'Mavi çerçeveleri say: yeni karenin içine kaç sarı kare sığdı?', 'Kenar 2 katı olunca alanın da 2 katı olacağını düşündü'), o('2 + 2 = 4', false, 'Sonuç 4, ama 2 + 2 mi, 2 × 2 mi? Sarı kareler satır ve sütun hâlinde mi diziliyor?')),
        ' tane eski kare sığdı.',
      ],
      insight: 'Kenarlar 2 katına çıkınca alan 2 × 2 = 4 katına çıkar: eski kareden 2 sıra, her sırada 2 tane sığar.',
    },
    area1: {
      p: { shape: 'rect', measure: 'area', base: [3, 2], target: [6, 2], grid: [10, 6] },
      q: 'Dikdörtgenin yalnız **tabanını 2 katına** çıkarırsak alanı kaç katına çıkar?',
      truth: 0,
      explain: [
        'Yalnız taban 2 katı olunca eski dikdörtgenden ',
        S('a', o('yan yana 2 tane', true), o('2 sıra 2 tane', false, 'Yükseklik değişmedi. Eski dikdörtgenler kaç sıra oluşturuyor?')),
        ' sığdı; alan ',
        S('b', o('2 katına', true), o('4 katına', false, 'Mavi çerçeveleri say: kaç eski dikdörtgen sığdı?', 'Bir kenar 2 katı olunca alanın 4 katı olacağını düşündü')),
        ' çıktı.',
      ],
      insight: 'Yalnız bir kenar 2 katına çıkarsa alan 2 katına çıkar; iki kenar birden 2 katına çıkarsa 4 katına.',
    },
    per2: {
      p: { shape: 'rect', measure: 'perimeter', base: [3, 2], target: [6, 4], grid: [10, 6] },
      q: 'Dikdörtgenin **iki kenarını da 2 katına** çıkarırsak çevresi kaç katına çıkar?',
      truth: 0,
      explain: [
        'Çevre kenarların ',
        S('a', o('toplamıdır', true), o('çarpımıdır', false, 'Çevreyi bulmak için kenarların etrafında yürürsün. Uzunlukları toplar mısın, çarpar mısın?', 'Çevre ile alanı karıştırdı')),
        '; her kenar 2 katı olunca toplam da ',
        S('b', o('2 katı olur', true), o('4 katı olur', false, `Eski çevre 10, yeni çevre 20. 20, 10’un kaç katı?`, 'Kenar 2 katı olunca çevrenin 4 katı olacağını düşündü')),
        '.',
      ],
      insight: 'Kenarlar 2 katına çıkınca çevre 2 katına, alan ise 4 katına çıkar: uzunluk ile alan farklı büyür.',
    },
    area3: {
      p: { shape: 'rect', measure: 'area', base: [2, 1], target: [6, 3], grid: [10, 6] },
      q: 'Dikdörtgenin **iki kenarını da 3 katına** çıkarırsak alanı kaç katına çıkar?',
      truth: 2,
      explain: [
        'Taban 3 katı, yükseklik 3 katı olunca eski dikdörtgenden ',
        S('a', o('3 sıra, her sırada 3 tane', true), o('3 tane', false, 'Mavi çerçeveler kaç sıra oluşturuyor? Her sırada kaç tane var?', 'Kenar 3 katı olunca alanın 3 katı olacağını düşündü'), o('3 + 3 tane', false, 'Eski dikdörtgenler satır ve sütun hâlinde diziliyor: bu toplama mı, çarpma mı?')),
        ' sığdı; alan ',
        S('b', o('3 × 3 = 9 katına', true), o('3 × 2 = 6 katına', false, 'Kenarlar 3’er katına çıktı. Hangi iki sayıyı çarpmalısın?')),
        ' çıktı.',
      ],
      insight: 'Kenarlar k katına çıkınca alan k × k katına çıkar: 3 katı kenar → 9 katı alan.',
    },
    cube2: {
      p: { shape: 'cube', measure: 'volume', base: [2], target: [4] },
      q: 'Ayrıtı 2 olan küpün **ayrıtını 2 katına** çıkarırsak hacmi kaç katına çıkar?',
      truth: 3,
      explain: [
        'Ayrıt 2 katına çıkınca ',
        S('a', o('en, boy ve yükseklik', true), o('yalnız en ve boy', false, 'Küp yalnız genişlemedi, yükseldi de. Kaç boyutu 2 katı oldu?', 'Hacmi alan gibi iki boyutlu düşündü')),
        ' 2 katı oldu; hacim ',
        S('b', o('2 × 2 × 2 = 8 katına', true), o('2 × 2 = 4 katına', false, 'Yeni küpte eski küpten kaç kat var? Her katta kaç tane?'), o('2 katına', false, 'Yeni küp 64, eski küp 8 birimküp. 64, 8’in kaç katı?', 'Ayrıt 2 katı olunca hacmin 2 katı olacağını düşündü')),
        ' çıktı.',
      ],
      insight: 'Ayrıt k katına çıkınca hacim k × k × k katına çıkar: ayrıt 2 katı → hacim 8 katı.',
    },
    cubeS3: {
      p: { shape: 'cube', measure: 'surface', base: [1], target: [3] },
      q: 'Birim küpün **ayrıtını 3 katına** çıkarırsak yüzey alanı kaç katına çıkar?',
      truth: 2,
      explain: [
        'Küpün her yüzü bir ',
        S('a', o('kare', true), o('küp', false, 'Yüzey alanı yüzlerin alanıdır. Bir yüz nasıl bir şekil?')),
        '; kenarı 3 katı olan karenin alanı ',
        S('b', o('3 × 3 = 9 katı', true), o('3 katı', false, 'Bir yüzde kaç birimkare var: 3 mü, 9 mu?', 'Kenar 3 katı olunca alanın 3 katı olacağını düşündü'), o('3 × 3 × 3 = 27 katı', false, '27 katı hacim için doğru. Yüzey alanı kaç boyutlu bir ölçü?', 'Yüzey alanı ile hacmi karıştırdı')),
        ' olduğu için 6 yüzün toplamı da 9 katına çıkar.',
      ],
      insight: 'Ölçek k olunca uzunluk k, alan (yüzey alanı) k², hacim k³ katına çıkar.',
    },
    cube3: {
      p: { shape: 'cube', measure: 'volume', base: [1], target: [3] },
      q: 'Birim küpün **ayrıtını 3 katına** çıkarırsak hacmi kaç katına çıkar?',
      truth: 3,
      explain: [
        'Hacim üç boyutlu bir ölçü; en, boy ve yükseklik ',
        S('a', o('3’er katına', true), o('toplam 3 katına', false, 'En, boy ve yükseklik ayrı ayrı kaça çıktı?')),
        ' çıktığı için hacim ',
        S('b', o('3^{3} = 27 katına', true), o('3^{2} = 9 katına', false, 'Kaç kat oluştu? Her katta kaç küp var?', 'Hacmi alan gibi iki boyutlu düşündü'), o('3 × 3 = 9 katına', false, '9 katı bir yüzün alanı için doğru. Küpün kaç katı var?')),
        ' çıkar.',
      ],
      insight: 'Ayrıt k katına çıkınca hacim k³ katına çıkar: 3 katı ayrıt → 27 katı hacim.',
    },
    cylR: {
      p: { shape: 'cylinder', measure: 'volume', base: [1, 3], target: [2, 3] },
      q: 'Silindirin **yarıçapını 2 katına** çıkarırsak (yükseklik aynı) hacmi kaç katına çıkar?',
      truth: 1,
      explain: [
        'Hacim = taban alanı × yükseklik. Yarıçap 2 katı olunca taban alanı ',
        S('a', o('π r^{2} olduğu için 4 katına', true), o('2 katına', false, 'Taban bir daire: alanı π r^{2}. r 2 katına çıkınca r^{2} kaç katına çıkar?', 'Yarıçap 2 katı olunca taban alanının 2 katı olacağını düşündü')),
        ' çıkar; yükseklik aynı kaldığı için hacim ',
        S('b', o('4 katına', true), o('8 katına', false, 'Yükseklik değişmedi. Hangi ölçüler değişti?', 'Silindir hacminde küp gibi üç boyutun da değiştiğini düşündü')),
        ' çıkar.',
      ],
      insight: 'Silindirde yarıçap 2 katına çıkınca hacim 4 katına çıkar (r² yüzünden); yükseklik 2 katına çıkınca yalnız 2 katına.',
    },
  }
  const t = T[kind]
  return {
    title: t.p.measure === 'volume' ? 'Hacim büyür mü?' : t.p.measure === 'perimeter' ? 'Çevre büyür mü?' : t.p.measure === 'surface' ? 'Yüzey alanı' : 'Alan büyür mü?',
    q: t.q,
    predict: { kind: 'choice', options: RATIOS[kind] ?? RATIO },
    truth: t.truth,
    sim: { k: 'scale', p: t.p },
    explain: t.explain,
    hints:
      t.p.shape === 'rect'
        ? ['Köşedeki pembe tutamacı sürükle ya da tabanı ve yüksekliği − / + ile ayarla.', 'Eski şekil (sarı) yeni şeklin içine kaç kez sığıyor?']
        : t.p.shape === 'cube'
          ? ['Ayrıtı ayarla ve yeni küpte kaç birimküp olduğuna bak.', 'Yeni küpü katlar hâlinde düşün: kaç kat var, her katta kaç küp?']
          : ['Yarıçapı ayarla; yükseklik aynı kalsın.', 'r = 1 iken r^{2} = 1, r = 2 iken r^{2} kaç?'],
    insight: t.insight,
    how: ['Kafamda çizdim', 'Bir örnekle hesapladım', 'Kenar kaç katıysa ölçü de o katı diye düşündüm'],
  }
}

function spinner2Task(): Task {
  return {
    title: 'Hangi çark?',
    q: 'Kırmızı gelirse kazanıyorsun. **A** mı **B** mi çevirmeliyim? Önce tahmin et, sonra iki çarkı da en az 20’şer kez çevir.',
    predict: { kind: 'choice', options: ['A çarkı', 'B çarkı', 'Fark etmez, ikisinde de kırmızı var'] },
    truth: 0,
    sim: {
      k: 'chance',
      p: {
        spinners: [
          { name: 'A çarkı', sectors: [{ label: 'K', color: '#ef4444' }, { label: 'K', color: '#ef4444' }, { label: 'K', color: '#ef4444' }, { label: 'M', color: '#3b82f6' }] },
          { name: 'B çarkı', sectors: [{ label: 'K', color: '#ef4444' }, { label: 'M', color: '#3b82f6' }] },
        ],
        focus: 'K',
        minTrials: 20,
        batches: [1, 10],
        outcome: (c, t) => ({ label: `A: ${c[0].K ?? 0}/${t[0]} kırmızı · B: ${c[1].K ?? 0}/${t[1]} kırmızı`, choice: (c[0].K ?? 0) / t[0] >= (c[1].K ?? 0) / t[1] ? 0 : 1 }),
      },
    },
    explain: [
      'A çarkında kırmızı ',
      S('a', o('çarkın dörtte üçünü kaplıyor', true), o('B’dekiyle aynı yeri kaplıyor', false, 'İki çarkta kırmızı bölgeyi karşılaştır: hangisinde daha büyük?', 'Çarkın ikisinde de kırmızı olduğu için eşit şanslı olduğunu düşündü')),
      ', B’de ise ',
      S('b', o('yarısını', true), o('tamamını', false, 'B çarkında mavi bölge var mı?')),
      '; bu yüzden kırmızı ',
      S('c', o('A’da daha olası', true), o('B’de daha olası', false, 'Hangi çarkta kırmızı daha geniş? Deney sonuçların ne söylüyor?')),
      '.',
    ],
    hints: ['Her çarkta kırmızı bölge çarkın ne kadarı?', 'Deney az olunca sonuç şaşırtabilir. 10’ar kez daha çevir ve bak.'],
    insight: 'Bir sonucun olasılığı, o sonucun çarkta kapladığı paya bağlıdır; “ikisinde de var” demek yetmez, ne kadar yer kapladığına bakarız.',
    how: ['Kırmızı alanları karşılaştırdım', 'Kesirle düşündüm', 'Şansa güvendim'],
  }
}

function spin8Task(): Task {
  return {
    title: 'Hangisi daha olası?',
    q: '8 eş dilimli çarkın 3 dilimi kırmızı, 5 dilimi mavi. 40 kez çevirirsek hangi renk daha çok gelir?',
    predict: { kind: 'choice', options: ['Kırmızı', 'Mavi', 'Eşit gelirler'] },
    truth: 1,
    sim: {
      k: 'chance',
      p: {
        spinners: [{ name: 'Çark', sectors: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i % 3 === 0 && i < 7 ? { label: 'K', color: '#ef4444' } : { label: 'M', color: '#3b82f6' })) }],
        minTrials: 40,
        batches: [10, 1],
        outcome: (c) => ({ label: `Kırmızı ${c[0].K ?? 0}, mavi ${c[0].M ?? 0}`, choice: (c[0].K ?? 0) > (c[0].M ?? 0) ? 0 : (c[0].K ?? 0) < (c[0].M ?? 0) ? 1 : 2 }),
      },
    },
    explain: [
      'Mavi, çarkın ',
      S('a', o('8’de 5’ini', true), o('8’de 3’ünü', false, 'Mavi dilimleri say. Kaç tane?')),
      ' kaplıyor; bu yüzden mavi ',
      S('b', o('daha olası', true), o('kesin', false, 'Kırmızı gelmesi imkânsız mı? Deneyde hiç kırmızı geldi mi?', '“Daha olası” ile “kesin”i karıştırdı'), o('imkânsız', false, 'Mavi dilimler varken mavi gelmesi imkânsız olur mu?')),
      '. Ama her çevirmede ',
      S('c', o('kırmızı da gelebilir', true), o('mavi gelmek zorunda', false, 'Deneyinde hiç kırmızı geldi mi? Daha olası, her seferinde gelir mi demek?')),
      '.',
    ],
    hints: ['Kırmızı dilimleri ve mavi dilimleri ayrı ayrı say.', 'Bir rengin dilim sayısı artınca o renk daha mı sık gelir?'],
    insight: 'Daha çok dilim kaplayan sonuç daha olasıdır, ama kesin değildir: az olası olan da arada gelir.',
    how: ['Dilimleri saydım', 'Kesirle karşılaştırdım', 'Şansa güvendim'],
  }
}

function spinCountTask(): Task {
  return {
    title: 'Kaç kez kırmızı?',
    q: 'Dört eş dilimli çarkın bir dilimi kırmızı. **40** kez çevirirsek kırmızı yaklaşık kaç kez gelir?',
    predict: { kind: 'number', min: 0, max: 40, steps: [1, 5], start: 20, unit: 'kez' },
    sim: {
      k: 'chance',
      p: {
        spinners: [{ name: 'Çark', sectors: [{ label: 'K', color: '#ef4444' }, { label: 'M', color: '#3b82f6' }, { label: 'S', color: '#eab308' }, { label: 'Y', color: '#22c55e' }] }],
        focus: 'K',
        minTrials: 40,
        maxTrials: 40,
        batches: [10, 1],
        outcome: (c) => ({ label: `40 çevirmede ${c[0].K ?? 0} kez kırmızı`, value: c[0].K ?? 0 }),
      },
    },
    explain: [
      'Kırmızı çarkın ',
      S('a', o('[[1/4]]’ü', true), o('[[1/3]]’ü', false, 'Çarkta kaç eş dilim var? Kırmızı kaç tanesi?')),
      '; 40’ın [[1/4]]’ü ',
      S('b', o('10', true), o('4', false, '40’ı 4 eş parçaya bölersen bir parça kaç olur?'), o('20', false, '20, 40’ın yarısı. Kırmızı çarkın yarısını mı kaplıyor?')),
      ' olduğu için yaklaşık 10 bekleriz. Deneyin sonucu ',
      S('c', o('10’a yakın çıkabilir ama tam tutmayabilir', true), o('tam 10 olmak zorunda', false, 'Bir para 10 kez atılınca hep 5 tura mı gelir? Şans deneyinde sonuç sabit mi?', 'Deneysel olasılığın kuramsal sonuca tam eşit olması gerektiğini düşündü')),
      '.',
    ],
    hints: ['Kırmızı, dilimlerin kaçta kaçı?', '40 çevirmenin dörtte biri kaç eder?'],
    insight: 'Kuramsal olasılık beklentiyi verir (40’ın [[1/4]]’ü = 10); deney bu sayıya yakın sonuç verir ama her seferinde tam tutmaz.',
    how: ['Kesirle hesapladım', 'Dilimleri sayıp böldüm', 'Şansa güvendim'],
  }
}

function fairTask(): Task {
  return {
    title: 'Eşit olasılıklı mı?',
    q: 'Bu çarkta 1, 2 ve 3 yazıyor. Üç sayı **eşit sıklıkta** gelir mi? Önce tahmin et, sonra en az 60 kez çevir.',
    predict: { kind: 'choice', options: ['Evet, üçü de eşit sıklıkta gelir', 'Hayır, 1 daha sık gelir', 'Hayır, 3 daha sık gelir'] },
    truth: 1,
    sim: {
      k: 'chance',
      p: {
        spinners: [{ name: 'Çark', sectors: [{ label: '1', color: '#8b5cf6', w: 2 }, { label: '2', color: '#14b8a6', w: 1 }, { label: '3', color: '#f97316', w: 1 }] }],
        minTrials: 60,
        batches: [10, 50],
        outcome: (c, t) => ({ label: `${t[0]} çevirmede 1: ${c[0]['1'] ?? 0}, 2: ${c[0]['2'] ?? 0}, 3: ${c[0]['3'] ?? 0}`, choice: 1 }),
      },
    },
    explain: [
      'Sonuçlar ',
      S('a', o('eşit olasılıklı değil', true), o('eşit olasılıklı', false, '“1” dilimi diğerlerinden büyük mü? Grafikteki çubuklar eşit mi?', 'Çarkta üç sonuç olduğu için her birinin olasılığının [[1/3]] olduğunu düşündü')),
      ', çünkü “1” dilimi çarkın ',
      S('b', o('yarısını', true), o('üçte birini', false, 'Üç dilim var ama eş değil. “1” dilimi çarkın ne kadarı?')),
      ' kaplıyor; P(1) = ',
      S('c', o('[[1/2]]', true), o('[[1/3]]', false, 'Olasılık, dilimin çarkta kapladığı paya eşit. 1 dilimi yarım daire mi?')),
      '.',
    ],
    hints: ['Dilimlerin büyüklüğünü karşılaştır.', 'Sonuç sayısı ile eş olasılık aynı şey mi?'],
    insight: 'Bir deneyde sonuç sayısını bilmek yetmez; sonuçlar ancak eş büyüklükteki dilimlere karşılık geliyorsa eşit olasılıklıdır.',
    how: ['Dilim büyüklüklerine baktım', 'Kesirle düşündüm', 'Üç sonuç var diye düşündüm'],
  }
}

function diceTask(): Task {
  return {
    title: 'İki zarın toplamı',
    q: 'İki zar atıp üstteki sayıları topluyoruz. **En sık** hangi toplam gelir? Önce tahmin et, sonra en az 100 kez at.',
    predict: { kind: 'choice', options: ['2', '7', '12', 'Hepsi eşit sıklıkta gelir'] },
    truth: 1,
    sim: {
      k: 'chance',
      p: {
        dice2: true,
        focus: '7',
        minTrials: 100,
        batches: [10, 100],
        outcome: (c, t) => {
          const best = Object.entries(c[0]).sort((a, b) => b[1] - a[1])[0]
          return { label: `${t[0]} atışta en sık toplam: ${best?.[0]} (${best?.[1]} kez)`, choice: best?.[0] === '7' ? 1 : 3 }
        },
      },
    },
    explain: [
      'Toplamı 7 yapan ',
      S('a', o('6 farklı sıralı ikili var: (1,6), (2,5) … (6,1)', true), o('yalnız 1 ikili var', false, 'Birinci zar 1 iken ikinci kaç olmalı? Birinci 2 iken? Kaç durum çıkıyor?')),
      '; 2’yi yapan ise yalnız ',
      S('b', o('(1,1)', true), o('(1,1) ve (2,0)', false, 'Zarda 0 var mı?')),
      '. 36 eş olasılıklı durumdan 6’sı 7 verdiği için P(7) = ',
      S('c', o('[[6/36]] = [[1/6]]', true), o('[[1/11]]', false, '2’den 12’ye 11 toplam var, ama hepsi eş olasılıklı mı? Grafikteki çubuklar eşit mi?', 'Zar toplamlarının eşit olasılıklı olduğunu düşündü')),
      '.',
    ],
    hints: ['7 toplamını kaç farklı şekilde elde edebilirsin? Zarlardan birini kırmızı, birini mavi düşün.', '12’yi kaç şekilde elde edersin?'],
    insight: 'Toplamlar eşit olasılıklı değildir: 36 eş olasılıklı ikiliden en çok 7’yi verenler vardır. Deney çok tekrarlanınca bu yapı görünür.',
    how: ['Durumları listeledim', 'Tablo düşündüm', 'Ortadaki sayı diye düşündüm'],
  }
}

function patternTask(g: Grade, kind: PatternP['kind'], n: number, graph = false): Task {
  const add = kind === 'squares' ? 3 : kind === 'triangles' ? 2 : 5
  const v = sticks(kind, n)
  const half = n % 2 === 0 ? sticks(kind, n / 2) : 0
  const name = kind === 'squares' ? 'kare' : kind === 'triangles' ? 'üçgen' : 'ev'
  const explain: XPart[] = [
    `Her yeni ${name} için `,
    S('a', o(`${add} kibrit`, true), o(`${add + 1} kibrit`, false, `${name.charAt(0).toUpperCase() + name.slice(1)}ler bir kenarı paylaşıyor. Tabloda her adımda kaç kibrit artıyor?`, 'Paylaşılan kenarları iki kez saydı')),
    ' ekleniyor; başta ',
    S('b', o('1 kibrit', true), o(`${add + 1} kibrit`, false, `İlk ${name} ${add + 1} kibrit, ama bunun ${add}’ü “ekleme”. Geriye kaç kibrit kalıyor?`)),
    ' var. Bu yüzden ',
    g >= 7
      ? S('c', o(`${add}n + 1 → ${add} × ${n} + 1 = ${v}`, true), half ? o(`${n / 2}. adımın 2 katı → ${half * 2}`, false, `${n / 2}. adımda ${half} kibrit var. İki tane ${n / 2}. adımı yan yana koyunca ortadaki kibrit iki kez sayılmaz mı?`, 'Doğrusal örüntüde orantısal düşündü (n. adımın 2 katı)') : o(`${add + 1}n → ${(add + 1) * n}`, false, 'Tablodaki ilk değerleri kontrol et: 1. adımda bu kural doğru sonuç veriyor mu?'), o(`n + ${add} → ${n + add}`, false, 'Bu kural 2. adımda kaç verir? Tabloyla karşılaştır.'))
      : S('c', o(`${add} × ${n} + 1 = ${v}`, true), half ? o(`${n / 2}. adımın 2 katı: ${half * 2}`, false, `${n / 2}. adımda ${half} kibrit. İki tane ${n / 2}. adımı yan yana koyunca ortadaki kibrit iki kez sayılmaz mı?`, 'Doğrusal örüntüde orantısal düşündü (n. adımın 2 katı)') : o(`${add + 1} × ${n} = ${(add + 1) * n}`, false, 'Her kareyi ayrı ayrı mı yaptın? Ortak kenarları düşün.', 'Paylaşılan kenarları iki kez saydı'), o(`${n} + ${add} = ${n + add}`, false, 'Her adımda yalnız 1 mi artıyor? Tabloya bak.')),
    ' kibrit gerekir.',
  ]
  if (graph)
    explain.push(
      ' Grafikte noktalar ',
      S('d', o('bir doğru üzerinde, çünkü her adımda aynı miktarda artıyor', true), o('bir eğri üzerinde, çünkü sayılar büyüyor', false, 'Ardışık noktalar arasındaki artış hep aynı mı? Aynıysa noktalar nasıl dizilir?')),
      '.',
    )
  return {
    title: graph ? 'Örüntü ve grafik' : 'Kibrit örüntüsü',
    q: `Kibritlerle ${name}ler yapıyoruz. **${n}. adımda** kaç kibrit gerekir? Önce tahmin et, sonra adım adım kur.`,
    predict: { kind: 'number', min: 1, max: Math.max(60, v * 2), steps: [1, 10], start: Math.round(v / 20) * 10 || 10, unit: 'kibrit' },
    sim: { k: 'pattern', p: { kind, n, graph } },
    explain,
    hints: ['Tabloda her adımda kaç kibrit artıyor?', `Her ${name} kendi kibritlerini mi kullanıyor, yoksa bir kenarı komşusuyla mı paylaşıyor?`],
    insight: `Her adımda aynı sayıda kibrit eklenir: ${n}. adım = 1 + ${add} × ${n}. “Yarısının 2 katı” kısa yolu ortak kibritleri iki kez sayar.`,
    how: ['Tablodaki artışı kullandım', 'Kural yazdım', 'Yarısını bulup 2 ile çarptım', 'Göz kararı söyledim'],
  }
}

function meanTask(g: Grade): Task {
  if (g === 6) {
    const values = [8, 10, 12, 10, 9, 11]
    return {
      title: 'Yeni oyuncu',
      q: 'Takımdaki 6 oyuncu maçta **8, 10, 12, 10, 9, 11** sayı attı (ortalama 10). Takıma **24** sayı atan bir oyuncu katılıyor. Yeni ortalama kaç olur?',
      predict: { kind: 'number', min: 8, max: 24, steps: [1], start: 10, unit: '' },
      sim: { k: 'mean', p: { values, add: 24, min: 6, max: 26, unit: 'sayı', what: 'oyuncuların sayıları' } },
      explain: [
        'Yeni oyuncu toplamı ',
        S('a', o('60’tan 84’e çıkardı', true), o('24 artırdı ama ortalamayı da 24 yaptı', false, 'Ortalama, toplamın kişi sayısına bölümüdür. Yalnız yeni oyuncuya mı bakıyoruz?')),
        '; bu toplam ',
        S('b', o('7 oyuncuya paylaştırılınca', true), o('2’ye bölününce', false, '(10 + 24) ÷ 2 = 17, ama takımda kaç oyuncu var?', 'Eski ortalama ile yeni değerin ortalamasını aldı')),
        ' ortalama ',
        S('c', o('12 oldu', true), o('17 oldu', false, '84 ÷ 7 kaç eder?')),
        '.',
      ],
      hints: ['Eski toplam kaç? (6 oyuncu × 10)', 'Yeni toplamı yeni oyuncu sayısına böl.'],
      insight: 'Bir uç değer ortalamayı kendine doğru çeker ama tek başına belirlemez: fazlalık (24 − 10 = 14) bütün gruba paylaşılır.',
      how: ['Toplamı hesapladım', 'Fazlalığı paylaştırdım', 'Göz kararı söyledim'],
    }
  }
  const data = g === 7 ? { values: [20, 25, 25, 30, 30, 35, 40], add: 150, min: 0, max: 160, unit: 'TL', what: 'haftalık harçlıklar', q: 'Yedi arkadaşın haftalık harçlıkları **20, 25, 25, 30, 30, 35, 40** TL. Gruba harçlığı **150 TL** olan biri katılıyor.' } : { values: [70, 75, 80, 80, 85, 90, 95], add: 10, min: 0, max: 100, unit: 'puan', what: 'sınav puanları', q: 'Yedi öğrencinin puanları **70, 75, 80, 80, 85, 90, 95**. Sınava giremeyen birine **10** puan yazılıyor.' }
  return {
    title: 'Ortalama mı, ortanca mı?',
    q: `${data.q} Ortalama mı ortanca mı daha çok değişir?`,
    predict: { kind: 'choice', options: ['Ortalama daha çok değişir', 'Ortanca daha çok değişir', 'İkisi de aynı kadar değişir'] },
    truth: 0,
    sim: { k: 'mean', p: { values: data.values, add: data.add, min: data.min, max: data.max, unit: data.unit, what: data.what, median: true } },
    explain: [
      'Uç değer ',
      S('a', o('toplamı çok değiştirdiği için ortalamayı çeker', true), o('ortadaki sayıyı çok değiştirir', false, 'Ortanca sıralanmış verinin ortasındaki değerdir. Yeni değer en uçta; ortadaki değer ne kadar kaydı?', 'Uç değerin ortancayı çok etkilediğini düşündü')),
      '; ortanca ise ',
      S('b', o('yalnız sıralamada bir adım kayar', true), o('hiç hesaba katılmaz', false, 'Ortanca biraz değişti mi? Veri sayısı 7’den 8’e çıkınca ortadaki iki değere bakıyoruz.')),
      '. Bu yüzden uç değer varken ',
      S('c', o('ortanca grubu daha iyi temsil eder', true), o('ortalama grubu daha iyi temsil eder', false, 'Yeni ortalama gruptaki çoğu kişinin değerine yakın mı?')),
      '.',
    ],
    hints: ['Önce eski ortalamayı ve ortancayı düşün.', 'Uç değer toplamı ne kadar değiştiriyor? Sıralamada ortadaki değer ne kadar kayıyor?'],
    insight: 'Uç değerler ortalamayı güçlü biçimde çeker, ortancayı az etkiler; bu yüzden uç değerli verilerde ortanca daha temsilî olabilir.',
    how: ['Toplam üzerinden düşündüm', 'Sıralayıp ortaya baktım', 'Göz kararı söyledim'],
  }
}

function circleTask(): Task {
  return {
    title: 'Çember ve çap',
    q: 'Bir çemberi bir tur yuvarlarsak çevresini ölçeriz. **Büyük** bir çemberde “çevre ÷ çap” küçük çemberdekinden büyük mü olur?',
    predict: { kind: 'choice', options: ['Büyük çemberde daha büyük olur', 'Hep aynı (yaklaşık 3) olur', 'Küçük çemberde daha büyük olur'] },
    truth: 1,
    sim: { k: 'circle', p: { need: 3 } },
    explain: [
      'Çap 2 katına çıkınca çevre de ',
      S('a', o('2 katına çıkıyor', true), o('4 katına çıkıyor', false, 'Tabloda çapı 2 ile 4 olan çemberlerin çevrelerini karşılaştır.', 'Çevre ile alanın aynı biçimde büyüdüğünü düşündü')),
      '; bu yüzden çevre ÷ çap ',
      S('b', o('hep π ≈ 3,14 olur', true), o('çember büyüdükçe büyür', false, 'Tablonun son sütununa bak: bölümler büyüyor mu?', 'Çevre ÷ çap oranının çembere göre değiştiğini düşündü')),
      '.',
    ],
    hints: ['Farklı çaplarla yuvarla ve tablodaki son sütuna bak.', 'Çapı 1 artınca çevre ne kadar artıyor?'],
    insight: 'Her çemberde çevre, çapın yaklaşık 3,14 katıdır: bu sabit oran π sayısıdır.',
    how: ['Ölçerek denedim', 'Oranla düşündüm', 'Göz kararı söyledim'],
  }
}

function makeTasks(g: Grade): Task[] {
  switch (g) {
    case 1:
      return [jarTask(1), measureTask(), unitTask(1), shareTask(1), jarTask(1, 5)]
    case 2:
      return [jarTask(2), measureTask(), unitTask(2), shareTask(2), jarTask(2, 10)]
    case 3:
      return [jarTask(3, 10), parityTask(['o', 'o']), parityTask(['o', 'e']), parityTask(['o', 'o', 'o']), unitTask(3)]
    case 4:
      return [scaleTask(4, 'area2'), spinner2Task(), scaleTask(4, 'area1'), patternTask(4, 'squares', 6), scaleTask(4, 'per2')]
    case 5:
      return [scaleTask(5, 'area1'), scaleTask(5, 'area2'), patternTask(5, 'squares', 10), spin8Task(), scaleTask(5, 'per2')]
    case 6:
      return [spinCountTask(), meanTask(6), circleTask(), patternTask(6, 'triangles', 20), scaleTask(6, 'area3')]
    case 7:
      return [scaleTask(7, 'cube2'), meanTask(7), fairTask(), patternTask(7, 'houses', 20), scaleTask(7, 'cubeS3')]
    default:
      return [diceTask(), scaleTask(8, 'cylR'), patternTask(8, 'squares', 16, true), meanTask(8), scaleTask(8, 'cube3')]
  }
}

// ───────────────────────── Bileşen ─────────────────────────

export default function TahminTestAcikla({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(() => makeTasks(grade).map((t) => ({ ...t, explain: mix(t.explain) })), [grade])
  const S = useSession(tasks.length)
  const N = useNudge()
  const hits = useRef(0)
  const next = () => {
    N.clear()
    if (S.last) {
      const t = S.totals
      onFinish({
        stars: S.stars(),
        summary: `${t.done} deney yaptın: ${hits.current} tahminin tuttu ya da çok yakındı, ${t.first} açıklamayı ilk denemede kurdun.`,
        insight:
          grade <= 2
            ? 'Önce tahmin edip sonra denemek, tahminlerimizi her seferinde daha iyi yapar. Tutmayan bir tahmin de bize bir şey öğretir.'
            : grade <= 5
              ? 'Tahmin et – test et – açıkla: tahminin tutmasa bile, sonucu modelle gösterip nedenini açıklayınca matematiği daha iyi anlarsın.'
              : 'Bir tahmini test etmek ve sonucu gerekçelendirmek matematiksel düşünmenin özüdür; şaşırtan sonuçlar, en güçlü öğrenme anlarıdır.',
      })
      return
    }
    S.next()
  }
  return <TaskView key={S.idx} task={tasks[S.idx]} grade={grade} S={S} N={N} total={tasks.length} onNext={next} onHit={() => hits.current++} />
}

type Phase = 'predict' | 'test' | 'compare' | 'explain' | 'done'
const PHASES: Phase[] = ['predict', 'test', 'compare', 'explain']
const STEP_LABELS = [
  { label: 'Tahmin et', emoji: '🤔' },
  { label: 'Test et', emoji: '🧪' },
  { label: 'Karşılaştır', emoji: '⚖️' },
  { label: 'Açıkla', emoji: '💬' },
]

function closeness(pred: number, res: number) {
  const diff = Math.abs(pred - res)
  const rel = diff / Math.max(1, Math.abs(res))
  if (diff <= 1 || rel <= 0.1) return 0
  if (rel <= 0.3 || diff <= 3) return 1
  return 2
}

function TaskView({ task: T, grade, S, N, total, onNext, onHit }: { task: Task; grade: Grade; S: ReturnType<typeof useSession>; N: ReturnType<typeof useNudge>; total: number; onNext: () => void; onHit: () => void }) {
  const dark = isDark(grade)
  const [phase, setPhase] = useState<Phase>('predict')
  const [choice, setChoice] = useState<number | null>(null)
  const [num, setNum] = useState(T.predict.kind === 'number' ? T.predict.start : 0)
  const [res, setRes] = useState<SimOut | null>(null)
  const [self, setSelf] = useState<number | null>(null)
  const [vals, setVals] = useState<Record<string, number | undefined>>({})
  const [marks, setMarks] = useState<Record<string, 'ok' | 'think' | undefined>>({})
  const [hintN, setHintN] = useState(0)

  const parts: SentencePart[] = T.explain.map((p) => (typeof p === 'string' ? p : { id: p.id, options: p.opts.map((x) => x.t), placeholder: p.ph ?? '…' }))
  const predLabel = T.predict.kind === 'choice' ? (choice !== null ? T.predict.options[choice] : '') : `${tr(num)}${T.predict.unit ? ' ' + T.predict.unit : ''}`
  /** 0: tuttu/çok yakın, 1: yakın, 2: uzak (sayı); 0: tuttu, 1: tutmadı (seçenek) */
  const verdict = res ? (T.predict.kind === 'number' ? closeness(num, res.value ?? 0) : choice === T.truth ? 0 : 1) : null
  const selfOpts = T.predict.kind === 'number' ? ['🎯 Çok yakındı', '🤏 Biraz uzaktı', '😮 Çok uzaktı'] : ['🎯 Tahminim tuttu', '😮 Tahminim tutmadı']

  const lock = () => {
    if (T.predict.kind === 'choice' && choice === null) return
    setPhase('test')
    N.clear()
  }
  const onDone = (r: SimOut) => {
    setRes(r)
    window.setTimeout(() => setPhase('compare'), 450)
  }
  const pickSelf = (i: number) => {
    setSelf(i)
    if (i === verdict) {
      N.clear()
      if (verdict === 0) onHit()
      setPhase('explain')
      return
    }
    if (T.predict.kind === 'number' && res?.value !== undefined) {
      const d = Math.abs(num - res.value)
      N.show(`Tahminin ${tr(num)}, sonuç ${tr(res.value)}. Aradaki fark ${tr(d)}. Bu fark sonucun yanında küçük mü, büyük mü?`)
    } else N.show(`Kilitlediğin tahmini (notta) deneyin gösterdiği sonuçla bir daha karşılaştır.`)
  }
  const check = () => {
    const bad = T.explain.find((p) => typeof p !== 'string' && vals[p.id] !== undefined && !p.opts[vals[p.id]!].ok) as Exclude<XPart, string> | undefined
    const m: Record<string, 'ok' | 'think'> = {}
    T.explain.forEach((p) => {
      if (typeof p !== 'string' && vals[p.id] !== undefined) m[p.id] = p.opts[vals[p.id]!].ok ? 'ok' : 'think'
    })
    setMarks(m)
    if (bad) {
      S.attempt(false)
      const opt = bad.opts[vals[bad.id]!]
      N.show(opt.nudge ?? 'Bu parçayı modelin gösterdiğiyle karşılaştır.', { misc: opt.misc })
      return
    }
    S.attempt(true)
    N.show('Açıklaman modelin gösterdiğiyle uyumlu. 👏', { tone: 'ok' })
    S.complete()
    setPhase('done')
  }
  const hint = () => {
    S.hint()
    const h = T.hints[Math.min(hintN, T.hints.length - 1)]
    setHintN((n) => n + 1)
    N.show(h)
  }

  const step = phase === 'done' ? 4 : PHASES.indexOf(phase)
  const simPhase: SimPhase = phase === 'predict' ? 'predict' : phase === 'test' ? 'test' : 'after'
  const base = { phase: simPhase, grade, onDone, nudge: (q: string, misc?: string) => N.show(q, { misc }) }
  const sim = (() => {
    const s = T.sim
    switch (s.k) {
      case 'jar': return <JarSim p={s.p} {...base} />
      case 'measure': return <MeasureSim p={s.p} {...base} />
      case 'share': return <ShareSim p={s.p} {...base} />
      case 'parity': return <ParitySim p={s.p} {...base} />
      case 'scale': return <ScaleSim p={s.p} {...base} />
      case 'chance': return <ChanceSim p={s.p} {...base} />
      case 'pattern': return <PatternSim p={s.p} {...base} />
      case 'mean': return <MeanSim p={s.p} {...base} />
      case 'circle': return <CircleSim p={s.p} {...base} />
    }
  })()

  const pin = phase !== 'predict' && (
    <PinNote title="Kilitli tahminim">
      <MathText text={predLabel} />
    </PinNote>
  )

  let panel
  if (phase === 'predict') {
    panel = (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-black text-ink-soft">1. Tahminin ne? Seç ve kilitle.</p>
        {T.predict.kind === 'choice' ? (
          T.predict.options.map((op, i) => (
            <Opt key={i} grade={grade} state={choice === i ? 'on' : 'idle'} onClick={() => setChoice(i)}>{op}</Opt>
          ))
        ) : (
          <NumberDial grade={grade} value={num} onChange={setNum} min={T.predict.min} max={T.predict.max} steps={T.predict.steps} unit={T.predict.unit} />
        )}
        <button type="button" onClick={lock} disabled={T.predict.kind === 'choice' && choice === null} className={`btn-primary ${tapH(grade)} mt-1 w-full text-lg`}>
          <Lock size={18} />Tahminimi kilitle
        </button>
      </div>
    )
  } else if (phase === 'test') {
    panel = (
      <div className="flex flex-col items-start gap-3">
        {pin}
        <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-black text-sky-900 ring-1 ring-sky-200">2. Şimdi modelde dene! Tahminin kilitli, değişmeyecek.</p>
      </div>
    )
  } else {
    panel = (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 items-stretch gap-2">
          <div className="flex items-start justify-center pt-2">{pin}</div>
          <div className="flex flex-col justify-center rounded-xl bg-white px-3 py-2 ring-2 ring-sky-300">
            <span className="text-[11px] font-black tracking-wide text-sky-800 uppercase">Deneyin sonucu</span>
            <span className="text-base leading-snug font-black text-ink"><MathText text={res?.label ?? ''} /></span>
          </div>
        </div>
        {phase === 'compare' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-black text-ink-soft">3. Tahminin nasıldı?</p>
            {selfOpts.map((s, i) => (
              <Opt key={i} grade={grade} state={self === i ? (i === verdict ? 'right' : 'think') : 'idle'} onClick={() => pickSelf(i)}>{s}</Opt>
            ))}
            {T.predict.kind === 'choice' && <p className="text-xs font-bold text-ink-soft">Tutmadıysa sorun değil: şaşırtan sonuçlar en çok şey öğretenlerdir.</p>}
          </div>
        )}
        {(phase === 'explain' || phase === 'done') && (
          <>
            {verdict !== null && <p className="text-sm font-black text-ink-soft">{selfOpts[verdict]} · 4. Şimdi nedenini açıkla:</p>}
            <ChipSentence
              grade={grade}
              parts={parts}
              value={vals}
              marks={marks}
              disabled={phase === 'done'}
              onChange={(id, i) => {
                setVals((v) => ({ ...v, [id]: i }))
                setMarks((m) => ({ ...m, [id]: undefined }))
              }}
            />
            {phase === 'explain' && (
              <button type="button" onClick={check} disabled={!sentenceDone(parts, vals)} className={`btn-primary ${tapH(grade)} w-full`}>
                💬 Açıklamamı kontrol et
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <ActivityLayout
      grade={grade}
      idx={S.idx}
      total={total}
      title={T.title}
      prompt={<Rich text={T.q} />}
      nudge={N.nudge}
      onCloseNudge={N.clear}
      done={phase === 'done'}
      doneBox={
        <DoneNote title="Deney tamam!" note={<MathText text={T.insight} />}>
          <StrategyPicker question="Tahminini nasıl yapmıştın?" options={T.how} onPick={() => undefined} />
        </DoneNote>
      }
      onNext={onNext}
      onHint={phase === 'done' ? undefined : hint}
      panel={panel}
    >
      <Steps steps={STEP_LABELS} current={step} dark={dark} />
      {sim}
      {phase === 'predict' && <p className={`mt-3 text-center text-sm font-extrabold ${dark ? 'text-slate-300' : 'text-ink-soft'}`}>Önce tahmin et: denemeyi tahminini kilitledikten sonra yapacaksın.</p>}
    </ActivityLayout>
  )
}

function NumberDial({ grade, value, onChange, min, max, steps, unit }: { grade: Grade; value: number; onChange: (v: number) => void; min: number; max: number; steps: number[]; unit: string }) {
  const big = grade <= 3
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)))
  const b = `grid ${big ? 'h-14 min-w-14' : 'h-12 min-w-12'} place-items-center rounded-2xl bg-white px-2 text-base font-black text-ink ring-1 ring-line shadow-[0_3px_0_var(--color-line)] transition active:scale-95 disabled:opacity-30`
  const desc = steps.slice().sort((a, c) => c - a)
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/90 p-3 ring-1 ring-line">
      <span className="text-5xl font-black text-brand tabular-nums" aria-live="polite">{tr(value)}</span>
      {unit && <span className="-mt-1 text-sm font-black text-ink-soft">{unit}</span>}
      <div className="flex flex-wrap justify-center gap-1.5">
        {desc.map((s) => (
          <button key={`m${s}`} type="button" className={b} disabled={value <= min} onClick={() => set(value - s)} aria-label={`${s} azalt`}>{s === 1 ? <Minus size={22} /> : `−${s}`}</button>
        ))}
        {desc.slice().reverse().map((s) => (
          <button key={`p${s}`} type="button" className={b} disabled={value >= max} onClick={() => set(value + s)} aria-label={`${s} artır`}>{s === 1 ? <Plus size={22} /> : `+${s}`}</button>
        ))}
      </div>
    </div>
  )
}
