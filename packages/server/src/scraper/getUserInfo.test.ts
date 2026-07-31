import { describe, expect, it } from "bun:test";
import { parseUserProfile } from "./getUserInfo";

describe("parseUserProfile", () => {
  it("extracts the XSY username and real name", () => {
    const html = `
      <div id="wrapper">
        <div class="form-container">
          <form>
            <div></div><div></div><div></div>
            <div><p>alice</p></div>
            <div><p></p><p></p><p>Alice Zhang</p></div>
          </form>
        </div>
      </div>
    `;

    expect(parseUserProfile(html)).toEqual({
      xsyusername: "alice",
      realname: "Alice Zhang",
    });
  });

  it("rejects pages that do not contain a user profile", () => {
    expect(() => parseUserProfile("<p>Please Login first!</p>")).toThrow(
      "Failed to get name",
    );
  });
});
