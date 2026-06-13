import { status } from 'elysia'
import { Prisma } from '../../generated/prisma/client'
import { prisma } from '../../prisma'
import { buildPageMeta, parsePagination } from '../../lib/pagination'
import type { ContestListQuery } from './model'

function contestOrderBy(order: string | undefined): Prisma.ContestOrderByWithRelationInput[] {
  if (order === 'qualities-desc') return [{ qualities: 'desc' }, { id: 'desc' }]
  if (order === 'qualities-asc') return [{ qualities: 'asc' }, { id: 'asc' }]
  if (order == 'asc')  return [{ startTime: 'asc' }, { id: 'asc' }]
  return [{ startTime: 'desc' }, { id: 'desc' }]
}

function normalizeScores(scores: Prisma.JsonValue): Record<string, number> {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return {}

  const result: Record<string, number> = {}
  for (const [problemId, value] of Object.entries(scores as Record<string, unknown>)) {
    const numeric = typeof value === 'number' ? value : Number(value)
    result[problemId] = Number.isFinite(numeric) ? numeric : 0
  }
  return result
}

async function loadPreContestRatings(contestId: number, userIds: number[]): Promise<Map<number, number>> {
  if (userIds.length === 0) return new Map()

  const changes = await prisma.ratingUserChange.findMany({
    where: {
      contestId,
      userId: { in: userIds },
      batch: {
        completedAt: { not: null },
        revertedAt: null,
      },
    },
    select: {
      id: true,
      batchId: true,
      userId: true,
      beforeRating: true,
    },
    orderBy: [
      { batch: { completedAt: 'desc' } },
      { batchId: 'desc' },
      { id: 'desc' },
    ],
  })

  const ratings = new Map<number, number>()
  for (const change of changes) {
    if (!ratings.has(change.userId)) {
      ratings.set(change.userId, change.beforeRating)
    }
  }
  return ratings
}

export abstract class ContestService {
  static async list(query: ContestListQuery) {
    const { page, pageSize, skip } = parsePagination(query.page, query.pageSize)
    const orderBy = contestOrderBy(query.order)
    const [total, items] = await prisma.$transaction([
      prisma.contest.count(),
      prisma.contest.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          startTime: true,
          endTime: true,
          qualities: true,
          type: true,
        },
        orderBy,
        skip,
        take: pageSize,
      }),
    ])
    return {
      success: true as const,
      data: {
        items,
        ...buildPageMeta(total, page, pageSize),
      },
    }
  }

  static async getById(id: number) {
    const row = await prisma.contest.findUnique({
      where: { id },
    })
    if (!row) {
      return status(404, { success: false as const, message: 'Contest not found' })
    }
    return status(200, { success: true as const, data: row })
  }

  static async getProblems(id: number) {
    const contest = await prisma.contest.findUnique({
      where: { id },
      select: {
        id: true,
        problems: {
          select: {
            point: true,
            order: true,
            problem: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!contest) {
      return status(404, { success: false as const, message: 'Contest not found' })
    }

    return {
      success: true as const,
      data: contest.problems.map((item) => ({
        id: item.problem.id,
        name: item.problem.name,
        description: item.problem.description,
        point: item.point,
        order: item.order,
      })),
    }
  }

  static async getRanklist(id: number) {
    const contest = await prisma.contest.findUnique({
      where: { id },
      select: {
        id: true,
        participants: {
          select: {
            id: true,
            userId: true,
            contestId: true,
            rank: true,
            totalScore: true,
            postContestRating: true,
            scores: true,
            user: {
              select: {
                id: true,
                nickname: true,
                realname: true,
                xsyusername: true,
              },
            },
          },
          orderBy: [
            { totalScore: 'desc' },
            { rank: 'asc' },
            { userId: 'asc' },
          ],
        },
      },
    })

    if (!contest) {
      return status(404, { success: false as const, message: 'Contest not found' })
    }

    const preContestRatings = await loadPreContestRatings(
      id,
      contest.participants.map((item) => item.userId),
    )

    return {
      success: true as const,
      data: contest.participants.map((item) => ({
        ...item,
        preContestRating: preContestRatings.get(item.userId) ?? null,
        scores: normalizeScores(item.scores),
      })),
    }
  }
}
