// CSS/SVG Captain Glaze avatar. Expression & animation reflect the engine mood.

const MOOD_STYLE = {
  Terrified: { eye: 'wide', mouth: 'wavy', anim: 'animate-flicker', tint: '#7a2fd6' },
  Anxious: { eye: 'normal', mouth: 'small', anim: 'animate-floaty', tint: '#4B1A8C' },
  Guarded: { eye: 'normal', mouth: 'flat', anim: '', tint: '#4B1A8C' },
  Emboldened: { eye: 'confident', mouth: 'smirk', anim: 'animate-floaty', tint: '#00C8FF' },
  Preening: { eye: 'closed-smug', mouth: 'smirk', anim: 'animate-pulseglow', tint: '#FF6FB5' },
  Suspicious: { eye: 'narrow', mouth: 'flat', anim: '', tint: '#ffb627' },
  Sulking: { eye: 'down', mouth: 'frown', anim: '', tint: '#5a3a8c' },
  Hostile: { eye: 'angry', mouth: 'frown', anim: 'animate-flicker', tint: '#ff3b6b' }
}

export default function GlazePortrait({ mood = 'Guarded', composure = 50 }) {
  const s = MOOD_STYLE[mood] || MOOD_STYLE.Guarded
  const tremble = mood === 'Terrified' || composure < 25

  return (
    <div className="relative mx-auto aspect-square w-28">
      <svg viewBox="0 0 120 120" className={`h-full w-full ${s.anim}`} style={{ filter: `drop-shadow(0 0 10px ${s.tint}99)` }}>
        {/* doughnut body */}
        <defs>
          <radialGradient id="dough" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFE9C7" />
            <stop offset="70%" stopColor="#E2B67A" />
            <stop offset="100%" stopColor="#b9854a" />
          </radialGradient>
          <radialGradient id="glaze" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FFC0E0" />
            <stop offset="100%" stopColor="#FF6FB5" />
          </radialGradient>
        </defs>
        <g className={tremble ? 'animate-flicker' : ''} style={{ transformOrigin: 'center' }}>
          <circle cx="60" cy="64" r="46" fill="url(#dough)" stroke="#8a5a2a" strokeWidth="2" />
          <circle cx="60" cy="64" r="16" fill="#0A0014" stroke="#8a5a2a" strokeWidth="2" />
          {/* glaze top with drips */}
          <path
            d="M22 52 Q60 20 98 52 Q100 60 92 58 Q86 70 80 60 Q74 70 68 58 Q60 72 52 60 Q44 72 38 58 Q30 70 26 58 Q20 60 22 52 Z"
            fill="url(#glaze)"
          />
          {/* sprinkles */}
          <g stroke="#00C8FF" strokeWidth="2.5" strokeLinecap="round">
            <line x1="40" y1="40" x2="46" y2="34" />
            <line x1="74" y1="36" x2="80" y2="42" />
            <line x1="60" y1="30" x2="64" y2="36" />
          </g>
          <g stroke="#FFC857" strokeWidth="2.5" strokeLinecap="round">
            <line x1="34" y1="50" x2="30" y2="46" />
            <line x1="86" y1="48" x2="90" y2="44" />
          </g>
          {/* captain's hat */}
          <path d="M40 30 Q60 6 80 30 L78 34 L42 34 Z" fill="#1a0238" stroke="#00C8FF" strokeWidth="1.5" />
          <circle cx="60" cy="14" r="3.5" fill="#FFC857" />
          {/* eyes */}
          {renderEyes(s.eye)}
          {/* mouth */}
          {renderMouth(s.mouth)}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 scanlines rounded-full" />
    </div>
  )
}

function renderEyes(eye) {
  if (eye === 'closed-smug')
    return (
      <g stroke="#1a0238" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M44 56 Q48 53 52 56" />
        <path d="M68 56 Q72 53 76 56" />
      </g>
    )
  if (eye === 'narrow')
    return (
      <g stroke="#1a0238" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M43 56 L52 56" />
        <path d="M68 56 L77 56" />
      </g>
    )
  if (eye === 'angry')
    return (
      <g fill="#1a0238">
        <path d="M42 54 L53 58 L53 60 L42 60 Z" />
        <path d="M78 54 L67 58 L67 60 L78 60 Z" />
      </g>
    )
  if (eye === 'down')
    return (
      <g fill="#1a0238">
        <circle cx="48" cy="58" r="2.4" />
        <circle cx="72" cy="58" r="2.4" />
      </g>
    )
  if (eye === 'wide')
    return (
      <g fill="#1a0238">
        <circle cx="48" cy="57" r="3.6" />
        <circle cx="72" cy="57" r="3.6" />
        <circle cx="49" cy="56" r="1" fill="#fff" />
        <circle cx="73" cy="56" r="1" fill="#fff" />
      </g>
    )
  if (eye === 'confident')
    return (
      <g fill="#1a0238">
        <circle cx="48" cy="57" r="2.8" />
        <circle cx="72" cy="57" r="2.8" />
      </g>
    )
  return (
    <g fill="#1a0238">
      <circle cx="48" cy="57" r="2.6" />
      <circle cx="72" cy="57" r="2.6" />
    </g>
  )
}

function renderMouth(mouth) {
  if (mouth === 'smirk') return <path d="M52 70 Q64 76 70 69" stroke="#1a0238" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  if (mouth === 'frown') return <path d="M52 74 Q60 68 70 74" stroke="#1a0238" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  if (mouth === 'wavy')
    return <path d="M51 72 Q56 67 60 72 Q64 77 68 72" stroke="#1a0238" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  if (mouth === 'flat') return <path d="M53 71 L68 71" stroke="#1a0238" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  if (mouth === 'small') return <circle cx="60" cy="71" r="2.4" fill="#1a0238" />
  return <path d="M53 70 Q60 75 68 70" stroke="#1a0238" strokeWidth="2.5" fill="none" strokeLinecap="round" />
}
