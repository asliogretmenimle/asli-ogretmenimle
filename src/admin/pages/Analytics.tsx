/** Ziyaret analizi: kaç kişi girdi, hangi sayfalara baktı, nereden geldi */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus, RefreshCw } from 'lucide-react'
import { cachedActivity, gradeFromId, loadGrade } from '../../data/activityStore'
import { SITE_NAME, seoForPath } from '../../lib/seo'
import { getNoTrack, setNoTrack } from '../../cms/analytics'
import { sb } from '../supabase'
import { Button, Callout, Card, Empty, PageHead, Segmented, Toggle, cx } from '../ui'

// ---------------------------------------------------------------------------
// Veri
// ---------------------------------------------------------------------------
interface Totals {
  views: number
  visitors: number
  sessions: number
}
interface Report {
  days: number
  from: string
  totals: Totals
  previous: Totals
  live: number
  daily: { day: string; views: number; visitors: number }[]
  pages: { path: string; views: number; visitors: number }[]
  sections: { section: string; views: number; visitors: number }[]
  referrers: { referrer: string; views: number }[]
  devices: { device: string; views: number; visitors: number }[]
  hours: { hour: number; views: number }[]
}

type Period = '1' | '7' | '30' | '90'
const PERIODS: { value: Period; label: string }[] = [
  { value: '1', label: 'Bugün' },
  { value: '7', label: '7 gün' },
  { value: '30', label: '30 gün' },
  { value: '90', label: '90 gün' },
]

/** Grafik renkleri (dataviz referans paleti, açık tema): tek seri mavi; cihazlar ilk üç kategorik yuva */
const C = {
  series: '#257de0',
  seriesSoft: 'rgba(37,125,224,0.12)',
  grid: '#e6e8ee',
  axis: '#5d6475',
  cat: ['#257de0', '#f47230', '#00b894'],
}

const nf = new Intl.NumberFormat('tr-TR')
const fmt = (n: number) => nf.format(Math.round(n))
const fmtShort = (n: number) => (n >= 10000 ? `${nf.format(Math.round(n / 1000))} B` : nf.format(n))

const SECTION_LABEL: Record<string, string> = {
  anasayfa: 'Ana sayfa',
  oyun: 'Oyunlar (oyun sayfası)',
  oyunlar: 'Oyunlar (liste)',
  etkinlik: 'Etkinlikler',
  etkilesim: 'Etkileşimler (sayfa)',
  etkilesimler: 'Etkileşimler (liste)',
  manipulatif: 'Manipülatifler (araç)',
  manipulatifler: 'Manipülatifler (liste)',
  rehber: 'Konu anlatımı',
  test: 'Test çöz',
  sinif: 'Sınıf ve tema sayfaları',
  'carpim-tablosu': 'Çarpım tablosu',
  'online-ozel-ders': 'Online özel ders',
  yaklasim: 'Yaklaşımımız',
  tuval: 'Tuval (Polypad)',
  rapor: 'Öğrenci raporu',
}
const DEVICE_LABEL: Record<string, string> = { mobile: 'Telefon', tablet: 'Tablet', desktop: 'Bilgisayar' }

const brand = new RegExp(`\\s*[|–-]\\s*${SITE_NAME}$`)
function pageTitle(path: string) {
  if (path === '/') return 'Ana sayfa'
  try {
    const s = seoForPath(path, cachedActivity)
    if (s?.title) return s.title.replace(brand, '')
  } catch {
    /* yol çözülemedi */
  }
  return path
}

function change(cur: number, prev: number): { pct: number | null; dir: 'up' | 'down' | 'flat' } {
  if (!prev) return { pct: cur ? null : 0, dir: cur ? 'up' : 'flat' }
  const pct = ((cur - prev) / prev) * 100
  return { pct, dir: Math.abs(pct) < 0.5 ? 'flat' : pct > 0 ? 'up' : 'down' }
}

