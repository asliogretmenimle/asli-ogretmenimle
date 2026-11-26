import { definePage } from './types'

/** /carpim-tablosu */
export const timesPage = definePage({
  id: 'carpim-tablosu',
  label: 'Çarpım Tablosu',
  path: '/carpim-tablosu',
  desc: 'Çarpım tablosu sayfasının başlığı, açıklamaları ve alıştırma metinleri',
  emoji: '✖️',
  defaults: {
    chip: '2–4. sınıf matematik',
    title: 'Çarpım Tablosu (1–10)',
    intro: 'Bir kutuya dokun: satırı ve sütunu birlikte görürsün. Kendini sınamak için sonuçları gizle, sonra aşağıdaki alıştırmayı çöz.',
    pickPrompt: 'Bir kutu seç',
    hideLabel: 'Sonuçları gizle',
    showLabel: 'Sonuçları göster',
    familyHeading: '{n} çarpım tablosu',
    practiceTitle: 'Çarpım tablosu alıştırması',
    practiceDesc: 'Çalışmak istediğin sayıları seç; 10 soruluk alıştırma bu sayılardan gelir. Yanlışta hangi hatayı yaptığını ve kısa yolu görürsün.',
    startLabel: 'Alıştırmaya başla',
    resultHigh: 'Muhteşem! Bu sayılar artık senin.',
    resultMid: 'Çok iyi! Zorlandıklarını bir kez daha dene.',
    resultLow: 'Güzel çaba! Tablodan zorlandığın satıra bak, sonra tekrar dene.',
    newQuestions: 'Yeni sorular',
    changeNumbers: 'Sayıları değiştir',
    links: ['Çarpım tablosu nasıl ezberlenir?', 'Çarpma oyunu: Kurabiye Fabrikası', 'Çarpma dizilim tahtası'],
  },
  groups: [
    {
      title: 'Başlık ve giriş',
      fields: [
        { key: 'chip', label: 'Üst etiket', type: 'text' },
        { key: 'title', label: 'Sayfa başlığı (H1)', type: 'text', max: 60 },
        { key: 'intro', label: 'Giriş metni', type: 'textarea', max: 250 },
      ],
    },
    {
      title: 'Tablo',
      fields: [
        { key: 'pickPrompt', label: 'Seçim yokken gösterilen metin', type: 'text' },
        { key: 'hideLabel', label: '“Sonuçları gizle” düğmesi', type: 'text' },
        { key: 'showLabel', label: '“Sonuçları göster” düğmesi', type: 'text' },
        { key: 'familyHeading', label: 'Sayı ailesi başlığı', type: 'text', help: '{n} yerine “7’ler” gibi seçilen sayı yazılır.' },
      ],
    },
    {
      title: 'Alıştırma',
      fields: [
        { key: 'practiceTitle', label: 'Bölüm başlığı', type: 'text' },
        { key: 'practiceDesc', label: 'Açıklama', type: 'textarea' },
        { key: 'startLabel', label: 'Başlat düğmesi', type: 'text' },
        { key: 'resultHigh', label: 'Sonuç: 9–10 doğru', type: 'text' },
        { key: 'resultMid', label: 'Sonuç: 6–8 doğru', type: 'text' },
        { key: 'resultLow', label: 'Sonuç: 0–5 doğru', type: 'text' },
        { key: 'newQuestions', label: '“Yeni sorular” düğmesi', type: 'text' },
        { key: 'changeNumbers', label: '“Sayıları değiştir” düğmesi', type: 'text' },
      ],
    },
    {
      title: 'İlgili sayfalar',
      fields: [{ key: 'links', label: 'Alttaki üç kartın metinleri', type: 'list', help: 'Sırasıyla: 1) çarpım tablosu rehberi, 2) Kurabiye Fabrikası oyunu, 3) dizilim tahtası. Bağlantılar sabittir.' }],
    },
  ],
})
