import { t } from 'elysia'

/** 列表查询：分页区间由服务端在 parsePagination 中截断 */
export const contestListQuery = t.Object({
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Number({ minimum: 1, maximum:100,default: 20 })),
  order: t.Optional(t.Union([
    t.Literal('asc'),
    t.Literal('desc'),
    t.Literal('qualities-desc'),
    t.Literal('qualities-asc'),
  ]))
})

export const contestListItem = t.Object({
  id: t.Number(),
  name: t.String(),
  description: t.String(),
  startTime: t.Date(),
  endTime: t.Date(),
  qualities: t.Nullable(t.Number()),
  type: t.Nullable(t.String()),
})

export const contestPaginatedData = t.Object({
  items: t.Array(contestListItem),
  total: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
  totalPages: t.Number(),
})

export const contestPaginatedResponse = t.Object({
  success: t.Literal(true),
  data: contestPaginatedData,
})

export const contestDetailParams = t.Object({
  id: t.Number({ minimum: 1 }),
})

export const contestEntity = t.Object({
  id: t.Number(),
  name: t.String(),
  description: t.String(),
  startTime: t.Date(),
  endTime: t.Date(),
  qualities: t.Nullable(t.Number()),
  type: t.Nullable(t.String()),
})

export const contestDetailResponse = t.Object({
  success: t.Literal(true),
  data: contestEntity,
})

export const contestProblemItem = t.Object({
  id: t.Number(),
  name: t.String(),
  description: t.String(),
  qualities: t.Nullable(t.Number()),
  point: t.Number(),
  order: t.Number(),
})

export const contestProblemsResponse = t.Object({
  success: t.Literal(true),
  data: t.Array(contestProblemItem),
})

export const contestRanklistUser = t.Object({
  id: t.Number(),
  nickname: t.String(),
  realname: t.String(),
  xsyusername: t.String(),
})

export const contestRanklistItem = t.Object({
  id: t.Number(),
  userId: t.Number(),
  contestId: t.Number(),
  rank: t.Number(),
  totalScore: t.Number(),
  preContestRating: t.Nullable(t.Number()),
  postContestRating: t.Nullable(t.Number()),
  scores: t.Record(t.String(), t.Number()),
  user: contestRanklistUser,
})

export const contestRanklistResponse = t.Object({
  success: t.Literal(true),
  data: t.Array(contestRanklistItem),
})

export const contestApiError = t.Object({
  success: t.Literal(false),
  message: t.String(),
})

export type ContestListQuery = typeof contestListQuery.static
