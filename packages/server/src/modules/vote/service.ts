import { status } from 'elysia'
import { prisma } from '../../prisma'
import { calcRatingWeights } from '../../plugins/rating2weight'
import { markProblemSearchDirty } from '../problem/search'

type WeightedRow = {
  score: number
  user: { rating: number }
}

function calcDisplayScore(rows: WeightedRow[]): number {
  let weightedSum = 0
  let totalWeight = 0
  for (const row of rows) {
    const w = calcRatingWeights(row.user.rating)
    weightedSum += row.score * w
    totalWeight += w
  }
  if (totalWeight === 0) return 0
  return weightedSum / totalWeight
}

export abstract class VoteService {
  static async voteProblem(userId: number, problemId: number, x: number) {
    const exists = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true },
    })
    if (!exists) {
      return status(404, { success: false as const, message: 'Problem not found' })
    }

    await prisma.problemVote.upsert({
      where: {
        userId_problemId: { userId, problemId },
      },
      create: { userId, problemId, score: x },
      update: { score: x },
    })

    const rows = await prisma.problemVote.findMany({
      where: { problemId },
      select: {
        score: true,
        user: { select: { rating: true } },
      },
    })

    const displayScore = calcDisplayScore(rows)
    await prisma.problem.update({
      where: { id: problemId },
      data: { qualities: displayScore },
    })
    markProblemSearchDirty()

    return status(200, { success: true as const })
  }

  static async voteContest(userId: number, contestId: number, x: number) {
    const exists = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true },
    })
    if (!exists) {
      return status(404, { success: false as const, message: 'Contest not found' })
    }

    await prisma.vote.upsert({
      where: {
        userId_contestId: { userId, contestId },
      },
      create: { userId, contestId, score: x },
      update: { score: x },
    })

    const rows = await prisma.vote.findMany({
      where: { contestId },
      select: {
        score: true,
        user: { select: { rating: true } },
      },
    })

    const displayScore = calcDisplayScore(rows)
    await prisma.contest.update({
      where: { id: contestId },
      data: { qualities: displayScore },
    })

    return status(200, { success: true as const })
  }
}
