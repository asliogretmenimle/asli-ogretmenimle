import { useReducer, useRef } from 'react'
import type { Grade } from '../data/types'
import { pick, randInt, shuffle } from '../lib/random'
import { sfx } from '../lib/feedback'
import { Hud, useFrame, type GameProps } from './kit'

interface Rule {
  text: string
  /** ok: kurala uyan bir balon mu üretilsin */
  make: (ok: boolean) => string
}

const isPrime = (n: number) => {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}

/** Kurala uyan / uymayan sayı üretir */
const numRule = (text: string, min: number, max: number, test: (n: number) => boolean): Rule => ({
  text,
  make: (ok) => {
    for (let i = 0; i < 200; i++) {
      const n = randInt(min, max)
      if (test(n) === ok) return String(n)
    }
    return String(min)
  },
})

/** Sonucu `target` olan (ya da olmayan) işlemler */
const sumRule = (target: number): Rule => ({
  text: `Toplamı ${target} olan işlemler`,
  make: (ok) => {
    const s = ok ? target : target + pick([-2, -1, 1, 2])
    const a = randInt(Math.max(0, s - target + 1), s - 1)
    return `${a} + ${s - a}`
  },
})

const productRule = (target: number, withDivision = false): Rule => {
  const pairs: [number, number][] = []
  for (let a = 2; a <= target / 2; a++) if (target % a === 0 && target / a <= 12) pairs.push([a, target / a])
  return {
    text: `Sonucu ${target} olan işlemler`,
    make: (ok) => {
      if (ok) {
        if (withDivision && Math.random() < 0.4) {
          const d = pick([2, 3, 4])
          return `${target * d} ÷ ${d}`
        }
        const [a, b] = pick(pairs)
        return `${a} × ${b}`
      }
      const [a, b] = pick(pairs)
      const w = pick([[a + 1, b], [a, b - 1], [a - 1, b + 1]] as [number, number][])
      return w[0] * w[1] === target || w[0] < 1 || w[1] < 1 ? `${a + 1} × ${b}` : `${w[0]} × ${w[1]}`
    },
  }
}

/** İşlem önceliği: "2 + 3 × 6" gibi */
const orderRule = (target: number): Rule => ({
  text: `Sonucu ${target} olan işlemler`,
  make: (ok) => {
    for (let i = 0; i < 200; i++) {
      const b = randInt(2, 6), c = randInt(2, 6)
      const a = target - b * c
      if (a < 1) continue
      // Yanlış seçenek: sonucu hedefe çok yakın bir ifade
      if (ok) return `${a} + ${b} × ${c}`
      const wrongA = a + pick([-2, -1, 1, 2])
      if (wrongA > 0) return `${wrongA} + ${b} × ${c}`
    }
    return ok ? `${target}` : `${target + 1}`
  },
})

