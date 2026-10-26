import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'islem-ailesi',
  no: 26,
  name: 'İşlem Ailesi',
  description: 'Aynı sayılarla ilişkili toplama-çıkarma ya da çarpma-bölme eşitlikleri kur.',
  emoji: '👨‍👩‍👧',
  color: '#2563eb',
  category: 'sayilar',
  grades: [2, 3, 4],
  ready: true,
  launch: '8, 5 ve 13 sayıları bir aile gibi: biri bütün, ikisi parça. Bu üç sayıyla kaç farklı eşitlik kurabilirsin? Hepsi neden aynı aileden?',
  reflect: '13 − 5 = 8 eşitliğini bilen biri 8 + 5 = 13’ü de bilir mi? Neden? Bir arkadaşına modelle anlat.',
  bigIdea: 'Toplama ile çıkarma (çarpma ile bölme) aynı parça–parça–bütün ilişkisinin iki yönüdür. Bu ilişki, bilinmeyeni bulmanın ve eşittir işaretini ilişkisel okumanın temelidir.',
  skills: {
    2: '20’ye ve 100’e kadar toplama–çıkarma aileleri, ikizler ailesi, eksik parça, küçük çarpma–bölme ailesi',
    3: 'Toplama–çıkarma ve çarpma–bölme aileleri (dizilim), eşittir başta eşitlikler, eksik bütün',
    4: 'Büyük sayılarla aileler, aileyle eksik sayıyı bulma, birden fazla aile keşfetme',
  },
  outcomes: ['MAT.2.2.3', 'MAT.2.2.4', 'MAT.2.2.6', 'MAT.3.2.4', 'MAT.3.2.8', 'MAT.4.2.5', 'MAT.4.2.9'],
}
