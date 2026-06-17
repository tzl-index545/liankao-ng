
import { status } from 'elysia'
import { Prisma } from '../../generated/prisma/client'
import { prisma } from '../../prisma'
import type { UserListQuery } from './model'

function userOrderBy(order: string | undefined): Prisma.UserOrderByWithRelationInput[] {
  if (order === 'rating-desc') return [{ rating: 'desc' }, { id: 'desc' }]
  if (order === 'rating-asc') return [{ rating: 'asc' }, { id: 'asc' }]
  if (order === 'asc') return [{ id: 'asc' }]
  return [{ id: 'desc' }]
}

export abstract class UserService {
  static async list(query: UserListQuery) {
    const { page = 1, pageSize = 20 } = query
    const skip = (page - 1) * pageSize
    const orderBy = userOrderBy(query.order)

    const [total, items] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.findMany({
        select: {
          id: true,
          nickname: true,
          xsyusername: true,
          rating: true,
          realname: true
        },
        orderBy,
        skip,
        take: pageSize
      })
    ])

    const totalPages = Math.ceil(total / pageSize)

    return {
      success: true as const,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages
      }
    }
  }

  static async getById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nickname: true,
        xsyusername: true,
        rating: true,
        realname: true
      }
    })

    if (!user) {
      return status(404, { success: false as const, message: 'User not found' })
    }

    return {
      success: true as const,
      data: user
    }
  }

  static async getParticipations(userId: number) {
    const participations = await prisma.participation.findMany({
      where: { userId },
      orderBy: { contestId: 'desc' },
      select: {
        id: true,
        userId: true,
        contestId: true,
        totalScore: true,
        rank: true,
        postContestRating: true
      }
    })

    return {
      success: true as const,
      data: participations.map((item) => ({
        ...item,
        postContestRating: item.postContestRating ?? 0
      }))
    }
  }

  static async getRatingChanges(userId: number) {
    const ratingChanges = await prisma.ratingUserChange.findMany({
      where: { userId },
      orderBy: { contestId: 'desc' },
      select: {
        id: true,
        batchId: true,
        contestId: true,
        userId: true,
        beforeRating: true,
        afterRating: true
      }
    })

    return {
      success: true as const,
      data: ratingChanges
    }
  }

  static async getRatingHistory(userId: number) {
    const ratingHistory = await prisma.participation.findMany({
      where: { userId },
      orderBy: [
        { contestId: 'asc' },
        { id: 'asc' }
      ],
      select: {
        id: true,
        userId: true,
        contestId: true,
        rank: true,
        preContestRating: true,
        postContestRating: true
      }
    })

    return {
      success: true as const,
      data: ratingHistory
    }
  }
}
