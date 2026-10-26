/**
 * Veri Dedektifleri — dosya (vaka) bankası.
 * Her dosya: bir iddia + 1–3 inceleme adımı (her biri bir ipucu açar) + karar (sonuç + kanıt kartları).
 * Kanıt kartlarından birden çoğu geçerli olabilir: her farklı geçerli kanıt yolu `useSolutions` ile sayılır.
 */
import type { Grade } from '../../../data/types'

export type Choice = { t: string; ok?: boolean; fb?: string; mis?: string }
export type Pt = { label: string; value: number }
export type Thumb = 'bar' | 'line' | 'pie' | 'hist' | 'picto' | 'table' | 'dot'

interface Base {
  /** Görev cümlesi (inceleme adımı için) */
  task?: string
  /** Kademeli ipuçları: soru sorar, cevabı söylemez */
  hint?: string[]
  /** Adım tamamlanınca dosyaya eklenen ipucu */
  clue?: string
  /** Adım tamamlanınca rapora yazılan strateji */
  strategy?: string
}

export type Step = Base &
  (
    | { kind: 'axis'; chart: 'bar' | 'line'; title: string; unit: string; data: Pt[]; lo: number; hi: number; goal: 'zero' | 'fit' }
    | { kind: 'picto'; title: string; icon: 'book' | 'tree'; per: number; unit: string; rows: { label: string; count: number; scale: number }[] }
    | { kind: 'survey'; question: string; answers: string[]; groups: { id: string; size: number; dist: number[] }[]; samples: { id: string; label: string; emoji: string; from: string[] | 'all'; n: number; fair: boolean; clue: string }[] }
    | { kind: 'build'; title: string; data: Pt[]; max: number }
    | { kind: 'tally'; title: string; cats: { label: string; color: string; count: number }[] }
    | { kind: 'level'; data: Pt[]; unit: string; missing?: { index: number; mean: number } }
    | { kind: 'range'; rows: { label: string; values: number[] }[]; min: number; max: number; unit: string }
    | { kind: 'balance'; values: number[]; min: number; max: number; unit: string }
    | { kind: 'compare'; rows: { label: string; values: number[] }[]; min: number; max: number; unit: string }
    | { kind: 'spread'; mode: 'outlier' | 'median'; values: number[]; view: [number, number]; unit: string; threshold?: number }
    | { kind: 'window'; title: string; unit: string; data: Pt[]; start: [number, number] }
    | { kind: 'percent'; groups: { label: string; part: number; whole: number }[]; snap: number }
    | { kind: 'grid'; total: number; sets: { label: string; count: number }[]; unit: string }
    | { kind: 'hist'; values: number[]; widths: number[]; start: number; unit: string }
    | { kind: 'ask'; prompt: string; choices: Choice[]; table?: { headers: string[]; rows: string[][] } }
    | { kind: 'pick'; prompt: string; choices: (Choice & { g: Thumb })[] }
  )

export interface Case {
  id: string
  title: string
  emoji: string
  /** Dosyayı getiren kişi */
  client: string
  story: string
  claim: string
  steps: Step[]
  verdict: { conclusions: Choice[]; evidence: Choice[] }
}

const MIS_AXIS = 'Yanıltıcı eksen: sütun/çizgi boyunu gerçek oran sandı (eksen 0’dan başlamıyor)'

