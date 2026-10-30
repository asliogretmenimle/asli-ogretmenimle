import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'asal-bekci',
  name: 'Asal Bekçi',
  description: 'Asal Bekçi’nin kapısından yalnızca kapıdaki sayıyla aralarında asal olan sayılar geçebilir. Sayıları kapıya sürükle, çarpan çemberinde ortak çarpanları yakala!',
  emoji: '💂',
  color: '#e11d48',
  grades: [8],
  nextGen: true,
  ready: true,
  skills: { 8: 'Aralarında asal sayılar: EBOB’u 1 olan sayıları ortak çarpanlara bakarak ayırt etme; ardışık sayılar, iki bileşik sayının aralarında asal olabilmesi' },
  howTo: [
    'Kapının üstündeki hedef sayıyı oku.',
    'Alttaki sayı havuzundan bir sayıyı kapıya sürükle (ya da sayıya, sonra kapıya dokun).',
    'Kapı kırmızı yanarsa çarpan çemberine bak: parlayan ortak çarpanlar sayının neden geçemediğini gösterir.',
    'Kapı yeşil açılırsa sayılar aralarında asaldır: yeterince sayıyı geçirince bir sonraki kapıya geç.',
  ],
  launch: 'Bir kalenin kapısında Asal Bekçi duruyor. Kapının üstünde 12 yazıyor. Bekçi diyor ki: “1’den başka ortak çarpanı olan geçemez!” Sence 25 geçebilir mi? Ya 8 ile 15 aynı kapıdan geçebilir mi?',
  reflect: 'İki sayının ikisi de asal olmadan aralarında asal olabilir mi? Bir örnek ver. Ardışık iki sayı neden her zaman kapıdan geçebilir?',
  bigIdea: 'İki sayının 1’den başka ortak böleni yoksa (EBOB = 1) bu sayılar aralarında asaldır. Sayıların kendilerinin asal olması gerekmez: 8 ile 15 bileşiktir ama aralarında asaldır. Ardışık sayılar ve 1 ile her sayı her zaman aralarında asaldır.',
  strategies: ['Ortak çarpan aradım', 'Asal çarpanlarına ayırdım', 'Ardışık sayıları fark ettim', 'Çift sayıları ele aldım'],
  outcomes: [],
}
