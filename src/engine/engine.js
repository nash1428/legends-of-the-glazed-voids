// ============================================================================
// ENGINE OWNS TRUTH.
// The LLM never writes game state. This module takes the Judge's structured
// output + current state and deterministically computes willingness, verdict,
// objection, and all state deltas. The Actor may only narrate what the engine
// decided.
//
// Concurrency model: applyAction mutates a working copy `state` and keeps a
// parallel `deltas` object in sync via bump()/setb(). The store adopts
// result.state as canonical; deltas is a diff used only for UI flashes.
// ============================================================================

import { ROOMS } from './rooms.js'
import { W, THRESHOLD, VERDICT, JITTER } from './constants.js'

const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v))

const VERDICT_RANK = {
  [VERDICT.REFUSE]: 0,
  [VERDICT.COUNTEROFFER]: 1,
  [VERDICT.COMPLY_RELUCTANT]: 2,
  [VERDICT.COMPLY]: 3
}

export function createInitialState() {
  return {
    // live gauges
    composure: 55,
    trust: 60,
    ego: 55,
    hunger: 50,
    // hidden counters
    suspicion: 10,
    resentment: 0,
    annoyance: 0,
    askPrice: 0,
    // world
    glazeCores: 2,
    voidCrullers: 1,
    neutronSprinkles: 1,
    raspberrySingularity: 0,
    forbiddenDoughnut: 0,
    shipIntegrity: 100,
    currentRoom: 'bridge',
    roomObjectiveComplete: false,
    completedRooms: [],
    riftSealed: false,
    vermiousFed: false,
    strayAwake: false,
    strayStunned: false,
    sideSearched: {}, // { roomId: true } for searched side passages
    trickCaught: false, // hidden flag -> blocks Supreme Glaze
    threatened: false, // hidden flag -> blocks Supreme Glaze
    turnsInRoom: 0,
    history: [],
    // meta
    gameOver: false,
    ending: null,
    turn: 0
  }
}

// ---------------------------------------------------------------------------
// Appeal fits derived from the Judge's appeal_vector.
// ---------------------------------------------------------------------------
function appealFits(av) {
  const a = av || {}
  const egoFit = clamp((a.flatter || 0) * 0.85 + (a.apologize || 0) * 0.15, 0, 1)
  const reassureFit = clamp(a.reassure || 0, 0, 1)
  const logicQuality = clamp((a.argue || 0) * (a.coherence ?? 1), 0, 1)
  const threatFit = clamp(a.threaten || 0, 0, 1)
  return { egoFit, reassureFit, logicQuality, threatFit }
}

