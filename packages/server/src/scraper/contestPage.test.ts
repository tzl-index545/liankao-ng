import { describe, expect, it } from "bun:test";
import { parseXsyContestPage } from "./contestPage";

describe("parseXsyContestPage", () => {
  it("keeps the actual upstream pid and URL for each problem", () => {
    const html = `
      <html><body><div id="main"><center><div>
        <font>Contest2446 - 联考测试</font>
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

    const result = parseXsyContestPage(html, 2446);

    expect(result.name).toBe("联考测试");
    expect(result.problems.map((problem) => problem.sourcePid)).toEqual([3, 7]);
    expect(result.problems[0].sourceUrl).toBe(
      "http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=3",
    );
  });

  it("rejects a login page instead of importing it", () => {
    expect(() =>
      parseXsyContestPage("<p>Please Login first!</p>", 2446),
    ).toThrow("session is invalid");
  });
});
