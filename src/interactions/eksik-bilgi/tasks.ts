import type { Grade } from '../../data/types'
import { shuffle, tr } from '../hizli-noktalar/kit'

/**
 * Eksik Bilgiyi Bul — soru bankası.
 * Her problem: kısa bir hikâye + soru, gerekli (need) ve gereksiz (extra) bilgi kartları.
 * `miss` varsa çözüm için gereken bir bilgi problemde YOKTUR; öğrenci onu bulur, makul bir değer seçer ve çözer.
 * `ans(v)`: öğrencinin seçtiği değerle (eksik yoksa v yok sayılır) cevap; `expr(v)`: çözümün işlem yazımı.
 */

export interface Missing {
  /** Eksik bilgi çipi */
  label: string
  /** Değer birimi (NumPad yanında) */
  unit: string
  min: number
  max: number
  /** Öğrencinin değeriyle oluşan yeni kart: # yerine değer yazılır */
  card: string
  tooLow: string
  tooHigh: string
  /** Ek koşul (ör. 3’e bölünebilme); false ise `okMsg` sorulur */
  ok?: (v: number) => boolean
  okMsg?: string
  /** Ondalıklı değer olabilir mi */
  decimal?: boolean
}

export interface Prob {
  title: string
  emoji: string
  story: string
  q: string
  need: string[]
  extra: string[]
  miss?: Missing
  /** Eksik bilgi gibi görünen ama gerekmeyen çipler */
  decoys: string[]
  ans: (v: number) => number
  expr: (v: number) => string
  unit: string
  hint: string
  /** Cevap ondalıklı / negatif olabilir mi */
  decimal?: boolean
  negative?: boolean
  /** Cevap yüzde birlere yuvarlanabilir */
  round?: boolean
}

const n = (v: number) => tr(v, 2)

const G3: Prob[] = [
  {
    title: 'Kalem alışverişi', emoji: '🖍️',
    story: 'Ece kırtasiyeden kalem aldı.', q: 'Ece kalemlere toplam kaç TL ödedi?',
    need: ['Ece 4 kalem aldı.'], extra: ['Ece 8 yaşında.', 'Kırtasiye okula 200 m uzaklıkta.'],
    miss: { label: 'Bir kalemin fiyatı', unit: 'TL', min: 2, max: 150, card: 'Bir kalem # TL.', tooLow: 'Bir kalem bu kadar ucuz olabilir mi? Kırtasiyede bir kalem kaç TL olur, düşün.', tooHigh: 'Bir kalem için bu çok pahalı değil mi? Gerçek hayatta bir kalem kaç TL olur?' },
    decoys: ['Ece’nin cebindeki para', 'Kırtasiyenin açılış saati'],
    ans: (v) => 4 * v, expr: (v) => `4 × ${n(v)}`, unit: 'TL',
    hint: '4 kalemin her biri aynı fiyatta. Aynı sayıyı 4 kez toplamak hangi işleme benzer?',
  },
  {
    title: 'Okul gezisi', emoji: '🚌',
    story: 'Öğrenciler otobüsle geziye gidiyor.', q: 'İlk duraktan sonra otobüste kaç öğrenci kaldı?',
    need: ['Otobüste 45 öğrenci vardı.', 'İlk durakta 12 öğrenci indi.'], extra: ['Otobüs saat 9’da yola çıktı.', 'Otobüsün 50 koltuğu var.'],
    decoys: ['Otobüsün hızı', 'Şoförün adı'],
    ans: () => 33, expr: () => '45 − 12', unit: 'öğrenci',
    hint: 'Öğrenciler indiğinde otobüsteki öğrenci sayısı artar mı, azalır mı?',
  },
  {
    title: 'Kurabiye tepsileri', emoji: '🍪',
    story: 'Annem bayram için kurabiye pişirdi.', q: 'Annem toplam kaç kurabiye pişirdi?',
    need: ['Annem her tepsiye 6 kurabiye dizdi.'], extra: ['Kurabiyeler 20 dakikada pişti.', 'Fırın 180 derece.'],
    miss: { label: 'Kaç tepsi olduğu', unit: 'tepsi', min: 1, max: 12, card: 'Annem # tepsi kurabiye pişirdi.', tooLow: 'Hiç tepsi olmazsa kurabiye pişer mi?', tooHigh: 'Bir evde bu kadar çok tepsi pişirilir mi? Daha makul bir sayı düşün.' },
    decoys: ['Bir kurabiyenin fiyatı', 'Kurabiyeyi kaç kişinin yiyeceği'],
    ans: (v) => 6 * v, expr: (v) => `${n(v)} × 6`, unit: 'kurabiye',
    hint: 'Her tepside 6 kurabiye var. Tepsileri tek tek sayabilir ya da çarpabilirsin.',
  },
  {
    title: 'Kütüphane', emoji: '📚',
    story: 'Okul kütüphanesinde kitap sayımı yapıldı.', q: 'Kütüphanede hikâye ve bilim kitaplarından toplam kaç tane var?',
    need: ['Kütüphanede 235 hikâye kitabı var.', 'Kütüphanede 148 bilim kitabı var.'], extra: ['Kütüphane 5 katlı bir binada.', 'Kütüphane 3 yıl önce açıldı.'],
    decoys: ['Bir rafa kaç kitap sığdığı', 'Kitapların renkleri'],
    ans: () => 383, expr: () => '235 + 148', unit: 'kitap',
    hint: 'İki tür kitabın toplamı soruluyor. Yüzlükleri, onlukları ve birlikleri ayrı ayrı toplayabilirsin.',
  },
  {
    title: 'Akvaryum', emoji: '🐟',
    story: 'Can’ın evinde bir akvaryum var.', q: 'Şimdi akvaryumda kaç balık var?',
    need: ['Akvaryumda 18 balık vardı.'], extra: ['Akvaryum 60 litre.', 'Balıklara günde 2 kez yem verilir.'],
    miss: { label: 'Kaç balık eklendiği', unit: 'balık', min: 1, max: 30, card: 'Can akvaryuma # balık daha ekledi.', tooLow: 'Hiç balık eklenmezse “daha ekledi” diyebilir miyiz?', tooHigh: 'Küçük bir akvaryuma bu kadar balık sığar mı?' },
    decoys: ['Balıkların renkleri', 'Akvaryumun fiyatı'],
    ans: (v) => 18 + v, expr: (v) => `18 + ${n(v)}`, unit: 'balık',
    hint: 'Balık eklenince sayı artar. 18’den başlayıp ileri sayabilirsin.',
  },
  {
    title: 'Top alışverişi', emoji: '⚽',
    story: 'Mert biriktirdiği parayla oyuncakçıya gitti.', q: 'Mert’in kaç TL’si kaldı?',
    need: ['Mert’in 50 TL’si vardı.', 'Mert 35 TL’lik bir top aldı.'], extra: ['Top kırmızı renkliydi.', 'Mert’in kardeşi 6 yaşında.'],
    decoys: ['Oyuncakçının adresi', 'Topun ağırlığı'],
    ans: () => 15, expr: () => '50 − 35', unit: 'TL',
    hint: 'Para harcanınca azalır. 35’ten 50’ye kaç kaldığını sayabilirsin.',
  },
  {
    title: 'Lale bahçesi', emoji: '🌷',
    story: 'Okul bahçesine laleler dikildi.', q: 'Bahçede toplam kaç lale var?',
    need: ['Bahçede 3 sıra lale var.'], extra: ['Bahçede 2 ağaç var.', 'Laleler sarı ve kırmızı.'],
    miss: { label: 'Bir sırada kaç lale olduğu', unit: 'lale', min: 2, max: 30, card: 'Her sırada # lale var.', tooLow: 'Bir sırada tek lale olursa “sıra” olur mu?', tooHigh: 'Okul bahçesinde bir sıraya bu kadar lale sığar mı?' },
    decoys: ['Lalelerin boyu', 'Lalelerin ne zaman dikildiği'],
    ans: (v) => 3 * v, expr: (v) => `3 × ${n(v)}`, unit: 'lale',
    hint: '3 sıranın her birinde aynı sayıda lale var. Sıraları tek tek toplayabilir ya da çarpabilirsin.',
  },
]

