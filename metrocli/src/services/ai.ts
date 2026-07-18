import OpenAI from 'openai'

export function createAiClient() {
  if (!process.env.NVIDIA_API_KEY) return null

  return new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  })
}

export async function completeWithAi(
  system: string,
  user: string,
  onToken?: (token: string) => void,
) {
  const client = createAiClient()
  if (!client) return ''

  const completion = await client.chat.completions.create({
    model: process.env.NVIDIA_MODEL || 'z-ai/glm-5.2',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 1,
    top_p: 1,
    max_tokens: 16384,
    seed: 42,
    stream: true,
  })

  let text = ''
  for await (const chunk of completion) {
    const token = chunk.choices[0]?.delta?.content || ''
    text += token
    if (token) onToken?.(token)
  }

  return text
}
