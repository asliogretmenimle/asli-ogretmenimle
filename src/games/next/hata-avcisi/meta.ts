import type { GameMeta } from '../../meta'

export const meta: GameMeta = {
  id: 'hata-avcisi',
  name: 'Hata Avcısı',
  description: 'Kurgusal öğrencilerin çözümlerindeki hatayı bul, nedenini açıkla, düzelt.',
  emoji: '🐞',
  color: '#ea580c',
  grades: [2, 3, 4, 5, 6, 7, 8],
  nextGen: true,
  skills: {
    2: 'Eldeli toplama, onluk bozarak çıkarma, onluk-birlik (basamak değeri)',
    3: 'Üç basamaklı sayılarda elde ve bozma, sıfırın yer tutucu olması',
    4: 'Sıfırlı sayılarla çarpma, birim kesirleri ve paydaları eşit kesirleri karşılaştırma',
    5: 'İşlem önceliği, çevre ile alanı ayırt etme',
    6: 'Ondalık gösterimleri karşılaştırma ve işlem, yüzde problemleri',
    7: 'Tam sayılarda işaret kuralları, denklem çözme adımları, orantıda çarpımsal düşünme',
    8: 'Üslü ve kareköklü ifadeler, eğimin işareti, Pisagor bağıntısında hipotenüs',
  },
  howTo: [
    'Bir arkadaşının defterindeki çözümü adım adım oku.',
    'Hatalı adıma dokun; bütün adımlar doğruysa “Hata yok!” de.',
    'Hatanın nedenini seç, sonra adımı düzelt. Bazen birden çok doğru düzeltme vardır!',
    'Son turda iki farklı çözümü karşılaştır: Kim haklı?',
  ],
  launch: 'Öğretmenimiz defterleri kontrol ederken yardımcı arıyor! Arkadaşlarının çözümlerinde bazen gizli bir “böcek” var, bazen hiç yok. Hatayı bulmak yetmez: Neden yanlış olduğunu açıklayıp düzeltebilir misin?',
  reflect: 'Yakaladığın hatalardan birini seç. Bu hatayı yapan bir arkadaşına, kuralı söylemeden, neden yanlış olduğunu nasıl anlatırdın?',
  bigIdea: 'Hatalar öğrenmenin kaynağıdır. Bir çözümü değerlendirmek, onu üretmekten daha derin bir anlama ister: öğrenci her adımı gerekçelendirir, yanılgının arkasındaki düşünceyi adlandırır, tahmin ve ters işlemle sınar ve aynı probleme farklı doğru yolların olabileceğini görür.',
  strategies: ['Adım adım kontrol ettim', 'Tahminle sınadım', 'Ters işlemle kontrol ettim', 'Modelle/çizimle düşündüm', 'Basamak basamak toplama', '10’a tamamlama', 'Dağılma özelliği', 'Önce dağıtma', 'Önce iki tarafı bölme', 'Katını alma'],
  outcomes: [
    'MAT.2.1.2', 'MAT.2.2.1', 'MAT.2.2.2', 'MAT.2.2.3',
    'MAT.3.1.2', 'MAT.3.2.1', 'MAT.3.2.2',
    'MAT.4.2.4', 'MAT.4.2.5', 'MAT.4.1.8', 'MAT.4.1.9',
    'MAT.5.2.2', 'MAT.5.4.2', 'MAT.5.4.3', 'MAT.5.4.4',
    'MAT.6.1.5', 'MAT.6.1.7',
    'MAT.7.1.4', 'MAT.7.1.5', 'MAT.7.1.7', 'MAT.7.2.2',
    'MAT.8.1.1', 'MAT.8.1.2', 'MAT.8.2.2', 'MAT.8.3.5', 'MAT.8.3.6',
  ],
}
