import { definePage } from './types'

/** /manipulatifler: sanal manipülatif listesi */
export const toolsPage = definePage({
  id: 'manipulatifler',
  label: 'Manipülatifler',
  path: '/manipulatifler',
  desc: 'Manipülatifler sayfasının başlığı, tanıtım metni, Tuval kartı ve süzgeç metinleri',
  emoji: '🧩',
  defaults: {
    title: 'Sanal Manipülatifler',
    desc: '{n} dijital materyal. Akıllı tahtada ya da tablette serbestçe kullanılır; kurulum ve üyelik gerekmez.',
    boardTitle: 'Matematik Tuvali',
    boardDesc: 'Bütün materyaller tek ekranda: blokları, şeritleri ve şekilleri yan yana kullanın.',
    searchPlaceholder: 'Materyal ara: kesir, blok, saat…',
    allLabel: 'Tüm konular',
    countLabel: '{n} manipülatif',
    emptyText: 'Bu süzgeçlere uyan bir şey bulamadık.',
    emptyClear: 'Süzgeçleri temizle',
  },
  groups: [
    {
      title: 'Başlık ve giriş',
      fields: [
        { key: 'title', label: 'Sayfa başlığı (H1)', type: 'text', max: 60 },
        { key: 'desc', label: 'Tanıtım metni', type: 'textarea', max: 200, help: '{n} yerine sitedeki manipülatif sayısı yazılır.' },
      ],
    },
    {
      title: 'Matematik Tuvali kartı',
      desc: 'Başlığın altındaki, bütün materyalleri tek ekranda açan kart',
      fields: [
        { key: 'boardTitle', label: 'Kart başlığı', type: 'text' },
        { key: 'boardDesc', label: 'Kart açıklaması', type: 'textarea' },
      ],
    },
    {
      title: 'Süzgeç ve liste',
      fields: [
        { key: 'searchPlaceholder', label: 'Arama kutusu ipucu', type: 'text' },
        { key: 'allLabel', label: '“Tümü” düğmesi', type: 'text' },
        { key: 'countLabel', label: 'Sonuç sayısı', type: 'text', help: '{n} yerine listelenen manipülatif sayısı yazılır.' },
        { key: 'emptyText', label: 'Sonuç yoksa gösterilen metin', type: 'text' },
        { key: 'emptyClear', label: 'Süzgeçleri temizle düğmesi', type: 'text' },
      ],
    },
  ],
})
