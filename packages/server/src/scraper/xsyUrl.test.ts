import { describe, expect, it } from "bun:test";
import {
  buildXsyContestUrl,
  buildXsyProblemUrl,
  parseXsyPageUrl,
  resolveXsyProblemUrl,
} from "./xsyUrl";

describe("XSY URL policy", () => {
  it("builds and accepts supported contest and problem URLs", () => {
    expect(buildXsyContestUrl(2446)).toBe(
      "http://xsy.gdgzez.com.cn/JudgeOnline/contest.php?cid=2446",
    );
    expect(buildXsyProblemUrl(2446, 0)).toBe(
      "http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=0",
    );
    expect(parseXsyPageUrl(buildXsyProblemUrl(2446, 0)).kind).toBe("problem");
    expect(
      parseXsyPageUrl(
        "http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?pid=0&cid=2446",
      ).kind,
    ).toBe("problem");
  });

  it("resolves relative problem links without assuming their order", () => {
    expect(resolveXsyProblemUrl("problem.php?cid=2446&pid=3", 2446)).toEqual({
      url: "http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=3",
      problemIndex: 3,
    });
  });

  it("rejects URLs that could receive the session cookie unexpectedly", () => {
    const invalidUrls = [
      "https://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=0",
      "http://xsy.gdgzez.com.cn.evil.test/JudgeOnline/problem.php?cid=2446&pid=0",
      "http://xsy.gdgzez.com.cn:8080/JudgeOnline/problem.php?cid=2446&pid=0",
      "http://user@xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=0",
      "http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=0&next=x",
      "http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=-1",
      "http://xsy.gdgzez.com.cn/JudgeOnline/other.php?cid=2446",
    ];

    for (const url of invalidUrls) {
      expect(() => parseXsyPageUrl(url)).toThrow();
    }
  });

  it("rejects a problem link for another contest", () => {
    expect(() =>
      resolveXsyProblemUrl("problem.php?cid=1&pid=0", 2446),
    ).toThrow("another contest");
  });
});
