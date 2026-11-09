import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'kalani-yorumla',
  no: 96,
  name: 'Kalan Ne Anlatıyor?',
  description: 'Aynı bölmeyi (ör. 23 ÷ 4) yumurta kutuları, arabalar, bilyeler ve kurabiyelerle sürükleyerek modelle; her hikâyede kalanı atmaya, bir tane daha eklemeye, cevap yapmaya ya da paylaştırmaya sen karar ver, sonra kendi hikâyeni kur.',
  emoji: '🚌',
  color: '#2563eb',
  category: 'sayilar',
  grades: [3, 4],
  ready: true,
  launch: '23 ÷ 4 = 5, kalan 3. Peki cevap 5 mi, 6 mı, yoksa 3 mü? 23 yumurtayı 4’lük kutulara koyarken, 23 öğrenciyi 4 kişilik arabalara bindirirken ve 23 bilyeyi 4 arkadaşa paylaştırırken aynı bölmeyi yaparız. Cevaplar da aynı mı?',
  reflect: 'Aynı bölme neden farklı hikâyelerde farklı cevap veriyor? Bir arkadaşın “23 ÷ 4 = 5 kalan 3, demek ki 5 araba yeter” diyor. Ona nasıl açıklarsın? Kalanı kesirle paylaştırabildiğin bir hikâye ile paylaştıramadığın bir hikâye söyle.',
  bigIdea: 'Bölme problemlerinde işlemi yapmak çözümün yalnızca yarısıdır; kalanın ne anlama geldiğine bağlam karar verir (Van de Walle). Kalan atılabilir (“kaç DOLU kutu?” → 5), cevap yukarı yuvarlanabilir (“herkes için kaç araba?” → 6), cevabın kendisi olabilir (“bana kaç bilye kalır?” → 3) ya da bölünebilen bir şeyse kesirle paylaştırılabilir (“her biri ne kadar kurabiye yer?” → 5 ve 3/4). Öğrenciler kalanı bağlamdan bağımsız olarak hep atma, “5,3” gibi ondalık yazma ya da bölümü soruya bakmadan cevap sanma eğilimindedir. Aynı bölmeyi hem gruplama (ölçme) hem paylaştırma modeliyle kurmak, hikâyeleri sınıflamak ve aynı bölme için farklı sorular kurmak (problem kurma) bu yanılgıları görünür kılar.',
  skills: {
    3: 'Bölme problemlerini nesnelerle gruplayarak ve paylaştırarak modelleme; kalanın hikâyede ne anlama geldiğine karar verme (atma, bir tane daha ekleme, cevap olarak kullanma); artanları yarım ve çeyreklere bölme; aynı bölme için farklı sorular kurma',
    4: 'Kalanı bağlama göre yorumlama ve gerekçelendirme; kalanı kesirle ifade etme (5 ve 3/4); bölme hikâyelerini kalanın kullanımına göre sınıflama ve verilen cevaba uygun problem kurma',
  },
  outcomes: ['MAT.3.2.4', 'MAT.3.2.6', 'MAT.3.2.7', 'MAT.4.2.5', 'MAT.4.2.7', 'MAT.3.1.10', 'MAT.4.1.10'],
}