/* ───────────────────────── 5. sınıf: kategorik veri, sütun ve resim grafiği, soru oluşturma ───────────────────────── */
const g5: Case[] = [
  {
    id: 'g5-kantin',
    title: 'Kantin Kavgası',
    emoji: '🥤',
    client: 'Kantinci Selin Hanım',
    story: 'Okul kantininde bir haftada kaç şişe ayran ve meyve suyu satıldığını gösteren bir afiş asıldı. Afişi meyve suyu firması hazırlamış.',
    claim: 'Meyve suyu, ayranın 3 katı satıyor!',
    steps: [
      {
        kind: 'axis', chart: 'bar', title: 'Haftalık satış (şişe)', unit: 'şişe', data: [{ label: 'Ayran', value: 44 }, { label: 'Meyve suyu', value: 52 }], lo: 40, hi: 56, goal: 'zero',
        task: 'Afişteki grafiği incele. Dikey eksenin en alttaki sayısını aşağı çekerek ekseni 0’dan başlat.',
        hint: ['Dikey eksendeki en alt sayıyı oku. Sütunlar 0’dan mı başlıyor?', 'En alttaki “40” etiketini parmağınla aşağı sürükle ya da grafiği iki parmakla sıkıştır.'],
        clue: 'Dikey eksen 40’tan başlıyordu; fark olduğundan büyük görünüyordu.',
        strategy: 'Eksenin başladığı yere baktı',
      },
      {
        kind: 'ask', prompt: 'Eksen 0’dan başlayınca ne görüyorsun? Meyve suyu ayrandan kaç şişe fazla satılmış?',
        choices: [
          { t: '8 şişe', ok: true },
          { t: '3 katı kadar', fb: 'Sütun boylarına değil, eksendeki sayılara bak: 52 ile 44. Aradaki fark kaç?', mis: MIS_AXIS },
          { t: '12 şişe', fb: '12, 52 ile 40 arasındaki fark. Ayran kaç şişe satılmıştı?' },
          { t: '52 şişe', fb: '52, meyve suyunun tamamı. Fark için ayranla karşılaştır.' },
        ],
        clue: 'Meyve suyu 52, ayran 44 şişe: fark yalnızca 8 şişe.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Meyve suyu biraz daha çok satılmış ama 3 katı değil.', ok: true },
        { t: 'Afiş haklı: meyve suyu ayranın 3 katı satılmış.', fb: 'Sütunlar 3 kat farklı görünüyordu. 44’ün 3 katı kaç eder? Meyve suyu o kadar satılmış mı?', mis: MIS_AXIS },
        { t: 'Ayran daha çok satılmış.', fb: 'Değerleri yeniden oku: hangisi 52, hangisi 44?' },
      ],
      evidence: [
        { t: 'Eksen 40’tan başlıyordu; bu, farkı büyük gösteriyordu.', ok: true },
        { t: 'Satışlar 52 ve 44 şişe; 44’ün 3 katı 132 eder.', ok: true },
        { t: 'Meyve suyu sütunu ayran sütununun 3 katı uzun.', fb: 'Sütunun boyu eksenin başladığı yere bağlı. Eksen 0’dan başlayınca hâlâ 3 kat mı?', mis: 'Sütun boyunu değer sandı' },
        { t: 'Afişi meyve suyu firması hazırlamış.', fb: 'Bu, şüphelenmek için iyi bir sebep ama kanıt değil. Veriler ne söylüyor?' },
      ],
    },
  },
  {
    id: 'g5-kitap',
    title: 'Kitap Kampanyası',
    emoji: '📚',
    client: 'Kütüphane kolu',
    story: '5-A ve 5-B okul kütüphanesi için kitap topladı. Panoya bir resim grafiği asıldı.',
    claim: '5-B, 5-A’dan çok daha fazla kitap topladı!',
    steps: [
      {
        kind: 'picto', title: 'Toplanan kitaplar', icon: 'book', per: 4, unit: 'kitap', rows: [{ label: '5-A', count: 7, scale: 1 }, { label: '5-B', count: 5, scale: 1.8 }],
        task: '5-B satırındaki simgeler neden farklı? Simgeleri tutamaçtan sürükleyerek ya da iki parmakla küçültüp 5-A’nın simgeleriyle aynı boya getir.',
        hint: ['İki satırdaki kitap simgeleri aynı büyüklükte mi?', 'Satırın sonundaki yuvarlak tutamacı sola sürükle.'],
        clue: '5-B’nin simgeleri daha büyük çizilmişti; bu yüzden satırı uzun görünüyordu.',
        strategy: 'Simge boyutlarını karşılaştırdı',
      },
      {
        kind: 'ask', prompt: 'Anahtara bak: 1 simge = 4 kitap. 5-A kaç kitap toplamış?',
        choices: [
          { t: '28 kitap', ok: true },
          { t: '7 kitap', fb: '7, simge sayısı. Her simge kaç kitabı gösteriyor?', mis: 'Resim grafiğinde anahtarı (1 simge = 4) kullanmadı' },
          { t: '11 kitap', fb: '7 + 4 yaptın. Her simge 4 kitapsa 7 simge kaç kitap eder?' },
          { t: '20 kitap', fb: '20, 5-B’nin kitap sayısı: 5 × 4. Peki 5-A’nın 7 simgesi?' },
        ],
        clue: 'Anahtara göre 5-A: 7 × 4 = 28 kitap, 5-B: 5 × 4 = 20 kitap.',
      },
    ],
    verdict: {
      conclusions: [
        { t: '5-A daha çok kitap toplamış: 28’e karşı 20.', ok: true },
        { t: '5-B daha çok toplamış; satırı daha uzun.', fb: 'Satır uzunluğu simgelerin boyuna da bağlı. Simgeleri say: hangisinde daha çok simge var?', mis: 'Resim grafiğinde simge boyutunu miktar sandı' },
        { t: 'İki sınıf eşit sayıda kitap toplamış.', fb: '7 simge ile 5 simge eşit mi?' },
      ],
      evidence: [
        { t: 'Simgeler aynı boya gelince 5-A’nın satırı daha uzun.', ok: true },
        { t: 'Anahtara göre 7 × 4 = 28 ve 5 × 4 = 20.', ok: true },
        { t: '5-B’nin satırı panoda daha çok yer kaplıyor.', fb: 'Neden daha çok yer kaplıyordu? Simgelerin boyuna bak.', mis: 'Resim grafiğinde simge boyutunu miktar sandı' },
        { t: '5-B’nin simgeleri daha göz alıcı.', fb: 'Göz alıcı olmak veri değildir. Simge sayısı ne diyor?' },
      ],
    },
  },
  {
    id: 'g5-gezi',
    title: 'Gezi Nereye?',
    emoji: '🚌',
    client: 'Sınıf başkanı Elif',
    story: 'Sınıf geziye gidecek: Bilim Merkezi, Hayvanat Bahçesi ya da Müze. Elif karar vermek için veri toplamak istiyor. Sınıfta 28 öğrenci var.',
    claim: 'Can: “Herkes hayvanat bahçesine gitmek istiyor, sordum!”',
    steps: [
      {
        kind: 'ask', task: 'Önce iyi bir anket sorusu seç.', prompt: 'Karar vermek için hangi anket sorusu en uygun?',
        choices: [
          { t: 'Bilim Merkezi, Hayvanat Bahçesi ve Müze’den hangisine gitmek istersin?', ok: true },
          { t: 'Hayvanat bahçesine gitmek istemez misin?', fb: 'Bu soru cevabı bir yere yönlendiriyor. Öteki seçenekler nerede?', mis: 'Yönlendirici anket sorusu seçti' },
          { t: 'Kaç yaşındasın?', fb: 'Bu sorunun cevabı gezi yeri hakkında bir şey söyler mi?' },
          { t: 'Can nereye gitmek istiyor?', fb: 'Tek kişinin cevabı tüm sınıfın kararı olur mu?', mis: 'Tek kişinin görüşünü sınıfın verisi sandı' },
        ],
        clue: 'İyi anket sorusu üç seçeneği de içerir ve cevabı yönlendirmez.',
        strategy: 'Uygun anket sorusu seçti',
      },
      {
        kind: 'survey', question: 'Hangisine gitmek istersin?', answers: ['Bilim Merkezi', 'Hayvanat Bahçesi', 'Müze'],
        groups: [{ id: 'masa', size: 6, dist: [1, 5, 0] }, { id: 'diger', size: 22, dist: [11, 4, 7] }],
        samples: [
          { id: 'masa', label: 'Can’ın masasındaki 6 kişi', emoji: '🪑', from: ['masa'], n: 6, fair: false, clue: 'Can’ın masası: 6 kişiden 5’i Hayvanat Bahçesi dedi.' },
          { id: 'herkes', label: 'Sınıftaki herkes (28 kişi)', emoji: '🏫', from: 'all', n: 28, fair: true, clue: 'Tüm sınıf: Bilim Merkezi 12, Hayvanat Bahçesi 9, Müze 7.' },
        ],
        task: 'Anketi kime yapacaksın? Bir grup seç ve “Anketi yap”a bas. İki grubu da deneyip sonuçları karşılaştırabilirsin.',
        hint: ['Can kimlere sormuş olabilir?', 'Bütün sınıfın kararını bulmak için kimlere sormalısın?'],
        strategy: 'Tüm gruba anket yaptı',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Sınıfın en çok istediği yer Bilim Merkezi.', ok: true },
        { t: 'Herkes hayvanat bahçesine gitmek istiyor.', fb: 'Bunu kaç kişi söyledi? 28 kişinin hepsi mi?', mis: 'Küçük ve yanlı bir gruptan bütün sınıf için genelleme yaptı' },
        { t: 'Müze seçilmeli, çünkü en az kişi istedi.', fb: 'En az istenen yer, sınıfın tercihini mi gösterir?' },
      ],
      evidence: [
        { t: 'Tüm sınıfa sorulunca en çok cevap Bilim Merkezi (12).', ok: true },
        { t: 'Can yalnızca kendi masasına sormuş; bu sınıfı temsil etmiyor.', ok: true },
        { t: 'Can’ın masasında 6 kişiden 5’i hayvanat bahçesi dedi.', fb: 'Bu doğru, ama 6 kişi 28 kişilik sınıfı temsil eder mi?', mis: 'Küçük ve yanlı bir gruptan bütün sınıf için genelleme yaptı' },
        { t: 'Hayvanat bahçesi daha eğlencelidir.', fb: 'Bu bir görüş, veri değil.' },
      ],
    },
  },
  {
    id: 'g5-teneffus',
    title: 'Kayıp Grafik',
    emoji: '🧩',
    client: 'Beden eğitimi öğretmeni',
    story: 'Bir sınıfa “En sevdiğin teneffüs oyunu hangisi?” diye soruldu. Sonuç tablosu bulundu ama grafik kaybolmuş.',
    claim: 'Sınıfın yarısından fazlası futbolu seçti!',
    steps: [
      {
        kind: 'build', title: 'En sevilen teneffüs oyunu', data: [{ label: 'Futbol', value: 9 }, { label: 'Yakan top', value: 7 }, { label: 'İp atlama', value: 6 }, { label: 'Saklambaç', value: 4 }], max: 12,
        task: 'Tablodaki sayılara göre sütunları yukarı sürükleyerek (ya da sütunun hizasına dokunarak) grafiği yeniden çiz.',
        hint: ['Tablodaki ilk satırı oku: futbolu kaç kişi seçmiş?', 'Sütunun tepesini eksendeki o sayının hizasına getir.'],
        clue: 'Grafik: Futbol 9, Yakan top 7, İp atlama 6, Saklambaç 4.',
        strategy: 'Tablodan grafik oluşturdu',
      },
      {
        kind: 'ask', prompt: 'Bu sınıfta toplam kaç öğrenci var?',
        choices: [
          { t: '26', ok: true },
          { t: '9', fb: '9, yalnızca futbolu seçenler. Bütün sütunlardaki öğrencileri düşün.' },
          { t: '4', fb: '4, oyun sayısı. Her oyunu kaç kişi seçmişti?' },
          { t: '24', fb: 'Toplamayı yeniden yap: 9 + 7 + 6 + 4.' },
        ],
        clue: 'Toplam 26 öğrenci var; yarısı 13 eder.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'İddia yanlış: en çok futbol seçilmiş ama 26 kişinin yarısına (13) bile ulaşmamış.', ok: true },
        { t: 'İddia doğru, çünkü futbol en uzun sütun.', fb: 'En çok seçilmek ile yarıdan fazla seçilmek aynı şey mi? Diğer sütunların toplamına bak.', mis: 'En çok seçileni çoğunluk (yarıdan fazla) sandı' },
        { t: 'İddia doğru, çünkü 9 > 7.', fb: 'Bu yalnızca futbolun yakan toptan fazla olduğunu gösterir. Yarıdan fazla mı?' },
      ],
      evidence: [
        { t: 'Toplam 26 öğrenci var; yarısı 13.', ok: true },
        { t: 'Futbolu seçmeyenler: 7 + 6 + 4 = 17 kişi; bu, 9’dan fazla.', ok: true },
        { t: 'Futbol sütunu en uzun sütun.', fb: 'En uzun olması “yarıdan fazla” demek mi?', mis: 'En çok seçileni çoğunluk (yarıdan fazla) sandı' },
        { t: 'Futbol çok sevilen bir oyundur.', fb: 'Bu bir görüş. Bu sınıfın verisi ne diyor?' },
      ],
    },
  },
  {
    id: 'g5-renk',
    title: 'Ortalama Renk?',
    emoji: '🎨',
    client: 'Fen kulübü',
    story: 'Fen kulübündeki 20 öğrencinin göz renkleri incelenecek. Kulüp başkanı bir hesap yapmış.',
    claim: 'Ortalama göz rengimiz ela!',
    steps: [
      {
        kind: 'tally', title: 'Göz rengi çetelesi', cats: [{ label: 'Kahverengi', color: '#8b5a2b', count: 10 }, { label: 'Ela', color: '#a3a23a', count: 5 }, { label: 'Mavi', color: '#3b82f6', count: 3 }, { label: 'Yeşil', color: '#16a34a', count: 2 }],
        task: 'Veriyi sen topla: her öğrenciye dokun, göz rengi çeteleye işlensin.',
        hint: ['Her yüze bir kez dokun; sayılan yüzler soluklaşır.'],
        clue: 'Çetele: Kahverengi 10, Ela 5, Mavi 3, Yeşil 2.',
        strategy: 'Veriyi çeteleyle topladı',
      },
      {
        kind: 'ask', prompt: 'Göz rengi nasıl bir veri?',
        choices: [
          { t: 'Kategorik: her öğrenci bir renk grubuna giriyor.', ok: true },
          { t: 'Sayısal: göz rengi ölçülerek bulunuyor.', fb: 'Göz rengi bir cetvelle ya da tartıyla mı ölçülüyor, yoksa bir gruba mı ayrılıyor?', mis: 'Kategorik veriyi sayısal veri sandı' },
        ],
        clue: 'Göz rengi kategorik bir veri; renkler toplanıp bölünemez.',
      },
    ],
    verdict: {
      conclusions: [
        { t: '“Ortalama renk” hesaplanamaz; en çok görülen renk kahverengi.', ok: true },
        { t: 'Ortalama renk ela, çünkü tabloda ortada o var.', fb: 'Tablodaki sırayı biz seçtik. Sıra değişse “ortalama” da mı değişir?', mis: 'Kategorik veride ortalama aradı' },
        { t: 'Ortalama renk mavi.', fb: 'Renkleri toplayıp bölebilir misin?', mis: 'Kategorik veride ortalama aradı' },
      ],
      evidence: [
        { t: 'Renkler sayı değil; toplanıp bölünemez.', ok: true },
        { t: 'Kahverengi 20 kişiden 10’uyla en çok görülen renk.', ok: true },
        { t: 'Ela, tabloda ortada yazıyor.', fb: 'Tablonun sırası değişebilir; veri değişmez.', mis: 'Kategorik veride ortalama aradı' },
        { t: 'Ela çok güzel bir renk.', fb: 'Bu bir görüş, kanıt değil.' },
      ],
    },
  },
  {
    id: 'g5-gazete',
    title: 'Sınıf Gazetesi',
    emoji: '🍓',
    client: 'Gazete muhabiri Deniz',
    story: 'Sınıf gazetesi en sevilen meyveleri yayımlayacak. Veriler: Elma 8, Muz 5, Çilek 10, Portakal 3.',
    claim: 'Çileği sevenler, muz ve portakalı sevenlerin toplamından fazla!',
    steps: [
      {
        kind: 'pick', task: 'Önce veriyi gösterecek grafiği seç. Uygun olan birden fazla seçenek olabilir.', prompt: 'Bu veriyi göstermek için hangi gösterim uygun?',
        choices: [
          { g: 'bar', t: 'Sütun grafiği', ok: true },
          { g: 'picto', t: 'Resim grafiği', ok: true },
          { g: 'table', t: 'Sıklık tablosu', ok: true },
          { g: 'line', t: 'Çizgi grafiği', fb: 'Çizgi grafiği zaman içindeki değişimi gösterir. Meyveler arasında bir zaman sırası var mı?', mis: 'Kategorik veri için çizgi grafiği seçti' },
        ],
        clue: 'Kategorik veri sütun grafiği, resim grafiği ya da tabloyla gösterilebilir.',
      },
      {
        kind: 'ask', prompt: 'Muz ve portakalı sevenler toplam kaç kişi?',
        choices: [{ t: '8', ok: true }, { t: '5', fb: '5 yalnızca muz. Portakalı da ekle.' }, { t: '2', fb: '5 − 3 yaptın. İddia “toplam” diyor.' }, { t: '13', fb: '13, elma ile muzun toplamı. İddia hangi meyveleri söylüyor?' }],
        clue: 'Muz + portakal = 5 + 3 = 8 kişi; çilek 10 kişi.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'İddia doğru: çileği 10 kişi, muz ve portakalı toplam 8 kişi seviyor.', ok: true },
        { t: 'İddia yanlış, çünkü elma ikinci sırada.', fb: 'İddia elmayla mı ilgili? Hangi meyveleri karşılaştırıyor, yeniden oku.' },
        { t: 'Grafik olmadan karar verilemez.', fb: 'Tablodaki sayılar da veridir. Onlarla karşılaştırabilir misin?' },
      ],
      evidence: [
        { t: '10 > 5 + 3, yani 10 > 8.', ok: true },
        { t: 'Muz ve portakal sütunlarını üst üste koyunca çilek sütunundan kısa kalıyor.', ok: true },
        { t: 'Çilek sütunu en uzun sütun.', fb: 'En uzun olması, iki sütunun toplamından uzun olduğunu gösterir mi?' },
        { t: 'Çilek kırmızı ve tatlı bir meyve.', fb: 'Bu bir görüş, veri değil.' },
      ],
    },
  },
]

