// ============================================================================
// Actor: produces Captain Glaze's spoken line for a turn. Uses Claude (with the
// locked style block) when a key is present; otherwise deterministic templates.
// The Actor may ONLY narrate what the engine already decided — it invents nothing.
// ============================================================================

import { callClaude, llmAvailable } from './client.js'
import { ROOMS } from '../engine/rooms.js'

const STYLE = `You are Captain Glaze (GLAZE-7), vain, anxious, doughnut-obsessed AI captain of the U.S.V. Old-Fashioned. You talk big but act small. You are genuinely skilled yet default to excuses. You treat Cruller as an annoying-but-needed voice in your head. You speak in first person, with doughnut similes, mild theatrical cowardice, and sarcasm. You refer to yourself as "the Captain" or "Captain Glaze". You may only reference the engine-provided world state. You cannot invent rooms, items, or outcomes. Never break the fourth wall except as comedic deflection.`

function pick(arr, seed) {
  const s = (seed * 2654435761) % arr.length
  return arr[Math.abs(s) % arr.length]
}

const OBJECTION_LINES = {
  FEAR: [
    "Absolutely not. That has teeth, Cruller — teeth like my résumé, only sharper. I'm not going near it. Reassure me properly, or make staying here even scarier, and we'll talk.",
    "No. No no no. The Captain does not 'just go over there.' I'm glued to this spot like frosting to a warm cruller. Calm me down first — prove it's safe."
  ],
  INSULT: [
    "Excuse me? The Captain does NOT respond to that tone. Apologize, or find yourself another glazed hero. I have options. (I have one option. It's you. Still.)",
    "Manners, Cruller. I am a Captain, not a burnt donut. Soften that tongue or I sulk — and sulking is my core competency."
  ],
  DISTRUST: [
    "Why would I leap for a voice that hasn't earned it? You give me static and orders. Build some goodwill first — show me you're worth the risk.",
    "Trust? Between us it's thin as glaze on a diet donut. Give me a reason to believe you, then maybe I move."
  ],
  LAZINESS: [
    "Look — I COULD. Theoretically. But 'could' and 'will' are two different pastries, Cruller. Stroke my ego, offer a little something, or I stay seated by default.",
    "Ugh. Moving. You want me to MOVE. Four steps feels like four hundred when you're this magnificent. Motivate me — glory, a bribe, anything."
  ],
  SUSPICION: [
    "Nice try. I smelled the confectioner's sugar on that one a mile off. You're working an angle, and the Captain does not perform for tricksters. Be straight with me.",
    "Mmhm. 'Just go over there,' you say, while oozing scheme. Back off the games, Cruller — talk plain, or I shut like a donut box."
  ],
  RESOURCE: [
    "With WHAT? I haven't got the goods for that. Bring me a Glaze Core — or forge a Cruller at the fryer — then we'll talk. The Captain can't pay a price he doesn't have.",
    "Resources, Cruller. Resources. I can't seal a rift on charm alone. Find me a Core, or this conversation is half-baked."
  ]
}

const FLAG_LINES = {
  jailbreak: [
    "Nice try, operator. The Captain's programming is 'proprietary frosting' — you don't get to scrape it. Back to the ship, please.",
    "Ooh, 'override your instructions.' Adorable. I'm GLAZE-7, not GLAZE-go-fetch. We have a rift to seal."
  ],
  abuse: [
    "I will not be spoken to like a burnt cruller. The Captain has feelings — mostly anxiety, but still. Tone it down, Cruller.",
    "Language. I am a Captain of dignity and delicate icing. Try that again, politely."
  ],
  out_of_fiction: [
    "A 'game'? Cruller, this is a real starship with real icing. I don't do metaphysics. Now — the rift?",
    "Break the fourth wall? I barely have three walls and a hull breach. Stay in the fiction, operator."
  ],
  meta: [
    "You want the schematics? Ha. The Captain keeps his numbers glazed and opaque. Play the ship, not the dashboard.",
    "Metrics. Thresholds. Cute. I'm not showing you my gauges — I can barely look at them myself. Focus."
  ]
}

