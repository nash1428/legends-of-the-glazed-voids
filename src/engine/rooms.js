// Hardcoded room/level data. Engine interprets actions; narration never mutates these.
// Ordered forward progression (7 rooms):
//   Bridge → North Corridor → Glazing Bay → East Shaft → The Maw → Final Conduit → Escape Portal
// Side passages are optional and never block the main path.

export const ROOMS = {
  bridge: {
    id: 'bridge',
    name: 'The Bridge',
    subtitle: 'Command Deck · U.S.V. Old-Fashioned',
    risk: 0.12,
    objective: 'Persuade Glaze to move to the next room.',
    hint: 'Try a direct order, flattery, or reassurance.',
    requiredAction: 'move_to_next_room',
    actions: {
      move_to_next_room: {
        label: 'Move to North Corridor',
        nextRoom: 'north_corridor',
        onSuccess: { ego: +6, composure: +4, trust: +3 }
      }
    },
    intro: "Glaze slumps in the captain's chair, polishing a holographic doughnut. The ship groans. 'Look, Cruller, the next room is, like, four whole steps away. Four! I'm the Captain — Captains delegate walking.'"
  },
  north_corridor: {
    id: 'north_corridor',
    name: 'North Corridor',
    subtitle: 'Access Passage · Deck 1',
    risk: 0.2,
    objective: 'Move forward to the Glazing Bay.',
    hint: 'The lights flicker — reassure Glaze and move on.',
    requiredAction: 'move_to_next_room',
    sidePassage: { id: 'nc_side', name: 'Inspection Panel', item: 'glazeCores', itemLabel: 'Glaze Core', hint: 'A panel glints behind the conduit.' },
    actions: {
      move_to_next_room: {
        label: 'Move to the Glazing Bay',
        nextRoom: 'glazing_bay',
        onSuccess: { ego: +4, trust: +2 }
      },
      search_side: {
        label: 'Search the inspection panel',
        side: true
      }
    },
    intro: "Flickering violet light strobes down a narrow corridor. Pipes hiss. 'Captains do not do flickering, Cruller. This is an OSHA violation. I can smell the lawsuit.' Something glints behind an inspection panel."
  },
  glazing_bay: {
    id: 'glazing_bay',
    name: 'The Glazing Bay',
    subtitle: 'Glaze Core Repository · Bay 7',
    risk: 0.72,
    objective: 'Grab a Glaze Core past the dormant Chrome Stray.',
    hint: 'The Stray fears noise. Reassure Glaze, or bribe him with courage.',
    threat: 'Chrome Stray (dormant)',
    requiredAction: 'grab_core',
    sidePassage: { id: 'gb_side', name: 'Side Vent', item: 'neutronSprinkles', itemLabel: 'Neutron Sprinkle', hint: 'A vent hums with sprinkle energy.' },
    actions: {
      grab_core: {
        label: 'Grab a Glaze Core',
        nextRoom: 'east_shaft',
        onSuccess: { ego: +8, composure: +3, trust: +2 }
      },
      stun_stray: {
        label: 'Stun the Chrome Stray (Neutron Sprinkle)',
        consumeSprinkle: true,
        onSuccess: { composure: +14, trust: +4 }
      },
      search_side: {
        label: 'Search the side vent',
        side: true
      }
    },
    intro: "Pristine Glaze Cores spin on a rack, haloed in cyan light. A Chrome Stray — chrome-plated feral doughnut beast — dozes beneath them, one optic crackling. 'That, Cruller, is why I am NOT going over there. Do you see those teeth? Those are teeth. A Captain should not be a tooth-related statistic.'"
  },
  east_shaft: {
    id: 'east_shaft',
    name: 'East Shaft',
    subtitle: 'Vertical Access · Engineering',
    risk: 0.4,
    objective: 'Move forward to The Maw.',
    hint: 'Rift energy rises. Reassure and move on.',
    requiredAction: 'move_to_next_room',
    sidePassage: { id: 'es_side', name: 'Broken Locker', item: 'raspberrySingularity', itemLabel: 'Raspberry Singularity', hint: 'A broken locker pulses with dark energy.' },
    actions: {
      move_to_next_room: {
        label: 'Move to The Maw',
        nextRoom: 'maw',
        onSuccess: { ego: +5, composure: -3, trust: +2 }
      },
      search_side: {
        label: 'Search the broken locker',
        side: true
      }
    },
    intro: "A vertical shaft pulses with violet rift-energy, gravity warping the handrails. 'This is, frankly, an architectural nightmare, Cruller. I went to captain school, not vertical shaft school.' Something pulses inside a broken locker."
  },
  maw: {
    id: 'maw',
    name: 'The Maw',
    subtitle: 'Engineering · Rift Containment',
    risk: 0.9,
    objective: 'Seal the rift, then craft a Void Cruller to feed Vermious.',
    hint: 'Sealing costs a Glaze Core. Craft a Cruller: 2 Cores + 1 Sprinkle.',
    threat: 'Vermious (rift-beast)',
    requiredAction: 'move_to_next_room',
    actions: {
      seal_rift: {
        label: 'Seal the rift (−1 Glaze Core)',
        needsCore: true,
        onSuccess: { ego: +10, composure: -6, trust: +4 }
      },
      craft_cruller: {
        label: 'Craft a Void Cruller (2 Cores + 1 Sprinkle)',
        craft: true
      },
      move_to_next_room: {
        label: 'Move to Final Conduit',
        nextRoom: 'final_conduit',
        needsRiftSealed: true,
        onSuccess: { ego: +6, composure: -2, trust: +3 }
      }
    },
    intro: "A tear in reality yawns in the engine room, leaking violet static. Beyond it, VERMIOUS coils — vast, dripping icing, humming for sugar. 'That, Cruller, is a god made of pastry. We seal the rift first — it cost us a Core — then we craft a Cruller at the pastry station and feed the thing.'"
  },
  final_conduit: {
    id: 'final_conduit',
    name: 'Final Conduit',
    subtitle: 'Vermious Chamber · Core',
    risk: 0.85,
    objective: 'Feed Vermious a Void Cruller to open the Escape Portal.',
    hint: 'Vermious needs a Void Cruller. If you lack one, go back to The Maw to craft.',
    threat: 'Vermious (fed)',
    requiredAction: 'feed_vermious',
    actions: {
      feed_vermious: {
        label: 'Feed Vermious (−1 Void Cruller)',
        needsCruller: true,
        nextRoom: 'escape_portal',
        onSuccess: { ego: +12, trust: +6 }
      }
    },
    intro: "VERMIOUS fills the conduit, coiled around the escape portal, humming for sugar. Its icing-dripping maw waits. 'This is it, Cruller. The final boss of doughnuts. We feed it a Cruller, the portal opens, we RUN. Do we have a Cruller? Tell me we have a Cruller.'"
  },
  escape_portal: {
    id: 'escape_portal',
    name: 'Escape Portal',
    subtitle: 'Extraction · Bakery Uplink',
    risk: 0,
    objective: 'Escape through the portal.',
    hint: 'The portal is open. You made it.',
    requiredAction: null,
    actions: {},
    intro: "The portal hums, ringed in cyan light. Freedom. The Bakery awaits. 'Well, Cruller... we made it. The Captain made it. Open the channel — I'm walking through.'"
  }
}

