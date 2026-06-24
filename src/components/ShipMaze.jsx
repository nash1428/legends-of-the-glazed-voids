// ============================================================================
// ShipMaze — dungeon-maze visual of the U.S.V. Old-Fashioned.
// Rooms as doughnut nodes, corridors as paths, current room highlighted with
// the Glaze avatar, open rifts pulsing red, Chrome Strays as glowing cat icons,
// Vermious the Glazeworm at the Maw, objective marker, visited/unvisited states.
// ============================================================================

import { ROOMS } from '../engine/rooms.js'

const ORDER = ['bridge', 'glazing_bay', 'maw']
const NODES = {
  bridge: { x: 160, y: 92, name: 'The Bridge', sub: 'Command Deck' },
  glazing_bay: { x: 160, y: 292, name: 'Glazing Bay', sub: 'Core Repository' },
  maw: { x: 160, y: 488, name: 'The Maw', sub: 'Engineering' }
}

function objectivePos(state) {
  if (state.gameOver) return null
  if (state.currentRoom === 'bridge') return { x: 160, y: 168, label: 'Reach Hatch' }
  if (state.currentRoom === 'glazing_bay') return { x: 160, y: 226, label: 'Grab Core' }
  if (!state.riftSealed) return { x: 108, y: 462, label: 'Seal Rift' }
  if (!state.vermiousFed) return { x: 160, y: 552, label: 'Feed Vermious' }
  return null
}

export default function ShipMaze({ state, mood }) {
  const cur = state.currentRoom
  const curIdx = ORDER.indexOf(cur)
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
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* background */}
      <rect width="320" height="600" fill="url(#bg)" />
      <Starfield />

      {/* hull frame */}
      <Hull />

      {/* corridors */}
      <Corridor d="M160 126 C 198 172, 122 214, 160 258" />
      <Corridor d="M160 326 C 198 372, 122 414, 160 454" />

      {/* room nodes */}
      {ORDER.map((id, i) => (
        <RoomNode
          key={id}
          id={id}
          node={NODES[id]}
          isCurrent={id === cur}
          visited={i <= curIdx}
          state={state}
        />
      ))}

      {/* entities */}
      <ChromeStray state={state} />
      <Rift state={state} />
      <Vermious state={state} />

      {/* objective marker */}
      {obj && <Objective x={obj.x} y={obj.y} label={obj.label} />}

      {/* avatar at current room */}
      <g transform={`translate(${NODES[cur].x} ${NODES[cur].y})`}>
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
      {/* hull rivets */}
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
      <path d={d} fill="none" stroke="#00C8FF" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 7" opacity="0.55" />
    </g>
  )
}

function RoomNode({ id, node, isCurrent, visited, state }) {
  const opacity = visited ? 1 : 0.34
  const dashed = !visited
  return (
    <g transform={`translate(${node.x} ${node.y})`} opacity={opacity}>
      {/* platform ring for current */}
      {isCurrent && (
        <circle r="42" fill="none" stroke="#00C8FF" strokeWidth="2" className="animate-pulseglow" opacity="0.9" />
      )}
      {isCurrent && <circle r="40" fill="#15002a" opacity="0.55" />}

      {/* doughnut room body (hidden face when current — avatar sits here instead) */}
      {!isCurrent && (
        <g>
          <circle r="32" fill="url(#dough)" stroke="#8a5a2a" strokeWidth="2" strokeDasharray={dashed ? '4 4' : 'none'} />
          <circle r="12" fill="#0A0014" stroke="#8a5a2a" strokeWidth="1.4" strokeDasharray={dashed ? '2 3' : 'none'} />
          <path
            d="M-28 -8 Q0 -30 28 -8 Q30 0 22 -2 Q16 8 11 -2 Q5 8 0 -4 Q-6 8 -11 -2 Q-16 8 -22 -2 Q-30 0 -28 -8 Z"
            fill="url(#glaze)"
            opacity="0.92"
          />
        </g>
      )}

      {/* core glyphs in the glazing bay */}
      {id === 'glazing_bay' && visited && <CoresRack state={state} />}

      {/* labels */}
      <text y="52" textAnchor="middle" fill="#FFE9C7" fontSize="11" fontWeight="700" opacity={visited ? 0.95 : 0.5}>
        {node.name}
      </text>
      <text y="64" textAnchor="middle" fill="#7a2fd6" fontSize="7.5" letterSpacing="1.5" opacity={visited ? 0.7 : 0.4}>
        {node.sub.toUpperCase()}
      </text>

      {/* unvisited scan tag */}
      {!visited && (
        <text y="-44" textAnchor="middle" fill="#00C8FF" fontSize="7" letterSpacing="1.5" opacity="0.55">
          ◌ UNENTERED
        </text>
      )}
    </g>
  )
}

