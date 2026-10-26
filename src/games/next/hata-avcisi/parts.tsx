import type { ReactNode } from 'react'
import { Delete } from 'lucide-react'
import { MathText } from '../../../components/MathText'
import type { AgeTier } from '../../kit2'
import type { Col } from './cases'

/** El yazısı benzeri yazı yığını (yeni yazı tipi paketi yüklemeden) */
export const HAND = `'Chalkboard SE', 'Comic Sans MS', 'Segoe Print', 'Bradley Hand', 'Marker Felt', cursive`

export const fmtNum = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 4, useGrouping: false }).replace('-', '−')

/** Oyuna özel animasyonlar */
export const HA_STYLE = `
@keyframes ha-draw { from { stroke-dashoffset: 100 } to { stroke-dashoffset: 0 } }
@keyframes ha-crawl { 0% { transform: translate(90px, 0) rotate(-90deg); opacity: 0 } 15% { opacity: 1 } 65% { transform: translate(0, 0) rotate(-90deg) } 80% { transform: translate(0, 0) rotate(-70deg) } 100% { transform: translate(0, 0) rotate(0deg) } }
@keyframes ha-wiggle { 0%, 100% { transform: rotate(-7deg) } 50% { transform: rotate(7deg) } }
@keyframes ha-sweep { 0% { transform: translate(120px, -40px) scale(.5) rotate(20deg); opacity: 0 } 55% { transform: translate(-8px, 4px) scale(1.12) rotate(-4deg); opacity: 1 } 100% { transform: translate(0, 0) scale(1) rotate(0) } }
@keyframes ha-stamp { 0% { transform: scale(2.4) rotate(-16deg); opacity: 0 } 60% { transform: scale(.92) rotate(-8deg); opacity: 1 } 100% { transform: scale(1) rotate(-8deg); opacity: 1 } }
@keyframes ha-pulse { 0%, 100% { background-color: rgba(251, 191, 36, 0) } 50% { background-color: rgba(251, 191, 36, .28) } }
@keyframes ha-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0) } 50% { box-shadow: 0 0 0 5px rgba(16, 185, 129, .35) } }
@keyframes ha-ink { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
@keyframes ha-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
.ha-pulse { animation: ha-pulse 1.4s ease-in-out infinite }
.ha-glow { animation: ha-glow 1.4s ease-in-out infinite }
.ha-ink { animation: ha-ink .7s ease-out both }
`

/* ───────────────────────── Defter ───────────────────────── */

const paperStyle = (tier: AgeTier): React.CSSProperties =>
  tier === 'atolye'
    ? { backgroundColor: '#fdfdfb', backgroundImage: 'linear-gradient(#e6edf6 1px, transparent 1px), linear-gradient(90deg, #e6edf6 1px, transparent 1px)', backgroundSize: '24px 24px' }
    : tier === 'mini'
      ? { backgroundColor: '#fffbeb' }
      : { backgroundColor: '#fffefa' }

