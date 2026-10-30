/**
 * İçerik doğrulama:  pnpm validate            (tüm sınıflar)
 *                    pnpm validate -- 3       (sadece 3. sınıf)
 */
import { allOutcomes, outcomeByCode, themesByGrade } from '../src/data/curriculum.ts'
import { activitiesByGrade, notesByGrade } from '../src/data/activities/index.ts'
import { generatorKind, runGenerator } from '../src/lib/generators.ts'
import { inTopic, topicsByGrade } from '../src/data/topics.ts'
import { interactionById } from '../src/interactions/meta.ts'
import { gameMetaById } from '../src/games/meta.ts'
import { toolMetaById } from '../src/manipulatives/meta.ts'
import type { Activity, Content, FillItem, Grade, MatchPair, QuizQuestion, SortRound, Stage } from '../src/data/types.ts'

const onlyGrade = Number(process.argv[2]) || null
const errors: string[] = []
const warnings: string[] = []
const err = (a: { id: string } | null, m: string) => errors.push(`${a ? `[${a.id}] ` : ''}${m}`)
const warn = (a: { id: string } | null, m: string) => warnings.push(`${a ? `[${a.id}] ` : ''}${m}`)

const key = (c: Content) => (typeof c === 'string' ? c.trim() : JSON.stringify(c))
const textOf = (c: Content) => (typeof c === 'string' ? c : c.text ?? '')

const TOOL_KEYS: Record<string, string[][]> = {
  tenframe: [['count']],
  base10: [['value']],
  numberline: [['value']],
  fractions: [['num', 'den']],
  clock: [['h', 'm']],
  money: [['total']],
  geoboard: [['sides'], ['area'], ['perimeter']],
  symmetry: [['cells']],
  angle: [['degrees']],
  balance: [['a', 'b', 'c']],
  algebra: [['x', 'c']],
  bargraph: [['data']],
  probability: [['question', 'choices', 'answer']],
  coordinate: [['x', 'y']],
  nets: [['solid']],
}

function checkMath(a: Activity, s: string) {
  const open = (s.match(/\[\[/g) ?? []).length
  const close = (s.match(/\]\]/g) ?? []).length
  if (open !== close) err(a, `Kesir gösterimi dengesiz: "${s}"`)
}

function checkFill(a: Activity, items: FillItem[], generated = false) {
  items.forEach((it, i) => {
    if (it.flash && !it.visual) err(a, `fill #${i}: flash için visual gerekli`)
    const blanks = it.text.split('__').length - 1
    if (blanks === 0) err(a, `fill #${i}: "__" boşluğu yok: "${it.text}"`)
    if (blanks !== it.answers.length) err(a, `fill #${i}: ${blanks} boşluk ama ${it.answers.length} cevap: "${it.text}"`)
    if (it.choices) {
      it.answers.forEach((ans) => {
        if (!ans.split('|').some((alt) => it.choices!.includes(alt))) err(a, `fill #${i}: cevap "${ans}" seçeneklerde yok`)
      })
    } else if (!generated) {
      it.answers.forEach((ans) => {
        if (!/^[-−]?[\d.,/]+$/.test(ans.split('|')[0])) warn(a, `fill #${i}: sayısal olmayan cevap "${ans}" seçeneksiz (öğrenci klavyeyle yazacak)`)
      })
    }
    checkMath(a, it.text)
  })
}

function checkQuiz(a: Activity, qs: QuizQuestion[]) {
  qs.forEach((q, i) => {
    if (q.feedback) {
      if (q.feedback.length !== q.choices.length) err(a, `quiz #${i}: feedback uzunluğu (${q.feedback.length}) seçenek sayısına (${q.choices.length}) eşit olmalı`)
      if (q.feedback[q.answer]) warn(a, `quiz #${i}: doğru seçeneğin feedback'i null olmalı`)
    }
    if (a.type === 'quiz' && a.anyCorrect && (!q.reasons || q.reasons.length !== q.choices.length)) err(a, `quiz #${i}: anyCorrect için her seçeneğe bir gerekçe (reasons) yazılmalı`)
    if (q.flash && (typeof q.prompt === 'string' || !q.prompt.visual)) err(a, `quiz #${i}: flash için prompt'ta görsel olmalı`)
    if (q.choices.length < 2) err(a, `quiz #${i}: en az 2 seçenek olmalı`)
    if (q.answer < 0 || q.answer >= q.choices.length || !Number.isInteger(q.answer)) err(a, `quiz #${i}: geçersiz answer ${q.answer}`)
    const ks = q.choices.map(key)
    if (new Set(ks).size !== ks.length) err(a, `quiz #${i}: aynı seçenek iki kez var`)
    checkMath(a, textOf(q.prompt))
    q.choices.forEach((c) => checkMath(a, textOf(c)))
  })
}

