import type { SoundKind } from './types'

let ctx: AudioContext | null = null
function audio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function playNote(freq: number, dur = 0.5, wave: OscillatorType = 'triangle', vol = 0.18, delay = 0) {
  const a = audio()
  if (!a) return
  const t0 = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = wave
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(a.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}

function noise(dur: number, vol = 0.08, delay = 0) {
  const a = audio()
  if (!a) return
  const len = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
  const src = a.createBufferSource()
  const g = a.createGain()
  g.gain.value = vol
  src.buffer = buf
  src.connect(g).connect(a.destination)
  src.start(a.currentTime + delay)
}

export function playSound(k: SoundKind) {
  switch (k) {
    case 'click':
      return playNote(1200, 0.05, 'square', 0.04)
    case 'snap':
      return playNote(880, 0.06, 'sine', 0.08)
    case 'pop':
      return playNote(520, 0.12, 'sine', 0.12)
    case 'roll':
      for (let i = 0; i < 5; i++) noise(0.04, 0.12, i * 0.07)
      return
    case 'win':
      ;[523, 659, 784, 1047].forEach((f, i) => playNote(f, 0.18, 'triangle', 0.14, i * 0.1))
      return
    case 'error':
      return playNote(180, 0.2, 'sawtooth', 0.06)
  }
}

/** A4=440'tan yarım ses uzaklığa göre frekans */
export const midiFreq = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