export function Notebook({ tier, owner, face, problem, children, stamp, compact }: { tier: AgeTier; owner: string; face: string; problem?: string; children: ReactNode; stamp?: ReactNode; compact?: boolean }) {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[22px] shadow-[0_10px_30px_-12px_rgba(15,23,42,.35),0_2px_0_rgba(15,23,42,.06)] ring-1 ring-black/5" style={paperStyle(tier)}>
        {/* spiral */}
        {tier !== 'atolye' && (
          <div className="h-6 border-b border-slate-200/80 bg-gradient-to-b from-slate-100 to-white" aria-hidden>
            <div className="mx-auto h-full w-[92%]" style={{ backgroundImage: 'radial-gradient(circle at 50% 70%, #94a3b8 0 3.5px, #e2e8f0 4.5px, transparent 5.5px)', backgroundSize: '26px 100%' }} />
          </div>
        )}
        {/* kırmızı kenar boşluğu çizgisi */}
        <span className={`pointer-events-none absolute top-0 bottom-0 w-[2px] ${compact ? 'left-10' : 'left-12 sm:left-14'} ${tier === 'atolye' ? 'bg-rose-300/70' : 'bg-rose-400/70'}`} aria-hidden />
        <div className={`relative flex items-center gap-2 pr-3 pt-2.5 pb-1 ${compact ? 'pl-12' : 'pl-14 sm:pl-16'}`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-xl shadow ring-1 ring-slate-200" aria-hidden>{face}</span>
          <span className="truncate text-[15px] font-black text-slate-600" style={{ fontFamily: HAND }}>{owner} defteri</span>
        </div>
        {problem && (
          <div className={`relative pr-4 pb-2 ${compact ? 'pl-12' : 'pl-14 sm:pl-16'}`}>
            <p className="text-[11px] font-black tracking-wider text-rose-500 uppercase">Soru</p>
            <p className={`font-extrabold text-slate-800 ${compact ? 'text-[15px]' : 'text-base sm:text-lg'}`}><MathText text={problem} /></p>
          </div>
        )}
        <div className="relative pb-5">{children}</div>
        {stamp}
      </div>
    </div>
  )
}

export type RowState = 'idle' | 'selected' | 'caught' | 'fixed' | 'muted'

export function StepRow({ n, text, state, onTap, tier, fx, fixText, pulse, compact, action, disabled }: { n: number; text: string; state: RowState; onTap?: () => void; tier: AgeTier; fx?: ReactNode; fixText?: string; pulse?: boolean; compact?: boolean; action?: ReactNode; disabled?: boolean }) {
  const size = compact ? 'text-[18px] sm:text-[19px]' : tier === 'mini' ? 'text-[22px] sm:text-[26px]' : 'text-[20px] sm:text-[23px]'
  const minH = compact ? 'min-h-12' : tier === 'mini' ? 'min-h-14' : 'min-h-[52px]'
  const line = tier === 'atolye' ? 'border-slate-300/60 border-dashed' : tier === 'mini' ? 'border-sky-300/70' : 'border-sky-200'
  const ink = tier === 'atolye' ? '#1e3a8a' : '#1e40af'
  const bg = state === 'selected' ? 'bg-amber-100/80' : state === 'caught' || state === 'fixed' ? 'bg-rose-50/70' : ''
  return (
    <div className={`relative flex border-b ${line} ${bg} ${pulse && state === 'idle' ? 'ha-pulse' : ''} transition-colors`}>
      <button
        type="button"
        onClick={onTap}
        disabled={disabled || !onTap}
        aria-pressed={state === 'selected'}
        aria-label={`${n}. adım`}
        className={`flex min-w-0 flex-1 items-center gap-2 text-left ${minH} ${compact ? 'pl-1' : 'pl-2'} pr-3 disabled:cursor-default`}
      >
        <span className={`grid shrink-0 place-items-center rounded-full text-xs font-black ${compact ? 'size-7' : 'size-8 sm:size-9'} ${compact ? 'mr-3' : 'mr-3 sm:mr-4'} ${state === 'selected' ? 'bg-amber-400 text-white' : state === 'caught' || state === 'fixed' ? 'bg-rose-500 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-300'}`}>{n}</span>
        <span className="min-w-0 flex-1 py-1.5">
          <span className={`relative inline-block leading-snug ${size} ${state === 'fixed' ? 'text-rose-400 line-through decoration-rose-500 decoration-[3px]' : ''}`} style={{ fontFamily: HAND, color: state === 'fixed' ? undefined : ink }}>
            <MathText text={text} />
            {(state === 'caught' || state === 'fixed') && <RedCircle />}
          </span>
          {state === 'fixed' && fixText && (
            <span className={`ha-ink mt-0.5 block font-bold leading-snug text-emerald-700 ${size}`} style={{ fontFamily: HAND }}>
              ✓ <MathText text={fixText} />
            </span>
          )}
        </span>
      </button>
      {action && <div className="flex shrink-0 items-center pr-2">{action}</div>}
      {fx && <div className="pointer-events-none flex shrink-0 items-center pr-2">{fx}</div>}
    </div>
  )
}

