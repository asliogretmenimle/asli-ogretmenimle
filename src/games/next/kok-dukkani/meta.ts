import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'kok-dukkani',
  name: 'Kök Dükkanı',
  description: 'Cüzdanındaki kareköklü paralarla alışveriş yap: paraları bozdur, aynı cins kökleri topla, para üstünü hesapla ve en ucuz ürünü bul.',
  emoji: '🏪',
  color: '#ca8a04',
  grades: [8],
  nextGen: true,
  ready: true,
  skills: { 8: 'Kareköklü ifadeleri a√b biçiminde yazma (bozdurma), katsayıyı kök içine alma, toplama-çıkarma (yalnız aynı kök cinsi), çarpma ve karşılaştırma' },
  howTo: [
    'Ürünün fiyatını oku: fiyatlar kareköklü para birimiyle yazılı (ör. 5√2 lira).',
    'Cüzdanından paralara dokunarak tam tutarı öde; para üstü de kökle hesaplanır.',
    'Bozdurma bürosunda √18 gibi bir parayı 3√2’ye çevirerek aynı cins paralar elde et.',
    '√2 paraları ile √3 paraları birbirine eklenmez: sepeti her cins için ayrı öde.',
  ],
  launch: 'Kök Dükkanı’nda fiyatlar tuhaf: bir kalem 3√2 lira, bir defter √50 lira. Cüzdanında √8 ve √2 paraları var. Sence √2 + √8 eder √10 mu? Kasaya gitmeden önce düşün!',
  reflect: '√2 + √3 neden √5 etmez? Bir arkadaşına Kök Dükkanı’ndaki “aynı cins para” kuralıyla açıkla.',
  bigIdea: 'Karekök içindeki tam kare çarpan dışarı çıkarılabilir: √18 = √(9 · 2) = 3√2. Yalnızca kök içleri aynı olan ifadeler toplanıp çıkarılabilir (3√2 + √2 = 4√2), tıpkı aynı cins paraların toplanması gibi. Katsayıyı kök içine almak (3√5 = √45) iki kareköklü sayıyı karşılaştırmayı kolaylaştırır.',
  strategies: ['Parayı bozdurup aynı cinse çevirdim', 'Katsayıyı kök içine aldım', 'Tam kare çarpan aradım', 'Önce yaklaşık değeri tahmin ettim'],
  outcomes: ['MAT.8.1.2', 'MAT.8.1.3'],
}
