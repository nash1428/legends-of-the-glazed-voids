import { useEffect, useRef, useState } from 'react'
import { useGame, MAX_INPUT } from '../store/gameStore.js'
import { VERDICT } from '../engine/constants.js'

const VERDICT_CHIP = {
  [VERDICT.COMPLY]: 'border-ok/50 text-ok',
  [VERDICT.COMPLY_RELUCTANT]: 'border-glaze-gold/50 text-glaze-gold',
  [VERDICT.COUNTEROFFER]: 'border-warn/50 text-warn',
  [VERDICT.REFUSE]: 'border-danger/50 text-danger'
}

export default function CommsLog() {
  const { log, status, send } = useGame()
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

      <form onSubmit={submit} className="border-t border-violet-glaze/30 p-3">
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
              placeholder="Persuade Captain Glaze… (Enter to send, Shift+Enter for newline)"
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
  const labels = { composure: 'Comp', trust: 'Trust', ego: 'Ego', hunger: 'Hunger', suspicion: 'Susp', resentment: 'Res', shipIntegrity: 'Hull', glazeCores: 'Core', voidCrullers: 'Cruller', neutronSprinkles: 'Sprkl' }
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
