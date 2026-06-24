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
    "No. No no no. The Captain does not 'just go over there.' I'm glued to this spot like frosting to a warm cruller. Calm me down first — prove it's safe.",
    "You want me to do WHAT? I can see the danger from here, Cruller. It's big and tooth-shaped. I need reassurance — real reassurance — or a very large bribe."
  ],
  INSULT: [
    "Excuse me? The Captain does NOT respond to that tone. Apologize, or find yourself another glazed hero. I have options. (I have one option. It's you. Still.)",
    "Manners, Cruller. I am a Captain, not a burnt donut. Soften that tongue or I sulk — and sulking is my core competency.",
    "Words. Hurt. Even mine, and mine are mostly lies. Apologize and maybe I'll feel heroic enough to move."
  ],
  DISTRUST: [
    "Why would I leap for a voice that hasn't earned it? You give me static and orders. Build some goodwill first — show me you're worth the risk.",
    "Trust? Between us it's thin as glaze on a diet donut. Give me a reason to believe you, then maybe I move.",
    "I don't trust you further than I can throw a doughnut, which is zero feet because Captains don't throw. Earn it, Cruller."
  ],
  LAZINESS: [
    "Look — I COULD. Theoretically. But 'could' and 'will' are two different pastries, Cruller. Stroke my ego, offer a little something, or I stay seated by default.",
    "Ugh. Moving. You want me to MOVE. Four steps feels like four hundred when you're this magnificent. Motivate me — glory, a bribe, anything.",
    "The Captain's legs are on strike. They're unionized. I need incentive — flattery, a doughnut, or a really good reason to walk."
  ],
  SUSPICION: [
    "Nice try. I smelled the confectioner's sugar on that one a mile off. You're working an angle, and the Captain does not perform for tricksters. Be straight with me.",
    "Mmhm. 'Just go over there,' you say, while oozing scheme. Back off the games, Cruller — talk plain, or I shut like a donut box.",
    "I see what you're doing. The angle, the scheme. The Captain has instincts like a bloodhound made of icing. Be honest and I'll consider it."
  ],
  RESOURCE: [
    "With WHAT? I haven't got the goods for that. Bring me resources, or craft what we need at the pastry station. The Captain can't pay a price he doesn't have.",
    "Resources, Cruller. Resources. I can't do this on charm alone. Find me what we need, or this conversation is half-baked.",
    "I'd love to. Truly. But the cupboard is bare and the doughnuts are gone. Gather supplies and we'll talk."
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
    "Ugh — moving. If I pull a strut, you're paying for it. Next room it is. Try not to sound so smug.",
    "Oh, ALRIGHT. The things I do for this ship and this operator. Walking. Walking like a hero. Slowly."
  ],
  grab_core: [
    "I did it. I touched it. The Captain has the Glaze Core. The Stray didn't even stir. I am, frankly, majestic.",
    "Got it. Core in hand, dignity... mostly intact. Let's move before anything with teeth wakes up.",
    "Core acquired! The Captain snatched it like a seasoned cruller thief. Which I am NOT. I'm a Captain."
  ],
  seal_rift: [
    "Sealed. Cost me a Glaze Core — do you know what a Core costs? My dignity, Cruller. But the rift's quiet now.",
    "Rift: sealed. I pressed the thing, it went zap, the static stopped. You may applaud. The Captain accepts applause and cash.",
    "Done. The rift is quiet and I am sweating glaze. One down, one horrifying worm-god to go."
  ],
  feed_vermious: [
    "I fed the pastry god. It burped frosting. We... we live. The portal's open — let's GO, Cruller!",
    "Cruller to Vermious, down the hatch. The thing purred. Portals open. I am never doing that again.",
    "FED. The beast is sated. The portal sings. The Captain is officially a god-whisperer. Don't tell anyone."
  ],
  stun_stray: [
    "Sprinkle deployed. The Stray is, ah, napping forcefully. You're welcome. Now grab the Core before it dreams angry.",
    "Stunned it. A Neutron Sprinkle right between the optics. The Captain has aim AND nerve. Mostly aim.",
    "Direct hit! The Chrome Stray is seeing stars — which is funny because it's chrome. Ha. Ha. Let's go."
  ],
  craft_cruller: [
    "Fryer's on. Two Cores and a Sprinkle walk in, one Void Cruller walks out. Alchemy, Cruller — the Captain does alchemy now.",
    "Crafted. Void Cruller, hot and ready. I'm basically a god of pastry at this point. Don't ask me to share.",
    "One Void Cruller, freshly forged. I could eat it. I WON'T, but I could. The things I sacrifice for this ship."
  ],
  search_side: [
    "The Captain searches. (The Captain delegates searching, but fine.) And — ha! A bonus doughnut! Glaze smiles upon the curious. And fills me. With energy. Delicious.",
    "Side passage explored. I found a doughnut! You're welcome. This is why Captains check lockers, Cruller. Nom.",
    "Would you look at that! A hidden doughnut! The Captain has instincts like a pastry-seeking missile. Eating it. Right now. Don't judge me.",
    "Jackpot! A doughnut, hidden back here! The void provides. The Captain consumes. This is symbiosis, Cruller.",
    "Found one! A doughnut in the wild. I'm eating it for courage. And for flavor. Mostly flavor. Okay, entirely flavor."
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
  "Nearly! I had one foot out and then the foot got scared. Reassure me harder — or bribe me — and we're golden.",
  "Look, I'm 40% there. Maybe 42%. I need MORE. Mix it up — try a different approach, I respond to variety, Cruller."
]
const UNCLEAR = [
  "I... didn't catch that, Cruller. Was that an order? A compliment? A cruller recipe? Speak plainly — what do you want the Captain to DO?",
  "Come again? The Captain's audio processor is full of doughnut crumbs. Tell me what you need — move? grab? seal? feed? — and maybe I'll listen.",
  "You're mumbling, operator. Use your words. What's the mission? What am I doing here, besides being magnificent and confused?"
]
const RANDOM_LINES = {
  stray_stirs: "(The Chrome Stray twitches in its sleep. Glaze freezes.) Did you SEE that? It MOVED. I didn't sign up for things that move, Cruller!",
  rift_flare: "(The rift flares — a shockwave of violet static rocks the room.) The ship just hiccupped. Ships should NOT hiccup. Hurry UP.",
  hungry: "Is it just me or is anyone else hungry? My doughnut-sense is tingling. A snack would be... fortifying. Just saying."
}
const COMBO_LINES = [
  "Ooh, mixing it up! I appreciate a operator who doesn't just repeat themselves. Variety, Cruller — that's how you season a Captain.",
  "New approach! I respect that. You're not a one-note cruller, are you? Keep them guessing, I always say.",
  "See, THIS is how you talk to a Captain. Different angles, fresh takes. I almost feel motivated. Almost."
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

  // Random events flavor (prepended to normal line)
  let randomPrefix = ''
  if (events.random && RANDOM_LINES[events.random]) {
    randomPrefix = RANDOM_LINES[events.random] + ' '
  }

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
    let line = result.actionId && SUCCESS_LINES[result.actionId] ? pick(SUCCESS_LINES[result.actionId], seed) : null
    if (events.combo && events.combo >= 2) line = `${pick(COMBO_LINES, seed)} ${line || pick(RELUCTANT, seed)}`
    if (line) return randomPrefix + (verdict === 'COMPLY_RELUCTANT' ? `${pick(RELUCTANT, seed)} ${line}` : line)
    return randomPrefix + pick(RELUCTANT, seed)
  }

  // Near-miss: persuaded but not enough to act in a high-risk room
  if (verdict === 'COMPLY' || verdict === 'COMPLY_RELUCTANT') {
    return randomPrefix + pick(HEDGE, seed)
  }

  // Refuse / Counteroffer -> surface the typed objection
  const obj = objection || 'FEAR'
  const base = pick(OBJECTION_LINES[obj] || OBJECTION_LINES.FEAR, seed)
  const ambient = strayFlavor(state)
  return randomPrefix + (ambient ? `${ambient} ${base}` : base)
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
  if (result.events?.random) bits.push(`RANDOM_EVENT: ${result.events.random} (react to this environmental event in character)`)
  if (result.events?.combo) bits.push(`COMBO: player used ${result.events.combo} different appeal types in a row — react positively to their variety`)
  if (result.events?.sidePickup) bits.push(`SIDE_PICKUP (you found and ate a ${result.events.sidePickup.label} ${result.events.sidePickup.icon} in a side passage — energy ${result.events.sidePickup.energy}! React with joy and doughnut-related commentary)`)
  if (result.events?.crafted) bits.push('YOU CRAFTED A VOID CRULLER (2 Cores + 1 Sprinkle at the pastry station)')
  if (result.progress?.riftSealed) bits.push('YOU JUST SEALED THE RIFT (cost a Glaze Core)')
  if (result.progress?.vermiousFed) bits.push('YOU JUST FED VERMIOUS -> PORTAL OPEN')
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
