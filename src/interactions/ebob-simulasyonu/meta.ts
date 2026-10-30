import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'ebob-simulasyonu',
  no: 82,
  name: 'EBOB Problem Simülasyonu',
  description: 'Tarlayı eş karelere böl, kurdeleleri artık kalmadan kes, meyveleri eş paketlere koy: önce tahmin et, sonra simülasyonda dene ve EBOB’u kendin bul.',
  emoji: '✂️',
  color: '#2563eb',
  category: 'sayilar',
  grades: [8],
  ready: true,
  launch: 'Kenarları 24 m ve 36 m olan bir tarla, hiç toprak artmadan eş ve olabildiğince büyük kare parsellere bölünecek. Kare parselin bir kenarı kaç metre olmalı? Önce tahmin et, sonra simülasyonda dene.',
  reflect: 'Hangi problemlerde EBOB aradığını nasıl anladın? “En büyük”, “eş parça”, “artmadan” gibi ipuçlarının simülasyondaki karşılığı neydi?',
  bigIdea: 'Bir bütünü artık kalmadan eş ve en büyük parçalara bölme problemleri EBOB problemleridir: parça büyüklüğü her iki niceliği de bölmeli (ortak bölen) ve olabildiğince büyük olmalıdır. Parça sayısı ise her niceliğin EBOB’a bölümüyle bulunur.',
  skills: { 8: 'EBOB gerektiren gerçek yaşam problemleri: eş karelere bölme, artıksız kesme, eş paketleme, eşit aralıklarla dikim; parça sayısını bulma' },
  outcomes: [],
}
