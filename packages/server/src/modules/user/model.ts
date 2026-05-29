
import { t } from 'elysia'

export const userListQuery = t.Object({
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
  order: t.Optional(t.Union([
    t.Literal('asc'),
    t.Literal('desc'),
    t.Literal('rating-desc'),
    t.Literal('rating-asc'),
  ]))
})

export const userListItem = t.Object({
  id: t.Number(),
  nickname: t.String(),
  xsyusername: t.String(),
  rating: t.Number(),
  realname: t.String()
})

export const userPaginatedData = t.Object({
  items: t.Array(userListItem),
  total: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
  totalPages: t.Number()
})

export const userPaginatedResponse = t.Object({
  success: t.Literal(true),
  data: userPaginatedData
})

export const userDetailParams = t.Object({
  id: t.Number({ minimum: 1 })
})

export const userDetailData = t.Object({
  id: t.Number(),
  nickname: t.String(),
  xsyusername: t.String(),
  rating: t.Number(),
  realname: t.String()
})

export const userDetailResponse = t.Object({
  success: t.Literal(true),
  data: userDetailData
})

export const userApiError = t.Object({
  success: t.Literal(false),
  message: t.String()
})

export const userParticipationItem = t.Object({
  id: t.Number(),
  userId: t.Number(),
  contestId: t.Number(),
  totalScore: t.Number(),
  rank: t.Number(),
  postContestRating: t.Union([t.Number(), t.Null()])
})

export const userParticipationsResponse = t.Object({
  success: t.Literal(true),
  data: t.Array(userParticipationItem)
})

export const userRatingChangeItem = t.Object({
  id: t.Number(),
  batchId: t.Number(),
  contestId: t.Number(),
  userId: t.Number(),
  beforeRating: t.Number(),
  afterRating: t.Number()
})

export const userRatingChangesResponse = t.Object({
  success: t.Literal(true),
  data: t.Array(userRatingChangeItem)
})

export type UserListQuery = typeof userListQuery.static