// ---------------------------------------------------------------------------
// Sayfa
// ---------------------------------------------------------------------------
export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30')
  const [data, setData] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [noTrack, setNoTrackState] = useState(getNoTrack)
  const [, setTitlesReady] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    sb.rpc('cms_analytics', { p_days: Number(period) }).then(({ data, error }) => {
      if (!alive) return
      setLoading(false)
      if (error) {
        setError(/function .*cms_analytics|schema cache|Could not find/i.test(error.message) ? 'missing' : error.message)
        return
      }
      setData(data as Report)
    })
    return () => {
      alive = false
    }
  }, [period, tick])

  // Canlı sayı ve tablo dakikada bir tazelensin
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  // Etkinlik sayfalarının başlıkları için ilgili sınıf verisini yükle
  useEffect(() => {
    if (!data) return
    const gs = new Set(data.pages.map((p) => /^\/etkinlik\/(.+)$/.exec(p.path)?.[1]).filter(Boolean).map((id) => gradeFromId(id!)).filter((g): g is NonNullable<typeof g> => !!g))
    if (!gs.size) return
    Promise.all([...gs].map((g) => loadGrade(g).catch(() => null))).then(() => setTitlesReady((x) => x + 1))
  }, [data])

  const empty = data && data.totals.views === 0

  return (
    <div className="space-y-6">
      <PageHead
        title="Analiz"
        desc="Siteye kaç kişinin girdiği, hangi sayfalara baktığı ve nereden geldiği. Çerez kullanılmaz, IP adresi saklanmaz."
        actions={
          <>
            {data && <LiveBadge n={data.live} />}
            <Segmented value={period} onChange={setPeriod} options={PERIODS} />
            <Button variant="ghost" icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} onClick={() => setTick((x) => x + 1)} aria-label="Yenile">
              <span className="hidden sm:inline">Yenile</span>
            </Button>
          </>
        }
      />

      {error === 'missing' ? (
        <Callout tone="amber" title="Analiz tabloları kurulmamış">
          Supabase → SQL Editor’de <code className="rounded bg-white/70 px-1">supabase/migrations/20261126140000_cms_v2.sql</code> dosyasını çalıştırın, sonra bu sayfayı yenileyin.
        </Callout>
      ) : error ? (
        <Callout tone="red" title="Veri alınamadı">{error}</Callout>
      ) : null}

      {!error && (
        <>
          <KpiRow data={data} loading={loading && !data} />

          {empty ? (
            <Empty title="Henüz ziyaret verisi yok" desc="Site yayında ziyaret aldıkça burada görünür. Bu dönemde kayıtlı görüntüleme bulunmuyor." />
          ) : (
            <>
              <TrendCard data={data} />
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <TopPages data={data} />
                <div className="min-w-0 space-y-6">
                  <SectionsCard data={data} />
                  <DevicesCard data={data} />
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
                <ReferrersCard data={data} />
                <HoursCard data={data} />
              </div>
            </>
          )}
        </>
      )}

      <Card>
        <Toggle
          checked={noTrack}
          onChange={(v) => {
            setNoTrack(v)
            setNoTrackState(v)
          }}
          label="Bu tarayıcıdaki ziyaretlerimi sayma"
          help="Siteyi kendiniz gezerken istatistikleri şişirmemek için açın. Yalnızca bu tarayıcıyı etkiler."
        />
      </Card>
    </div>
  )
}

function LiveBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-extrabold ring-1 ring-line" title="Son 5 dakikada sayfa açan tekil ziyaretçi">
      <span className="relative flex size-2.5">
        {n > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />}
        <span className={cx('relative inline-flex size-2.5 rounded-full', n > 0 ? 'bg-ok' : 'bg-line')} />
      </span>
      Şu an sitede: <span className="tabular-nums">{fmt(n)}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------
