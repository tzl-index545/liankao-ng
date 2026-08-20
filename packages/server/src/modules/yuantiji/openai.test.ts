import { describe, expect, it, mock } from 'bun:test'
import type { YuantijiConfig } from './config'
import { YuantijiModelClient } from './openai'

const config: YuantijiConfig = {
  chatEndpoint: 'https://chat.example/v1/chat/completions',
  chatApiKey: 'chat-key',
  chatModel: 'chat-model',
  embeddingEndpoint: 'https://embedding.example/v1/embeddings',
  embeddingApiKey: 'embedding-key',
  embeddingModel: 'embedding-model',
  timeoutMs: 1000,
}

describe('YuantijiModelClient', () => {
  it('uses separate OpenAI-compatible chat and embedding configurations', async () => {
    const fetcher = mock(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url === config.chatEndpoint) {
        expect(init?.headers).toMatchObject({ Authorization: 'Bearer chat-key' })
        expect(JSON.parse(String(init?.body))).toMatchObject({ model: 'chat-model' })
        return Response.json({
          choices: [{ message: { content: '<SIMPLIFIED_STATEMENT>Add two integers.</SIMPLIFIED_STATEMENT>' } }],
        })
      }
      expect(url).toBe(config.embeddingEndpoint)
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer embedding-key' })
      expect(JSON.parse(String(init?.body))).toEqual({
        model: 'embedding-model',
        input: 'Add two integers.',
      })
      return Response.json({ data: [{ embedding: [0.25, 0.75] }] })
    })
    const client = new YuantijiModelClient(config, fetcher as typeof fetch)

    const simplified = await client.simplify('A+B', 'Statement:\n[[ORIGINAL]]')
    expect(simplified).toBe('Add two integers.')
    expect(await client.embed(simplified)).toEqual([0.25, 0.75])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
