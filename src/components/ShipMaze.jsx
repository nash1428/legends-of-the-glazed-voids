// ============================================================================
// ShipMaze — functional dungeon-maze visual of the U.S.V. Old-Fashioned.
// 4 room nodes in forward order: Bridge → Glazing Bay → The Maw → Escape Portal.
// Corridors with locked (red barrier) / unlocked (open pulse) doors.
// Glaze avatar animates along corridors when advancing. Completed rooms get
// checkmarks. Fog of war dims rooms beyond current+1. Rifts, Chrome Stray,
// and Vermious rendered as in-maze entities.
// ============================================================================

import { ROOM_ORDER } from '../engine/rooms.js'

const NODES = {
  bridge: { x: 160, y: 78, name: 'The Bridge', sub: 'Command Deck' },
  glazing_bay: { x: 160, y: 232, name: 'Glazing Bay', sub: 'Core Repository' },
  maw: { x: 160, y: 386, name: 'The Maw', sub: 'Engineering' },
  escape_portal: { x: 160, y: 528, name: 'Escape Portal', sub: 'Extraction' }
}

// corridor paths between consecutive rooms (door at midpoint)
const CORRIDORS = [
  { from: 'bridge', to: 'glazing_bay', d: 'M160 112 C 196 150, 124 188, 160 198', doorY: 155 },
  { from: 'glazing_bay', to: 'maw', d: 'M160 266 C 196 304, 124 342, 160 352', doorY: 309 },
  { from: 'maw', to: 'escape_portal', d: 'M160 420 C 196 458, 124 494, 160 494', doorY: 457 }
]

function objectivePos(state) {
  if (state.gameOver) return null
  if (state.currentRoom === 'bridge') return { x: 220, y: 155, label: 'Move Forward' }
  if (state.currentRoom === 'glazing_bay') return { x: 220, y: 232, label: 'Grab Core' }
  if (state.currentRoom === 'maw') {
    if (!state.riftSealed) return { x: 100, y: 360, label: 'Seal Rift' }
    return { x: 220, y: 457, label: 'Feed Vermious' }
  }
  return null
}

