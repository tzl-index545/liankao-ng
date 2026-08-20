import { status } from 'elysia'
import { prisma } from '../../prisma'
import type { YuantijiSearchBody } from './model'
import { embedderHash, getYuantijiConfig } from './config'
import { YuantijiModelClient } from './openai'
import { readYuantijiPrompt } from './prompt'
import { decodeEmbedding, normalizeEmbedding, normalizedCosineScore } from './vector'

const RESULT_LIMIT = 10
const CACHE_TTL_MS = 30000

type YuantijiIndexEntry = {
  id: number
  name: string
  description: string
  vector: Float32Array
}

type YuantijiIndexCache = {
  embedderHash: string
  loadedAt: number
  entries: YuantijiIndexEntry[]
}

let indexCache: YuantijiIndexCache | null = null

async function loadIndex(currentEmbedderHash: string) {
  if (
    indexCache?.embedderHash === currentEmbedderHash &&
    Date.now() - indexCache.loadedAt < CACHE_TTL_MS
  ) {
    return indexCache.entries
  }
  const rows = await prisma.yuantijiEmbedding.findMany({
    where: { embedderHash: currentEmbedderHash },
    select: {
      embedding: true,
      dimensions: true,
      problem: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  })
  const entries = rows.flatMap((row) => {
    try {
      return [{ ...row.problem, vector: decodeEmbedding(row.embedding, row.dimensions) }]
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Ignoring invalid yuantiji embedding for problem ${row.problem.id}: ${message}`)
      return []
    }
  })
  indexCache = { embedderHash: currentEmbedderHash, loadedAt: Date.now(), entries }
  return entries
}

export function rankYuantijiMatches(entries: YuantijiIndexEntry[], query: number[]) {
  return entries
    .filter((entry) => entry.vector.length === query.length)
    .map(({ vector, ...problem }) => ({
      ...problem,
      similarity: normalizedCosineScore(vector, query),
    }))
    .sort((left, right) => right.similarity - left.similarity || left.id - right.id)
    .slice(0, RESULT_LIMIT)
}

export abstract class YuantijiService {
  static async search(body: YuantijiSearchBody) {
    const statement = body.statement.trim()
    if (!statement) {
      return status(400, { success: false as const, message: 'Problem statement is required' })
    }
    try {
      const config = getYuantijiConfig()
      const promptTemplate = await readYuantijiPrompt()
      const entries = await loadIndex(embedderHash(config))
      if (entries.length === 0) {
        return status(503, {
          success: false as const,
          message: 'Yuantiji index is empty; run the indexing script first',
        })
      }
      const client = new YuantijiModelClient(config)
      const simplifiedStatement = await client.simplify(statement, promptTemplate)
      const query = normalizeEmbedding(await client.embed(simplifiedStatement))
      const compatibleEntries = entries.filter((entry) => entry.vector.length === query.length)
      if (compatibleEntries.length === 0) {
        return status(503, {
          success: false as const,
          message: 'Yuantiji index is incompatible; rebuild it with the current embedding model',
        })
      }
      return {
        success: true as const,
        data: {
          simplifiedStatement,
          indexedCount: compatibleEntries.length,
          matches: rankYuantijiMatches(compatibleEntries, query),
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Yuantiji search failed: ${message}`)
      return status(503, {
        success: false as const,
        message: 'Yuantiji is temporarily unavailable',
      })
    }
  }
}
