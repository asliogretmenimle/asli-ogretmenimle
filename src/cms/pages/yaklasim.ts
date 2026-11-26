import { definePage } from './types'

/** /yaklasim: Van de Walle yaklaşımı */
export const approachPage = definePage({
  id: 'yaklasim',
  label: 'Yaklaşımımız',
  path: '/yaklasim',
  desc: 'Yaklaşımımız sayfasının tüm metinleri: adımlar, ilkeler, öneriler',
  emoji: '🌱',
  defaults: {
    kicker: 'Öğretmenler ve veliler için',
    title: 'Matematiği anlayarak öğrenmek',
    intro: 'Sitedeki tüm oyun ve etkinlikler, John A. Van de Walle’ün *gelişimsel ve problem çözme odaklı matematik öğretimi* yaklaşımına göre tasarlandı ve Türkiye Yüzyılı Maarif Modeli öğretim programının öğrenme çıktılarıyla eşleştirildi.',
    stepsHeading: 'Her etkinlik üç adımdan oluşur',
    steps: [
      { t: 'Başlarken', d: 'Günlük hayattan kısa bir durum ya da merak uyandıran bir soru. Ne yapacağımızı ve neden önemli olduğunu hissettirir.' },
      { t: 'Keşfet', d: 'Oyun, model ve manipülatiflerle düşünme. Takılınca kademeli ipuçları, yanılınca açıklayıcı geri bildirim.' },
      { t: 'Düşün ve Paylaş', d: 'Açık uçlu tek bir soru: “Nasıl düşündün? Başka bir yolu var mı?” Sınıfta tartışma, evde sohbet başlatır.' },
    ],
    pathHeading: 'Öğrenme yolu: somuttan soyuta',
    stepLabel: '{n}. adım',
    pathNote: 'Tema sayfalarında her öğrenme çıktısının etkinlikleri bu sırayla numaralandırılmıştır. Zorlanan bir öğrenci bir önceki adıma dönebilir; hazır olan bir sonrakine geçer.',
    principlesHeading: 'Temel ilkeler',
    principles: [
      { e: '🧩', t: 'Önce anlam, sonra işlem', d: 'Kurallar ezberletilmez. Öğrenci bir modelle “neden” olduğunu görür; işlem bu anlamın üzerine kurulur.' },
      { e: '🔁', t: 'Bir fikir, birçok temsil', d: 'Aynı fikir somut materyal, resim, sembol, sözcük ve günlük hayat durumuyla eşleştirilir. Temsiller arasında geçiş, kavramı derinleştirir.' },
      { e: '🧠', t: 'Ezber değil, strateji', d: 'Temel işlemler süreli testlerle değil; 10’a tamamlama, ikizler, “toplamayı düşün”, türetilmiş çarpma gibi stratejilerle öğrenilir.' },
      { e: '👀', t: 'Sayı duyusu', d: 'Hızlı bakış (şipşak sayma), 5 ve 10 çapaları, parça-parça-bütün ve referans sayılarla sayılar arasında ilişki kurulur.' },
      { e: '🌱', t: 'Henüz değil!', d: 'Süre baskısı yoktur. Yanlış cevap öğrenmenin parçasıdır; ipuçları cevabı söylemez, düşündüren bir soru sorar.' },
      { e: '🔍', t: 'Kavram yanılgılarına dikkat', d: 'Çeldiriciler gerçek kavram yanılgılarından seçilir. Yanlış seçildiğinde, yanılgıyı açıklayan kısa bir geri bildirim gelir.' },
      { e: '💬', t: 'Konuş, açıkla, gerekçelendir', d: 'Her etkinlik bir “Düşün ve Paylaş” sorusuyla biter. “Hangisi farklı?” sorularında birden fazla doğru gerekçe vardır.' },
      { e: '🧭', t: 'Gelişimsel ilerleme', d: 'Her öğrenme çıktısında etkinlikler somuttan soyuta dizilir; çocuk hazır olduğu adımdan başlayıp ilerler.' },
    ],
    parentsHeading: 'Veliler için öneriler',
    parentTips: [
      'Doğru cevabı söylemek yerine “Nasıl buldun?” diye sorun.',
      'Hız değil, açıklama önemli. Süre tutmayın.',
      'Yanlışları birlikte inceleyin: “Burada ne düşünmüştün?”',
      'Etkinlik sonundaki “Düşün ve Paylaş” sorusunu sohbet konusu yapın.',
    ],
    teachersHeading: 'Öğretmenler için öneriler',
    teacherTips: [
      '“Başlarken” ekranını tahtada açarak dersi bir problemle başlatın.',
      'Sanal manipülatifleri akıllı tahtada somut materyal yerine kullanabilirsiniz.',
      '“Hangisi farklı?” sorularını sınıf tartışmasına dönüştürün; her gerekçeyi değerli kabul edin.',
      'Tema sayfalarındaki “Büyük Fikirler” ders planlamasına yön verir.',
    ],
    ctaLabel: 'Etkinliklere göz at',
  },
  groups: [
    {
      title: 'Başlık ve giriş',
      fields: [
        { key: 'kicker', label: 'Üst etiket', type: 'text' },
        { key: 'title', label: 'Sayfa başlığı (H1)', type: 'text', max: 60 },
        { key: 'intro', label: 'Giriş metni', type: 'textarea', help: '*yıldızlar arasındaki* metin italik yazılır.' },
      ],
    },
    {
      title: 'Etkinlik adımları',
      fields: [
        { key: 'stepsHeading', label: 'Bölüm başlığı', type: 'text' },
        {
          key: 'steps',
          label: 'Adımlar',
          type: 'objlist',
          itemLabel: 'Adım',
          add: 'Adım ekle',
          help: 'Simgeler ve renkler sırayla verilir: 1) filiz, 2) oynat, 3) soru balonu.',
          fields: [
            { key: 't', label: 'Başlık', type: 'text' },
            { key: 'd', label: 'Açıklama', type: 'textarea' },
          ],
        },
      ],
    },
    {
      title: 'Öğrenme yolu',
      desc: 'Aşama adları ve açıklamaları sitenin genel aşama etiketlerinden gelir',
      fields: [
        { key: 'pathHeading', label: 'Bölüm başlığı', type: 'text' },
        { key: 'stepLabel', label: 'Aşama numarası etiketi', type: 'text', help: '{n} yerine aşama numarası yazılır.' },
        { key: 'pathNote', label: 'Alt not', type: 'textarea' },
      ],
    },
    {
      title: 'Temel ilkeler',
      fields: [
        { key: 'principlesHeading', label: 'Bölüm başlığı', type: 'text' },
        {
          key: 'principles',
          label: 'İlkeler',
          type: 'objlist',
          itemLabel: 'İlke',
          add: 'İlke ekle',
          fields: [
            { key: 'e', label: 'Emoji', type: 'text' },
            { key: 't', label: 'Başlık', type: 'text' },
            { key: 'd', label: 'Açıklama', type: 'textarea' },
          ],
        },
      ],
    },
    {
      title: 'Öneriler',
      fields: [
        { key: 'parentsHeading', label: 'Veliler başlığı', type: 'text' },
        { key: 'parentTips', label: 'Veliler için maddeler', type: 'list', add: 'Madde ekle', multiline: true },
        { key: 'teachersHeading', label: 'Öğretmenler başlığı', type: 'text' },
        { key: 'teacherTips', label: 'Öğretmenler için maddeler', type: 'list', add: 'Madde ekle', multiline: true },
        { key: 'ctaLabel', label: 'Alttaki düğme', type: 'text' },
      ],
    },
  ],
})
