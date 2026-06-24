// Hardcoded room/level data. Engine interprets actions; narration never mutates these.
// Ordered forward progression: Bridge → Glazing Bay → The Maw → Escape Portal.
// Glaze advances only when the current room's required action completes (COMPLY).

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
        label: 'Move to the Glazing Bay',
        nextRoom: 'glazing_bay',
        onSuccess: { ego: +6, composure: +4, trust: +3 }
      }
    },
    intro: "Glaze slumps in the captain's chair, polishing a holographic doughnut. The ship groans. 'Look, Cruller, the next room is, like, four whole steps away. Four! I'm the Captain — Captains delegate walking.'"
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
    objective: 'Seal the rift, then feed Vermious to open the escape portal.',
    hint: 'Sealing costs a Glaze Core. Vermious hungers for a Void Cruller.',
    threat: 'Vermious (rift-beast)',
    requiredAction: 'feed_vermious',
    actions: {
      seal_rift: {
        label: 'Seal the rift (−1 Glaze Core)',
        needsCore: true,
        onSuccess: { ego: +10, composure: -6, trust: +4 }
      },
      feed_vermious: {
        label: 'Feed Vermious (−1 Void Cruller)',
        needsCruller: true,
        nextRoom: 'escape_portal',
        onSuccess: { ego: +12, trust: +6 }
      },
      transmute: {
        label: 'Transmute a Core into a Void Cruller (fryer)',
        needsCore: true,
        onSuccess: { composure: -3, ego: +3 }
      }
    },
    intro: "A tear in reality yawns in the engine room, leaking violet static. Beyond it, VERMIOUS coils — vast, dripping icing, humming for sugar. 'That, Cruller, is a god made of pastry. We seal the rift first — it cost us a Core, naturally — then we feed the thing. A Cruller. Of course it wants a Cruller. They always want a Cruller.'"
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

export const ROOM_ORDER = ['bridge', 'glazing_bay', 'maw', 'escape_portal']

export function getRoom(id) {
  return ROOMS[id]
}

// Door to room[index+1] is locked unless room[index] is completed.
export function isDoorLocked(state, fromIndex) {
  const roomId = ROOM_ORDER[fromIndex]
  return !(state.completedRooms || []).includes(roomId)
}
