import { definePage } from './types'

/** /test ve /test/<sınıf>[/<tema>] sayfalarının metinleri */
export const testsPage = definePage({
  id: 'test',
  label: 'Test Çöz',
  path: '/test',
  desc: 'Test Çöz sayfasının başlığı, sınıf kartları ve test ekranı metinleri',
  emoji: '✅',
  defaults: {
    title: 'Matematik Test Çöz',
    desc: '1–8. sınıf her konu için cevaplı, açıklamalı online testler. Sorular her açılışta karışık seçilir; yanlış cevapta neden yanlış olduğunu görürsün.',
    cardTitle: '{sinif} Matematik Testi',
    cardSub: 'Konu konu ya da karışık',
    kicker: '{sinif} · Online test · Cevaplı',
    poolText: '{n} soruluk havuzdan her seferinde karışık sorular. Yanlış cevapta kısa bir açıklama, ikinci yanlıştan sonra doğru cevap gösterilir.',
    sizeQuestion: 'Kaç soru çözmek istersin?',
    startLabel: 'Teste başla',
    themesHeading: 'Konuya göre {sinif} matematik testleri',
    studyHeading: 'Konuyu çalış',
    restartLabel: 'Yeni test (farklı sorular)',
  },
  groups: [
    {
      title: 'Başlık ve giriş',
      desc: '/test sayfası',
      fields: [
        { key: 'title', label: 'Sayfa başlığı (H1)', type: 'text', max: 60 },
        { key: 'desc', label: 'Tanıtım metni', type: 'textarea', max: 200 },
        { key: 'cardTitle', label: 'Sınıf kartı başlığı', type: 'text', help: '{sinif} yerine “3. Sınıf” gibi sınıf adı yazılır.' },
        { key: 'cardSub', label: 'Sınıf kartı alt metni', type: 'text' },
      ],
    },
    {
      title: 'Test ekranı',
      desc: '/test/3 ve /test/3/<konu> sayfaları',
      fields: [
        { key: 'kicker', label: 'Başlık üstü etiket', type: 'text', help: '{sinif} yerine sınıf adı yazılır.' },
        { key: 'poolText', label: 'Açıklama', type: 'textarea', help: '{n} yerine konudaki soru sayısı yazılır.' },
        { key: 'sizeQuestion', label: 'Soru sayısı sorusu', type: 'text' },
        { key: 'startLabel', label: 'Başlat düğmesi', type: 'text' },
        { key: 'restartLabel', label: 'Yeniden başlat düğmesi', type: 'text' },
        { key: 'themesHeading', label: 'Konu testleri başlığı', type: 'text', help: '{sinif} yerine küçük harfle sınıf adı yazılır (ör. 3. sınıf).' },
        { key: 'studyHeading', label: '“Konuyu çalış” başlığı', type: 'text' },
      ],
    },
  ],
})