function CoresRack({ state }) {
  const count = Math.min(state.glazeCores + (state.currentRoom === 'glazing_bay' ? 0 : 0), 3)
  return (
    <g transform="translate(-44 -2)">
      {Array.from({ length: 3 }).map((_, i) => (
        <circle key={i} cx={i * 9} cy="0" r="3.4" fill="url(#coreg)" opacity={i < count ? 0.95 : 0.18} />
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------------
function ChromeStray({ state }) {
  const inBay = state.currentRoom === 'glazing_bay'
  const visible = state.currentRoom === 'glazing_bay' || state.strayAwake || state.strayStunned
  // foreshadow the stray once the bay is discovered
  const discovered = ORDER.indexOf(state.currentRoom) >= 1
  if (!discovered) return null
  const awake = state.strayAwake && !state.strayStunned
  const stunned = state.strayStunned
  const eye = stunned ? '#5a5a6a' : awake ? '#ff3b6b' : '#00C8FF'
  const op = visible || discovered ? 1 : 0.4
  return (
    <g transform="translate(232 286)" opacity={op}>
      {/* glow */}
      <circle r="16" fill={eye} opacity="0.18" filter="url(#soft)" className={awake ? 'animate-flicker' : ''} />
      {/* cat head */}
      <ellipse cx="0" cy="2" rx="11" ry="9" fill="#cfd6e4" stroke="#9aa6bd" strokeWidth="1" />
      {/* ears */}
      <path d="M-9 -4 L-11 -12 L-4 -7 Z" fill="#cfd6e4" stroke="#9aa6bd" strokeWidth="0.8" />
      <path d="M9 -4 L11 -12 L4 -7 Z" fill="#cfd6e4" stroke="#9aa6bd" strokeWidth="0.8" />
      {/* eyes */}
      <circle cx="-4" cy="1" r="2.2" fill={eye} className={awake ? 'animate-flicker' : ''} />
      <circle cx="4" cy="1" r="2.2" fill={eye} className={awake ? 'animate-flicker' : ''} />
      {/* status tag */}
      {stunned && <text y="22" textAnchor="middle" fill="#5a5a6a" fontSize="7">✕ stunned</text>}
      {awake && <text y="22" textAnchor="middle" fill="#ff3b6b" fontSize="7">! awake</text>}
      {!awake && !stunned && <text y="22" textAnchor="middle" fill="#00C8FF" fontSize="7" opacity="0.7">z dormant</text>}
      {inBay && <text y="-20" textAnchor="middle" fill="#9aa6bd" fontSize="7" opacity="0.7">Chrome Stray</text>}
    </g>
  )
}

function Rift({ state }) {
  const discovered = ORDER.indexOf(state.currentRoom) >= 2
  if (!discovered) return null
  const sealed = state.riftSealed
  return (
    <g transform="translate(108 462)">
      {sealed ? (
        <g>
          <path d="M0 -22 Q-12 0 0 22 Q12 0 0 -22 Z" fill="#1a0238" stroke="#00C8FF" strokeWidth="1.5" opacity="0.8" />
          <path d="M-6 -2 L-2 4 L6 -6" fill="none" stroke="#3ee08a" strokeWidth="2" strokeLinecap="round" />
          <text y="36" textAnchor="middle" fill="#3ee08a" fontSize="7" opacity="0.8">rift sealed</text>
        </g>
      ) : (
        <g className="animate-flicker">
          <path d="M0 -24 Q-13 0 0 24 Q13 0 0 -24 Z" fill="url(#rift)" opacity="0.9" />
          <path d="M0 -18 Q-8 0 0 18 Q8 0 0 -18 Z" fill="#ffb6c8" opacity="0.7" />
          <circle r="26" fill="#ff3b6b" opacity="0.2" filter="url(#soft)" />
          <text y="38" textAnchor="middle" fill="#ff3b6b" fontSize="7">RIFT BLEEDING</text>
        </g>
      )}
    </g>
  )
}

function Vermious({ state }) {
  const discovered = ORDER.indexOf(state.currentRoom) >= 2
  const fed = state.vermiousFed
  const op = discovered ? 1 : 0.45
  const color = fed ? '#3ee08a' : '#FF6FB5'
  return (
    <g transform="translate(160 552)" opacity={op}>
      <g className={fed ? '' : 'animate-flicker'}>
        {/* coiled body */}
        <path
          d="M-34 6 Q-20 -10 -6 6 Q8 22 22 6 Q34 -8 22 -10"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* head */}
        <circle cx="22" cy="-10" r="6" fill={color} opacity="0.9" />
        <circle cx="24" cy="-12" r="1.4" fill="#0A0014" />
        {/* glow */}
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
// Compact mood-reactive Glaze avatar drawn natively in SVG (aligned with maze).
function MazeAvatar({ mood }) {
  return (
    <g>
      <circle r="20" fill="#00C8FF" opacity="0.16" filter="url(#soft)" className="animate-pulseglow" />
      {/* doughnut body */}
      <circle r="15" fill="url(#dough)" stroke="#8a5a2a" strokeWidth="1.4" />
      <circle r="5.5" fill="#0A0014" stroke="#8a5a2a" strokeWidth="1" />
      <path
        d="M-13 -4 Q0 -14 13 -4 Q14 0 10 -1 Q7 4 5 -1 Q2 4 0 -2 Q-2 4 -5 -1 Q-7 4 -10 -1 Q-14 0 -13 -4 Z"
        fill="url(#glaze)"
      />
      {/* captain's hat */}
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
  return s[mood] || s.Guarded || (
    <g fill="#1a0238"><circle cx="-5" cy="-1" r="1.7" /><circle cx="5" cy="-1" r="1.7" /></g>
  )
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

// re-export for any external use
export { ROOMS }
