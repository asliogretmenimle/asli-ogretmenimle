import { Link } from 'react-router-dom'
import { ChevronRight, MessageCircleQuestion, Play, Sprout } from 'lucide-react'
import { usePageTitle } from '../components/Layout'
import { stageMeta } from '../components/meta'
import { STAGE_ORDER } from '../data/activityStore'

const PRINCIPLES = [
  { e: '🧩', t: 'Önce anlam, sonra işlem', d: 'Kurallar ezberletilmez. Öğrenci bir modelle “neden” olduğunu görür; işlem bu anlamın üzerine kurulur.' },
  { e: '🔁', t: 'Bir fikir, birçok temsil', d: 'Aynı fikir somut materyal, resim, sembol, sözcük ve günlük hayat durumuyla eşleştirilir. Temsiller arasında geçiş, kavramı derinleştirir.' },
  { e: '🧠', t: 'Ezber değil, strateji', d: 'Temel işlemler süreli testlerle değil; 10’a tamamlama, ikizler, “toplamayı düşün”, türetilmiş çarpma gibi stratejilerle öğrenilir.' },
  { e: '👀', t: 'Sayı duyusu', d: 'Hızlı bakış (şipşak sayma), 5 ve 10 çapaları, parça-parça-bütün ve referans sayılarla sayılar arasında ilişki kurulur.' },
  { e: '🌱', t: 'Henüz değil!', d: 'Süre baskısı yoktur. Yanlış cevap öğrenmenin parçasıdır; ipuçları cevabı söylemez, düşündüren bir soru sorar.' },
  { e: '🔍', t: 'Kavram yanılgılarına dikkat', d: 'Çeldiriciler gerçek kavram yanılgılarından seçilir. Yanlış seçildiğinde, yanılgıyı açıklayan kısa bir geri bildirim gelir.' },
  { e: '💬', t: 'Konuş, açıkla, gerekçelendir', d: 'Her etkinlik bir “Düşün ve Paylaş” sorusuyla biter. “Hangisi farklı?” sorularında birden fazla doğru gerekçe vardır.' },
  { e: '🧭', t: 'Gelişimsel ilerleme', d: 'Her öğrenme çıktısında etkinlikler somuttan soyuta dizilir; çocuk hazır olduğu adımdan başlayıp ilerler.' },
]

export default function Approach() {
  usePageTitle('Yaklaşımımız')
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <p className="chip bg-cream px-3 py-1 text-sm text-amber-800">Öğretmenler ve veliler için</p>
      <h1 className="mt-3 text-3xl leading-tight font-black sm:text-4xl">Matematiği anlayarak öğrenmek</h1>
      <p className="mt-3 max-w-3xl text-lg font-semibold text-ink-soft">
        Sitedeki tüm oyun ve etkinlikler, John A. Van de Walle’ün <em>gelişimsel ve problem çözme odaklı matematik öğretimi</em> yaklaşımına göre tasarlandı ve Türkiye Yüzyılı Maarif Modeli öğretim programının öğrenme çıktılarıyla eşleştirildi.
      </p>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black">Her etkinlik üç adımdan oluşur</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Sprout, t: 'Başlarken', d: 'Günlük hayattan kısa bir durum ya da merak uyandıran bir soru. Ne yapacağımızı ve neden önemli olduğunu hissettirir.', c: '#a16207', bg: '#fef3c7' },
            { icon: Play, t: 'Keşfet', d: 'Oyun, model ve manipülatiflerle düşünme. Takılınca kademeli ipuçları, yanılınca açıklayıcı geri bildirim.', c: '#3f8a4f', bg: '#e7f3e4' },
            { icon: MessageCircleQuestion, t: 'Düşün ve Paylaş', d: 'Açık uçlu tek bir soru: “Nasıl düşündün? Başka bir yolu var mı?” Sınıfta tartışma, evde sohbet başlatır.', c: '#7e22ce', bg: '#f3e8ff' },
          ].map((s) => (
            <div key={s.t} className="card p-5">
              <span className="grid size-11 place-items-center rounded-2xl" style={{ background: s.bg, color: s.c }}><s.icon size={22} /></span>
              <p className="mt-3 text-lg font-black">{s.t}</p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black">Öğrenme yolu: somuttan soyuta</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {STAGE_ORDER.map((st, i) => {
            const m = stageMeta[st]
            return (
              <div key={st} className="relative rounded-3xl p-5" style={{ background: m.bg }}>
                <span className="text-sm font-black" style={{ color: m.color }}>{i + 1}. adım</span>
                <p className="mt-1 flex items-center gap-2 text-lg font-black" style={{ color: m.color }}><m.icon size={20} />{m.label}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{m.desc}</p>
                {i < 3 && <ChevronRight className="absolute top-1/2 -right-3 hidden -translate-y-1/2 text-ink-soft sm:block" />}
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-sm font-semibold text-ink-soft">Tema sayfalarında her öğrenme çıktısının etkinlikleri bu sırayla numaralandırılmıştır. Zorlanan bir öğrenci bir önceki adıma dönebilir; hazır olan bir sonrakine geçer.</p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black">Temel ilkeler</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.t} className="card flex items-start gap-3 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-paper text-2xl" aria-hidden>{p.e}</span>
              <div>
                <p className="font-black">{p.t}</p>
                <p className="text-sm font-semibold text-ink-soft">{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-line">
          <h2 className="text-lg font-black">Veliler için öneriler</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-ink-soft">
            <li>• Doğru cevabı söylemek yerine “Nasıl buldun?” diye sorun.</li>
            <li>• Hız değil, açıklama önemli. Süre tutmayın.</li>
            <li>• Yanlışları birlikte inceleyin: “Burada ne düşünmüştün?”</li>
            <li>• Etkinlik sonundaki “Düşün ve Paylaş” sorusunu sohbet konusu yapın.</li>
          </ul>
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-line">
          <h2 className="text-lg font-black">Öğretmenler için öneriler</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-ink-soft">
            <li>• “Başlarken” ekranını tahtada açarak dersi bir problemle başlatın.</li>
            <li>• Sanal manipülatifleri akıllı tahtada somut materyal yerine kullanabilirsiniz.</li>
            <li>• “Hangisi farklı?” sorularını sınıf tartışmasına dönüştürün; her gerekçeyi değerli kabul edin.</li>
            <li>• Tema sayfalarındaki “Büyük Fikirler” ders planlamasına yön verir.</li>
          </ul>
        </div>
      </section>

      <div className="mt-10 text-center">
        <Link to="/" className="btn-primary">Etkinliklere göz at</Link>
      </div>
    </div>
  )
}
