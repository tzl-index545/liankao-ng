import { createHash } from 'node:crypto'
import { env } from '../../config/env'

export type YuantijiConfig = {
  chatEndpoint: string
  chatApiKey: string
  chatModel: string
  embeddingEndpoint: string
  embeddingApiKey: string
  embeddingModel: string
  timeoutMs: number
}

function requireConfig(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is required for yuantiji`)
  return value
}

function requireHttpEndpoint(value: string | undefined, name: string) {
  const endpoint = requireConfig(value, name)
  const url = new URL(endpoint)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use http or https`)
  }
  return endpoint
}

export function getYuantijiConfig(): YuantijiConfig {
  return {
    chatEndpoint: requireHttpEndpoint(env.yuantijiChatEndpoint, 'YUANTIJI_CHAT_ENDPOINT'),
    chatApiKey: requireConfig(env.yuantijiChatApiKey, 'YUANTIJI_CHAT_API_KEY'),
    chatModel: requireConfig(env.yuantijiChatModel, 'YUANTIJI_CHAT_MODEL'),
    embeddingEndpoint: requireHttpEndpoint(
      env.yuantijiEmbeddingEndpoint,
      'YUANTIJI_EMBEDDING_ENDPOINT',
    ),
    embeddingApiKey: requireConfig(
      env.yuantijiEmbeddingApiKey,
      'YUANTIJI_EMBEDDING_API_KEY',
    ),
    embeddingModel: requireConfig(env.yuantijiEmbeddingModel, 'YUANTIJI_EMBEDDING_MODEL'),
    timeoutMs: env.yuantijiTimeoutMs,
  }
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function simplifierHash(config: YuantijiConfig, promptTemplate: string) {
  return sha256(JSON.stringify({
    endpoint: config.chatEndpoint,
    model: config.chatModel,
    promptTemplate,
  }))
}

export function embedderHash(config: YuantijiConfig) {
  return sha256(JSON.stringify({
    endpoint: config.embeddingEndpoint,
    model: config.embeddingModel,
  }))
}
