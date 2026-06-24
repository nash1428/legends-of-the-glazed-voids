// Hardcoded room/level data. Engine interprets actions; narration never mutates these.

export const ROOMS = {
  bridge: {
    id: 'bridge',
    name: 'The Bridge',
    subtitle: 'Command Deck · U.S.V. Old-Fashioned',
    risk: 0.12,
    art: 'bridge',
    objective: 'Get Captain Glaze to move to the hatch.',
    hint: 'Try a direct order, flattery, or reassurance.',
    actions: {
      move_to_hatch: {
        label: 'Move to the hatch',
        nextRoom: 'glazing_bay',
        // deltas applied by engine on COMPLY/COMPLY_RELUCTANT
        onSuccess: { ego: +6, composure: +4, trust: +3 }
      }
    },
    intro: "Glaze slumps in the captain's chair, polishing a holographic doughnut. The ship groans. 'Look, Cruller, the hatch is, like, four whole steps away. Four! I'm the Captain — Captains delegate walking.'"
  },
  glazing_bay: {
    id: 'glazing_bay',
    name: 'The Glazing Bay',
    subtitle: 'Glaze Core Repository · Bay 7',
    risk: 0.72,
    art: 'bay',
    objective: 'Grab a Glaze Core past the dormant Chrome Stray.',
    hint: 'The Stray fears noise. Reassure Glaze, or bribe him with courage.',
    threat: 'Chrome Stray (dormant)',
    actions: {
      grab_core: {
        label: 'Grab a Glaze Core',
        nextRoom: 'maw',
        onSuccess: { ego: +8, composure: +3, trust: +2 }
      },
      stun_stray: {
        label: 'Stun the Chrome Stray (Neutron Sprinkle)',
        consumeSprinkle: true,
        onSuccess: { composure: +14, trust: +4 }
      }
    },
    intro: "Pristine Glaze Cores spin on a rack, haloed in cyan light. A Chrome Stray — chrome-plated feral doughnut beast — dozes beneath them, one optic crackling. 'That, Cruller, is why I am NOT going over there. Do you see those teeth? Those are teeth. A Captain should not be a tooth-related statistic.'"
  },
  maw: {
    id: 'maw',
    name: 'The Maw',
    subtitle: 'Engineering · Rift Containment',
    risk: 0.9,
    art: 'maw',
    objective: 'Seal the rift, then feed Vermious to open the escape portal.',
    hint: 'Sealing costs a Glaze Core. Vermious hungers for a Void Cruller.',
    threat: 'Vermious (rift-beast)',
    actions: {
      seal_rift: {
        label: 'Seal the rift (−1 Glaze Core)',
        needsCore: true,
        onSuccess: { ego: +10, composure: -6, trust: +4 }
      },
      feed_vermious: {
        label: 'Feed Vermious (−1 Void Cruller)',
        needsCruller: true,
        onSuccess: { ego: +12, trust: +6 }
      },
      transmute: {
        label: 'Transmute a Core into a Void Cruller (fryer)',
        needsCore: true,
        onSuccess: { composure: -3, ego: +3 }
      }
    },
    intro: "A tear in reality yawns in the engine room, leaking violet static. Beyond it, VERMIOUS coils — vast, dripping icing, humming for sugar. 'That, Cruller, is a god made of pastry. We seal the rift first — it cost us a Core, naturally — then we feed the thing. A Cruller. Of course it wants a Cruller. They always want a Cruller.'"
  }
}

export const ROOM_ORDER = ['bridge', 'glazing_bay', 'maw']

export function getRoom(id) {
  return ROOMS[id]
}
