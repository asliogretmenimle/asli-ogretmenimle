/** Stüdyo: oturum, sürüm ve meta tipleri + yardımcılar */
import type { Grade, QuizActivity, Stage } from '../../data/types'
import { themesByGrade } from '../../data/curriculum'
import type { CmsEntry } from '../../cms/types'

export type StudioKind = 'game' | 'interaction' | 'manipulative' | 'test'
export type Category = 'sayilar' | 'kesirler' | 'geometri' | 'cebir-veri' | 'muhakeme'

export interface StudioMeta {
  title: string
  slug: string
  description: string
  emoji: string
  color: string
  grades: number[]
  howTo: string[]
  launch: string
  reflect: string
  bigIdea: string
  category: Category
  outcomes: string[]
  skills: { grade: number; text: string }[]
}

export interface QuizQ {
  prompt: string
  choices: string[]
  answer: number
  explain: string
}
export interface StudioQuiz {
  instructions: string
  stage: Stage
  level: number
  questions: QuizQ[]
}

export interface StudioVersion {
  html?: string | null
  quiz?: StudioQuiz | null
  meta: StudioMeta
  at: string
  note?: string
  prompt?: string
}

export interface StudioMessage {
  role: 'user' | 'assistant' | 'error'
  text: string
  at: string
  /** Bu mesajla oluşan sürümün indeksi */
  version?: number
  /** Eklenen görsel sayısı (görseller saklanmaz) */
  images?: number
  /** Devam eden üretimin iş kimliği */
  pending?: string
  /** Hata mesajında: tekrar denenecek istek */
  prompt?: string
}

export interface StudioSession {
  id: string
  title: string
  kind: StudioKind
  grade: number | null
  messages: StudioMessage[]
  versions: StudioVersion[]
  current: number
  entry_id: string | null
  updated_at: string
}

export interface StudioResult {
  reply: string
  kind: StudioKind
  meta: StudioMeta
  html: string | null
  edits: { find: string; replace: string }[] | null
  quiz: StudioQuiz | null
}

export const kindMeta: Record<StudioKind, { label: string; emoji: string; desc: string; tone: 'pink' | 'violet' | 'blue' | 'green' }> = {
  game: { label: 'Oyun', emoji: '🎮', desc: 'Turları, puanı ve bitişi olan matematik oyunu', tone: 'pink' },
  interaction: { label: 'Etkileşim', emoji: '✨', desc: 'Tek bir fikri keşfettiren kısa etkinlik', tone: 'violet' },
  manipulative: { label: 'Manipülatif', emoji: '🧩', desc: 'Akıllı tahtada serbest kullanılan dijital materyal', tone: 'blue' },
  test: { label: 'Test', emoji: '✅', desc: 'Açıklamalı, çoktan seçmeli sorular', tone: 'green' },
}

export const examplePrompts: Record<StudioKind, string[]> = {
  game: [
    'Kesirleri sayı doğrusuna yerleştiren bir hedef oyunu yap: kesir ne kadar doğru yere yakınsa o kadar puan.',
    'Çarpım tablosunu çalıştıran bir uzay oyunu: doğru cevapla roket yakıt toplasın, 8 tur sürsün.',
    '10’a tamamlama için balık tutma oyunu: oltaya toplamı 10 eden iki balığı takalım.',
  ],
  interaction: [
    'Dikdörtgenin kenarlarını sürükleyerek alan ve çevrenin nasıl değiştiğini keşfettiren bir etkileşim.',
    'Paydası farklı iki kesri, kesir şeritleriyle karşılaştırmayı keşfettiren bir etkinlik.',
    'Bir zarın 600 kez atılmasını simüle edip deneysel olasılığın teorik olasılığa yaklaştığını gösteren keşif.',
  ],
  manipulative: [
    'Akıllı tahta için sanal sayı boncuğu (rekenrek): 2 sıra, 20 boncuk, beşerli renkler.',
    'Sürüklenebilir ondalık blokları: bir bütün, onda bir ve yüzde bir parçalar; toplamı canlı göster.',
    'Kesir daireleri: 1’den 12’ye paydalar, parçaları sürükleyip üst üste koyarak karşılaştırma.',
  ],
  test: [
    '5. sınıf kesirlerle toplama ve çıkarma: 10 soruluk, kavram yanılgılarını yakalayan bir test.',
    'Tam sayılarla işlemler için LGS tarzı 8 soruluk test, her soruya kısa açıklama.',
    '3. sınıf saat okuma testi: yarım ve çeyrek saatler, 10 soru.',
  ],
}

export const suggestionChips = ['Daha renkli ve canlı yap', 'Zorluğu biraz artır', 'Mobilde düğmeleri büyüt', 'Sesli geri bildirim ekle', 'Yanlışta kademeli ipucu ver', 'Başlarken kısmını kısalt']

