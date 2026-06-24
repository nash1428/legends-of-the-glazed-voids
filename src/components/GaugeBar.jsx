import { useEffect, useRef, useState } from 'react'

const COLORS = {
  composure: 'bg-cyan-glaze',
  trust: 'bg-ok',
  ego: 'bg-glaze-pink',
  hunger: 'bg-glaze-gold',
  shipIntegrity: 'bg-gradient-to-r from-glaze-gold to-danger',
  suspicion: 'bg-danger'
}

export default function GaugeBar({ label, value, hidden, hint }) {
  const prev = useRef(value)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (value !== prev.current) {
      const dir = value > prev.current ? 'up' : 'down'
      setFlash(dir)
      const t = setTimeout(() => setFlash(null), 1300)
      prev.current = value
      return () => clearTimeout(t)
    }
  }, [value])

  const color = COLORS[label] || 'bg-cyan-glaze'
  const v = Math.round(value)

  return (
    <div className="select-none">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-glaze-cream/80">
          {label === 'shipIntegrity' ? 'Hull' : label}
          {hidden && <span className="ml-1 text-[9px] text-glaze-cream/30">[hidden]</span>}
        </span>
        <span className="flex items-center gap-1">
          {flash && (
            <span
              className={`animate-flash text-[10px] font-bold ${
                flash === 'up' ? 'text-ok' : 'text-danger'
              }`}
            >
              {flash === 'up' ? '▲' : '▼'}
            </span>
          )}
          <span className="font-mono text-[11px] text-glaze-cream">{v}</span>
        </span>
      </div>
      <div className="gaugewrap">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${v}%` }}
        />
      </div>
      {hint && <div className="mt-0.5 text-[9px] italic text-glaze-cream/30">{hint}</div>}
    </div>
  )
}
