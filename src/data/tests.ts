import type { Activity, Content, Grade, QuizQuestion } from './types'
import { outcomeByCode, themesByGrade } from './curriculum'
import { shuffle } from '../lib/random'

/**
 * Test Çöz sayfaları (/test, /test/7, /test/7/<tema>): sınıfın çoktan seçmeli etkinlik sorularından
 * karışık test oluşturur. "matematik test çöz", "7. sınıf matematik testi", "tam sayılar testi" gibi
 * aramaların hedef sayfası. Hem tarayıcı (pages/Tests.tsx) hem prerender bu modülü kullanır.
 */

export const TEST_PATH = '/test'
export const testPath = (g?: Grade, slug?: string) => (g ? (slug ? `${TEST_PATH}/${g}/${slug}` : `${TEST_PATH}/${g}`) : TEST_PATH)

/** Bir testte sorulabilecek soru sayıları */
export const TEST_SIZES = [10, 20] as const

export interface TestItem {
  q: QuizQuestion
  activity: Activity
  /** Tema slug'ı */
  theme: string
  /** Seçenek sırası anlamlı (ör. imkânsız / olabilir / kesin): karıştırılmaz */
  fixedOrder: boolean
}

const text = (c: Content) => (typeof c === 'string' ? c : c.text ?? '')

/** Etkinliğin dışında da anlaşılır soru: hızlı bakış değil, önceki soruya atıf yapmıyor */
const usable = (q: QuizQuestion) => !q.flash && q.choices.length >= 2 && q.answer < q.choices.length && !/önceki soru/i.test(text(q.prompt))

/** Sınıfın (ya da tek temanın) test soruları; etkinlik sırasıyla */
export function testItems(acts: Activity[], g: Grade, slug?: string): TestItem[] {
  const out: TestItem[] = []
  for (const a of acts) {
    if (a.type !== 'quiz' || a.anyCorrect || !a.questions?.length) continue
    const th = outcomeByCode.get(a.outcomes[0])?.theme
    if (!th || th.grade !== g || (slug && th.slug !== slug)) continue
    for (const q of a.questions) if (usable(q)) out.push({ q, activity: a, theme: th.slug, fixedOrder: !!a.fixedOrder })
  }
  return out
}

/** Testi olan temalar (sınıf sırasıyla) ve soru sayıları */
export function testThemes(acts: Activity[], g: Grade) {
  const items = testItems(acts, g)
  return themesByGrade(g)
    .map((t) => ({ theme: t, count: items.filter((i) => i.theme === t.slug).length }))
    .filter((x) => x.count >= 5)
}

/**
 * n soruluk test: temalar arasında dengeli (her temadan sırayla) seçilir, sonra karıştırılır.
 * Seçenekler burada karıştırılır (fixedOrder sorular hariç); Quiz motoru fixedOrder ile çalıştırılmalıdır.
 */
export function drawTest(items: TestItem[], n: number): QuizQuestion[] {
  const groups = new Map<string, TestItem[]>()
  for (const it of shuffle(items)) groups.set(it.theme, [...(groups.get(it.theme) ?? []), it])
  const queues = shuffle([...groups.values()])
  const picked: TestItem[] = []
  while (picked.length < Math.min(n, items.length)) {
    for (const q of queues) if (q.length && picked.length < n) picked.push(q.shift()!)
  }
  return shuffle(picked).map(({ q, fixedOrder }) => {
    const order = fixedOrder ? q.choices.map((_, i) => i) : shuffle(q.choices.map((_, i) => i))
    return {
      ...q,
      choices: order.map((i) => q.choices[i]),
      feedback: q.feedback ? order.map((i) => q.feedback![i]) : undefined,
      answer: order.indexOf(q.answer),
    }
  })
}