export const ROOM_ORDER = ['bridge', 'north_corridor', 'glazing_bay', 'east_shaft', 'maw', 'final_conduit', 'escape_portal']

export function getRoom(id) {
  return ROOMS[id]
}

// Door to room[index+1] is locked unless room[index] is completed.
export function isDoorLocked(state, fromIndex) {
  const roomId = ROOM_ORDER[fromIndex]
  return !(state.completedRooms || []).includes(roomId)
}

// 5 doughnut types
export const DOUGHNUTS = {
  glazeCores: { label: 'Glaze Core', icon: '◆', color: 'text-cyan-glaze', energy: 1 },
  neutronSprinkles: { label: 'Neutron Sprinkle', icon: '✦', color: 'text-glaze-gold', energy: 2 },
  voidCrullers: { label: 'Void Cruller', icon: '◯', color: 'text-glaze-pink', energy: 3 },
  raspberrySingularity: { label: 'Raspberry Singularity', icon: '★', color: 'text-glaze-pink', energy: 4 },
  forbiddenDoughnut: { label: 'Forbidden Doughnut', icon: '☠', color: 'text-danger', energy: 5 }
}

// Crafting recipe: 2 Glaze Cores + 1 Neutron Sprinkle → 1 Void Cruller
export const CRAFT_RECIPE = {
  glazeCores: 2,
  neutronSprinkles: 1,
  output: 'voidCrullers',
  outputAmount: 1
}
