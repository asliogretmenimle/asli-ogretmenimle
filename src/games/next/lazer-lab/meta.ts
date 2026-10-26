import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'lazer-lab',
  name: 'Lazer Laboratuvarı',
  description: 'Aynaları yerleştir ve döndür; lazer ışınını kristallere ulaştırırken açıların, yansımanın ve eğimin sırrını keşfet.',
  emoji: '🔦',
  color: '#dc2626',
  grades: [6, 7, 8],
  nextGen: true,
  ready: true,
  skills: {
    6: 'Açıyı açıölçerle ölçme, ayna üzerinde doğru açı (180°), ters ve bütünler açılar, paralel aynalar arasında iç ters açılar, ışının çizdiği üçgende açılar',
    7: 'Yansıma dönüşümü: hedefin aynadaki görüntüsüne nişan alma, koordinatlarda yansıma, normal = açıortay, üçgende açılar, oranla çarpma noktası bulma',
    8: 'Işın doğrusunun eğimi ve denklemi, yansımada eğimin değişimi, öteleme ve paralel doğrular, Pisagor bağıntısı ve karekök tahmini',
  },
  howTo: [
    'Önce tahmin et: ışının varacağı yere dokun, sonra Ateşle!',
    'Ayna koymak için ızgarada bir noktaya dokun; aynayı sürükle, iki parmakla ya da ⟲ ⟳ düğmeleriyle döndür.',
    'Kristali yaktıktan sonra başka yollar ve daha az aynalı çözümler ara.',
    'Açıları ölç, hesapla ve nedenini düşün. Sahne iki parmakla yakınlaşır.',
  ],
  launch: 'Bir lazer ışını aynaya çarpınca nereye gider? Mühendisler ışını aynalarla duvarların arkasına, rafların altına, hatta geldiği yere geri gönderebilir. Işın her seferinde hangi kurala uyuyor?',
  reflect: 'Işının aynadan nereye gideceğini, ateşlemeden önce nasıl tahmin edebilirsin? Kullandığın kuralı bir arkadaşına bir çizimle anlat.',
  bigIdea: 'Işın aynaya hangi açıyla gelirse aynı açıyla yansır. Bu tek kural; doğru açı, ters ve bütünler açılar, paralel doğrular ve üçgenin açılarıyla birleşince ışının yolu önceden hesaplanabilir. Yansıma bir dönüşümdür: hedefin görüntüsüne nişan almak ışını hedefe ulaştırır; koordinat düzleminde bu, eğimin işaret değiştirmesi olarak görünür.',
  strategies: ['Önce açıyı tahmin etme', 'Aynayı döndürerek deneme', 'Hedeften geriye doğru düşünme', 'Işının dönme açısını hesaplama', 'Üçgenin açıları toplamını kullanma', 'Görüntüye nişan alma', 'Açıortayı kullanma', 'Aynaları paralel yerleştirme', 'Yükselme ÷ ilerleme ile eğim', 'Pisagor bağıntısı', 'Eğim dönüşümünü hesaplama'],
  outcomes: ['MAT.5.3.3', 'MAT.5.3.4', 'MAT.6.3.1', 'MAT.6.3.4', 'MAT.7.1.5', 'MAT.7.3.1', 'MAT.7.3.2', 'MAT.8.1.2', 'MAT.8.2.1', 'MAT.8.2.2', 'MAT.8.2.3', 'MAT.8.3.5', 'MAT.8.5.1', 'MAT.8.5.2', 'MAT.8.5.3'],
}
