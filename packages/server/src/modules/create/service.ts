import { status } from 'elysia'
import { recalculateRatingsFromContest } from '../../contest/updateRating'
import { prisma } from '../../prisma'
import { syncContestInfo } from '../../scraper/initContest'
import { env } from '../../config/env'

export abstract class CreateService {
  private static getAdminNicknames() {
    return env.adminNicknames
  }

  private static isAdmin(nickname: string) {
    return CreateService.getAdminNicknames().includes(nickname)
  }

  static async createContest(userId: number, contestId: number, phpSessionId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    })

    if (!user) {
      return status(403, {
        success: false as const,
        message: 'Unauthorized',
      })
    }

    if (!CreateService.isAdmin(user.nickname)) {
      return status(403, {
        success: false as const,
        message: 'Forbidden: admin permission required',
      })
    }

    try {
      await syncContestInfo(phpSessionId, contestId)
      await recalculateRatingsFromContest(contestId)
      return {
        success: true as const,
        message: `Contest ${contestId} created and ratings recalculated.`,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return status(500, {
        success: false as const,
        message: `Failed to create contest: ${message}`,
      })
    }
  }

  static async crawlContest(contestId: number, phpSessionId: string) {
    try {
      await syncContestInfo(phpSessionId, contestId)
      return {
        success: true as const,
        message: `Contest ${contestId} crawled.`,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return status(500, {
        success: false as const,
        message: `Failed to crawl contest: ${message}`,
      })
    }
  }

  static async calculateRating(userId: number, contestId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    })

    if (!user) {
      return status(403, {
        success: false as const,
        message: 'Unauthorized',
      })
    }

    if (!CreateService.isAdmin(user.nickname)) {
      return status(403, {
        success: false as const,
        message: 'Forbidden: admin permission required',
      })
    }

    try {
      await recalculateRatingsFromContest(contestId)
      return {
        success: true as const,
        message: `Ratings recalculated from contest ${contestId}.`,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return status(500, {
        success: false as const,
        message: `Failed to calculate rating: ${message}`,
      })
    }
  }

  static async toggleContestRated(userId: number, contestId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    })

    if (!user) {
      return status(403, { success: false as const })
    }

    if (!CreateService.isAdmin(user.nickname)) {
      return status(403, { success: false as const })
    }

    try {
      const contest = await prisma.contest.findUnique({
        where: { id: contestId },
        select: { type: true },
      })

      if (!contest) {
        return status(404, { success: false as const })
      }

      const nextType = contest.type ^ 1
      await prisma.contest.update({
        where: { id: contestId },
        data: { type: nextType },
        select: { id: true },
      })

      try {
        await recalculateRatingsFromContest(contestId)
      } catch (error) {
        await prisma.contest.update({
          where: { id: contestId },
          data: { type: contest.type },
          select: { id: true },
        })
        throw error
      }

      return { success: true as const }
    } catch {
      return status(500, { success: false as const })
    }
  }
}
