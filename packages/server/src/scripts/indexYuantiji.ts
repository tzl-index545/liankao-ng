import { prisma } from '../prisma'
import { indexYuantijiProblems } from '../modules/yuantiji/indexer'

const force = process.argv.includes('--force')

try {
  const stats = await indexYuantijiProblems(force)
  console.log(JSON.stringify(stats, null, 2))
  if (stats.failed > 0) process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
