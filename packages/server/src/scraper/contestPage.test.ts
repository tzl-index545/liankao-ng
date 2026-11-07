import { describe, expect, it } from "bun:test";
import { parseXsyContestPage } from "./contestPage";

function contestHtml(heading = "<font>Contest2446 - 联考测试</font>"): string {
  return `
      <html><body><div id="main"><center><div>
        ${heading}
        <font size="4px">
          <font color="#993399">2026-07-30 08:00:00</font>
          <font color="#993399">2026-07-30 12:00:00</font>
        </font>
      </div>
      <table id="problemset"><tbody>
        <tr><td>A</td><td></td><td><center><a href="problem.php?cid=2446&pid=3">第一题</a></center></td></tr>
        <tr><td>B</td><td></td><td><center><a href="problem.php?cid=2446&pid=7">第二题</a></center></td></tr>
      </tbody></table>
      </center></div></body></html>
    `;
}

describe("parseXsyContestPage", () => {
  it("keeps the actual upstream pid and URL for each problem", () => {
    const result = parseXsyContestPage(contestHtml(), 2446);

    expect(result.name).toBe("联考测试");
    expect(result.problems.map((problem) => problem.sourcePid)).toEqual([3, 7]);
    expect(result.problems[0].sourceUrl).toBe(
      "http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=3",
    );
  });

  it.each([
    ["<font>Contest2446 - 联考 - Day 1</font>", "联考 - Day 1"],
    ["<font>Contest2446 - 2026-11-07 联考-Day-1</font>", "2026-11-07 联考-Day-1"],
    ["<font>Contest2446-联考-Day-1</font>", "联考-Day-1"],
    ["<font>Contest 2446 - 联考-Day-1</font>", "联考-Day-1"],
    ["<font>Contest2446 - 联考-</font>", "联考-"],
    ["<font>联考-Day-1</font>", "联考-Day-1"],
    ['<div class="jumbotron"><h2>联考 - Day 1</h2></div>', "联考 - Day 1"],
    ["<h2>Contest2446 - 联考-Day-1</h2>", "联考-Day-1"],
  ])("preserves the full contest name in %s", (heading, expectedName) => {
    expect(parseXsyContestPage(contestHtml(heading), 2446).name).toBe(expectedName);
  });

  it("rejects a heading containing only the contest prefix", () => {
    expect(() =>
      parseXsyContestPage(contestHtml("<font>Contest2446 - </font>"), 2446),
    ).toThrow("does not contain a title");
  });

  it("rejects a login page instead of importing it", () => {
    expect(() =>
      parseXsyContestPage("<p>Please Login first!</p>", 2446),
    ).toThrow("session is invalid");
  });
});
