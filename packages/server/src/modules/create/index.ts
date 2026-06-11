import { Elysia, status } from 'elysia'
import { authGuard } from '../../plugins/auth-guard'
import {
  calculateRatingBody,
  crawlContestBody,
  createContestBody,
  createContestErrorResponse,
  createContestSuccessResponse,
} from './model'
import { CreateService } from './service'

export const create = new Elysia({
  prefix: '/create',
  detail: {
    security: [{ bearerAuth: [] }],
    tags: ['create'],
    description: '需 Bearer JWT（Authorization: Bearer <token>）。',
  },
})
  .use(authGuard)
  .post('/contest', ({ body, user }) => {
    if (!user) {
      return status(403, { success: false as const, message: 'Unauthorized' })
    }
    return CreateService.createContest(user.id, body.package.contestId, body.package.phpSessionId)
  }, {
    body: createContestBody,
    response: {
      200: createContestSuccessResponse,
      400: createContestErrorResponse,
      403: createContestErrorResponse,
      500: createContestErrorResponse,
    },
    detail: {
      summary: '创建比赛并重算 rating',
      description: '仅管理员可调用（由 ADMIN_NICKNAMES 控制）。传入 package.contestId 和 package.phpSessionId，使用本次请求提供的 PHPSESSID 抓取比赛、题目、榜单并自动重算 rating；若未爬到题目则不会创建比赛。',
    },
  })
  .post('/contest/crawl', ({ body, user }) => {
    if (!user) {
      return status(403, { success: false as const, message: 'Unauthorized' })
    }
    return CreateService.crawlContest(body.package.contestId, body.package.phpSessionId)
  }, {
    body: crawlContestBody,
    response: {
      200: createContestSuccessResponse,
      400: createContestErrorResponse,
      403: createContestErrorResponse,
      500: createContestErrorResponse,
    },
    detail: {
      summary: '抓取比赛',
      description: '登录用户可调用。传入 package.contestId 和 package.phpSessionId，使用本次请求提供的 PHPSESSID 抓取比赛、题目和榜单；若未爬到题目则不会创建比赛。',
    },
  })
  .post('/contest/rating', ({ body, user }) => {
    if (!user) {
      return status(403, { success: false as const, message: 'Unauthorized' })
    }
    return CreateService.calculateRating(user.id, body.package.contestId)
  }, {
    body: calculateRatingBody,
    response: {
      200: createContestSuccessResponse,
      400: createContestErrorResponse,
      403: createContestErrorResponse,
      500: createContestErrorResponse,
    },
    detail: {
      summary: '重算 rating',
      description: '仅管理员可调用（由 ADMIN_NICKNAMES 控制）。传入 package.contestId，从该比赛开始重算 rating。',
    },
  })
