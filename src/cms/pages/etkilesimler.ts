import { definePage } from './types'

/** /etkilesimler: etkileşim listesi */
export const interactionsPage = definePage({
  id: 'etkilesimler',
  label: 'Etkileşimler',
  path: '/etkilesimler',
  desc: 'Etkileşimler sayfasının başlığı, tanıtım metni ve süzgeç metinleri',
  emoji: '✨',
  defaults: {
    title: 'Etkileşimler',
    desc: '{n} kısa keşif etkinliği. Her biri tek bir matematiksel fikre odaklanır; linkini doğrudan öğrencilere gönderebilirsiniz.',
    searchPlaceholder: 'Etkileşim ara: alan, oran, olasılık…',
    allLabel: 'Tüm konular',
    countLabel: '{n} etkileşim',
    emptyText: 'Bu süzgeçlere uyan bir şey bulamadık.',
    emptyClear: 'Süzgeçleri temizle',
  },
  groups: [
    {
      title: 'Başlık ve giriş',
      fields: [
        { key: 'title', label: 'Sayfa başlığı (H1)', type: 'text', max: 60 },
        { key: 'desc', label: 'Tanıtım metni', type: 'textarea', max: 200, help: '{n} yerine sitedeki etkileşim sayısı yazılır.' },
      ],
    },
    {
      title: 'Süzgeç ve liste',
      fields: [
        { key: 'searchPlaceholder', label: 'Arama kutusu ipucu', type: 'text' },
        { key: 'allLabel', label: '“Tümü” düğmesi', type: 'text' },
        { key: 'countLabel', label: 'Sonuç sayısı', type: 'text', help: '{n} yerine listelenen etkileşim sayısı yazılır.' },
        { key: 'emptyText', label: 'Sonuç yoksa gösterilen metin', type: 'text' },
        { key: 'emptyClear', label: 'Süzgeçleri temizle düğmesi', type: 'text' },
      ],
    },
  ],
})
