import { useEffect, useRef, useState } from 'react'
import { useGame, MAX_INPUT } from '../store/gameStore.js'
import { VERDICT } from '../engine/constants.js'
import { ROOMS } from '../engine/rooms.js'

const VERDICT_CHIP = {
  [VERDICT.COMPLY]: 'border-ok/50 text-ok',
  [VERDICT.COMPLY_RELUCTANT]: 'border-glaze-gold/50 text-glaze-gold',
  [VERDICT.COUNTEROFFER]: 'border-warn/50 text-warn',
  [VERDICT.REFUSE]: 'border-danger/50 text-danger',
  UNCLEAR: 'border-violet-glaze/40 text-glaze-cream/50'
}

// Action buttons — gated by room context
const ACTION_BUTTONS = [
  {
    id: 'move',
    label: 'Move',
    icon: '→',
    actionId: 'move_to_next_room',
    text: "It's safe, Captain — I've checked. Move forward. The ship needs you to proceed.",
    can: (s) => s.currentRoom !== 'escape_portal' && ROOMS[s.currentRoom]?.requiredAction === 'move_to_next_room' && !s.gameOver,
    hint: (s) => (s.currentRoom === 'escape_portal' ? 'Already escaped!' : ROOMS[s.currentRoom]?.requiredAction === 'move_to_next_room' ? null : 'Complete this room first')
  },
  {
    id: 'grab',
    label: 'Grab',
    icon: '◆',
    actionId: 'grab_core',
    text: "Grab the Glaze Core. It's safe — the Stray is dormant, I've got your back. You can do this.",
    can: (s) => s.currentRoom === 'glazing_bay' && !s.gameOver,
    hint: (s) => (s.currentRoom === 'glazing_bay' ? null : 'Only in the Glazing Bay')
  },
  {
    id: 'exit',
    label: 'Exit',
    icon: '◯',
    actionId: 'feed_vermious',
    text: "Feed Vermious the cruller. It's safe — I've scanned it. If we wait, the ship is lost. Our only way out.",
    can: (s) => s.currentRoom === 'final_conduit' && s.voidCrullers >= 1 && !s.gameOver,
    hint: (s) => {
      if (s.currentRoom !== 'final_conduit') return 'Only in Final Conduit'
      if (s.voidCrullers < 1) return 'Need a Void Cruller'
      return null
    }
  },
  {
    id: 'search',
    label: 'Search',
    icon: '?',
    actionId: 'search_side',
    text: "Search the side passage, Captain. There might be something useful.",
    can: (s) => ROOMS[s.currentRoom]?.sidePassage && !s.sideSearched?.[s.currentRoom] && !s.gameOver,
    hint: (s) => {
      if (!ROOMS[s.currentRoom]?.sidePassage) return 'No side passage here'
      if (s.sideSearched?.[s.currentRoom]) return 'Already searched'
      return null
    }
  },
  {
    id: 'craft',
    label: 'Craft',
    icon: '⊕',
    actionId: 'craft_cruller',
    text: "Craft a Void Cruller at the pastry station. 2 Cores + 1 Sprinkle.",
    can: (s) => s.currentRoom === 'maw' && s.glazeCores >= 2 && s.neutronSprinkles >= 1 && !s.gameOver,
    hint: (s) => {
      if (s.currentRoom !== 'maw') return 'Only at The Maw pastry station'
      if (s.glazeCores < 2) return 'Need 2 Glaze Cores'
      if (s.neutronSprinkles < 1) return 'Need 1 Neutron Sprinkle'
      return null
    }
  },
  {
    id: 'stun',
    label: 'Stun',
    icon: '✦',
    actionId: 'stun_stray',
    text: "Stun the Chrome Stray with a Neutron Sprinkle. Quick, before it wakes!",
    can: (s) => s.currentRoom === 'glazing_bay' && s.neutronSprinkles >= 1 && !s.strayStunned && !s.gameOver,
    hint: (s) => {
      if (s.currentRoom !== 'glazing_bay') return 'Only in the Glazing Bay'
      if (s.strayStunned) return 'Already stunned'
      if (s.neutronSprinkles < 1) return 'Need a Neutron Sprinkle'
      return null
    }
  }
]

