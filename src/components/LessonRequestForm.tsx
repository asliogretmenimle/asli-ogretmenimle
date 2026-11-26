/**
 * Online özel ders ön kayıt formu. Başvurular Supabase'deki lesson_requests tablosuna yazılır
 * ve yönetim panelinde "Ders başvuruları" sayfasına düşer. Ziyaretçi yalnızca ekleyebilir, okuyamaz.
 */
import { useId, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, MessageCircle, Phone, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import { SUPABASE_ANON_KEY, SUPABASE_URL, cmsEnabled } from '../cms/config'
import type { LessonContent } from '../cms/pages/onlineOzelDers'

type LessonType = 'birebir' | 'grup' | 'kararsiz'
type ContactPref = 'whatsapp' | 'arama'

interface Values {
  student: string
  parent: string
  phone: string
  grade: number | null
  lessonType: LessonType | null
  contact: ContactPref
  contactTime: string
  expectations: string
  questions: string
  consent: boolean
}

const EMPTY: Values = { student: '', parent: '', phone: '', grade: null, lessonType: null, contact: 'whatsapp', contactTime: '', expectations: '', questions: '', consent: false }
const MAX_LONG = 1500
const MIN_FILL_MS = 3000

/** "0532 123 45 67" biçimi (yazarken) */
export function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('90') && d.length > 11) d = d.slice(2)
  if (d && d[0] !== '0') d = `0${d}`
  d = d.slice(0, 11)
  const parts = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean)
  return parts.join(' ')
}

/** Kayıt için: 11 hane, 0 ile başlar (05321234567); geçersizse null */
export function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('90') && d.length === 12) d = d.slice(2)
  if (d.length === 10 && d[0] !== '0') d = `0${d}`
  return /^0[2-9]\d{9}$/.test(d) ? d : null
}

function validate(v: Values, t: LessonContent) {
  const e: Partial<Record<keyof Values, string>> = {}
  const name = (s: string) => s.trim().length >= 3 && /\s/.test(s.trim())
  if (!name(v.student)) e.student = 'Lütfen öğrencinin adını ve soyadını yazın.'
  if (!name(v.parent)) e.parent = 'Lütfen velinin adını ve soyadını yazın.'
  if (!normalizePhone(v.phone)) e.phone = 'Geçerli bir telefon numarası yazın (ör. 0532 123 45 67).'
  if (!v.grade) e.grade = 'Lütfen öğrencinin sınıfını seçin.'
  if (!v.lessonType) e.lessonType = 'Lütfen bir seçenek işaretleyin.'
  if (v.expectations.trim().length < 10) e.expectations = 'Lütfen beklentilerinizi birkaç kelimeyle anlatın.'
  if (!v.consent) e.consent = 'Devam etmek için onay kutusunu işaretleyin.'
  void t
  return e
}

