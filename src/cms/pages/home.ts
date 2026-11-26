import { definePage, type SectionToggle } from './types'

/** Ana sayfanın düzenleri */
export const HOME_VARIANTS = ['klasik', 'odak', 'vitrin', 'ogretmen'] as const
export type HomeVariant = (typeof HOME_VARIANTS)[number]

/** Karşılamanın altındaki bölümler (sıra ve görünürlük panelden değişir) */
export const HOME_SECTIONS = ['grades', 'mainSections', 'howTo', 'popularTools', 'featuredGames', 'featuredInteractions', 'approachLesson'] as const
export type HomeSectionId = (typeof HOME_SECTIONS)[number]

const defaultSections: SectionToggle[] = [
  { id: 'grades', visible: true },
  { id: 'mainSections', visible: true },
  { id: 'howTo', visible: true },
  { id: 'popularTools', visible: true },
  { id: 'featuredGames', visible: true },
  { id: 'featuredInteractions', visible: false },
  { id: 'approachLesson', visible: true },
]

const COUNT_OPTIONS = [
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '6', label: '6' },
  { value: '8', label: '8' },
]

/** Ana sayfa: düzen (varyant), karşılama metinleri ve bölümler */
export const homePage = definePage({
  id: 'home',
  label: 'Ana sayfa',
  path: '/',
  desc: 'Düzen (varyant), karşılama metinleri ve bölümlerin sırası',
  emoji: '🏠',
  defaults: {
    variant: 'klasik' as string,
    sections: defaultSections,

    badge: 'Maarif Modeli’ne uygun · Ücretsiz · Üyeliksiz',
    titleBefore: '1–8. sınıf matematik için',
    titleHighlight: 'oyunlar, etkileşimler',
    titleAfter: 've sanal manipülatifler',
    subtitle: 'Derste akıllı tahtada açın ya da linkini öğrencilerinize gönderin. Her etkinlik somuttan soyuta, adım adım ilerler.',
    searchPlaceholder: 'Ne arıyorsunuz? Kesirler, saat, açılar…',
    popularSearches: ['Kesirler', 'Çarpma', 'Saat', 'Açılar', 'Olasılık'],
    heroCtaLabel: 'Birebir online özel ders',
    heroCtaPath: '/online-ozel-ders',
    teacherGreeting: 'Merhaba, ben Aslı Öğretmen',
    teacherIntro: 'Matematiği ezberletmeden, yaparak ve düşünerek öğretiyorum. Burada derste kullandığım oyunları, etkileşimleri ve dijital materyalleri ücretsiz paylaşıyorum.',

    gradesTitle: 'Sınıfınızı seçin',
    gradesDesc: 'Her sınıfın konuları, etkinlikleri, oyunları ve materyalleri tek sayfada.',

    mainTitle: 'Ne arıyorsunuz?',
    mainCards: [
      { title: 'Oyunlar', desc: 'Sınıfa göre zorlaşan, düşündüren matematik oyunları' },
      { title: 'Etkileşimler', desc: 'Tek bir fikri keşfettiren kısa etkinlikler' },
      { title: 'Manipülatifler', desc: 'Tahtada kullanılacak dijital materyaller' },
      { title: 'Konu Anlatımı', desc: 'Örnekli, kısa ve net konu anlatımları' },
    ],

    howToTitle: 'Derste üç adımda',
    steps: [
      { t: 'Sınıfı ve konuyu seçin', d: 'Konular öğretim programındaki sırasıyla listelenir.' },
      { t: 'Tahtada açın ya da linki gönderin', d: 'Her etkinliğin kendi linki var; kurulum ve üyelik gerekmez.' },
      { t: 'Öğrenci raporunu toplayın', d: 'Öğrenci bitirince sonucunu ve düşüncesini WhatsApp’tan size gönderir.' },
    ],

    toolsTitle: 'Sık kullanılan manipülatifler',
    toolsDesc: 'Akıllı tahtada serbestçe kullanılan dijital materyaller.',
    toolIds: ['base10', 'fractions', 'numberline', 'geoboard', 'kesirdaireleri', 'clock', 'algebra', 'tangram'],

    gamesTitle: 'Öne çıkan oyunlar',
    gamesDesc: 'Kur, dene, farklı yollar bul: tek doğru cevaba tıklamak yok.',
    gamesCount: '4',
    gameIds: [] as string[],

    interactionsTitle: 'Öne çıkan etkileşimler',
    interactionsDesc: 'Tek bir matematiksel fikri keşfettiren kısa etkinlikler.',
    interactionsCount: '4',
    interactionIds: [] as string[],

    approachTitle: 'Somuttan soyuta, adım adım',
    approachDesc: 'Her konu Van de Walle’ün gelişimsel yaklaşımıyla dört aşamada ilerler: öğrenci önce yaparak keşfeder, sonunda nedenini açıklar.',
    lessonTitle: 'Birebir online özel ders',
    lessonDesc: 'Aslı Öğretmen’le birebir ya da 3–4 kişilik grup: 1–8. sınıf matematik, LGS hazırlık ve konu tekrarı.',
  },
  groups: [
    {
      title: 'Düzen',
      desc: 'Ana sayfanın genel görünümü. Seçtiğiniz düzeni sağdaki önizlemede telefon, tablet ve bilgisayarda deneyin.',
      fields: [
        {
          key: 'variant',
          label: 'Sayfa düzeni',
          type: 'variant',
          options: [
            { value: 'klasik', label: 'Klasik', desc: 'Solda başlık ve arama, sağda Aslı Öğretmen ve materyal kartları.', sketch: ['H | I', 'x | x | x | x', 'x | x'] },
            { value: 'odak', label: 'Odak', desc: 'Ortada sade bir arama; altında hızlı sınıf seçimi. Hızlı ve dikkat dağıtmayan.', sketch: ['. | H | .', 'x | x | x | x | x | x | x | x', 'x | x | x'] },
            { value: 'vitrin', label: 'Vitrin', desc: 'İçerik önde: öne çıkan oyun ve materyaller büyük kartlarla sergilenir.', sketch: ['H | x', 'I | I | I', 'x | x | x'] },
            { value: 'ogretmen', label: 'Öğretmen', desc: 'Aslı Öğretmen’in büyük fotoğrafı, sıcak bir karşılama ve özel ders çağrısı öne çıkar.', sketch: ['I | H', 'x | x | x | x', 'x | x'] },
          ],
        },
        {
          key: 'sections',
          label: 'Bölümlerin sırası ve görünürlüğü',
          type: 'sections',
          help: 'Okla sırayı değiştirin, göz simgesiyle bölümü gizleyin.',
          options: [
            { id: 'grades', label: 'Sınıf seçimi', desc: '1–8. sınıf kutuları' },
            { id: 'mainSections', label: 'Ne arıyorsunuz?', desc: 'Oyunlar, Etkileşimler, Manipülatifler, Konu Anlatımı' },
            { id: 'howTo', label: 'Derste üç adımda', desc: 'Kullanım adımları' },
            { id: 'popularTools', label: 'Sık kullanılan manipülatifler' },
            { id: 'featuredGames', label: 'Öne çıkan oyunlar' },
            { id: 'featuredInteractions', label: 'Öne çıkan etkileşimler' },
            { id: 'approachLesson', label: 'Yaklaşım ve özel ders', desc: 'Van de Walle yaklaşımı ve özel ders kutusu' },
          ],
        },
      ],
    },
    {
      title: 'Karşılama (üst bölüm)',
      desc: 'Sayfanın en üstünde görünen metinler.',
      fields: [
        { key: 'badge', label: 'Üst etiket', type: 'text', max: 70 },
        { key: 'titleBefore', label: 'Başlık (vurgudan önce)', type: 'text' },
        { key: 'titleHighlight', label: 'Başlık (vurgulu kısım)', type: 'text', help: 'Pembe fosforlu kalemle vurgulanır.' },
        { key: 'titleAfter', label: 'Başlık (vurgudan sonra)', type: 'text' },
        { key: 'subtitle', label: 'Alt başlık', type: 'textarea', max: 220 },
        { key: 'searchPlaceholder', label: 'Arama kutusu yazısı', type: 'text' },
        { key: 'popularSearches', label: 'Sık arananlar', type: 'list', add: 'Kelime ekle' },
        { key: 'heroCtaLabel', label: 'Düğme yazısı', type: 'text', help: 'Öğretmen ve Vitrin düzenlerinde görünür.' },
        { key: 'heroCtaPath', label: 'Düğme bağlantısı', type: 'text', placeholder: '/online-ozel-ders' },
        { key: 'teacherGreeting', label: 'Selamlama', type: 'text', help: 'Öğretmen düzeninde fotoğrafın yanında.' },
        { key: 'teacherIntro', label: 'Kısa tanıtım', type: 'textarea', help: 'Öğretmen düzeninde görünür.' },
      ],
    },
    {
      title: 'Sınıf seçimi',
      fields: [
        { key: 'gradesTitle', label: 'Başlık', type: 'text' },
        { key: 'gradesDesc', label: 'Açıklama', type: 'text' },
      ],
    },
    {
      title: 'Ne arıyorsunuz?',
      fields: [
        { key: 'mainTitle', label: 'Başlık', type: 'text' },
        {
          key: 'mainCards',
          label: 'Kartlar',
          type: 'objlist',
          help: 'Sıra sabit: Oyunlar, Etkileşimler, Manipülatifler, Konu Anlatımı. Bağlantı ve sayılar otomatik.',
          itemLabel: 'Kart',
          fields: [
            { key: 'title', label: 'Başlık', type: 'text' },
            { key: 'desc', label: 'Açıklama', type: 'text' },
          ],
        },
      ],
    },
    {
      title: 'Derste üç adımda',
      fields: [
        { key: 'howToTitle', label: 'Başlık', type: 'text' },
        { key: 'steps', label: 'Adımlar', type: 'objlist', add: 'Adım ekle', itemLabel: 'Adım', fields: [{ key: 't', label: 'Başlık', type: 'text' }, { key: 'd', label: 'Açıklama', type: 'textarea' }] },
      ],
    },
    {
      title: 'Sık kullanılan manipülatifler',
      fields: [
        { key: 'toolsTitle', label: 'Başlık', type: 'text' },
        { key: 'toolsDesc', label: 'Açıklama', type: 'text' },
        { key: 'toolIds', label: 'Gösterilecek manipülatifler', type: 'ids', source: 'manipulative', help: 'Arayıp seçin; sıra burada göründüğü gibidir.' },
      ],
    },
    {
      title: 'Öne çıkan oyunlar',
      fields: [
        { key: 'gamesTitle', label: 'Başlık', type: 'text' },
        { key: 'gamesDesc', label: 'Açıklama', type: 'text' },
        { key: 'gamesCount', label: 'Kaç oyun gösterilsin?', type: 'select', options: COUNT_OPTIONS },
        { key: 'gameIds', label: 'Belirli oyunlar (isteğe bağlı)', type: 'ids', source: 'game', help: 'Boş bırakılırsa listenin başındaki oyunlar gösterilir.' },
      ],
    },
    {
      title: 'Öne çıkan etkileşimler',
      fields: [
        { key: 'interactionsTitle', label: 'Başlık', type: 'text' },
        { key: 'interactionsDesc', label: 'Açıklama', type: 'text' },
        { key: 'interactionsCount', label: 'Kaç etkileşim gösterilsin?', type: 'select', options: COUNT_OPTIONS },
        { key: 'interactionIds', label: 'Belirli etkileşimler (isteğe bağlı)', type: 'ids', source: 'interaction', help: 'Boş bırakılırsa listenin başındaki etkileşimler gösterilir.' },
      ],
    },
    {
      title: 'Yaklaşım ve özel ders',
      fields: [
        { key: 'approachTitle', label: 'Yaklaşım başlığı', type: 'text' },
        { key: 'approachDesc', label: 'Yaklaşım açıklaması', type: 'textarea' },
        { key: 'lessonTitle', label: 'Özel ders kutusu başlığı', type: 'text' },
        { key: 'lessonDesc', label: 'Özel ders kutusu açıklaması', type: 'textarea' },
      ],
    },
  ],
})

export type HomeContent = typeof homePage.defaults
