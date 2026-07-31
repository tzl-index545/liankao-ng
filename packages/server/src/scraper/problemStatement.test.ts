import { describe, expect, it } from "bun:test";
import { parseXsyProblemStatement } from "./problemStatement";
import { buildXsyProblemUrl } from "./xsyUrl";

const sourceUrl = buildXsyProblemUrl(2446, 0);

describe("parseXsyProblemStatement", () => {
  it("extracts, sanitizes and rewrites a HUSTOJ statement", () => {
    const html = `
      <html><body>
        <div id="description">
          <p onclick="steal()">求两个数之和。</p>
          <img src="upload/problem/image.png" onerror="steal()">
          <script>steal()</script>
        </div>
        <div id="input"><p>两个整数。</p></div>
        <div id="output"><a href="javascript:steal()">答案</a></div>
        <pre id="sinput"><span>1 2</span></pre>
        <pre id="soutput"><span>3</span></pre>
      </body></html>
    `;

    const result = parseXsyProblemStatement(html, sourceUrl);

    expect(result.description).toBe("求两个数之和。");
    expect(result.statementHtml).toContain("题目描述");
    expect(result.statementHtml).toContain("样例输入");
    expect(result.statementHtml).toContain(
      'src="http://xsy.gdgzez.com.cn/JudgeOnline/upload/problem/image.png"',
    );
    expect(result.statementHtml).not.toContain("script");
    expect(result.statementHtml).not.toContain("onclick");
    expect(result.statementHtml).not.toContain("javascript:");
  });

  it("rejects an expired-session login page", () => {
    expect(() =>
      parseXsyProblemStatement(
        '<html><body><a href="loginpage.php">Please Login first!</a></body></html>',
        sourceUrl,
      ),
    ).toThrow("session is invalid");
  });

  it("rejects an unexpected problem page shape", () => {
    expect(() =>
      parseXsyProblemStatement("<html><body>Not found</body></html>", sourceUrl),
    ).toThrow("does not contain a statement");
  });
});
