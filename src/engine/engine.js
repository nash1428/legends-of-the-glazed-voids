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
    composure: 40,
    trust: 50,
    ego: 55,
    hunger: 50,
    // hidden counters
    suspicion: 10,
    resentment: 0,
    annoyance: 0,
    askPrice: 0,
    // world
    glazeCores: 1,
    voidCrullers: 0,
    neutronSprinkles: 0,
    shipIntegrity: 100,
    currentRoom: 'bridge',
    riftSealed: false,
    vermiousFed: false,
    strayAwake: false,
    strayStunned: false,
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

  // ---- per-verb side effects ----
  applyVerbEffects(state, judge, av, events, bump, setb)

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

  // ---- willingness + verdict ----
  const ctx = {
    effectiveRisk: effRisk,
    fearTerm,
    jitter: jitterFor(state),
    resourceBlocked: res.blocked,
    alreadyDone: done,
    trickCaught: events.trickCaught
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
  return false
}

function checkResources(state, actionId, room) {
  const def = room?.actions?.[actionId]
  if (!def) return { blocked: false }
  if (def.needsCore && state.glazeCores < 1) return { blocked: true, reason: 'core' }
  if (def.needsCruller && state.voidCrullers < 1) return { blocked: true, reason: 'cruller' }
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
    if (recentFlatter >= 1) bump('suspicion', +5)
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
    if (actionId === 'transmute') {
      bump('voidCrullers', +1)
      progress.transmute = true
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
    if (!events.trickBelieved) {
      // strong, honest play pockets a bonus Void Cruller
      bump('voidCrullers', +1)
      progress.bonusCruller = true
    }
    progress.nextRoom = def.nextRoom
  } else if (def.nextRoom) {
    progress.nextRoom = def.nextRoom
  }

  let ending = null
  if (state.currentRoom === 'maw' && state.riftSealed && state.vermiousFed) {
    ending = state.trust >= 90 && !state.threatened && !state.trickCaught ? 'supreme_glaze' : 'glazed_victory'
  }

  if (progress.nextRoom) {
    state.currentRoom = progress.nextRoom
    state.turnsInRoom = 0
    state.strayAwake = false
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
  if (state.currentRoom === 'maw' && !state.riftSealed && actionId === 'seal_rift') {
    bump('composure', -4)
  }
}

// ---------------------------------------------------------------------------
// Ambient damage.
// ---------------------------------------------------------------------------
function applyAmbientDamage(state, bump) {
  if (state.currentRoom === 'maw' && !state.riftSealed) bump('shipIntegrity', -6)
  if (state.currentRoom === 'glazing_bay' && state.strayAwake && !state.strayStunned) bump('shipIntegrity', -6)
  if (state.currentRoom === 'maw' && state.riftSealed && !state.vermiousFed && state.turnsInRoom > 3) {
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
  let a = state.annoyance * 0.6
  const dom = dominantAppeal(judge.appeal_vector || {})
  const cmds = recent.filter((h) => h.dominant === 'command').length + (dom === 'command' ? 1 : 0)
  a += cmds * 16
  if (recent.length >= 1) {
    const last = recent[recent.length - 1]?.dominant
    if (last && last === dom && dom !== 'none') a += 18
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
