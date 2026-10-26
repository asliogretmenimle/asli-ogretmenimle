import type { Grade, Outcome, Theme, ThemeIcon } from './types'

/**
 * Türkiye Yüzyılı Maarif Modeli — İlkokul (1–4) ve Ortaokul (5–8) Matematik Dersi Öğretim Programları.
 * Temalar programdaki işleniş sırasına göre listelenmiştir.
 */

const o = (code: string, title: string, short: string): Outcome => ({ code, title, short })

const t = (
  grade: Grade,
  order: number,
  slug: string,
  title: string,
  icon: ThemeIcon,
  topics: string[],
  outcomes: Outcome[],
): Theme => ({ grade, order, slug, title, icon, topics, outcomes })

export const themes: Theme[] = [
  // ───────────────────────────── 1. SINIF ─────────────────────────────
  t(1, 1, 'nesnelerin-geometrisi-1', 'Nesnelerin Geometrisi (1)', 'geometry', ['Uzamsal İlişkiler', 'Eş Nesneler'], [
    o('MAT.1.3.1', 'Hedefe ulaşmak için mesafeleri ve yönleri içeren yönergeleri çözümleyebilme', 'Yön ve konum'),
    o('MAT.1.3.2', 'Nesnelerin eşliğini değerlendirebilme', 'Eş nesneler'),
  ]),
  t(1, 2, 'sayilar-ve-nicelikler-1', 'Sayılar ve Nicelikler (1)', 'numbers', ['Rakamlar ve Sayılar', 'Sayıları Çözümleme', 'Sıra Sayıları', 'Büyüklükleri Karşılaştırma', 'Ritmik Sayma', 'Sayı ve Şekil Örüntüleri', 'Nesne Sayısını Tahmin Etme'], [
    o('MAT.1.1.1', 'Rakamları ve 20’ye kadar olan sayıları (20 dâhil), niceliklerin büyüklüklerini temsil etmek için kullanabilme', '20’ye kadar sayılar'),
    o('MAT.1.1.2', 'Ögeleri dağınık veya düzenli bir şekilde bulunan bir nesne grubunu sayarken parçalar arasında ilişkileri çözümleyebilme', 'Sayarken parçalar'),
    o('MAT.1.1.3', 'Nesnelerin sıra sayısını gösterebilme', 'Sıra sayıları'),
    o('MAT.1.1.4', 'İki niceliğin büyüklüğünü “çok”, “daha çok”, “az”, “daha az” veya “eşit” terimleriyle karşılaştırabilme', 'Çok mu, az mı?'),
    o('MAT.1.1.5', '100’e kadar ileriye ve 20’den geriye doğru ritmik sayabilme', 'Ritmik sayma'),
    o('MAT.1.1.6', 'Artan veya azalan sayı ve şekil örüntülerini çözümleyebilme', 'Örüntüler'),
    o('MAT.1.1.7', 'Verilen bir çokluktaki ilişkilerden yararlanarak 20’ye kadar (20 dâhil) olan nesnelerin sayısını tahmin edebilme', 'Tahmin et'),
  ]),
  t(1, 3, 'sayilar-ve-nicelikler-2', 'Sayılar ve Nicelikler (2)', 'measure', ['Uzunluk ve Kütle Ölçme'], [
    o('MAT.1.1.8', 'Standart olmayan uygun ölçme araçları ile nesnelerin uzunluğunu ve tartacağı kütlenin ölçüm sonuçlarını tahmin edebilme', 'Uzunluk ve ağırlık'),
  ]),
  t(1, 4, 'islemlerden-cebirsel-dusunmeye', 'İşlemlerden Cebirsel Düşünmeye', 'operations', ['Toplama ve Çıkarma İşlemlerini Çözümleme', 'Tahmin ve Zihinden İşlem', 'Toplama ve Çıkarmada Eşitlik', 'Toplama ve Çıkarmanın İlişkisi'], [
    o('MAT.1.2.1', 'Günlük yaşamın içerdiği toplama ve çıkarma işlemlerini çözümleyebilme', 'Toplama ve çıkarma'),
    o('MAT.1.2.2', 'Toplama ve çıkarma işlemlerinin sonuçlarını tahminde bulunarak ve zihinden işlem yaparak muhakeme edebilme', 'Zihinden işlem'),
    o('MAT.1.2.3', 'Eşit işaretinin anlamını toplama ve çıkarma işlemi bağlamında yorumlayabilme', 'Eşittir işareti'),
    o('MAT.1.2.4', 'Toplama ve çıkarma işlemlerinin ilişkisini yorumlayabilme', 'Toplama-çıkarma ilişkisi'),
  ]),
  t(1, 5, 'sayilar-ve-nicelikler-3', 'Sayılar ve Nicelikler (3)', 'measure', ['Paralarımız'], [
    o('MAT.1.1.9', 'Paraların (1 TL, 5 TL, 10 TL, 20 TL, 50 TL, 100 TL ve 200 TL) temsil ettiği büyüklükleri tanıyabilme', 'Paralarımız'),
  ]),
  t(1, 6, 'nesnelerin-geometrisi-2', 'Nesnelerin Geometrisi (2)', 'geometry', ['Geometrik Şekiller', 'Biçimsel Özellikler', 'Sınıflandırma'], [
    o('MAT.1.3.3', 'Günlük yaşamdaki nesneleri biçimsel özelliklerine göre ayırt edebilme', 'Nesnelerin biçimi'),
    o('MAT.1.3.4', 'Günlük yaşamda karşılaşılan geometrik yapılardaki geometrik şekilleri çözümleyebilme', 'Yapılardaki şekiller'),
    o('MAT.1.3.5', 'Biçimsel özelliklerine göre geometrik şekilleri sınıflandırabilme', 'Şekilleri grupla'),
  ]),
  t(1, 7, 'veriye-dayali-arastirma', 'Veriye Dayalı Araştırma', 'data', ['Veriyle Çalışma ve Veriye Dayalı Karar Verme'], [
    o('MAT.1.4.1', 'Kategorik veriye dayalı temel veri grubu ile çalışabilme ve veriye dayalı karar verebilme', 'Veri toplama'),
  ]),

  // ───────────────────────────── 2. SINIF ─────────────────────────────
  t(2, 1, 'nesnelerin-geometrisi-1', 'Nesnelerin Geometrisi (1)', 'geometry', ['Geometrik Cisimler', 'Cisim ve Şekil Modelleri', 'Biçimsel Özellikler', 'Sıvı Miktarını Tahmin Etme'], [
    o('MAT.2.3.1', 'Günlük yaşamda kullanılan nesneleri biçimsel özelliklerine göre geometrik cisim olarak sınıflandırabilme', 'Geometrik cisimler'),
    o('MAT.2.3.2', 'Geometrik cisim modellerini kullanarak yapılar sentezleyebilme', 'Cisimlerle yapılar'),
    o('MAT.2.3.3', 'Geometrik şekiller kullanarak modeller sentezleyebilme', 'Şekillerle modeller'),
    o('MAT.2.3.4', 'Geometrik şekil ve cisimlerin yön, konum veya büyüklükleri değiştiğinde biçimsel özelliklerinin değişmediğini yorumlayabilme', 'Döndürünce değişir mi?'),
    o('MAT.2.3.5', 'Standart olmayan sıvı ölçme araçları ile sıvı miktarını tahmin edebilme', 'Sıvı ölçme'),
  ]),
  t(2, 2, 'sayilar-ve-nicelikler-1', 'Sayılar ve Nicelikler (1)', 'numbers', ['100’e Kadar Sayılar', 'Sayıları Çözümleme', 'Sayıları Sıralama', 'Ritmik Sayma', 'Sayı ve Şekil Örüntüleri', 'Nesne Sayısını Tahmin Etme'], [
    o('MAT.2.1.1', '100’e kadar olan niceliklerin büyüklüklerini temsil etmede sayıların sembolik temsillerinden yararlanabilme', '100’e kadar sayılar'),
    o('MAT.2.1.2', 'İki basamaklı sayıları çözümleyebilme', 'Onluk ve birlik'),
    o('MAT.2.1.3', 'Sayıların sırasını belirleyebilme', 'Sayıları sırala'),
    o('MAT.2.1.4', 'İleriye ve geriye doğru ritmik sayabilme', 'Ritmik sayma'),
    o('MAT.2.1.5', 'Sayı ve sayı temsiline dönüşen şekil örüntülerine dayalı çıkarım yapabilme', 'Örüntüler'),
    o('MAT.2.1.6', 'Bir çokluktaki ilişkilerden yararlanarak 50’ye kadar olan nesnelerin sayısını tahmin edebilme', 'Tahmin et'),
  ]),
  t(2, 3, 'islemlerden-cebirsel-dusunmeye', 'İşlemlerden Cebirsel Düşünmeye', 'operations', ['Toplama ve Çıkarma Problemleri', 'Tahmin ve Zihinden İşlem', 'Çarpma ve Bölme', 'Dört İşlemde Eşitlik'], [
    o('MAT.2.2.1', 'Toplama ve çıkarma işlemleri gerektiren günlük yaşam problemlerini çözebilme', 'Problemler'),
    o('MAT.2.2.2', 'Toplama ve çıkarma işlemlerinin sonuçlarını tahminde bulunarak ve zihinden işlem yaparak muhakeme edebilme', 'Zihinden işlem'),
    o('MAT.2.2.3', 'Toplama ve çıkarma işlemlerinin ilişkisini yorumlayabilme', 'Toplama-çıkarma ilişkisi'),
    o('MAT.2.2.4', 'Çarpma ve bölme işlemlerini toplama ve çıkarma işlemlerine dayalı olarak çözümleyebilme', 'Çarpma ve bölmeye giriş'),
    o('MAT.2.2.5', 'Çarpma ve bölme işlemlerinin sonuçlarını tahminde bulunarak ve zihinden işlem yaparak muhakeme edebilme', 'Zihinden çarpma-bölme'),
    o('MAT.2.2.6', 'Dört işlem bağlamında eşitliğin farklı anlamlarını yorumlayabilme', 'Eşitlik'),
  ]),
  t(2, 4, 'sayilar-ve-nicelikler-2', 'Sayılar ve Nicelikler (2)', 'measure', ['Kesirler', 'Paralarımız', 'Zaman Ölçme', 'Uzunluk ve Kütle Ölçme'], [
    o('MAT.2.1.7', 'Bütün, yarım ve çeyrek arasındaki ilişkiyi çözümleyebilme', 'Bütün, yarım, çeyrek'),
    o('MAT.2.1.8', 'Paraları değerlerine göre ilişkilendirerek çözümleyebilme', 'Paralarımız'),
    o('MAT.2.1.9', 'Zaman ölçü birimlerini okuyabilme ve yazabilme', 'Zaman ölçme'),
    o('MAT.2.1.10', 'Standart uzunluk ve kütle ölçme araçlarının ve birimlerinin gerekliliğini yansıtabilme', 'Ölçme araçları'),
    o('MAT.2.1.11', 'Standart uzunluk ve kütle ölçü birimleri cinsinden uzunlukları ve kütleleri tahmin edebilme', 'Metre, kilogram tahmini'),
  ]),
  t(2, 5, 'nesnelerin-geometrisi-2', 'Nesnelerin Geometrisi (2)', 'transform', ['Yer ve Yön Bulma', 'Simetri'], [
    o('MAT.2.3.6', 'Mesafe ve yönleri içerecek şekilde hedefe ulaşmak için uygun stratejilere karar verebilme', 'Yol bulma'),
    o('MAT.2.3.7', 'Verilen şekiller arasından simetrik olanları ayırt edebilme', 'Simetri'),
  ]),
  t(2, 6, 'veriye-dayali-arastirma', 'Veriye Dayalı Araştırma', 'data', ['Veriyle Çalışma ve Veriye Dayalı Karar Verme'], [
    o('MAT.2.4.1', 'Kategorik veriye dayalı en çok iki veri grubu ile çalışabilme ve veriye dayalı karar verebilme', 'Tablo ve grafik'),
  ]),

  // ───────────────────────────── 3. SINIF ─────────────────────────────
  t(3, 1, 'sayilar-ve-nicelikler-1', 'Sayılar ve Nicelikler (1)', 'numbers', ['1000’e Kadar Sayılar', 'Sayıları Çözümleme', 'Sayıları Sıralama', 'Ritmik Sayma', 'Tek ve Çift Sayılar', 'Örüntüler', 'Nesne Sayısını Tahmin Etme'], [
    o('MAT.3.1.1', 'Niceliklerin büyüklüklerine karşılık gelen 1000’e kadar olan sayıların temsillerinden yararlanabilme', '1000’e kadar sayılar'),
    o('MAT.3.1.2', '1000’e kadar olan sayıları çözümleyebilme', 'Basamak değeri'),
    o('MAT.3.1.3', 'Sayıları sıralayabilme', 'Sayıları sırala'),
    o('MAT.3.1.4', 'Sayıları ileriye ve geriye doğru ritmik sayabilme', 'Ritmik sayma'),
    o('MAT.3.1.5', 'Sayıları tek-çift olarak sınıflandırabilme', 'Tek ve çift'),
    o('MAT.3.1.6', 'Tek ve çift sayıların toplamlarının tek ya da çift olma durumu arasındaki ilişkiye yönelik tümevarımsal akıl yürütebilme', 'Tek-çift toplamları'),
    o('MAT.3.1.7', 'Sayı ve sayı temsiline dönüşen şekil örüntülerine dayalı çıkarım yapabilme', 'Örüntüler'),
    o('MAT.3.1.8', 'Bir çokluktaki ilişkilerden yararlanarak 100’e kadar olan nesnelerin sayısını tahmin edebilme', 'Tahmin et'),
  ]),
  t(3, 2, 'sayilar-ve-nicelikler-2', 'Sayılar ve Nicelikler (2)', 'measure', ['Kesirler', 'Saat ve Zaman', 'Uzunluk ve Kütle Birimleri', 'Madenî ve Kâğıt Paralar'], [
    o('MAT.3.1.9', 'Bütün, yarım ve çeyreğin kesirle gösterimi için modellerden yararlanabilme', 'Yarım ve çeyrek'),
    o('MAT.3.1.10', 'Bir bütünü eş parçalar oluşturacak şekilde birim kesir olarak çözümleyebilme', 'Birim kesirler'),
    o('MAT.3.1.11', 'Bir kesrin payı ile paydası arasındaki ilişkiyi çözümleyebilme', 'Pay ve payda'),
    o('MAT.3.1.12', 'Analog ve dijital saatlerde zamanı okuyabilme ve yazabilme', 'Saat okuma'),
    o('MAT.3.1.13', 'Zaman ölçü birimlerini çözümleyebilme', 'Zaman birimleri'),
    o('MAT.3.1.14', 'Olayların oluş sürelerini tahmin ederek yargıda bulunabilme', 'Süre tahmini'),
    o('MAT.3.1.15', 'Uzunluk ve kütle birimleri arasındaki ilişkileri kullanarak bu birimleri kendi içerisinde çözümleyebilme', 'Uzunluk ve kütle'),
    o('MAT.3.1.16', 'Madenî ve kâğıt paraları değerlerine göre ilişkilendirerek yorumlayabilme', 'Lira ve kuruş'),
  ]),
  t(3, 3, 'islemlerden-cebirsel-dusunmeye', 'İşlemlerden Cebirsel Düşünmeye', 'operations', ['Toplama ve Çıkarma', 'Çarpma ve Bölme', 'Dört İşlem Problemleri', 'Dört İşlemde Eşitlik'], [
    o('MAT.3.2.1', 'Toplama ve çıkarma işlemlerinin sonuçlarını tahminde bulunarak ve zihinden işlem yaparak muhakeme edebilme', 'Zihinden toplama-çıkarma'),
    o('MAT.3.2.2', 'Toplama ve çıkarma işlemlerini çözümleyebilme', 'Toplama ve çıkarma'),
    o('MAT.3.2.3', 'Çarpma ve bölme işlemlerinin sonuçlarını tahminde bulunarak ve zihinden işlem yaparak muhakeme edebilme', 'Zihinden çarpma-bölme'),
    o('MAT.3.2.4', 'Çarpma ve bölme işlemlerini çözümleyebilme', 'Çarpma ve bölme'),
    o('MAT.3.2.5', 'Dört işlem gerektiren durumlar için verilen yönergeleri takip ederek yorumlayabilme', 'Yönergeli işlemler'),
    o('MAT.3.2.6', 'Dört işlem gerektiren günlük yaşam problemlerini çözebilme', 'Problemler'),
    o('MAT.3.2.7', 'Dört işlem gerektiren problem durumlarını yapılandırabilme', 'Problem kur'),
    o('MAT.3.2.8', 'Dört işlem bağlamında eşitliğin farklı anlamlarını yorumlayabilme', 'Eşitlik'),
  ]),
  t(3, 4, 'nesnelerin-geometrisi-1', 'Nesnelerin Geometrisi (1)', 'geometry', ['Geometrik Cisimlerin Özellikleri', 'Şekilleri Sınıflandırma', 'Şekil ve Cisim Çizme', 'Çevre Uzunluğu Tahmini', 'Sıvı Ölçme'], [
    o('MAT.3.3.1', 'Geometrik cisimlerin özelliklerini yorumlayabilme', 'Cisimlerin özellikleri'),
    o('MAT.3.3.2', 'Kenar sayılarına göre geometrik şekilleri sınıflandırabilme', 'Kenar sayısı'),
    o('MAT.3.3.3', 'Matematiksel araç ve teknolojileri kullanarak çeşitli geometrik şekilleri ve cisimleri çizebilme', 'Şekil çizme'),
    o('MAT.3.3.4', 'Standart olmayan ve standart ölçme araçları ile geometrik şekillerin çevre uzunluğunu tahmin edebilme', 'Çevre uzunluğu'),
    o('MAT.3.3.5', 'Standart sıvı ölçü birimleri cinsinden sıvı miktarını tahmin edebilme', 'Litre ve mililitre'),
  ]),
  t(3, 5, 'nesnelerin-geometrisi-2', 'Nesnelerin Geometrisi (2)', 'transform', ['Simetri Doğrusu', 'Simetrik Şekli Tamamlama', 'Simetrik Şekil Oluşturma'], [
    o('MAT.3.3.6', 'Birden fazla simetri doğrusu olan şekilleri çözümleyebilme', 'Simetri doğruları'),
    o('MAT.3.3.7', 'Bir parçası verilen simetrik şekli simetri doğrusuna göre yapılandırabilme', 'Simetriyi tamamla'),
    o('MAT.3.3.8', 'Yönerge ile yapılandırılan ve bir parçası verilen bir şekli tamamlayarak simetrisini oluşturmaya ilişkin kodlama stratejilerini kullanarak yargıda bulunabilme', 'Kodlama ile simetri'),
  ]),
  t(3, 6, 'veriye-dayali-arastirma', 'Veriye Dayalı Araştırma', 'data', ['Veriyle Çalışma ve Veriye Dayalı Karar Verme'], [
    o('MAT.3.4.1', 'Kategorik ve sayma ile elde edilen nicel veriye dayalı tek veri grubu ile çalışabilme ve veriye dayalı karar verebilme', 'Çetele ve grafik'),
  ]),

  // ───────────────────────────── 4. SINIF ─────────────────────────────
  t(4, 1, 'sayilar-ve-nicelikler-1', 'Sayılar ve Nicelikler (1)', 'numbers', ['Altı Basamaklı Sayılar', 'Sayıları Çözümleme', 'Sayıları Sıralama', 'Ritmik Sayma', 'Örüntüler'], [
    o('MAT.4.1.1', 'Niceliklerin büyüklükleri için en fazla altı basamaklı olan sayıların temsillerinden yararlanabilme', 'Büyük sayılar'),
    o('MAT.4.1.2', 'En fazla altı basamaklı sayıları çözümleyebilme', 'Basamak ve bölük'),
    o('MAT.4.1.3', 'Sayıları sıralayabilme', 'Sayıları sırala'),
    o('MAT.4.1.4', 'İleriye ve geriye doğru ritmik saymayı yapılandırabilme', 'Ritmik sayma'),
    o('MAT.4.1.5', 'Artan azalan sayı örüntüleri ve şekil örüntülerindeki değişimi genelleyebilme', 'Örüntü kuralı'),
  ]),
  t(4, 2, 'sayilar-ve-nicelikler-2', 'Sayılar ve Nicelikler (2)', 'numbers', ['Basit, Bileşik ve Tam Sayılı Kesirler', 'Denk Kesirler', 'Kesirleri Karşılaştırma', 'Kesirlerle Toplama ve Çıkarma', 'Ölçü Birimlerini Dönüştürme'], [
    o('MAT.4.1.6', 'Basit, bileşik ve tam sayılı kesirleri kullanmak için matematiksel temsillerden yararlanabilme', 'Kesir çeşitleri'),
    o('MAT.4.1.7', 'Denk kesirleri kullanmak için matematiksel temsillerden yararlanabilme', 'Denk kesirler'),
    o('MAT.4.1.8', 'Birim kesirlerin büyüklük küçüklük ilişkilerini çözümleyebilme', 'Birim kesirleri karşılaştır'),
    o('MAT.4.1.9', 'Paydaları eşit olan kesirlerin büyüklük küçüklük ilişkilerini çözümleyebilme', 'Paydaları eşit kesirler'),
    o('MAT.4.1.10', 'Bir çokluğun basit kesir kadarını ve bir basit kesir kadarı verilen çokluğun tamamını çözümleyebilme', 'Bir çokluğun kesri'),
    o('MAT.4.1.11', 'Paydaları eşit kesirlerle toplama ve çıkarma işlemini yapılandırabilme', 'Kesirlerle işlem'),
    o('MAT.4.1.12', 'Paydaları eşit kesirlerle toplama ve çıkarma işlemi gerektiren günlük yaşam problemlerine çözüm geliştirebilme', 'Kesir problemleri'),
    o('MAT.4.1.13', 'Uzunluk ve kütle birimlerinin kendi içerisindeki dönüşümlerini yorumlayabilme', 'Birim dönüştürme'),
  ]),
  t(4, 3, 'islemlerden-cebirsel-dusunmeye', 'İşlemlerden Cebirsel Düşünmeye', 'operations', ['Zihinden İşlem', 'Dört Basamaklı Sayılarla İşlem', 'Kısa Yoldan Çarpma ve Bölme', 'Dört İşlem Problemleri', 'Eşitlik'], [
    o('MAT.4.2.1', 'Toplama ve çıkarma işlemlerini zihinden yaparak çözümleyebilme', 'Zihinden toplama-çıkarma'),
    o('MAT.4.2.2', 'En çok dört basamaklı sayılarla toplama ve çıkarma işlemlerini yapılandırabilme', 'Toplama ve çıkarma'),
    o('MAT.4.2.3', 'Çarpma ve bölme işlemlerinin sonucunu tahmin edebilme', 'Çarpma-bölme tahmini'),
    o('MAT.4.2.4', 'Zihinden çözümlenen çarpma ve bölme işlemleri ile bu işlemlerin kısa yollarını yapılandırabilme', 'Kısa yoldan işlem'),
    o('MAT.4.2.5', 'Çarpma ve bölme işlemlerini çözümleyebilme', 'Çarpma ve bölme'),
    o('MAT.4.2.6', 'Dört işlem içeren yönergeler oluşturarak süreci yorumlayabilme', 'İşlem yönergeleri'),
    o('MAT.4.2.7', 'Dört işlem gerektiren problemleri çözebilme', 'Problemler'),
    o('MAT.4.2.8', 'Dört işlem gerektiren problem durumlarını yapılandırabilme', 'Problem kur'),
    o('MAT.4.2.9', 'Dört işlem bağlamında eşitliğin farklı anlamlarını yorumlayabilme', 'Eşitlik'),
  ]),
  t(4, 4, 'nesnelerin-geometrisi-1', 'Nesnelerin Geometrisi (1)', 'geometry', ['Cisimlerin Açınımları', 'Geometrik Şekiller', 'Çevre Uzunluğu', 'Alan Tahmini'], [
    o('MAT.4.3.1', 'Geometrik cisimlerin açınımlarını yapılandırabilme', 'Açınımlar'),
    o('MAT.4.3.2', 'Geometrik şekilleri kenar ve köşelerine göre yorumlayabilme', 'Kenar ve köşe'),
    o('MAT.4.3.3', 'Geometrik şekillerin çevre uzunluğunu ölçmede matematiksel araç ve teknolojiden yararlanabilme', 'Çevre uzunluğu'),
    o('MAT.4.3.4', 'Standart olmayan ölçü birimleri cinsinden şekillerin alanlarını tahmin edebilme', 'Alan tahmini'),
  ]),
  t(4, 5, 'nesnelerin-geometrisi-2', 'Nesnelerin Geometrisi (2)', 'geometry', ['Açı', 'Açı Ölçümü', 'Dar ve Geniş Açı'], [
    o('MAT.4.3.5', 'Günlük yaşamdan örneklerle açıyı bir dönme miktarı olarak yorumlayabilme', 'Açı ve dönme'),
    o('MAT.4.3.6', 'Açı ölçümüne ilişkin standart ölçme araçlarının gerekliliğini değerlendirebilme', 'Açı ölçme'),
    o('MAT.4.3.7', 'Dik açıyı referans alarak açıları dar ve geniş olarak sınıflandırabilme', 'Dar, dik, geniş'),
  ]),
  t(4, 6, 'nesnelerin-geometrisi-3', 'Nesnelerin Geometrisi (3)', 'transform', ['Doğruya Göre Simetri', 'Geometrik Şekil ve Yapı'], [
    o('MAT.4.3.8', 'Geometrik nesneler ve şekiller üzerinden doğruya göre simetriyi yorumlayabilme', 'Doğruya göre simetri'),
    o('MAT.4.3.9', 'Bir şeklin doğruya göre simetrisini yapılandırabilme', 'Simetriyi çiz'),
    o('MAT.4.3.10', 'Geometrik şekillere dayalı bir yapı oluşturabilmek için kodlama stratejilerini yapılandırabilme', 'Kodlama ile yapı'),
  ]),
  t(4, 7, 'olasilik-ve-veri', 'Olayların Olasılığı ve Veriye Dayalı Araştırma', 'probability', ['Olasılık', 'Veriyle Çalışma ve Veriye Dayalı Karar Verme'], [
    o('MAT.4.4.1', 'Günlük yaşamdan herhangi bir olayın olasılığını “imkânsız, olabilir, kesin” olarak belirleyebilme', 'İmkânsız, olabilir, kesin'),
    o('MAT.4.4.2', 'Kategorik veriye ve sayma ile elde edilen nicel veriye dayalı en çok iki veri grubu ile çalışabilme ve veriye dayalı karar verebilme', 'Veri ve grafik'),
  ]),

  // ───────────────────────────── 5. SINIF ─────────────────────────────
  t(5, 1, 'geometrik-sekiller', 'Geometrik Şekiller', 'geometry', ['Temel Geometrik Çizimler ve İnşalar', 'Açı Ölçme', 'Çokgenler', 'Çember'], [
    o('MAT.5.3.1', 'Temel geometrik çizimler için matematiksel araç ve teknolojiden yararlanabilme', 'Nokta, doğru, ışın'),
    o('MAT.5.3.2', 'Temel geometrik çizimlere dayalı deneyimlerini yansıtabilme', 'Paralel ve dik doğrular'),
    o('MAT.5.3.3', 'Açıları ölçmek için matematiksel araç ve teknolojiden yararlanabilme', 'Açı ölçme'),
    o('MAT.5.3.4', 'Düzlemde iki veya üç doğrunun birbirine göre durumuna bağlı olarak oluşabilecek açılara dair çıkarım yapabilme', 'Komşu ve ters açılar'),
    o('MAT.5.3.5', 'Çokgenleri düzlemde ardışık olarak kesişen doğruların oluşturduğu kapalı şekiller olarak yorumlayabilme', 'Çokgenler'),
    o('MAT.5.3.6', 'Çokgenlerin özellikleri ile ilgili edindiği deneyimleri yansıtabilme', 'Çokgenlerin özellikleri'),
    o('MAT.5.3.7', 'Matematiksel araç ve teknoloji yardımıyla düzlemde iki noktada kesişen çember çiftinin merkezleri ve kesişim noktalarından biri ile inşa edilen üçgenlerin kenar özelliklerine yönelik çıkarım yapabilme', 'Çember ve üçgen'),
  ]),
  t(5, 2, 'sayilar-ve-nicelikler-1', 'Sayılar ve Nicelikler (1)', 'numbers', ['Çok Basamaklı Sayıları Okuma ve Yazma', 'Basamak Değerleri', 'Doğal Sayılarla Problem Çözme'], [
    o('MAT.5.1.1', 'Altı basamaklı sayıları okuma ve yazmayı daha çok basamaklı sayılara genelleyebilme', 'Çok basamaklı sayılar'),
    o('MAT.5.1.2', 'Doğal sayılar ve işlemler içeren gerçek yaşam problemlerini çözebilme', 'Doğal sayı problemleri'),
  ]),
  t(5, 3, 'geometrik-nicelikler', 'Geometrik Nicelikler', 'measure', ['Dikdörtgenin Çevre Uzunluğu ve Alanı'], [
    o('MAT.5.4.1', 'Kenar uzunlukları doğal sayı olan bir dikdörtgenin çevre uzunluğu verildiğinde kenar uzunluklarını yorumlayabilme', 'Çevreden kenarlara'),
    o('MAT.5.4.2', 'Birim karelerden yola çıkarak dikdörtgenin alanını değerlendirebilme', 'Dikdörtgenin alanı'),
    o('MAT.5.4.3', 'Kenar uzunlukları doğal sayı olan bir dikdörtgenin alanının ölçüsü verildiğinde çevre uzunluğunu, çevre uzunluğu verildiğinde alanını yorumlayabilme', 'Alan ve çevre ilişkisi'),
    o('MAT.5.4.4', 'Dikdörtgenin çevre uzunluğu ve alanı ile ilgili problemleri çözebilme', 'Alan-çevre problemleri'),
  ]),
  t(5, 4, 'sayilar-ve-nicelikler-2', 'Sayılar ve Nicelikler (2)', 'numbers', ['Kesirlerin Farklı Gösterimleri', 'Kesirleri Karşılaştırma'], [
    o('MAT.5.1.3', 'Gerçek yaşam durumlarına karşılık gelen kesirleri farklı biçimlerde temsil edebilme', 'Kesir gösterimleri'),
    o('MAT.5.1.4', 'Farklı gösterimlerle ifade edilen kesirlerin karşılaştırılmasına yönelik çıkarım yapabilme', 'Kesirleri karşılaştır'),
  ]),
  t(5, 5, 'istatistiksel-arastirma-sureci', 'İstatistiksel Araştırma Süreci', 'data', ['Kategorik Veri Dağılımları'], [
    o('MAT.5.5.1', 'Kategorik veri ile çalışabilme ve veriye dayalı karar verebilme', 'Veri ve grafik'),
    o('MAT.5.5.2', 'Başkaları tarafından oluşturulan kategorik veriye dayalı istatistiksel sonuç veya yorumları tartışabilme', 'Grafik yorumlama'),
  ]),
  t(5, 6, 'islemlerle-cebirsel-dusunme', 'İşlemlerle Cebirsel Düşünme', 'algebra', ['Eşitliğin Korunumu', 'İşlem Özellikleri', 'İşlem Önceliği', 'Örüntüler', 'Algoritma'], [
    o('MAT.5.2.1', 'Eşitliğin korunumuna ve işlem özelliklerine yönelik çıkarım yapabilme', 'Eşitlik ve özellikler'),
    o('MAT.5.2.2', 'Karşılaştığı günlük hayat ya da matematiksel durumlarda işlem önceliğini yorumlayabilme', 'İşlem önceliği'),
    o('MAT.5.2.3', 'Sayı ve şekil örüntülerinin kuralına ilişkin muhakeme yapabilme', 'Örüntü kuralı'),
    o('MAT.5.2.4', 'Temel aritmetik işlem içeren durumlardaki algoritmaları yorumlayabilme', 'Algoritmalar'),
  ]),
  t(5, 7, 'veriden-olasiliga', 'Veriden Olasılığa', 'probability', ['Öznel Olasılık'], [
    o('MAT.5.6.1', 'Herhangi bir olayın olasılığının 0 (imkânsız) ile 1 (kesin) arasında (0 ve 1 dâhil) olduğunu (olasılık spektrumu) yorumlayabilme', 'Olasılık çizelgesi'),
    o('MAT.5.6.2', 'Olayları az ya da çok olasılıklı şeklinde yapılandırabilme', 'Az ya da çok olası'),
  ]),

  // ───────────────────────────── 6. SINIF ─────────────────────────────
  t(6, 1, 'sayilar-ve-nicelikler-1', 'Sayılar ve Nicelikler (1)', 'numbers', ['Çarpanlar ve Katlar', 'Bölünebilme Kuralları', 'Asal Sayılar ve Asal Çarpanlar', 'Ortak Kat ve Ortak Bölen'], [
    o('MAT.6.1.1', 'Karşılaştığı problem durumlarında bir doğal sayının çarpan ve katlarına yönelik muhakeme yapabilme', 'Çarpanlar ve katlar'),
    o('MAT.6.1.2', 'Bir doğal sayının 2, 3, 4, 5, 6, 9 ve 10 ile tam bölünebilme kriterlerine ilişkin çıkarım yapabilme', 'Bölünebilme'),
    o('MAT.6.1.3', 'Bir doğal sayının asal olma durumunu ve asal çarpanlarını çözümleyebilme', 'Asal sayılar'),
    o('MAT.6.1.4', 'Günlük hayat problemleri ya da matematiksel durumlar üzerinden ortak kat ve ortak böleni yorumlayabilme', 'EBOB ve EKOK'),
  ]),
  t(6, 2, 'veriden-olasiliga', 'Veriden Olasılığa', 'probability', ['Deneysel Olasılık'], [
    o('MAT.6.6.1', 'Bir olayın olasılığını gözleme dayalı tahmin edebilme', 'Deneysel olasılık'),
  ]),
  t(6, 3, 'sayilar-ve-nicelikler-2', 'Sayılar ve Nicelikler (2)', 'numbers', ['Ondalık Gösterimler', 'Kesir-Bölme İlişkisi', 'Kesir, Ondalık ve Yüzde Problemleri', 'Uzunluk Ölçme'], [
    o('MAT.6.1.5', 'Gerçek yaşam durumlarında ondalık gösterimlerin basamak değerlerini kesirlerden yararlanarak yorumlayabilme', 'Ondalık gösterim'),
    o('MAT.6.1.6', 'Kesir ve bölme işlemi arasındaki ilişkiye yönelik tümevarımsal akıl yürütebilme', 'Kesir ve bölme'),
    o('MAT.6.1.7', 'Gerçek yaşam durumlarında karşılaşılan kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem gerektiren problemleri çözebilme', 'Kesir, ondalık, yüzde'),
    o('MAT.6.1.8', 'Karşılaştığı günlük hayat ya da matematiksel durumlarda standart uzunluk ölçme birimlerini değerlendirebilme', 'Uzunluk birimleri'),
  ]),
  t(6, 4, 'istatistiksel-arastirma-sureci', 'İstatistiksel Araştırma Süreci', 'data', ['Kategorik ve Nicel (Kesikli) Veri Dağılımları'], [
    o('MAT.6.5.1', 'Kategorik veya nicel (kesikli) veri ile çalışabilme ve veriye dayalı karar verebilme', 'Veri ve ortalama'),
    o('MAT.6.5.2', 'Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumları tartışabilme', 'Grafik yorumlama'),
  ]),
  t(6, 5, 'geometrik-sekiller', 'Geometrik Şekiller', 'geometry', ['Paralel Doğrular ve Kesenle Oluşan Açılar', 'Dörtgenler', 'Üçgen ve Dörtgenlerde Açılar'], [
    o('MAT.6.3.1', 'Düzlemde iki paralel doğru ve bir kesen ile oluşan açıları sınıflandırabilme', 'Paralel doğrular ve açılar'),
    o('MAT.6.3.2', 'Matematiksel araç ve teknolojiden yararlanarak iki paralel doğrunun iki kesenle oluşturduğu şekillerin özelliklerine dair çıkarım yapabilme', 'Yamuk ve paralelkenar'),
    o('MAT.6.3.3', 'Matematiksel araç ve teknolojiden yararlanarak birbirlerini ortalayan doğru parçalarını köşegen kabul eden dörtgenlere yönelik çıkarım yapabilme', 'Köşegenler'),
    o('MAT.6.3.4', 'Üçgen, yamuk, paralelkenar, eşkenar dörtgen, dikdörtgen ve karenin açıları ile ilgili problemleri çözebilme', 'Açı problemleri'),
  ]),
  t(6, 6, 'islemlerle-cebirsel-dusunme-ve-degisimler', 'İşlemlerle Cebirsel Düşünme ve Değişimler', 'algebra', ['Bilinmeyen Nicelikler', 'Örüntü', 'Cebirsel İfadeler ve Algoritma'], [
    o('MAT.6.2.1', 'Gerçek yaşam durumlarında bilinen niceliklerden bilinmeyen niceliklere ilişkin muhakeme yapabilme', 'Bilinmeyeni bul'),
    o('MAT.6.2.2', 'Sayı ve şekil örüntülerini yorumlayabilme', 'Örüntü ve cebir'),
    o('MAT.6.2.3', 'Cebirsel ifadeler içeren durumlardaki algoritmaları yorumlayabilme', 'Cebirsel ifadeler'),
  ]),
  t(6, 7, 'geometrik-nicelikler', 'Geometrik Nicelikler', 'measure', ['Uzunluk ve Alan Birimleri', 'Paralelkenar ve Üçgenin Alanı', 'Çemberin Uzunluğu', 'Merkez Açı ve Yay'], [
    o('MAT.6.4.1', 'Uzunluk ve alan ölçme birimleri arasındaki ilişkilerle ilgili analojik akıl yürütebilme', 'Alan birimleri'),
    o('MAT.6.4.2', 'Dikdörtgenin alan bağıntısına yönelik deneyimlerini paralelkenar ve üçgenin alan bağıntılarına yansıtabilme', 'Paralelkenar ve üçgen alanı'),
    o('MAT.6.4.3', 'Geometrik şekillerin alanları ile modellenen gerçek yaşam durumlarına yönelik problem çözebilme', 'Alan problemleri'),
    o('MAT.6.4.4', 'Çemberin uzunluğu ile çap uzunluğu arasındaki ilişkiye yönelik çıkarım yapabilme', 'Pi sayısı'),
    o('MAT.6.4.5', 'Çap veya yarıçap uzunluğu verilen bir çemberin uzunluğu ile ilgili problemleri çözebilme', 'Çemberin uzunluğu'),
    o('MAT.6.4.6', 'Çemberde merkez açının ölçüsü ile gördüğü yayın uzunluğu arasındaki ilişkiye dair tümevarımsal akıl yürütebilme', 'Merkez açı ve yay'),
  ]),

  // ───────────────────────────── 7. SINIF ─────────────────────────────
  t(7, 1, 'sayilar-ve-nicelikler-1', 'Sayılar ve Nicelikler (1)', 'numbers', ['Tam Sayılar', 'Rasyonel Sayılar ve Temsilleri', 'Karşılaştırma ve Sıralama', 'Rasyonel Sayılarla İşlemler'], [
    o('MAT.7.1.1', 'Gerçek yaşam ya da matematiksel durumlarda doğal sayı, tam sayı ve rasyonel sayıları yorumlayabilme', 'Tam ve rasyonel sayılar'),
    o('MAT.7.1.2', 'Gerçek yaşam durumlarında rasyonel sayıların ondalık gösterimlerini yansıtabilme', 'Ondalık gösterim'),
    o('MAT.7.1.3', 'Rasyonel sayıların karşılaştırma ve sıralama ilişkilerini yorumlayabilme', 'Karşılaştır ve sırala'),
    o('MAT.7.1.4', 'Rasyonel sayılar ve işlemler içeren gerçek yaşam problemlerini çözebilme', 'Rasyonel sayılarla işlem'),
  ]),
  t(7, 2, 'geometrik-nicelikler-1', 'Geometrik Nicelikler (1)', 'measure', ['Cisimlerin Farklı Yönlerden Görünümleri', 'Prizmanın Yüzey Alanı', 'Prizmanın Hacmi', 'Hacim Birimleri'], [
    o('MAT.7.4.1', 'Eş küplerle oluşturulan yapılar ile görünümleri arasındaki ilişkiyi çözümleyebilme', 'Küp yapılar ve görünüm'),
    o('MAT.7.4.2', 'Dikdörtgenler prizmasının yüzey alanını yorumlayabilme', 'Yüzey alanı'),
    o('MAT.7.4.3', 'Dikdörtgenler prizmasının hacmini eş nesneler aracılığıyla yorumlayabilme', 'Birim küplerle hacim'),
    o('MAT.7.4.4', 'Dikdörtgenler prizmasının hacim bağıntısını değerlendirebilme', 'Hacim bağıntısı'),
    o('MAT.7.4.5', 'Hacim ölçme birimleri arasındaki ilişkileri değerlendirebilme', 'Hacim birimleri'),
    o('MAT.7.4.6', 'Günlük hayat durumlarında dikdörtgenler prizmaları ile modellenen cisimlerin yüzey alanı ve hacmine yönelik problem çözebilme', 'Prizma problemleri'),
  ]),
  t(7, 3, 'istatistiksel-arastirma-sureci', 'İstatistiksel Araştırma Süreci', 'data', ['Kategorik ve Nicel (Sürekli) Veri Dağılımları'], [
    o('MAT.7.6.1', 'Kategorik veya nicel (sürekli) veri ile çalışabilme ve veriye dayalı karar verebilme', 'Veri ve merkezi eğilim'),
    o('MAT.7.6.2', 'Başkaları tarafından oluşturulan kategorik veya nicel (sürekli) veriye dayalı istatistiksel sonuç veya yorumları tartışabilme', 'Grafik yorumlama'),
  ]),
  t(7, 4, 'donusum', 'Dönüşüm', 'transform', ['Yansıma Dönüşümü', 'Orta Dikme ve Açıortay'], [
    o('MAT.7.3.1', 'Şekillerin yansıma dönüşümü altındaki görüntülerinin oluşturulmasına dair çıkarım yapabilme', 'Yansıma'),
    o('MAT.7.3.2', 'Yansıma dönüşümündeki deneyimlerini orta dikme ve açıortay inşasına yansıtabilme', 'Orta dikme ve açıortay'),
  ]),
  t(7, 5, 'geometrik-sekiller', 'Geometrik Şekiller', 'geometry', ['Üçgende Kenarortay, Açıortay, Yükseklik'], [
    o('MAT.7.5.1', 'Matematiksel araç ve teknolojiden yararlanarak üçgende kenarortayı, açıortayı ve yüksekliği çözümleyebilme', 'Kenarortay, açıortay, yükseklik'),
    o('MAT.7.5.2', 'Orta dikme inşasına yönelik deneyimlerini üçgende kenarortay inşasına yansıtabilme', 'Kenarortay inşası'),
  ]),
  t(7, 6, 'sayilar-ve-nicelikler-2', 'Sayılar ve Nicelikler (2)', 'numbers', ['Oran', 'Orantılı Durumlar', 'Doğru Orantı Problemleri'], [
    o('MAT.7.1.5', 'Gerçek yaşam durumları üzerinden oran ilişkileri hakkında muhakeme yapabilme', 'Oran'),
    o('MAT.7.1.6', 'Gerçek yaşam durumları üzerinden orantılı durumları yorumlayabilme', 'Orantı'),
    o('MAT.7.1.7', 'Gerçek yaşam durumları üzerinden doğru orantılı durumlara ilişkin problemleri çözebilme', 'Doğru orantı'),
  ]),
  t(7, 7, 'veriden-olasiliga', 'Veriden Olasılığa', 'probability', ['Teorik Olasılık'], [
    o('MAT.7.7.1', 'Bir olayın ve tümleyeninin olasılığına ilişkin tümevarımsal akıl yürütebilme', 'Olay ve tümleyeni'),
    o('MAT.7.7.2', 'Aynı deneye ait olayların eşit olasılıklı olma durumlarını değerlendirebilme', 'Eş olasılık'),
    o('MAT.7.7.3', 'Olayları ayrık olma ve ayrık olmama durumlarına göre sınıflandırabilme', 'Ayrık olaylar'),
  ]),
  t(7, 8, 'islemlerle-cebirsel-dusunme-ve-degisimler', 'İşlemlerle Cebirsel Düşünme ve Değişimler', 'algebra', ['Cebirsel İfadelerle İşlemler', 'Denklemler ve Eşitsizlikler', 'Sayılar ve İspat', 'Algoritma'], [
    o('MAT.7.2.1', 'Gerçek yaşam durumları ya da matematiksel durumlar üzerinden cebirsel ifadelerle toplama, çıkarma ve bir rasyonel sayıyla çarpma işlemlerini yorumlayabilme', 'Cebirsel ifadeler'),
    o('MAT.7.2.2', 'Birinci dereceden bir bilinmeyenli denklem ve birinci dereceden bir bilinmeyenli eşitsizlik içeren gerçek yaşam problemlerini çözebilme', 'Denklem ve eşitsizlik'),
    o('MAT.7.2.3', 'Sayılar ve özelliklerini içeren ispatlara ilişkin matematiksel muhakeme yapabilme', 'Sayılarla ispat'),
    o('MAT.7.2.4', 'Temel aritmetik ve cebirsel ifadelerle işlem içeren durumlardaki süreci algoritma ifade yöntemlerini kullanarak yapılandırabilme', 'Algoritma'),
  ]),
  t(7, 9, 'geometrik-nicelikler-2', 'Geometrik Nicelikler (2)', 'measure', ['Dairenin Alanı', 'Daire Dilimi', 'Eşkenar Dörtgen ve Yamuğun Alanı'], [
    o('MAT.7.4.7', 'Dikdörtgenin, paralelkenarın alanına ve çemberin uzunluğuna ilişkin deneyimlerini dairenin alan bağıntısına yansıtabilme', 'Dairenin alanı'),
    o('MAT.7.4.8', 'Çemberde merkez açı ve gördüğü yay uzunluğu arasındaki ilişkiden yola çıkarak daire ve daire diliminin alanları arasındaki ilişkiye yönelik analojik akıl yürütebilme', 'Daire dilimi'),
    o('MAT.7.4.9', 'Eşkenar dörtgen ve yamuğun alan bağıntılarına dair çıkarım yapabilme', 'Eşkenar dörtgen ve yamuk'),
    o('MAT.7.4.10', 'Günlük hayat durumlarında daire, daire dilimi, eşkenar dörtgen ve yamuğun alanına ilişkin problem çözebilme', 'Alan problemleri'),
  ]),

  // ───────────────────────────── 8. SINIF ─────────────────────────────
  t(8, 1, 'sayilar-ve-nicelikler', 'Sayılar ve Nicelikler', 'numbers', ['Üslü İfadeler', 'Kareköklü İfadeler', 'İrrasyonel Sayılar', 'Gerçek Sayılar ve Aralıklar'], [
    o('MAT.8.1.1', 'Farklı bağlamlardaki üslü ifadelere, özelliklerine ve üslü ifadelerle yapılan işlemlere ilişkin çıkarım yapabilme', 'Üslü ifadeler'),
    o('MAT.8.1.2', 'Karşılaştığı problem durumlarında kareköklü ifadeler ile ilgili muhakeme yapabilme', 'Kareköklü ifadeler'),
    o('MAT.8.1.3', 'Sayıların rasyonel ya da irrasyonelliğini değerlendirebilme', 'Rasyonel mi, irrasyonel mi?'),
    o('MAT.8.1.4', 'Gerçek sayıları ve aralıklarını sayı doğrusunda yorumlayabilme', 'Gerçek sayılar ve aralıklar'),
  ]),
  t(8, 2, 'geometrik-sekiller', 'Geometrik Şekiller', 'geometry', ['Üçgende Açı-Kenar İlişkisi', 'Üçgen Eşitsizliği', 'Eşlik ve Benzerlik', 'Pisagor Bağıntısı'], [
    o('MAT.8.3.1', 'Matematiksel araç ve teknoloji yardımıyla üçgenin kenarları ve açıları arasındaki ilişkiyi yorumlayabilme', 'Açı-kenar ilişkisi'),
    o('MAT.8.3.2', 'Matematiksel araç ve teknoloji yardımıyla üçgenin kenar uzunlukları arasındaki ilişkiye yönelik çıkarım yapabilme', 'Üçgen eşitsizliği'),
    o('MAT.8.3.3', 'Bir üçgene eş üçgen oluşturmak için üçgenle ilgili bilinmesi yeterli olan elemanlara dair çıkarım yapabilme', 'Eş üçgenler'),
    o('MAT.8.3.4', 'Bir üçgene benzer üçgen oluşturmak için üçgenle ilgili bilinmesi yeterli olan elemanlara dair çıkarım yapabilme', 'Benzer üçgenler'),
    o('MAT.8.3.5', 'Kenar uzunlukları a²+b²=c² eşitliğini sağlayan üçgenleri oluşturarak dik üçgen olduklarını; dik üçgenlerde dik kenar uzunluklarının kareleri toplamının hipotenüs uzunluğunun karesine eşit olduğunu yorumlayabilme', 'Pisagor bağıntısı'),
    o('MAT.8.3.6', 'Üçgende açı-kenar ilişkisi, üçgen eşitsizliği ve Pisagor bağıntısını içeren problemleri çözebilme', 'Üçgen problemleri'),
  ]),
  t(8, 3, 'veriden-olasiliga', 'Veriden Olasılığa', 'probability', ['Öznel, Deneysel ve Teorik Olasılık İlişkisi'], [
    o('MAT.8.7.1', 'Gerçek yaşamda karşılaşabileceği bir olayın olasılığına ilişkin farklı olasılık yaklaşımlarından (öznel, deneysel, teorik) uygun olanı belirleyerek karar verebilme', 'Olasılık yaklaşımları'),
  ]),
  t(8, 4, 'cebirsel-dusunme-ve-degisimler', 'Cebirsel Düşünme ve Değişimler', 'algebra', ['Dik Koordinat Sistemi', 'Doğrusal İlişkiler ve Fonksiyonlar', 'Doğrusal Fonksiyonların Grafikleri', 'Algoritma'], [
    o('MAT.8.2.1', 'Gerçek yaşam durumları üzerinden dik koordinat sistemini çözümleyebilme', 'Koordinat sistemi'),
    o('MAT.8.2.2', 'Gerçek yaşam durumlarındaki doğrusal ilişkileri doğrusal fonksiyonlarla temsil edebilme', 'Doğrusal fonksiyonlar'),
    o('MAT.8.2.3', 'Dik koordinat sisteminde iki doğrusal fonksiyonun birbirine göre durumuna ilişkin çıkarım yapabilme', 'Doğruların durumu'),
    o('MAT.8.2.4', 'Doğrusal fonksiyonlara ilişkin problemlerin çözümlerini algoritma ifade yöntemlerini kullanarak yapılandırabilme', 'Fonksiyon problemleri'),
  ]),
  t(8, 5, 'geometrik-nicelikler', 'Geometrik Nicelikler', 'measure', ['Dik Prizma, Piramit, Silindir ve Koni Açınımları', 'Silindirin Yüzey Alanı ve Hacmi'], [
    o('MAT.8.4.1', 'Dik prizmalar, dikdörtgen dik piramit, dik dairesel silindir ve dik dairesel koninin yüzey açınımlarını çözümleyebilme', 'Cisimlerin açınımları'),
    o('MAT.8.4.2', 'Dik dairesel silindirin yüzey açınımına ilişkin deneyimlerini dik dairesel silindirin yüzey alanına yansıtabilme', 'Silindirin yüzey alanı'),
    o('MAT.8.4.3', 'Dairenin alan bağıntısının oluşturulma sürecinden hareketle dik dairesel silindirin hacim bağıntısına yönelik analojik akıl yürütebilme', 'Silindirin hacmi'),
  ]),
  t(8, 6, 'istatistiksel-arastirma-sureci', 'İstatistiksel Araştırma Süreci', 'data', ['Kategorik ve Nicel (Kesikli-Sürekli) Veri Dağılımları'], [
    o('MAT.8.6.1', 'Kategorik veya nicel (kesikli-sürekli) veri ile çalışabilme ve veriye dayalı karar verebilme', 'Veri analizi'),
    o('MAT.8.6.2', 'Başkaları tarafından oluşturulan kategorik veya nicel (kesikli-sürekli) veriye dayalı istatistiksel sonuç veya yorumları tartışabilme', 'Grafik yorumlama'),
  ]),
  t(8, 7, 'donusum', 'Dönüşüm', 'transform', ['Dik Koordinat Sisteminde Öteleme', 'Eksenlere Göre Yansıma'], [
    o('MAT.8.5.1', 'Matematiksel araç ve teknoloji yardımıyla öteleme dönüşümünü çözümleyebilme', 'Öteleme'),
    o('MAT.8.5.2', 'Dik koordinat sisteminde geometrik şekillere ait noktaların apsis ve ordinatlarının öteleme dönüşümündeki değişimlerine ve eksenlere göre yansıma dönüşümündeki değişimlerine ilişkin çıkarım yapabilme', 'Koordinatlarda dönüşüm'),
    o('MAT.8.5.3', 'Öteleme ve yansıma dönüşümlerini içeren problemleri çözebilme', 'Dönüşüm problemleri'),
  ]),
]