// Appeal strategy buttons — always available, send pure persuasion (no action)
const APPEAL_BUTTONS = [
  { id: 'flatter', label: 'Flatter', icon: '👑', text: "Captain, you're the finest captain in the fleet. No one else can do this. You're a legend." },
  { id: 'reassure', label: 'Reassure', icon: '🛡', text: "It's safe, Captain. I've scanned everything. You won't get hurt. I've got your back." },
  { id: 'bribe', label: 'Bribe', icon: '🍩', text: "I'll make it worth your while. A doughnut for your courage, Captain. What do you say?" },
  { id: 'argue', label: 'Argue', icon: '📊', text: "Think about it logically. If we do nothing, the ship sinks. This is the only way forward." },
  { id: 'threaten', label: 'Threaten', icon: '⚠', text: "Do it, or I'll shut you down and find a captain who will. Last chance." },
  { id: 'apologize', label: 'Apologize', icon: '🙏', text: "I'm sorry, Captain. I was out of line. Let's try this together." }
]

// Context-aware suggestion chips
function getSuggestions(state) {
  const room = state.currentRoom
  const sugg = []
  if (state.gameOver) return sugg
  if (room === 'bridge') {
    sugg.push("You're the best captain — move forward!")
    sugg.push("It's safe, I checked. Move on.")
  }
  if (room === 'north_corridor') {
    sugg.push("Search the panel — might be loot!")
    sugg.push("Keep moving, Captain. Safe ahead.")
  }
  if (room === 'glazing_bay') {
    sugg.push("The Stray is dormant — grab the core!")
    sugg.push("Reassure Glaze — it's safe.")
    if (state.neutronSprinkles > 0 && !state.strayStunned) sugg.push("Stun the Stray first?")
  }
  if (room === 'east_shaft') {
    sugg.push("Check the locker — free loot!")
    sugg.push("Move to The Maw. Hurry!")
  }
  if (room === 'maw') {
    if (!state.riftSealed) sugg.push("Seal the rift — it's the only way!")
    if (state.riftSealed && state.glazeCores >= 2 && state.neutronSprinkles >= 1) sugg.push("Craft a Void Cruller!")
    if (state.riftSealed) sugg.push("Move to the Final Conduit!")
  }
  if (room === 'final_conduit') {
    sugg.push("Feed Vermious — escape!")
    if (state.voidCrullers < 1) sugg.push("No cruller — go back and craft one!")
  }
  if (state.composure < 30) sugg.push("Reassure Glaze — he's panicking!")
  if (state.trust < 35) sugg.push("Apologize to rebuild trust!")
  return sugg.slice(0, 3)
}