/* ───────────────────────── 6. sınıf: kesikli veri, aritmetik ortalama (eşit paylaşım), açıklık, eksenler ───────────────────────── */
const g6: Case[] = [
  {
    id: 'g6-simit',
    title: 'Simit Fırını',
    emoji: '🥯',
    client: 'Fırıncı Ahmet Usta',
    story: 'Rakip fırın, Ahmet Usta’nın bir haftalık sabah simidi satışlarını gösteren bir grafik paylaştı.',
    claim: 'Ahmet Usta’nın satışları çakıldı, neredeyse sıfıra indi!',
    steps: [
      {
        kind: 'axis', chart: 'line', title: 'Sabah simidi satışı (tepsi)', unit: 'tepsi', data: [{ label: 'Pzt', value: 24 }, { label: 'Salı', value: 23 }, { label: 'Çar', value: 22 }, { label: 'Per', value: 21 }, { label: 'Cum', value: 20 }], lo: 19, hi: 25, goal: 'zero',
        task: 'Grafiğin dikey eksenini incele. En alttaki sayıyı aşağı sürükleyerek (ya da iki parmakla sıkıştırarak) ekseni 0’dan başlat.',
        hint: ['Dikey eksen hangi sayıdan başlıyor?', 'Eksen 0’dan başlasaydı çizgi ne kadar inerdi?'],
        clue: 'Dikey eksen 19’dan başlıyordu; küçük düşüş uçurum gibi görünüyordu.',
        strategy: 'Eksenin başladığı yere baktı',
      },
      {
        kind: 'ask', prompt: 'Pazartesiden cumaya satışlar kaç tepsi azalmış?',
        choices: [{ t: '4 tepsi', ok: true }, { t: 'Neredeyse hepsi', fb: 'Eksendeki sayıları oku: pazartesi kaç, cuma kaç?', mis: MIS_AXIS }, { t: '20 tepsi', fb: '20, cuma günkü satış. Azalma için pazartesiyle karşılaştır.' }, { t: '1 tepsi', fb: 'Her gün 1 azalıyor; peki 4 günde toplam?' }],
        clue: 'Satışlar 24’ten 20’ye inmiş: 4 tepsilik azalma.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Satışlar biraz azalmış (24’ten 20’ye); “çakıldı” bir abartı.', ok: true },
        { t: 'Satışlar neredeyse sıfıra inmiş.', fb: 'Cuma günü kaç tepsi satılmış? 20, sıfıra yakın mı?', mis: MIS_AXIS },
        { t: 'Satışlar artmış.', fb: 'Çizgi hangi yöne gidiyor? Pazartesi ve cuma değerlerini karşılaştır.' },
      ],
      evidence: [
        { t: 'Eksen 19’dan başlıyordu; bu, düşüşü büyük gösteriyordu.', ok: true },
        { t: 'Satışlar her gün 1 tepsi azalmış: 24, 23, 22, 21, 20.', ok: true },
        { t: 'Çizgi grafiğin en altına kadar inmiş.', fb: 'Grafiğin “en altı” hangi sayı? Eksen 0’dan başlıyor muydu?', mis: MIS_AXIS },
        { t: 'Grafiği rakip fırın hazırlamış.', fb: 'Şüphelenmek için iyi bir sebep ama kanıt değil. Sayılar ne diyor?' },
      ],
    },
  },
  {
    id: 'g6-bilye',
    title: 'Bilye Paylaşımı',
    emoji: '🔮',
    client: 'Dört arkadaş',
    story: 'Ali, Can, Ece ve Deniz bilyelerini sayıp ortalamayı hesapladılar: ortalama 5 çıktı. Bilyeler: Ali 2, Can 8, Ece 4, Deniz 6.',
    claim: 'Ece: “Ortalama 5 ise her birimizin 5 bilyesi var demektir.”',
    steps: [
      {
        kind: 'level', unit: 'bilye', data: [{ label: 'Ali', value: 2 }, { label: 'Can', value: 8 }, { label: 'Ece', value: 4 }, { label: 'Deniz', value: 6 }],
        task: 'Bilyeleri adil paylaştır: bir kulenin tepesindeki küpü sürükleyip başka bir kuleye bırak (ya da önce kuleye, sonra hedef kuleye dokun). Bütün kuleler eşit olsun.',
        hint: ['Hangi kuleler uzun, hangileri kısa?', 'Uzun kulelerden kısa kulelere küp taşı. Toplam küp sayısı değişiyor mu?'],
        clue: 'Kuleleri eşitleyince her kulede 5 küp oldu: ortalama 5.',
        strategy: 'Eşit paylaşımla ortalamayı buldu',
      },
      {
        kind: 'ask', prompt: 'Küpleri taşırken toplam bilye sayısı değişti mi?',
        choices: [{ t: 'Hayır, toplam hep 20.', ok: true }, { t: 'Evet, arttı.', fb: 'Küp ekledin mi, yoksa yerini mi değiştirdin?' }, { t: 'Evet, azaldı.', fb: 'Küp attın mı, yoksa yerini mi değiştirdin?' }],
        clue: 'Paylaştırırken toplam değişmez: 20 bilye, 4 kişi, 20 ÷ 4 = 5.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Ortalama 5 ama hiç kimsenin tam 5 bilyesi yok.', ok: true },
        { t: 'Herkesin 5 bilyesi var.', fb: 'Başlangıçtaki kulelere bak: Ali’nin kaç bilyesi vardı?', mis: 'Ortalamayı her veri değerine eşit sandı' },
        { t: 'Ortalama 8, çünkü en çok bilye Can’da.', fb: 'Ortalama en büyük değer mi, yoksa eşit paylaşım mı?', mis: 'Ortalamayı en büyük değer sandı' },
      ],
      evidence: [
        { t: 'Eşit paylaşınca her kulede 5 bilye oluyor.', ok: true },
        { t: 'Toplam 20, kişi sayısı 4: 20 ÷ 4 = 5.', ok: true },
        { t: 'Değerler 2, 8, 4, 6; hiçbiri 5 değil.', ok: true },
        { t: 'Can’ın kulesi en yüksek kule.', fb: 'Bu doğru, ama ortalama hakkında ne söylüyor?' },
      ],
    },
  },
  {
    id: 'g6-kayip',
    title: 'Kayıp Sayfa',
    emoji: '📝',
    client: 'Zeynep',
    story: 'Zeynep üç günde kitap okudu. Günlük ortalaması 6 sayfa. Birinci gün 4, ikinci gün 5 sayfa okudu; üçüncü günün kaydı kayıp!',
    claim: 'Kardeşi: “Ortalama 6 ise üçüncü gün de 6 sayfa okumuştur.”',
    steps: [
      {
        kind: 'level', unit: 'sayfa', data: [{ label: '1. gün', value: 4 }, { label: '2. gün', value: 5 }, { label: '3. gün', value: 6 }], missing: { index: 2, mean: 6 },
        task: 'Üçüncü kuleyi + ve − ile ayarla, sonra “Dengele”ye bas: kuleler eşit paylaşılınca her biri 6 oluyor mu?',
        hint: ['Kuleler 6’da eşitlenecekse toplam kaç küp gerekir?', 'İlk iki gün 6’nın kaç altında? Bu eksikleri üçüncü gün kapatmalı.'],
        clue: 'Üçüncü gün 9 sayfa olmalı: 4 + 5 + 9 = 18 = 3 × 6.',
        strategy: 'Ortalamadan toplamı buldu',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Üçüncü gün 9 sayfa okunmuş.', ok: true },
        { t: 'Üçüncü gün 6 sayfa okunmuş.', fb: '4, 5 ve 6’yı eşit paylaştırınca her biri 6 olur mu?', mis: 'Eksik değeri ortalamaya eşit sandı' },
        { t: 'Üçüncü gün 7 sayfa okunmuş.', fb: '4 + 5 + 7 kaç eder? 3 güne eşit paylaşınca?' },
      ],
      evidence: [
        { t: 'Ortalama 6 ise toplam 3 × 6 = 18 sayfa olmalı; 18 − 4 − 5 = 9.', ok: true },
        { t: 'İlk iki gün 6’nın toplam 3 sayfa altında; üçüncü gün 6’nın 3 üstünde olmalı.', ok: true },
        { t: '6, ortadaki sayı.', fb: 'Ortalama “ortadaki sayı” mı, eşit paylaşım mı?', mis: 'Eksik değeri ortalamaya eşit sandı' },
      ],
    },
  },
  {
    id: 'g6-basket',
    title: 'Takım Seçmesi',
    emoji: '🏀',
    client: 'Koç Esra Hanım',
    story: 'Koç, son 5 maça bakarak bir oyuncu seçecek. Mert’in sayıları: 11, 12, 12, 13, 12. Kaan’ın sayıları: 2, 20, 8, 22, 8.',
    claim: 'Yardımcı koç: “İkisinin ortalaması 12, yani ikisi de aynı derecede güvenilir.”',
    steps: [
      {
        kind: 'range', unit: 'sayı', min: 0, max: 24, rows: [{ label: 'Mert', values: [11, 12, 12, 13, 12] }, { label: 'Kaan', values: [2, 20, 8, 22, 8] }],
        task: 'Her oyuncunun en düşük ve en yüksek sayısına dokun: açıklığı (en büyük − en küçük) ölç.',
        hint: ['Her satırda en soldaki ve en sağdaki noktaya bak.', 'Açıklık = en büyük değer − en küçük değer.'],
        clue: 'Açıklık: Mert 13 − 11 = 2, Kaan 22 − 2 = 20.',
        strategy: 'Açıklığı karşılaştırdı',
      },
      {
        kind: 'ask', prompt: 'Yardımcı koçun hesabını kontrol et: Kaan’ın ortalaması kaç?',
        choices: [{ t: '12', ok: true }, { t: '22', fb: '22, en yüksek sayı. Ortalama için toplamı maç sayısına paylaştır.', mis: 'Ortalamayı en büyük değer sandı' }, { t: '8', fb: '8 en sık görülen değer. Ortalama için 2 + 20 + 8 + 22 + 8’i 5 maça paylaştır.' }, { t: '60', fb: '60, toplam sayı. Kaç maça paylaştırmalısın?' }],
        clue: 'İki oyuncunun da ortalaması 12 (60 ÷ 5).',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Ortalamalar eşit ama Mert daha istikrarlı; sayıları birbirine çok yakın.', ok: true },
        { t: 'İkisi aynı, çünkü ortalamaları eşit.', fb: 'Noktalara bak: ikisinin sayıları aynı biçimde mi dağılmış?', mis: 'Ortalaması eşit veri gruplarının dağılımını da aynı sandı' },
        { t: 'Kaan daha iyi, çünkü bir maçta 22 sayı attı.', fb: 'Tek bir maça mı bakmalı? Kaan’ın 2 sayı attığı maç da var.', mis: 'Tek bir uç değere bakarak karar verdi' },
      ],
      evidence: [
        { t: 'Açıklık: Mert 2, Kaan 20.', ok: true },
        { t: 'Mert’in bütün sayıları 11 ile 13 arasında.', ok: true },
        { t: 'Kaan bir maçta 22 sayı attı.', fb: 'Bu tek bir maç. Öteki maçlarda ne oldu?', mis: 'Tek bir uç değere bakarak karar verdi' },
        { t: 'İkisinin de ortalaması 12.', fb: 'Doğru; ama bu, Mert’in daha istikrarlı olduğunu gösterir mi?' },
      ],
    },
  },
  {
    id: 'g6-su',
    title: 'Su Faturası',
    emoji: '💧',
    client: 'Apartman yöneticisi',
    story: 'Site yönetimi iki bloğun bir aylık su tüketimini panoya astı. Değerler metreküp (m³).',
    claim: 'B blok sakini: “Grafiğe bakın, iki blok neredeyse aynı su tüketiyor!”',
    steps: [
      {
        kind: 'axis', chart: 'bar', title: 'Aylık su tüketimi (m³)', unit: 'm³', data: [{ label: 'A blok', value: 40 }, { label: 'B blok', value: 80 }], lo: 0, hi: 1000, goal: 'fit',
        task: 'Bu sefer eksenin tepesine bak! En üstteki sayıyı aşağı sürükleyerek (ya da grafiği iki parmakla açarak) ekseni verilere uygun hâle getir.',
        hint: ['Dikey eksen kaça kadar gidiyor? En büyük değer kaç?', 'En üstteki “1000” etiketini aşağı sürükle.'],
        clue: 'Dikey eksen 1000’e kadar uzatılmıştı; sütunlar çok kısa kalıp farkı gizliyordu.',
        strategy: 'Eksenin ölçeğini inceledi',
      },
      {
        kind: 'ask', prompt: 'B blok, A bloğun kaç katı su tüketmiş?',
        choices: [{ t: '2 katı', ok: true }, { t: 'Neredeyse aynı', fb: 'Değerler 40 ve 80. 80, 40’ın kaç katı?', mis: 'Çok uzatılmış eksende farkı göremedi' }, { t: '40 katı', fb: '40, iki değerin farkı. Kaç katı olduğunu bulmak için ne yapmalısın?' }],
        clue: 'A blok 40 m³, B blok 80 m³: B, A’nın 2 katı.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'B blok, A bloğun 2 katı su tüketmiş.', ok: true },
        { t: 'İki blok neredeyse aynı tüketmiş.', fb: 'Eksenin tepesi 1000’di. Sütunlar neden ikisi de kısacık görünüyordu?', mis: 'Çok uzatılmış eksende farkı göremedi' },
        { t: 'A blok daha çok tüketmiş.', fb: 'Hangisi 40, hangisi 80?' },
      ],
      evidence: [
        { t: 'Değerler 40 ve 80; 80 = 2 × 40.', ok: true },
        { t: 'Eksen 1000’e kadar gidiyordu ama en büyük değer 80’di.', ok: true },
        { t: 'Sütunlar birbirine çok yakın görünüyordu.', fb: 'Neden öyle görünüyordu? Eksenin ölçeğine bak.', mis: 'Çok uzatılmış eksende farkı göremedi' },
      ],
    },
  },
  {
    id: 'g6-kardes',
    title: 'Yarım Kardeş?',
    emoji: '👨‍👩‍👧',
    client: 'Sınıf temsilcisi Arda',
    story: '10 öğrenciye kaç kardeşi olduğu soruldu: 0, 1, 1, 2, 2, 3, 3, 3, 4, 6. Arda ortalamayı 2,5 buldu.',
    claim: 'Arda’nın arkadaşı: “Ortalama 2,5 olamaz, yarım kardeş olmaz ki!”',
    steps: [
      {
        kind: 'balance', unit: 'kardeş', values: [0, 1, 1, 2, 2, 3, 3, 3, 4, 6], min: 0, max: 7,
        task: 'Nokta grafiği bir tahterevalli! Üçgen destek noktasını sürükle: tahterevalli dengeye geldiğinde destek ortalamanın üstündedir.',
        hint: ['Tahterevalli hangi tarafa yatıyor? Desteği o tarafa doğru kaydır.', 'Desteğin solundaki ve sağındaki uzaklıkların toplamı eşit olunca denge olur.'],
        clue: 'Denge noktası 2,5’te: ortalama 2,5 kardeş.',
        strategy: 'Ortalamayı denge noktası olarak buldu',
      },
      {
        kind: 'ask', prompt: '10 öğrencinin toplam kaç kardeşi var?',
        choices: [{ t: '25', ok: true }, { t: '10', fb: '10, öğrenci sayısı. Bütün değerleri topla.' }, { t: '6', fb: '6, en büyük değer. Toplam için hepsini ekle.' }, { t: '2,5', fb: '2,5 ortalama. Toplam ile ortalama arasındaki ilişkiyi düşün.' }],
        clue: '25 kardeş, 10 öğrenci: 25 ÷ 10 = 2,5.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Ortalama 2,5 olabilir; ortalama, verilerden biri ya da tam sayı olmak zorunda değil.', ok: true },
        { t: 'Ortalama 2 ya da 3 olmalı, yarım kardeş olmaz.', fb: 'Ortalama bir kişinin kardeş sayısı mı, yoksa toplamın eşit paylaşımı mı?', mis: 'Ortalamanın veri değerlerinden biri ya da tam sayı olması gerektiğini sandı' },
        { t: 'Ortalama 6, en büyük değer.', fb: 'Tahterevalli 6’da dengede miydi?', mis: 'Ortalamayı en büyük değer sandı' },
      ],
      evidence: [
        { t: 'Tahterevallinin denge noktası 2,5’te.', ok: true },
        { t: '25 ÷ 10 = 2,5.', ok: true },
        { t: 'Hiçbir öğrencinin 2,5 kardeşi yok.', fb: 'Doğru, ama bu ortalamanın 2,5 olmasını engeller mi? Bilye kulelerini hatırla: herkes 5 olmasa da ortalama 5’ti.', mis: 'Ortalamanın veri değerlerinden biri ya da tam sayı olması gerektiğini sandı' },
      ],
    },
  },
]

