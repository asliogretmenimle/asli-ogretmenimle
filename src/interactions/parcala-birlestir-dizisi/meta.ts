import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'parcala-birlestir-dizisi',
  no: 97,
  name: 'Parçala ve Birleştir Dizisi',
  description: 'Bilmediğin bir çarpmayı (7 × 8) bir nokta dizisinde makasla keserek bildiğin iki kolay çarpmaya ayır: 7 × 8 = (5 × 8) + (2 × 8) = 40 + 16 = 56. Bildiğin gerçeklerden yenilerini türet.',
  emoji: '✂️',
  color: '#2563eb',
  category: 'sayilar',
  grades: [3, 4],
  ready: true,
  launch: 'Bir arkadaşın 7 × 8’i bir türlü aklında tutamıyor. Ama 5 × 8 = 40 ve 2 × 8 = 16 olduğunu biliyor. 7 satır, her satırda 8 kare olan bir diziyi makasla kesersek bu iki gerçek 7 × 8’i bulmasına yardım eder mi?',
  reflect: '7 × 8’i unutursan onu hangi kolay çarpmalardan bulabilirsin? Bir arkadaşın “6 × 8, 5 × 8’den 1 fazladır” diyor. Ona diziyle neyi gösterirsin?',
  bigIdea: 'Çarpım tablosu, birbirinden kopuk 100 ayrı gerçek değil, birbirine bağlı bir ağdır. Dizi (array) modelinde a × b, a satır ve b sütundan oluşan bir dikdörtgendir; diziyi kesmek kare eklemez ya da silmez, bu yüzden 7 × 8 = (5 × 8) + (2 × 8). Bu, çarpmanın toplama üzerine dağılma özelliğinin görsel hâlidir. Van de Walle’in “türetilmiş gerçekler” (derived facts) yaklaşımında çocuk önce ×1, ×2, ×5, ×10 gibi “çapa” gerçekleri sağlamlaştırır, sonra zor gerçekleri bunlardan türetir: 6 × 8 = 5 × 8 + bir satır, 9 × 7 = 10 × 7 − bir satır. Yaygın yanılgılar: “bir satır fazlası 1 fazladır” (6 × 8 = 41), parçalardan birini çarpmayı unutmak (40 + 2) ve parça satırlarının toplamının çarpanı tutmaması (5 + 3 ≠ 7). Dizi, bu hataları çocuğun kendisinin görmesini sağlar.',
  skills: {
    3: 'Çarpmayı dizi modeliyle gösterme; zor bir çarpmayı ×1, ×2, ×5, ×10 parçalarına ayırarak zihinden bulma; bildiği gerçekten bir satır ekleyerek ya da çıkararak yeni gerçek türetme',
    4: 'Çarpmanın toplama ve çıkarma üzerine dağılma özelliğini dizide gerekçelendirme; kısa yoldan çarpma stratejileri seçme ve başkasının kesişindeki hatayı bulma',
  },
  outcomes: ['MAT.3.2.3', 'MAT.3.2.4', 'MAT.3.2.7', 'MAT.3.2.8', 'MAT.4.2.4', 'MAT.4.2.5'],
}