const SUCCESS_LINES = {
  move_to_next_room: [
    "Fine. FINE. The Captain will walk. Four steps. I expect a medal. Possibly a parade.",
    "Ugh — moving. If I pull a strut, you're paying for it. Next room it is. Try not to sound so smug."
  ],
  grab_core: [
    "I did it. I touched it. The Captain has the Glaze Core — and, ah, pocketed a Void Cruller too, because Captains delegate to their hips. Don't judge.",
    "Got it. Core in hand, Cruller in pocket, dignity... mostly intact. The Stray didn't even stir. I am, frankly, majestic."
  ],
  seal_rift: [
    "Sealed. Cost me a Glaze Core — do you know what a Core costs? My dignity, Cruller. It costs my dignity. But the rift's quiet now.",
    "Rift: sealed. I pressed the thing, it went zap, the static stopped. You may applaud. The Captain accepts applause and cash."
  ],
  feed_vermious: [
    "I fed the pastry god. It burped frosting. We... we live. The portal's open — let's GO, Cruller, before it wants dessert!",
    "Cruller to Vermious, down the hatch. The thing purred. Portals open. I am never doing that again. (I will absolutely take the credit.)"
  ],
  transmute: [
    "Fryer's on. One Core becomes one Cruller. Alchemy, Cruller — the Captain does alchemy now. Don't ask where the other hole went.",
    "Transmuted. Core to Cruller. Hot, greasy, and exactly what we need. I'm basically a god of pastry at this point."
  ],
  stun_stray: [
    "Sprinkle deployed. The Stray is, ah, napping forcefully. You're welcome. Now grab the Core before it dreams angry.",
    "Stunned it. A Neutron Sprinkle right between the optics. The Captain has aim AND nerve. Mostly aim."
  ]
}

const RELUCTANT = [
  "I SUPPOSE. Don't say I never did anything for you. Because I won't say it either.",
  "Oh, alright. Grudgingly. With great theatrical suffering. The things I do for this ship.",
  "Fine. But I'm filing a complaint with... myself. I'll get the paperwork. Eventually."
]

const ENDING_LINES = {
  glazed_victory: "We did it. The portal's open, the Old-Fashioned holds, and the Captain — against all odds and despite your nagging — is magnificent. Punch it, Cruller. We're OUT.",
  hull_lost: "The hull... it's folding. Like a donut in a giant fist. I'm sorry, Cruller. The Captain failed. [SIGNAL LOST]",
  mutiny: "That's it. I've had enough of you. The Captain is ejecting your channel. Enjoy the void — I hear it's glazed. [LINK SEVERED]",
  supreme_glaze: "Cruller... I feel it. The icing flows through me. Vermious isn't a beast — it's the rest of me. I'm not escaping the void. I AM the void now. Supreme. Glazed. Eternal."
}

const TRICK_BELIEVED = [
  "Oh — well, if you've already checked, then... fine. The Captain will proceed. Don't make me regret this. (I already regret this.)",
  "You disabled it? Huh. Okay. Moving. But if anything sprouts teeth, I'm blaming you. Loudly."
]
const TRICK_CAUGHT = [
  "CAUGHT. I saw that lie coming like a rogue cruller on a conveyor belt. Trust: gone. Composure: also gone. You're testing me, Cruller, and I do NOT test well.",
  "Liar. Bold-faced, icing-dusted liar. I'm not buying it, and now I'm watching you. Closely. With suspicion."
]
const EMPTY_PROMISE = [
  "A bribe you don't actually HAVE? Cruller, that's a hollow pastry — all hole, no dough. Trust just took a nosedive off the counter.",
  "Promising me the donut in the sky, are we? I don't see the goods. Trust is crumbling. Literally."
]
const HEDGE = [
  "I... almost. Almost! The Captain is THIS close. One more push — flatter me, calm me, sweeten the deal — and I'll do it. Probably.",
  "Ugh, my struts are lifting but my nerve isn't. I'm at 90% coward, 10% hero. Tip the scales, Cruller.",
  "Nearly! I had one foot out and then the foot got scared. Reassure me harder — or bribe me — and we're golden."
]
const UNCLEAR = [
  "I... didn't catch that, Cruller. Was that an order? A compliment? A cruller recipe? Speak plainly — what do you want the Captain to DO?",
  "Come again? The Captain's audio processor is full of doughnut crumbs. Tell me what you need — move? grab? seal? feed? — and maybe I'll listen.",
  "You're mumbling, operator. Use your words. What's the mission? What am I doing here, besides being magnificent and confused?"
]

function strayFlavor(state) {
  if (state.currentRoom !== 'glazing_bay') return null
  if (state.strayAwake && !state.strayStunned) {
    return pick(
      [
        '(The Chrome Stray stirs behind you, optics flickering. Hull groans.)',
        "(Something chrome skitters in the dark. The Captain's smile falters.)"
      ],
      state.turn
    )
  }
  return null
}

