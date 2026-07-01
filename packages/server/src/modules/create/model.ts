import { t } from 'elysia'

const contestIdPackage = t.Object({
  contestId: t.Number({ minimum: 1 }),
})

const crawlContestPackage = t.Object({
  contestId: t.Number({ minimum: 1 }),
  phpSessionId: t.String({
    minLength: 1,
    maxLength: 128,
    pattern: '^[-,a-zA-Z0-9]{1,128}$',
  }),
})

export const createContestBody = t.Object({
  package: crawlContestPackage,
})

export const crawlContestBody = t.Object({
  package: crawlContestPackage,
})

export const calculateRatingBody = t.Object({
  package: contestIdPackage,
})

export const toggleContestRatedBody = t.Object({
  package: contestIdPackage,
})

export const createContestSuccessResponse = t.Object({
  success: t.Literal(true),
  message: t.String(),
})

export const createContestErrorResponse = t.Object({
  success: t.Literal(false),
  message: t.String(),
})

export const toggleContestRatedResponse = t.Object({
  success: t.Boolean(),
})

export type CreateContestBody = typeof createContestBody.static
