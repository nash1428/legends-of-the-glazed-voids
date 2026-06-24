// Minimal CSS/SVG room scenes.

export default function RoomArt({ room = 'bridge', riftSealed, strayAwake, strayStunned }) {
  return (
    <div className="relative h-28 w-full overflow-hidden rounded-lg border border-violet-glaze/30 bg-void-deep scanlines">
      <svg viewBox="0 0 320 112" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        {room === 'bridge' && <BridgeScene />}
        {room === 'glazing_bay' && <BayScene strayAwake={strayAwake} strayStunned={strayStunned} />}
        {room === 'maw' && <MawScene riftSealed={riftSealed} />}
      </svg>
    </div>
  )
}

function BridgeScene() {
  return (
    <g>
      <rect x="0" y="0" width="320" height="112" fill="#15002a" />
      <g fill="#4B1A8C" opacity="0.5">{stars(40)}</g>
      <rect x="0" y="80" width="320" height="32" fill="#2e0f5e" />
      <rect x="120" y="40" width="80" height="42" rx="6" fill="#1a0238" stroke="#00C8FF" strokeWidth="1.5" />
      <circle cx="160" cy="20" r="8" fill="#FFC857" opacity="0.8" />
      <rect x="130" y="52" width="60" height="20" rx="3" fill="#00C8FF" opacity="0.25" />
      <rect x="30" y="70" width="14" height="14" rx="2" fill="#7a2fd6" />
      <rect x="276" y="70" width="14" height="14" rx="2" fill="#7a2fd6" />
      <rect x="210" y="86" width="40" height="6" fill="#00C8FF" opacity="0.5" />
    </g>
  )
}

function BayScene({ strayAwake, strayStunned }) {
  const eye = strayStunned ? '#555' : strayAwake ? '#ff3b6b' : '#00C8FF'
  return (
    <g>
      <rect x="0" y="0" width="320" height="112" fill="#0f0220" />
      <g fill="#4B1A8C" opacity="0.4">{stars(30)}</g>
      {/* core rack */}
      <rect x="120" y="14" width="80" height="10" rx="3" fill="#1a0238" stroke="#7a2fd6" />
      <circle cx="140" cy="30" r="9" fill="#00C8FF" opacity="0.85" />
      <circle cx="160" cy="30" r="9" fill="#FF6FB5" opacity="0.85" />
      <circle cx="180" cy="30" r="9" fill="#00C8FF" opacity="0.85" />
      {/* stray */}
      <g transform="translate(150 70)">
        <ellipse cx="0" cy="0" rx="40" ry="20" fill="#cfd6e4" />
        <ellipse cx="-22" cy="-6" rx="9" ry="11" fill="#b9c2d4" />
        <ellipse cx="22" cy="-6" rx="9" ry="11" fill="#b9c2d4" />
        <circle cx="-22" cy="-6" r="3.5" fill={eye} className={strayAwake && !strayStunned ? 'animate-flicker' : ''} />
        <circle cx="22" cy="-6" r="3.5" fill={eye} className={strayAwake && !strayStunned ? 'animate-flicker' : ''} />
        <path d="M-14 6 L-8 2 L-2 6 L4 2 L10 6 L16 2" stroke="#1a0238" strokeWidth="1.5" fill="none" />
      </g>
      <rect x="0" y="96" width="320" height="16" fill="#2e0f5e" />
    </g>
  )
}

function MawScene({ riftSealed }) {
  return (
    <g>
      <rect x="0" y="0" width="320" height="112" fill="#0A0014" />
      <g fill="#7a2fd6" opacity="0.5">{stars(26)}</g>
      {/* rift */}
      <g transform="translate(160 56)">
        {riftSealed ? (
          <circle r="34" fill="#1a0238" stroke="#00C8FF" strokeWidth="2" opacity="0.7" />
        ) : (
          <>
            <ellipse rx="40" ry="30" fill="#4B1A8C" opacity="0.7" className="animate-flicker" />
            <ellipse rx="26" ry="20" fill="#7a2fd6" opacity="0.8" className="animate-flicker" />
            <ellipse rx="12" ry="10" fill="#FF6FB5" opacity="0.9" />
          </>
        )}
      </g>
      {/* vermious coils */}
      <g stroke="#FF6FB5" strokeWidth="4" fill="none" opacity="0.6" strokeLinecap="round">
        <path d="M40 96 Q80 70 60 96 Q40 120 80 96" />
        <path d="M280 96 Q240 70 260 96 Q280 120 240 96" />
      </g>
      <rect x="0" y="100" width="320" height="12" fill="#2e0f5e" />
    </g>
  )
}

function stars(n) {
  const arr = []
  let seed = 7
  for (let i = 0; i < n; i++) {
    seed = (seed * 9301 + 49297) % 233280
    const x = (seed / 233280) * 320
    seed = (seed * 9301 + 49297) % 233280
    const y = (seed / 233280) * 70
    arr.push(<circle key={i} cx={x} cy={y} r="0.8" />)
  }
  return arr
}
