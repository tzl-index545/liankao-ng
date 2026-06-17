import { Elysia } from 'elysia'
import {
  userListQuery,
  userPaginatedResponse,
  userDetailParams,
  userDetailResponse,
  userParticipationsResponse,
  userRatingHistoryResponse,
  userRatingChangesResponse,
  userApiError
} from './model'
import { UserService } from './service'

export const user = new Elysia({
  prefix: '/user',
  detail: {
    tags: ['user']
  }
})
  .model({
    listQuery: userListQuery,
    paginatedResponse: userPaginatedResponse,
    detailParams: userDetailParams,
    detailResponse: userDetailResponse,
    participationsResponse: userParticipationsResponse,
    ratingHistoryResponse: userRatingHistoryResponse,
    ratingChangesResponse: userRatingChangesResponse,
    apiError: userApiError
  })
  .prefix('model', 'user')
  .get('/list', ({ query }) => UserService.list(query), {
    query: userListQuery,
    response: { 200: userPaginatedResponse },
    detail: {
      summary: '用户列表（分页）',
      description: '获取用户列表，支持分页和排序。可选 order: rating-desc | rating-asc | asc | desc，默认按 id 降序。'
    }
  })
  .get('/:id', ({ params }) => UserService.getById(params.id), {
    params: userDetailParams,
    response: {
      200: userDetailResponse,
      404: userApiError
    },
    detail: {
      summary: '用户详情',
      description: '根据用户ID获取用户详情'
    }
  })
  .get('/:id/participations', ({ params }) => UserService.getParticipations(params.id), {
    params: userDetailParams,
    response: { 200: userParticipationsResponse },
    detail: {
      summary: '用户参赛记录',
      description: '获取用户的参赛记录'
    }
  })
  .get('/:id/ratingHistory', ({ params }) => UserService.getRatingHistory(params.id), {
    params: userDetailParams,
    response: { 200: userRatingHistoryResponse },
    detail: {
      summary: '用户等级分历史',
      description: '从参赛记录获取用户等级分历史'
    }
  })
  .get('/:id/ratingUserChanges', ({ params }) => UserService.getRatingChanges(params.id), {
    params: userDetailParams,
    response: { 200: userRatingChangesResponse },
    detail: {
      summary: '用户等级分变更记录',
      description: '获取用户的等级分变更记录'
    }
  })