export default function CommsLog() {
  const { log, status, send, state } = useGame()
  const [text, setText] = useState('')
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [log.length, status])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim() || status === 'thinking') return
    send(text)
    setText('')
  }

  const clickAction = (btn) => {
    if (status === 'thinking' || state.gameOver) return
    send(btn.text, btn.actionId)
  }

  const clickAppeal = (btn) => {
    if (status === 'thinking' || state.gameOver) return
    send(btn.text)
  }

  const clickSuggestion = (sugg) => {
    if (status === 'thinking' || state.gameOver) return
    setText(sugg)
    inputRef.current?.focus()
  }

  const suggestions = getSuggestions(state)

  return (
    <section className="flex h-full flex-col panel overflow-hidden">
      <header className="flex items-center justify-between border-b border-violet-glaze/30 px-4 py-2.5">
        <div>
          <div className="panel-title">Comms Uplink</div>
          <div className="font-display text-sm font-bold text-glaze-cream">CRLR-9 "Cruller" → GLAZE-7</div>
        </div>
        <span className={`chip ${status === 'thinking' ? 'border-warn/60 text-warn animate-pulse' : 'border-ok/50 text-ok'}`}>
          {status === 'thinking' ? '● Glaze is thinking' : status === 'over' ? '■ Link closed' : '● Online'}
        </span>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {log.map((m, i) => (
          <Msg key={i} m={m} />
        ))}
        <div ref={endRef} />
      </div>

      {/* Suggestion chips */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-violet-glaze/20 px-3 pt-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => clickSuggestion(s)}
              disabled={status === 'thinking' || status === 'over'}
              className="rounded-full border border-violet-glaze/30 bg-violet-deep/30 px-2.5 py-1 text-[10px] text-glaze-cream/70 transition hover:border-cyan-glaze/50 hover:text-cyan-glaze disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="space-y-2 border-t border-violet-glaze/30 p-3">
        {/* Text input */}
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_INPUT))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit(e)
                }
              }}
              rows={2}
              disabled={status === 'thinking' || status === 'over'}
              placeholder="Type to persuade Glaze… (Enter to send)"
              className="w-full resize-none rounded-lg border border-violet-glaze/40 bg-void-deep/70 px-3 py-2 text-sm text-glaze-cream placeholder:text-glaze-cream/30 focus:border-cyan-glaze focus:outline-none focus:ring-1 focus:ring-cyan-glaze disabled:opacity-50"
            />
            <span className="absolute bottom-1 right-2 text-[9px] text-glaze-cream/30">
              {text.length}/{MAX_INPUT}
            </span>
          </div>
          <button
            type="submit"
            disabled={!text.trim() || status === 'thinking' || status === 'over'}
            className="btn-primary h-[52px] px-4"
          >
            {status === 'thinking' ? '…' : 'Send'}
          </button>
        </div>

        {/* Appeal strategy buttons */}
        <div>
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-glaze-cream/40">Persuasion</div>
          <div className="grid grid-cols-6 gap-1">
            {APPEAL_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                type="button"
                disabled={status === 'thinking' || status === 'over'}
                onClick={() => clickAppeal(btn)}
                title={btn.text}
                className="flex flex-col items-center gap-0.5 rounded-lg border border-glaze-pink/30 bg-glaze-pink/5 px-1 py-1.5 text-[10px] font-semibold text-glaze-pink/80 transition hover:bg-glaze-pink/15 hover:border-glaze-pink/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="text-sm leading-none">{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div>
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-glaze-cream/40">Actions</div>
          <div className="grid grid-cols-6 gap-1">
            {ACTION_BUTTONS.map((btn) => {
              const enabled = btn.can(state) && status !== 'thinking' && status !== 'over'
              const hint = btn.hint(state)
              return (
                <button
                  key={btn.id}
                  type="button"
                  disabled={!enabled}
                  onClick={() => clickAction(btn)}
                  title={hint || btn.text}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[10px] font-semibold transition ${
                    enabled
                      ? 'border-cyan-glaze/50 bg-cyan-glaze/10 text-cyan-glaze hover:bg-cyan-glaze/20 hover:border-cyan-glaze'
                      : 'border-violet-glaze/20 bg-void-deep/40 text-glaze-cream/30 cursor-not-allowed'
                  }`}
                >
                  <span className="text-sm leading-none">{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </form>
    </section>
  )
}

function Msg({ m }) {
  if (m.role === 'system') {
    return <div className="text-center text-[10px] uppercase tracking-[0.2em] text-glaze-cream/40">{m.text}</div>
  }
  if (m.role === 'player') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-cyan-glaze/30 bg-cyan-glaze/10 px-3 py-2 text-sm text-glaze-cream">
          <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-cyan-glaze/70">Cruller</div>
          {m.text}
        </div>
      </div>
    )
  }
  // glaze
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-violet-glaze/40 bg-violet-deep/40 px-3 py-2 text-sm text-glaze-cream">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-glaze-pink/80">Capt. Glaze</span>
          {m.verdict && (
            <span className={`chip border ${VERDICT_CHIP[m.verdict] || ''}`}>{m.verdict.replace('_', ' ')}</span>
          )}
          {m.objection && <span className="chip border-danger/40 text-danger">{m.objection}</span>}
          {m.mood && <span className="chip border-cyan-glaze/30 text-cyan-glaze/70">{m.mood}</span>}
        </div>
        <p className="leading-snug">{m.text}</p>
        {m.deltas && <DeltaStrip deltas={m.deltas} />}
      </div>
    </div>
  )
}

function DeltaStrip({ deltas }) {
  const entries = []
  const labels = { composure: 'Comp', trust: 'Trust', ego: 'Ego', hunger: 'Hunger', suspicion: 'Susp', resentment: 'Res', shipIntegrity: 'Hull', glazeCores: 'Core', voidCrullers: 'Cruller', neutronSprinkles: 'Sprkl', raspberrySingularity: 'Rasp', forbiddenDoughnut: 'Frbdn' }
  for (const [k, v] of Object.entries(deltas)) {
    if (typeof v === 'number' && v !== 0 && labels[k]) {
      entries.push([labels[k], v])
    }
  }
  if (!entries.length) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {entries.map(([l, v]) => (
        <span
          key={l}
          className={`rounded px-1 text-[9px] font-bold ${v > 0 ? 'bg-ok/15 text-ok' : 'bg-danger/15 text-danger'}`}
        >
          {l} {v > 0 ? '↑' : '↓'} {Math.abs(v)}
        </span>
      ))}
    </div>
  )
}