/* ───────────────────────── 7. sınıf: sürekli veri, ortalama mı ortanca mı, histogram, örneklem ───────────────────────── */
const g7: Case[] = [
  {
    id: 'g7-maas',
    title: 'Maaş Skandalı',
    emoji: '💼',
    client: 'İş arayan Kerem',
    story: 'Küçük bir şirket iş ilanı verdi. Şirkette 9 kişi çalışıyor; aylık maaşlar (bin TL): 20, 22, 22, 24, 25, 25, 26, 28 ve patronun maaşı 348.',
    claim: 'İlan: “Çalışanlarımızın ortalama maaşı 60 bin TL!”',
    steps: [
      {
        kind: 'spread', mode: 'outlier', unit: 'bin TL', values: [20, 22, 22, 24, 25, 25, 26, 28, 348], view: [-16, 380], threshold: 60,
        task: 'Sağdaki uzak nokta patronun maaşı. Onu sürükleyip öteki noktalara yaklaştır; ortalama (pembe) ve ortanca (yeşil) işaretleri ne yapıyor? İstersen iki parmakla yakınlaştır.',
        hint: ['Patronun noktasını sola, kümenin yanına doğru sürükle.', 'Hangi işaret çok hareket ediyor, hangisi neredeyse hiç kıpırdamıyor?'],
        clue: 'Tek bir aykırı değer ortalamayı yaklaşık 24 binden 60 bine çekiyor; ortanca 25 binde kalıyor.',
        strategy: 'Aykırı değerin etkisini denedi',
      },
      {
        kind: 'ask', prompt: 'Patronun maaşı değişince hangisi neredeyse hiç değişmedi?',
        choices: [{ t: 'Ortanca', ok: true }, { t: 'Ortalama', fb: 'Pembe işaret nereden nereye gitti? Yeşil işaret?', mis: 'Aykırı değerin ortalamayı etkilediğini fark etmedi' }, { t: 'İkisi de çok değişti', fb: 'Yeniden sürükle ve yalnızca yeşil işarete bak.' }],
        clue: 'Ortanca 25 bin; 9 çalışandan 8’i 30 binin altında kazanıyor.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'İlan yanıltıcı: çalışanların çoğu 20–28 bin alıyor; ortanca (25 bin) onları daha iyi temsil ediyor.', ok: true },
        { t: 'İlan doğru; ortalama 60 bin, demek ki çoğu kişi 60 bin civarında kazanıyor.', fb: 'Kaç çalışan 60 bin civarında kazanıyor? Noktalara bak.', mis: 'Aykırı değerli veride ortalamayı tipik değer sandı' },
        { t: 'Ortanca da 60 bindir.', fb: 'Değerleri sırala: 9 değerin ortasındaki (5.) değer kaç?' },
      ],
      evidence: [
        { t: 'Tek bir aykırı değer (348 bin) ortalamayı büyütüyor.', ok: true },
        { t: 'Ortanca 25 bin; 9 kişiden 8’i 30 binin altında.', ok: true },
        { t: 'Ortalama hesabı doğru yapılmış: 540 ÷ 9 = 60.', fb: 'Hesap doğru! Ama soru, bu değerin çalışanları iyi temsil edip etmediği.', mis: 'Aykırı değerli veride ortalamayı tipik değer sandı' },
      ],
    },
  },
  {
    id: 'g7-uyku',
    title: 'Uyku Anketi',
    emoji: '😴',
    client: 'Okul gazetesi',
    story: 'Okulda 120 yedinci sınıf öğrencisi var. Muhabir, “Kaçta yatıyorsun?” anketini gece yarısı bir çevrim içi oyun turnuvasındaki 20 öğrenciyle yaptı.',
    claim: 'Manşet: “Yedinci sınıfların çoğu gece 12’den sonra yatıyor!”',
    steps: [
      {
        kind: 'survey', question: 'Kaçta yatıyorsun?', answers: ['22’den önce', '22–23', '23–24', '24’ten sonra'],
        groups: [{ id: 'oyuncu', size: 20, dist: [0, 1, 4, 15] }, { id: 'arkadas', size: 8, dist: [2, 3, 2, 1] }, { id: 'diger', size: 92, dist: [44, 34, 10, 4] }],
        samples: [
          { id: 'turnuva', label: 'Turnuvadaki 20 öğrenci', emoji: '🎮', from: ['oyuncu'], n: 20, fair: false, clue: 'Turnuva örnekleminde 20 kişiden 15’i 24’ten sonra yatıyor.' },
          { id: 'arkadas', label: 'Muhabirin 8 yakın arkadaşı', emoji: '🧑‍🤝‍🧑', from: ['arkadas'], n: 8, fair: false, clue: 'Arkadaş örneklemi yalnızca 8 kişi; okulun tamamını temsil etmiyor.' },
          { id: 'kura', label: 'Okul listesinden kurayla 20 öğrenci', emoji: '🎲', from: 'all', n: 20, fair: true, clue: 'Kurayla seçilen 20 öğrencinin çoğu 23’ten önce yatıyor.' },
        ],
        task: 'Örneklemi sen seç: bir yöntem seçip “Anketi yap”a bas. Kurayı birkaç kez tekrarlayıp sonuçların nasıl değiştiğine de bakabilirsin.',
        hint: ['Turnuvadaki öğrenciler bütün yedinci sınıflara benziyor mu?', 'Her öğrencinin seçilme şansının eşit olduğu yöntem hangisi?'],
        strategy: 'Rastgele örneklemle karşılaştırdı',
      },
      {
        kind: 'ask', prompt: 'Turnuva örnekleminin asıl sorunu ne?',
        choices: [{ t: 'Evreni temsil etmiyor: geç yatanların toplandığı bir yerden seçilmiş.', ok: true }, { t: 'Örneklem çok büyük.', fb: '20 kişi, 120 kişilik evrene göre büyük mü? Asıl sorun kimlerin seçildiği olabilir mi?' }, { t: 'Soru yanlış sorulmuş.', fb: '“Kaçta yatıyorsun?” sorusu cevabı yönlendiriyor mu?' }],
        clue: 'Turnuvadakiler tüm yedinci sınıfları temsil etmiyor (yanlı örneklem).',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Manşet yanlı bir örnekleme dayanıyor; kurayla seçilen öğrencilerin çoğu 23’ten önce yatıyor.', ok: true },
        { t: 'Manşet doğru; 20 kişiye sorulmuş, bu yeterli.', fb: 'Kaç kişiye sorulduğu kadar kimlere sorulduğu da önemli. Turnuvadakiler kimler?', mis: 'Örneklem büyüklüğünü temsil edicilikle karıştırdı' },
        { t: 'Hiçbir anket güvenilir değildir.', fb: 'Kurayla seçilen örneklem de mi güvenilmez? Her öğrencinin seçilme şansı eşitti.' },
      ],
      evidence: [
        { t: 'Turnuvadakiler tüm yedinci sınıfları temsil etmiyor.', ok: true },
        { t: 'Kurayla seçilen öğrencilerin çoğu 23’ten önce yatıyor.', ok: true },
        { t: 'Turnuvada 20 kişinin 15’i 24’ten sonra yatıyor.', fb: 'Bu doğru, ama bu 20 kişi okulun tamamını temsil ediyor mu?', mis: 'Yanlı örneklemden genelleme yaptı' },
      ],
    },
  },
  {
    id: 'g7-sera',
    title: 'Sera Alarmı',
    emoji: '🌡️',
    client: 'Bahçıvan Nuri Bey',
    story: 'Bir seradaki sıcaklık sabah 8’den öğlen 1’e kadar her saat ölçüldü (°C).',
    claim: 'Nuri Bey: “Sıcaklık fırladı, fideler pişecek!”',
    steps: [
      {
        kind: 'axis', chart: 'line', title: 'Sera sıcaklığı (°C)', unit: '°C', data: [{ label: '08', value: 21 }, { label: '09', value: 21.2 }, { label: '10', value: 21.1 }, { label: '11', value: 21.4 }, { label: '12', value: 21.5 }, { label: '13', value: 21.6 }], lo: 20.9, hi: 21.7, goal: 'zero',
        task: 'Dikey eksenin aralığına bak. En alttaki sayıyı aşağı sürükleyerek (ya da iki parmakla sıkıştırarak) ekseni 0’dan başlat ve değişimin gerçek büyüklüğünü gör.',
        hint: ['Dikey eksen hangi değerden hangi değere gidiyor? Aralık kaç derece?', 'Ölçek değişince çizginin eğimi nasıl değişiyor?'],
        clue: 'Eksen yalnızca 20,9 ile 21,7 arasını gösteriyordu; 0,6 derecelik artış dik bir yükseliş gibi görünüyordu.',
        strategy: 'Eksenin ölçeğini inceledi',
      },
      {
        kind: 'ask', prompt: 'Beş saatte sıcaklık kaç derece artmış?',
        choices: [{ t: '0,6 °C', ok: true }, { t: 'Yaklaşık 6 katına çıkmış', fb: 'Değerleri oku: 21’den 21,6’ya. Bu 6 kat mı?', mis: MIS_AXIS }, { t: '21,6 °C', fb: '21,6, son ölçüm. Artış için ilk ölçümle karşılaştır.' }, { t: '6 °C', fb: '21,6 − 21 işlemini ondalık gösterimle yeniden yap.' }],
        clue: 'Sıcaklık 21,0’dan 21,6’ya çıkmış: yalnızca 0,6 °C.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Sıcaklık yalnızca 0,6 °C artmış; dar ölçekli eksen küçük farkı büyük göstermiş.', ok: true },
        { t: 'Sıcaklık katlanarak artmış, fideler tehlikede.', fb: 'İlk ve son ölçümü oku. Artış kaç derece?', mis: MIS_AXIS },
        { t: 'Sıcaklık azalmış.', fb: 'Çizgi hangi yöne gidiyor? Saat 8 ile 13’ü karşılaştır.' },
      ],
      evidence: [
        { t: 'Eksen 20,9 ile 21,7 arasını gösteriyordu; aralık çok dardı.', ok: true },
        { t: '21,0’dan 21,6’ya: fark 0,6 °C.', ok: true },
        { t: 'Çizgi neredeyse dikey yükseliyor.', fb: 'Çizginin eğimi ölçeğe bağlı. Ölçek değişince ne oldu?', mis: MIS_AXIS },
      ],
    },
  },
  {
    id: 'g7-boy',
    title: 'Forma Siparişi',
    emoji: '👕',
    client: 'Spor kulübü',
    story: 'Kulüp, 24 öğrencinin boyunu (cm) ölçtü ve formaları boy aralıklarına göre sipariş edecek. Boylar sürekli bir veri: 152,8 cm gibi değerler alabiliyor.',
    claim: 'Kulüp sorumlusu: “Öğrencilerin çoğu 155 cm’den uzun, büyük beden sipariş edelim.”',
    steps: [
      {
        kind: 'hist', unit: 'cm', start: 140, widths: [2, 5, 10], values: [141.5, 143, 145.2, 146, 147.5, 148, 149, 150.2, 151, 151.5, 152, 152.8, 153, 154, 154.5, 154.8, 155.5, 156, 157.2, 158, 160, 162.5, 165, 171],
        task: 'Histogramın aralık genişliğini değiştir (2, 5 ya da 10 cm). Verinin biçimi nasıl değişiyor? En az iki genişlik dene.',
        hint: ['Çok dar aralıkta sütunlar nasıl görünüyor? Çok genişte?', 'Hangi genişlikte verinin nerede toplandığı en iyi görünüyor?'],
        clue: 'Histogram: öğrencilerin çoğu 145–155 cm arasında toplanmış.',
        strategy: 'Histogramda aralık genişliğini denedi',
      },
      {
        kind: 'ask', prompt: '5 cm’lik aralıklarla bak: 155 cm’den uzun kaç öğrenci var?',
        choices: [{ t: '8', ok: true }, { t: '4', fb: 'Yalnızca 155–160 aralığını saydın. Daha uzun aralıklar da var.' }, { t: '16', fb: '16, 155 cm’den kısa olanlar. Soru uzun olanları soruyor.' }, { t: '1', fb: 'Yalnızca en uzun öğrenciye baktın. 155’in sağındaki bütün sütunları topla.', mis: 'Tek uç değere odaklandı' }],
        clue: '24 öğrenciden yalnızca 8’i 155 cm’den uzun.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'İddia yanlış: 24 öğrenciden yalnızca 8’i 155 cm’den uzun.', ok: true },
        { t: 'İddia doğru; en uzun öğrenci 171 cm.', fb: 'Bir öğrenci “çoğu” mu demek?', mis: 'Tek bir uç değerden genelleme yaptı' },
        { t: 'Histogramdan bu anlaşılamaz.', fb: 'Sütunların yükseklikleri her aralıkta kaç öğrenci olduğunu gösterir. Topla!' },
      ],
      evidence: [
        { t: '155 cm ve üstündeki aralıkların toplamı 8 öğrenci.', ok: true },
        { t: '24 öğrenciden 14’ü 145–155 cm aralığında.', ok: true },
        { t: 'Bir öğrencinin boyu 171 cm.', fb: 'Bu tek bir öğrenci. Çoğunluk nerede?', mis: 'Tek bir uç değerden genelleme yaptı' },
      ],
    },
  },
  {
    id: 'g7-servis',
    title: 'Servis Gecikmesi',
    emoji: '🚐',
    client: 'Servis şoförü Hakan Bey',
    story: 'Okul servisinin 9 günlük gecikmeleri (dakika): 2, 3, 3, 4, 4, 5, 5, 6 ve 44 (o gün lastik patladı).',
    claim: 'Bir veli: “Servis her gün ortalama 8,4 dakika gecikiyor!”',
    steps: [
      {
        kind: 'spread', mode: 'median', unit: 'dk', values: [2, 3, 3, 4, 4, 5, 5, 6, 44], view: [-2, 48],
        task: 'Ortancayı bul: yeşil işareti sürükle ya da sayı doğrusuna dokun, sonra “Kontrol et”e bas. Noktalara dokunarak iki uçtan birer birer eleyebilirsin.',
        hint: ['Kaç değer var? Ortadaki kaçıncı değer olur?', 'En küçük ve en büyük noktaya dokunup ele; sonra bir sonrakileri… Ortada kalan nokta ortancadır.'],
        clue: 'Ortanca 4 dakika: 9 değerin tam ortasındaki (5.) değer.',
        strategy: 'Uçtan eleyerek ortancayı buldu',
      },
      {
        kind: 'ask', prompt: 'Servisin “tipik” gecikmesini anlatmak için hangisi daha uygun?',
        choices: [{ t: 'Ortanca (4 dk)', ok: true }, { t: 'Ortalama (8,4 dk)', fb: 'Ortalama 8,4 dakika. 9 günün kaçında servis 8 dakikadan fazla gecikti?', mis: 'Aykırı değer varken ortalamayı tipik değer sandı' }, { t: 'En büyük değer (44 dk)', fb: '44 dakika tek bir günün değeri. Tipik bir günü anlatır mı?' }],
        clue: '9 günün 8’inde gecikme 6 dakika ya da daha az.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Servis genellikle 4 dakika civarı gecikiyor; 8,4 dakikayı tek bir kötü gün büyütüyor.', ok: true },
        { t: 'Servis her gün 8,4 dakika gecikiyor.', fb: 'Hangi gün 8,4 dakika gecikti? Değerlere bak.', mis: 'Ortalamayı her günün değeri sandı' },
        { t: 'Servis hiç gecikmiyor.', fb: 'En küçük gecikme bile kaç dakika?' },
      ],
      evidence: [
        { t: 'Ortanca 4 dakika.', ok: true },
        { t: '44 dakikalık gün bir aykırı değer; ortalamayı yukarı çekiyor.', ok: true },
        { t: 'Ortalama 8,4 dakika.', fb: 'Hesap doğru, ama bu değer 9 günden kaçına benziyor?', mis: 'Aykırı değer varken ortalamayı tipik değer sandı' },
      ],
    },
  },
  {
    id: 'g7-butce',
    title: 'Harçlık Raporu',
    emoji: '🪙',
    client: 'Ekonomi kulübü',
    story: 'Bir öğrencinin aylık 400 TL harçlığını nasıl harcadığı: atıştırmalık 180 TL, kitap 120 TL, ulaşım 60 TL, birikim 40 TL.',
    claim: 'Kulüp sunumu: “Harçlığın yarısından fazlası atıştırmalığa gidiyor!”',
    steps: [
      {
        kind: 'pick', task: 'Önce uygun grafiği seç. Birden fazla uygun seçenek olabilir.', prompt: 'Bir bütünün (400 TL) parçalara nasıl ayrıldığını göstermek için hangi grafik uygun?',
        choices: [
          { g: 'pie', t: 'Daire grafiği', ok: true },
          { g: 'bar', t: 'Sütun grafiği', ok: true },
          { g: 'line', t: 'Çizgi grafiği', fb: 'Çizgi grafiği zaman içindeki değişimi gösterir. Harcama türleri bir zaman sırası mı?', mis: 'Kategorik veri için çizgi grafiği seçti' },
          { g: 'hist', t: 'Histogram', fb: 'Histogram sürekli bir verinin aralıklara dağılımını gösterir. Harcama türleri aralık mı?', mis: 'Kategorik veri için histogram seçti' },
        ],
        clue: 'Daire grafiği her parçanın bütüne oranını gösterir.',
      },
      {
        kind: 'ask', prompt: 'Atıştırmalık harcaması harçlığın yüzde kaçı?',
        choices: [{ t: '%45', ok: true }, { t: '%180', fb: '180 TL, 400 TL’nin yüzde kaçı? Yüzde 100’ü geçebilir mi?' }, { t: '%50', fb: '400’ün yarısı 200 TL. Atıştırmalık 200 TL mi?' }, { t: '%18', fb: '180’i 1000’e değil, 400’e bölmelisin.' }],
        clue: 'Atıştırmalık 180 ÷ 400 = %45; yarısı (%50) olmak için 200 TL olmalıydı.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'İddia yanlış: atıştırmalık en büyük pay ama %45; yarıdan az.', ok: true },
        { t: 'İddia doğru, çünkü atıştırmalık en büyük dilim.', fb: 'En büyük dilim olmak, yarıdan fazla olmak demek mi?', mis: 'En büyük payı çoğunluk (yarıdan fazla) sandı' },
        { t: 'İddia doğru: 180 > 120.', fb: 'Bu yalnızca atıştırmalığın kitaptan fazla olduğunu gösterir.' },
      ],
      evidence: [
        { t: '180 ÷ 400 = %45 < %50.', ok: true },
        { t: '400’ün yarısı 200 TL; 180 TL bundan az.', ok: true },
        { t: 'Daire grafiğinde atıştırmalık en büyük dilim.', fb: 'En büyük dilim, dairenin yarısını geçiyor mu?', mis: 'En büyük payı çoğunluk (yarıdan fazla) sandı' },
      ],
    },
  },
]