export default function ShipMaze({ state, mood }) {
  const cur = state.currentRoom
  const curIdx = ROOM_ORDER.indexOf(cur)
  const completed = new Set(state.completedRooms || [])
  const obj = objectivePos(state)

  return (
    <svg viewBox="0 0 320 600" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#1a0238" />
          <stop offset="60%" stopColor="#0f0220" />
          <stop offset="100%" stopColor="#0A0014" />
        </radialGradient>
        <radialGradient id="dough" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#FFE9C7" />
          <stop offset="70%" stopColor="#E2B67A" />
          <stop offset="100%" stopColor="#b9854a" />
        </radialGradient>
        <radialGradient id="glaze" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFC0E0" />
          <stop offset="100%" stopColor="#FF6FB5" />
        </radialGradient>
        <radialGradient id="rift" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#ffb6c8" />
          <stop offset="55%" stopColor="#ff3b6b" />
          <stop offset="100%" stopColor="#7a0a26" />
        </radialGradient>
        <radialGradient id="coreg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#bff4ff" />
          <stop offset="100%" stopColor="#00C8FF" />
        </radialGradient>
        <radialGradient id="portal" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#00C8FF" />
          <stop offset="100%" stopColor="#15002a" />
        </radialGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      <rect width="320" height="600" fill="url(#bg)" />
      <Starfield />
      <Hull />

      {/* corridors + doors */}
      {CORRIDORS.map((c, i) => {
        const locked = !completed.has(c.from)
        const target = Math.min(curIdx + 1, ROOM_ORDER.length - 1)
        const fogged = i > target
        return (
          <g key={c.from} opacity={fogged ? 0.25 : 1}>
            <Corridor d={c.d} />
            <Door x={160} y={c.doorY} locked={locked} fogged={fogged} />
          </g>
        )
      })}

      {/* room nodes */}
      {ROOM_ORDER.map((id, i) => {
        const isCurrent = id === cur
        const isCompleted = completed.has(id)
        const target = Math.min(curIdx + 1, ROOM_ORDER.length - 1)
        const fogged = i > target
        return (
          <RoomNode
            key={id}
            id={id}
            node={NODES[id]}
            isCurrent={isCurrent}
            isCompleted={isCompleted}
            fogged={fogged}
            state={state}
          />
        )
      })}

      {/* entities */}
      <ChromeStray state={state} />
      <Rift state={state} />
      <Vermious state={state} />

      {/* objective marker */}
      {obj && <Objective x={obj.x} y={obj.y} label={obj.label} />}

      {/* Glaze avatar — CSS-transitioned translate for corridor walk animation */}
      <g
        style={{
          transform: `translate(${NODES[cur]?.x ?? 160}px, ${NODES[cur]?.y ?? 78}px)`,
          transition: 'transform 0.9s cubic-bezier(0.34, 1.16, 0.64, 1)'
        }}
      >
        <MazeAvatar mood={mood} />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
function Hull() {
  return (
    <g>
      <rect x="14" y="14" width="292" height="572" rx="34" fill="none" stroke="#4B1A8C" strokeWidth="3" opacity="0.8" />
      <rect x="22" y="22" width="276" height="556" rx="28" fill="none" stroke="#7a2fd6" strokeWidth="1" opacity="0.5" />
      <text x="160" y="34" textAnchor="middle" fill="#7a2fd6" fontSize="8" fontWeight="700" letterSpacing="2" opacity="0.8">
        U.S.V. OLD-FASHIONED
      </text>
      {[[28, 40], [292, 40], [28, 560], [292, 560]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill="#00C8FF" opacity="0.5" />
      ))}
    </g>
  )
}

function Corridor({ d }) {
  return (
    <g>
      <path d={d} fill="none" stroke="#2e0f5e" strokeWidth="16" strokeLinecap="round" opacity="0.9" />
      <path d={d} fill="none" stroke="#4B1A8C" strokeWidth="12" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#00C8FF" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 7" opacity="0.5" />
    </g>
  )
}

function Door({ x, y, locked, fogged }) {
  if (fogged) return null
  if (locked) {
    return (
      <g transform={`translate(${x} ${y})`}>
        {/* glowing red barrier */}
        <rect x="-22" y="-7" width="44" height="14" rx="3" fill="#ff3b6b" opacity="0.25" filter="url(#soft)" className="animate-flicker" />
        <rect x="-20" y="-5" width="40" height="10" rx="2" fill="#ff3b6b" opacity="0.7" className="animate-flicker" />
        <line x1="-18" y1="0" x2="18" y2="0" stroke="#ffb6c8" strokeWidth="1.5" opacity="0.9" />
        <text y="-12" textAnchor="middle" fill="#ff3b6b" fontSize="7" fontWeight="700" letterSpacing="1">🔒 LOCKED</text>
      </g>
    )
  }
  // unlocked: open corridor with subtle pulse
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="12" fill="#00C8FF" opacity="0.12" className="animate-pulseglow" />
      <rect x="-16" y="-3" width="32" height="6" rx="2" fill="#3ee08a" opacity="0.5" />
      <text y="-10" textAnchor="middle" fill="#3ee08a" fontSize="7" fontWeight="700" letterSpacing="1" opacity="0.8">UNLOCKED</text>
    </g>
  )
}

