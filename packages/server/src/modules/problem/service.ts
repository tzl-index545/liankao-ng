import { status } from 'elysia'
import { Prisma } from '../../generated/prisma/client'
import { prisma } from '../../prisma'
import { buildPageMeta, parsePagination } from '../../lib/pagination'
import type { ProblemListQuery } from './model'

function problemOrderBy(order: string | undefined): Prisma.ProblemOrderByWithRelationInput[] {
  if (order === 'qualities-desc') return [{ qualities: 'desc' }, { id: 'desc' }]
  if (order === 'qualities-asc') return [{ qualities: 'asc' }, { id: 'asc' }]
  if (order === 'difficulties-desc') return [{ difficulties: 'desc' }, { id: 'desc' }]
  if (order === 'difficulties-asc') return [{ difficulties: 'asc' }, { id: 'asc' }]
  if( order === 'asc') return [{ id: 'asc' }]
  return [{ id: 'desc' }]
}

export abstract class ProblemService {
  static async list(query: ProblemListQuery) {
    const { page, pageSize, skip } = parsePagination(query.page, query.pageSize)
    const orderBy = problemOrderBy(query.order)
    const [total, items] = await prisma.$transaction([
      prisma.problem.count(),
      prisma.problem.findMany({
        select: {
          id: true,
          difficulties: true,
          qualities: true,
          name: true,
          description: true,
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
    const row = await prisma.problem.findUnique({
      where: { id },
      select: {
        id: true,
        difficulties: true,
        qualities: true,
        name: true,
        description: true,
        statementHtml: true,
        statementFetchedAt: true,
        contests: {
          select: {
            contestId: true,
            sourcePid: true,
            sourceUrl: true,
          },
          orderBy: { contestId: 'asc' },
        },
      },
    })
    if (!row) {
      return status(404, { success: false as const, message: 'Problem not found' })
    }
    const { contests, ...problem } = row
    return {
      success: true as const,
      data: {
        ...problem,
        contestIds: contests.map((link) => link.contestId),
        sources: contests,
      },
    }
  }
}
