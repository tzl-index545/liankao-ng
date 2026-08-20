import { Elysia } from 'elysia'
import { authGuard } from '../../plugins/auth-guard'
import {
  yuantijiApiError,
  yuantijiSearchBody,
  yuantijiSearchResponse,
} from './model'
import { YuantijiService } from './service'

export const yuantiji = new Elysia({
  prefix: '/yuantiji',
  detail: {
    security: [{ bearerAuth: [] }],
    tags: ['yuantiji'],
    description: '需 Bearer JWT（Authorization: Bearer <token>）。',
  },
})
  .use(authGuard)
  .model({
    searchBody: yuantijiSearchBody,
    searchResponse: yuantijiSearchResponse,
    apiError: yuantijiApiError,
  })
  .prefix('model', 'yuantiji')
  .post('/search', ({ body }) => YuantijiService.search(body), {
    body: yuantijiSearchBody,
    response: {
      200: yuantijiSearchResponse,
      400: yuantijiApiError,
      503: yuantijiApiError,
    },
    detail: {
      summary: '原题机语义匹配',
      description: '简化输入题意、生成 embedding，并返回余弦相似度最高的十道题。',
    },
  })