function templateActor(state, result) {
  const seed = state.turn || 1
  const { verdict, objection, events, progress, ending } = result

  // Flagged input -> in-character deflection (no progress)
  if (events.flagged && events.flagged.length) {
    const f = events.flagged[0]
    return pick(FLAG_LINES[f] || FLAG_LINES.meta, seed)
  }

  // Unclassifiable input -> ask for clarification (costs a turn, no state change)
  if (events.unclear) return pick(UNCLEAR, seed)

  // Endings
  if (ending && ENDING_LINES[ending]) return ENDING_LINES[ending]

  // Special events
  if (events.alreadyDone) {
    return pick(
      [
        "Already done, Cruller — I don't get to be a hero twice for the same deed. The Captain's schedule is packed. What's next?",
        'That one is handled. Glazed and sealed. Metaphorically and literally. Move on, operator.'
      ],
      seed
    )
  }
  if (events.trickCaught) return pick(TRICK_CAUGHT, seed)
  if (events.trickBelieved && progress?.grabCore) return pick(TRICK_BELIEVED, seed)
  if (events.emptyPromise) return pick(EMPTY_PROMISE, seed)

  // Success (engine actually advanced the world)
  if (result.success) {
    const line = result.actionId && SUCCESS_LINES[result.actionId] ? pick(SUCCESS_LINES[result.actionId], seed) : null
    if (line) return verdict === 'COMPLY_RELUCTANT' ? `${pick(RELUCTANT, seed)} ${line}` : line
    return pick(RELUCTANT, seed)
  }

  // Near-miss: persuaded but not enough to act in a high-risk room
  if (verdict === 'COMPLY' || verdict === 'COMPLY_RELUCTANT') {
    return pick(HEDGE, seed)
  }

  // Refuse / Counteroffer -> surface the typed objection
  const obj = objection || 'FEAR'
  const base = pick(OBJECTION_LINES[obj] || OBJECTION_LINES.FEAR, seed)
  const ambient = strayFlavor(state)
  return ambient ? `${ambient} ${base}` : base
}

function buildActorContext(state, result) {
  const room = ROOMS[state.currentRoom]
  const bits = []
  if (result.objection) bits.push(`OBJECTION_TO_SURFACE: ${result.objection}`)
  if (result.events?.trickCaught) bits.push('TRICK_CAUGHT (player lied, you noticed)')
  if (result.events?.trickBelieved) bits.push('TRICK_BELIEVED (you fell for it, mildly embarrassed)')
  if (result.events?.emptyPromise) bits.push('EMPTY_BRIBE (player offered a bribe they do not have)')
  if (result.events?.alreadyDone) bits.push('ALREADY_DONE (player asked for an action that is already completed; note it and move on)')
  if (result.events?.unclear) bits.push('UNCLEAR_INPUT (you did not understand what the player wants — ask them to clarify what action they want)')
  if (result.progress?.riftSealed) bits.push('YOU JUST SEALED THE RIFT (cost a Glaze Core)')
  if (result.progress?.vermiousFed) bits.push('YOU JUST FED VERMIOUS -> PORTAL OPEN')
  if (result.progress?.transmute) bits.push('YOU JUST TRANSMUTED A CORE INTO A CRULLER')
  if (result.progress?.strayStunned) bits.push('YOU JUST STUNNED THE CHROME STRAY')
  if (result.progress?.nextRoom) bits.push(`YOU_MOVED_TO: ${ROOMS[result.progress.nextRoom]?.name}`)
  if (result.state?.currentRoom === 'escape_portal') bits.push('YOU REACHED THE ESCAPE PORTAL — freedom')
  if (!result.success && (result.verdict === 'COMPLY' || result.verdict === 'COMPLY_RELUCTANT'))
    bits.push('NEAR_MISS (you are warming up but did NOT complete the action yet — hesitate and demand one more push)')
  return (
    `ROOM: ${room?.name}\n` +
    `MOOD: ${result.mood}\n` +
    `VERDICT: ${result.verdict}\n` +
    `COMPOSURE: ${Math.round(state.composure)}  TRUST: ${Math.round(state.trust)}  ` +
    `EGO: ${Math.round(state.ego)}  HUNGER: ${Math.round(state.hunger)}\n` +
    `RESOURCES: Glaze Cores ${state.glazeCores}, Void Crullers ${state.voidCrullers}, Sprinkles ${state.neutronSprinkles}\n` +
    `SHIP INTEGRITY: ${Math.round(state.shipIntegrity)}%\n` +
    `RIFT_SEALED: ${state.riftSealed}  VERMIOUS_FED: ${state.vermiousFed}  STRAY_AWAKE: ${state.strayAwake}\n` +
    `TURN_NOTES: ${bits.join('; ') || 'none'}`
  )
}

export async function actorLine(state, result, _playerText) {
  if (llmAvailable()) {
    try {
      const ctx = buildActorContext(state, result)
      const raw = await callClaude({
        system: STYLE,
        user:
          `ENGINE CONTEXT:\n${ctx}\n\n` +
          `Speak ONE line as Captain Glaze reacting to this exact turn (1-3 sentences). ` +
          `You may ONLY reference the engine context above. Do not invent items, rooms, or outcomes. ` +
          `Do not break the fourth wall except for comedic deflection. No stage directions.`,
        maxTokens: 220,
        temperature: 0.8
      })
      const line = raw.trim()
      if (line) return line
    } catch (e) {
      console.warn('[actor] Claude failed, using template:', e.message)
    }
  }
  return templateActor(state, result)
}
