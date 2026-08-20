import { t } from 'elysia'

export const yuantijiSearchBody = t.Object({
  statement: t.String({ minLength: 1, maxLength: 100000 }),
})

export const yuantijiMatch = t.Object({
  id: t.Number(),
  name: t.String(),
  description: t.String(),
  similarity: t.Number({ minimum: 0, maximum: 1 }),
})

export const yuantijiSearchResponse = t.Object({
  success: t.Literal(true),
  data: t.Object({
    simplifiedStatement: t.String(),
    indexedCount: t.Number(),
    matches: t.Array(yuantijiMatch),
  }),
})

export const yuantijiApiError = t.Object({
  success: t.Literal(false),
  message: t.String(),
})

export type YuantijiSearchBody = typeof yuantijiSearchBody.static
