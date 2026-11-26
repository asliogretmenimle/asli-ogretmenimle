import { definePage } from './types'

/** /rehber: konu anlatımları dizini */
export const guidesPage = definePage({
  id: 'rehber',
  label: 'Konu Anlatımı',
  path: '/rehber',
  desc: 'Konu anlatımları sayfasının başlığı, giriş metni ve grup başlıkları',
  emoji: '📖',
  defaults: {
    kicker: 'Öğrenciler, veliler ve öğretmenler için',
    title: 'Matematik Konu Anlatımları',
    intro: 'En çok merak edilen matematik sorularına kısa ve örnekli cevaplar. Her rehberin sonunda konuyu deneyerek pekiştirebileceğin etkinlikler, oyunlar ve sanal manipülatifler var.',
    bandTitles: ['İlkokul (1–4. sınıf) konu anlatımları', '5. ve 6. sınıf konu anlatımları', '7. ve 8. sınıf (LGS) konu anlatımları'],
    gradeSuffix: '{n}. sınıf',
  },
  groups: [
    {
      title: 'Başlık ve giriş',
      fields: [
        { key: 'kicker', label: 'Üst etiket', type: 'text' },
        { key: 'title', label: 'Sayfa başlığı (H1)', type: 'text', max: 60 },
        { key: 'intro', label: 'Giriş metni', type: 'textarea', max: 300 },
      ],
    },
    {
      title: 'Bölümler',
      fields: [
        { key: 'bandTitles', label: 'Grup başlıkları', type: 'list', help: 'Sırasıyla: 1) ilkokul, 2) 5–6. sınıf, 3) 7–8. sınıf rehberleri. Rehberlerin kendisi “Konu anlatımları” menüsünden düzenlenir.' },
        { key: 'gradeSuffix', label: 'Kartlardaki sınıf etiketi', type: 'text', help: '{n} yerine rehberin sınıf aralığı yazılır (ör. 5–6).' },
      ],
    },
  ],
})