export function emptyMeta(grade?: number | null, outcome?: string | null): StudioMeta {
  return {
    title: '',
    slug: '',
    description: '',
    emoji: '🎲',
    color: '#d6457a',
    grades: grade ? [grade] : [],
    howTo: [],
    launch: '',
    reflect: '',
    bigIdea: '',
    category: 'sayilar',
    outcomes: outcome ? [outcome] : [],
    skills: [],
  }
}

const s = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const sa = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** Yayındaki bir kaydı Stüdyo'nun meta biçimine çevirir */
export function metaFromEntry(e: CmsEntry): StudioMeta {
  const d = e.data ?? {}
  const isTest = e.kind === 'activity'
  const slug = isTest ? e.ref.replace(/^g\d-/, '') : e.ref
  const grades = Array.isArray(d.grades)
    ? d.grades.map(Number)
    : typeof d.grades === 'string'
      ? rangeToGrades(d.grades)
      : e.grade
        ? [e.grade]
        : []
  const skillsObj = d.skills && typeof d.skills === 'object' && !Array.isArray(d.skills) ? (d.skills as Record<string, string>) : {}
  return {
    title: s(d.name, s(d.title)),
    slug,
    description: s(d.description),
    emoji: s(d.emoji, isTest ? '✅' : '🎲'),
    color: s(d.color, '#d6457a'),
    grades,
    howTo: sa(d.howTo),
    launch: isTest ? s(d.launch?.text) : s(d.launch),
    reflect: s(d.reflect),
    bigIdea: s(d.bigIdea),
    category: (s(d.category, 'sayilar') as Category) || 'sayilar',
    outcomes: sa(d.outcomes),
    skills: Object.entries(skillsObj).map(([g, text]) => ({ grade: Number(g), text: String(text) })),
  }
}

export function quizFromEntry(e: CmsEntry): StudioQuiz {
  const d = e.data ?? {}
  const text = (c: unknown) => (typeof c === 'string' ? c : s((c as { text?: string } | null)?.text))
  return {
    instructions: s(d.instructions, 'Doğru cevabı seç.'),
    stage: (s(d.stage, 'sembol') as Stage) || 'sembol',
    level: typeof d.level === 'number' ? d.level : 2,
    questions: (Array.isArray(d.questions) ? d.questions : []).map((q: Record<string, unknown>) => ({
      prompt: text(q.prompt),
      choices: (Array.isArray(q.choices) ? q.choices : []).map(text),
      answer: Number(q.answer) || 0,
      explain: s(q.explain),
    })),
  }
}

function rangeToGrades(r: string): number[] {
  const [a, b = a] = r.split(/[–-]/).map(Number)
  if (!a) return []
  return Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)
}

/** Kod parçalarını değiştirir; bulunamayanları döndürür */
export function applyEdits(html: string, edits: { find: string; replace: string }[]) {
  let out = html
  const failed: string[] = []
  for (const e of edits) {
    if (!e.find) continue
    const i = out.indexOf(e.find)
    if (i < 0) {
      failed.push(e.find)
      continue
    }
    out = out.slice(0, i) + e.replace + out.slice(i + e.find.length)
  }
  return { html: out, failed }
}

/** Önizleme ve yayın için QuizActivity */
export function buildQuizActivity(quiz: StudioQuiz, meta: StudioMeta, id: string, outcome?: string): QuizActivity {
  return {
    id,
    type: 'quiz',
    outcomes: [outcome || meta.outcomes[0] || ''],
    title: meta.title || 'Test',
    instructions: quiz.instructions || 'Doğru cevabı seç.',
    level: (Math.max(1, Math.min(3, quiz.level || 2)) as 1 | 2 | 3),
    stage: quiz.stage || 'sembol',
    launch: { text: meta.launch || '' },
    reflect: meta.reflect || '',
    questions: quiz.questions.map((q) => ({ prompt: q.prompt, choices: q.choices, answer: q.answer, explain: q.explain || undefined })),
  }
}

/** Bir sınıfın öğrenme çıktıları (seçim listeleri için) */
export function outcomeOptions(grade: number | null | undefined) {
  if (!grade || grade < 1 || grade > 8) return []
  return themesByGrade(grade as Grade).flatMap((t) => t.outcomes.map((o) => ({ value: o.code, label: `${o.code} · ${o.short}`, theme: t.title })))
}

/** Görseli küçültüp JPEG veri adresine çevirir (en uzun kenar 1600 px) */
export function resizeImage(file: File, max = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k)
      c.height = Math.round(img.height * k)
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('Görsel işlenemedi'))
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Görsel okunamadı'))
    }
    img.src = url
  })
}

export const nowIso = () => new Date().toISOString()
