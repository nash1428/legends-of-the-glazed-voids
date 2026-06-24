// ============================================================================
// Game store (Zustand). Owns the live state + comms log and runs the turn
// pipeline: Player text -> Judge -> Engine -> Actor -> render.
// ============================================================================

import { create } from 'zustand'
import { createInitialState, applyAction, computeMood } from '../engine/engine.js'
import { ROOMS } from '../engine/rooms.js'
import { judgeText } from '../llm/judge.js'
import { actorLine } from '../llm/actor.js'

export const MAX_INPUT = 500

function roomIntroLine(roomId) {
  return ROOMS[roomId]?.intro || ''
}

export const useGame = create((set, get) => ({
  state: createInitialState(),
  log: [
    { role: 'system', text: 'U.S.V. OLD-FASHIONED · COMMS UPLINK ESTABLISHED', turn: 0 },
    { role: 'system', text: 'You are CRLR-9 "Cruller" — a voice from HQ, "The Bakery".', turn: 0 },
    { role: 'system', text: 'GOAL: Persuade Captain Glaze to move through the ship and escape. Use the Move / Grab / Exit buttons or type your own words. Flatter, reassure, or bribe to raise his willingness.', turn: 0 },
    { role: 'glaze', text: roomIntroLine('bridge'), turn: 0, mood: computeMood(createInitialState()) }
  ],
  status: 'idle', // 'idle' | 'thinking' | 'over'
  lastDeltas: null,
  lastTurn: 0,
  error: null,

  reset: () => {
    const fresh = createInitialState()
    set({
      state: fresh,
      status: 'idle',
      lastDeltas: null,
      lastTurn: 0,
      error: null,
      log: [
        { role: 'system', text: 'U.S.V. OLD-FASHIONED · COMMS UPLINK RE-ESTABLISHED', turn: 0 },
        { role: 'system', text: 'GOAL: Persuade Captain Glaze to move through the ship and escape. Use the Move / Grab / Exit buttons or type your own words.', turn: 0 },
        { role: 'glaze', text: roomIntroLine('bridge'), turn: 0, mood: computeMood(fresh) }
      ]
    })
  },

  send: async (rawText, actionHint) => {
    const { status, state, log } = get()
    if (status === 'thinking' || state.gameOver) return
    const text = (rawText || '').trim().slice(0, MAX_INPUT)
    if (!text) return

    const turn = state.turn + 1
    set({
      status: 'thinking',
      error: null,
      log: [...log, { role: 'player', text, turn }]
    })

    try {
      // 1. Judge
      const judge = await judgeText(text, get().state)
      // Override action_id when a button forced it
      if (actionHint) judge.action_id = actionHint
      // 2. Engine owns truth
      const result = applyAction(get().state, judge)
      // 3. Actor narrates (only what the engine decided)
      const line = await actorLine(result.state, result, text)

      const nextLog = [
        ...get().log,
        {
          role: 'glaze',
          text: line,
          turn,
          mood: result.mood,
          verdict: result.verdict,
          objection: result.objection,
          deltas: result.deltas,
          ending: result.ending
        }
      ]

      if (result.progress?.nextRoom) {
        nextLog.push({ role: 'system', text: `>>> ENTERING: ${ROOMS[result.progress.nextRoom]?.name} <<<`, turn })
        nextLog.push({ role: 'glaze', text: roomIntroLine(result.progress.nextRoom), turn, mood: result.mood })
      }
      if (result.ending) {
        nextLog.push({ role: 'system', text: endingBanner(result.ending), turn })
      }

      set({
        state: result.state,
        log: nextLog,
        status: result.ending ? 'over' : 'idle',
        lastDeltas: result.deltas,
        lastTurn: turn
      })
    } catch (e) {
      console.error(e)
      set({
        status: 'idle',
        error: 'Comms interference. Try rephrasing, operator.',
        log: [...get().log, { role: 'system', text: '...signal degraded. Retry.', turn }]
      })
    }
  }
}))

function endingBanner(ending) {
  switch (ending) {
    case 'glazed_victory':
      return '★ GLAZED VICTORY — the portal opens. The Old-Fashioned escapes. ★'
    case 'supreme_glaze':
      return '★ SUPREME GLAZE — a secret ending. Glaze transcends the void. ★'
    case 'hull_lost':
      return '☠ HULL LOST — the ship folds into the void. ☠'
    case 'mutiny':
      return '☠ MUTINY — Glaze severs your link. ☠'
    default:
      return '— END —'
  }
}
