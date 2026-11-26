/** Etkinlik düzenleyicisinin türe özel bölümleri (test, boşluk doldurma, eşleştirme …) */
import { type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react'
import type {
  Activity,
  ActivityType,
  CategorizeActivity,
  CategorizeItem,
  Content,
  FillActivity,
  FillItem,
  ManipulativeActivity,
  ManipulativeTask,
  MatchActivity,
  MatchPair,
  QuizActivity,
  QuizQuestion,
  SortActivity,
  SortRound,
} from '../../data/types'
import { Button, Callout, Field, IconButton, JsonEditor, ListEditor, Select, TextArea, TextInput, Toggle, cx, slugify } from '../ui'

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
export const NOTATION_HINT = '[[3/4]] kesir · [[1 2/3]] tam sayılı kesir · x^{2} üs · √{16} kök'

export const contentText = (c: Content | undefined) => (c === undefined ? '' : typeof c === 'string' ? c : c.text ?? '')
/** Metni değiştirir; görsel varsa korunur */
export const withText = (c: Content | undefined, text: string): Content => (c && typeof c !== 'string' && c.visual ? { ...c, text } : text)

const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const next = arr.slice()
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** Görseli olan içerik için metin + görsel JSON düzenleme */
export function ContentInput({ value, onChange, placeholder, multiline }: { value: Content | undefined; onChange: (c: Content) => void; placeholder?: string; multiline?: boolean }) {
  const visual = value && typeof value !== 'string' ? value.visual : undefined
  return (
    <div className="space-y-1.5">
      {multiline ? (
        <TextArea value={contentText(value)} onChange={(t) => onChange(withText(value, t))} placeholder={placeholder} minRows={1} />
      ) : (
        <TextInput value={contentText(value)} onChange={(t) => onChange(withText(value, t))} placeholder={placeholder} />
      )}
      {visual && (
        <details className="rounded-xl bg-paper px-3 py-1.5 text-xs">
          <summary className="cursor-pointer font-extrabold text-ink-soft">🖼️ Görsel var ({visual.kind}) — düzenle</summary>
          <div className="pt-2">
            <JsonEditor
              value={visual}
              rows={6}
              onChange={(v) => onChange(v ? { text: contentText(value), visual: v as never } : contentText(value))}
            />
          </div>
        </details>
      )}
    </div>
  )
}

/** Sıralanabilir kart listesi (sorular, maddeler …) */
function ItemCards<T>({ items, onChange, render, make, addLabel, label }: { items: T[]; onChange: (v: T[]) => void; render: (item: T, set: (v: T) => void, i: number) => ReactNode; make: () => T; addLabel: string; label: (i: number) => string }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-2xl bg-white ring-1 ring-line">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
            <span className="text-xs font-black tracking-wide text-ink-soft uppercase">{label(i)}</span>
            <div className="flex">
              <IconButton label="Yukarı taşı" onClick={() => onChange(move(items, i, -1))} disabled={i === 0}>
                <ChevronUp size={15} />
              </IconButton>
              <IconButton label="Aşağı taşı" onClick={() => onChange(move(items, i, 1))} disabled={i === items.length - 1}>
                <ChevronDown size={15} />
              </IconButton>
              <IconButton label="Çoğalt" onClick={() => onChange([...items.slice(0, i + 1), structuredClone(it), ...items.slice(i + 1)])}>
                <Copy size={15} />
              </IconButton>
              <IconButton label="Sil" onClick={() => onChange(items.filter((_, j) => j !== i))} className="hover:text-bad">
                <Trash2 size={15} />
              </IconButton>
            </div>
          </div>
          <div className="space-y-3 p-4">{render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}</div>
        </div>
      ))}
      <Button variant="soft" icon={<Plus size={16} />} onClick={() => onChange([...items, make()])}>
        {addLabel}
      </Button>
    </div>
  )
}

const opt = (s: string | undefined) => (s && s.trim() ? s : undefined)
const optArr = (a: string[] | undefined) => (a && a.length ? a : undefined)

