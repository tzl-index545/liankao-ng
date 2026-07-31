import * as cheerio from "cheerio";
import { resolveXsyProblemUrl } from "./xsyUrl";

export type ParsedContestProblem = {
  name: string;
  order: number;
  point: number;
  sourcePid: number;
  sourceUrl: string;
};

export type ParsedContestPage = {
  id: number;
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  problems: ParsedContestProblem[];
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseXsyDate(value: string, field: string): Date {
  const normalized = value.trim().replace(" ", "T");
  const date = new Date(`${normalized}+08:00`);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`XSY contest has an invalid ${field}`);
  }
  return date;
}

function isLoginPage($: cheerio.CheerioAPI): boolean {
  return /Please\s+Login\s+first/i.test(normalizeText($("body").text()));
}

function readContestDescription($: cheerio.CheerioAPI): string {
  const selectors = [
    "#contest-description",
    ".contest-description",
    ".jumbotron > center > div > p",
  ];
  for (const selector of selectors) {
    const text = normalizeText($(selector).first().text());
    if (text) return text;
  }
  return "";
}

export function parseXsyContestPage(
  htmlDocument: string,
  contestId: number,
): ParsedContestPage {
  const $ = cheerio.load(htmlDocument);
  if (isLoginPage($)) throw new Error("XSY session is invalid or expired");

  const rawName = normalizeText(
    $("#main > center > div > font:nth-child(1)").first().text() ||
      $(".jumbotron h2").first().text() ||
      $("#main h2").first().text(),
  );
  const name = rawName.split("-").pop()?.trim() || rawName;
  if (!name) throw new Error("XSY contest page does not contain a title");

  const startTimeText = normalizeText(
    $('font[size="4px"] > font[color="#993399"]').eq(0).text(),
  );
  const endTimeText = normalizeText(
    $('font[size="4px"] > font[color="#993399"]').eq(1).text(),
  );

  const problems: ParsedContestProblem[] = [];
  $("#problemset > tbody > tr").each((_, row) => {
    const link = $(row).find('a[href*="problem.php"]').first();
    const href = link.attr("href");
    const problemName = normalizeText(link.text());
    if (!href || !problemName) return;

    const source = resolveXsyProblemUrl(href, contestId);
    const pointText = $(row).find("[data-point], .problem-point").first().text();
    const parsedPoint = Number.parseInt(normalizeText(pointText), 10);
    problems.push({
      name: problemName,
      order: problems.length + 1,
      point: Number.isInteger(parsedPoint) && parsedPoint > 0 ? parsedPoint : 100,
      sourcePid: source.problemIndex,
      sourceUrl: source.url,
    });
  });

  if (problems.length === 0) {
    throw new Error(`Contest ${contestId} has no crawlable problems`);
  }
  if (new Set(problems.map((problem) => problem.sourcePid)).size !== problems.length) {
    throw new Error(`Contest ${contestId} contains duplicate problem links`);
  }

  return {
    id: contestId,
    name,
    description: readContestDescription($),
    startTime: parseXsyDate(startTimeText, "start time"),
    endTime: parseXsyDate(endTimeText, "end time"),
    problems,
  };
}