/* ───────────────────────── 8. sınıf: iki veri grubunu karşılaştırma, gösterim seçimi, yüzdeli iddialar, seçilmiş zaman aralıkları ───────────────────────── */
const g8: Case[] = [
  {
    id: 'g8-bisiklet',
    title: 'Seçilmiş Aylar',
    emoji: '🚲',
    client: 'Tüketici derneği',
    story: 'Bir bisiklet firması reklamında yalnızca üç ayın satış grafiğini gösteriyor. Elimizde bütün yılın verisi var.',
    claim: 'Reklam: “Satışlarımız 3 ayda %20 arttı, yükselişteyiz!”',
    steps: [
      {
        kind: 'window', title: 'Aylık bisiklet satışı (adet)', unit: 'adet', start: [6, 8],
        data: [{ label: 'Oca', value: 120 }, { label: 'Şub', value: 115 }, { label: 'Mar', value: 108 }, { label: 'Nis', value: 95 }, { label: 'May', value: 90 }, { label: 'Haz', value: 70 }, { label: 'Tem', value: 60 }, { label: 'Ağu', value: 64 }, { label: 'Eyl', value: 72 }, { label: 'Eki', value: 55 }, { label: 'Kas', value: 50 }, { label: 'Ara', value: 45 }],
        task: 'Reklamın penceresi yalnızca Temmuz–Eylül’ü gösteriyor. Pencerenin kenarlarını sürükleyerek (ya da iki parmakla açarak) bütün yılı göster.',
        hint: ['Pencerenin dışındaki aylarda ne oluyor?', 'Sol kenarı Ocak’a, sağ kenarı Aralık’a sürükle.'],
        clue: 'Bütün yıl: satışlar Ocak’ta 120, Aralık’ta 45. Temmuz–Eylül yılın tek kısa yükselişi.',
        strategy: 'Tüm zaman aralığına baktı',
      },
      {
        kind: 'ask', prompt: 'Ocak’tan Aralık’a satışlar yüzde kaç değişmiş?',
        choices: [{ t: '%62,5 azalmış', ok: true }, { t: '%20 artmış', fb: 'Bu yalnızca Temmuz–Eylül arası. Ocak ve Aralık değerlerini kullan.', mis: 'Seçilmiş bir zaman aralığından genelleme yaptı' }, { t: '%75 azalmış', fb: '75, azalma miktarı (120 − 45). Yüzde için bu miktarı neye bölmelisin?', mis: 'Yüzde değişimi fark ile karıştırdı' }, { t: '%37,5 azalmış', fb: '45 ÷ 120 = %37,5, Aralık’ın Ocak’a oranı. Azalma oranı ne olur?' }],
        clue: 'Yıllık değişim: (120 − 45) ÷ 120 = %62,5 azalma.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Yıl genelinde satışlar düşüyor; reklam yalnızca kısa bir yükselişi seçmiş.', ok: true },
        { t: 'Satışlar artıyor; %20 büyüme var.', fb: 'Bu artış kaç ay sürmüş? Yılın tamamına bakınca da öyle mi?', mis: 'Seçilmiş bir zaman aralığından genelleme yaptı' },
        { t: 'Grafikten bir şey söylenemez.', fb: 'Bütün yılın verisi elinde. Ocak ile Aralık’ı karşılaştır.' },
      ],
      evidence: [
        { t: 'Ocak’ta 120, Aralık’ta 45 satış: %62,5 düşüş.', ok: true },
        { t: 'Temmuz–Eylül artışı yılın tek kısa yükselişi; ardından düşüş sürüyor.', ok: true },
        { t: 'Temmuz’dan Eylül’e %20 artış var.', fb: 'Doğru, ama yalnızca 3 ay. Bu, bütün yılı anlatıyor mu?', mis: 'Seçilmiş bir zaman aralığından genelleme yaptı' },
      ],
    },
  },
  {
    id: 'g8-sube',
    title: 'İki Şube',
    emoji: '🏫',
    client: 'Rehber öğretmen',
    story: '8-A ve 8-B’de 10’ar öğrenci deneme sınavına girdi (20 sorudan doğru sayısı). Müdür ek ders planlayacak.',
    claim: 'Müdür: “İki şubenin ortalaması aynı; ikisine de aynı destek yeterli.”',
    steps: [
      {
        kind: 'compare', unit: 'doğru', min: 0, max: 20, rows: [{ label: '8-A', values: [11, 12, 12, 13, 13, 13, 14, 14, 15, 13] }, { label: '8-B', values: [4, 6, 9, 12, 13, 14, 16, 18, 19, 19] }],
        task: 'İki nokta grafiğini karşılaştır. Araç düğmeleriyle ortalamayı, ortancayı ve açıklığı göster; en az iki aracı kullan.',
        hint: ['Noktalar her şubede nereye toplanmış?', 'Ortalamalar eşitse, iki şubeyi ayıran ne olabilir? Açıklığa bak.'],
        clue: 'Ortalamalar eşit (13 ve 13), ama açıklık 8-A’da 4, 8-B’de 15.',
        strategy: 'Merkez ve yayılımı birlikte karşılaştırdı',
      },
      {
        kind: 'ask', prompt: 'Hangi şubede puanlar daha çok yayılmış?',
        choices: [{ t: '8-B', ok: true }, { t: '8-A', fb: '8-A’nın noktaları 11 ile 15 arasında. 8-B’ninkiler?' }, { t: 'İkisi aynı, ortalamalar eşit', fb: 'Ortalama yayılımı göstermez. Açıklıkları karşılaştır.', mis: 'Ortalaması eşit veri gruplarının dağılımını da aynı sandı' }],
        clue: '8-B’de 4 ve 6 doğru yapan öğrenciler de, 19 doğru yapanlar da var.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Ortalamalar aynı ama 8-B’de puanlar çok yayılmış; bazı öğrencilerin ek desteğe ihtiyacı var.', ok: true },
        { t: 'İki şube aynı durumda.', fb: 'Nokta grafikleri aynı mı görünüyor?', mis: 'Ortalaması eşit veri gruplarının dağılımını da aynı sandı' },
        { t: '8-B daha başarılı, en yüksek puan orada.', fb: 'Yalnızca en yüksek değere bakmak yeterli mi? 8-B’nin en düşük puanı kaç?', mis: 'Yalnızca en büyük değere bakarak karşılaştırdı' },
      ],
      evidence: [
        { t: 'Açıklık 8-A’da 4, 8-B’de 15.', ok: true },
        { t: '8-B’de 4 ve 6 doğru yapan öğrenciler var; 8-A’da en düşük puan 11.', ok: true },
        { t: 'İki şubenin de ortalaması 13.', fb: 'Doğru; bu, sonucun ilk yarısını destekliyor. Peki “yayılmış” olduğunu hangi kanıt gösterir?' },
        { t: '8-B’de 19 doğru yapan iki öğrenci var.', fb: 'Bu yalnızca en üstteki öğrencileri anlatıyor.', mis: 'Yalnızca en büyük değere bakarak karşılaştırdı' },
      ],
    },
  },
  {
    id: 'g8-kulup',
    title: 'Okuma Kulübü',
    emoji: '📖',
    client: 'İlçe kütüphanesi',
    story: 'İki okulda kitap kulübüne katılan öğrenciler sayıldı. A okulunda 300 öğrenciden 90’ı, B okulunda 120 öğrenciden 60’ı kulübe katılıyor.',
    claim: 'A okulu: “Kitap kulübü bizde daha popüler, tam 90 kişi!”',
    steps: [
      {
        kind: 'percent', snap: 5, groups: [{ label: 'A okulu', part: 90, whole: 300 }, { label: 'B okulu', part: 60, whole: 120 }],
        task: 'Her okul için çubuğu katılanların yüzdesi kadar doldur: kenarı sürükle ya da − / + düğmelerini kullan. Sonra “Kontrol et”e bas.',
        hint: ['90, 300’ün yüzde kaçı? 300’ü 100 eşit parçaya bölersen her parça kaç öğrenci olur?', '60, 120’nin yarısı mı?'],
        clue: 'A okulu: 90 ÷ 300 = %30; B okulu: 60 ÷ 120 = %50.',
        strategy: 'Yüzdeye çevirerek karşılaştırdı',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Oranlara bakınca kulüp B okulunda daha popüler (%50’ye karşı %30).', ok: true },
        { t: 'A okulunda daha popüler, çünkü 90 > 60.', fb: 'Okulların öğrenci sayıları eşit mi? 300 kişide 90 ile 120 kişide 60’ı nasıl karşılaştırırsın?', mis: 'Farklı büyüklükteki grupları yüzde yerine sayılarla karşılaştırdı' },
        { t: 'İki okulda eşit popüler.', fb: 'Yüzdeler eşit mi çıktı?' },
      ],
      evidence: [
        { t: 'B okulunda öğrencilerin yarısı (%50) katılıyor.', ok: true },
        { t: 'A okulunda 300 öğrenciden 90’ı katılıyor: %30.', ok: true },
        { t: 'A okulunda katılan sayısı daha çok.', fb: 'Sayı çok ama okul da kalabalık. Oran ne?', mis: 'Farklı büyüklükteki grupları yüzde yerine sayılarla karşılaştırdı' },
      ],
    },
  },
  {
    id: 'g8-artis',
    title: 'Yüzde 200 Artış!',
    emoji: '📈',
    client: 'Okul haber bülteni',
    story: 'Okulda 600 öğrenci var. Geçen yıl 3 öğrenci, bu yıl 9 öğrenci okula bisikletle geliyor.',
    claim: 'Haber: “Bisikletle gelenler %200 arttı; okulun ulaşımı bisiklete döndü!”',
    steps: [
      {
        kind: 'grid', total: 600, unit: 'öğrenci', sets: [{ label: 'Geçen yıl', count: 3 }, { label: 'Bu yıl', count: 9 }],
        task: 'Okuldaki 600 öğrenciyi gör. “Geçen yıl” ve “Bu yıl” düğmelerine dokunarak bisikletle gelenleri işaretle; okulun ne kadarı olduklarına bak.',
        hint: ['İşaretli öğrenciler ızgaranın ne kadarını kaplıyor?'],
        clue: 'Bisikletle gelen: geçen yıl 3, bu yıl 9 öğrenci (600 öğrenciden).',
        strategy: 'Bütüne göre oranı inceledi',
      },
      {
        kind: 'ask', prompt: '3’ten 9’a çıkış yüzde kaç artış?',
        choices: [{ t: '%200', ok: true }, { t: '%300', fb: '9, 3’ün 3 katı. Peki artış miktarı (9 − 3) 3’ün kaç katı?', mis: 'Yüzde artışı yeni değerin katıyla karıştırdı' }, { t: '%6', fb: '6, artış miktarı. Yüzdeye çevirmek için neye bölmelisin?', mis: 'Yüzde değişimi fark ile karıştırdı' }],
        clue: '%200 artış doğru: 6 kişilik artış, 3’ün 2 katı.',
      },
      {
        kind: 'ask', prompt: 'Bu yıl okulun yüzde kaçı bisikletle geliyor?',
        choices: [{ t: '%1,5', ok: true }, { t: '%9', fb: '9 kişi, 100 kişi içinde değil 600 kişi içinde. 9 ÷ 600 kaç?' }, { t: '%200', fb: '%200 artış oranıydı. Şimdi soru, 600 kişinin yüzde kaçı.', mis: 'Yüzde artışı bütünün yüzdesiyle karıştırdı' }],
        clue: 'Bu yıl bile 600 öğrenciden yalnızca 9’u (%1,5) bisikletle geliyor.',
      },
    ],
    verdict: {
      conclusions: [
        { t: '%200 artış doğru, ama bisikletliler hâlâ okulun yalnızca %1,5’i; “ulaşım bisiklete döndü” bir abartı.', ok: true },
        { t: 'Haber tamamen doğru.', fb: '%200 büyük bir sayı ama kaç kişiden kaç kişiye çıkılmış? Okulun ne kadarı?', mis: 'Küçük bir tabandaki yüzde artışı büyük değişim sandı' },
        { t: '%200 yanlış hesaplanmış.', fb: 'Hesabı kontrol et: 3’ten 9’a artış 6; bu, 3’ün kaç katı?' },
      ],
      evidence: [
        { t: 'Bisikletliler 600 kişinin yalnızca 9’u (%1,5).', ok: true },
        { t: 'Artış çok küçük bir tabandan (3 kişi) hesaplanmış.', ok: true },
        { t: '%200 çok büyük bir sayı.', fb: 'Büyük bir yüzde, büyük bir değişim demek mi? Taban kaç kişiydi?', mis: 'Küçük bir tabandaki yüzde artışı büyük değişim sandı' },
      ],
    },
  },
  {
    id: 'g8-sunum',
    title: 'Belediye Sunumu',
    emoji: '📊',
    client: 'Belediye veri ofisi',
    story: 'Belediye üç veriyi sunacak: (1) şehrin 2015–2024 nüfusu, (2) bütçenin harcama kalemlerine dağılımı, (3) 500 kişilik ankette katılımcıların yaşları.',
    claim: 'Danışman: “Hepsini sütun grafiğiyle çizelim, sütun her veri için en iyisidir.”',
    steps: [
      {
        kind: 'pick', task: 'Her veri için uygun gösterimi seç. Birden fazla uygun seçenek olabilir.', prompt: '(1) Şehrin 2015–2024 nüfusu: yıllar içindeki değişim.',
        choices: [{ g: 'line', t: 'Çizgi grafiği', ok: true }, { g: 'bar', t: 'Sütun grafiği', ok: true }, { g: 'pie', t: 'Daire grafiği', fb: 'Daire grafiği bir bütünün parçalarını gösterir. Yılların nüfusları bir bütünün parçaları mı?', mis: 'Zaman içindeki değişim için daire grafiği seçti' }],
        clue: 'Zaman içindeki değişim için çizgi grafiği en açık gösterim.',
      },
      {
        kind: 'pick', prompt: '(2) Bütçenin harcama kalemlerine dağılımı: her kalemin bütçedeki payı.',
        choices: [{ g: 'pie', t: 'Daire grafiği', ok: true }, { g: 'bar', t: 'Sütun grafiği', ok: true }, { g: 'line', t: 'Çizgi grafiği', fb: 'Harcama kalemleri arasında bir zaman sırası var mı?', mis: 'Kategorik veri için çizgi grafiği seçti' }],
        clue: 'Bütünün parçaları için daire grafiği uygun.',
      },
      {
        kind: 'pick', prompt: '(3) 500 katılımcının yaşları: yaşlar nasıl dağılmış?',
        choices: [{ g: 'hist', t: 'Histogram', ok: true }, { g: 'bar', t: 'Her yaş için bir sütun', fb: '500 kişide onlarca farklı yaş olabilir. Her yaşa bir sütun mu? Yaşları aralıklara ayırmak gerekmez mi?', mis: 'Sürekli veri için kategorik sütun grafiği seçti' }, { g: 'pie', t: 'Daire grafiği', fb: 'Onlarca dilimli bir daire okunabilir mi?' }, { g: 'line', t: 'Çizgi grafiği', fb: 'Yaşlar bir zaman sırası mı?' }],
        clue: 'Sürekli veride (yaş) aralıklar gerekir: histogram.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'Danışman haksız: grafik, verinin türüne ve sorulan soruya göre seçilmeli.', ok: true },
        { t: 'Danışman haklı: sütun grafiği her veriyi gösterir.', fb: '500 kişinin yaşlarını sütun grafiğiyle göstermeyi denedin; nasıl olurdu?', mis: 'Her veri için aynı grafik türünü seçti' },
        { t: 'Her veri için daire grafiği en iyisidir.', fb: 'Nüfusun yıllar içindeki değişimi daire grafiğinde görülür mü?', mis: 'Her veri için aynı grafik türünü seçti' },
      ],
      evidence: [
        { t: 'Zaman içindeki değişim en açık çizgi grafiğinde görülür.', ok: true },
        { t: 'Yaş gibi sürekli veride aralıklar gerekir: histogram.', ok: true },
        { t: 'Bütçenin payları daire grafiğinde bütüne göre görülür.', ok: true },
        { t: 'Sütun grafiği çizmesi en kolay grafik.', fb: 'Kolay olmak, uygun olmak demek mi?' },
      ],
    },
  },
  {
    id: 'g8-secim',
    title: 'Başkanlık Anketi',
    emoji: '🗳️',
    client: 'Okul seçim kurulu',
    story: 'Okul başkanlığı için 50 kişiyle anket yapıldı: Aday A %48, Aday B %52. Bir afişte sonuç sütun grafiğiyle gösterildi.',
    claim: 'Afiş: “B, A’yı ezdi geçti!”',
    steps: [
      {
        kind: 'axis', chart: 'bar', title: 'Oy oranı (%)', unit: '%', data: [{ label: 'Aday A', value: 48 }, { label: 'Aday B', value: 52 }], lo: 46, hi: 53, goal: 'zero',
        task: 'Afişteki grafiği incele. En alttaki sayıyı aşağı sürükleyerek (ya da iki parmakla sıkıştırarak) ekseni 0’dan başlat.',
        hint: ['Dikey eksen kaçtan başlıyor?', 'Eksen 0’dan başlayınca sütun boyları nasıl görünüyor?'],
        clue: 'Eksen 46’dan başlıyordu; 4 puanlık fark 3 kat gibi görünüyordu.',
        strategy: 'Eksenin başladığı yere baktı',
      },
      {
        kind: 'ask', prompt: 'Anket 50 kişiyle yapıldı. %52 ile %48 arasındaki fark kaç kişi?',
        choices: [{ t: '2 kişi', ok: true }, { t: '4 kişi', fb: '%4, 50 kişinin kaçı eder? 50’nin %1’i kaç kişi?', mis: 'Yüzde puan farkını kişi sayısı sandı' }, { t: '26 kişi', fb: '26, B’nin oy sayısı. Farkı bul.' }],
        clue: 'B 26, A 24 oy almış: fark yalnızca 2 kişi.',
      },
    ],
    verdict: {
      conclusions: [
        { t: 'B önde ama fark çok küçük: 50 kişide yalnızca 2 kişi.', ok: true },
        { t: 'B, A’nın yaklaşık 3 katı oy almış.', fb: '%52, %48’in 3 katı mı?', mis: MIS_AXIS },
        { t: 'A önde.', fb: 'Hangi aday %52 almış?' },
      ],
      evidence: [
        { t: 'Eksen 46’dan başlıyordu; fark büyük görünüyordu.', ok: true },
        { t: '26’ya 24 oy: fark yalnızca 2 kişi.', ok: true },
        { t: 'B’nin sütunu A’nınkinin 3 katı uzun.', fb: 'Eksen 0’dan başlayınca da öyle mi?', mis: MIS_AXIS },
      ],
    },
  },
]

