import { Elysia } from 'elysia'
import { authGuard } from '../../plugins/auth-guard'
import {
  problemApiError,
  problemDetailParams,
  problemDetailResponse,
  problemListQuery,
  problemPaginatedResponse,
} from './model'
import { ProblemService } from './service'

export const problem = new Elysia({
  prefix: '/problem',
  detail: {
    security: [{ bearerAuth: [] }],
    tags: ['problem'],
    description: '需 Bearer JWT（Authorization: Bearer <token>）。',
  },
})
  .use(authGuard)
  .model({
    listQuery: problemListQuery,
    paginatedResponse: problemPaginatedResponse,
    detailParams: problemDetailParams,
    detailResponse: problemDetailResponse,
    apiError: problemApiError,
  })
  .prefix('model', 'problem')
  .get('/list', ({ query }) => ProblemService.list(query), {
    query: problemListQuery,
    response: {
      200: problemPaginatedResponse,
      503: problemApiError,
    },
    detail: {
      summary: '题目列表（分页）',
      description:
        'page / pageSize 由服务端截断；q 非空时使用 Meilisearch 全文检索并默认按相关性排序；可选 order: qualities-desc | qualities-asc | difficulties-desc | difficulties-asc。',
    },
  })
  .get('/:id', ({ params }) => ProblemService.getById(params.id), {
    params: problemDetailParams,
    response: {
      200: problemDetailResponse,
      404: problemApiError,
    },
    detail: {
      summary: '题目详情',
      description: '仅详情接口返回清洗后的 statementHtml；data.sources 包含该题的 XSY 来源。',
    },
  })
