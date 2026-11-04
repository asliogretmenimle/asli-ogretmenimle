import { useStore, setState } from './store'

type Topic = { id: string; label: string; body: string[] }

/** Yardım konuları: Polypad'deki sıraya göre gruplanmış */
const GROUPS: { label: string; topics: Topic[] }[] = [
  {
    label: 'Genel',
    topics: [
      {
        id: 'intro',
        label: 'Tanıtım',
        body: [
          'Matematik Tuvali; geometri, sayılar, kesirler, cebir, olasılık ve daha birçok konu için sanal manipülatiflerle dolu, sınırsız bir çalışma alanıdır.',
          'Soldaki **Parçalar** sekmesinden bir parçayı tuvale sürükleyin ya da parçaya dokunarak ekranın ortasına ekleyin. Tuvaldeki parçaları sürükleyip döndürebilir, seçince açılan eylem çubuğuyla renklendirip çoğaltabilirsiniz.',
          'Alttaki araç çubuğunda kalemler, çizgiler, geometrik çizim araçları, metin ve denklem kutuları bulunur. Sağ üstteki düğmelerle geri alabilir, ızgara seçebilir, yakınlaştırabilir ve görüntü olarak kaydedebilirsiniz.',
          'Çalışmanız bu cihazda otomatik olarak kaydedilir; sayfayı kapatıp açtığınızda kaldığınız yerden devam edersiniz.',
        ],
      },
      {
        id: 'sharing',
        label: 'Kaydetme ve paylaşma',
        body: ['Tuval her değişiklikte tarayıcınıza kaydedilir. Bir görüntüsünü almak için sağ üstteki **Dışa aktar** düğmesinden PNG, JPEG ya da SVG seçin.', 'Ders anlatırken ekran kaydı almak için araç çubuğundaki kırmızı **Kayıt** düğmesini kullanın (bilgisayar tarayıcılarında).'],
      },
      {
        id: 'settings',
        label: 'Ayarlar',
        body: ['**Ayarlar** sekmesinde arka plan rengini ve tuval boyutunu (sonsuz, sabit, defter) değiştirebilirsiniz.', '**Yazar modu** açıkken arayüzün hangi bölümlerinin görüneceğini, parçaların döndürülüp silinebileceğini, ses ve konfetiyi ayarlayabilirsiniz.'],
      },
      {
        id: 'authoring',
        label: 'Yazar modu',
        body: ['Yazar modunda kenar çubuğundaki her kategori ve bölümün yanında bir kutu belirir. Kutunun işaretini kaldırdığınız bölümler, yazar modu kapatıldığında öğrencilere gösterilmez.', 'Böylece bir etkinlik için yalnızca gerekli parçaları bırakabilirsiniz.'],
      },
      {
        id: 'accessibility',
        label: 'Erişilebilirlik ve kısayollar',
        body: [
          'Klavye kısayolları: **V** taşıma, **P** kalem, **L** çizgi, **G** geometri, **T** metin, **Q** denklem, **Delete** sil, **Ctrl/⌘+Z** geri al, **Ctrl/⌘+Shift+Z** yinele, **Ctrl/⌘+C / V / D** kopyala, yapıştır, çoğalt, **Ctrl/⌘+A** tümünü seç, **ok tuşları** kaydır, **R** döndür, **+ / −** yakınlaştır.',
          'Ayarlardan **Yüksek karşıtlık** ve **Büyük arayüz** seçeneklerini açabilirsiniz.',
        ],
      },
    ],
  },
  {
    label: 'Araçlar',
    topics: [
      {
        id: 'move',
        label: 'Seçme, taşıma, kopyalama',
        body: [
          'Bir parçayı sürükleyerek taşıyın. Seçili parçanın üstündeki mavi tutamaçla döndürün (Shift ile serbest açı).',
          'Fareyle boş alanda sürükleyerek birden fazla parça seçin; tablette boş alana **uzun basıp** sürükleyin. Shift ile tıklayarak seçime ekleyin.',
          'Tablette tek parmakla boş alanı sürüklemek tuvali kaydırır; iki parmakla yakınlaştırırsınız.',
          'Bir parçayı kenar çubuğunun üzerine bırakırsanız silinir.',
          'Seçili parçaların altında **eylem çubuğu** açılır: parçaya özel düğmeler (Böl, Birleştir, Çevir…), **Kopyala**, **Sil** ve **Yardım**. Diğer ayarlar **⋯** menüsündedir; menüdeki **Eylem çubuğunu sabitle** ile çubuğu araç çubuğunun üstüne sabitleyebilirsiniz.',
          'Çokgen seçiliyken **Kes** düğmesine basıp çokgenin üzerinden bir çizgi çekin: çokgen ikiye ayrılır. Birden çok çokgen seçip ⋯ menüsünden **Birleşim, Kesişim, Fark** işlemlerini yapın.',
        ],
      },
      { id: 'pen', label: 'Kalem ve silgi', body: ['Kalem aracında kurşun kalem, keçeli kalem ve fosforlu kalem bulunur. Rengi ve kalınlığı renk seçiciden değiştirin.', 'Silgi yalnızca çizimleri siler; değdiği kısmı keser.'] },
      { id: 'geo', label: 'Geometrik çizimler', body: ['Nokta, doğru parçası, çember, dikdörtgen ve açı çizebilirsiniz. Uçlar yakındaki noktalara ve köşelere yapışır.', 'Seçili çizimin tutamaçlarını sürükleyerek boyutunu değiştirin; eylem çubuğundan uzunluk ve yarıçapı gösterin.'] },
      { id: 'line', label: 'Çizgiler', body: ['Çizgi aracıyla iki parça arasında sürükleyin: çizgi parçalara bağlanır ve onlar taşınınca birlikte hareket eder. Kavram haritaları ve akış şemaları için idealdir.'] },
      { id: 'text', label: 'Metin kutuları', body: ['Metin aracını seçip tuvale dokunun ve yazın. Metni değiştirmek için kutuya çift dokunun. Sağdaki tutamaçla genişliği ayarlayın.'] },
      { id: 'equation', label: 'Denklemler', body: ['Denklem kutusunda **^** üs, **_** alt simge, **/** kesir, **sqrt( )** karekök, **pi** π yazar. Örnek: `x^2 + 3/4 = sqrt(16)`.'] },
      { id: 'color', label: 'Renk seçici', body: ['Önce parçaları seçip sonra renk seçerseniz parçalar boyanır. Hiçbir şey seçili değilse renk, sonraki çizimlerde kullanılır.'] },
      { id: 'recorder', label: 'Ekran kaydı', body: ['Kırmızı düğmeye basıp **Kaydı başlat**’ı seçin ve tarayıcıda bu sekmeyi paylaşın. Kayıt bitince video dosyası indirilir. iPad ve iPhone tarayıcıları ekran kaydını desteklemez.'] },
    ],
  },
  {
    label: 'Parçalar',
    topics: [
      { id: 'polygon', label: 'Çokgenler', body: ['Örüntü blokları ve düzgün çokgenler köşelerinden birbirine yapışır. Eylem çubuğundan iç açıları ve kenar uzunluklarını gösterin.', 'Dikdörtgen, düzgün çokgen, serbest çokgen ve çemberin boyutunu tutamaçlarla değiştirin.'] },
      { id: 'polyomino', label: 'Poliominolar ve tangram', body: ['Pentomino, tetromino ve tangram parçalarını döndürüp yansıtarak şekiller oluşturun. Izgara açıkken parçalar ızgaraya oturur.'] },
      { id: 'polyhedron', label: '3B cisimler', body: ['Cismi tutamacıyla üç boyutta döndürün; eylem çubuğundan açınımını gösterin.'] },
      { id: 'utensils', label: 'Ölçme araçları', body: ['Cetvel, iletki, gönye, pergel ve açı parçalarıyla ölçüm yapın. Pergelle yay çizebilirsiniz.'] },
      { id: 'number-tile', label: 'Sayı karoları ve çubukları', body: ['Bir karoyu ya da küpü seçince açılan eylem çubuğundaki **Böl** ile onluk taban bloklarını parçalayın; birden çok parça seçip **Birleştir** ile yeniden gruplayın. **Düzenle** seçili parçaları basamak değerine göre dizer.'] },
      { id: 'number-frame', label: 'Onluk çerçeve', body: ['Sayma pullarını çerçevenin üstüne bırakın; boş kutulara yerleşir. **Doldur** çerçeveyi pullarla doldurur. Pula çift dokunarak ya da **Çevir** ile işaretini değiştirin.'] },
      { id: 'number-line', label: 'Sayı doğrusu', body: ['Atlama oklarını sayı doğrusuna yerleştirin; tutamaçla atlama boyunu değiştirin. Başlangıç, bitiş ve adımı eylem çubuğundan ayarlayın.'] },
      { id: 'prime-disk', label: 'Asal çarpan daireleri', body: ['Asal çarpan daireleri sayının asal çarpanlarını renkli halkalarla gösterir. ⋯ menüsündeki **Etiketler** ile gösterimi değiştirin, **Asal çarpanlarına ayır** ile daireyi çarpanlarına bölün.'] },
      { id: 'abacus', label: 'Abaküs ve patlayan noktalar', body: ['Abaküste boncuğa dokununca o boncuk ve ötesindekiler kayar. Patlayan noktalar makinesine noktalar bırakıp “Patlat” ile basamak değerini keşfedin.'] },
      { id: 'fraction-bar', label: 'Kesirler', body: ['Kesir şeritleri ve dairelerini **Ayır** ile tek tek parçalara bölün, **Birleştir** ile aynı paydalı parçaları birleştirin. **Yeniden adlandır** düğmeleri 1/2’yi 2/4 gibi denk kesre çevirir. Etiketleri ⋯ menüsünden kesir, ondalık, yüzde ya da derece yapın.'] },
      { id: 'algebra', label: 'Cebir karoları', body: ['**Ters işaretlisi** karonun işaretini değiştirir; **Dikey böl / Yatay böl** karoyu parçalar, **Birleştir** parçaları yeniden birleştirir. Sıfır kovasında **Doldur** +1 ve −1 karolarıyla sıfır çiftleri oluşturur.'] },
      { id: 'balance', label: 'Terazi', body: ['Pulları, cebir karolarını ya da sayı kartlarını kefelerin üstüne bırakın; terazi ağır olan tarafa eğilir.'] },
      { id: 'function-machine', label: 'Fonksiyon makinesi', body: ['Kuralı değiştirmek için kural kutusuna dokunun. Girişe bir sayı kartı bırakınca çıkış kartı üretilir. “Gizemli kural” ile öğrenciler kuralı tahmin etsin.'] },
      { id: 'axes', label: 'Koordinat düzlemi', body: ['Fonksiyon ekleyin (ör. y = a·x + b) ve değişken kaydırıcılarıyla a, b, c, d değerlerini değiştirip grafiği izleyin.'] },
      { id: 'dice', label: 'Zar, para ve çarklar', body: ['Seçili zara, paraya ya da çarka tekrar dokunarak atın/çevirin. Özel çarkın dilimlerini ve ağırlıklarını eylem çubuğundan düzenleyin.'] },
      { id: 'chart', label: 'Grafikler', body: ['“Veriyi düzenle” ile değerleri girin (ör. A: 3, 5, 2). Grafik türünü sütun, çubuk, çizgi ve alan arasında değiştirin.'] },
      { id: 'card', label: 'Oyun kâğıtları', body: ['Desteye dokunarak kart çekin, “Karıştır” ile yeniden doldurun. Tek kartı çevirip rengini ve değerini değiştirebilirsiniz.'] },
      { id: 'logic', label: 'Mantık devreleri', body: ['Bir parçanın çıkış noktasını sürükleyip başka bir parçanın üstüne bırakarak kablo bağlayın. Bağlantıyı kaldırmak için giriş noktasına dokunun.'] },
      { id: 'clock', label: 'Saatler', body: ['Dişli saatte yelkovanı çevirince akrep de döner. Serbest saatte her ibre bağımsızdır. Eylem çubuğundan dijital gösterimi açın.'] },
      { id: 'song', label: 'Müzik', body: ['Klavyede tuşlara dokunarak nota çalın. Parça aracında kutulara dokunarak melodi oluşturun ve oynatın.'] },
    ],
  },
]

const ALL = GROUPS.flatMap((g) => g.topics)

/** **kalın** ve `kod` biçimlerini destekleyen küçük biçimlendirici */
function rich(s: string) {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) =>
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part,
  )
}

export function HelpPanel() {
  const topic = useStore((s) => s.helpTopic)
  const t = ALL.find((x) => x.id === topic) ?? ALL[0]
  return (
    <div className="pp-help">
      <div className="pp-form-row top-nav">
        <select className="pp-input" aria-label="Yardım konusu seç" value={t.id} onChange={(e) => setState({ helpTopic: e.target.value })}>
          {GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.topics.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <article className="pp-help-block">
        <h3>{t.label}</h3>
        {t.body.map((p, i) => (
          <p key={i}>{rich(p)}</p>
        ))}
      </article>
    </div>
  )
}