const G4: Prob[] = [
  {
    title: 'Bisiklet', emoji: '🚲',
    story: 'Elif tatilde bisiklet sürdü.', q: 'Elif toplam kaç km bisiklet sürdü?',
    need: ['Elif her gün 3 km bisiklet sürüyor.'], extra: ['Elif’in bisikleti mavi.', 'Elif 10 yaşında.'],
    miss: { label: 'Kaç gün sürdüğü', unit: 'gün', min: 1, max: 90, card: 'Elif # gün bisiklet sürdü.', tooLow: 'Hiç gün olmazsa bisiklet sürmüş olur mu?', tooHigh: 'Bir tatil bu kadar uzun sürer mi? Yaz tatili kaç gün kadardır?' },
    decoys: ['Bisikletin hızı', 'Bisikletin fiyatı'],
    ans: (v) => 3 * v, expr: (v) => `${n(v)} × 3`, unit: 'km',
    hint: 'Her gün aynı yol: 3 km. Gün sayısı kadar 3 km’yi toplamak hangi işlem?',
  },
  {
    title: 'Sinema', emoji: '🎬',
    story: 'Aile sinemaya gitti.', q: 'Reklamlar ve film toplam kaç dakika sürdü?',
    need: ['Film 95 dakika sürdü.', 'Filmden önce 15 dakika reklam vardı.'], extra: ['Sinemaya saat 14.30’da girdiler.', 'Bir bilet 80 TL.'],
    decoys: ['Salondaki koltuk sayısı', 'Filmin adı'],
    ans: () => 110, expr: () => '95 + 15', unit: 'dakika',
    hint: 'Sorulan bir süre. Hangi kartlar süre (dakika) bildiriyor?',
  },
  {
    title: 'Su kolileri', emoji: '📦',
    story: 'Mahalledeki market su siparişi verdi.', q: 'Market kaç şişe su aldı?',
    need: ['Bir kolide 24 şişe su var.', 'Market 15 koli su aldı.'], extra: ['Bir şişe 500 mL.', 'Market sabah 8’de açılıyor.'],
    decoys: ['Bir koli suyun fiyatı', 'Marketin büyüklüğü'],
    ans: () => 360, expr: () => '15 × 24', unit: 'şişe',
    hint: '15 kolinin her birinde 24 şişe var. 10 koli + 5 koli diye parçalayabilirsin.',
  },
  {
    title: 'Kurdeleler', emoji: '🎀',
    story: 'Ayşe hediye paketleri için kurdele kesti.', q: 'Ayşe toplam kaç cm kurdele kesti?',
    need: ['Ayşe eşit uzunlukta 6 kurdele kesti.'], extra: ['Kurdeleler pembe.', 'Ayşe 3 arkadaşına hediye aldı.'],
    miss: { label: 'Bir kurdelenin uzunluğu', unit: 'cm', min: 5, max: 200, card: 'Her kurdele # cm.', tooLow: 'Bu kadar kısa bir kurdeleyle paket bağlanır mı? Cetvelinde kaç cm olurdu?', tooHigh: 'Bir paket için bu kadar uzun kurdele gerekir mi? 1 m kaç cm?' },
    decoys: ['Kurdelenin rengi', 'Paketlerin ağırlığı'],
    ans: (v) => 6 * v, expr: (v) => `6 × ${n(v)}`, unit: 'cm',
    hint: '6 kurdelenin hepsi aynı uzunlukta. Aynı uzunluğu 6 kez toplamak hangi işlem?',
  },
  {
    title: 'Pistte koşu', emoji: '🏃',
    story: 'Deniz okulun koşu pistinde antrenman yaptı.', q: 'Deniz kaç metre koştu?',
    need: ['Pistin bir turu 400 m.'], extra: ['Deniz’in ayakkabı numarası 36.', 'Hava 22 derece.'],
    miss: { label: 'Kaç tur koştuğu', unit: 'tur', min: 1, max: 25, card: 'Deniz pistte # tur koştu.', tooLow: 'Hiç tur atmadan koşmuş olur mu?', tooHigh: 'Bir antrenmanda bu kadar tur atılır mı? Kaç km eder, düşün.' },
    decoys: ['Kaç dakika koştuğu', 'Deniz’in hızı'],
    ans: (v) => 400 * v, expr: (v) => `${n(v)} × 400`, unit: 'm',
    hint: 'Her tur 400 m. Tur sayısı kadar 400 m’yi topla: 4 yüzlük × tur sayısı.',
  },
  {
    title: 'Manav', emoji: '🍎',
    story: 'Manav toptancıdan elma aldı.', q: 'Manavın kaç sağlam elması var?',
    need: ['Bir kasada 36 elma var.', 'Manav 4 kasa elma aldı.', 'Elmaların 25’i çürük çıktı.'], extra: ['Manav dükkânı sabah 7’de açılıyor.', 'Bir kasa elma 180 TL.'],
    decoys: ['Elmaların rengi', 'Manavın kaç çalışanı olduğu'],
    ans: () => 119, expr: () => '4 × 36 − 25', unit: 'elma',
    hint: 'Önce tüm elmaları bul, sonra çürükleri çıkar. İki adımlı bir problem.',
  },
  {
    title: 'Kumbara', emoji: '🐷',
    story: 'Sinan bisiklet için para biriktiriyor.', q: '4 hafta sonra kumbarasında kaç TL olur?',
    need: ['Sinan’ın kumbarasında 340 TL var.'], extra: ['Kumbara domuz şeklinde.', 'Sinan 4. sınıfa gidiyor.'],
    miss: { label: 'Her hafta kaç TL biriktirdiği', unit: 'TL', min: 5, max: 500, card: 'Sinan her hafta # TL biriktiriyor.', tooLow: 'Bu kadar az parayla biriktirmek anlamlı olur mu? Biraz daha makul bir miktar düşün.', tooHigh: 'Bir öğrenci her hafta bu kadar para biriktirebilir mi?' },
    decoys: ['Bisikletin fiyatı', 'Kumbaranın ağırlığı'],
    ans: (v) => 340 + 4 * v, expr: (v) => `340 + 4 × ${n(v)}`, unit: 'TL',
    hint: 'Önce 4 haftada biriken parayı bul, sonra kumbaradaki paraya ekle.',
  },
]

