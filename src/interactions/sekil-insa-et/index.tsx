import { useMemo, useState, type ReactNode } from 'react'
import { Check, Eraser, Hammer, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import type { InteractionProps } from '../types'
import type { Grade } from '../../data/types'
import { BigButton, Scene, useAge, useSolutions } from '../../games/kit2'
import { ZoomBox } from '../../interactive/ZoomBox'
import { useTracker } from '../../lib/trackerContext'
import { sfx } from '../../lib/feedback'
import { analyze, Card, Derived, fitWidth, Header, Layout, MiniPoly, NextButton, Nudge, PegBoard, PickBtn, polyKey, Prompt, Rich, sub, ToolBtn, type Handle, type Pt, type Shape } from './ortak'
import { cardsFor, FREQ_LABEL, type Freq, type ShapeCard } from './cards'

/**
 * 46. Şekil İnşa Et — özellik kartına uyan şekilleri çivili tahtada kur.
 *  - Çiviye dokun → köşe ekle; ilk köşeye dokun → şekli kapat; köşeyi sürükle → değiştir.
 *  - Her kart için birden çok, birbirine eş olmayan şekil istenir (useSolutions).
 *  - Kontrolden sonra özellikler tahtada belirir (dik açı kareleri, paralel oklar, eşit kenar çentikleri).
 *  - 4–5. sınıf: “her zaman / bazen / asla” sorusu ve “yapılamaz mı?” kartı.
 */

const C = '#db2777'
const PAR_COLORS = ['#2563eb', '#16a34a', '#ea580c']
const LETTERS = 'ABCDEFGHIJ'

type Phase = 'build' | 'follow' | 'impossible' | 'done'
type Found = { key: string; pts: Pt[]; name: string }

export default function SekilInsaEt({ grade, onFinish }: InteractionProps) {
  const cards = useMemo(() => cardsFor(grade), [grade])
  const [idx, setIdx] = useState(0)
  const [firsts, setFirsts] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  const sol = useSolutions()
  const card = cards[idx]
  const isLast = idx + 1 >= cards.length

  const complete = (first: boolean) => {
    if (done) return
    setDone(true)
    setFirsts((f) => [...f, first])
  }
  const next = () => {
    setIdx((i) => i + 1)
    setDone(false)
  }
  const finish = () => {
    const f = firsts.filter(Boolean).length
    const insight =
      grade <= 2
        ? 'Şekillerin adını köşe ve kenar sayısı belirler; büyüklüğü, rengi ya da duruşu (eğik olması) değil.'
        : grade === 3
          ? 'Bir şekli kenar sayısı ve köşelerinin türü (dik ya da değil) belirler. Aynı karta uyan birbirinden çok farklı şekiller yapılabilir.'
          : grade === 4
            ? 'Özellikler şekilleri birbirine bağlar: kare, kenarları eşit bir dörtgendir ama her kenarları eşit dörtgen kare değildir. Bazı özellikler birlikte asla olamaz (3 dik açılı dörtgen).'
            : 'Paralellik ve dik açı gibi özellikler dörtgenleri sınıflar: yamukta tek çift, paralelkenarda iki çift paralel kenar vardır. “Her zaman / bazen / asla” sorusu tek bir örnek ya da karşı örnekle yanıtlanabilir.'
    onFinish({
      summary: `${cards.length} özellik kartını tamamladın ve ${sol.list.length} farklı şekil inşa ettin; ${f} kartı ilk denemede çözdün.`,
      insight,
      stars: (f + Math.min(1, sol.list.length / (cards.length * 2))) / (cards.length + 1) >= 0.8 ? 3 : f >= cards.length / 2 ? 2 : 1,
    })
  }

  return (
    <Scene grade={grade}>
      <Header icon={<Hammer size={22} />} color={C} idx={idx} total={cards.length} title="Şekil İnşa Et" extra={sol.list.length > 0 ? <span className="chip bg-amber-100 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200">🏗️ {sol.list.length} şekil</span> : undefined} />
      <Round key={idx} grade={grade} card={card} onAdd={(k, label) => sol.add(`${card.id}:${k}`, label)} onComplete={complete} footer={done ? <NextButton isLast={isLast} onNext={next} onFinish={finish} label="Sonraki kart" /> : null} />
    </Scene>
  )
}

function Round({ grade, card, onAdd, onComplete, footer }: { grade: Grade; card: ShapeCard; onAdd: (key: string, label: string) => boolean; onComplete: (first: boolean) => void; footer: ReactNode }) {
  const track = useTracker()
  const age = useAge(grade)
  const cols = grade <= 2 ? 6 : 8
  const rows = grade <= 2 ? 5 : 6
  const [pts, setPts] = useState<Pt[]>([])
  const [closed, setClosed] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const [found, setFound] = useState<Found[]>([])
  const [fails, setFails] = useState(0)
  const [nudge, setNudge] = useState<{ q: string; mis?: string; id: number } | null>(null)
  const [checked, setChecked] = useState<Shape | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('build')
  const [followPick, setFollowPick] = useState<Freq | null>(null)
  const [followWrong, setFollowWrong] = useState(0)
  const [reasonPick, setReasonPick] = useState<number | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [reasonPickWrong, setReasonPickWrong] = useState(0)
  const building = phase === 'build' || phase === 'impossible'
  const enough = found.length >= card.need

  const ask = (q: string, mis?: string) => setNudge({ q, mis, id: Date.now() })
  const edit = () => {
    setChecked(null)
    setOkMsg(null)
  }

  const onTap = (x: number, y: number) => {
    if (enough || phase !== 'build') return
    if (closed) {
      setHint('Şekil kapandı. Köşeleri sürükleyerek değiştirebilir ya da “Temizle” ile yeniden başlayabilirsin.')
      return
    }
    if (pts.some((p) => p[0] === x && p[1] === y)) return
    setHint(null)
    edit()
    setPts((p) => [...p, [x, y]])
  }
  const onHandleTap = (id: string) => {
    const i = Number(id.slice(1))
    if (!closed && i === 0 && pts.length >= 3) {
      setClosed(true)
      setHint(null)
      sfx.ok()
      return
    }
    if (closed) setSel((s) => (s === i ? null : i))
  }
  const onHandleMove = (id: string, x: number, y: number) => {
    if (enough) return
    const i = Number(id.slice(1))
    edit()
    setPts((p) => p.map((q, j) => (j === i ? [x, y] : q)))
  }
  const undo = () => {
    edit()
    setSel(null)
    if (closed) setClosed(false)
    else setPts((p) => p.slice(0, -1))
  }
  const clear = () => {
    edit()
    setSel(null)
    setClosed(false)
    setPts([])
    setNudge(null)
  }
  const delSel = () => {
    if (sel === null) return
    edit()
    const np = pts.filter((_, j) => j !== sel)
    setPts(np)
    setSel(null)
    if (np.length < 3) setClosed(false)
  }

  const check = () => {
    if (!closed || pts.length < 3) {
      ask('Şeklin henüz kapanmadı. Son olarak ilk köşeye (halkalı olana) dokunarak şekli kapatabilir misin?')
      return
    }
    const s = analyze(pts)
    if (!s.simple || s.n < 3) {
      track.attempt(false)
      setFails((f) => f + 1)
      ask('Kenarların birbirinin üstünden geçiyor. Bir ip gibi düşün: ip kendini kesmeden şekli dolaşabilir mi? Köşelerin sırasını değiştirmeyi dene.')
      return
    }
    setChecked(s)
    setSel(null)
    if (!card.test(s)) {
      track.attempt(false)
      setFails((f) => f + 1)
      const w = card.why(s)
      ask(w.q, w.mis)
      return
    }
    const key = polyKey(s.pts)
    if (found.some((f) => f.key === key)) {
      track.hint()
      ask('Bu şekli zaten yaptın: yalnızca yeri ya da duruşu değişti. Kaydırınca, döndürünce ya da ters çevirince şekil değişmez. Gerçekten farklı bir tane yapabilir misin?')
      return
    }
    track.attempt(true)
    const name = card.name?.(s) ?? s.kind
    onAdd(key, name)
    const nf = [...found, { key, pts: s.pts, name }]
    setFound(nf)
    setNudge(null)
    sfx.ok()
    if (nf.length < card.need) {
      setOkMsg(`Harika, bu bir ${name}! Şimdi ondan farklı bir tane yap.`)
      return
    }
    setOkMsg(nf.length > 1 ? `${nf.length} farklı ${name} inşa ettin! Hepsi aynı karta uyuyor ama birbirinden farklı.` : `Başardın: bu bir ${name}!`)
    if (card.follow && grade >= 4) setPhase('follow')
    else {
      setPhase('done')
      track.item(fails === 0)
      onComplete(fails === 0)
    }
  }

  const newShape = () => {
    clear()
    setOkMsg(null)
  }

  const pickFollow = (f: Freq) => {
    if (!card.follow || followPick === card.follow.answer) return
    setFollowPick(f)
    const ok = f === card.follow.answer
    track.attempt(ok)
    if (ok) {
      sfx.ok()
      setNudge(null)
      setPhase('done')
      const first = fails === 0 && followWrong === 0
      track.item(first)
      onComplete(first)
    } else {
      setFollowWrong((w) => w + 1)
      ask(card.follow.nudge[f] ?? 'Bir örnekle dene: tahtada yapabiliyor musun?', `“${card.follow.q.replace(/\*\*/g, '')}” için “${FREQ_LABEL[f]}” dedi`)
    }
  }

  const sayImpossible = () => {
    if (card.impossible) {
      setPhase('impossible')
      setNudge(null)
      return
    }
    track.attempt(false)
    setFails((f) => f + 1)
    ask(card.tricky ?? 'Bir kez daha dene!', '2 dik açılı her dörtgende paralel kenar olduğunu düşündü')
  }
  const pickReason = (i: number) => {
    const r = card.impossible!.reasons[i]
    setReasonPick(i)
    track.attempt(r.ok)
    if (r.ok) {
      sfx.ok()
      setNudge(null)
      setPhase('done')
      const first = fails === 0 && reasonPickWrong === 0
      track.strategy('Yapılamayacağını gerekçelendirdi')
      track.item(first)
      onComplete(first)
    } else {
      setReasonPickWrong((w) => w + 1)
      ask(r.nudge ?? 'Bir daha düşün.', `3 dik açılı dörtgen için gerekçe: “${r.t}”`)
    }
  }

  // ── Tahta çizimi ──
  const shown = checked ?? null
  const showMarks = !!shown && closed
  const handles: Handle[] = enough
    ? []
    : pts.map((p, i) => ({
        id: `v${i}`,
        x: p[0],
        y: p[1],
        color: sel === i ? '#1f2340' : C,
        label: grade <= 3 ? String(i + 1) : LETTERS[i],
        ring: (!closed && i === 0 && pts.length >= 3) || sel === i,
      }))
  const poly = pts.map((p) => p.join(',')).join(' ')
  const board = (
    <PegBoard cols={cols} rows={rows} handles={handles} onTap={onTap} onHandleTap={onHandleTap} onHandleMove={onHandleMove} locked={!building} handleR={age.big ? 0.32 : 0.28} bg={age.tier === 'mini' ? '#fffdf5' : '#f8fbff'}>
      {pts.length >= 2 && (closed ? <polygon points={poly} fill={`${C}33`} stroke={C} strokeWidth={0.09} strokeLinejoin="round" /> : <polyline points={poly} fill="none" stroke={C} strokeWidth={0.09} strokeLinejoin="round" strokeLinecap="round" />)}
      {!closed && pts.length >= 3 && <line x1={pts[pts.length - 1][0]} y1={pts[pts.length - 1][1]} x2={pts[0][0]} y2={pts[0][1]} stroke={C} strokeWidth={0.05} strokeDasharray="0.15 0.15" opacity={0.6} />}
      {showMarks && shown && <Marks s={shown} grade={grade} />}
    </PegBoard>
  )

  const props = shown ? propChips(shown, grade) : []

  return (
    <Layout
      top={<Prompt emoji={card.emoji} color={C}>{card.text}</Prompt>}
      work={
        <div>
          <div style={fitWidth((cols + 1.4) / (rows + 1.4), 300)}>
            <ZoomBox>{board}</ZoomBox>
          </div>
          {building && !enough && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <ToolBtn onClick={undo} disabled={!pts.length} big={age.big}><Undo2 size={18} />Geri al</ToolBtn>
              {sel !== null && <ToolBtn onClick={delSel} big={age.big}><Trash2 size={18} />Köşeyi sil</ToolBtn>}
              <ToolBtn onClick={clear} disabled={!pts.length} big={age.big}><Eraser size={18} />Temizle</ToolBtn>
            </div>
          )}
          {building && !enough && <p className="mt-2 text-center text-sm font-bold text-ink-soft">
            {closed ? 'Köşeleri sürükleyerek şekli değiştirebilirsin.' : pts.length >= 3 ? 'Şekli kapatmak için halkalı ilk köşeye dokun.' : 'Köşe koymak için çivilere dokun.'}
          </p>}
        </div>
      }
      panel={
        <>
          {!card.impossible && <Card title={`Farklı şekiller: ${found.length} / ${card.need}`}>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: card.need }, (_, i) => (
                <span key={i} className={`grid size-14 place-items-center rounded-xl ring-1 ${found[i] ? 'bg-pink-50 ring-pink-200 animate-pop' : 'bg-paper ring-line'}`}>
                  {found[i] ? <MiniPoly pts={found[i].pts} color={C} size={40} /> : <span className="text-xl text-ink-soft/40">?</span>}
                </span>
              ))}
            </div>
          </Card>}
          {props.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {props.map((p) => <span key={p} className="chip bg-white px-3 py-1 text-sm text-ink ring-1 ring-line">{p}</span>)}
            </div>
          )}
          {hint && !nudge && <p className="rounded-xl bg-white/80 px-3 py-2 text-sm font-bold text-ink-soft ring-1 ring-line">{hint}</p>}
          {nudge && <Nudge key={nudge.id} question={nudge.q} misconception={nudge.mis} tool={grade >= 2 ? 'geoboard' : undefined} onClose={() => setNudge(null)} />}
          {okMsg && <Derived>{okMsg}</Derived>}

          {phase === 'build' && !enough && (
            <div className="flex flex-col gap-2">
              {okMsg && found.length > 0 ? (
                <BigButton onClick={newShape} className="w-full"><RotateCcw size={20} />Farklı bir tane yap</BigButton>
              ) : (
                <BigButton onClick={check} disabled={!closed} className="w-full"><Check size={20} />Kontrol et</BigButton>
              )}
              {(card.impossible || card.tricky) && !okMsg && (
                <button type="button" onClick={sayImpossible} className="btn-ghost min-h-12 w-full">🤔 Bence yapılamaz</button>
              )}
            </div>
          )}

          {phase === 'impossible' && card.impossible && (
            <Card title="Neden yapılamaz?">
              <div className="flex flex-col gap-2">
                {card.impossible.reasons.map((r, i) => (
                  <PickBtn key={i} on={reasonPick === i} onClick={() => pickReason(i)} color={r.ok && reasonPick === i ? '#16a34a' : C} className="text-left text-[15px] leading-snug">{r.t}</PickBtn>
                ))}
              </div>
            </Card>
          )}

          {phase === 'follow' && card.follow && (
            <Card title="Her zaman mı, bazen mi, asla mı?">
              <p className="mb-3 text-[17px] leading-snug font-extrabold"><Rich text={card.follow.q} /></p>
              <div className="grid grid-cols-3 gap-2">
                {(['her', 'bazen', 'asla'] as Freq[]).map((f) => <PickBtn key={f} on={followPick === f} onClick={() => pickFollow(f)} className="text-sm">{FREQ_LABEL[f]}</PickBtn>)}
              </div>
              <p className="mt-2 text-xs font-bold text-ink-soft">İpucu: Tahtada bir örnek ya da karşı örnek yapmayı düşün.</p>
            </Card>
          )}

          {phase === 'done' && card.follow && grade >= 4 && <Derived tone="info">{`${FREQ_LABEL[card.follow.answer]}! ${card.follow.why}`}</Derived>}
          {phase === 'done' && card.impossible && <Derived tone="info">{card.impossible.insight}</Derived>}
          {footer}
        </>
      }
    />
  )
}

