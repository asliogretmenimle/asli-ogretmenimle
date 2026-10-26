import type { InteractionMeta } from '../types'

export const meta: InteractionMeta = {
  id: 'oruntu-tasarimcisi',
  no: 34,
  name: 'Sayı Örüntüsü Tasarımcısı',
  description: 'Kendi sayı örüntünü kur, kuralını gizle ve çözdür.',
  emoji: '🎨',
  color: '#2563eb',
  category: 'sayilar',
  grades: [2, 3, 4, 5, 6, 7, 8],
  ready: true,
  launch: 'Robot arkadaşımız Bilge örüntü çözmeye bayılıyor. Ona “2, 4, …” diye başlayan bir örüntü gösterirsen sıradaki sayıyı bulabilir mi? Belki 6 der, belki 8! Bugün kendi örüntülerini tasarlayıp Bilge’ye ve arkadaşlarına çözdüreceksin.',
  reflect: 'Bir örüntünün kuralını kesin olarak bilmek için kaç terim görmek gerekir? Bilge neden bazen yanıldı? Bir örnekle açıkla.',
  bigIdea: 'Bir örüntü, terimleri üreten bir kuralla belirlenir; birkaç terim birden çok kurala uyabilir (2, 4, 6… ya da 2, 4, 8…). Kural “her adımda ne olur” (yinelemeli) ya da “n. terim ne” (açık, cebirsel) biçiminde yazılabilir; açık kural uzak terimleri hesaplamayı sağlar ve genellemenin temelidir.',
  skills: {
    2: 'Artan ve azalan ritmik sayma örüntüleri tasarlama',
    3: 'Toplamalı ve katlamalı örüntüler; aynı başlangıç, farklı kurallar',
    4: 'Sırayla ekle-çıkar örüntüleri; örüntüdeki değişimi genelleme',
    5: '“n. terim = 3 × n + 2” gibi kurallar; uzak terimi bulma',
    6: 'Örüntüyü cebirsel ifadeyle (4n − 1) yazma',
    7: 'Negatif terimli ve azalan örüntüler; cebirsel kural',
    8: 'Kare ve kuvvet örüntüleri (n² + 1, 3ⁿ)',
  },
  outcomes: ['MAT.2.1.4', 'MAT.2.1.5', 'MAT.3.1.4', 'MAT.3.1.7', 'MAT.4.1.4', 'MAT.4.1.5', 'MAT.5.2.3', 'MAT.6.2.2', 'MAT.7.2.1', 'MAT.8.1.1'],
}
