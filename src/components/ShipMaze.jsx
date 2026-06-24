// ============================================================================
// ShipMaze — complex dungeon maze of the U.S.V. Old-Fashioned.
// 7 forward nodes + 3 optional side passages:
//   Bridge → North Corridor → Glazing Bay → East Shaft → The Maw → Final Conduit → Escape Portal
// Side passages: NC inspection panel, GB side vent, ES broken locker.
// Nested concentric square walls, winding corridor, dead-end side branches.
// Palette: walls #4B1A8C, floor #0A0014, accents #00C8FF.
// ============================================================================

import { ROOM_ORDER, ROOMS } from '../engine/rooms.js'

// Node positions: spiral inward toward center. Side passages branch off.
const NODES = {
  bridge:         { x: 200, y: 40,  name: 'Bridge' },
  north_corridor: { x: 200, y: 95,  name: 'North Corridor' },
  glazing_bay:    { x: 200, y: 160, name: 'Glazing Bay' },
  east_shaft:     { x: 200, y: 225, name: 'East Shaft' },
  maw:            { x: 200, y: 290, name: 'The Maw' },
  final_conduit:  { x: 200, y: 350, name: 'Final Conduit' },
  escape_portal:  { x: 200, y: 405, name: 'Escape Portal' }
}

// Side passage node positions (branch off the main path)
const SIDE_NODES = {
  nc_side: { x: 120, y: 95,  name: 'Panel' },
  gb_side: { x: 285, y: 160, name: 'Vent' },
  es_side: { x: 115, y: 225, name: 'Locker' }
}

// Side passage corridors (branch from main room to side node)
const SIDE_CORRIDORS = [
  { room: 'north_corridor', sideId: 'nc_side', from: { x: 200, y: 95 }, to: { x: 120, y: 95 }, d: 'M200 95 H120' },
  { room: 'glazing_bay', sideId: 'gb_side', from: { x: 200, y: 160 }, to: { x: 285, y: 160 }, d: 'M200 160 H285' },
  { room: 'east_shaft', sideId: 'es_side', from: { x: 200, y: 225 }, to: { x: 115, y: 225 }, d: 'M200 225 H115' }
]

// Main forward corridors between consecutive rooms
const CORRIDORS = [
  { from: 'bridge', to: 'north_corridor', d: 'M200 40 V95', door: { x: 200, y: 68 } },
  { from: 'north_corridor', to: 'glazing_bay', d: 'M200 95 V160', door: { x: 200, y: 128 } },
  { from: 'glazing_bay', to: 'east_shaft', d: 'M200 160 V225', door: { x: 200, y: 193 } },
  { from: 'east_shaft', to: 'maw', d: 'M200 225 V290', door: { x: 200, y: 258 } },
  { from: 'maw', to: 'final_conduit', d: 'M200 290 V350', door: { x: 200, y: 320 } },
  { from: 'final_conduit', to: 'escape_portal', d: 'M200 350 V405', door: { x: 200, y: 378 } }
]

// Concentric square walls
const WALLS = [
  { x: 30, y: 20, w: 340, sw: 7 },
  { x: 70, y: 60, w: 260, sw: 6 },
  { x: 110, y: 100, w: 180, sw: 6 },
  { x: 150, y: 270, w: 100, sw: 5 }
]

function objectivePos(state) {
  if (state.gameOver) return null
  const room = state.currentRoom
  if (room === 'bridge' || room === 'north_corridor' || room === 'east_shaft')
    return { x: 250, y: NODES[room].y - 15, label: 'Move Forward' }
  if (room === 'glazing_bay') return { x: 250, y: NODES[room].y, label: 'Grab Core' }
  if (room === 'maw') {
    if (!state.riftSealed) return { x: 150, y: NODES[room].y, label: 'Seal Rift' }
    if (state.voidCrullers < 1 && state.glazeCores >= 2 && state.neutronSprinkles >= 1)
      return { x: 250, y: NODES[room].y, label: 'Craft Cruller' }
    return { x: 250, y: NODES[room].y, label: 'Move to Conduit' }
  }
  if (room === 'final_conduit') return { x: 250, y: NODES[room].y, label: 'Feed Vermious' }
  return null
}