// ---------------------------------------------------------------------------
// Test (çoktan seçmeli)
// ---------------------------------------------------------------------------
function QuizQuestionEditor({ q, set, anyCorrect }: { q: QuizQuestion; set: (q: QuizQuestion) => void; anyCorrect?: boolean }) {
  const showFb = !!q.feedback
  const setChoices = (choices: Content[], answer: number, feedback?: (string | null)[], reasons?: string[]) => set({ ...q, choices, answer, feedback, reasons })
  const fb = (i: number) => q.feedback?.[i] ?? ''
  const removeChoice = (i: number) => {
    const answer = q.answer === i ? 0 : q.answer > i ? q.answer - 1 : q.answer
    setChoices(
      q.choices.filter((_, j) => j !== i),
      answer,
      q.feedback?.filter((_, j) => j !== i),
      q.reasons?.filter((_, j) => j !== i),
    )
  }
  const moveChoice = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= q.choices.length) return
    const answer = q.answer === i ? j : q.answer === j ? i : q.answer
    setChoices(move(q.choices, i, d), answer, q.feedback ? move(q.feedback, i, d) : undefined, q.reasons ? move(q.reasons, i, d) : undefined)
  }
  return (
    <>
      <Field label="Soru" help={NOTATION_HINT}>
        <ContentInput value={q.prompt} onChange={(prompt) => set({ ...q, prompt })} placeholder="Ör. [[3/4]] ile [[2/3]] kesirlerinden hangisi büyüktür?" multiline />
      </Field>
      <Field label={anyCorrect ? 'Seçenekler (her biri kabul edilir)' : 'Seçenekler — doğru olanı işaretleyin'}>
        <div className="space-y-2">
          {q.choices.map((c, i) => {
            const correct = !anyCorrect && q.answer === i
            return (
              <div key={i} className={cx('rounded-xl p-2 ring-1', correct ? 'bg-ok-soft/60 ring-ok/40' : 'ring-line')}>
                <div className="flex items-start gap-2">
                  {!anyCorrect && (
                    <button
                      type="button"
                      onClick={() => set({ ...q, answer: i })}
                      aria-label={`${i + 1}. seçeneği doğru yap`}
                      title="Doğru cevap"
                      className={cx('mt-2 grid size-6 shrink-0 place-items-center rounded-full ring-2 transition', correct ? 'bg-ok ring-ok' : 'bg-white ring-line hover:ring-ok/60')}
                    >
                      {correct && <span className="size-2 rounded-full bg-white" />}
                    </button>
                  )}
                  <span className="mt-2 w-5 shrink-0 text-center text-xs font-black text-ink-soft">{String.fromCharCode(65 + i)}</span>
                  <div className="min-w-0 flex-1">
                    <ContentInput value={c} onChange={(v) => set({ ...q, choices: q.choices.map((x, j) => (j === i ? v : x)) })} placeholder="Seçenek" />
                  </div>
                  <div className="mt-1 flex">
                    <IconButton label="Yukarı" onClick={() => moveChoice(i, -1)} disabled={i === 0}>
                      <ChevronUp size={14} />
                    </IconButton>
                    <IconButton label="Sil" onClick={() => removeChoice(i)} disabled={q.choices.length <= 2} className="hover:text-bad">
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
                {showFb && !correct && !anyCorrect && (
                  <div className="mt-2 pl-[3.25rem]">
                    <TextInput
                      value={fb(i)}
                      onChange={(t) => {
                        const next = q.choices.map((_, j) => (j === i ? t : q.feedback?.[j] ?? null))
                        set({ ...q, feedback: next })
                      }}
                      placeholder="Bu yanlışı seçen öğrenciye geri bildirim (kavram yanılgısı)"
                      className="text-sm"
                    />
                  </div>
                )}
                {anyCorrect && (
                  <div className="mt-2 pl-7">
                    <TextInput
                      value={q.reasons?.[i] ?? ''}
                      onChange={(t) => set({ ...q, reasons: q.choices.map((_, j) => (j === i ? t : q.reasons?.[j] ?? '')) })}
                      placeholder="Bu seçenek neden farklı olabilir?"
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            )
          })}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => set({ ...q, choices: [...q.choices, ''], feedback: q.feedback ? [...q.feedback, null] : undefined })} disabled={q.choices.length >= 6}>
              Seçenek ekle
            </Button>
            {!anyCorrect && (
              <Button size="sm" variant="ghost" onClick={() => set({ ...q, feedback: showFb ? undefined : q.choices.map((_, j) => (j === q.answer ? null : '')) })}>
                {showFb ? 'Geri bildirimleri kaldır' : 'Yanlışlara geri bildirim ekle'}
              </Button>
            )}
          </div>
        </div>
      </Field>
      <Field label="Açıklama (neden doğru?)" help="Yanlış cevaptan sonra gösterilir.">
        <TextArea value={q.explain ?? ''} onChange={(t) => set({ ...q, explain: opt(t) })} minRows={1} placeholder="Ör. Paydaları eşitleyince 9/12 > 8/12 olur." />
      </Field>
    </>
  )
}

