import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'asal-agaci',
  name: 'Asal Çarpan Ağacı',
  description: 'Sayıları dallara ayırarak asal yapraklara ulaş, puan topla; farklı ağaçların hep aynı asal yapraklara vardığını keşfet.',
  emoji: '🌳',
  color: '#16a34a',
  grades: [8],
  nextGen: true,
  ready: true,
  skills: { 8: 'Asal çarpan ağacıyla asal çarpanlara ayırma, üslü gösterimle yazma, farklı ağaçların aynı sonuca ulaştığını görme' },
  howTo: [
    'Bileşik bir sayıya dokun ve onu iki çarpana ayır: her doğru dal puan kazandırır.',
    'Asal sayılar altın yaprağa dönüşür; bütün yapraklar altın olunca ağaç tamamlanır.',
    'Asal çarpanları üslü biçimde yaz: doğru yazım bonus puan getirir.',
    'Aynı sayı için farklı bir ilk dalla yeni bir ağaç kur: aynı yapraklara ulaşırsan büyük bonus!',
  ],
  launch: 'Bir bahçıvan 360’ı bir ağaç gibi büyütmek istiyor: her dal, sayıyı iki çarpana ayırıyor. Biri 360’ı 36 × 10 diye, diğeri 2 × 180 diye ayırmaya başlıyor. Sence yaprakları aynı mı olacak?',
  reflect: 'İki farklı ağaç kurduğunda yaprakların aynı çıkması tesadüf mü? Bir arkadaşına asal çarpanlara ayırmanın neden tek bir sonucu olduğunu nasıl açıklarsın?',
  bigIdea: 'Her bileşik sayı asal sayıların çarpımı olarak yazılabilir ve bu yazılış (çarpanların sırası dışında) tektir: aritmetiğin temel teoremi. Hangi dalla başlarsak başlayalım aynı asal yapraklara ulaşırız; tekrar eden çarpanlar üslü gösterimle kısaltılır.',
  strategies: ['Önce 2’ye böldüm', 'Bildiğim bir çarpımla ayırdım (36 × 10)', 'Bölünebilme kurallarını kullandım', 'Farklı bir ilk dal denedim'],
  outcomes: [],
}
