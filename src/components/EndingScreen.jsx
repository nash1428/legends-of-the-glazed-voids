import { useGame } from '../store/gameStore.js'

const ENDINGS = {
  glazed_victory: {
    title: 'GLAZED VICTORY',
    sub: 'The portal opens. The Old-Fashioned escapes the void.',
    color: 'text-ok',
    ring: 'border-ok/50',
    glow: 'shadow-[0_0_40px_rgba(62,224,138,0.4)]',
    emoji: '🍩'
  },
  supreme_glaze: {
    title: 'SUPREME GLAZE',
    sub: 'A secret ending. Trust unwavering, Glaze transcends — he merges with Vermious and becomes the void itself.',
    color: 'text-glaze-pink',
    ring: 'border-glaze-pink/50',
    glow: 'shadow-[0_0_48px_rgba(255,111,181,0.5)]',
    emoji: '✨'
  },
  hull_lost: {
    title: 'HULL LOST',
    sub: 'The rifts win. The ship folds into the void like a donut in a fist.',
    color: 'text-danger',
    ring: 'border-danger/50',
    glow: 'shadow-[0_0_40px_rgba(255,59,107,0.4)]',
    emoji: '💀'
  },
  mutiny: {
    title: 'MUTINY',
    sub: 'Composure shattered, Glaze severs your link and goes it alone.',
    color: 'text-warn',
    ring: 'border-warn/50',
    glow: 'shadow-[0_0_40px_rgba(255,182,39,0.4)]',
    emoji: '⚡'
  }
}

export default function EndingScreen() {
  const { state, reset } = useGame()
  if (!state.gameOver || !state.ending) return null
  const e = ENDINGS[state.ending] || ENDINGS.hull_lost
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/80 backdrop-blur-sm p-4">
      <div className={`panel max-w-md p-8 text-center ${e.ring} ${e.glow}`}>
        <div className="mb-3 text-6xl">{e.emoji}</div>
        <h1 className={`font-display text-3xl font-bold tracking-wide ${e.color} text-glow`}>{e.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-glaze-cream/80">{e.sub}</p>
        <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-glaze-cream/50">
          <span>Turns: {state.turn}</span>
          <span>·</span>
          <span>Trust: {Math.round(state.trust)}</span>
          <span>·</span>
          <span>Hull: {Math.round(state.shipIntegrity)}%</span>
        </div>
        <button onClick={reset} className="btn-primary mt-6 w-full">
          Run Again
        </button>
      </div>
    </div>
  )
}
