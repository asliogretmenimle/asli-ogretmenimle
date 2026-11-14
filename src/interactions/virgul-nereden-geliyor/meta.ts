import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'virgul-nereden-geliyor',
  no: 98,
  name: 'Virgül Nereden Geliyor?',
  description: 'Çikolataları arkadaşlarına paylaştırırken bölüme virgülün hangi anda ve neden konduğunu keşfet: önce mini dersi izle, sonra virgülü kendin yerleştir, 3 ÷ 4’ün neden 0,75 olduğunu bul ve virgülü unutulmuş bölümleri tahminle düzelt.',
  emoji: '🍫',
  color: '#0d9488',
  category: 'kesirler',
  grades: [6],
  ready: true,
  launch: '7 çikolata 2 arkadaşa eşit paylaştırılacak. Herkes 3 bütün çikolata alıyor, 1 çikolata kalıyor. Hesap makinesi 7 ÷ 2 = 3,5 diyor. Peki bölümdeki o virgül tam olarak neyi anlatıyor ve neden 3’ten sonra geliyor?',
  reflect: 'Bölüme virgülü koyduğun an masada ne oluyordu? 3 ÷ 4 = 0,75 sonucundaki 0 neyi anlatıyor? Virgülü unutan bir arkadaşına (9 ÷ 4 = 225) hatasını çikolatalarla nasıl gösterirsin?',
  bigIdea: 'Kesir bir bölmedir: a tane bütün b kişiye eşit paylaştırılırsa bir kişinin payı a ÷ b = a/b olur. Bölme işleminde önce bütünler paylaştırılır; bir kişinin aldığı bütün sayısı bölümün birler basamağıdır. Paylaştırılamayan bütünler onda birlere bozulup paylaştırılmaya devam edilir. Virgül tam bu geçişi, yani “bütünler bitti, buradan sonrası bütünden küçük parçalar” anını işaretler. Bölünen bölenden küçükse (3 ÷ 4) kimseye bütün düşmez, birler basamağına 0 yazılır: 0,75. Öğrenciler virgülü çoğu zaman ezberlenmiş bir kural olarak görür ve yerini karıştırır (2,25 yerine 22,5 ya da 225; 0,75 yerine ,75 ya da 75). Paylaştırma modeli ve “herkese kaç bütün düşer?” tahmini, virgülün yerini anlamlı ve kontrol edilebilir hâle getirir.',
  skills: { 6: 'Kesri bölme olarak yorumlama; bölümde virgülün bütünlerden onda birlere geçişi gösterdiğini açıklama; bölünen bölenden küçükken bölümü 0, ile başlatma; virgülün yerini tahminle kontrol etme' },
  outcomes: ['MAT.6.1.6', 'MAT.6.1.5'],
  showUnder: ['MAT.6.1.6'],
}
