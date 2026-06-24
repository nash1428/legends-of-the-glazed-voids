// ============================================================================
// ShipPanel — right column: dungeon-maze visual of the U.S.V. Old-Fashioned
// with overlaid critical readouts (mood, objective, resources, bars).
// ============================================================================

import { ROOMS } from '../engine/rooms.js'
import ShipMaze from './ShipMaze.jsx'
import GaugeBar from './GaugeBar.jsx'

const RESOURCES = [
  { key: 'glazeCores', icon: '◆', label: 'Cores', color: 'text-cyan-glaze' },
  { key: 'neutronSprinkles', icon: '✦', label: 'Sprkl', color: 'text-glaze-gold' },
  { key: 'voidCrullers', icon: '◯', label: 'Cruller', color: 'text-glaze-pink' },
  { key: 'raspberrySingularity', icon: '★', label: 'Rasp', color: 'text-glaze-pink' },
  { key: 'forbiddenDoughnut', icon: '☠', label: 'Frbdn', color: 'text-danger' }
]

export default function ShipPanel({ state, mood }) {
  const room = ROOMS[state.currentRoom]
  return (
    <aside className="relative h-full overflow-hidden bg-void-black">
      <ShipMaze state={state} mood={mood} />

      {/* scanline atmosphere */}
      <div className="pointer-events-none absolute inset-0 scanlines" />

      {/* top overlay: mood + objective + resources */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-void-black/85 via-void-black/40 to-transparent p-2.5">
        <div className="min-w-0">
          <span className="chip border-cyan-glaze/50 text-cyan-glaze">Mood: {mood}</span>
          <p className="mt-1 max-w-[58%] text-[10px] leading-tight text-glaze-cream/85">
            <span className="font-semibold text-cyan-glaze">Objective:</span>{' '}
            {state.gameOver ? 'Run complete' : room?.objective}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {RESOURCES.map((r) => (
            <div
              key={r.key}
              className="flex items-center gap-1.5 rounded-md border border-violet-glaze/40 bg-void-deep/70 px-1.5 py-0.5"
            >
              <span className={`text-xs font-bold ${r.color}`}>{r.icon}</span>
              <span className="font-mono text-sm font-bold text-glaze-cream">{state[r.key]}</span>
              <span className="text-[8px] uppercase tracking-wide text-glaze-cream/50">{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* bottom overlay: bars */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-void-black/90 via-void-black/50 to-transparent p-2.5 pt-6">
        <GaugeBar label="shipIntegrity" value={state.shipIntegrity} />
        <GaugeBar label="composure" value={state.composure} />
        <GaugeBar label="trust" value={state.trust} />
      </div>
    </aside>
  )
}
