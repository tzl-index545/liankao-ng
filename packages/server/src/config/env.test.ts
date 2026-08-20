import { describe, expect, it } from "bun:test";
import { readServerEnv } from "./env";

describe("readServerEnv", () => {
  it("normalizes configured server env values", () => {
    expect(
      readServerEnv({
        JWT_SECRET: "secret",
        DATABASE_URL: "file:dev.db",
        PORT: "4000",
        HOST: "127.0.0.1",
        ADMIN_NICKNAMES: " alice, ,bob ",
        XSY_FETCHER_URL: "http://127.0.0.1:9000///",
        XSY_FETCHER_TOKEN: "fetcher-token",
        XSY_FETCHER_TIMEOUT_MS: "2500",
        MEILI_HOST: "http://127.0.0.1:7701///",
        MEILI_API_KEY: "meili-key",
      }),
    ).toEqual({
      jwtSecret: "secret",
      databaseUrl: "file:dev.db",
      port: 4000,
      host: "127.0.0.1",
      adminNicknames: ["alice", "bob"],
      xsyFetcherUrl: "http://127.0.0.1:9000",
      xsyFetcherToken: "fetcher-token",
      xsyFetcherTimeoutMs: 2500,
      meiliHost: "http://127.0.0.1:7701",
      meiliApiKey: "meili-key",
    });
  });

  it("keeps existing defaults for optional server env values", () => {
    expect(
      readServerEnv({
        JWT_SECRET: "secret",
        DATABASE_URL: "file:dev.db",
      }),
    ).toMatchObject({
      port: 3000,
      host: "0.0.0.0",
      adminNicknames: [],
      xsyFetcherUrl: undefined,
      xsyFetcherToken: undefined,
      xsyFetcherTimeoutMs: 10000,
      meiliHost: "http://127.0.0.1:7700",
      meiliApiKey: undefined,
    });
  });

  it("fails fast when required server env values are missing", () => {
    expect(() =>
      readServerEnv({
        DATABASE_URL: "file:dev.db",
      }),
    ).toThrow("JWT_SECRET is required");

    expect(() =>
      readServerEnv({
        JWT_SECRET: "secret",
      }),
    ).toThrow("DATABASE_URL is required");
  });
});
