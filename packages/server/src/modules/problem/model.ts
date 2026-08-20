import { t } from 'elysia'

export const problemListQuery = t.Object({
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Number({ minimum: 1, maximum:100 ,default: 20 })),
  q: t.Optional(t.String({ maxLength: 200 })),
  order: t.Optional(t.Union([
    t.Literal('asc'),
    t.Literal('desc'),
    t.Literal('qualities-desc'),
    t.Literal('qualities-asc'),
    t.Literal('difficulties-desc'),
    t.Literal('difficulties-asc'),
  ]))
})

export const problemListItem = t.Object({
  id: t.Number(),
  difficulties: t.Nullable(t.Number()),
  qualities: t.Nullable(t.Number()),
  name: t.String(),
  description: t.String(),
})

export const problemPaginatedData = t.Object({
  items: t.Array(problemListItem),
  total: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
  totalPages: t.Number(),
})

export const problemPaginatedResponse = t.Object({
  success: t.Literal(true),
  data: problemPaginatedData,
})

export const problemDetailParams = t.Object({
  id: t.Number({ minimum: 1 }),
})

export const problemDetailData = t.Object({
  id: t.Number(),
  difficulties: t.Nullable(t.Number()),
  qualities: t.Nullable(t.Number()),
  name: t.String(),
  description: t.String(),
  statementHtml: t.Nullable(t.String()),
  statementFetchedAt: t.Nullable(t.Date()),
  contestIds: t.Array(t.Number()),
  sources: t.Array(t.Object({
    contestId: t.Number(),
    sourcePid: t.Nullable(t.Number()),
    sourceUrl: t.Nullable(t.String()),
  })),
})

export const problemDetailResponse = t.Object({
  success: t.Literal(true),
  data: problemDetailData,
})

export const problemApiError = t.Object({
  success: t.Literal(false),
  message: t.String(),
})

export type ProblemListQuery = typeof problemListQuery.static
