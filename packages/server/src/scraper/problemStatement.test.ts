import { describe, expect, it } from "bun:test";
import { parseXsyProblemStatement } from "./problemStatement";
import { buildXsyProblemUrl } from "./xsyUrl";

const sourceUrl = buildXsyProblemUrl(2446, 0);

describe("parseXsyProblemStatement", () => {
  it("parses the Editor.md layout used by XSY contest problems", () => {
    const html = `
      <html><body>
        <div id="test-editormd">
          <textarea id="test-editor" style="display:none">
### 【题目描述】

求 $a+b$ 的值。<img src="upload/p.png" onerror="steal()">

### 【输入格式】

两个整数。

### 【样例输入】

\`\`\`
1 2
\`\`\`
          </textarea>
        </div>
        <h2>HINT</h2>
        <div>
          <p><a class="ke-insertfile" href="/JudgeOnline/upload/sample.zip" target="_blank"><span style="font-size:24px">样例下载</span></a></p>
        </div>
        <center><a href="submitpage.php?cid=2446&pid=0">Submit</a></center>
      </body></html>
    `;

    const result = parseXsyProblemStatement(html, sourceUrl);

    expect(result.description).toBe("求 $a+b$ 的值。");
    expect(result.statementHtml).toContain("【题目描述】");
    expect(result.statementHtml).toContain("statement-format-v2");
    expect(result.statementHtml).toContain("<pre><code>");
    expect(result.statementHtml).toContain(
      'src="http://xsy.gdgzez.com.cn/JudgeOnline/upload/p.png"',
    );
    expect(result.statementHtml).toContain("提示");
    expect(result.statementHtml).toContain("样例下载");
    expect(result.statementHtml).toContain(
      'href="http://xsy.gdgzez.com.cn/JudgeOnline/upload/sample.zip"',
    );
    expect(result.statementHtml).not.toContain("Submit");
    expect(result.statementHtml).not.toContain("onerror");
  });

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
    expect(result.statementHtml).toContain("statement-format-v2");
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
