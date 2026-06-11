import { t,Elysia } from 'elysia'
import { authGuard } from '../../plugins/auth-guard'
import {
  ContestListQuery,
  contestApiError,
  contestDetailParams,
  contestDetailResponse,
  contestListQuery,
  contestPaginatedResponse,
  contestProblemsResponse,
  contestRanklistResponse,
} from './model'
import { ContestService } from './service'

export const contest = new Elysia({
  prefix: '/contest',
  detail: {
    security: [{ bearerAuth: [] }],
    tags: ['contest'],
    description: '需 Bearer JWT（Authorization: Bearer <token>）。',
  },
})
  .use(authGuard)
  .model({
    listQuery: contestListQuery,
    paginatedResponse: contestPaginatedResponse,
    detailParams: contestDetailParams,
    detailResponse: contestDetailResponse,
    problemsResponse: contestProblemsResponse,
    ranklistResponse: contestRanklistResponse,
    apiError: contestApiError,
  })
  .prefix('model', 'contest')
  .get('/list', ({ query } : { query: ContestListQuery }) => ContestService.list(query), {
    query: contestListQuery,
    response: { 200: contestPaginatedResponse },
    detail: {
      summary: '比赛列表（分页）',
      description:
        'page / pageSize 由服务端截断在合法范围内；可选 order: qualities-desc | qualities-asc | desc | asc，asc 和 desc 都是按开始时间排序，默认按开始时间降序（desc）。',
    },
  })
  .get('/:id/problems', ({ params }) => ContestService.getProblems(params.id), {
    params: contestDetailParams,
    response: {
      200: contestProblemsResponse,
      404: contestApiError,
    },
    detail: {
      summary: '比赛题目列表',
      description: '按比赛题目顺序返回题目 id、名称、描述、分值和顺序。',
    },
  })
  .get('/:id/ranklist', ({ params }) => ContestService.getRanklist(params.id), {
    params: contestDetailParams,
    response: {
      200: contestRanklistResponse,
      404: contestApiError,
    },
    detail: {
      summary: '比赛排行榜',
      description: '按总分降序返回比赛参赛者排名、用户信息、总分和每题得分。',
    },
  })
  .get('/:id', ({ params }) => ContestService.getById(params.id), {
    params: contestDetailParams,
    response: {
      200: contestDetailResponse,
      404: contestApiError,
    },
    detail: {
      summary: '比赛详情',
    },
  })