function rulesFor(grade: Grade): Rule[] {
  switch (grade) {
    case 1:
      return [
        numRule('10’dan büyük sayılar', 1, 20, (n) => n > 10),
        numRule('8’den küçük sayılar', 1, 20, (n) => n < 8),
        sumRule(10),
        numRule('5 ile 15 arasındaki sayılar', 1, 20, (n) => n > 5 && n < 15),
      ]
    case 2:
      return [
        numRule('Çift sayılar', 1, 99, (n) => n % 2 === 0),
        numRule('Tek sayılar', 1, 99, (n) => n % 2 === 1),
        (() => { const d = randInt(2, 8); return numRule(`Onlar basamağı ${d} olan sayılar`, 10, 99, (n) => Math.floor(n / 10) === d) })(),
        sumRule(20),
        numRule('5’er sayarken söylenen sayılar', 1, 100, (n) => n % 5 === 0),
      ]
    case 3:
      return [
        numRule('3’ün katları', 1, 40, (n) => n % 3 === 0),
        numRule('4’ün katları', 1, 48, (n) => n % 4 === 0),
        productRule(24),
        productRule(36),
        numRule('Tek sayılar', 100, 999, (n) => n % 2 === 1),
      ]
    case 4:
      return [
        productRule(36, true),
        productRule(48, true),
        numRule('6’nın katları', 1, 72, (n) => n % 6 === 0),
        numRule('Yüzlüğe yuvarlayınca 500 olan sayılar', 300, 700, (n) => Math.round(n / 100) * 100 === 500),
        numRule('8’in katları', 1, 96, (n) => n % 8 === 0),
      ]
    case 5:
      return [
        numRule('3’e tam bölünen sayılar', 10, 999, (n) => n % 3 === 0),
        numRule('9’a tam bölünen sayılar', 10, 999, (n) => n % 9 === 0),
        numRule('5’e tam bölünen sayılar', 10, 999, (n) => n % 5 === 0),
        orderRule(20),
        orderRule(26),
      ]
    default:
      return [
        numRule('Asal sayılar', 2, 60, isPrime),
        numRule('Asal sayılar', 30, 100, isPrime),
        numRule('4’e tam bölünen sayılar', 100, 999, (n) => n % 4 === 0),
        numRule('6’ya tam bölünen sayılar', 30, 300, (n) => n % 6 === 0),
        numRule('9’a tam bölünen sayılar', 100, 999, (n) => n % 9 === 0),
      ]
  }
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']
const RULE_SECONDS = 25
const ROUNDS = 3
const LIVES = 3

interface Balloon { id: number; x: number; y: number; label: string; ok: boolean; color: string; state: 'fly' | 'pop' | 'bad'; t: number; phase: number }

export default function Balloons({ grade, onFinish }: GameProps) {
  const rules = useRef(shuffle(rulesFor(grade)).slice(0, ROUNDS)).current
  const speed = 10 + grade * 0.6 // ekran yüksekliğinin %'si / sn
  const sim = useRef({
    balloons: [] as Balloon[],
    nextId: 0,
    spawnIn: 0.3,
    round: 0,
    left: RULE_SECONDS,
    banner: 1.6,
    hits: 0,
    wrong: 0,
    missed: 0,
    lives: LIVES,
    over: false,
  })
  const [, render] = useReducer((x: number) => x + 1, 0)

  const end = () => {
    const s = sim.current
    if (s.over) return
    s.over = true
    const ratio = s.hits / Math.max(1, s.hits + s.wrong + s.missed)
    onFinish({
      stars: s.lives === 0 ? 1 : ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : 1,
      score: s.hits * 10 - s.wrong * 5,
      summary: `${s.hits} doğru balon patlattın${s.wrong ? `, ${s.wrong} yanlış` : ''}${s.missed ? `, ${s.missed} kaçtı` : ''}.`,
      insight: 'Kuralı aklında tutup her sayıyı hızlıca kontrol ettin. Hangi kuralda daha hızlıydın? Neden?',
    })
  }

  useFrame((dt) => {
    const s = sim.current
    if (s.over) return
    if (s.banner > 0) {
      s.banner -= dt
      render()
      return
    }
    s.left -= dt
    if (s.left <= 0) {
      s.round++
      s.balloons = []
      if (s.round >= ROUNDS) return end()
      s.left = RULE_SECONDS
      s.banner = 1.6
      render()
      return
    }
    s.spawnIn -= dt
    if (s.spawnIn <= 0) {
      s.spawnIn = 0.85 + Math.random() * 0.5
      const ok = Math.random() < 0.45
      const used = s.balloons.filter((b) => b.y > 80).map((b) => b.x)
      let x = randInt(4, 80)
      for (let i = 0; i < 6 && used.some((u) => Math.abs(u - x) < 16); i++) x = randInt(4, 80)
      s.balloons.push({ id: s.nextId++, x, y: 108, label: rules[s.round].make(ok), ok, color: pick(COLORS), state: 'fly', t: 0, phase: Math.random() * 6 })
    }
    for (const b of s.balloons) {
      b.t += dt
      if (b.state !== 'pop') b.y -= speed * dt * (b.state === 'bad' ? 1.6 : 1)
    }
    s.balloons = s.balloons.filter((b) => {
      if (b.state === 'pop') return b.t < 0.35
      if (b.y < -22) {
        if (b.ok && b.state === 'fly') s.missed++
        return false
      }
      return true
    })
    render()
  }, true)

  const tap = (b: Balloon) => {
    const s = sim.current
    if (b.state !== 'fly' || s.over) return
    if (b.ok) {
      b.state = 'pop'
      b.t = 0
      s.hits++
      sfx.ok()
    } else {
      b.state = 'bad'
      s.wrong++
      s.lives--
      sfx.bad()
      if (s.lives <= 0) end()
    }
    render()
  }

  const s = sim.current
  const rule = rules[Math.min(s.round, ROUNDS - 1)]

  return (
    <div className="animate-fade-up">
      <Hud round={s.round + 1} rounds={ROUNDS} score={s.hits} lives={s.lives} maxLives={LIVES} seconds={Math.ceil(s.left)} />
      <div className="mb-3 rounded-2xl bg-ink px-4 py-3 text-center text-white">
        <span className="text-xs font-extrabold tracking-wide text-white/70 uppercase">Kural</span>
        <p className="text-xl font-black sm:text-2xl">{rule.text}</p>
      </div>
      <div className="relative h-[min(62vh,520px)] touch-manipulation overflow-hidden rounded-3xl bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-50 ring-1 ring-sky-200 select-none">
        <div className="pointer-events-none absolute top-6 left-[8%] h-8 w-24 rounded-full bg-white/80 blur-[2px]" aria-hidden />
        <div className="pointer-events-none absolute top-20 right-[12%] h-6 w-20 rounded-full bg-white/70 blur-[2px]" aria-hidden />
        {s.balloons.map((b) => (
          <button
            key={b.id}
            type="button"
            onPointerDown={() => tap(b)}
            disabled={b.state !== 'fly'}
            className="absolute w-[19%] max-w-24 min-w-16"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: `translateX(${Math.sin(b.t * 1.6 + b.phase) * 6}px) scale(${b.state === 'pop' ? 1 + b.t * 3 : 1})`,
              opacity: b.state === 'pop' ? 1 - b.t / 0.35 : b.state === 'bad' ? 0.45 : 1,
            }}
            aria-label={b.label}
          >
            <svg viewBox="0 0 80 110" className="w-full drop-shadow-md">
              <path d="M40 4C19 4 6 20 6 39c0 22 18 38 30 43l-3 6h14l-3-6c12-5 30-21 30-43C74 20 61 4 40 4z" fill={b.state === 'bad' ? '#9ca3af' : b.color} />
              <ellipse cx={26} cy={24} rx={7} ry={11} fill="#fff" opacity={0.35} transform="rotate(-20 26 24)" />
              <path d="M40 88c-4 6 4 10 0 16" stroke="#64748b" strokeWidth={1.5} fill="none" />
              <text x={40} y={46} textAnchor="middle" fontSize={b.label.length > 6 ? 13 : b.label.length > 3 ? 17 : 22} fontWeight={900} fill="#fff" stroke="#0000003a" strokeWidth={0.6}>{b.label}</text>
            </svg>
          </button>
        ))}
        {s.banner > 0 && (
          <div className="absolute inset-0 grid place-items-center bg-white/40 backdrop-blur-[2px]">
            <div className="rounded-3xl bg-white px-6 py-4 text-center shadow-[var(--shadow-lift)] animate-pop">
              <p className="text-sm font-extrabold text-ink-soft">{s.round === 0 ? 'Hazır ol!' : 'Yeni kural!'}</p>
              <p className="text-2xl font-black">{rule.text}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