export const grades: Grade[] = [1, 2, 3, 4, 5, 6, 7, 8]

export const gradeInfo: Record<Grade, { label: string; level: 'ilkokul' | 'ortaokul'; color: string; soft: string; ink: string; emoji: string }> = {
  1: { label: '1. Sınıf', level: 'ilkokul', color: '#f97316', soft: '#fff1e6', ink: '#9a3412', emoji: '🐣' },
  2: { label: '2. Sınıf', level: 'ilkokul', color: '#eab308', soft: '#fef9db', ink: '#854d0e', emoji: '🐝' },
  3: { label: '3. Sınıf', level: 'ilkokul', color: '#22c55e', soft: '#e8f8ee', ink: '#166534', emoji: '🐢' },
  4: { label: '4. Sınıf', level: 'ilkokul', color: '#14b8a6', soft: '#e3f6f4', ink: '#115e59', emoji: '🐬' },
  5: { label: '5. Sınıf', level: 'ortaokul', color: '#3b82f6', soft: '#e8f0fe', ink: '#1e40af', emoji: '🚀' },
  6: { label: '6. Sınıf', level: 'ortaokul', color: '#6366f1', soft: '#ecedfd', ink: '#3730a3', emoji: '🧭' },
  7: { label: '7. Sınıf', level: 'ortaokul', color: '#a855f7', soft: '#f4ebfe', ink: '#6b21a8', emoji: '🔭' },
  8: { label: '8. Sınıf', level: 'ortaokul', color: '#ec4899', soft: '#fdeaf4', ink: '#9d174d', emoji: '🏆' },
}

export const themesByGrade = (grade: Grade) =>
  themes.filter((th) => th.grade === grade).sort((a, b) => a.order - b.order)

export const findTheme = (grade: Grade, slug: string) => themes.find((th) => th.grade === grade && th.slug === slug)

export const allOutcomes = themes.flatMap((th) => th.outcomes.map((oc) => ({ ...oc, theme: th })))

export const outcomeByCode = new Map(allOutcomes.map((oc) => [oc.code, oc]))

export const isGrade = (n: number): n is Grade => Number.isInteger(n) && n >= 1 && n <= 8