function RedCircle() {
  return (
    <svg className="pointer-events-none absolute -top-2 -left-4 h-[calc(100%+16px)] w-[calc(100%+32px)] overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
      <path d="M6 22 C 4 4, 94 0, 98 18 C 100 36, 12 42, 2 26 C 0 18, 10 10, 22 8" fill="none" stroke="#e11d48" strokeWidth={2.4} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={100} strokeDasharray={100} style={{ animation: 'ha-draw .65s ease-out both' }} />
    </svg>
  )
}

/** Boş çizgiler (defterin alt kısmı) */
export function BlankLines({ tier, count = 1, compact }: { tier: AgeTier; count?: number; compact?: boolean }) {
  const line = tier === 'atolye' ? 'border-slate-300/60 border-dashed' : tier === 'mini' ? 'border-sky-300/70' : 'border-sky-200'
  return <>{Array.from({ length: count }, (_, i) => <div key={i} className={`border-b ${line} ${compact ? 'h-10' : tier === 'mini' ? 'h-14' : 'h-[52px]'}`} aria-hidden />)}</>
}

/* ───────────────────────── Alt alta işlem ───────────────────────── */

export function ColumnOp({ col, hl, fixed }: { col: Col; hl: number | null; fixed?: number }) {
  const a = String(col.a), b = String(col.b)
  const w = Math.max(a.length, b.length, col.res.length) + 1
  const cells = (s: string) => Array.from({ length: w }, (_, i) => s[s.length - w + i] ?? '')
  const ar = cells(a), br = cells(b), rr = cells(col.res)
  const fr = fixed !== undefined ? cells(String(fixed)) : null
  const place = (i: number) => w - 1 - i // sağdan basamak sırası
  const names = ['birler', 'onlar', 'yüzler', 'binler']
  const cell = 'grid h-12 w-11 place-items-center sm:h-14 sm:w-12'
  return (
    <div className="flex justify-center py-2" style={{ fontFamily: HAND }} aria-label={`${col.a} ${col.op} ${col.b} alt alta işlem, yazılan sonuç ${col.res}`}>
      <div className="relative inline-grid" style={{ gridTemplateColumns: `repeat(${w}, auto)` }}>
        {/* basamak başlıkları */}
        {Array.from({ length: w }, (_, i) => (
          <div key={`h${i}`} className={`grid h-5 place-items-center text-[10px] font-black tracking-wide uppercase ${hl === place(i) ? 'text-amber-600' : 'text-slate-400'}`} style={{ fontFamily: 'inherit' }}>{i === 0 ? '' : names[place(i)] ?? ''}</div>
        ))}
        {/* notlar */}
        {Array.from({ length: w }, (_, i) => (
          <div key={`m${i}`} className="grid h-6 place-items-center text-base font-bold text-rose-500">{col.marks?.[place(i)] ?? ''}</div>
        ))}
        {ar.map((d, i) => (
          <div key={`a${i}`} className={`${cell} relative text-3xl text-blue-900 sm:text-4xl ${hl === place(i) ? 'rounded-t-xl bg-amber-200/60' : ''}`}>
            {d}
            {d && col.cross?.includes(place(i)) && <span className="absolute inset-x-2 top-1/2 h-[3px] -rotate-[24deg] rounded bg-rose-500/80" aria-hidden />}
          </div>
        ))}
        {br.map((d, i) => (
          <div key={`b${i}`} className={`${cell} text-3xl text-blue-900 sm:text-4xl ${hl === place(i) ? 'bg-amber-200/60' : ''}`}>{i === 0 ? <span className="text-slate-500">{col.op}</span> : d}</div>
        ))}
        <div className="h-[3px] rounded bg-blue-900/80" style={{ gridColumn: `1 / span ${w}` }} />
        {rr.map((d, i) => (
          <div key={`r${i}`} className={`${cell} text-3xl sm:text-4xl ${hl === place(i) ? 'rounded-b-xl bg-amber-200/60' : ''} ${fr ? 'text-rose-400 line-through decoration-rose-500' : 'text-blue-900'}`}>{d}</div>
        ))}
        {fr && fr.map((d, i) => (
          <div key={`f${i}`} className={`${cell} ha-ink text-3xl font-bold text-emerald-600 sm:text-4xl`}>{d}</div>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Tuş takımı ───────────────────────── */

export function Keypad({ value, onChange, keys, dark, big }: { value: string; onChange: (v: string) => void; keys: string[]; dark?: boolean; big?: boolean }) {
  const press = (k: string) => {
    if (k === '⌫') return onChange(value.slice(0, -1))
    if (k === '−') return onChange(value.startsWith('−') ? value.slice(1) : '−' + value)
    if (k === ',' && (value.includes(',') || !value.replace('−', ''))) return
    if (value.replace(/[−,]/g, '').length >= 6) return
    onChange(value + k)
  }
  const btn = `${big ? 'h-14 text-2xl' : 'h-12 text-xl'} rounded-2xl font-black transition active:scale-95 ${dark ? 'bg-slate-700 text-white ring-1 ring-slate-500 hover:bg-slate-600' : 'bg-white text-ink shadow-[0_3px_0_#e2e4ee] ring-1 ring-line hover:bg-paper'}`
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  const extra = keys.filter((k) => k === ',' || k === '−')
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Sayı tuşları">
      {digits.map((d) => <button key={d} type="button" className={btn} onClick={() => press(d)}>{d}</button>)}
      {extra.includes('−') ? <button type="button" className={btn} onClick={() => press('−')} aria-label="Eksi işareti">±</button> : <span />}
      <button type="button" className={btn} onClick={() => press('0')}>0</button>
      {extra.includes(',') ? <button type="button" className={btn} onClick={() => press(',')} aria-label="Virgül">,</button> : <button type="button" className={btn} onClick={() => press('⌫')} aria-label="Sil"><Delete className="mx-auto" size={22} /></button>}
      {extra.includes(',') && <button type="button" className={`${btn} col-span-3`} onClick={() => press('⌫')} aria-label="Sil"><Delete className="mx-auto" size={22} /></button>}
    </div>
  )
}

/** "□" yerine yazılan değeri gösteren düzeltme satırı */
export function FixLine({ tpl, value, dark }: { tpl: string; value: string; dark?: boolean }) {
  const [pre, post = ''] = tpl.split('{?}')
  return (
    <div className={`flex min-h-16 flex-wrap items-center justify-center gap-x-2 rounded-2xl px-3 py-2 text-2xl font-bold ${dark ? 'bg-slate-900/60 text-white ring-1 ring-slate-600' : 'bg-white text-blue-900 ring-1 ring-sky-200'}`} style={{ fontFamily: HAND }}>
      {pre && <MathText text={pre.trim()} />}
      <span className={`inline-flex min-w-16 items-center justify-center rounded-xl border-2 border-dashed px-2 py-0.5 ${value ? 'border-emerald-400 text-emerald-600' : dark ? 'border-slate-500' : 'border-sky-300'}`}>
        {value || <span className="h-7 w-[2px] bg-current opacity-60" style={{ animation: 'ha-blink 1s steps(1) infinite' }} />}
      </span>
      {post && <MathText text={post.trim()} />}
    </div>
  )
}

/* ───────────────────────── Yakalama efektleri ───────────────────────── */

export function BugSvg({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <g stroke="#1f2340" strokeWidth={3} strokeLinecap="round">
        <path d="M16 32 L6 28 M16 40 L5 42 M18 48 L9 55 M48 32 L58 28 M48 40 L59 42 M46 48 L55 55" />
        <path d="M26 10 Q22 2 17 4 M38 10 Q42 2 47 4" fill="none" />
      </g>
      <circle cx={17} cy={4} r={2.6} fill="#1f2340" />
      <circle cx={47} cy={4} r={2.6} fill="#1f2340" />
      <ellipse cx={32} cy={40} rx={18} ry={19} fill="#ef4444" stroke="#1f2340" strokeWidth={2.5} />
      <path d="M32 22 V58" stroke="#1f2340" strokeWidth={2.2} />
      <circle cx={24} cy={36} r={3.6} fill="#1f2340" />
      <circle cx={41} cy={34} r={3} fill="#1f2340" />
      <circle cx={23} cy={48} r={2.8} fill="#1f2340" />
      <circle cx={42} cy={48} r={3.4} fill="#1f2340" />
      <circle cx={32} cy={18} r={11} fill="#1f2340" />
      <circle cx={27.5} cy={16} r={4} fill="#fff" />
      <circle cx={36.5} cy={16} r={4} fill="#fff" />
      <circle cx={28.4} cy={16.8} r={2} fill="#1f2340" />
      <circle cx={37.4} cy={16.8} r={2} fill="#1f2340" />
      <circle cx={23.5} cy={22} r={2} fill="#fb7185" opacity={0.9} />
      <circle cx={40.5} cy={22} r={2} fill="#fb7185" opacity={0.9} />
      <path d="M29 23 Q32 25.5 35 23" stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function LensSvg({ size = 50 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x={38} y={40} width={9} height={24} rx={4} transform="rotate(-45 42 52)" fill="#7c2d12" />
      <rect x={39.5} y={38} width={6} height={8} rx={2} transform="rotate(-45 42 42)" fill="#a8a29e" />
      <circle cx={26} cy={26} r={19} fill="rgba(186,230,253,.45)" stroke="#334155" strokeWidth={5} />
      <path d="M15 20 Q18 13 26 12" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.9} />
    </svg>
  )
}

export function CaughtFx({ kind }: { kind: 'bug' | 'lens' }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden rounded-lg bg-rose-500 px-2 py-0.5 text-xs font-black text-white shadow sm:inline-block" style={{ animation: 'ha-stamp .5s .45s cubic-bezier(.34,1.56,.64,1) both' }}>
        {kind === 'bug' ? 'Yakalandı!' : 'Hata bulundu!'}
      </span>
      {kind === 'bug' ? (
        <span className="inline-block" style={{ animation: 'ha-crawl .9s ease-out both' }}>
          <span className="inline-block" style={{ animation: 'ha-wiggle .5s .9s ease-in-out 3' }}><BugSvg size={44} /></span>
        </span>
      ) : (
        <span className="inline-block" style={{ animation: 'ha-sweep .7s ease-out both' }}><LensSvg size={46} /></span>
      )}
    </div>
  )
}

/** Defterin sağ üstüne basılan öğretmen damgası */
export function Stamp({ tone, children, bottom }: { tone: 'ok' | 'bad'; children: ReactNode; bottom?: boolean }) {
  return (
    <div className={`pointer-events-none absolute right-3 z-10 ${bottom ? 'bottom-3' : 'top-3'}`} aria-live="polite">
      <span className={`inline-block rounded-xl border-[3px] px-3 py-1 text-sm font-black tracking-wide uppercase sm:text-base ${tone === 'ok' ? 'border-emerald-600 bg-emerald-50/90 text-emerald-700' : 'border-rose-600 bg-rose-50/90 text-rose-700'}`} style={{ animation: 'ha-stamp .5s cubic-bezier(.34,1.56,.64,1) both', fontFamily: HAND }}>
        {children}
      </span>
    </div>
  )
}