export default function ShipMaze({ state, mood }) {
  const cur = state.currentRoom
  const curIdx = ROOM_ORDER.indexOf(cur)
  const completed = new Set(state.completedRooms || [])
  const obj = objectivePos(state)
  const target = Math.min(curIdx + 1, ROOM_ORDER.length - 1)
  const incoming = CORRIDORS.find((c) => c.to === cur)
  const movePath = incoming ? incoming.d : null

  return (
    <svg viewBox="0 0 400 440" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#15002a" />
          <stop offset="70%" stopColor="#0c011c" />
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
          <stop offset="0%" stopColor="#bff4ff" />
          <stop offset="55%" stopColor="#00C8FF" />
          <stop offset="100%" stopColor="#0a3a52" />
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
        <radialGradient id="sidep" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#FFC857" />
          <stop offset="100%" stopColor="#8a5a2a" />
        </radialGradient>
        <filter id="stone" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
        </filter>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <pattern id="cracks" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="none" />
          <path d="M0 12 L14 8 L22 18 L40 14" stroke="#2e0f5e" strokeWidth="0.6" fill="none" opacity="0.5" />
          <path d="M6 40 L10 28 L20 30" stroke="#2e0f5e" strokeWidth="0.5" fill="none" opacity="0.4" />
          <circle cx="30" cy="22" r="0.8" fill="#2e0f5e" opacity="0.4" />
        </pattern>
      </defs>

      <rect width="400" height="440" fill="url(#bg)" />
      <Starfield />
      <Hull />

      {/* concentric walls */}
      {WALLS.map((w, i) => {
        const fogged = i > target
        return (
          <g key={i} opacity={fogged ? 0.22 : 1} filter="url(#stone)">
            <rect x={w.x} y={w.y} width={w.w} height={w.w} rx="6" fill="none" stroke="#4B1A8C" strokeWidth={w.sw} />
            <rect x={w.x} y={w.y} width={w.w} height={w.w} rx="6" fill="url(#cracks)" opacity="0.6" />
            <rect x={w.x + 1} y={w.y + 1} width={w.w - 2} height={w.w - 2} rx="5" fill="none" stroke="#7a2fd6" strokeWidth="0.6" opacity="0.5" />
          </g>
        )
      })}

      {/* side passage corridors */}
      {SIDE_CORRIDORS.map((c) => {
        const fogged = ROOM_ORDER.indexOf(c.room) > target
        const searched = state.sideSearched?.[c.room]
        return (
          <g key={c.sideId} opacity={fogged ? 0.2 : 1}>
            <path d={c.d} fill="none" stroke="#0A0014" strokeWidth="11" strokeLinecap="round" />
            <path d={c.d} fill="none" stroke="#1f0640" strokeWidth="7" strokeLinecap="round" />
            <path d={c.d} fill="none" stroke="#FFC857" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="2 5" opacity={searched ? 0.15 : 0.4} />
          </g>
        )
      })}

      {/* main forward corridors */}
      {CORRIDORS.map((c, i) => {
        const fogged = i > target
        return (
          <g key={c.from} opacity={fogged ? 0.22 : 1}>
            <path d={c.d} fill="none" stroke="#0A0014" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d={c.d} fill="none" stroke="#1f0640" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d={c.d} fill="none" stroke="#00C8FF" strokeWidth="1" strokeLinecap="round" strokeDasharray="3 7" opacity="0.4" />
          </g>
        )
      })}

      {/* doors on main path */}
      {CORRIDORS.map((c, i) => {
        const locked = !completed.has(c.from)
        const fogged = i > target
        return <Door key={c.from} x={c.door.x} y={c.door.y} locked={locked} fogged={fogged} />
      })}

      {/* side passage nodes (pickup markers) */}
      {SIDE_CORRIDORS.map((sc) => {
        const fogged = ROOM_ORDER.indexOf(sc.room) > target
        const searched = state.sideSearched?.[sc.room]
        const node = SIDE_NODES[sc.sideId]
        if (fogged) return null
        return <SidePickup key={sc.sideId} x={node.x} y={node.y} searched={searched} room={ROOMS[sc.room]} />
      })}

      {/* room nodes */}
      {ROOM_ORDER.map((id, i) => {
        const isCurrent = id === cur
        const isCompleted = completed.has(id)
        const fogged = i > target
        return (
          <RoomNode key={id} id={id} node={NODES[id]} isCurrent={isCurrent} isCompleted={isCompleted} fogged={fogged} state={state} />
        )
      })}

      {/* entities */}
      <ChromeStray state={state} />
      <Rift state={state} />
      <Vermious state={state} />

      {/* objective marker */}
      {obj && <Objective x={obj.x} y={obj.y} label={obj.label} />}

      {/* Glaze avatar */}
      {movePath ? (
        <g key={cur}>
          <animateMotion dur="0.85s" fill="freeze" path={movePath} />
          <MazeAvatar mood={mood} />
        </g>
      ) : (
        <g transform={`translate(${NODES[cur]?.x ?? 200} ${NODES[cur]?.y ?? 40})`}>
          <MazeAvatar mood={mood} />
        </g>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
function Hull() {
  return (
    <g>
      <rect x="14" y="14" width="372" height="412" rx="14" fill="none" stroke="#4B1A8C" strokeWidth="2.5" opacity="0.7" />
      <rect x="20" y="20" width="360" height="400" rx="10" fill="none" stroke="#7a2fd6" strokeWidth="0.8" opacity="0.4" />
      <text x="200" y="10" textAnchor="middle" fill="#7a2fd6" fontSize="7" fontWeight="700" letterSpacing="2.5" opacity="0.8">
        U.S.V. OLD-FASHIONED
      </text>
    </g>
  )
}

function Door({ x, y, locked, fogged }) {
  if (fogged) return null
  if (locked) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <rect x="-15" y="-6" width="30" height="12" rx="2" fill="#00C8FF" opacity="0.22" filter="url(#soft)" className="animate-flicker" />
        <rect x="-13" y="-4" width="26" height="8" rx="1.5" fill="#00C8FF" opacity="0.85" className="animate-flicker" />
        <line x1="-11" y1="0" x2="11" y2="0" stroke="#e6fbff" strokeWidth="1.2" opacity="0.9" />
        <text y="-10" textAnchor="middle" fill="#00C8FF" fontSize="6.5" fontWeight="700" letterSpacing="1">🔒</text>
      </g>
    )
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="9" fill="#00C8FF" opacity="0.14" className="animate-pulseglow" />
      <rect x="-11" y="-2.5" width="22" height="5" rx="1.5" fill="#00C8FF" opacity="0.3" />
      <text y="-9" textAnchor="middle" fill="#7ff3ff" fontSize="6" fontWeight="700" letterSpacing="1" opacity="0.8">OPEN</text>
    </g>
  )
}

function SidePickup({ x, y, searched, room }) {
  if (searched) {
    return (
      <g transform={`translate(${x} ${y})`} opacity="0.4">
        <rect x="-8" y="-8" width="16" height="16" rx="2" fill="none" stroke="#FFC857" strokeWidth="1" strokeDasharray="2 2" />
        <text y="2" textAnchor="middle" fill="#FFC857" fontSize="7">✓</text>
      </g>
    )
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="12" fill="#FFC857" opacity="0.14" className="animate-pulseglow" filter="url(#soft)" />
      <rect x="-8" y="-8" width="16" height="16" rx="3" fill="url(#sidep)" stroke="#FFC857" strokeWidth="1" />
      <text y="3" textAnchor="middle" fill="#0A0014" fontSize="9" fontWeight="700">?</text>
      <text y="22" textAnchor="middle" fill="#FFC857" fontSize="6" opacity="0.8">{room?.sidePassage?.name || 'Side'}</text>
    </g>
  )
}

function RoomNode({ id, node, isCurrent, isCompleted, fogged, state }) {
  const opacity = fogged ? 0.18 : isCompleted ? 0.5 : 1
  const labelAbove = ['bridge', 'north_corridor', 'glazing_bay'].includes(id)
  return (
    <g transform={`translate(${node.x} ${node.y})`} opacity={opacity}>
      {isCurrent && (
        <>
          <circle r="20" fill="none" stroke="#00C8FF" strokeWidth="1.8" className="animate-pulseglow" opacity="0.9" />
          <circle r="18" fill="#15002a" opacity="0.5" />
        </>
      )}
      {!isCurrent && (
        <g>
          <circle r="13" fill="url(#dough)" stroke="#8a5a2a" strokeWidth="1.6" strokeDasharray={fogged ? '3 3' : 'none'} />
          <circle r="5" fill="#0A0014" stroke="#8a5a2a" strokeWidth="1" strokeDasharray={fogged ? '2 2' : 'none'} />
          <path d="M-11 -3 Q0 -12 11 -3 Q12 0 8 -1 Q6 3 4 -1 Q2 3 0 -2 Q-2 3 -4 -1 Q-6 3 -8 -1 Q-12 0 -11 -3 Z" fill="url(#glaze)" opacity="0.9" />
          {id === 'escape_portal' && !fogged && (
            <circle r="9" fill="url(#portal)" opacity="0.7" className="animate-pulseglow" />
          )}
        </g>
      )}
      {isCompleted && !fogged && (
        <g transform="translate(18 -18)">
          <circle r="7.5" fill="#00C8FF" opacity="0.9" />
          <path d="M-3.5 0 L-1 2.5 L3.5 -2.5" stroke="#0A0014" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {id === 'glazing_bay' && !fogged && !isCurrent && <CoresRack state={state} />}
      {/* labels */}
      {labelAbove ? (
        <text y="-20" textAnchor="middle" fill="#FFE9C7" fontSize="8" fontWeight="700" opacity={fogged ? 0.4 : 0.95}>{node.name}</text>
      ) : (
        <text y="24" textAnchor="middle" fill="#FFE9C7" fontSize="8" fontWeight="700" opacity={fogged ? 0.4 : 0.95}>{node.name}</text>
      )}
      {fogged && (
        <text y="-26" textAnchor="middle" fill="#7a2fd6" fontSize="5.5" letterSpacing="1.5" opacity="0.5">◌ UNKNOWN</text>
      )}
    </g>
  )
}

function CoresRack({ state }) {
  const count = Math.min(state.glazeCores, 3)
  return (
    <g transform="translate(-22 -2)">
      {Array.from({ length: 3 }).map((_, i) => (
        <circle key={i} cx={i * 7} cy="0" r="2.6" fill="url(#coreg)" opacity={i < count ? 0.95 : 0.15} />
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------------
function ChromeStray({ state }) {
  const discovered = ROOM_ORDER.indexOf(state.currentRoom) >= 2
  if (!discovered) return null
  const awake = state.strayAwake && !state.strayStunned
  const stunned = state.strayStunned
  const eye = stunned ? '#5a5a6a' : awake ? '#00C8FF' : '#3a7a8a'
  const inBay = state.currentRoom === 'glazing_bay'
  const op = inBay ? 1 : 0.4
  return (
    <g transform="translate(250 160)" opacity={op}>
      <circle r="13" fill={eye} opacity="0.2" filter="url(#soft)" className={awake ? 'animate-flicker' : ''} />
      <ellipse cx="0" cy="2" rx="9" ry="7.5" fill="#cfd6e4" stroke="#9aa6bd" strokeWidth="0.8" />
      <path d="M-7 -3 L-9 -10 L-3 -6 Z" fill="#cfd6e4" stroke="#9aa6bd" strokeWidth="0.6" />
      <path d="M7 -3 L9 -10 L3 -6 Z" fill="#cfd6e4" stroke="#9aa6bd" strokeWidth="0.6" />
      <circle cx="-3.5" cy="1" r="1.8" fill={eye} className={awake ? 'animate-flicker' : ''} />
      <circle cx="3.5" cy="1" r="1.8" fill={eye} className={awake ? 'animate-flicker' : ''} />
      {stunned && <text y="18" textAnchor="middle" fill="#5a5a6a" fontSize="6">✕ stunned</text>}
      {awake && <text y="18" textAnchor="middle" fill="#00C8FF" fontSize="6">! awake</text>}
      {!awake && !stunned && <text y="18" textAnchor="middle" fill="#3a7a8a" fontSize="6" opacity="0.7">z dormant</text>}
    </g>
  )
}

function Rift({ state }) {
  const discovered = ROOM_ORDER.indexOf(state.currentRoom) >= 4
  if (!discovered) return null
  const sealed = state.riftSealed
  const inMaw = state.currentRoom === 'maw' || state.currentRoom === 'final_conduit'
  const op = inMaw ? 1 : 0.4
  return (
    <g transform="translate(150 290)" opacity={op}>
      {sealed ? (
        <g>
          <path d="M0 -16 Q-9 0 0 16 Q9 0 0 -16 Z" fill="#1a0238" stroke="#00C8FF" strokeWidth="1.2" opacity="0.8" />
          <path d="M-5 -1 L-2 3 L5 -5" fill="none" stroke="#7ff3ff" strokeWidth="1.6" strokeLinecap="round" />
          <text y="26" textAnchor="middle" fill="#7ff3ff" fontSize="6" opacity="0.8">rift sealed</text>
        </g>
      ) : (
        <g className="animate-flicker">
          <path d="M0 -18 Q-10 0 0 18 Q10 0 0 -18 Z" fill="url(#rift)" opacity="0.9" />
          <path d="M0 -13 Q-6 0 0 13 Q6 0 0 -13 Z" fill="#bff4ff" opacity="0.6" />
          <circle r="20" fill="#00C8FF" opacity="0.18" filter="url(#soft)" />
          <text y="28" textAnchor="middle" fill="#00C8FF" fontSize="6">RIFT OPEN</text>
        </g>
      )}
    </g>
  )
}

function Vermious({ state }) {
  const discovered = ROOM_ORDER.indexOf(state.currentRoom) >= 5
  const fed = state.vermiousFed
  const op = discovered ? 0.95 : 0.2
  const color = fed ? '#3ee0c0' : '#00C8FF'
  return (
    <g transform="translate(200 350)" opacity={op}>
      <g className={fed ? '' : 'animate-flicker'}>
        <path d="M-26 4 Q-16 -8 -6 4 Q4 16 14 4 Q22 -6 14 -8" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        <circle cx="14" cy="-8" r="4.5" fill={color} opacity="0.9" />
        <circle cx="15.5" cy="-9.5" r="1.1" fill="#0A0014" />
        <circle r="16" fill={color} opacity="0.12" filter="url(#soft)" />
      </g>
    </g>
  )
}

// ---------------------------------------------------------------------------
function Objective({ x, y, label }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="11" fill="#00C8FF" opacity="0.15" className="animate-pulseglow" />
      <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#00C8FF" className="animate-pulseglow" />
      <text y="-14" textAnchor="middle" fill="#00C8FF" fontSize="6" fontWeight="700" letterSpacing="1" opacity="0.95">▼ {label}</text>
    </g>
  )
}

// ---------------------------------------------------------------------------
function MazeAvatar({ mood }) {
  return (
    <g>
      <circle r="16" fill="#00C8FF" opacity="0.16" filter="url(#soft)" className="animate-pulseglow" />
      <circle r="12" fill="url(#dough)" stroke="#8a5a2a" strokeWidth="1.2" />
      <circle r="4.5" fill="#0A0014" stroke="#8a5a2a" strokeWidth="0.9" />
      <path d="M-10 -3 Q0 -11 10 -3 Q11 0 8 -1 Q6 3 4 -1 Q2 3 0 -2 Q-2 3 -4 -1 Q-6 3 -8 -1 Q-11 0 -10 -3 Z" fill="url(#glaze)" />
      <path d="M-7 -9 Q0 -15 7 -9 L6 -7 L-6 -7 Z" fill="#1a0238" stroke="#00C8FF" strokeWidth="0.6" />
      <circle cx="0" cy="-13" r="1.3" fill="#FFC857" />
      {Eyes(mood)}
      {Mouth(mood)}
    </g>
  )
}

function Eyes(mood) {
  const s = {
    Terrified: <g fill="#1a0238"><circle cx="-4" cy="-1" r="2" /><circle cx="4" cy="-1" r="2" /><circle cx="-3.5" cy="-1.5" r="0.6" fill="#fff" /><circle cx="4.5" cy="-1.5" r="0.6" fill="#fff" /></g>,
    Preening: <g stroke="#1a0238" strokeWidth="1.1" fill="none" strokeLinecap="round"><path d="M-6 -1 Q-4 -3 -2 -1" /><path d="M2 -1 Q4 -3 6 -1" /></g>,
    Suspicious: <g stroke="#1a0238" strokeWidth="1.1" fill="none" strokeLinecap="round"><path d="M-6 -1 L-2 -1" /><path d="M2 -1 L6 -1" /></g>,
    Sulking: <g fill="#1a0238"><circle cx="-4" cy="1" r="1.4" /><circle cx="4" cy="1" r="1.4" /></g>,
    Hostile: <g fill="#1a0238"><path d="M-6 -2 L-2 0 L-2 1 L-6 1 Z" /><path d="M6 -2 L2 0 L2 1 L6 1 Z" /></g>,
    Emboldened: <g fill="#1a0238"><circle cx="-4" cy="-1" r="1.5" /><circle cx="4" cy="-1" r="1.5" /></g>,
    Anxious: <g fill="#1a0238"><circle cx="-4" cy="-1" r="1.7" /><circle cx="4" cy="-1" r="1.7" /></g>
  }
  return s[mood] || <g fill="#1a0238"><circle cx="-4" cy="-1" r="1.5" /><circle cx="4" cy="-1" r="1.5" /></g>
}

function Mouth(mood) {
  const s = {
    Terrified: <path d="M-3 3 Q-1.5 1.5 0 3 Q1.5 4.5 3 3" stroke="#1a0238" strokeWidth="1.1" fill="none" strokeLinecap="round" />,
    Preening: <path d="M-3 3 Q1.5 5 3 2" stroke="#1a0238" strokeWidth="1.1" fill="none" strokeLinecap="round" />,
    Sulking: <path d="M-3 4 Q0 2 3 4" stroke="#1a0238" strokeWidth="1.1" fill="none" strokeLinecap="round" />,
    Hostile: <path d="M-3 4 Q0 2 3 4" stroke="#1a0238" strokeWidth="1.1" fill="none" strokeLinecap="round" />,
    Anxious: <circle cx="0" cy="3" r="1.3" fill="#1a0238" />,
    Emboldened: <path d="M-3 3 Q0 5 3 3" stroke="#1a0238" strokeWidth="1.1" fill="none" strokeLinecap="round" />,
    Suspicious: <path d="M-3 3 L3 3" stroke="#1a0238" strokeWidth="1.1" fill="none" strokeLinecap="round" />
  }
  return s[mood] || <path d="M-3 3 Q0 4 3 3" stroke="#1a0238" strokeWidth="1.1" fill="none" strokeLinecap="round" />
}

// ---------------------------------------------------------------------------
function Starfield() {
  const stars = []
  let seed = 13
  for (let i = 0; i < 45; i++) {
    seed = (seed * 9301 + 49297) % 233280
    const x = (seed / 233280) * 400
    seed = (seed * 9301 + 49297) % 233280
    const y = (seed / 233280) * 440
    seed = (seed * 9301 + 49297) % 233280
    const r = (seed / 233280) * 0.8 + 0.3
    stars.push(<circle key={i} cx={x} cy={y} r={r} fill="#7a2fd6" opacity="0.4" />)
  }
  return <g>{stars}</g>
}
