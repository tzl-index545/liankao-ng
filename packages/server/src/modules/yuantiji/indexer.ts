import { prisma } from '../../prisma'
import { env } from '../../config/env'
import {
  embedderHash,
  getYuantijiConfig,
  sha256,
  simplifierHash,
} from './config'
import { YuantijiModelClient } from './openai'
import { readYuantijiPrompt } from './prompt'
import { formatYuantijiProgress } from './progress'
import { statementHtmlToYuantijiText } from './text'
import { encodeEmbedding, normalizeEmbedding } from './vector'
import { runWithConcurrency } from './workerPool'

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

  await runWithConcurrency(problems, env.yuantijiIndexConcurrency, async (problem, problemIndex) => {
    const current = problemIndex + 1
    const log = (message: string) => console.log(
      formatYuantijiProgress(current, problems.length, problem.id, message),
    )
    const logError = (message: string) => console.error(
      formatYuantijiProgress(current, problems.length, problem.id, message),
    )

    if (!problem.statementHtml?.trim()) {
      if (problem.yuantijiEmbedding) {
        await prisma.yuantijiEmbedding.delete({ where: { problemId: problem.id } })
      }
      stats.missingStatement += 1
      log('缺少题面，跳过')
      return
    }

    const statement = statementHtmlToYuantijiText(problem.statementHtml)
    if (!statement) {
      if (problem.yuantijiEmbedding) {
        await prisma.yuantijiEmbedding.delete({ where: { problemId: problem.id } })
      }
      stats.missingStatement += 1
      log('清洗后题面为空，跳过')
      return
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
      log('索引未变化，跳过')
      return
    }

    let phase = '简化题意'
    try {
      const canReuseSimplified = !force &&
        existing?.sourceHash === sourceHash &&
        existing.simplifierHash === currentSimplifierHash
      let simplifiedStatement: string
      if (canReuseSimplified) {
        simplifiedStatement = existing.simplifiedStatement
        log('复用简化题意，开始生成 Embedding')
      } else {
        log('开始简化题意')
        simplifiedStatement = await modelClient.simplify(statement, promptTemplate)
        log('简化完成，开始生成 Embedding')
      }
      phase = '生成 Embedding'
      const embedding = normalizeEmbedding(await modelClient.embed(simplifiedStatement))
      log('Embedding 完成，开始写入数据库')
      phase = '写入数据库'
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
      log('Embedding 已写入数据库')
    } catch (error: unknown) {
      stats.failed += 1
      const message = error instanceof Error ? error.message : 'Unknown error'
      logError(`${phase}失败（${problem.name}）：${message}`)
    }
  })

  return stats
}