const G5: Prob[] = [
  {
    title: 'Bahçe çiti', emoji: '🏡',
    story: 'Dikdörtgen biçimli bir bahçenin etrafı çitle çevrilecek.', q: 'Bahçenin etrafı için kaç metre çit gerekir?',
    need: ['Bahçenin uzun kenarı 12 m.'], extra: ['Bahçede 8 domates fidesi var.', 'Çitin metresi 75 TL.'],
    miss: { label: 'Bahçenin kısa kenarı', unit: 'm', min: 1, max: 11, card: 'Bahçenin kısa kenarı # m.', tooLow: 'Kenar uzunluğu 0 olursa bahçe olur mu?', tooHigh: 'Kısa kenar, 12 m’lik uzun kenardan uzun ya da ona eşit olabilir mi?' },
    decoys: ['Çitin yüksekliği', 'Bahçedeki fide sayısı'],
    ans: (v) => 2 * (12 + v), expr: (v) => `2 × (12 + ${n(v)})`, unit: 'm',
    hint: 'Çevre: dört kenarın toplamı. Dikdörtgende karşılıklı kenarlar eşit.',
  },
  {
    title: 'Sınıf gezisi', emoji: '🎒',
    story: '5-A sınıfı müzeye gezi düzenledi.', q: 'Geziye kaç öğrenci katıldı?',
    need: ['Sınıfta 28 öğrenci var.', 'Öğrencilerin [[3/4]]’ü geziye katıldı.'], extra: ['Gezi 3 saat sürdü.', 'Otobüs 45 kişilik.'],
    decoys: ['Müzenin giriş ücreti', 'Kaç öğretmenin gittiği'],
    ans: () => 21, expr: () => '28 ÷ 4 × 3', unit: 'öğrenci',
    hint: '28 öğrenciyi 4 eş gruba ayır. Kaç grup geziye katıldı?',
  },
  {
    title: 'Kitap okuma', emoji: '📖',
    story: 'Ali yeni bir roman okumaya başladı.', q: 'Ali kaç sayfa okudu?',
    need: ['Ali kitabın [[1/3]]’ünü okudu.'], extra: ['Kitabın kapağı yeşil.', 'Ali her akşam yatmadan okuyor.'],
    miss: { label: 'Kitabın kaç sayfa olduğu', unit: 'sayfa', min: 30, max: 1200, card: 'Kitap # sayfa.', tooLow: 'Bir roman bu kadar ince olur mu?', tooHigh: 'Bu kadar kalın bir romanı taşımak kolay olur mu? Daha makul bir sayı seç.', ok: (v) => v % 3 === 0, okMsg: 'Kitabın üçte birini tam sayfa olarak bulabilmek için hangi sayılar işe yarar? 3’e bölünebilen bir sayı seçer misin?' },
    decoys: ['Ali’nin günde kaç sayfa okuduğu', 'Kitabın yazarı'],
    ans: (v) => v / 3, expr: (v) => `${n(v)} ÷ 3`, unit: 'sayfa',
    hint: 'Kitabı 3 eş parçaya ayır. Ali bunların kaç tanesini okudu?',
  },
  {
    title: 'Stadyum', emoji: '🏟️',
    story: 'Şehrin stadyumunda futbol maçı oynandı.', q: 'Maçı stadyumda kaç kişi izledi?',
    need: ['Stadyumda 52.450 koltuk var.', 'Maçta 3.860 koltuk boş kaldı.'], extra: ['Maç 90 dakika sürdü.', 'Bir bilet 250 TL.'],
    decoys: ['Takımların puanı', 'Stadyumun kaç kapısı olduğu'],
    ans: () => 48590, expr: () => '52.450 − 3.860', unit: 'kişi',
    hint: 'Boş kalan koltuklarda kimse yok. Tüm koltuklardan boşları çıkar.',
  },
  {
    title: 'Halı', emoji: '🛋️',
    story: 'Dikdörtgen biçimli bir odanın tabanı halıyla tamamen kaplanacak.', q: 'Kaç metrekare halı gerekir?',
    need: ['Odanın eni 4 m.'], extra: ['Odanın tavanı 3 m yükseklikte.', 'Odada 2 pencere var.'],
    miss: { label: 'Odanın boyu', unit: 'm', min: 2, max: 15, card: 'Odanın boyu # m.', tooLow: 'Bu kadar dar bir odaya yatak sığar mı?', tooHigh: 'Bir evdeki oda bu kadar uzun olur mu?' },
    decoys: ['Halının rengi', 'Halının kalınlığı'],
    ans: (v) => 4 * v, expr: (v) => `4 × ${n(v)}`, unit: 'm²',
    hint: 'Tabanı 1 m × 1 m’lik karelerle kapladığını düşün. Kaç sıra, her sırada kaç kare olur?',
  },
  {
    title: 'Çiftlik sütü', emoji: '🥛',
    story: 'Çiftçi sabah inekleri sağdı.', q: 'Peynir için kaç litre süt ayırdı?',
    need: ['Bir bidonda 4 L süt var.', 'Çiftçi 3 bidon süt sağdı.', 'Sütün [[1/4]]’ünü peynir yapımına ayırdı.'], extra: ['İnekler sabah 6’da sağıldı.', 'Çiftlikte 5 inek var.'],
    decoys: ['Peynirin satış fiyatı', 'Bidonların ağırlığı'],
    ans: () => 3, expr: () => '3 × 4 ÷ 4', unit: 'L',
    hint: 'Önce toplam sütü bul. Sonra onu 4 eş parçaya ayır.',
  },
  {
    title: 'Bilgisayar sınıfı', emoji: '💻',
    story: 'Okul yeni bir bilgisayar sınıfı kuruyor.', q: 'Okul bilgisayarlara toplam kaç TL ödedi?',
    need: ['Bir bilgisayar 18.500 TL.'], extra: ['Okulda 640 öğrenci var.', 'Bilgisayarlar 2 yıl garantili.'],
    miss: { label: 'Kaç bilgisayar alındığı', unit: 'bilgisayar', min: 2, max: 60, card: 'Okul # bilgisayar aldı.', tooLow: 'Tek bilgisayarla bir “bilgisayar sınıfı” kurulur mu?', tooHigh: 'Bir sınıfa bu kadar bilgisayar sığar mı?' },
    decoys: ['Bir bilgisayarın ağırlığı', 'Okuldaki öğretmen sayısı'],
    ans: (v) => 18500 * v, expr: (v) => `${n(v)} × 18.500`, unit: 'TL',
    hint: '18.500’ü 18 bin ve 500 diye parçalayıp ayrı ayrı çarpabilirsin.',
  },
]

