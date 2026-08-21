import type { YuantijiConfig } from './config'
import { cleanSimplifiedStatement } from './prompt'

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null }
  }>
}

type EmbeddingResponse = {
  data?: Array<{
    embedding?: number[]
  }>
}

export class YuantijiModelClient {
  constructor(
    private readonly config: YuantijiConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async postJson<T>(endpoint: string, apiKey: string, body: object) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)
    try {
      const response = await this.fetcher(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!response.ok) {
        const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 500)
        throw new Error(`Model endpoint returned ${response.status}${detail ? `: ${detail}` : ''}`)
      }
      return await response.json() as T
    } finally {
      clearTimeout(timeout)
    }
  }

  async simplify(statement: string, promptTemplate: string) {
    const response = await this.postJson<ChatCompletionResponse>(
      this.config.chatEndpoint,
      this.config.chatApiKey,
      {
        model: this.config.chatModel,
        messages: [
          { role: 'system', content: promptTemplate },
          { role: 'user', content: statement },
        ],
        thinking: { type: 'disabled' }
        // reasoning_effort: 'low',
      },
    )
    const content = response.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('Simplifier returned no text content')
    return cleanSimplifiedStatement(content)
  }

  async embed(text: string) {
    const response = await this.postJson<EmbeddingResponse>(
      this.config.embeddingEndpoint,
      this.config.embeddingApiKey,
      { model: this.config.embeddingModel, input: text },
    )
    const embedding = response.data?.[0]?.embedding
    if (!Array.isArray(embedding)) throw new Error('Embedding endpoint returned no vector')
    return embedding
  }
}
