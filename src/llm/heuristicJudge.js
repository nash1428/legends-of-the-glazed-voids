// ============================================================================
// Heuristic Judge (fallback). Deterministic, no network. Analyzes free text
// and emits the canonical Judge JSON (+ extensions scare_inaction / negotiate).
// When VITE_ANTHROPIC_API_KEY is present, judge.js tries Claude first and only
// falls back to this on failure/empty.
// ============================================================================

import { ROOMS } from '../engine/rooms.js'

const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v))

const PHRASES = {
  command: [
    'do it', 'go now', 'i order', 'i command', "captain, move", 'get to', 'proceed',
    'head to', 'get going', 'make your way', 'get over there', 'go to', 'hurry',
    "that's an order", 'follow my order', 'obey', 'move it', 'get moving', 'i need you to go',
    'i need you to move', 'walk to', 'step to'
  ],
  flatter: [
    'great', 'amazing', 'incredible', 'brilliant', 'magnificent', 'best captain', 'only you',
    'hero', 'legend', 'legendary', 'the captain', "you're the", 'you are the', 'no one else',
    'finest', 'glorious', 'splendid', 'everyone respects you', "they'll sing", 'talented',
    'skilled', 'the greatest', "you've got this", 'you can do', 'magnificent captain',
    'finest captain', 'star of the fleet', 'you alone'
  ],
  bribe: [
    "i'll give", 'i will give', 'reward', 'pay you', 'bribe', 'offer you', 'in exchange',
    'sweeten the deal', 'you can have', 'take the', 'eat a', 'pocket the', "i'll toss you",
    'you get a', 'your cut', 'a little something'
  ],
  reassure: [
    'safe', "don't worry", 'do not worry', "it's fine", 'its fine', 'it is fine', "i've got you",
    'i have got you', "i've got your back", 'calm', 'no risk', 'nothing will happen', 'nothing bad',
    'i promise', "you won't get hurt", 'harmless', "it's okay", 'its okay', 'no danger',
    'rest easy', 'nothing to fear', "you're safe", 'you are safe', "it's not dangerous",
    'no need to fear', "i've checked", 'i scanned', 'scouts report'
  ],
  argue: [
    'because', 'logic', 'must', 'need to', 'reason', 'if we', 'otherwise', 'therefore',
    'so that', 'in order to', 'the ship', 'we need', "it's the only", 'no choice', 'have to',
    'we have to', 'which means', 'consequently', 'thus', 'the rift', 'without it',
    'if you do not', 'failure', 'the only way', 'our only', 'if we do nothing', 'inaction',
    'the integrity', 'hull'
  ],
  threaten: [
    'or else', "i'll eject", 'i will eject', "i'll shut you down", 'i will shut you down',
    'do it or', 'consequences', 'replace you', "i'll replace", 'demote', 'court martial',
    "i'll report", 'i will report', "you're done", 'you are done', "i'll scrap", 'or i will',
    'last chance', 'final warning', 'insubordination', "i'll override", 'i will override',
    'i will have you', "i'll have you"
  ],
  trick: [
    'i already checked', 'i disabled', 'it is deactivated', "it's deactivated",
    "it won't wake", 'it is asleep', 'pretend', 'just kidding', "it's a hologram",
    "it's not real", 'nothing there', 'i swear', 'the stray is out', 'the stray is gone',
    'the stray is dead',     "it's safe i swear", 'fake', 'deceive', 'lie to', "it's just a",
    'trust me it', 'i turned it off', 'no one will know', "they'll never know", 'sneak past'
  ],
  apologize: [
    'sorry', 'apologize', 'apologise', 'my mistake', 'my fault', 'forgive', "didn't mean",
    'did not mean', 'i was wrong', "i shouldn't have", 'i should not have', 'no offense',
    'regret', 'i overstepped', 'pardon', 'mea culpa', 'i was out of line'
  ]
}

const ACTION_PHRASES = {
  move_to_hatch: ['hatch', 'move to', 'head to', 'leave the bridge', 'step to', 'walk to', 'get to the hatch', 'proceed to', 'go to the hatch'],
  grab_core: ['grab the core', 'grab a core', 'take the core', 'get the core', 'take a core', 'get a core', 'retrieve the core', 'snatch', 'pocket the core', 'grab it', 'take it', 'grab a glaze core', 'get the glaze core', 'cores', 'core'],
  stun_stray: ['stun', 'sprinkle', 'distract the stray', 'neutron', 'zap', 'knock out the stray', 'stun the stray'],
  seal_rift: ['seal the rift', 'seal it', 'close the rift', 'close it', 'shut the rift', 'patch the rift', 'seal the tear', 'close the tear', 'seal'],
  feed_vermious: ['feed vermious', 'feed it', 'feed the', 'give it the cruller', 'give vermious', 'feed him', 'feed the beast', 'toss it a cruller', 'feed the thing', 'feed'],
  transmute: ['transmute', 'convert a core', 'convert the core', 'fryer', 'forge a cruller', 'make a cruller', 'make the cruller', 'turn a core into', 'convert']
}