function KpiRow({ data, loading }: { data: Report | null; loading: boolean }) {
  const t = data?.totals
  const p = data?.previous
  const pps = (x?: Totals) => (x && x.sessions ? x.views / x.sessions : 0)
  const tiles = [
    { label: 'Görüntülenme', cur: t?.views ?? 0, prev: p?.views ?? 0, show: fmt },
    { label: 'Tekil ziyaretçi', cur: t?.visitors ?? 0, prev: p?.visitors ?? 0, show: fmt },
    { label: 'Oturum', cur: t?.sessions ?? 0, prev: p?.sessions ?? 0, show: fmt },
    { label: 'Sayfa / oturum', cur: pps(t), prev: pps(p), show: (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {tiles.map((k) => {
        const ch = change(k.cur, k.prev)
        return (
          <div key={k.label} className="rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
            <p className="text-sm font-bold text-ink-soft">{k.label}</p>
            {loading ? (
              <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-paper" />
            ) : (
              <p className="mt-1 text-[28px] leading-tight font-black tabular-nums sm:text-[32px]">{k.show(k.cur)}</p>
            )}
            {!loading && data && (
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-ink-soft">
                <span className={cx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5', ch.dir === 'up' ? 'bg-ok-soft text-green-800' : ch.dir === 'down' ? 'bg-bad-soft text-red-800' : 'bg-paper')}>
                  {ch.dir === 'up' ? <ArrowUpRight size={13} /> : ch.dir === 'down' ? <ArrowDownRight size={13} /> : <Minus size={13} />}
                  {ch.pct === null ? 'yeni' : `%${Math.abs(ch.pct).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
                </span>
                <span className="truncate">{data.days === 1 ? 'düne göre' : 'önceki döneme göre'}</span>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Zaman grafiği (tek seri: seçilen ölçü)
// ---------------------------------------------------------------------------
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Okunaklı eksen: yaklaşık 4 aralık, 1-2-2,5-5 adımları */
function niceScale(v: number) {
  if (v <= 4) return { max: 4, step: 1 }
  const raw = v / 4
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / p
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
  return { max: Math.ceil(v / step) * step, step }
}

const dayLabel = (iso: string, long = false) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return d.toLocaleDateString('tr-TR', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' })
}

function TrendCard({ data }: { data: Report | null }) {
  const [metric, setMetric] = useState<'visitors' | 'views'>('visitors')
  const hourly = data?.days === 1
  const points = useMemo(() => {
    if (!data) return []
    if (hourly) {
      const byH = new Map(data.hours.map((h) => [h.hour, h.views]))
      return Array.from({ length: 24 }, (_, h) => ({ key: `${h}`, label: `${String(h).padStart(2, '0')}:00`, long: `${String(h).padStart(2, '0')}:00 – ${String(h).padStart(2, '0')}:59`, views: byH.get(h) ?? 0, visitors: null as number | null }))
    }
    return data.daily.map((d) => ({ key: d.day, label: dayLabel(d.day), long: dayLabel(d.day, true), views: d.views, visitors: d.visitors as number | null }))
  }, [data, hourly])
  const m = hourly ? 'views' : metric
  return (
    <Card
      title={hourly ? 'Bugün saat saat' : m === 'visitors' ? 'Günlük tekil ziyaretçi' : 'Günlük görüntülenme'}
      desc={hourly ? 'Görüntülenme (Türkiye saati)' : 'Türkiye saatiyle günlere göre'}
      action={
        !hourly && (
          <Segmented
            size="sm"
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'visitors', label: 'Ziyaretçi' },
              { value: 'views', label: 'Görüntülenme' },
            ]}
          />
        )
      }
    >
      {!data ? <div className="h-64 animate-pulse rounded-xl bg-paper" /> : <TimeChart points={points} metric={m} bars={hourly || points.length <= 8} />}
    </Card>
  )
}

interface Pt {
  key: string
  label: string
  long: string
  views: number
  visitors: number | null
}

function TimeChart({ points, metric, bars }: { points: Pt[]; metric: 'views' | 'visitors'; bars: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = 240
  const pad = { l: 40, r: 12, t: 12, b: 28 }
  const w = Math.max(0, width)
  const iw = Math.max(1, w - pad.l - pad.r)
  const ih = H - pad.t - pad.b
  const val = (p: Pt) => (metric === 'visitors' ? p.visitors ?? 0 : p.views)
  const { max, step } = niceScale(Math.max(1, ...points.map(val)))
  const n = points.length
  const x = (i: number) => (bars ? pad.l + (iw / n) * (i + 0.5) : pad.l + (n <= 1 ? iw / 2 : (iw * i) / (n - 1)))
  const y = (v: number) => pad.t + ih - (v / max) * ih
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step)
  // X etiketleri: çakışmasın diye seyrek
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))))
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val(p)).toFixed(1)}`).join('')
  const area = n ? `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : ''
  const bw = Math.min(24, Math.max(3, (iw / n) * 0.6))

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    let best = 0
    let bd = Infinity
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x(i) - px)
      if (d < bd) {
        bd = d
        best = i
      }
    }
    setHover(best)
  }

  const hp = hover !== null ? points[hover] : null
  const tipLeft = hp ? Math.min(Math.max(x(hover!) - 90, 0), Math.max(0, w - 180)) : 0

  return (
    <div ref={ref} className="relative w-full select-none">
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Zamana göre ziyaret grafiği" onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-pan-y">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth={1} strokeDasharray={t === 0 ? undefined : '2 4'} />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fontWeight={700} fill={C.axis} className="tabular-nums">
                {fmtShort(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            (i % labelEvery === 0 && (i === n - 1 || n - 1 - i >= labelEvery * 0.75)) || i === n - 1 ? (
              <text key={p.key} x={x(i)} y={H - 8} textAnchor={!bars && i === 0 ? 'start' : !bars && i === n - 1 ? 'end' : 'middle'} fontSize={11} fontWeight={700} fill={C.axis}>
                {p.label}
              </text>
            ) : null,
          )}
          {bars ? (
            points.map((p, i) => {
              const v = val(p)
              const top = y(v)
              const hgt = Math.max(0, y(0) - top)
              const r = Math.min(4, hgt)
              const x0 = x(i) - bw / 2
              return (
                <path
                  key={p.key}
                  d={`M${x0},${y(0)}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + bw - r}Q${x0 + bw},${top} ${x0 + bw},${top + r}V${y(0)}Z`}
                  fill={C.series}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )
            })
          ) : (
            <>
              <path d={area} fill={C.seriesSoft} />
              <path d={line} fill="none" stroke={C.series} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          {hp && (
            <>
              {!bars && <line x1={x(hover!)} x2={x(hover!)} y1={pad.t} y2={y(0)} stroke={C.axis} strokeOpacity={0.35} strokeWidth={1} />}
              {!bars && <circle cx={x(hover!)} cy={y(val(hp))} r={4.5} fill={C.series} stroke="#fff" strokeWidth={2} />}
            </>
          )}
        </svg>
      )}
      {hp && (
        <div className="pointer-events-none absolute top-0 z-10 w-[180px] rounded-xl bg-white px-3 py-2 text-xs shadow-[var(--shadow-lift)] ring-1 ring-line" style={{ left: tipLeft }}>
          <p className="font-extrabold text-ink">{hp.long}</p>
          {hp.visitors !== null && (
            <p className="mt-1 flex items-center justify-between gap-2 font-bold text-ink-soft">
              <span className="flex items-center gap-1.5">
                {metric === 'visitors' && <span className="size-2 rounded-full" style={{ background: C.series }} />}Ziyaretçi
              </span>
              <span className="text-ink tabular-nums">{fmt(hp.visitors)}</span>
            </p>
          )}
          <p className="mt-0.5 flex items-center justify-between gap-2 font-bold text-ink-soft">
            <span className="flex items-center gap-1.5">
              {metric === 'views' && <span className="size-2 rounded-full" style={{ background: C.series }} />}Görüntülenme
            </span>
            <span className="text-ink tabular-nums">{fmt(hp.views)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Listeler
// ---------------------------------------------------------------------------
function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-7 animate-pulse rounded-lg bg-paper" />
      ))}
    </div>
  )
}

/** Değer çubuğu: metin + arkasında ince oran çubuğu */
function BarRow({ label, sub, value, max, right, href }: { label: ReactNode; sub?: ReactNode; value: number; max: number; right?: ReactNode; href?: string }) {
  const pct = max ? Math.max(1.5, (value / max) * 100) : 0
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-extrabold text-ink">{label}</span>
        <span className="shrink-0 text-sm font-black text-ink tabular-nums">{right ?? fmt(value)}</span>
      </div>
      {sub && <p className="truncate text-xs font-semibold text-ink-soft">{sub}</p>}
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.series }} />
      </div>
    </>
  )
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="group block rounded-xl px-2 py-1.5 hover:bg-paper/70">
      {body}
    </a>
  ) : (
    <div className="px-2 py-1.5">{body}</div>
  )
}

function TopPages({ data }: { data: Report | null }) {
  const [all, setAll] = useState(false)
  const list = data?.pages ?? []
  const shown = all ? list : list.slice(0, 10)
  const max = list[0]?.views ?? 0
  return (
    <Card title="En çok ziyaret edilen sayfalar" desc="Görüntülenme · tekil ziyaretçi" pad={false}>
      {!data ? (
        <div className="p-5">
          <Skeleton rows={8} />
        </div>
      ) : !list.length ? (
        <p className="p-5 text-sm font-semibold text-ink-soft">Bu dönemde veri yok.</p>
      ) : (
        <>
          <ol className="divide-y divide-line">
            {shown.map((p, i) => (
              <li key={p.path} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="w-5 shrink-0 text-right text-xs font-black text-ink-soft tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <a href={p.path} target="_blank" rel="noreferrer" className="group flex items-center gap-1 text-sm font-extrabold text-ink hover:text-brand-ink">
                    <span className="min-w-0 truncate">{pageTitle(p.path)}</span>
                    <ExternalLink size={12} className="shrink-0 opacity-0 transition group-hover:opacity-60" />
                  </a>
                  <p className="truncate text-xs font-semibold text-ink-soft">{p.path}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full" style={{ width: `${max ? Math.max(1.5, (p.views / max) * 100) : 0}%`, background: C.series }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black tabular-nums">{fmt(p.views)}</p>
                  <p className="text-xs font-semibold text-ink-soft tabular-nums">{fmt(p.visitors)} kişi</p>
                </div>
              </li>
            ))}
          </ol>
          {list.length > 10 && (
            <div className="border-t border-line p-3 text-center">
              <Button size="sm" variant="ghost" onClick={() => setAll((a) => !a)}>
                {all ? 'Daha az göster' : `Tümünü göster (${list.length})`}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

function SectionsCard({ data }: { data: Report | null }) {
  const list = data?.sections ?? []
  const max = list[0]?.views ?? 0
  return (
    <Card title="Bölümlere göre" desc="Görüntülenme">
      {!data ? (
        <Skeleton rows={5} />
      ) : !list.length ? (
        <p className="text-sm font-semibold text-ink-soft">Veri yok.</p>
      ) : (
        <div className="-mx-2 space-y-0.5">
          {list.slice(0, 10).map((s) => (
            <BarRow key={s.section} label={SECTION_LABEL[s.section] ?? `/${s.section}`} value={s.views} max={max} />
          ))}
        </div>
      )}
    </Card>
  )
}

function ReferrersCard({ data }: { data: Report | null }) {
  const list = data?.referrers ?? []
  const max = list[0]?.views ?? 0
  return (
    <Card title="Nereden geldiler?" desc="Oturumun ilk sayfasındaki yönlendiren site">
      {!data ? (
        <Skeleton rows={5} />
      ) : !list.length ? (
        <p className="text-sm font-semibold text-ink-soft">Veri yok.</p>
      ) : (
        <div className="-mx-2 space-y-0.5">
          {list.map((r) => (
            <BarRow key={r.referrer} label={r.referrer === '(doğrudan)' ? 'Doğrudan / site içi' : r.referrer} value={r.views} max={max} />
          ))}
        </div>
      )}
    </Card>
  )
}

function DevicesCard({ data }: { data: Report | null }) {
  const order = ['mobile', 'desktop', 'tablet']
  const list = order.map((d) => data?.devices.find((x) => x.device === d) ?? { device: d, views: 0, visitors: 0 })
  const total = list.reduce((s, d) => s + d.visitors, 0)
  return (
    <Card title="Cihazlar" desc="Tekil ziyaretçi">
      {!data ? (
        <Skeleton rows={2} />
      ) : !total ? (
        <p className="text-sm font-semibold text-ink-soft">Veri yok.</p>
      ) : (
        <>
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={list.map((d) => `${DEVICE_LABEL[d.device]} %${Math.round((d.visitors / total) * 100)}`).join(', ')}>
            {list.map((d, i) =>
              d.visitors ? <div key={d.device} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(d.visitors / total) * 100}%`, background: C.cat[i] }} title={`${DEVICE_LABEL[d.device]}: ${fmt(d.visitors)}`} /> : null,
            )}
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {list.map((d, i) => (
              <li key={d.device} className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: C.cat[i] }} />
                  {DEVICE_LABEL[d.device]}
                </p>
                <p className="text-lg font-black tabular-nums">%{Math.round((d.visitors / total) * 100)}</p>
                <p className="text-xs font-semibold text-ink-soft tabular-nums">{fmt(d.visitors)} kişi</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

function HoursCard({ data }: { data: Report | null }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const byH = new Map((data?.hours ?? []).map((h) => [h.hour, h.views]))
  const vals = Array.from({ length: 24 }, (_, h) => byH.get(h) ?? 0)
  const max = Math.max(1, ...vals)
  const peak = vals.indexOf(Math.max(...vals))
  const H = 120
  const gap = 2
  const bw = width ? Math.min(24, (width - gap * 23) / 24) : 0
  const off = width ? (width - (bw * 24 + gap * 23)) / 2 : 0
  return (
    <Card title="Günün saatlerine göre" desc={data && vals.some(Boolean) ? `En yoğun saat: ${String(peak).padStart(2, '0')}:00` : 'Görüntülenme (Türkiye saati)'}>
      <div ref={ref} className="relative">
        {!data ? (
          <div className="h-32 animate-pulse rounded-xl bg-paper" />
        ) : (
          <>
          {width > 0 && (
            <svg width={width} height={H + 18} role="img" aria-label="Saatlere göre görüntülenme" onPointerLeave={() => setHover(null)}>
              <line x1={0} x2={width} y1={H} y2={H} stroke={C.grid} />
              {vals.map((v, h) => {
                const hgt = (v / max) * (H - 8)
                const x0 = off + h * (bw + gap)
                const r = Math.min(3, hgt, bw / 2)
                return (
                  <g key={h} onPointerEnter={() => setHover(h)}>
                    <rect x={x0 - gap / 2} y={0} width={bw + gap} height={H} fill="transparent" />
                    {hgt > 0 && (
                      <path d={`M${x0},${H}V${H - hgt + r}Q${x0},${H - hgt} ${x0 + r},${H - hgt}H${x0 + bw - r}Q${x0 + bw},${H - hgt} ${x0 + bw},${H - hgt + r}V${H}Z`} fill={C.series} opacity={hover === null || hover === h ? 1 : 0.45} />
                    )}
                    {h % 6 === 0 && (
                      <text x={x0 + bw / 2} y={H + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.axis}>
                        {String(h).padStart(2, '0')}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          )}
          {hover !== null && width > 0 && (
            <div className="pointer-events-none absolute -top-2 z-10 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold shadow-[var(--shadow-lift)] ring-1 ring-line" style={{ left: Math.min(Math.max(off + hover * (bw + gap) - 50, 0), width - 120) }}>
              {String(hover).padStart(2, '0')}:00 · <span className="tabular-nums">{fmt(vals[hover])}</span> görüntülenme
            </div>
          )}
          </>
        )}
      </div>
    </Card>
  )
}
