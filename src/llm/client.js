// Thin Anthropic Messages API wrapper. Used only when VITE_ANTHROPIC_API_KEY
// is present at build time. Browser-direct calls require the dangerous-access
// header. Falls back gracefully if the network/key is unavailable.

const ENV = import.meta.env || {}
const API_KEY = ENV.VITE_ANTHROPIC_API_KEY || ''
const MODEL = ENV.VITE_ANTHROPIC_MODEL || 'claude-3-5-haiku-latest'
const BASE = 'https://api.anthropic.com/v1/messages'

export const llmAvailable = () => Boolean(API_KEY)

export async function callClaude({ system, user, maxTokens = 512, temperature = 0.4 }) {
  if (!llmAvailable()) throw new Error('LLM_UNAVAILABLE')
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }]
    })
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`LLM_HTTP_${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  const block = data.content?.find((b) => b.type === 'text')
  return block?.text || ''
}

// Extract the first {...} JSON object from a possibly-fenced model reply.
export function extractJson(text) {
  if (!text) return null
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fence ? fence[1] : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}
