import { prisma } from '../../prisma'
import {
  embedderHash,
  getYuantijiConfig,
  sha256,
  simplifierHash,
} from './config'
import { YuantijiModelClient } from './openai'
import { readYuantijiPrompt } from './prompt'
import { statementHtmlToYuantijiText } from './text'
import { encodeEmbedding, normalizeEmbedding } from './vector'

export type YuantijiIndexStats = {
  total: number
  indexed: number
  unchanged: number
  missingStatement: number
  failed: number
}

export async function indexYuantijiProblems(force = false): Promise<YuantijiIndexStats> {
  const config = getYuantijiConfig()
  const promptTemplate = await readYuantijiPrompt()
  const currentSimplifierHash = simplifierHash(config, promptTemplate)
  const currentEmbedderHash = embedderHash(config)
  const modelClient = new YuantijiModelClient(config)
  const problems = await prisma.problem.findMany({
    select: {
      id: true,
      name: true,
      statementHtml: true,
      yuantijiEmbedding: true,
    },
    orderBy: { id: 'asc' },
  })
  const stats: YuantijiIndexStats = {
    total: problems.length,
    indexed: 0,
    unchanged: 0,
    missingStatement: 0,
    failed: 0,
  }

  for (const problem of problems) {
    if (!problem.statementHtml?.trim()) {
      if (problem.yuantijiEmbedding) {
        await prisma.yuantijiEmbedding.delete({ where: { problemId: problem.id } })
      }
      stats.missingStatement += 1
      continue
    }

    const statement = statementHtmlToYuantijiText(problem.statementHtml)
    if (!statement) {
      if (problem.yuantijiEmbedding) {
        await prisma.yuantijiEmbedding.delete({ where: { problemId: problem.id } })
      }
      stats.missingStatement += 1
      continue
    }

    const sourceHash = sha256(statement)
    const existing = problem.yuantijiEmbedding
    if (
      !force &&
      existing?.sourceHash === sourceHash &&
      existing.simplifierHash === currentSimplifierHash &&
      existing.embedderHash === currentEmbedderHash &&
      existing.dimensions > 0 &&
      existing.embedding.byteLength === existing.dimensions * Float32Array.BYTES_PER_ELEMENT
    ) {
      stats.unchanged += 1
      continue
    }

    try {
      const canReuseSimplified = !force &&
        existing?.sourceHash === sourceHash &&
        existing.simplifierHash === currentSimplifierHash
      const simplifiedStatement = canReuseSimplified
        ? existing.simplifiedStatement
        : await modelClient.simplify(statement, promptTemplate)
      const embedding = normalizeEmbedding(await modelClient.embed(simplifiedStatement))
      await prisma.yuantijiEmbedding.upsert({
        where: { problemId: problem.id },
        create: {
          problemId: problem.id,
          sourceHash,
          simplifierHash: currentSimplifierHash,
          embedderHash: currentEmbedderHash,
          simplifiedStatement,
          embedding: encodeEmbedding(embedding),
          dimensions: embedding.length,
          chatModel: config.chatModel,
          embeddingModel: config.embeddingModel,
        },
        update: {
          sourceHash,
          simplifierHash: currentSimplifierHash,
          embedderHash: currentEmbedderHash,
          simplifiedStatement,
          embedding: encodeEmbedding(embedding),
          dimensions: embedding.length,
          chatModel: config.chatModel,
          embeddingModel: config.embeddingModel,
        },
      })
      stats.indexed += 1
      console.log(`[${problem.id}] Indexed ${problem.name}`)
    } catch (error: unknown) {
      stats.failed += 1
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${problem.id}] Failed ${problem.name}: ${message}`)
    }
  }

  return stats
}