function checkMatch(a: Activity, ps: MatchPair[]) {
  if (ps.length < 2) err(a, 'match: en az 2 çift olmalı')
  const L = ps.map((p) => key(p.left)), R = ps.map((p) => key(p.right))
  if (new Set(L).size !== L.length) err(a, 'match: sol taraftaki kartlar benzersiz olmalı')
  if (new Set(R).size !== R.length) err(a, 'match: sağ taraftaki kartlar benzersiz olmalı (aksi hâlde eşleşme belirsiz)')
}

function checkSort(a: Activity, rs: SortRound[]) {
  rs.forEach((r, i) => {
    if (r.items.length < 2) err(a, `sort #${i}: en az 2 öğe olmalı`)
    const ks = r.items.map(key)
    if (new Set(ks).size !== ks.length) err(a, `sort #${i}: aynı öğe iki kez var (sıra belirsiz)`)
  })
}

const seen = new Set<string>()
const covered = new Set<string>()
const STAGES: Stage[] = ['somut', 'model', 'sembol', 'problem']
const stagesByOutcome = new Map<string, Set<Stage>>()
const oddByTheme = new Map<string, number>()

for (const [gStr, list] of Object.entries(activitiesByGrade)) {
  const g = Number(gStr) as Grade
  if (onlyGrade && g !== onlyGrade) continue
  for (const a of list) {
    if (seen.has(a.id)) err(a, 'id tekrar ediyor')
    seen.add(a.id)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.id)) err(a, 'id küçük harf, rakam ve tire içermeli (Türkçe karakter yok)')
    if (!a.id.startsWith(`g${g}-`)) err(a, `id "g${g}-" ile başlamalı`)
    if (!a.title?.trim()) err(a, 'title boş')
    if (!a.instructions?.trim()) err(a, 'instructions boş')
    if (!a.outcomes?.length) err(a, 'outcomes boş')
    if (!a.stage || !STAGES.includes(a.stage)) err(a, `stage şunlardan biri olmalı: ${STAGES.join(', ')}`)
    if (!a.launch?.text?.trim()) err(a, 'launch.text (Başlarken) boş')
    if (!a.reflect?.trim()) err(a, 'reflect (Düşün ve Paylaş) boş')
    for (const code of a.outcomes ?? []) {
      if (!stagesByOutcome.has(code)) stagesByOutcome.set(code, new Set())
      if (a.stage) stagesByOutcome.get(code)!.add(a.stage)
    }
    if (a.type === 'quiz' && a.anyCorrect) {
      const th = outcomeByCode.get(a.outcomes[0])?.theme
      if (th) oddByTheme.set(`${th.grade}/${th.slug}`, (oddByTheme.get(`${th.grade}/${th.slug}`) ?? 0) + 1)
    }
    for (const code of a.outcomes ?? []) {
      const o = outcomeByCode.get(code)
      if (!o) err(a, `bilinmeyen öğrenme çıktısı ${code}`)
      else if (o.theme.grade !== g) err(a, `${code} bu sınıfa ait değil`)
      else covered.add(code)
    }
    const gen = 'generator' in a ? a.generator : undefined
    if (gen) {
      const kind = generatorKind(gen.id)
      if (!kind) err(a, `bilinmeyen üreteç "${gen.id}"`)
      else if (kind !== a.type) err(a, `üreteç "${gen.id}" ${kind} türünde, etkinlik ${a.type}`)
      else {
        for (let k = 0; k < 5; k++) {
          try {
            const out = runGenerator(gen.id, gen.params, gen.count ?? 8)
            if (out.length < Math.min(3, gen.count ?? 8)) err(a, `üreteç yeterli soru üretemedi (${out.length})`)
            if (a.type === 'fill') checkFill(a, out as FillItem[], true)
            if (a.type === 'quiz') checkQuiz(a, out as QuizQuestion[])
            if (a.type === 'match') checkMatch(a, out as MatchPair[])
            if (a.type === 'sort') checkSort(a, out as SortRound[])
          } catch (e) {
            err(a, `üreteç hata verdi: ${(e as Error).message}`)
            break
          }
        }
      }
    }
    switch (a.type) {
      case 'quiz':
        if (!a.questions?.length && !gen) err(a, 'questions ya da generator gerekli')
        if (a.questions) checkQuiz(a, a.questions)
        break
      case 'fill':
        if (!a.items?.length && !gen) err(a, 'items ya da generator gerekli')
        if (a.items) checkFill(a, a.items)
        break
      case 'match':
        if (!a.pairs?.length && !gen) err(a, 'pairs ya da generator gerekli')
        if (a.pairs) checkMatch(a, a.pairs)
        break
      case 'sort':
        if (!a.rounds?.length && !gen) err(a, 'rounds ya da generator gerekli')
        if (a.rounds) checkSort(a, a.rounds)
        break
      case 'categorize': {
        if (a.categories.length < 2 || a.categories.length > 4) err(a, 'categorize: 2–4 grup olmalı')
        const ids = new Set(a.categories.map((c) => c.id))
        if (a.items.length < 4) err(a, 'categorize: en az 4 öğe olmalı')
        a.items.forEach((it, i) => { if (!ids.has(it.category)) err(a, `categorize #${i}: bilinmeyen grup "${it.category}"`) })
        for (const c of a.categories) if (!a.items.some((it) => it.category === c.id)) warn(a, `categorize: "${c.label}" grubuna hiç öğe yok`)
        break
      }
      case 'manipulative': {
        const req = TOOL_KEYS[a.tool]
        if (!req) { err(a, `bilinmeyen araç "${a.tool}"`); break }
        if (!a.tasks?.length) err(a, 'tasks boş')
        a.tasks?.forEach((t, i) => {
          if (!t.prompt?.trim()) err(a, `task #${i}: prompt boş`)
          if (!req.some((set) => set.every((k) => k in (t.target ?? {})))) err(a, `task #${i}: ${a.tool} hedefi şunlardan birini içermeli: ${req.map((s) => s.join('+')).join(' | ')}`)
          if (a.tool === 'probability') {
            const tg = t.target as { choices?: string[]; answer?: string }
            if (!tg.choices?.includes(tg.answer ?? '')) err(a, `task #${i}: probability answer seçeneklerde yok`)
          }
          if (a.tool === 'numberline') {
            const { min = 0, max = 20, step = 1 } = a.config ?? {}
            const v = (t.target as { value: number }).value
            const k = (v - min) / step
            if (v < min || v > max || Math.abs(k - Math.round(k)) > 1e-9) err(a, `task #${i}: ${v} sayı doğrusunda (min ${min}, max ${max}, adım ${step}) işaretlenemez`)
          }
          if (a.tool === 'fractions') {
            const dens = a.config?.dens ?? [1, 2, 3, 4, 5, 6, 8, 10, 12]
            const { num, den, exact } = t.target as { num: number; den: number; exact?: boolean }
            const ok = exact ? dens.includes(den) && num <= den : dens.some((d) => Number.isInteger((num / den) * d) && (num / den) * d <= d)
            if (!ok) err(a, `task #${i}: ${num}/${den} verilen paydalarla (${dens.join(',')}) oluşturulamaz (en fazla 1 bütün)`)
          }
          if (a.tool === 'clock') {
            const step = a.config?.minuteStep ?? 5
            const { m } = t.target as { m: number }
            if (m % step !== 0) err(a, `task #${i}: dakika ${m}, adım ${step} ile ayarlanamaz`)
          }
          if (a.tool === 'balance') {
            const { a: aa = 1, b, c } = t.target as { a: number; b: number; c: number }
            if (!Number.isInteger((c - b) / aa)) err(a, `task #${i}: terazi çözümü tam sayı değil`)
          }
          if (a.tool === 'base10') {
            const v = (t.target as { value: number }).value
            const max = a.config?.maxPlace === 'thousands' ? 9999 : 999
            if (v > max) err(a, `task #${i}: ${v} için maxPlace: 'thousands' gerekli`)
          }
        })
        break
      }
    }
  }
}

