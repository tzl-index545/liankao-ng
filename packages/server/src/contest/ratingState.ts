import { Prisma } from '../generated/prisma/client';
import { prisma } from '../prisma';

export const INITIAL_RATING = 1500;

export function isRatedContest(type: number): boolean {
  return type % 2 === 1;
}

// Restore the state immediately before the requested contest. Only the latest
// settled participation per user leaves the database; no old contest is rerun.
export async function loadPreviousRatings(contestId: number, userIds?: number[]): Promise<Map<number, number>> {
  if (userIds?.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{ userId: number; rating: number }>>`
    WITH previous AS (
      SELECT p."userId", p."postContestRating" AS rating,
        ROW_NUMBER() OVER (
          PARTITION BY p."userId" ORDER BY c."endTime" DESC, c."id" DESC
        ) AS position
      FROM "Participation" p
      JOIN "Contest" c ON c."id" = p."contestId"
      JOIN "Contest" start ON start."id" = ${contestId}
      WHERE (c."endTime" < start."endTime"
        OR (c."endTime" = start."endTime" AND c."id" < start."id"))
        AND c."type" % 2 = 1
        ${userIds ? Prisma.sql`AND p."userId" IN (${Prisma.join(userIds)})` : Prisma.empty}
        AND p."totalScore" != 0
        AND p."postContestRating" IS NOT NULL
    )
    SELECT "userId", rating FROM previous WHERE position = 1
  `;
  return new Map(rows.map((row) => [row.userId, row.rating]));
}

