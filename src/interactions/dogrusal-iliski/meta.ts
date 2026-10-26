import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'dogrusal-iliski',
  no: 67,
  name: 'Doğrusal İlişki Atölyesi',
  description: 'Tablo, grafik ve denklem arasında bağlantı kur: birini değiştir, ötekiler güncellensin.',
  emoji: '📈',
  color: '#7c3aed',
  category: 'cebir-veri',
  grades: [8],
  ready: true,
  launch: 'Bir taksiye bindin: taksimetre 20 TL’den başlıyor ve her kilometrede 8 TL artıyor. 5 km gidersen kaç TL ödersin? Bu yolculuğu bir tablo, bir grafik ve bir denklemle nasıl anlatırsın?',
  reflect: 'Bir arkadaşına doğrunun eğiminin ve y eksenini kestiği noktanın taksi örneğinde ne anlama geldiğini anlat. İki tarifeden hangisinin daha ucuz olduğuna tablo, grafik ve denklemden hangisiyle karar vermek daha kolaydı? Neden?',
  bigIdea: 'Doğrusal ilişkide bağımsız değişken eşit adımlarla artarken bağımlı değişken de hep aynı miktarda değişir. Bu sabit değişim oranı eğimdir (m): tabloda ardışık farklar, grafikte doğrunun dikliği, denklemde x’in katsayısı. b, x = 0 iken değerdir (başlangıç). Aynı ilişki tablo, grafik ve denklemle gösterilebilir; birindeki değişiklik ötekilere yansır. İki doğrusal ilişkinin eşit olduğu an, doğruların kesiştiği noktadır.',
  skills: {
    8: 'Gerçek yaşam durumlarını (taksi, telefon tarifesi) tablo, grafik ve denklemle gösterme; eğim ve y-kesişimini yorumlama; iki doğrunun kesişimiyle karar verme',
  },
  outcomes: ['MAT.8.2.1', 'MAT.8.2.2', 'MAT.8.2.3', 'MAT.8.2.4'],
}
