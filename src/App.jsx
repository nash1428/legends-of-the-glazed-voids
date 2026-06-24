import { useGame } from './store/gameStore.js'
import { computeMood } from './engine/engine.js'
import { llmAvailable } from './llm/client.js'
import CommsLog from './components/CommsLog.jsx'
import ShipPanel from './components/ShipPanel.jsx'
import EndingScreen from './components/EndingScreen.jsx'

export default function App() {
  const { state, reset } = useGame()
  const mood = computeMood(state)

  return (
    <div className="flex h-screen flex-col bg-void-black text-glaze-cream">
      <header className="flex items-center justify-between border-b border-violet-glaze/30 bg-void-deep/60 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl animate-floaty">🍩</span>
          <div>
            <h1 className="font-display text-base font-bold leading-tight text-glaze-cream text-glow sm:text-lg">
              Legends of the Glazed Voids
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-glaze/70">
              Captain Glaze &amp; the Interdimensional Doughnut Crisis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`chip hidden sm:inline-flex ${
              llmAvailable() ? 'border-ok/50 text-ok' : 'border-glaze-gold/50 text-glaze-gold'
            }`}
            title={
              llmAvailable()
                ? 'Live Claude Judge + Actor'
                : 'Deterministic heuristic Judge + templated Actor (add VITE_ANTHROPIC_API_KEY for live Claude)'
            }
          >
            {llmAvailable() ? '● Live LLM' : '● Heuristic Mode'}
          </span>
          <button onClick={reset} className="btn border border-violet-glaze/40 bg-violet-deep/40 text-glaze-cream hover:bg-violet-deep/70">
            New Run
          </button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 grid-rows-[40vh_1fr] overflow-hidden lg:grid-cols-[1.4fr_1fr] lg:grid-rows-1">
        <div className="order-2 min-h-0 overflow-hidden border-t border-violet-glaze/30 lg:order-none lg:col-start-1 lg:border-t-0 lg:border-r">
          <CommsLog />
        </div>
        <div className="order-1 min-h-0 overflow-hidden lg:order-none lg:col-start-2">
          <ShipPanel state={state} mood={mood} />
        </div>
      </main>

      <EndingScreen />
    </div>
  )
}
