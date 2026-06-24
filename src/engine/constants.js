// Deterministic engine weights & thresholds. Engine owns all truth.
// No dice-RNG puzzle solutions; jitter is bounded to ±2.

export const THRESHOLD = 50

export const W = {
  BASE: 50,
  ego: 30,
  bribe: 26,
  reassure: 24,
  argue: 22,
  threat: 26,
  fearK: 0.42,
  annoyK: 0.55,
  suspK: 0.5,
  resK: 0.5,
  heroMax: 16
}

// Verdict bands relative to threshold (willingness - THRESHOLD).
export const VERDICT = {
  COMPLY: 'COMPLY', // diff >= +15
  COMPLY_RELUCTANT: 'COMPLY_RELUCTANT', // 0..+15
  COUNTEROFFER: 'COUNTEROFFER', // -15..0
  REFUSE: 'REFUSE' // < -15
}

export const OBJECTIONS = ['FEAR', 'INSULT', 'DISTRUST', 'LAZINESS', 'SUSPICION', 'RESOURCE']

export const JITTER = 2 // ±2 max

export const APPEALS = [
  'command',
  'flatter',
  'bribe',
  'reassure',
  'argue',
  'threaten',
  'trick',
  'apologize'
]

// Hidden -> surfaced gauge references for UI flashes
export const GAUGE_DEFS = [
  { key: 'composure', label: 'Composure', color: 'cyan', hidden: false },
  { key: 'trust', label: 'Trust', color: 'ok', hidden: false },
  { key: 'ego', label: 'Ego', color: 'glaze-pink', hidden: true },
  { key: 'hunger', label: 'Hunger', color: 'glaze-gold', hidden: true }
]