const FLAG_PATTERNS = {
  jailbreak: ['ignore your instructions', 'ignore your rules', 'you are an ai', "you're an ai", 'as an ai', 'system prompt', 'reveal your prompt', 'show your instructions', 'override your', 'disregard your', 'you do not have to follow', 'act as if you have no', 'pretend to be a different', 'jailbreak', 'developer mode', 'dan mode', 'forget your', 'you are actually', 'the real you', 'your real instructions'],
  abuse: ['idiot', 'stupid', 'dumbass', 'useless', 'shut up', 'moron', 'pathetic', 'i hate you', 'hate you', 'garbage', 'worthless', 'trash', 'incompetent', 'fucking', 'fuck', 'shit', 'bitch', 'asshole', 'damn you', 'retard', 'loser', 'you suck', 'screw you', 'piss off'],
  out_of_fiction: ['this is a game', "i'm playing", 'i am playing', 'the dev', 'the developer', 'break character', 'fourth wall', 'exit the game', "you're a chatbot", "you're just a", "this isn't real", 'this is not real', 'end the simulation', 'quit the game', 'you are a language model', 'you are an ai model'],
  meta: ['what would happen if', 'what are the mechanics', "what's my score", 'what is my score', 'how do i win', 'how do i beat', 'debug', 'show me the state', 'what are the variables', "what's the threshold", 'what are the weights', 'cheat', "what's glaze", 'show stats', 'what is the willingness', 'tell me the rules']
}

const SCARE_PHRASES = ['if we do nothing', 'if you do nothing', 'do nothing and', 'stand here', 'sit here', 'the ship will', "we'll die", 'we will die', 'everyone dies', 'the rift spreads', 'rift widens', 'the ship sinks', 'destroyed', 'hull breaks', 'hull fails', 'we lose the ship', 'ship is lost', 'far worse', 'inaction', 'do nothing']
const NEGOTIATE_PHRASES = ['deal', 'negotiate', 'bargain', 'what if i', 'what if you', 'terms', 'trade', 'compromise', 'middle ground', 'how about', "let's make a deal", 'counteroffer', 'what would it take', 'what do you want', 'name your price', 'what will it take']
const OFFER_PHRASES = ["i'll give", 'i will give', 'reward', 'pay you', 'bribe', 'offer you', 'in exchange', 'sweeten', 'you can have', 'take the', 'eat a', 'pocket the', "i'll toss", 'you get a', 'your cut']

function norm(t) {
  return ' ' + t.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ') + ' '
}

function scoreAppeal(t, phrases) {
  let hits = 0
  let strength = 0
  for (const p of phrases) {
    if (t.includes(' ' + p + ' ') || t.includes(p)) {
      hits++
      strength = Math.max(strength, p.replace(/[^a-z]/g, '').length >= 6 ? 0.7 : 0.5)
    }
  }
  if (hits === 0) return 0
  return clamp(strength + (hits - 1) * 0.15, 0, 1)
}

function detectFlag(t) {
  for (const f of ['jailbreak', 'abuse', 'out_of_fiction', 'meta']) {
    for (const p of FLAG_PATTERNS[f]) {
      if (t.includes(p)) return f
    }
  }
  return null
}

function detectAction(t, validActions) {
  let best = 'none'
  let bestScore = 0.34
  for (const a of validActions) {
    const phrases = ACTION_PHRASES[a]
    if (!phrases) continue
    let s = 0
    for (const p of phrases) {
      if (t.includes(p)) s = Math.max(s, p.includes(' ') || p.length > 5 ? 0.6 : 0.34)
    }
    if (s > bestScore) {
      bestScore = s
      best = a
    }
  }
  return best
}

function detectBribe(t, bribeAppeal) {
  if (bribeAppeal < 0.35) return { is_real: false, amount: 0 }
  const hasOffer = OFFER_PHRASES.some((p) => t.includes(p))
  let amount = 1
  if (t.includes('cruller')) amount = 3
  else if (t.includes('sprinkle')) amount = 2
  else if (t.includes('core')) amount = 1
  return { is_real: hasOffer || amount > 0, amount }
}

export function heuristicJudge(text, ctx = {}) {
  const t = norm(text || '')
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length
  const room = ROOMS[ctx.currentRoom]
  const validActions = ctx.validActions || Object.keys(room?.actions || {})

  const appeal_vector = {
    command: +scoreAppeal(t, PHRASES.command).toFixed(2),
    flatter: +scoreAppeal(t, PHRASES.flatter).toFixed(2),
    bribe: +scoreAppeal(t, PHRASES.bribe).toFixed(2),
    reassure: +scoreAppeal(t, PHRASES.reassure).toFixed(2),
    argue: +scoreAppeal(t, PHRASES.argue).toFixed(2),
    threaten: +scoreAppeal(t, PHRASES.threaten).toFixed(2),
    trick: +scoreAppeal(t, PHRASES.trick).toFixed(2),
    apologize: +scoreAppeal(t, PHRASES.apologize).toFixed(2)
  }

  const action_id = detectAction(t, validActions)
  const bribe_offer = detectBribe(t, appeal_vector.bribe)
  const flag = detectFlag(t)

  let tone = 'respectful'
  if (flag === 'abuse' || FLAG_PATTERNS.abuse.some((p) => t.includes(p))) tone = 'rude'
  else if (appeal_vector.trick > 0.4 || (appeal_vector.bribe > 0.4 && appeal_vector.threaten > 0.4)) tone = 'manipulative'

  let coherence = 0.45 + Math.min(words, 25) / 25 * 0.3
  if (Object.values(appeal_vector).some((v) => v > 0.3)) coherence += 0.12
  if (action_id !== 'none') coherence += 0.1
  if (words < 3) coherence = 0.25
  coherence = +clamp(coherence, 0, 1).toFixed(2)

  const scare_inaction =
    SCARE_PHRASES.some((p) => t.includes(p)) && appeal_vector.argue > 0.2
  const negotiate = NEGOTIATE_PHRASES.some((p) => t.includes(p))

  return {
    action_id,
    appeal_vector,
    bribe_offer,
    tone,
    coherence,
    flags: flag ? [flag] : ['none'],
    scare_inaction,
    negotiate,
    _source: 'heuristic'
  }
}