const G6: Prob[] = [
  {
    title: 'İndirimli mont', emoji: '🛍️',
    story: 'Mağazada kış indirimi başladı.', q: 'Mont indirimden sonra kaç TL?',
    need: ['Montun etiket fiyatı 1.200 TL.'], extra: ['Mağaza AVM’nin 2. katında.', 'Mont lacivert.'],
    miss: { label: 'İndirim oranı (yüzde)', unit: '%', min: 5, max: 80, card: 'Montta %# indirim var.', tooLow: 'Bu kadar küçük bir indirim mağaza vitrinine yazılır mı?', tooHigh: 'Mağaza montu neredeyse bedavaya mı veriyor? Daha makul bir oran düşün.' },
    decoys: ['Montun bedeni', 'Kaç mont satıldığı'],
    ans: (v) => 1200 - 12 * v, expr: (v) => `1.200 − 1.200 × [[${n(v)}/100]]`, unit: 'TL',
    hint: '%1’i 1.200’ün yüzde biri: 12 TL. Senin indirimin kaç tane %1?', decimal: true,
  },
  {
    title: 'Sınav ortalaması', emoji: '📊',
    story: 'Ece dönem boyunca üç matematik sınavına girdi.', q: 'Ece’nin sınav puanlarının ortalaması kaç?',
    need: ['Ece’nin puanları: 70, 85 ve 91.'], extra: ['Sınavlar 40 dakika sürdü.', 'Sınıfta 26 öğrenci var.'],
    decoys: ['Sınıfın ortalaması', 'Sınavlardaki soru sayısı'],
    ans: () => 82, expr: () => '(70 + 85 + 91) ÷ 3', unit: 'puan',
    hint: 'Ortalama: puanları eşitlersen her sınava kaç puan düşer? Toplayıp sınav sayısına böl.', decimal: true,
  },
  {
    title: 'Benzin', emoji: '⛽',
    story: 'Babam yola çıkmadan benzin aldı.', q: 'Babam benzine kaç TL ödedi?',
    need: ['Benzinin litresi 42,5 TL.'], extra: ['Araba 2019 model.', 'Benzinlik 24 saat açık.'],
    miss: { label: 'Kaç litre benzin alındığı', unit: 'L', min: 5, max: 70, card: 'Babam # L benzin aldı.', tooLow: 'Yola çıkmadan önce bu kadar az benzin alınır mı?', tooHigh: 'Bir otomobilin deposuna bu kadar benzin sığar mı? Depolar genelde 40–60 L.', decimal: true },
    decoys: ['Arabanın kaç kişilik olduğu', 'Gidilecek şehrin adı'],
    ans: (v) => 42.5 * v, expr: (v) => `${n(v)} × 42,5`, unit: 'TL',
    hint: '42,5 = 42 + 0,5. Litre sayısını 42 ile ve 0,5 ile ayrı ayrı çarpıp toplayabilirsin.', decimal: true,
  },
  {
    title: 'Limonata', emoji: '🍋',
    story: 'Ayşe okul şenliği için limonata hazırlıyor.', q: 'Ayşe kaç bardak limon suyu kullanmalı?',
    need: ['Her 2 bardak suya 1 bardak limon suyu konuyor.', 'Ayşe 10 bardak su kullandı.'], extra: ['Bardaklar cam.', 'Şenlik 6 saat sürecek.'],
    decoys: ['Bir limonun fiyatı', 'Şekerin markası'],
    ans: () => 5, expr: () => '10 ÷ 2 × 1', unit: 'bardak',
    hint: 'Su ile limon suyu oranı 2’ye 1. Su 2 bardaklık gruplara ayrılırsa kaç grup olur?', decimal: true,
  },
  {
    title: 'Sabah koşusu', emoji: '👟',
    story: 'Can sağlıklı yaşam için düzenli koşuyor.', q: 'Can toplam kaç km koştu?',
    need: ['Can her gün 2,4 km koşuyor.'], extra: ['Can’ın ayakkabısı 1.450 TL.', 'Can sabah 7’de koşuyor.'],
    miss: { label: 'Kaç gün koştuğu', unit: 'gün', min: 1, max: 60, card: 'Can # gün koştu.', tooLow: 'Hiç koşmadığı bir durum için “toplam” sorulur mu?', tooHigh: 'Bu kadar uzun bir süreyi tek seferde mi düşünüyorsun? Birkaç hafta gibi daha makul bir süre seç.' },
    decoys: ['Can’ın hızı', 'Parkın alanı'],
    ans: (v) => 2.4 * v, expr: (v) => `${n(v)} × 2,4`, unit: 'km',
    hint: '2,4 km = 2 km + 0,4 km. Gün sayısıyla ayrı ayrı çarpıp toplayabilirsin.', decimal: true,
  },
  {
    title: 'Gözlüklüler', emoji: '👓',
    story: 'Okul sağlık taraması yapıldı.', q: 'Sınıfta kaç öğrenci gözlüklü?',
    need: ['Sınıfta 25 öğrenci var.', 'Öğrencilerin %40’ı gözlüklü.'], extra: ['Sınıfın 3 penceresi var.', 'Öğretmen 32 yaşında.'],
    decoys: ['Gözlüklerin fiyatı', 'Taramanın yapıldığı gün'],
    ans: () => 10, expr: () => '25 × [[40/100]]', unit: 'öğrenci',
    hint: '%40, 100’de 40 demek. 25 öğrenci 100’ün dörtte biri; 40’ın dörtte biri kaç?', decimal: true,
  },
  {
    title: 'Basketbol', emoji: '🏀',
    story: 'Bir basketbolcunun turnuvadaki sayıları tutuluyor.', q: 'Üç maçta attığı sayıların ortalaması kaç?',
    need: ['İlk iki maçta 18 ve 24 sayı attı.'], extra: ['Basketbolcunun boyu 1,95 m.', 'Takımı 2 maç kazandı.'],
    miss: { label: 'Üçüncü maçta attığı sayı', unit: 'sayı', min: 0, max: 60, card: 'Üçüncü maçta # sayı attı.', tooLow: 'Negatif sayı atılabilir mi?', tooHigh: 'Bir oyuncunun tek maçta bu kadar sayı atması çok mu olağanüstü? Daha makul bir sayı seç.' },
    decoys: ['Maçların süresi', 'Takımdaki oyuncu sayısı'],
    ans: (v) => (42 + v) / 3, expr: (v) => `(18 + 24 + ${n(v)}) ÷ 3`, unit: 'sayı',
    hint: 'Üç maçın sayılarını topla ve 3 maça eşit paylaştır. Gerekirse yüzde birlere yuvarla.', decimal: true, round: true,
  },
]

