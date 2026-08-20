import { prisma } from '../prisma'
import { ProblemSearchService } from '../modules/problem/search'

try {
  const count = await ProblemSearchService.rebuild()
  console.log(`Indexed ${count} problems in Meilisearch.`)
} finally {
  await prisma.$disconnect()
}