function RoomNode({ id, node, isCurrent, isCompleted, fogged, state }) {
  const opacity = fogged ? 0.2 : isCompleted ? 0.5 : 1
  return (
    <g transform={`translate(${node.x} ${node.y})`} opacity={opacity}>
      {/* current room glow ring */}
      {isCurrent && (
        <>
          <circle r="40" fill="none" stroke="#00C8FF" strokeWidth="2" className="animate-pulseglow" opacity="0.9" />
          <circle r="38" fill="#15002a" opacity="0.5" />
        </>
      )}

      {/* room body — hidden when current (avatar sits here instead) */}
      {!isCurrent && (
        <g>
          <circle r="30" fill="url(#dough)" stroke="#8a5a2a" strokeWidth="2" strokeDasharray={fogged ? '4 4' : 'none'} />
          <circle r="11" fill="#0A0014" stroke="#8a5a2a" strokeWidth="1.4" strokeDasharray={fogged ? '2 3' : 'none'} />
          <path
            d="M-26 -8 Q0 -28 26 -8 Q28 0 20 -2 Q14 8 10 -2 Q4 8 0 -4 Q-6 8 -10 -2 Q-14 8 -20 -2 Q-28 0 -26 -8 Z"
            fill="url(#glaze)"
            opacity="0.9"
          />
          {/* escape portal special visual */}
          {id === 'escape_portal' && !fogged && (
            <circle r="18" fill="url(#portal)" opacity="0.7" className="animate-pulseglow" />
          )}
        </g>
      )}

      {/* completed checkmark */}
      {isCompleted && !fogged && (
        <g transform="translate(22 -22)">
          <circle r="9" fill="#3ee08a" opacity="0.9" />
          <path d="M-4 0 L-1 3 L4 -3" stroke="#0A0014" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {/* core glyphs in glazing bay */}
      {id === 'glazing_bay' && !fogged && !isCurrent && <CoresRack state={state} />}

      {/* labels */}
      <text y="48" textAnchor="middle" fill="#FFE9C7" fontSize="10" fontWeight="700" opacity={fogged ? 0.4 : 0.95}>
        {node.name}
      </text>
      <text y="59" textAnchor="middle" fill="#7a2fd6" fontSize="7" letterSpacing="1.5" opacity={fogged ? 0.3 : 0.7}>
        {node.sub.toUpperCase()}
      </text>

      {/* fogged tag */}
      {fogged && (
        <text y="-38" textAnchor="middle" fill="#7a2fd6" fontSize="6.5" letterSpacing="1.5" opacity="0.5">
          ◌ UNKNOWN
        </text>
      )}
    </g>
  )
}

function CoresRack({ state }) {
  const count = Math.min(state.glazeCores, 3)
  return (
    <g transform="translate(-30 -2)">
      {Array.from({ length: 3 }).map((_, i) => (
        <circle key={i} cx={i * 8} cy="0" r="3" fill="url(#coreg)" opacity={i < count ? 0.95 : 0.15} />
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------------
function ChromeStray({ state }) {
  const discovered = ROOM_ORDER.indexOf(state.currentRoom) >= 1
  if (!discovered) return null
  const awake = state.strayAwake && !state.strayStunned
  const stunned = state.strayStunned
  const eye = stunned ? '#5a5a6a' : awake ? '#ff3b6b' : '#00C8FF'
  const inBay = state.currentRoom === 'glazing_bay'
  const op = inBay ? 1 : 0.5
  return (
    <g transform="translate(232 232)" opacity={op}>
      <circle r="16" fill={eye} opacity="0.18" filter="url(#soft)" className={awake ? 'animate-flicker' : ''} />
      <ellipse cx="0" cy="2" rx="11" ry="9" fill="#cfd6e4" stroke="#9aa6bd" strokeWidth="1" />
      <path d="M-9 -4 L-11 -12 L-4 -7 Z" fill="#cfd6e4" stroke="#9aa6bd" strokeWidth="0.8" />
      <path d="M9 -4 L11 -12 L4 -7 Z" fill="#cfd6e4" stroke="#9aa6bd" strokeWidth="0.8" />
      <circle cx="-4" cy="1" r="2.2" fill={eye} className={awake ? 'animate-flicker' : ''} />
      <circle cx="4" cy="1" r="2.2" fill={eye} className={awake ? 'animate-flicker' : ''} />
      {stunned && <text y="22" textAnchor="middle" fill="#5a5a6a" fontSize="7">✕ stunned</text>}
      {awake && <text y="22" textAnchor="middle" fill="#ff3b6b" fontSize="7">! awake</text>}
      {!awake && !stunned && <text y="22" textAnchor="middle" fill="#00C8FF" fontSize="7" opacity="0.7">z dormant</text>}
      {inBay && <text y="-20" textAnchor="middle" fill="#9aa6bd" fontSize="7" opacity="0.7">Chrome Stray</text>}
    </g>
  )
}

function Rift({ state }) {
  const discovered = ROOM_ORDER.indexOf(state.currentRoom) >= 2
  if (!discovered) return null
  const sealed = state.riftSealed
  const inMaw = state.currentRoom === 'maw'
  const op = inMaw ? 1 : 0.5
  return (
    <g transform="translate(96 386)" opacity={op}>
      {sealed ? (
        <g>
          <path d="M0 -22 Q-12 0 0 22 Q12 0 0 -22 Z" fill="#1a0238" stroke="#00C8FF" strokeWidth="1.5" opacity="0.8" />
          <path d="M-6 -2 L-2 4 L6 -6" fill="none" stroke="#3ee08a" strokeWidth="2" strokeLinecap="round" />
          <text y="34" textAnchor="middle" fill="#3ee08a" fontSize="7" opacity="0.8">rift sealed</text>
        </g>
      ) : (
        <g className="animate-flicker">
          <path d="M0 -24 Q-13 0 0 24 Q13 0 0 -24 Z" fill="url(#rift)" opacity="0.9" />
          <path d="M0 -18 Q-8 0 0 18 Q8 0 0 -18 Z" fill="#ffb6c8" opacity="0.7" />
          <circle r="26" fill="#ff3b6b" opacity="0.2" filter="url(#soft)" />
          <text y="36" textAnchor="middle" fill="#ff3b6b" fontSize="7">RIFT BLEEDING</text>
        </g>
      )}
    </g>
  )
}

function Vermious({ state }) {
  const discovered = ROOM_ORDER.indexOf(state.currentRoom) >= 2
  const fed = state.vermiousFed
  const op = discovered ? 1 : 0.3
  const color = fed ? '#3ee08a' : '#FF6FB5'
  return (
    <g transform="translate(160 470)" opacity={op}>
      <g className={fed ? '' : 'animate-flicker'}>
        <path
          d="M-34 6 Q-20 -10 -6 6 Q8 22 22 6 Q34 -8 22 -10"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx="22" cy="-10" r="6" fill={color} opacity="0.9" />
        <circle cx="24" cy="-12" r="1.4" fill="#0A0014" />
        <circle cx="0" cy="0" r="22" fill={color} opacity="0.14" filter="url(#soft)" />
      </g>
      <text y="26" textAnchor="middle" fill={color} fontSize="7" opacity="0.85">
        {fed ? 'VERMIOUS · sated' : 'VERMIOUS · hungry'}
      </text>
    </g>
  )
}

// ---------------------------------------------------------------------------
function Objective({ x, y, label }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="14" fill="#00C8FF" opacity="0.15" className="animate-pulseglow" />
      <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="#00C8FF" className="animate-pulseglow" />
      <text y="-18" textAnchor="middle" fill="#00C8FF" fontSize="7" fontWeight="700" letterSpacing="1" opacity="0.95">
        ▼ {label}
      </text>
    </g>
  )
}

// ---------------------------------------------------------------------------
// Compact mood-reactive Glaze avatar (native SVG, animates via parent transform).
function MazeAvatar({ mood }) {
  return (
    <g>
      <circle r="20" fill="#00C8FF" opacity="0.16" filter="url(#soft)" className="animate-pulseglow" />
      <circle r="15" fill="url(#dough)" stroke="#8a5a2a" strokeWidth="1.4" />
      <circle r="5.5" fill="#0A0014" stroke="#8a5a2a" strokeWidth="1" />
      <path
        d="M-13 -4 Q0 -14 13 -4 Q14 0 10 -1 Q7 4 5 -1 Q2 4 0 -2 Q-2 4 -5 -1 Q-7 4 -10 -1 Q-14 0 -13 -4 Z"
        fill="url(#glaze)"
      />
      <path d="M-9 -11 Q0 -19 9 -11 L8 -9 L-8 -9 Z" fill="#1a0238" stroke="#00C8FF" strokeWidth="0.8" />
      <circle cx="0" cy="-17" r="1.6" fill="#FFC857" />
      {Eyes(mood)}
      {Mouth(mood)}
    </g>
  )
}

function Eyes(mood) {
  const s = {
    Terrified: <g fill="#1a0238"><circle cx="-5" cy="-1" r="2.4" /><circle cx="5" cy="-1" r="2.4" /><circle cx="-4.5" cy="-1.5" r="0.7" fill="#fff" /><circle cx="5.5" cy="-1.5" r="0.7" fill="#fff" /></g>,
    Preening: <g stroke="#1a0238" strokeWidth="1.3" fill="none" strokeLinecap="round"><path d="M-7 -1 Q-5 -3 -3 -1" /><path d="M3 -1 Q5 -3 7 -1" /></g>,
    Suspicious: <g stroke="#1a0238" strokeWidth="1.3" fill="none" strokeLinecap="round"><path d="M-7 -1 L-3 -1" /><path d="M3 -1 L7 -1" /></g>,
    Sulking: <g fill="#1a0238"><circle cx="-5" cy="1" r="1.6" /><circle cx="5" cy="1" r="1.6" /></g>,
    Hostile: <g fill="#1a0238"><path d="M-7 -2 L-3 0 L-3 1 L-7 1 Z" /><path d="M7 -2 L3 0 L3 1 L7 1 Z" /></g>,
    Emboldened: <g fill="#1a0238"><circle cx="-5" cy="-1" r="1.8" /><circle cx="5" cy="-1" r="1.8" /></g>,
    Anxious: <g fill="#1a0238"><circle cx="-5" cy="-1" r="2" /><circle cx="5" cy="-1" r="2" /></g>
  }
  return s[mood] || <g fill="#1a0238"><circle cx="-5" cy="-1" r="1.7" /><circle cx="5" cy="-1" r="1.7" /></g>
}

function Mouth(mood) {
  const s = {
    Terrified: <path d="M-4 4 Q-2 2 0 4 Q2 6 4 4" stroke="#1a0238" strokeWidth="1.3" fill="none" strokeLinecap="round" />,
    Preening: <path d="M-4 4 Q2 6 4 3" stroke="#1a0238" strokeWidth="1.3" fill="none" strokeLinecap="round" />,
    Sulking: <path d="M-4 5 Q0 3 4 5" stroke="#1a0238" strokeWidth="1.3" fill="none" strokeLinecap="round" />,
    Hostile: <path d="M-4 5 Q0 3 4 5" stroke="#1a0238" strokeWidth="1.3" fill="none" strokeLinecap="round" />,
    Anxious: <circle cx="0" cy="4" r="1.6" fill="#1a0238" />,
    Emboldened: <path d="M-4 4 Q0 6 4 4" stroke="#1a0238" strokeWidth="1.3" fill="none" strokeLinecap="round" />,
    Suspicious: <path d="M-4 4 L4 4" stroke="#1a0238" strokeWidth="1.3" fill="none" strokeLinecap="round" />
  }
  return s[mood] || <path d="M-4 4 Q0 5 4 4" stroke="#1a0238" strokeWidth="1.3" fill="none" strokeLinecap="round" />
}

// ---------------------------------------------------------------------------
function Starfield() {
  const stars = []
  let seed = 11
  for (let i = 0; i < 46; i++) {
    seed = (seed * 9301 + 49297) % 233280
    const x = (seed / 233280) * 320
    seed = (seed * 9301 + 49297) % 233280
    const y = (seed / 233280) * 600
    seed = (seed * 9301 + 49297) % 233280
    const r = (seed / 233280) * 0.9 + 0.3
    stars.push(<circle key={i} cx={x} cy={y} r={r} fill="#7a2fd6" opacity="0.5" />)
  }
  return <g>{stars}</g>
}