const G7: Prob[] = [
  {
    title: 'Sıcaklık', emoji: '🌡️',
    story: 'Erzurum’da bir kış günü sıcaklık ölçüldü.', q: 'Öğlen sıcaklık kaç °C oldu?',
    need: ['Sabah sıcaklık −6 °C idi.', 'Öğlene kadar sıcaklık 9 °C arttı.'], extra: ['Şehir deniz seviyesinden 1.900 m yüksekte.', 'Rüzgâr saatte 15 km hızla esiyordu.'],
    decoys: ['Akşamki sıcaklık', 'Havanın nemi'],
    ans: () => 3, expr: () => '−6 + 9', unit: '°C',
    hint: 'Sayı doğrusunda −6’dan başlayıp 9 birim sağa git. 0’ı geçince ne olur?', negative: true, decimal: true,
  },
  {
    title: 'Yol ve benzin', emoji: '🚗',
    story: 'Bir aile tatile otomobille gidecek.', q: 'Bu yol için kaç litre benzin gerekir?',
    need: ['Araba 3 L benzinle 45 km gidiyor.'], extra: ['Arabada 4 kişi var.', 'Araba kırmızı.'],
    miss: { label: 'Gidilecek yolun uzunluğu', unit: 'km', min: 15, max: 1500, card: 'Gidilecek yol # km.', tooLow: 'Bu kadar kısa bir yol için tatile otomobille mi gidilir?', tooHigh: 'Türkiye’nin bir ucundan öbür ucuna kaç km var? Bu yol çok uzun değil mi?' },
    decoys: ['Benzinin litre fiyatı', 'Arabanın hızı'],
    ans: (v) => v / 15, expr: (v) => `${n(v)} ÷ 15`, unit: 'L',
    hint: '3 L ile 45 km ise 1 L ile kaç km gider? Birim orana göre düşün. Gerekirse yüzde birlere yuvarla.', decimal: true, round: true,
  },
  {
    title: 'Kalem ve defter', emoji: '📓',
    story: 'Zeynep kırtasiyeden bir kalem ve bir defter aldı.', q: 'Kalem kaç TL?',
    need: ['Kalem ile defterin fiyatları toplamı 47 TL.', 'Defter, kalemden 15 TL pahalı.'], extra: ['Kırtasiye okula 300 m uzakta.', 'Alışveriş pazartesi yapıldı.'],
    decoys: ['Defterin sayfa sayısı', 'Zeynep’in cebindeki para'],
    ans: () => 16, expr: () => 'x + (x + 15) = 47 → x = (47 − 15) ÷ 2', unit: 'TL',
    hint: 'Kalemin fiyatına x de. Defter x + 15. İkisinin toplamı 47’ye eşit.', decimal: true,
  },
  {
    title: 'Dalgıç', emoji: '🤿',
    story: 'Bir dalgıç denizde dalış yapıyor. Deniz yüzeyi 0 m kabul ediliyor.', q: 'Dalgıç şimdi kaç metrede? (Yüzeyin altı negatif)',
    need: ['Dalgıç önce −18 m’ye daldı.'], extra: ['Su sıcaklığı 14 °C.', 'Dalgıcın tüpü 12 L.'],
    miss: { label: 'Sonra kaç metre yükseldiği', unit: 'm', min: 1, max: 18, card: 'Dalgıç sonra # m yükseldi.', tooLow: 'Hiç yükselmezse “yükseldi” der miyiz?', tooHigh: 'Dalgıç 18 m’den fazla yükselirse suyun üstünde uçuyor mu olur?' },
    decoys: ['Dalışın kaç dakika sürdüğü', 'Denizin en derin noktası'],
    ans: (v) => -18 + v, expr: (v) => `−18 + ${n(v)}`, unit: 'm',
    hint: 'Sayı doğrusunu dikey düşün: −18’den yukarı doğru yükseldiğin kadar git.', negative: true,
  },
  {
    title: 'Kek tarifi', emoji: '🍰',
    story: 'Ayşe bir kek tarifini kalabalık bir aile için uyarlıyor.', q: 'Kaç gram un gerekir?',
    need: ['6 kişilik kek tarifinde 240 g un var.'], extra: ['Kek 35 dakika pişiyor.', 'Tarifte 3 yumurta var.'],
    miss: { label: 'Kaç kişilik kek yapılacağı', unit: 'kişilik', min: 2, max: 40, card: 'Ayşe # kişilik kek yapacak.', tooLow: 'Tek kişilik kek için tarif uyarlamaya gerek var mı?', tooHigh: 'Bir aile için bu kadar büyük bir kek mi? Daha makul bir sayı seç.' },
    decoys: ['Kek kalıbının rengi', 'Unun fiyatı'],
    ans: (v) => 40 * v, expr: (v) => `${n(v)} × (240 ÷ 6)`, unit: 'g',
    hint: 'Önce 1 kişilik kek için kaç gram un gerektiğini bul (birim oran).', decimal: true,
  },
  {
    title: 'Otopark', emoji: '🅿️',
    story: 'Bir otoparkın ücret tarifesi kapıda yazıyor.', q: 'Arabanın sahibi kaç TL ödeyecek?',
    need: ['İlk saat 40 TL.', 'Sonraki her saat 25 TL.'], extra: ['Otoparkta 120 araçlık yer var.', 'Araba beyaz.'],
    miss: { label: 'Arabanın kaç saat kaldığı', unit: 'saat', min: 1, max: 24, card: 'Araba otoparkta # saat kaldı.', tooLow: 'Araba otoparka hiç girmediyse ücret öder mi?', tooHigh: 'Bir gün kaç saattir? Daha kısa bir süre seç.' },
    decoys: ['Otoparkın açılış saati', 'Arabanın plakası'],
    ans: (v) => 40 + 25 * (v - 1), expr: (v) => `40 + 25 × (${n(v)} − 1)`, unit: 'TL',
    hint: 'İlk saat farklı ücretli. Geriye kaç saat kalıyor? Onların her biri 25 TL.',
  },
  {
    title: 'Dağ tırmanışı', emoji: '🏔️',
    story: 'Bir dağcı tırmanırken sıcaklığı ölçüyor.', q: 'Dağcının bulunduğu yerde sıcaklık kaç °C?',
    need: ['Her 100 m yükselişte sıcaklık 0,6 °C düşüyor.', 'Dağın eteğinde sıcaklık 12 °C.', 'Dağcı 1.500 m tırmandı.'], extra: ['Dağcının çantası 14 kg.', 'Tırmanış 5 saat sürdü.'],
    decoys: ['Dağın toplam yüksekliği', 'Dağcının yaşı'],
    ans: () => 3, expr: () => '12 − 15 × 0,6', unit: '°C',
    hint: '1.500 m içinde kaç tane 100 m var? Her birinde 0,6 °C düşüyor.', negative: true, decimal: true,
  },
]

