import { load, type CheerioAPI } from "cheerio";
import { prisma } from "../prisma";
import { fetchHtml } from "../scraper/fetch";
import { registerGhostUser } from "../modules/auth/registerUser"


type ContestProblemRow = {
  problemId: number;
  order: number;
  problem: {
    name: string;
  };
};

type ParsedStandingRow = {
  username: string;
  realname: string;
  scores: Record<string, number>;
  totalScore: number;
  rank: number;
};

function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeHeader(input: string): string {
  return input
    .replace(/\s+/g, "")
    .replace(/\u3000/g, "")
    .toLowerCase()
    .trim();
}

function parseScore(raw: string): number {
  const t = normalizeText(raw);

  if (!t || t === "-" || t === "—" || t === "–" || t.toLowerCase() === "n/a") {
    return 0;
  }

  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : 0;
}

function getCellText($: CheerioAPI, row: any, index: number): string {
  return normalizeText($(row).find("td").eq(index).text());
}

function buildProblemColumnMap(
  $: CheerioAPI,
  contestProblems: ContestProblemRow[]
): number[] {
  const headerCells = $("table thead tr")
    .last()
    .find("th,td")
    .map((_, el) => normalizeHeader($(el).text()))
    .get();

  if (headerCells.length === 0) {
    // 没有表头就按默认顺序：第 1 列 rank，第 2 列 username，第 3 列 realname，后面依次是题目
    return contestProblems.map((_, i) => 4 + i);
  }

  return contestProblems.map((cp, idx) => {
    const target = normalizeHeader(cp.problem.name);

    let found = headerCells.findIndex((h, colIdx) => colIdx >= 4 && h === target);
    if (found >= 0) return found;

    found = headerCells.findIndex(
      (h, colIdx) => colIdx >= 4 && (h.includes(target) || target.includes(h))
    );
    if (found >= 0) return found;

    return 4 + idx;
  });
}

function extractStandingRows(
  $: CheerioAPI,
  contestProblems: ContestProblemRow[]
): Omit<ParsedStandingRow, "rank">[] {
  const columnMap = buildProblemColumnMap($, contestProblems);
  const rows = $("body > table > tbody > tr").toArray();

  const byUsername = new Map<
    string,
    Omit<ParsedStandingRow, "rank">
  >();

  for (const row of rows) {
    const cells = $(row).find("td");
    if (cells.length < 3) continue;

    const username = getCellText($, row, 1);
    const realname = getCellText($, row, 2) || username;

    if (!username) continue;

    const scores: Record<string, number> = {};
    let totalScore = 0;

    for (let i = 0; i < contestProblems.length; i++) {
      const cp = contestProblems[i];
      const colIndex = columnMap[i];
      const score = parseScore(cells.eq(colIndex).text());

      scores[String(cp.problemId)] = score;
      totalScore += score;
    }

    const prev = byUsername.get(username);
    if (!prev || totalScore > prev.totalScore) {
      byUsername.set(username, { username, realname, scores, totalScore });
    }
  }

  return [...byUsername.values()];
}

function assignRanks(rows: Omit<ParsedStandingRow, "rank">[]): ParsedStandingRow[] {
  const sorted = [...rows].sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      a.username.localeCompare(b.username, "zh-Hans-CN")
  );

  let lastScore: number | null = null;
  let lastRank = 0;

  return sorted.map((row, index) => {
    const rank = lastScore === row.totalScore ? lastRank : index + 1;
    lastScore = row.totalScore;
    lastRank = rank;
    return { ...row, rank };
  });
}

async function upsertStanding(
  userId: number,
  contestId: number,
  row: ParsedStandingRow
) {

  await prisma.$transaction(async (tx) => {
    await tx.participation.upsert({
      where: {
        userId_contestId: {
          userId,
          contestId,
        },
      },
      create: {
        userId,
        contestId,
        totalScore: row.totalScore,
        rank: row.rank,
        scores: row.scores,
      },
      update: {
        totalScore: row.totalScore,
        rank: row.rank,
        scores: row.scores,
      },
    });
  });
}

export async function syncLeaderboardFromHtml(
  htmlDocument: string,
  contestId: number
) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      problems: {
        include: { problem: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!contest) throw new Error("Contest do not Exist!");

  const $ = load(htmlDocument);
  const rawRows = extractStandingRows($, contest.problems as ContestProblemRow[]);
  const standings = assignRanks(rawRows);

  for (const row of standings) {
    const user = await registerGhostUser(row.username, row.realname);
    await upsertStanding(user.id, contestId, row);
  }

  return standings;
}

export async function syncLeaderboardByToken(
  phpSessionId: string,
    contestId: number
) {
  const url="http://xsy.gdgzez.com.cn/JudgeOnline/contestrank.xls.php?cid="+contestId;
  const htmlDocument = await fetchHtml(url, phpSessionId);
  // console.log(htmlDocument);
  if (!htmlDocument) throw("Failed to sync!");

  return syncLeaderboardFromHtml(htmlDocument, contestId);
}