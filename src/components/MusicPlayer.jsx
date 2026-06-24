// MusicPlayer — looping background music via HTML5 Audio API.
// Respects autoplay policies: starts muted, user enables via button.
// Volume defaults to ~25%. Source: public/background-music.mp3

import { useEffect, useRef, useState } from 'react'

export default function MusicPlayer() {
  const audioRef = useRef(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const audio = new Audio('/background-music.mp3')
    audio.loop = true
    audio.volume = 0.25
    audio.muted = true
    audioRef.current = audio
    // attempt autoplay (browsers may block unmuted autoplay)
    audio.play().catch(() => {
      // silent — user must click to enable
    })
    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    const next = !muted
    setMuted(next)
    audio.muted = next
    if (!next) {
      audio.play().catch(() => {})
    }
  }

  return (
    <button
      onClick={toggle}
      className="btn border border-violet-glaze/40 bg-violet-deep/40 text-glaze-cream hover:bg-violet-deep/70"
      title={muted ? 'Unmute background music' : 'Mute background music'}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
    >
      {muted ? '🔇' : '🎵'}
    </button>
  )
}
