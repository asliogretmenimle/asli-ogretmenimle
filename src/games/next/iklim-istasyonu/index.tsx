import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, HelpCircle, Lightbulb, RotateCcw } from 'lucide-react'
import type { Grade } from '../../../data/types'
import { MathText } from '../../../components/MathText'
import { useTracker } from '../../../lib/trackerContext'
import { sfx } from '../../../lib/feedback'
import { starsFor, type GameProps } from '../../kit'
import { BigButton, LevelDots, Nudge, Scene, SolutionList, StrategyPicker, TaskCard, useAge, useSolutions } from '../../kit2'
import { ART_CSS, StationBanner } from './art'
import { makeG5 } from './missions5'
import { makeG6 } from './missions6'
import { makeG7 } from './missions7'
import { inkFor, type Api, type Mission, type NudgeOpts } from './ui'

/**
 * İklim İstasyonu (5–7. sınıf) — Van de Walle: veriyi topla → düzenle → göster → yorumla → karar ver.
 *  5. sınıf: kategorik veri (hava türleri): takvimden çeteleye ve sütun grafiğine, ölçek seçimi, karşılaştırma,
 *            veriye dayalı tahmin ve gerekçe, yorum ayıklama, ipuçlarından birden çok grafik.
 *  6. sınıf: kesikli nicel veri: ortalama = eşit paylaşım (kuleleri dengele / topla-böl), aynı ortalamalı farklı veriler,
 *            çizgi grafiği, açıklık, yanıltıcı eksen, 10 yıllık veriden tahmin (iki uygun gösterim).
 *  7. sınıf: tam sayılar ve sürekli veri: termometrede değişim (−3 → 5 = +8), şehirler arası fark, değişim hızı,
 *            aykırı değer (ortalama mı ortanca mı), iki şehri birden çok ölçüyle karşılaştırma, trendden tahmin.
 * Farklı geçerli yollar/kanıtlar useSolutions ile sayılır.
 */

function makeMissions(grade: Grade): Mission[] {
  if (grade <= 5) return makeG5()
  if (grade === 6) return makeG6()
  return makeG7()
}

const INSIGHT: Record<number, string> = {
  5: 'Karışık veriyi çetele ve sütun grafiğiyle düzenleyince en sık görülen hemen ortaya çıkar. Aynı veri farklı ölçeklerle çizilebilir; veri bize kesin olanı değil, daha olası olanı söyler.',
  6: 'Ortalama, toplamın eşit paylaşılmasıdır: fazlalıklar eksikleri doldurur. Aynı ortalamalı veriler çok farklı yayılabilir; bu yüzden açıklığa ve eksenin nereden başladığına da bakarız.',
  7: 'Sıcaklık değişimi termometrede bir uzaklıktır: −3’ten 5’e çıkmak +8 derecedir. Aykırı değer ortalamayı çeker ama ortancayı pek etkilemez; değişim hızı, değişimin geçen süreye bölünmesidir.',
}

/** lg (≥ 1024 px): geri bildirim sağ panelde, değilse görev alanının altında */
function useWide() {
  const q = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const fn = () => setWide(m.matches)
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])
  return wide
}

type NudgeState = ({ q: string; id: number } & NudgeOpts) | null

