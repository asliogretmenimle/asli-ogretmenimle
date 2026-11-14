import confetti from 'canvas-confetti'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function celebrate(big = false) {
  if (reduced()) return
  confetti({
    particleCount: big ? 160 : 60,
    spread: big ? 100 : 70,
    origin: { y: big ? 0.6 : 0.7 },
    colors: ['#d6457a', '#f9a8c2', '#f97316', '#eab308', '#ec4899', '#3b82f6'],
    disableForReducedMotion: true,
  })
}

let ctx: AudioContext | null = null
function tone(freqs: number[], dur = 0.12) {
  try {
    ctx ??= new AudioContext()
    const t0 = ctx.currentTime
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t0 + i * dur)
      g.gain.exponentialRampToValueAtTime(0.12, t0 + i * dur + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur)
      o.connect(g).connect(ctx!.destination)
      o.start(t0 + i * dur)
      o.stop(t0 + (i + 1) * dur + 0.02)
    })
  } catch {
    /* ses desteklenmiyor */
  }
}

const SOUND_KEY = 'ao-sound'
export const soundOn = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}
export const setSound = (on: boolean) => {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    /* depolama yok */
  }
}

/** Sessiz etkinlikler (ör. mini konu anlatımları) açıkken hiç ses çalınmaz */
let silenced = 0
export const silence = (on: boolean) => {
  silenced = Math.max(0, silenced + (on ? 1 : -1))
}
const canPlay = () => silenced === 0 && soundOn()

export const sfx = {
  ok: () => canPlay() && tone([660, 880]),
  bad: () => canPlay() && tone([220, 180], 0.14),
  win: () => canPlay() && tone([523, 659, 784, 1047], 0.11),
}