export function LessonRequestForm({ t, dark }: { t: LessonContent; dark?: boolean }) {
  const [v, setV] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [serverError, setServerError] = useState<string | null>(null)
  const [hp, setHp] = useState('')
  const started = useRef(Date.now())
  const formRef = useRef<HTMLFormElement>(null)
  const id = useId()

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    const next = { ...v, [k]: val }
    setV(next)
    if (touched[k] || errors[k]) setErrors((er) => ({ ...er, [k]: validate(next, t)[k] }))
  }
  const blur = (k: keyof Values) => {
    setTouched((x) => ({ ...x, [k]: true }))
    setErrors((er) => ({ ...er, [k]: validate(v, t)[k] }))
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const errs = validate(v, t)
    setErrors(errs)
    setTouched(Object.fromEntries(Object.keys(v).map((k) => [k, true])))
    const first = Object.keys(errs).find((k) => errs[k as keyof Values])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus()
      return
    }
    setState('sending')
    setServerError(null)
    // Bot: gizli alan doldurulmuşsa sessizce "gönderildi" de
    if (hp) {
      setState('done')
      return
    }
    // Çok hızlı doldurulduysa kısa bekle (otomatik gönderimleri ayıklar)
    const wait = MIN_FILL_MS - (Date.now() - started.current)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    try {
      if (!cmsEnabled) throw new Error('Form şu an kullanılamıyor.')
      const body = {
        student_name: v.student.trim().replace(/\s+/g, ' '),
        parent_name: v.parent.trim().replace(/\s+/g, ' '),
        phone: normalizePhone(v.phone),
        grade: v.grade,
        lesson_type: v.lessonType,
        contact_pref: v.contact,
        contact_time: v.contactTime.trim() || null,
        expectations: v.expectations.trim(),
        questions: v.questions.trim() || null,
        consent: true,
        source_path: location.pathname,
        referrer: document.referrer ? document.referrer.slice(0, 500) : null,
      }
      const r = await fetch(`${SUPABASE_URL}/rest/v1/lesson_requests`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string }
        // Veritabanının Türkçe uyarıları (çok sık başvuru vb.) olduğu gibi gösterilir
        throw new Error(j.message && /[ğüşıöçİ]/i.test(j.message) ? j.message : t.errorText)
      }
      setState('done')
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) {
      setServerError(e instanceof TypeError ? t.errorText : (e as Error).message || t.errorText)
      setState('error')
    }
  }

  const reset = () => {
    setV(EMPTY)
    setErrors({})
    setTouched({})
    setState('idle')
    started.current = Date.now()
  }

  const shell = dark ? 'bg-white text-ink' : 'bg-white text-ink ring-1 ring-line'

  if (state === 'done')
    return (
      <div className={`rounded-3xl p-6 sm:p-10 ${shell} animate-fade-up`} role="status" aria-live="polite">
        <span className="grid size-16 place-items-center rounded-full bg-ok-soft text-ok">
          <CheckCircle2 size={36} />
        </span>
        <h3 className="mt-4 text-2xl font-black sm:text-3xl">{t.successTitle}</h3>
        <p className="mt-2 max-w-xl font-semibold text-ink-soft">{t.successText}</p>
        {t.successSteps.length > 0 && (
          <ol className="mt-6 space-y-3">
            {t.successSteps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 font-bold">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-black text-brand-ink">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        )}
        <button type="button" onClick={reset} className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
          <RotateCcw size={15} />
          Başka bir öğrenci için başvuru yap
        </button>
      </div>
    )

  const err = (k: keyof Values) => (touched[k] || state === 'error' ? errors[k] : undefined)
  const sending = state === 'sending'

  return (
    <form ref={formRef} onSubmit={submit} noValidate className={`rounded-3xl p-5 sm:p-8 ${shell}`} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="text-2xl font-black tracking-tight sm:text-3xl">{t.formTitle}</h3>
      <p className="mt-2 max-w-2xl font-semibold text-ink-soft">{t.formLead}</p>

      {/* Bot tuzağı: kullanıcılar görmez */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Web siteniz
          <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="website" />
        </label>
      </div>

      <fieldset disabled={sending} className="mt-7">
        <Legend n={1}>{t.formStep1}</Legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Text id={`${id}-student`} field="student" label={t.studentLabel} placeholder={t.studentPlaceholder} value={v.student} onChange={(x) => set('student', x)} onBlur={() => blur('student')} error={err('student')} autoComplete="off" />
          <Text id={`${id}-parent`} field="parent" label={t.parentLabel} placeholder={t.parentPlaceholder} value={v.parent} onChange={(x) => set('parent', x)} onBlur={() => blur('parent')} error={err('parent')} autoComplete="name" />
          <Text
            id={`${id}-phone`}
            field="phone"
            label={t.phoneLabel}
            help={t.phoneHelp}
            placeholder="05__ ___ __ __"
            value={v.phone}
            onChange={(x) => set('phone', formatPhone(x))}
            onBlur={() => blur('phone')}
            error={err('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
          />
          <div>
            <p id={`${id}-grade`} className="mb-1.5 text-sm font-extrabold">
              {t.gradeLabel} <Req />
            </p>
            <div role="radiogroup" aria-labelledby={`${id}-grade`} aria-describedby={err('grade') ? `${id}-grade-err` : undefined} className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((g, i) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={v.grade === g}
                  data-field={i === 0 ? 'grade' : undefined}
                  onClick={() => {
                    set('grade', g)
                    setTouched((x) => ({ ...x, grade: true }))
                  }}
                  className={`h-12 rounded-xl text-base font-black ring-1 transition focus-visible:ring-2 focus-visible:ring-brand ${v.grade === g ? 'bg-ink text-white ring-ink' : 'bg-paper text-ink ring-line hover:ring-ink-soft/40'}`}
                >
                  {g}. sınıf
                </button>
              ))}
            </div>
            <Err id={`${id}-grade-err`} msg={err('grade')} />
          </div>
        </div>

        <Legend n={2} className="mt-9">{t.formStep2}</Legend>
        <div className="mt-4 space-y-5">
          <div>
            <p id={`${id}-type`} className="mb-1.5 text-sm font-extrabold">
              {t.lessonTypeLabel} <Req />
            </p>
            <div role="radiogroup" aria-labelledby={`${id}-type`} className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['birebir', t.lessonTypeBirebir, '👩‍🏫'],
                  ['grup', t.lessonTypeGrup, '👧👦'],
                  ['kararsiz', t.lessonTypeKararsiz, '🤔'],
                ] as [LessonType, string, string][]
              ).map(([val, label, e], i) => (
                <Choice
                  key={val}
                  on={v.lessonType === val}
                  field={i === 0 ? 'lessonType' : undefined}
                  onClick={() => {
                    set('lessonType', val)
                    setTouched((x) => ({ ...x, lessonType: true }))
                  }}
                >
                  <span className="text-xl" aria-hidden>
                    {e}
                  </span>
                  {label}
                </Choice>
              ))}
            </div>
            <Err msg={err('lessonType')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p id={`${id}-contact`} className="mb-1.5 text-sm font-extrabold">{t.contactLabel}</p>
              <div role="radiogroup" aria-labelledby={`${id}-contact`} className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-1 lg:grid-cols-2">
                <Choice on={v.contact === 'whatsapp'} onClick={() => set('contact', 'whatsapp')}>
                  <MessageCircle size={18} className="text-ok" />
                  {t.contactWhatsapp}
                </Choice>
                <Choice on={v.contact === 'arama'} onClick={() => set('contact', 'arama')}>
                  <Phone size={18} className="text-brand" />
                  {t.contactArama}
                </Choice>
              </div>
            </div>
            <Text id={`${id}-time`} field="contactTime" label={t.contactTimeLabel} placeholder={t.contactTimePlaceholder} value={v.contactTime} onChange={(x) => set('contactTime', x.slice(0, 120))} optional />
          </div>

          <Long
            id={`${id}-exp`}
            field="expectations"
            label={t.expectationsLabel}
            help={t.expectationsHelp}
            placeholder={t.expectationsPlaceholder}
            value={v.expectations}
            onChange={(x) => set('expectations', x)}
            onBlur={() => blur('expectations')}
            error={err('expectations')}
          />
          <Long id={`${id}-q`} field="questions" label={t.questionsLabel} placeholder={t.questionsPlaceholder} value={v.questions} onChange={(x) => set('questions', x)} optional />

          <div>
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 transition ${err('consent') ? 'bg-bad-soft/50 ring-bad/40' : 'bg-paper ring-line'}`}>
              <input
                type="checkbox"
                data-field="consent"
                checked={v.consent}
                onChange={(e) => {
                  set('consent', e.target.checked)
                  setTouched((x) => ({ ...x, consent: true }))
                }}
                aria-describedby={err('consent') ? `${id}-consent-err` : undefined}
                className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]"
              />
              <span className="flex items-start gap-1.5 text-sm font-semibold text-ink">
                <ShieldCheck size={17} className="mt-px shrink-0 text-ok" />
                {t.consentText}
              </span>
            </label>
            <Err id={`${id}-consent-err`} msg={err('consent')} />
          </div>
        </div>
      </fieldset>

      {state === 'error' && serverError && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-2xl bg-bad-soft p-4 text-sm font-bold text-red-900">
          <AlertTriangle size={18} className="mt-px shrink-0" />
          {serverError}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={sending} className="btn-primary min-h-14 px-7 text-lg shadow-[0_4px_0_var(--color-brand-dark)] disabled:opacity-70">
          {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={19} />}
          {sending ? 'Gönderiliyor…' : state === 'error' ? 'Tekrar dene' : t.submitLabel}
        </button>
        <p className="text-sm font-semibold text-ink-soft">{t.submitNote}</p>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
const Req = () => (
  <span className="text-bad" aria-hidden>
    *
  </span>
)

function Legend({ n, children, className = '' }: { n: number; children: ReactNode; className?: string }) {
  return (
    <legend className={`flex items-center gap-2.5 text-lg font-black ${className}`}>
      <span className="grid size-8 place-items-center rounded-full bg-brand text-sm font-black text-white">{n}</span>
      {children}
    </legend>
  )
}

function Err({ msg, id }: { msg?: string; id?: string }) {
  if (!msg) return null
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-sm font-bold text-bad">
      <AlertTriangle size={14} className="shrink-0" />
      {msg}
    </p>
  )
}

const inputCls = (bad?: boolean) =>
  `w-full rounded-xl bg-white px-4 text-base font-semibold text-ink ring-1 outline-none transition placeholder:font-medium placeholder:text-ink-soft/60 focus:ring-2 disabled:bg-paper ${bad ? 'ring-bad focus:ring-bad' : 'ring-line focus:ring-brand'}`

function Text({
  id, field, label, help, error, optional, value, onChange, onBlur, ...rest
}: { id: string; field: keyof Values; label: string; help?: string; error?: string; optional?: boolean; value: string; onChange: (v: string) => void; onBlur?: () => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'>) {
  const desc = [error ? `${id}-err` : '', help ? `${id}-help` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-extrabold">
        {label} {!optional && <Req />}
      </label>
      <input
        id={id}
        data-field={field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={desc}
        aria-required={!optional}
        className={`${inputCls(!!error)} h-12`}
        {...rest}
      />
      {help && !error && (
        <p id={`${id}-help`} className="mt-1.5 text-xs font-semibold text-ink-soft">
          {help}
        </p>
      )}
      <Err id={`${id}-err`} msg={error} />
    </div>
  )
}

function Long({ id, field, label, help, placeholder, value, onChange, onBlur, error, optional }: { id: string; field: keyof Values; label: string; help?: string; placeholder?: string; value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string; optional?: boolean }) {
  const desc = [error ? `${id}-err` : '', help ? `${id}-help` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <label htmlFor={id} className="text-sm font-extrabold">
          {label} {!optional && <Req />}
        </label>
        <span className={`text-xs font-bold tabular-nums ${value.length > MAX_LONG * 0.9 ? 'text-amber-700' : 'text-ink-soft'}`}>
          {value.length}/{MAX_LONG}
        </span>
      </div>
      {help && (
        <p id={`${id}-help`} className="mb-2 text-xs font-semibold text-ink-soft">
          {help}
        </p>
      )}
      <textarea
        id={id}
        data-field={field}
        rows={4}
        maxLength={MAX_LONG}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={desc}
        aria-required={!optional}
        className={`${inputCls(!!error)} min-h-28 resize-y py-3 leading-relaxed`}
      />
      <Err id={`${id}-err`} msg={error} />
    </div>
  )
}

function Choice({ on, onClick, children, field }: { on: boolean; onClick: () => void; children: ReactNode; field?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      data-field={field}
      onClick={onClick}
      className={`flex min-h-14 items-center gap-2.5 rounded-2xl px-4 py-3 text-left font-extrabold ring-1 transition focus-visible:ring-2 focus-visible:ring-brand ${on ? 'bg-brand-soft text-brand-ink ring-brand' : 'bg-white text-ink ring-line hover:ring-ink-soft/40'}`}
    >
      <span className={`grid size-5 shrink-0 place-items-center rounded-full ring-2 ${on ? 'ring-brand' : 'ring-line'}`} aria-hidden>
        {on && <span className="size-2.5 rounded-full bg-brand" />}
      </span>
      {children}
    </button>
  )
}