export default function IklimIstasyonu({ grade, onFinish }: GameProps) {
  const age = useAge(grade)
  const dark = age.tier === 'atolye'
  const ink = inkFor(dark)
  const [missions] = useState(() => makeMissions(grade))
  const track = useTracker()
  const sol = useSolutions()
  const wide = useWide()
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [nudge, setNudge] = useState<NudgeState>(null)
  const [say, setSay] = useState(dark ? 'İSTASYON ÇEVRİMİÇİ. Veriler geliyor…' : 'İstasyona hoş geldin! Ölçümler seni bekliyor.')
  const [hintN, setHintN] = useState(0)
  const [runKey, setRunKey] = useState(0)
  const nid = useRef(0)
  const stat = useRef({ fails: 0, hints: 0, itemDone: false })
  const totals = useRef({ first: 0, paths: 0 })
  const topRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const M = missions[idx]

  const api: Api = useMemo(
    () => ({
      grade,
      ink,
      dark,
      check: (ok) => {
        track.attempt(ok)
        if (!ok) {
          stat.current.fails++
          sfx.bad()
        }
      },
      nudge: (q, o) => {
        const tone = o?.tone ?? 'think'
        const tool = o?.tool ?? (tone === 'think' ? M.tool?.id : undefined)
        setNudge({ q, ...o, tone, tool, toolConfig: o?.toolConfig ?? (tool === M.tool?.id ? M.tool?.config : undefined), toolTitle: o?.toolTitle ?? (tool === M.tool?.id ? M.tool?.title : undefined), id: ++nid.current })
      },
      clear: () => setNudge(null),
      found: (key, label) => {
        const fresh = sol.add(`${M.key}:${key}`, label)
        if (fresh) totals.current.paths++
        return fresh
      },
      strategy: (s) => track.strategy(s),
      say: (t) => setSay(t),
      complete: () => setDone(true),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grade, dark, idx, sol.add, track],
  )

  // görev bitince tek seferlik öğe kaydı
  useEffect(() => {
    if (done && !stat.current.itemDone) {
      stat.current.itemDone = true
      const first = stat.current.fails === 0 && stat.current.hints === 0
      track.item(first)
      if (first) totals.current.first++
      sfx.win()
      // alt alta yerleşimde (dikey tablet, telefon) sonuç kartını görünür yap
      if (!window.matchMedia('(min-width: 1024px)').matches) setTimeout(() => asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 700)
    }
  }, [done, track])

  const hints = M.hints
  const hint = () => {
    if (hintN >= hints.length) return
    setHintN((h) => h + 1)
    stat.current.hints++
    track.hint()
  }

  const next = () => {
    if (idx + 1 >= missions.length) {
      const n = missions.length
      const f = totals.current.first
      const extra = Math.max(0, totals.current.paths - n)
      const ratio = Math.min(1, (f + 0.55 * (n - f)) / n + Math.min(0.12, extra * 0.03))
      onFinish({
        stars: starsFor(ratio),
        summary: `${n} görev tamamlandı · İlk denemede: ${f} · Bulunan farklı yol ve kanıt: ${totals.current.paths}`,
        score: f * 100 + (n - f) * 60 + totals.current.paths * 15,
        insight: INSIGHT[grade] ?? INSIGHT[5],
      })
      return
    }
    setIdx((i) => i + 1)
    setDone(false)
    setNudge(null)
    setHintN(0)
    sol.reset()
    stat.current = { fails: 0, hints: 0, itemDone: false }
    setSay(dark ? `YENİ GÖREV: ${missions[idx + 1].title.toLocaleUpperCase('tr-TR')}` : `Yeni görev: ${missions[idx + 1].title}`)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const restart = () => {
    setRunKey((k) => k + 1)
    setNudge(null)
    sol.reset()
    setSay('Görev baştan başladı. Bu kez başka bir yol deneyebilirsin!')
  }

  const nudgeView = nudge && (
    <div className="[&_p]:min-w-[11rem]">
      <Nudge key={nudge.id} question={nudge.q} tool={nudge.tool} toolConfig={nudge.toolConfig} toolTitle={nudge.toolTitle} misconception={nudge.misc} tone={nudge.tone} onClose={() => setNudge(null)} />
    </div>
  )

  const panelCls = dark ? 'bg-slate-900/90 text-slate-100 ring-1 ring-slate-700' : 'bg-white/95 text-ink ring-1 ring-line'

  return (
    <div ref={topRef} className="grid scroll-mt-20 gap-3 select-none lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-4">
      <style>{ART_CSS}</style>
      <div className="lg:col-start-2 lg:row-start-1">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className={`text-sm font-black ${dark ? 'text-cyan-700' : 'text-cyan-800'}`}>Görev {idx + 1}/{missions.length} · {M.title}</span>
          <LevelDots current={idx} total={missions.length} />
        </div>
        <TaskCard step={idx + 1} total={missions.length} tone={dark ? 'dark' : 'brand'}>{M.prompt}</TaskCard>
      </div>

      <Scene grade={grade} className="min-w-0 !p-2.5 sm:!p-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        {dark && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,rgba(34,211,238,0.10),transparent_55%),radial-gradient(ellipse_at_90%_100%,rgba(167,139,250,0.08),transparent_50%)]" />}
        <div className="relative">
          <StationBanner dark={dark} say={say} title={M.title} sub={`İklim İstasyonu · ${grade}. sınıf`} />
          <div key={`${idx}-${runKey}`} className="animate-fade-up">{M.render(api)}</div>
          {!wide && nudgeView}
        </div>
      </Scene>

      <aside ref={asideRef} className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-2">
        {wide && nudgeView}
        {sol.list.length > 0 || (M.goal ?? 0) > 1 ? <SolutionList list={sol.list} goal={M.goal && M.goal > 1 && sol.list.length <= M.goal ? M.goal : undefined} /> : null}
        {done ? (
          <div className="rounded-2xl bg-ok-soft p-4 text-green-900 ring-1 ring-green-200 animate-fade-up">
            <p className="text-lg font-black">🎉 {M.goal && M.goal > 1 ? `${sol.list.length} farklı yol buldun!` : 'Görev tamam!'}</p>
            <p className="mt-1 font-bold"><MathText text={M.note} /></p>
            {M.picker && <StrategyPicker question={M.picker.q} options={M.picker.options} onPick={() => undefined} />}
            <BigButton onClick={next} className="mt-3 w-full">{idx + 1 >= missions.length ? 'İstasyonu kapat' : 'Sonraki görev'}<ArrowRight size={20} /></BigButton>
            {M.goal && M.goal > 1 ? <p className="mt-2 text-center text-sm font-bold text-green-800">İstersen başka yollar bulmaya devam edebilirsin.</p> : null}
          </div>
        ) : (
          <div className={`rounded-2xl p-3 ${panelCls}`}>
            <div className="flex gap-2">
              <button type="button" onClick={hint} disabled={hintN >= hints.length} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 font-extrabold ring-1 transition active:scale-95 disabled:opacity-50 ${dark ? 'bg-slate-800 ring-slate-600' : 'bg-white ring-line'}`}>
                <Lightbulb size={18} className="text-amber-500" />{hintN ? 'Bir ipucu daha' : 'İpucu'}
              </button>
              <button type="button" onClick={restart} className={`inline-flex min-h-12 items-center gap-1.5 rounded-xl px-4 font-extrabold ring-1 transition active:scale-95 ${dark ? 'bg-slate-800 ring-slate-600' : 'bg-white ring-line'}`} aria-label="Görevi baştan başlat">
                <RotateCcw size={18} />Baştan
              </button>
            </div>
            {hints.slice(0, hintN).map((h, i) => (
              <p key={i} className={`mt-2 flex gap-2 rounded-xl p-2.5 text-sm font-bold animate-fade-up ${dark ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-900'}`}>
                <HelpCircle size={16} className="mt-0.5 shrink-0" /><MathText text={h} />
              </p>
            ))}
            {hintN === 0 && <p className={`mt-2 text-xs font-bold ${dark ? 'text-slate-400' : 'text-ink-soft'}`}>Takılırsan ipucu iste: sana cevabı değil, düşündüren bir soru sorar.</p>}
          </div>
        )}
      </aside>
    </div>
  )
}