function QuizEditor({ a, set }: { a: QuizActivity; set: (a: QuizActivity) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle checked={!!a.fixedOrder} onChange={(v) => set({ ...a, fixedOrder: v || undefined })} label="Seçenekleri karıştırma" help="Sıralı ölçeklerde (imkânsız / olabilir / kesin) açın." />
        <Toggle checked={!!a.anyCorrect} onChange={(v) => set({ ...a, anyCorrect: v || undefined })} label="Her cevap kabul — “Hangisi farklı?”" help="Doğru tek cevap yoktur; her seçeneğin gerekçesi gösterilir." />
      </div>
      <ItemCards<QuizQuestion>
        items={a.questions ?? []}
        onChange={(questions) => set({ ...a, questions })}
        label={(i) => `${i + 1}. soru`}
        addLabel="Soru ekle"
        make={() => ({ prompt: '', choices: ['', '', '', ''], answer: 0 })}
        render={(q, s) => <QuizQuestionEditor q={q} set={s} anyCorrect={a.anyCorrect} />}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Boşluk doldurma
// ---------------------------------------------------------------------------
export const blankCount = (t: string) => (t.match(/__/g) ?? []).length

function FillEditor({ a, set }: { a: FillActivity; set: (a: FillActivity) => void }) {
  return (
    <ItemCards<FillItem>
      items={a.items ?? []}
      onChange={(items) => set({ ...a, items })}
      label={(i) => `${i + 1}. madde`}
      addLabel="Madde ekle"
      make={() => ({ text: '__ + 3 = 10', answers: ['7'] })}
      render={(it: FillItem, s) => {
        const n = blankCount(it.text)
        const answers = Array.from({ length: Math.max(n, it.answers.length) }, (_, i) => it.answers[i] ?? '')
        return (
          <>
            <Field label="Metin" help={<>Her boşluk için <b>__</b> (iki alt çizgi) yazın · {NOTATION_HINT}</>} action={<span className={cx('text-xs font-black', n ? 'text-ok' : 'text-bad')}>{n} boşluk</span>}>
              <TextInput value={it.text} onChange={(text) => s({ ...it, text })} placeholder="8 + __ = 15" />
            </Field>
            <Field label="Cevaplar (boşluk sırasıyla)" help="Kabul edilecek farklı yazımları | ile ayırın: 0,5|0.5" error={n !== it.answers.length ? `${n} boşluk var, ${it.answers.length} cevap yazıldı.` : null}>
              <div className="grid gap-2 sm:grid-cols-2">
                {answers.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs font-black text-ink-soft">{i + 1}. boşluk</span>
                    <TextInput
                      value={v}
                      onChange={(t) => {
                        const next = answers.slice()
                        next[i] = t
                        s({ ...it, answers: next.slice(0, Math.max(n, 1)) })
                      }}
                    />
                  </div>
                ))}
              </div>
            </Field>
            <Field label="Seçenek çipleri (isteğe bağlı)" help="Doldurursanız klavye yerine bu çipler gösterilir.">
              <ListEditor value={it.choices ?? []} onChange={(c) => s({ ...it, choices: optArr(c) })} addLabel="Çip ekle" placeholder="Ör. 7" />
            </Field>
            <Field label="Kademeli ipuçları" help="Soru sorar, cevabı söylemez.">
              <ListEditor value={it.hints ?? (it.hint ? [it.hint] : [])} onChange={(h) => s({ ...it, hints: optArr(h), hint: undefined })} addLabel="İpucu ekle" placeholder="Ör. 10'a tamamlamak için kaç gerekir?" />
            </Field>
            <Field label="Açıklama (neden?)">
              <TextArea value={it.explain ?? ''} onChange={(t) => s({ ...it, explain: opt(t) })} minRows={1} />
            </Field>
          </>
        )
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Eşleştirme
// ---------------------------------------------------------------------------
function MatchEditor({ a, set }: { a: MatchActivity; set: (a: MatchActivity) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Bir turda gösterilecek çift sayısı" help="Varsayılan 5">
        <TextInput type="number" min={2} max={8} value={String(a.perRound ?? '')} onChange={(v) => set({ ...a, perRound: v ? Math.max(2, Math.min(8, Number(v))) : undefined })} placeholder="5" className="max-w-32" />
      </Field>
      <ItemCards<MatchPair>
        items={a.pairs ?? []}
        onChange={(pairs) => set({ ...a, pairs })}
        label={(i) => `${i + 1}. çift`}
        addLabel="Çift ekle"
        make={() => ({ left: '', right: '' })}
        render={(p: MatchPair, s) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sol">
              <ContentInput value={p.left} onChange={(left) => s({ ...p, left })} placeholder="Ör. [[1/2]]" />
            </Field>
            <Field label="Sağ (eşi)">
              <ContentInput value={p.right} onChange={(right) => s({ ...p, right })} placeholder="Ör. 0,5" />
            </Field>
          </div>
        )}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sıralama
// ---------------------------------------------------------------------------
function SortEditor({ a, set }: { a: SortActivity; set: (a: SortActivity) => void }) {
  return (
    <ItemCards<SortRound>
      items={a.rounds ?? []}
      onChange={(rounds) => set({ ...a, rounds })}
      label={(i) => `${i + 1}. tur`}
      addLabel="Tur ekle"
      make={() => ({ prompt: 'Küçükten büyüğe sırala', items: ['', '', ''], ends: ['En küçük', 'En büyük'] })}
      render={(r: SortRound, s) => (
        <>
          <Field label="Yönerge">
            <TextInput value={r.prompt} onChange={(prompt) => s({ ...r, prompt })} />
          </Field>
          <Field label="Öğeler — DOĞRU sırayla yazın" help={`Ekranda karıştırılarak gösterilir. ${NOTATION_HINT}`}>
            <ListEditor value={r.items.map(contentText)} onChange={(items) => s({ ...r, items: items.map((t, i) => withText(r.items[i], t)) })} addLabel="Öğe ekle" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Baştaki etiket">
              <TextInput value={r.ends?.[0] ?? ''} onChange={(t) => s({ ...r, ends: t || r.ends?.[1] ? [t, r.ends?.[1] ?? ''] : undefined })} placeholder="En küçük" />
            </Field>
            <Field label="Sondaki etiket">
              <TextInput value={r.ends?.[1] ?? ''} onChange={(t) => s({ ...r, ends: t || r.ends?.[0] ? [r.ends?.[0] ?? '', t] : undefined })} placeholder="En büyük" />
            </Field>
          </div>
          <Field label="Kademeli ipuçları">
            <ListEditor value={r.hints ?? []} onChange={(h) => s({ ...r, hints: optArr(h) })} addLabel="İpucu ekle" />
          </Field>
          <Field label="Açıklama">
            <TextArea value={r.explain ?? ''} onChange={(t) => s({ ...r, explain: opt(t) })} minRows={1} />
          </Field>
        </>
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Gruplama
// ---------------------------------------------------------------------------
function CategorizeEditor({ a, set }: { a: CategorizeActivity; set: (a: CategorizeActivity) => void }) {
  const cats = a.categories ?? []
  const setCats = (next: CategorizeActivity['categories']) => {
    // Kategori kimliği değişirse öğelerdeki bağlantıyı da güncelle
    const ren = new Map(cats.map((c, i) => [c.id, next[i]?.id]))
    set({ ...a, categories: next, items: a.items.map((it) => (ren.get(it.category) ? { ...it, category: ren.get(it.category)! } : it)) })
  }
  return (
    <div className="space-y-5">
      <Field label="Gruplar (2–4)">
        <div className="space-y-2">
          {cats.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={c.color ?? '#d6457a'}
                onChange={(e) => setCats(cats.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
                className="size-10 shrink-0 cursor-pointer rounded-xl border border-line bg-white p-1"
                aria-label="Renk"
              />
              <TextInput
                value={c.label}
                onChange={(label) => setCats(cats.map((x, j) => (j === i ? { ...x, label, id: slugify(label) || x.id } : x)))}
                placeholder="Ör. Çift sayılar"
              />
              <IconButton label="Grubu sil" disabled={cats.length <= 2} onClick={() => setCats(cats.filter((_, j) => j !== i))} className="hover:text-bad">
                <Trash2 size={15} />
              </IconButton>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus size={14} />} disabled={cats.length >= 4} onClick={() => setCats([...cats, { id: `grup-${cats.length + 1}`, label: `Grup ${cats.length + 1}` }])}>
            Grup ekle
          </Button>
        </div>
      </Field>
      <ItemCards<CategorizeItem>
        items={a.items ?? []}
        onChange={(items) => set({ ...a, items })}
        label={(i) => `${i + 1}. öğe`}
        addLabel="Öğe ekle"
        make={() => ({ content: '', category: cats[0]?.id ?? '' })}
        render={(it: CategorizeItem, s) => (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <Field label="Öğe">
                <ContentInput value={it.content} onChange={(content) => s({ ...it, content })} />
              </Field>
              <Field label="Doğru grubu" error={cats.some((c) => c.id === it.category) ? null : 'Grup seçin'}>
                <Select value={it.category} onChange={(category) => s({ ...it, category })} options={[...(cats.some((c) => c.id === it.category) ? [] : [{ value: it.category, label: '— seçin —' }]), ...cats.map((c) => ({ value: c.id, label: c.label }))]} />
              </Field>
            </div>
            <Field label="Yanlış gruba bırakılınca açıklama">
              <TextInput value={it.explain ?? ''} onChange={(t) => s({ ...it, explain: opt(t) })} />
            </Field>
          </>
        )}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manipülatif görevi
// ---------------------------------------------------------------------------
function ManipulativeEditor({ a, set }: { a: ManipulativeActivity; set: (a: ManipulativeActivity) => void }) {
  return (
    <div className="space-y-4">
      <Callout title={`Araç: ${a.tool}`}>Her görevin “hedef”i aracın beklediği biçimdedir (ör. onluk çerçeve için {'{ "count": 7 }'}). Ayrıntılar src/data/types.ts içinde.</Callout>
      <JsonEditor label="Araç ayarları (config)" value={a.config ?? {}} rows={4} onChange={(v) => set({ ...a, config: v && typeof v === 'object' && Object.keys(v).length ? (v as ManipulativeActivity['config']) : undefined })} />
      <ItemCards<ManipulativeTask>
        items={a.tasks ?? []}
        onChange={(tasks) => set({ ...a, tasks })}
        label={(i) => `${i + 1}. görev`}
        addLabel="Görev ekle"
        make={() => ({ prompt: '', target: structuredClone(a.tasks?.[0]?.target ?? {}) })}
        render={(t: ManipulativeTask, s) => (
          <>
            <Field label="Görev" help={NOTATION_HINT}>
              <TextArea value={t.prompt} onChange={(prompt) => s({ ...t, prompt })} minRows={1} />
            </Field>
            <JsonEditor label="Hedef" value={t.target} rows={3} onChange={(v) => s({ ...t, target: (v ?? {}) as Record<string, unknown> })} />
            <Field label="Kademeli ipuçları">
              <ListEditor value={t.hints ?? []} onChange={(h) => s({ ...t, hints: optArr(h) })} addLabel="İpucu ekle" />
            </Field>
            <Field label="“Ne keşfettik?” notu">
              <TextArea value={t.explain ?? ''} onChange={(x) => s({ ...t, explain: opt(x) })} minRows={1} />
            </Field>
          </>
        )}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Üreteç (otomatik soru)
// ---------------------------------------------------------------------------
function GeneratorPanel({ a, set }: { a: QuizActivity | FillActivity | MatchActivity | SortActivity; set: (a: Activity) => void }) {
  const g = a.generator!
  const toStatic = () => {
    const base = { ...a, generator: undefined } as Activity
    if (base.type === 'quiz') set({ ...base, questions: [{ prompt: '', choices: ['', '', '', ''], answer: 0 }] })
    else if (base.type === 'fill') set({ ...base, items: [{ text: '__', answers: [''] }] })
    else if (base.type === 'match') set({ ...base, pairs: [{ left: '', right: '' }] })
    else if (base.type === 'sort') set({ ...base, rounds: [{ prompt: 'Küçükten büyüğe sırala', items: ['', '', ''] }] })
  }
  return (
    <div className="space-y-3">
      <Callout title="Otomatik sorular" icon={<span>⚙️</span>}>
        Bu etkinliğin soruları her açılışta otomatik üretilir (üreteç: <code className="font-mono font-black">{g.id}</code>). Ayarları aşağıdan değiştirebilir ya da sabit sorulara dönüştürebilirsiniz.
      </Callout>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <Field label="Soru sayısı">
          <TextInput type="number" min={1} max={30} value={String(g.count ?? 8)} onChange={(v) => set({ ...a, generator: { ...g, count: Math.max(1, Math.min(30, Number(v) || 8)) } } as Activity)} />
        </Field>
        <JsonEditor label="Üreteç ayarları (params)" value={g.params ?? {}} rows={4} onChange={(v) => set({ ...a, generator: { ...g, params: (v ?? undefined) as Record<string, unknown> | undefined } } as Activity)} />
      </div>
      <Button variant="secondary" onClick={toStatic}>
        Sabit sorulara dönüştür
      </Button>
    </div>
  )
}

/** Türe özel düzenleyici */
export function TypeEditor({ a, set }: { a: Activity; set: (a: Activity) => void }) {
  if ((a.type === 'quiz' || a.type === 'fill' || a.type === 'match' || a.type === 'sort') && a.generator) return <GeneratorPanel a={a} set={set} />
  switch (a.type) {
    case 'quiz':
      return <QuizEditor a={a} set={set} />
    case 'fill':
      return <FillEditor a={a} set={set} />
    case 'match':
      return <MatchEditor a={a} set={set} />
    case 'sort':
      return <SortEditor a={a} set={set} />
    case 'categorize':
      return <CategorizeEditor a={a} set={set} />
    case 'manipulative':
      return <ManipulativeEditor a={a} set={set} />
  }
}

// ---------------------------------------------------------------------------
// Şablonlar ve doğrulama
// ---------------------------------------------------------------------------
export const NEW_TYPES: { value: Exclude<ActivityType, 'manipulative'>; label: string; desc: string; emoji: string }[] = [
  { value: 'quiz', label: 'Test', desc: 'Çoktan seçmeli sorular', emoji: '✅' },
  { value: 'fill', label: 'Boşluk doldurma', desc: 'Cevabı yazarak tamamla', emoji: '✏️' },
  { value: 'match', label: 'Eşleştirme', desc: 'Eş kartları bul', emoji: '🔗' },
  { value: 'sort', label: 'Sıralama', desc: 'Sürükleyerek sırala', emoji: '↕️' },
  { value: 'categorize', label: 'Gruplama', desc: 'Sürükleyip gruplara ayır', emoji: '🗂️' },
]

export function templateFor(type: Exclude<ActivityType, 'manipulative'>, id: string, outcome: string): Activity {
  const base = {
    id,
    outcomes: outcome ? [outcome] : [],
    title: '',
    instructions: '',
    level: 1 as const,
    stage: 'sembol' as const,
    launch: { text: '' },
    reflect: '',
  }
  switch (type) {
    case 'quiz':
      return {
        ...base,
        type,
        title: 'Yeni test',
        instructions: 'Doğru cevabı seç.',
        questions: [
          { prompt: '[[1/2]] ile hangi kesir denktir?', choices: ['[[2/4]]', '[[1/3]]', '[[2/3]]', '[[3/4]]'], answer: 0, explain: 'Pay ve paydayı 2 ile çarparsak [[2/4]] elde ederiz.' },
          { prompt: '24 sayısının yarısı kaçtır?', choices: ['12', '6', '48', '22'], answer: 0, explain: 'Yarısı demek 2 eş parçaya bölmek demektir: 24 ÷ 2 = 12.' },
        ],
      }
    case 'fill':
      return { ...base, type, title: 'Yeni boşluk doldurma', instructions: 'Boşlukları doldur.', items: [{ text: '8 + __ = 15', answers: ['7'], hints: ['8’i 10’a tamamlamak için kaç gerekir?'] }, { text: '__ × 4 = 20', answers: ['5'] }] }
    case 'match':
      return { ...base, type, title: 'Yeni eşleştirme', instructions: 'Eş olanları eşleştir.', pairs: [{ left: '[[1/2]]', right: '0,5' }, { left: '[[1/4]]', right: '0,25' }, { left: '[[3/4]]', right: '0,75' }] }
    case 'sort':
      return { ...base, type, title: 'Yeni sıralama', instructions: 'Sayıları sırala.', rounds: [{ prompt: 'Küçükten büyüğe sırala', items: ['[[1/4]]', '[[1/2]]', '[[3/4]]'], ends: ['En küçük', 'En büyük'] }] }
    case 'categorize':
      return {
        ...base,
        type,
        title: 'Yeni gruplama',
        instructions: 'Her kartı doğru gruba sürükle.',
        categories: [
          { id: 'tek', label: 'Tek sayılar', color: '#2563eb' },
          { id: 'cift', label: 'Çift sayılar', color: '#d6457a' },
        ],
        items: [
          { content: '7', category: 'tek' },
          { content: '12', category: 'cift' },
          { content: '25', category: 'tek' },
          { content: '40', category: 'cift' },
        ],
      }
  }
}

/** Kaydetmeden önce sorunlar */
export function validate(a: Activity): string[] {
  const out: string[] = []
  if (!a.title?.trim()) out.push('Başlık boş.')
  if (!a.outcomes?.length) out.push('En az bir öğrenme çıktısı seçin.')
  if (a.type === 'quiz' && !a.generator) {
    if (!a.questions?.length) out.push('En az bir soru ekleyin.')
    a.questions?.forEach((q, i) => {
      if (!contentText(q.prompt).trim() && !(typeof q.prompt !== 'string' && q.prompt.visual)) out.push(`${i + 1}. sorunun metni boş.`)
      if (q.choices.length < 2) out.push(`${i + 1}. soruda en az 2 seçenek olmalı.`)
      if (q.answer < 0 || q.answer >= q.choices.length) out.push(`${i + 1}. soruda doğru cevap işaretli değil.`)
      if (q.choices.some((c) => !contentText(c).trim() && !(typeof c !== 'string' && c.visual))) out.push(`${i + 1}. soruda boş seçenek var.`)
    })
  }
  if (a.type === 'fill' && !a.generator) {
    if (!a.items?.length) out.push('En az bir madde ekleyin.')
    a.items?.forEach((it, i) => {
      const n = blankCount(it.text)
      if (!n) out.push(`${i + 1}. maddede boşluk (__) yok.`)
      else if (n !== it.answers.length || it.answers.some((x) => !x.trim())) out.push(`${i + 1}. maddede her boşluğun cevabı olmalı.`)
    })
  }
  if (a.type === 'match' && !a.generator) {
    if ((a.pairs?.length ?? 0) < 2) out.push('En az 2 çift ekleyin.')
    a.pairs?.forEach((p, i) => (!contentText(p.left).trim() || !contentText(p.right).trim()) && out.push(`${i + 1}. çiftte boş taraf var.`))
  }
  if (a.type === 'sort' && !a.generator) {
    if (!a.rounds?.length) out.push('En az bir tur ekleyin.')
    a.rounds?.forEach((r, i) => r.items.length < 2 && out.push(`${i + 1}. turda en az 2 öğe olmalı.`))
  }
  if (a.type === 'categorize') {
    if (a.categories.length < 2) out.push('En az 2 grup olmalı.')
    if (new Set(a.categories.map((c) => c.id)).size !== a.categories.length) out.push('Grup adları birbirinden farklı olmalı.')
    a.items.forEach((it, i) => !a.categories.some((c) => c.id === it.category) && out.push(`${i + 1}. öğenin grubu seçilmemiş.`))
  }
  if (a.type === 'manipulative' && !a.tasks?.length) out.push('En az bir görev ekleyin.')
  return out
}
