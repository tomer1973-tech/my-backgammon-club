let ctx: AudioContext | null = null
let muted = false
try { muted = localStorage.getItem('sound-muted') === '1' } catch {}

export function isMuted() { return muted }
export function setMuted(m: boolean) {
  muted = m
  try { localStorage.setItem('sound-muted', m ? '1' : '0') } catch {}
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, ctx.currentTime + start)
  g.gain.setValueAtTime(vol, ctx.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(ctx.currentTime + start)
  o.stop(ctx.currentTime + start + dur)
}

export function playSound(kind: 'move' | 'dice' | 'win' | 'lose') {
  if (muted || typeof window === 'undefined') return
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    if (kind === 'move') { tone(180, 0, 0.07, 'triangle', 0.25); tone(120, 0.02, 0.09, 'sine', 0.2) }
    if (kind === 'dice') for (let i = 0; i < 5; i++) tone(300 + Math.random() * 400, i * 0.05, 0.04, 'square', 0.06)
    if (kind === 'win')  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'sine', 0.2))
    if (kind === 'lose') [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.3, 'sine', 0.18))
  } catch {}
}
