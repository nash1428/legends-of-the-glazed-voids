import { ROOMS } from '../engine/rooms.js'
import GlazePortrait from './GlazePortrait.jsx'
import RoomArt from './RoomArt.jsx'
import GaugeBar from './GaugeBar.jsx'

const RESOURCE_META = {
  glazeCores: { label: 'Glaze Cores', icon: '◆', color: 'text-cyan-glaze' },
  voidCrullers: { label: 'Void Crullers', icon: '◯', color: 'text-glaze-pink' },
  neutronSprinkles: { label: 'Neutron Sprinkles', icon: '✦', color: 'text-glaze-gold' }
}

export default function ShipPanel({ state, mood }) {
  const room = ROOMS[state.currentRoom]
  return (
    <aside className="flex h-full flex-col gap-3 overflow-y-auto p-3 lg:p-4">
      {/* Room */}
      <section className="panel p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="panel-title">{room?.subtitle}</div>
            <h2 className="font-display text-lg font-bold text-glaze-cream text-glow">{room?.name}</h2>
          </div>
          <span className={`chip ${room?.risk >= 0.6 ? 'border-danger/60 text-danger' : 'border-ok/50 text-ok'}`}>
            {room?.risk >= 0.6 ? 'High Risk' : 'Low Risk'}
          </span>
        </div>
        <div className="mt-2">
          <RoomArt
            room={state.currentRoom}
            riftSealed={state.riftSealed}
            strayAwake={state.strayAwake}
            strayStunned={state.strayStunned}
          />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-glaze-cream/70">
          <span className="font-semibold text-cyan-glaze">Objective:</span> {room?.objective}
        </p>
      </section>

      {/* Glaze */}
      <section className="panel p-3">
        <div className="flex items-center gap-3">
          <GlazePortrait mood={mood} composure={state.composure} />
          <div className="min-w-0 flex-1">
            <div className="panel-title">Captain GLAZE-7</div>
            <div className="font-display text-base font-bold text-glaze-cream">Captain Glaze</div>
            <div className="mt-1">
              <span className="chip border-cyan-glaze/50 text-cyan-glaze">Mood: {mood}</span>
            </div>
            <p className="mt-1.5 text-[10px] italic leading-snug text-glaze-cream/50">{tellFor(mood)}</p>
          </div>
        </div>
      </section>

      {/* Gauges */}
      <section className="panel p-3">
        <div className="mb-2 panel-title">Ship-Truth</div>
        <div className="grid grid-cols-1 gap-2.5">
          <GaugeBar label="shipIntegrity" value={state.shipIntegrity} />
          <GaugeBar label="composure" value={state.composure} />
          <GaugeBar label="trust" value={state.trust} />
          <div className="grid grid-cols-2 gap-2.5">
            <GaugeBar label="ego" value={state.ego} hidden hint="read his tone" />
            <GaugeBar label="hunger" value={state.hunger} hidden hint="read his tone" />
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="panel p-3">
        <div className="mb-2 panel-title">Resources</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(RESOURCE_META).map(([key, m]) => (
            <div key={key} className="rounded-lg border border-violet-glaze/30 bg-void-deep/60 p-2 text-center">
              <div className={`text-xl font-bold ${m.color}`}>{m.icon}</div>
              <div className="font-mono text-lg font-bold text-glaze-cream">{state[key]}</div>
              <div className="text-[9px] uppercase tracking-wide text-glaze-cream/50">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Threats */}
      <section className="panel p-3">
        <div className="mb-2 panel-title">Status</div>
        <ul className="space-y-1.5 text-[11px]">
          <StatusRow ok={state.riftSealed} label="Rift" okText="Sealed" badText="Bleeding" />
          <StatusRow
            ok={state.currentRoom !== 'glazing_bay' || state.strayStunned || !state.strayAwake}
            warn={!state.strayStunned && state.strayAwake && state.currentRoom === 'glazing_bay'}
            label="Chrome Stray"
            okText="Dormant / Stunned"
            badText="Awake & gnawing"
            warnText="Stirring"
          />
          <StatusRow ok={state.vermiousFed} label="Vermious" okText="Fed — portal open" badText="Hungry" />
        </ul>
      </section>
    </aside>
  )
}

function StatusRow({ ok, warn, label, okText, badText, warnText }) {
  const color = warn ? 'text-warn' : ok ? 'text-ok' : 'text-danger'
  const dot = warn ? 'bg-warn' : ok ? 'bg-ok' : 'bg-danger'
  return (
    <li className="flex items-center justify-between">
      <span className="text-glaze-cream/70">{label}</span>
      <span className={`flex items-center gap-1.5 font-semibold ${color}`}>
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
        {warn ? warnText : ok ? okText : badText}
      </span>
    </li>
  )
}

function tellFor(mood) {
  switch (mood) {
    case 'Terrified':
      return "'I—I can't. My icing's shaking.'"
    case 'Preening':
      return "'Obviously, I'm the best Captain who ever glazed.'"
    case 'Suspicious':
      return "'Mmhm. I see you scheming, operator.'"
    case 'Sulking':
      return "'...whatever. Do it yourself, then.'"
    default:
      return "'The Captain is... considering his options.'"
  }
}
