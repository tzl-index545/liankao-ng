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
        YUANTIJI_CHAT_ENDPOINT: " https://chat.example/v1/chat/completions ",
        YUANTIJI_CHAT_API_KEY: " chat-key ",
        YUANTIJI_CHAT_MODEL: " chat-model ",
        YUANTIJI_EMBEDDING_ENDPOINT: " https://embedding.example/v1/embeddings ",
        YUANTIJI_EMBEDDING_API_KEY: " embedding-key ",
        YUANTIJI_EMBEDDING_MODEL: " embedding-model ",
        YUANTIJI_TIMEOUT_MS: "60000",
        YUANTIJI_INDEX_CONCURRENCY: "12",
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
      yuantijiChatEndpoint: "https://chat.example/v1/chat/completions",
      yuantijiChatApiKey: "chat-key",
      yuantijiChatModel: "chat-model",
      yuantijiEmbeddingEndpoint: "https://embedding.example/v1/embeddings",
      yuantijiEmbeddingApiKey: "embedding-key",
      yuantijiEmbeddingModel: "embedding-model",
      yuantijiTimeoutMs: 60000,
      yuantijiIndexConcurrency: 12,
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
      yuantijiChatEndpoint: undefined,
      yuantijiChatApiKey: undefined,
      yuantijiChatModel: undefined,
      yuantijiEmbeddingEndpoint: undefined,
      yuantijiEmbeddingApiKey: undefined,
      yuantijiEmbeddingModel: undefined,
      yuantijiTimeoutMs: 120000,
      yuantijiIndexConcurrency: 8,
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

  it("rejects an invalid yuantiji timeout", () => {
    expect(() => readServerEnv({
      JWT_SECRET: "secret",
      DATABASE_URL: "file:dev.db",
      YUANTIJI_TIMEOUT_MS: "0",
    })).toThrow("YUANTIJI_TIMEOUT_MS must be a positive number");
  });

  it("rejects an invalid yuantiji index concurrency", () => {
    for (const value of ["0", "33", "1.5", "invalid"]) {
      expect(() => readServerEnv({
        JWT_SECRET: "secret",
        DATABASE_URL: "file:dev.db",
        YUANTIJI_INDEX_CONCURRENCY: value,
      })).toThrow("YUANTIJI_INDEX_CONCURRENCY must be an integer between 1 and 32");
    }
  });
});
