const XSY_ORIGIN = "http://xsy.gdgzez.com.cn";

type XsyPageKind = "profile" | "contest" | "leaderboard" | "problem";

const PAGE_PATHS: Record<XsyPageKind, string> = {
  profile: "/JudgeOnline/modifypage.php",
  contest: "/JudgeOnline/contest.php",
  leaderboard: "/JudgeOnline/contestrank.xls.php",
  problem: "/JudgeOnline/problem.php",
};

function isPositiveInteger(value: string | null): boolean {
  if (value === null || !/^\d+$/.test(value)) return false;
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function isNonNegativeInteger(value: string | null): boolean {
  if (value === null || !/^\d+$/.test(value)) return false;
  return Number.isSafeInteger(Number(value)) && Number(value) >= 0;
}

function assertExactSearchParams(url: URL, expectedNames: string[]) {
  const names = [...url.searchParams.keys()];
  if (
    names.length !== expectedNames.length ||
    new Set(names).size !== names.length ||
    expectedNames.some((name) => !names.includes(name))
  ) {
    throw new Error("invalid XSY URL query parameters");
  }
}

export function parseXsyPageUrl(rawUrl: string): {
  url: URL;
  kind: XsyPageKind;
} {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("invalid XSY URL");
  }

  if (
    url.origin !== XSY_ORIGIN ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error("XSY URL origin is not allowed");
  }

  const kind = (Object.entries(PAGE_PATHS) as [XsyPageKind, string][]).find(
    ([, path]) => path === url.pathname,
  )?.[0];
  if (!kind) throw new Error("XSY URL path is not allowed");

  if (kind === "profile") {
    assertExactSearchParams(url, []);
    return { url, kind };
  }

  if (kind === "problem") {
    assertExactSearchParams(url, ["cid", "pid"]);
    if (
      !isPositiveInteger(url.searchParams.get("cid")) ||
      !isNonNegativeInteger(url.searchParams.get("pid"))
    ) {
      throw new Error("invalid XSY problem identifiers");
    }
    return { url, kind };
  }

  assertExactSearchParams(url, ["cid"]);
  if (!isPositiveInteger(url.searchParams.get("cid"))) {
    throw new Error("invalid XSY contest identifier");
  }

  return { url, kind };
}

function buildUrl(kind: XsyPageKind, params?: Record<string, number>): string {
  const url = new URL(PAGE_PATHS[kind], XSY_ORIGIN);
  for (const [name, value] of Object.entries(params ?? {})) {
    url.searchParams.set(name, String(value));
  }
  return url.toString();
}

export const buildXsyProfileUrl = () => buildUrl("profile");
export const buildXsyContestUrl = (contestId: number) =>
  buildUrl("contest", { cid: contestId });
export const buildXsyLeaderboardUrl = (contestId: number) =>
  buildUrl("leaderboard", { cid: contestId });
export const buildXsyProblemUrl = (contestId: number, problemIndex: number) =>
  buildUrl("problem", { cid: contestId, pid: problemIndex });

export function resolveXsyProblemUrl(rawHref: string, contestId: number): {
  url: string;
  problemIndex: number;
} {
  const resolved = new URL(rawHref, buildXsyContestUrl(contestId));
  const parsed = parseXsyPageUrl(resolved.toString());
  if (parsed.kind !== "problem") throw new Error("contest problem link is invalid");

  const linkedContestId = Number(parsed.url.searchParams.get("cid"));
  if (linkedContestId !== contestId) {
    throw new Error("contest problem link points to another contest");
  }

  return {
    url: parsed.url.toString(),
    problemIndex: Number(parsed.url.searchParams.get("pid")),
  };
}