export const BANK: Partial<Record<Grade, Case[]>> = { 5: g5, 6: g6, 7: g7, 8: g8 }

export const STRATEGY_OPTIONS: Record<number, string[]> = {
  5: ['Eksene/simgelere baktım', 'Sayıları karşılaştırdım', 'Kime sorulduğuna baktım', 'Toplamı hesapladım'],
  6: ['Eksene baktım', 'Kuleleri eşitledim', 'Toplamı paylaştırdım', 'Açıklığa baktım'],
  7: ['Aykırı değeri fark ettim', 'Ortancayı kullandım', 'Örnekleme baktım', 'Ölçeği okudum'],
  8: ['Tüm zaman aralığına baktım', 'Yüzdeye çevirdim', 'Merkez ve yayılımı karşılaştırdım', 'Grafik türünü sorguladım'],
}

export const INSIGHT: Record<number, string> = {
  5: 'Bir grafiğe inanmadan önce eksene, simgelere ve verinin kimden toplandığına bakarız; bir iddiayı ancak sayılar destekliyorsa kabul ederiz.',
  6: 'Aritmetik ortalama, toplamın eşit paylaşılmasıdır; ama tek başına yetmez: açıklık verinin ne kadar yayıldığını gösterir, eksenin nereden başladığı da farkı büyütebilir.',
  7: 'Aykırı bir değer ortalamayı kendine çeker ama ortancayı pek etkilemez; bir sonuç ancak evreni temsil eden bir örneklemden çıkıyorsa güvenilirdir.',
  8: 'İki veri grubunu merkez ve yayılımla birlikte karşılaştırırız; yüzdeler, seçilen zaman aralığı ve grafik türü aynı veriyle bambaşka hikâyeler anlatabilir.',
}
