export async function claudeMessage(content: string, model: string = 'claude-sonnet-4-5'): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const body = {
    model,
    max_tokens: 512,
    temperature: 0.4,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: content }
        ]
      }
    ]
  } as any

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let txt = await res.text().catch(() => '')
    // Try to shorten noisy HTML errors if any
    if (txt && txt.length > 4000) txt = txt.slice(0, 4000)
    throw new Error(`Anthropic error ${res.status}: ${txt}`)
  }
  const json = await res.json()
  const text: string = json?.content?.[0]?.text || ''
  return String(text || '').trim()
}


