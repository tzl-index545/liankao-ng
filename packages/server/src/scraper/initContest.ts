import { prisma } from "../prisma";
import { parseXsyContestPage, type ParsedContestPage } from "./contestPage";
import { fetchHtml } from "./fetch";
import {
  parseXsyProblemStatement,
  type ParsedProblemStatement,
} from "./problemStatement";
import {
  fetchLeaderboardByToken,
  parseLeaderboardFromHtml,
  type ContestProblemRow,
} from "./updateLeaderboard";
import { buildXsyContestUrl } from "./xsyUrl";

const STATEMENT_FETCH_CONCURRENCY = 4;

type ScrapedProblem = ParsedContestPage["problems"][number] &
  ParsedProblemStatement;

type ScrapedContestBundle = Omit<ParsedContestPage, "problems"> & {
  problems: ScrapedProblem[];
};

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export async function scrapeContestBundle(
  phpSessionId: string,
  contestId: number,
): Promise<ScrapedContestBundle> {
  const contestHtml = await fetchHtml(buildXsyContestUrl(contestId), phpSessionId);
  const contest = parseXsyContestPage(contestHtml, contestId);
  const problems = await mapWithConcurrency(
    contest.problems,
    STATEMENT_FETCH_CONCURRENCY,
    async (problem) => {
      const problemHtml = await fetchHtml(problem.sourceUrl, phpSessionId);
      return {
        ...problem,
        ...parseXsyProblemStatement(problemHtml, problem.sourceUrl),
      };
    },
  );

  return { ...contest, problems };
}

export async function persistContestBundle(
  bundle: ScrapedContestBundle,
  leaderboardHtml: string,
) {
  const fetchedAt = new Date();
  const standings = parseLeaderboardFromHtml(
    leaderboardHtml,
    bundle.problems.map((problem) => ({
      problemId: problem.sourcePid,
      order: problem.order,
      problem: { name: problem.name },
    })) satisfies ContestProblemRow[],
  );

  await prisma.$transaction(async (tx) => {
    const contest = await tx.contest.upsert({
      where: { id: bundle.id },
      create: {
        id: bundle.id,
        name: bundle.name,
        description: bundle.description,
        startTime: bundle.startTime,
        endTime: bundle.endTime,
      },
      update: {
        name: bundle.name,
        description: bundle.description,
        startTime: bundle.startTime,
        endTime: bundle.endTime,
      },
      select: { id: true },
    });

    const existingLinks = await tx.contestProblem.findMany({
      where: { contestId: contest.id },
      select: { problemId: true, sourcePid: true, order: true },
    });
    const sourcePidToProblemId = new Map<number, number>();

    for (const problem of bundle.problems) {
      const existingLink = existingLinks.find(
        (link) =>
          link.sourcePid === problem.sourcePid ||
          (link.sourcePid === null && link.order === problem.order),
      );

      if (existingLink) {
        sourcePidToProblemId.set(problem.sourcePid, existingLink.problemId);
        await tx.problem.update({
          where: { id: existingLink.problemId },
          data: {
            name: problem.name,
            description: problem.description,
            statementHtml: problem.statementHtml,
            statementFetchedAt: fetchedAt,
          },
          select: { id: true },
        });
        await tx.contestProblem.update({
          where: {
            contestId_problemId: {
              contestId: contest.id,
              problemId: existingLink.problemId,
            },
          },
          data: {
            order: problem.order,
            point: problem.point,
            sourcePid: problem.sourcePid,
            sourceUrl: problem.sourceUrl,
          },
          select: { contestId: true },
        });
        continue;
      }

      const createdProblem = await tx.problem.create({
        data: {
          name: problem.name,
          description: problem.description,
          statementHtml: problem.statementHtml,
          statementFetchedAt: fetchedAt,
        },
        select: { id: true },
      });
      sourcePidToProblemId.set(problem.sourcePid, createdProblem.id);
      await tx.contestProblem.create({
        data: {
          contestId: contest.id,
          problemId: createdProblem.id,
          order: problem.order,
          point: problem.point,
          sourcePid: problem.sourcePid,
          sourceUrl: problem.sourceUrl,
        },
        select: { contestId: true },
      });
    }

    for (const standing of standings) {
      const existingUser = await tx.user.findUnique({
        where: { xsyusername: standing.username },
        select: { id: true },
      });
      const user = existingUser ?? (await tx.user.create({
        data: {
          xsyusername: standing.username,
          nickname: standing.username,
          realname: standing.realname,
          rating: 1500,
        },
        select: { id: true },
      }));

      const scores: Record<string, number> = {};
      for (const [sourcePidText, score] of Object.entries(standing.scores)) {
        const problemId = sourcePidToProblemId.get(Number(sourcePidText));
        if (problemId === undefined) {
          throw new Error(`Leaderboard references unknown problem pid ${sourcePidText}`);
        }
        scores[String(problemId)] = score;
      }

      await tx.participation.upsert({
        where: {
          userId_contestId: {
            userId: user.id,
            contestId: contest.id,
          },
        },
        create: {
          userId: user.id,
          contestId: contest.id,
          totalScore: standing.totalScore,
          rank: standing.rank,
          scores,
        },
        update: {
          totalScore: standing.totalScore,
          rank: standing.rank,
          scores,
        },
        select: { id: true },
      });
    }
  });
}

/**
 * Fetches and validates every upstream page before opening the write transaction.
 * Existing contests are refreshed in place so failed imports remain retryable.
 */
export async function syncContestInfo(phpSessionId: string, contestId: number) {
  const [bundle, leaderboardHtml] = await Promise.all([
    scrapeContestBundle(phpSessionId, contestId),
    fetchLeaderboardByToken(phpSessionId, contestId),
  ]);

  await persistContestBundle(bundle, leaderboardHtml);
}