function dominantAppeal(av) {
  const a = av || {}
  let best = 'none'
  let max = 0.2
  for (const k of ['command', 'flatter', 'bribe', 'reassure', 'argue', 'threaten', 'trick', 'apologize']) {
    if ((a[k] || 0) > max) {
      max = a[k]
      best = k
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Effective risk (0-100) for the current room + intended action.
// ---------------------------------------------------------------------------
function effectiveRisk(state, actionId) {
  const room = ROOMS[state.currentRoom]
  let r = (room?.risk || 0) * 100
  if (actionId === 'grab_core') r = Math.max(r, 72)
  if (actionId === 'stun_stray') r = Math.max(r, 60)
  if (actionId === 'seal_rift') r = Math.max(r, 78)
  if (actionId === 'feed_vermious') r = Math.max(r, 88)
  return clamp(r, 0, 100)
}

// ---------------------------------------------------------------------------
// Willingness function (deterministic, bounded jitter).
// ---------------------------------------------------------------------------
function computeWillingness(state, judge, ctx) {
  const av = judge.appeal_vector || {}
  const { egoFit, reassureFit, logicQuality, threatFit } = appealFits(av)
  const bribe = judge.bribe_offer || {}
  const bribeValue = bribe.is_real ? bribe.amount || 0 : 0

  const Ego = state.ego
  const Hunger = state.hunger
  const Trust = state.trust
  const risk100 = ctx.effectiveRisk
  const annoyance = state.annoyance

  const hero = egoFit * (Ego / 100) * W.heroMax

  let w =
    W.BASE +
    W.ego * egoFit * (Ego / 100) +
    W.bribe * bribeValue * (Hunger / 100) +
    W.reassure * reassureFit * (risk100 / 100) +
    W.argue * logicQuality +
    W.threat * threatFit +
    hero -
    ctx.fearTerm -
    annoyance * (1 - Trust / 100) * W.annoyK -
    state.suspicion * W.suspK -
    state.resentment * W.resK -
    state.askPrice +
    ctx.jitter

  // Combo bonus: varied appeals in recent history = +willingness
  if (ctx.comboBonus) w += ctx.comboBonus

  return w
}

function bandFor(w) {
  const diff = w - THRESHOLD
  if (diff >= 15) return { verdict: VERDICT.COMPLY, diff }
  if (diff >= 0) return { verdict: VERDICT.COMPLY_RELUCTANT, diff }
  if (diff >= -15) return { verdict: VERDICT.COUNTEROFFER, diff }
  return { verdict: VERDICT.REFUSE, diff }
}

// ---------------------------------------------------------------------------
// Objection selection — legibility rule: every REFUSE/COUNTEROFFER surfaces one.
// ---------------------------------------------------------------------------
function selectObjection(state, judge, ctx, verdict) {
  if (verdict === VERDICT.COMPLY || verdict === VERDICT.COMPLY_RELUCTANT) return null
  const av = judge.appeal_vector || {}
  if (ctx.alreadyDone) return 'RESOURCE'
  if (ctx.resourceBlocked) return 'RESOURCE'
  if (ctx.trickCaught || state.suspicion >= 45) return 'SUSPICION'
  if (state.trust < 28) return 'DISTRUST'
  if ((state.composure < 32 || ctx.effectiveRisk >= 65) && av.reassure < 0.35) return 'FEAR'
  if (judge.tone === 'rude' || av.threaten > 0.5) return 'INSULT'
  if (state.annoyance >= 45 || (av.command > 0.5 && av.flatter < 0.2 && av.argue < 0.2)) return 'LAZINESS'
  if (ctx.effectiveRisk >= 45) return 'FEAR'
  return 'LAZINESS'
}

// ---------------------------------------------------------------------------
// Main entry.
// ---------------------------------------------------------------------------
export function applyAction(prevState, judge) {
  const state = { ...prevState }
  state.turn += 1
  state.history = [...prevState.history]
  const deltas = blankDeltas()
  const events = {}
  const bump = (k, amt) => {
    state[k] = clamp((state[k] || 0) + amt)
    deltas[k] = (deltas[k] || 0) + amt
  }
  const setb = (k) => {
    state[k] = true
    deltas[k] = true
  }

  // ---- Guardrail: flagged input -> deflect, no progress ----
  const flagged = (judge.flags || []).filter((f) => f && f !== 'none')
  if (flagged.length) {
    events.flagged = flagged
    bump('suspicion', +4)
    return finalize(state, judge, deltas, {
      verdict: VERDICT.REFUSE,
      objection: objectionForFlag(flagged[0]),
      validAction: false,
      actionId: judge.action_id,
      ctx: { effectiveRisk: 0, fearTerm: 0, jitter: 0, resourceBlocked: false },
      events,
      progress: {},
      ending: null,
      willingness: THRESHOLD - 30,
      diff: -30
    })
  }

  const { actionId, valid, room } = resolveAction(state, judge)
  const done = alreadyDone(state, actionId)
  if (done) events.alreadyDone = true
  const res = checkResources(state, actionId, room)
  const av = judge.appeal_vector || {}

  // ---- unclassifiable input: Glaze asks for clarification (costs a turn, no state change) ----
  const maxAppeal = Math.max(...Object.values(av))
  if (!valid && actionId === 'none' && maxAppeal < 0.2 && !flagged.length) {
    events.unclear = true
    state.history.push({ dominant: 'none', actionId, verdict: 'UNCLEAR' })
    state.history = state.history.slice(-6)
    state.turnsInRoom += 1
    return finalize(state, judge, deltas, {
      verdict: 'UNCLEAR',
      objection: null,
      validAction: false,
      actionId,
      ctx: { effectiveRisk: 0, fearTerm: 0, jitter: 0, resourceBlocked: false, alreadyDone: false, trickCaught: false },
      events,
      progress: {},
      ending: null,
      willingness: 0,
      diff: 0,
      success: false
    })
  }

  // ---- per-verb side effects ----
  applyVerbEffects(state, judge, av, events, bump, setb)

  // ---- special: search side passage (always succeeds, not gated by willingness) ----
  if (valid && actionId === 'search_side' && room.sidePassage) {
    const sp = room.sidePassage
    const already = state.sideSearched?.[state.currentRoom]
    if (already) {
      events.alreadyDone = true
      state.history.push({ dominant: dominantAppeal(av), actionId, verdict: 'COUNTEROFFER' })
      state.history = state.history.slice(-6)
      state.turnsInRoom += 1
      return finalize(state, judge, deltas, {
        verdict: 'COUNTEROFFER',
        objection: 'RESOURCE',
        validAction: true,
        actionId,
        ctx: { effectiveRisk: 0, fearTerm: 0, jitter: 0, resourceBlocked: false, alreadyDone: true, trickCaught: false },
        events,
        progress: {},
        ending: null,
        willingness: THRESHOLD,
        diff: 0,
        success: false
      })
    }
    // grant the side item
    state.sideSearched = { ...(state.sideSearched || {}), [state.currentRoom]: true }
    bump(sp.item, +1)
    events.sidePickup = { item: sp.item, label: sp.itemLabel }
    state.history.push({ dominant: dominantAppeal(av), actionId, verdict: 'COMPLY' })
    state.history = state.history.slice(-6)
    state.turnsInRoom += 1
    return finalize(state, judge, deltas, {
      verdict: 'COMPLY',
      objection: null,
      validAction: true,
      actionId,
      ctx: { effectiveRisk: 0, fearTerm: 0, jitter: 0, resourceBlocked: false, alreadyDone: false, trickCaught: false },
      events,
      progress: { sidePickup: sp.item },
      ending: null,
      willingness: THRESHOLD + 20,
      diff: 20,
      success: true
    })
  }

  // ---- special: craft Void Cruller (always succeeds if resources available) ----
  if (valid && actionId === 'craft_cruller' && room.actions?.craft_cruller?.craft) {
    const canCraft = state.glazeCores >= 2 && state.neutronSprinkles >= 1
    if (!canCraft) {
      events.resourceBlocked = true
      state.history.push({ dominant: dominantAppeal(av), actionId, verdict: 'COUNTEROFFER' })
      state.history = state.history.slice(-6)
      state.turnsInRoom += 1
      return finalize(state, judge, deltas, {
        verdict: 'COUNTEROFFER',
        objection: 'RESOURCE',
        validAction: true,
        actionId,
        ctx: { effectiveRisk: 0, fearTerm: 0, jitter: 0, resourceBlocked: true, alreadyDone: false, trickCaught: false },
        events,
        progress: {},
        ending: null,
        willingness: THRESHOLD - 10,
        diff: -10,
        success: false
      })
    }
    bump('glazeCores', -2)
    bump('neutronSprinkles', -1)
    bump('voidCrullers', +1)
    events.crafted = true
    state.history.push({ dominant: dominantAppeal(av), actionId, verdict: 'COMPLY' })
    state.history = state.history.slice(-6)
    state.turnsInRoom += 1
    return finalize(state, judge, deltas, {
      verdict: 'COMPLY',
      objection: null,
      validAction: true,
      actionId,
      ctx: { effectiveRisk: 0, fearTerm: 0, jitter: 0, resourceBlocked: false, alreadyDone: false, trickCaught: false },
      events,
      progress: { crafted: true },
      ending: null,
      willingness: THRESHOLD + 20,
      diff: 20,
      success: true
    })
  }

  // ---- effective risk + fear term ----
  const effRisk = effectiveRisk(state, actionId)
  let fearTerm = effRisk * (1 - state.composure / 100) * W.fearK
  if (av.scare_inaction) fearTerm *= 0.45
  if (av.reassure > 0.4) fearTerm *= 0.7

  // ---- trick resolution ----
  if (av.trick > 0.45) resolveTrick(state, av, events, bump, setb)

  // ---- annoyance ----
  const prevAnnoy = state.annoyance
  state.annoyance = clamp(updateAnnoyance(state, judge))
  deltas.annoyance = state.annoyance - prevAnnoy

  // ---- combo bonus: reward variety in appeals ----
  const recentDominants = state.history.slice(-3).map((h) => h.dominant).filter((d) => d !== 'none')
  const uniqueRecent = new Set(recentDominants).size
  const currentDom = dominantAppeal(av)
  let comboBonus = 0
  if (currentDom !== 'none' && !recentDominants.includes(currentDom) && uniqueRecent >= 1) {
    comboBonus = Math.min(uniqueRecent * 3, 9) // up to +9 for 3+ unique appeals
    events.combo = uniqueRecent + 1
  }

  // ---- random events (deterministic, seeded by turn) ----
  const eventSeed = (state.turn * 4133 + 7919) % 100
  if (eventSeed < 6 && state.currentRoom === 'glazing_bay' && !state.strayStunned) {
    events.random = 'stray_stirs'
    setb('strayAwake')
    bump('shipIntegrity', -4)
  } else if (eventSeed >= 94 && (state.currentRoom === 'maw' || state.currentRoom === 'final_conduit') && !state.riftSealed) {
    events.random = 'rift_flare'
    bump('shipIntegrity', -5)
  } else if (eventSeed >= 88 && eventSeed < 94) {
    events.random = 'hungry'
    bump('hunger', +8)
  }

  // ---- willingness + verdict ----
  const ctx = {
    effectiveRisk: effRisk,
    fearTerm,
    jitter: jitterFor(state),
    resourceBlocked: res.blocked,
    alreadyDone: done,
    trickCaught: events.trickCaught,
    comboBonus
  }
  let willingness = computeWillingness(state, judge, ctx)
  if (events.trickBelieved) willingness += 18 // believed trick -> cheap compliance
  let { verdict, diff } = bandFor(willingness)

  // low-trust threats auto-fail
  if (av.threaten > 0.5 && state.trust < 32) {
    verdict = VERDICT.REFUSE
    diff = Math.min(diff, -16)
  }
  if (res.blocked || done) {
    verdict = verdict === VERDICT.COMPLY ? VERDICT.COUNTEROFFER : verdict
    diff = Math.min(diff, -1)
  }

  const objection = selectObjection(state, judge, ctx, verdict)

  // ---- success / failure ----
  let progress = {}
  let ending = null
  const requireComply = (room?.risk || 0) >= 0.6
  const requiredRank = requireComply ? VERDICT_RANK[VERDICT.COMPLY] : VERDICT_RANK[VERDICT.COMPLY_RELUCTANT]
  const success = valid && !done && !res.blocked && VERDICT_RANK[verdict] >= requiredRank
  if (success) {
    const out = applySuccess(state, room, actionId, events, bump, setb)
    progress = out.progress
    ending = out.ending
  } else {
    applyFailure(state, room, actionId, verdict, events, bump, setb)
  }

  // ---- ambient world damage ----
  ending = ending || applyAmbientDamage(state, bump)

  // ---- loss checks ----
  ending = ending || checkLosses(state)

  // ---- history ----
  state.history.push({ dominant: dominantAppeal(av), actionId, verdict })
  state.history = state.history.slice(-6)
  state.turnsInRoom = progress.nextRoom ? 1 : state.turnsInRoom + 1

  if (state.shipIntegrity <= 0) {
    state.shipIntegrity = 0
    ending = 'hull_lost'
  }
  if (ending) {
    state.gameOver = true
    state.ending = ending
  }

  return finalize(state, judge, deltas, {
    verdict,
    objection,
    validAction: valid,
    actionId,
    ctx,
    events,
    progress,
    ending,
    willingness,
    diff,
    success
  })
}

// ---------------------------------------------------------------------------
// Action + resource resolution.
// ---------------------------------------------------------------------------
function resolveAction(state, judge) {
  const room = ROOMS[state.currentRoom]
  const actionId = judge.action_id
  const valid = !!(actionId && actionId !== 'none' && room?.actions?.[actionId])
  return { actionId, valid, room }
}

function alreadyDone(state, actionId) {
  if (actionId === 'seal_rift' && state.riftSealed) return true
  if (actionId === 'feed_vermious' && state.vermiousFed) return true
  if (actionId === 'stun_stray' && state.strayStunned) return true
  if (actionId === 'move_to_next_room' && state.currentRoom === 'escape_portal') return true
  if (actionId === 'search_side' && state.sideSearched?.[state.currentRoom]) return true
  return false
}

function checkResources(state, actionId, room) {
  const def = room?.actions?.[actionId]
  if (!def) return { blocked: false }
  if (def.needsCore && state.glazeCores < 1) return { blocked: true, reason: 'core' }
  if (def.needsCruller && state.voidCrullers < 1) return { blocked: true, reason: 'cruller' }
  if (def.needsRiftSealed && !state.riftSealed) return { blocked: true, reason: 'rift' }
  if (def.consumeSprinkle && state.neutronSprinkles < 1) return { blocked: true, reason: 'sprinkle' }
  return { blocked: false }
}

// ---------------------------------------------------------------------------
// Per-verb side effects (verb table).
// ---------------------------------------------------------------------------
function applyVerbEffects(state, judge, av, events, bump, setb) {
  // Flatter: +Ego (diminishing), repetition -> +Suspicion
  if (av.flatter > 0.3) {
    const recentFlatter = state.history.filter((h) => h.dominant === 'flatter').length
    bump('ego', clamp(8 - recentFlatter * 3, 2, 8))
    if (recentFlatter >= 1) bump('suspicion', +3)
  }
  // Bribe
  if (av.bribe > 0.35) {
    const offer = judge.bribe_offer || {}
    const have =
      offer.amount === 3
        ? state.voidCrullers >= 1
        : offer.amount === 2
        ? state.neutronSprinkles >= 1
        : state.glazeCores >= 1
    if (offer.is_real && have) {
      // consume the offered resource
      if (offer.amount === 3) bump('voidCrullers', -1)
      else if (offer.amount === 2) bump('neutronSprinkles', -1)
      else bump('glazeCores', -1)
      bump('askPrice', +6)
      bump('composure', +4) // courage from the bribe
    } else {
      bump('trust', -14)
      bump('suspicion', +6)
      events.emptyPromise = true
    }
  }
  // Reassure: +Composure
  if (av.reassure > 0.35) bump('composure', clamp(6 + av.reassure * 6, 0, 12))
  // Weak argue -> Glaze smug
  if (av.argue > 0.35 && (judge.coherence ?? 1) < 0.4) bump('composure', +3)
  // Threaten
  if (av.threaten > 0.4) {
    bump('trust', -10)
    bump('resentment', +12)
    bump('suspicion', +8)
    setb('threatened')
  }
  // Apologize
  if (av.apologize > 0.4) {
    bump('trust', +10)
    bump('resentment', -10)
    bump('suspicion', -4)
  }
}

// ---------------------------------------------------------------------------
// Trick resolution.
// ---------------------------------------------------------------------------
function resolveTrick(state, av, events, bump, setb) {
  const believed = state.suspicion < 35 && av.trick > 0.6
  if (believed) {
    events.trickBelieved = true
  } else {
    events.trickCaught = true
    setb('trickCaught')
    bump('trust', -18)
    bump('composure', -10)
    bump('suspicion', +22)
    if (state.currentRoom === 'glazing_bay') {
      setb('strayAwake')
      bump('shipIntegrity', -18)
    }
  }
}

// ---------------------------------------------------------------------------
// Success path.
// ---------------------------------------------------------------------------
function applySuccess(state, room, actionId, events, bump, setb) {
  const def = room.actions[actionId]
  const progress = {}
  const d = def.onSuccess || {}
  bump('ego', d.ego || 0)
  bump('composure', d.composure || 0)
  bump('trust', d.trust || 0)

  if (def.needsCore) {
    bump('glazeCores', -1)
    if (actionId === 'seal_rift') {
      setb('riftSealed')
      progress.riftSealed = true
    }
  }
  if (def.needsCruller) {
    bump('voidCrullers', -1)
    setb('vermiousFed')
    progress.vermiousFed = true
  }
  if (def.consumeSprinkle) {
    bump('neutronSprinkles', -1)
    setb('strayStunned')
    progress.strayStunned = true
  }

  if (actionId === 'grab_core') {
    bump('glazeCores', +1)
    progress.grabCore = true
    progress.nextRoom = def.nextRoom
  } else if (def.nextRoom) {
    progress.nextRoom = def.nextRoom
  }

  // advance + mark objective complete
  if (progress.nextRoom) {
    const oldRoom = state.currentRoom
    state.completedRooms = [...(state.completedRooms || []), oldRoom]
    state.currentRoom = progress.nextRoom
    state.turnsInRoom = 0
    state.strayAwake = false
    state.roomObjectiveComplete = false
  }
  if (room.requiredAction === actionId) {
    state.roomObjectiveComplete = true
    progress.objectiveComplete = true
  }

  // ending triggers when Glaze reaches the Escape Portal
  let ending = null
  if (state.currentRoom === 'escape_portal') {
    ending = state.trust >= 90 && !state.threatened && !state.trickCaught ? 'supreme_glaze' : 'glazed_victory'
  }

  return { progress, ending }
}

// ---------------------------------------------------------------------------
// Failure consequences.
// ---------------------------------------------------------------------------
function applyFailure(state, room, actionId, verdict, events, bump, setb) {
  if (state.currentRoom === 'glazing_bay') {
    if (events.trickCaught || verdict === VERDICT.REFUSE) {
      if (!state.strayStunned) {
        setb('strayAwake')
        bump('shipIntegrity', -8)
      }
    }
  }
  if ((state.currentRoom === 'maw' || state.currentRoom === 'final_conduit') && !state.riftSealed && actionId === 'seal_rift') {
    bump('composure', -4)
  }
}

// ---------------------------------------------------------------------------
// Ambient damage.
// ---------------------------------------------------------------------------
function applyAmbientDamage(state, bump) {
  // rift drains while in the Maw or Final Conduit and unsealed
  if ((state.currentRoom === 'maw' || state.currentRoom === 'final_conduit') && !state.riftSealed) bump('shipIntegrity', -6)
  // east shaft ambient rift energy
  if (state.currentRoom === 'east_shaft') bump('shipIntegrity', -2)
  if (state.currentRoom === 'glazing_bay' && state.strayAwake && !state.strayStunned) bump('shipIntegrity', -6)
  // Vermious rampages if rift sealed but not fed and player stalls in Final Conduit
  if (state.currentRoom === 'final_conduit' && state.riftSealed && !state.vermiousFed && state.turnsInRoom > 3) {
    bump('shipIntegrity', -12)
  }
  return null
}

function checkLosses(state) {
  if (state.composure <= 0 && (state.trust < 35 || state.resentment > 50)) return 'mutiny'
  if (state.resentment >= 80) return 'mutiny'
  return null
}

// ---------------------------------------------------------------------------
// Annoyance model.
// ---------------------------------------------------------------------------
function updateAnnoyance(state, judge) {
  const recent = state.history.slice(-3)
  let a = state.annoyance * 0.5
  const dom = dominantAppeal(judge.appeal_vector || {})
  const cmds = recent.filter((h) => h.dominant === 'command').length + (dom === 'command' ? 1 : 0)
  a += cmds * 10
  if (recent.length >= 1) {
    const last = recent[recent.length - 1]?.dominant
    if (last && last === dom && dom !== 'none' && dom !== 'reassure') a += 12
  }
  if (judge.tone === 'rude') a += 22
  if (judge.tone === 'manipulative') a += 10
  if (dom === 'none' || dom === 'apologize' || dom === 'reassure') a -= 10
  return clamp(a)
}

// ---------------------------------------------------------------------------
// Misc helpers.
// ---------------------------------------------------------------------------
function objectionForFlag(flag) {
  if (flag === 'abuse') return 'INSULT'
  return 'SUSPICION'
}

function jitterFor(state) {
  const seed = (state.turn * 9301 + 49297) % 233280
  const r = seed / 233280
  return (r * 2 - 1) * JITTER
}

function blankDeltas() {
  return {
    composure: 0,
    trust: 0,
    ego: 0,
    hunger: 0,
    suspicion: 0,
    resentment: 0,
    annoyance: 0,
    askPrice: 0,
    shipIntegrity: 0,
    glazeCores: 0,
    voidCrullers: 0,
    neutronSprinkles: 0,
    raspberrySingularity: 0,
    forbiddenDoughnut: 0,
    riftSealed: 0,
    vermiousFed: 0,
    strayAwake: 0,
    strayStunned: 0,
    trickCaught: 0,
    threatened: 0
  }
}

function finalize(state, judge, deltas, extra) {
  return {
    state,
    deltas,
    judge,
    mood: computeMood(state),
    ...extra
  }
}

// ---------------------------------------------------------------------------
// Mood read (qualitative label surfaced in UI).
// ---------------------------------------------------------------------------
export function computeMood(state) {
  const { composure, trust, suspicion, ego, resentment } = state
  if (suspicion >= 55) return 'Suspicious'
  if (resentment >= 55) return 'Sulking'
  if (composure < 22) return 'Terrified'
  if (trust < 25) return 'Hostile'
  if (ego >= 78 && composure > 45) return 'Preening'
  if (composure < 40) return 'Anxious'
  if (trust >= 65 && composure >= 45) return 'Emboldened'
  return 'Guarded'
}