function propChips(s: Shape, grade: Grade) {
  const out = [`${s.n} kenar`, `${s.n} köşe`]
  if (s.allEq) out.push('kenarları eşit')
  if (grade >= 3) out.push(`${s.right} dik açı`)
  if (grade >= 4) {
    const dar = s.angles.filter((a) => a === 'dar').length
    const gen = s.angles.filter((a) => a === 'genis').length
    if (dar) out.push(`${dar} dar açı`)
    if (gen) out.push(`${gen} geniş açı`)
  }
  if (grade >= 5) out.push(`${s.parallelPairs} çift paralel kenar`)
  if (grade >= 4 && !s.convex) out.push('iç bükey')
  return out
}

/** Özellik işaretleri: dik açı kareleri, paralel oklar, eşit kenar çentikleri */
function Marks({ s, grade }: { s: Shape; grade: Grade }) {
  const p = s.pts
  const n = p.length
  const out: ReactNode[] = []
  const unit = (v: Pt): Pt => { const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l] }
  // dik açılar
  if (grade >= 3)
    p.forEach((q, i) => {
      if (s.angles[i] !== 'dik') return
      const a = unit(sub(p[(i + n - 1) % n], q)), b = unit(sub(p[(i + 1) % n], q))
      const k = 0.46
      const d = `M${q[0] + a[0] * k},${q[1] + a[1] * k} L${q[0] + (a[0] + b[0]) * k},${q[1] + (a[1] + b[1]) * k} L${q[0] + b[0] * k},${q[1] + b[1] * k}`
      out.push(<path key={`r${i}`} d={d} fill="none" stroke="#1f2340" strokeWidth={0.045} />)
    })
  // paralel kenarlar
  if (grade >= 5) {
    const cls: number[] = Array(n).fill(-1)
    let c = 0
    for (let i = 0; i < n; i++) {
      if (cls[i] >= 0) continue
      const mates = []
      for (let j = i + 1; j < n; j++) if (cls[j] < 0 && s.sides[i][0] * s.sides[j][1] - s.sides[i][1] * s.sides[j][0] === 0) mates.push(j)
      if (!mates.length) continue
      cls[i] = c
      mates.forEach((j) => (cls[j] = c))
      c++
    }
    cls.forEach((k, i) => {
      if (k < 0) return
      const a = p[i], b = p[(i + 1) % n]
      const col = PAR_COLORS[k % PAR_COLORS.length]
      const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      let u = unit(sub(b, a))
      if (u[0] < -1e-9 || (Math.abs(u[0]) < 1e-9 && u[1] < 0)) u = [-u[0], -u[1]]
      const nrm: Pt = [-u[1], u[0]]
      const tip: Pt = [m[0] + u[0] * 0.16, m[1] + u[1] * 0.16]
      out.push(
        <g key={`p${i}`}>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={col} strokeWidth={0.1} strokeLinecap="round" />
          {Array.from({ length: k + 1 }, (_, t) => {
            const o = (t - k / 2) * 0.2
            const tp: Pt = [tip[0] + u[0] * o, tip[1] + u[1] * o]
            return <path key={t} d={`M${tp[0] - u[0] * 0.2 + nrm[0] * 0.14},${tp[1] - u[1] * 0.2 + nrm[1] * 0.14} L${tp[0]},${tp[1]} L${tp[0] - u[0] * 0.2 - nrm[0] * 0.14},${tp[1] - u[1] * 0.2 - nrm[1] * 0.14}`} fill="none" stroke={col} strokeWidth={0.07} strokeLinecap="round" strokeLinejoin="round" />
          })}
        </g>,
      )
    })
  }
  // eşit kenar çentikleri
  if (grade >= 2) {
    const groups = new Map<number, number[]>()
    s.lens.forEach((l, i) => groups.set(l, [...(groups.get(l) ?? []), i]))
    let g = 0
    for (const [, ids] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
      if (ids.length < 2) continue
      g++
      const ticks = g
      ids.forEach((i) => {
        const a = p[i], b = p[(i + 1) % n]
        const u = unit(sub(b, a))
        const nrm: Pt = [-u[1], u[0]]
        const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        for (let t = 0; t < ticks; t++) {
          const o = (t - (ticks - 1) / 2) * 0.12 - (grade >= 5 ? 0.3 : 0)
          const c: Pt = [m[0] + u[0] * o, m[1] + u[1] * o]
          out.push(<line key={`t${i}-${t}`} x1={c[0] - nrm[0] * 0.15} y1={c[1] - nrm[1] * 0.15} x2={c[0] + nrm[0] * 0.15} y2={c[1] + nrm[1] * 0.15} stroke="#7c2d12" strokeWidth={0.05} strokeLinecap="round" />)
        }
      })
      if (g >= 3) break
    }
  }
  return <g pointerEvents="none">{out}</g>
}