const G8: Prob[] = [
  {
    title: 'Merdiven', emoji: '🪜',
    story: 'Bir merdiven duvara yaslanmış. Duvar yere dik.', q: 'Merdivenin üst ucu yerden kaç metre yükseklikte?',
    need: ['Merdivenin alt ucu duvardan 6 m uzakta.'], extra: ['Merdiven alüminyum.', 'Merdivenin 12 basamağı var.'],
    miss: { label: 'Merdivenin uzunluğu', unit: 'm', min: 7, max: 20, card: 'Merdiven # m uzunluğunda.', tooLow: 'Merdiven, yerdeki 6 m’lik uzaklıktan kısa ya da ona eşit olabilir mi? Dik üçgende en uzun kenar hangisi?', tooHigh: 'Bu kadar uzun bir merdiveni taşımak mümkün mü? Daha makul bir uzunluk seç.', decimal: true },
    decoys: ['Merdivenin ağırlığı', 'Duvarın kalınlığı'],
    ans: (v) => Math.sqrt(v * v - 36), expr: (v) => `√{${n(v)}^{2} − 6^{2}}`, unit: 'm',
    hint: 'Merdiven, duvar ve zemin bir dik üçgen oluşturur. Merdiven hipotenüs. Gerekirse yüzde birlere yuvarla.', decimal: true, round: true,
  },
  {
    title: 'Televizyon', emoji: '📺',
    story: 'Televizyonların boyu ekran köşegeniyle anlatılır.', q: 'Ekranın köşegeni kaç cm?',
    need: ['Ekranın eni 80 cm.', 'Ekranın yüksekliği 60 cm.'], extra: ['Televizyon 12 kg.', 'Fiyatı 15.000 TL.'],
    decoys: ['Ekranın kalınlığı', 'Televizyonun markası'],
    ans: () => 100, expr: () => '√{80^{2} + 60^{2}}', unit: 'cm',
    hint: 'En, yükseklik ve köşegen bir dik üçgen oluşturur. 80 ve 60’ın 20 ile ilişkisine bak.', decimal: true,
  },
  {
    title: 'Taksi', emoji: '🚕',
    story: 'Şehirde taksi ücreti sabit bir kurala göre hesaplanıyor.', q: 'Yolculuk kaç TL tuttu?',
    need: ['Taksinin açılış ücreti 50 TL.', 'Her km için 20 TL ekleniyor.'], extra: ['Taksi sarı.', 'Yolculuk 25 dakika sürdü.'],
    miss: { label: 'Yolculuğun kaç km olduğu', unit: 'km', min: 1, max: 80, card: 'Yolculuk # km.', tooLow: 'Taksiye binip hiç yol gitmezsen “yolculuk” olur mu?', tooHigh: 'Şehir içinde bu kadar uzun bir taksi yolculuğu olağan mı?', decimal: true },
    decoys: ['Taksinin hızı', 'Yolcu sayısı'],
    ans: (v) => 50 + 20 * v, expr: (v) => `y = 20 × ${n(v)} + 50`, unit: 'TL',
    hint: 'Ücret doğrusal: y = 20x + 50. Burada x neyi gösteriyor?', decimal: true,
  },
  {
    title: 'Bakteriler', emoji: '🦠',
    story: 'Laboratuvarda bir bakteri kolonisi gözlemleniyor.', q: 'Şimdi kaç bakteri var?',
    need: ['Bakteri sayısı her saat 2 katına çıkıyor.', 'Başlangıçta 3 bakteri vardı.'], extra: ['Deney 22 °C’de yapıldı.', 'Laboratuvarda 4 mikroskop var.'],
    miss: { label: 'Kaç saat geçtiği', unit: 'saat', min: 1, max: 12, card: '# saat geçti.', tooLow: 'Hiç zaman geçmezse bakteri sayısı değişir mi?', tooHigh: 'Bu kadar uzun sürede sayı çok büyür; hesaplaması zor olur. 1–12 saat arası bir süre seç.' },
    decoys: ['Bir bakterinin boyu', 'Kabın hacmi'],
    ans: (v) => 3 * 2 ** v, expr: (v) => `3 × 2^{${n(v)}}`, unit: 'bakteri',
    hint: 'Her saat ikiye katlanıyor: 3, 6, 12, … Kaç kez 2 ile çarptın?',
  },
  {
    title: 'Hafıza kartı', emoji: '💾',
    story: 'Bir fotoğrafçı makinesine hafıza kartı takıyor.', q: 'Karta kaç fotoğraf sığar?',
    need: ['Bir fotoğraf 2^{4} MB.', 'Hafıza kartı 2^{10} MB.'], extra: ['Fotoğraflar 2023’te çekildi.', 'Kartın rengi siyah.'],
    decoys: ['Fotoğraf makinesinin fiyatı', 'Fotoğrafların çekildiği şehir'],
    ans: () => 64, expr: () => '2^{10} ÷ 2^{4} = 2^{6}', unit: 'fotoğraf',
    hint: 'Aynı tabanlı üslü ifadeleri bölerken üslere ne olur?',
  },
  {
    title: 'Parkta kestirme', emoji: '🏞️',
    story: 'Dikdörtgen biçimli bir parkta bir köşeden karşı köşeye düz bir yol yapılacak.', q: 'Çapraz yol kaç metre olur?',
    need: ['Parkın eni 30 m.'], extra: ['Parkta 14 bank var.', 'Park sabah 8’de açılıyor.'],
    miss: { label: 'Parkın boyu', unit: 'm', min: 10, max: 300, card: 'Parkın boyu # m.', tooLow: 'Bu kadar kısa bir alan park olur mu?', tooHigh: 'Bir mahalle parkı bu kadar uzun olur mu?', decimal: true },
    decoys: ['Yolun genişliği', 'Parktaki ağaç sayısı'],
    ans: (v) => Math.sqrt(900 + v * v), expr: (v) => `√{30^{2} + ${n(v)}^{2}}`, unit: 'm',
    hint: 'Çapraz yol, en ve boyla bir dik üçgen oluşturur. Gerekirse yüzde birlere yuvarla. (40 m seçseydin?)', decimal: true, round: true,
  },
  {
    title: 'Su deposu', emoji: '🚰',
    story: 'Bir apartmanın su deposu temizlik için boşaltılıyor.', q: 'Depo kaç dakikada boşalır?',
    need: ['Depoda 600 L su var.', 'Musluk her dakika 15 L su boşaltıyor.'], extra: ['Depo 2 m yüksekliğinde.', 'Suyun sıcaklığı 18 °C.'],
    decoys: ['Apartmandaki daire sayısı', 'Suyun fiyatı'],
    ans: () => 40, expr: () => '600 ÷ 15', unit: 'dakika',
    hint: 'Su miktarı y = 600 − 15x. y ne zaman 0 olur?', decimal: true,
  },
]

const BANK: Record<number, Prob[]> = { 3: G3, 4: G4, 5: G5, 6: G6, 7: G7, 8: G8 }

/** 3 eksik bilgili + 2 eksiksiz problem, karışık sırada */
export function makeTasks(grade: Grade): Prob[] {
  const bank = BANK[Math.max(3, grade)] ?? G3
  const withMiss = shuffle(bank.filter((p) => p.miss)).slice(0, 3)
  const full = shuffle(bank.filter((p) => !p.miss)).slice(0, 2)
  return shuffle([...withMiss, ...full])
}
