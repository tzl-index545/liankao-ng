import { prisma } from '../prisma'
import { indexYuantijiProblems } from '../modules/yuantiji/indexer'
import { formatYuantijiTimestamp } from '../modules/yuantiji/progress'

const force = process.argv.includes('--force')

try {
  const stats = await indexYuantijiProblems(force)
  console.log(`[${formatYuantijiTimestamp()}] 索引完成 ${JSON.stringify(stats)}`)
  if (stats.failed > 0) process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