const relevant = allOutcomes.filter((o) => !onlyGrade || o.theme.grade === onlyGrade)
for (const o of relevant) {
  const st = stagesByOutcome.get(o.code)
  if (st && st.size < 3) err(null, `${o.code} (${o.short}): en az 3 farklı aşama (stage) olmalı, şu an: ${[...st].join(', ')}`)
}
for (const g of [1, 2, 3, 4, 5, 6, 7, 8] as Grade[]) {
  if (onlyGrade && g !== onlyGrade) continue
  const notes = notesByGrade[g]
  for (const th of themesByGrade(g)) {
    const n = notes[th.slug]
    if (!n || n.bigIdeas.length < 2) err(null, `grade${g}Notes["${th.slug}"]: en az 2 büyük fikir (bigIdeas) yazılmalı`)
    if (!oddByTheme.get(`${g}/${th.slug}`)) err(null, `${g}. sınıf "${th.title}": en az bir "Hangisi farklı?" (anyCorrect) etkinliği olmalı`)
  }
  for (const slug of Object.keys(notes)) if (!themesByGrade(g).some((t) => t.slug === slug)) err(null, `grade${g}Notes: bilinmeyen tema "${slug}"`)
}
// Konu başlıklarıyla düzenlenen sınıflar: her etkinlik tam olarak bir konuda, bağlı içerikler mevcut ve o sınıfa uygun
for (const [gStr, topics] of Object.entries(topicsByGrade)) {
  const g = Number(gStr) as Grade
  if (!topics || (onlyGrade && g !== onlyGrade)) continue
  for (const a of activitiesByGrade[g]) {
    const n = topics.filter((t) => inTopic(t, a)).length
    if (n !== 1) err(a, `${n === 0 ? 'hiçbir konu başlığında yok' : `${n} konu başlığında birden var`} (src/data/topics.ts)`)
  }
  for (const t of topics) {
    for (const k of t.activities) if (!k.startsWith('MAT.') && !activitiesByGrade[g].some((a) => a.id === k)) err(null, `Konu "${t.title}": bilinmeyen etkinlik ${k}`)
    for (const id of t.interactions) {
      const m = interactionById[id]
      if (!m) err(null, `Konu "${t.title}": bilinmeyen etkileşim ${id}`)
      else if (!m.grades.includes(g)) err(null, `Konu "${t.title}": ${id} ${g}. sınıfa açık değil`)
    }
    for (const id of t.games) {
      const m = gameMetaById[id]
      if (!m) err(null, `Konu "${t.title}": bilinmeyen oyun ${id}`)
      else if (!m.grades.includes(g)) err(null, `Konu "${t.title}": ${id} ${g}. sınıfa açık değil`)
    }
    for (const id of t.tools) if (!toolMetaById[id]) err(null, `Konu "${t.title}": bilinmeyen materyal ${id}`)
  }
}

const missing = relevant.filter((o) => !covered.has(o.code))
for (const o of missing) err(null, `Etkinliği olmayan öğrenme çıktısı: ${o.code} (${o.short})`)

const counts = Object.entries(activitiesByGrade).map(([g, l]) => `${g}. sınıf: ${l.length}`).join(' · ')
console.log(`Etkinlikler → ${counts}`)
console.log(`Kapsanan çıktı: ${relevant.length - missing.length}/${relevant.length}`)
if (warnings.length) console.log(`\n⚠️  ${warnings.length} uyarı:\n` + warnings.slice(0, 40).map((w) => '  ' + w).join('\n'))
if (errors.length) {
  console.log(`\n❌ ${errors.length} hata:\n` + errors.map((e) => '  ' + e).join('\n'))
  process.exit(1)
}
console.log('\n✅ İçerik geçerli.')
