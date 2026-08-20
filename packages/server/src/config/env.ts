type EnvSource = Record<string, string | undefined>;

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_XSY_FETCHER_TIMEOUT_MS = 10000;
const DEFAULT_MEILI_HOST = "http://127.0.0.1:7700";
const DEFAULT_YUANTIJI_TIMEOUT_MS = 120000;
const DEFAULT_YUANTIJI_INDEX_CONCURRENCY = 8;

function requireEnv(source: EnvSource, name: "JWT_SECRET" | "DATABASE_URL") {
  const value = source[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parseAdminNicknames(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function readPort(source: EnvSource) {
  return Number(source.PORT ?? DEFAULT_PORT);
}

function readHost(source: EnvSource) {
  return source.HOST ?? DEFAULT_HOST;
}

function readXsyFetcherUrl(source: EnvSource) {
  return source.XSY_FETCHER_URL?.replace(/\/+$/, "");
}

function readXsyFetcherTimeoutMs(source: EnvSource) {
  return Number(source.XSY_FETCHER_TIMEOUT_MS ?? DEFAULT_XSY_FETCHER_TIMEOUT_MS);
}

function readMeiliHost(source: EnvSource) {
  return (source.MEILI_HOST ?? DEFAULT_MEILI_HOST).replace(/\/+$/, "");
}

function readOptional(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function readYuantijiTimeoutMs(source: EnvSource) {
  const timeoutMs = Number(source.YUANTIJI_TIMEOUT_MS ?? DEFAULT_YUANTIJI_TIMEOUT_MS);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("YUANTIJI_TIMEOUT_MS must be a positive number");
  }
  return timeoutMs;
}

function readYuantijiIndexConcurrency(source: EnvSource) {
  const concurrency = Number(
    source.YUANTIJI_INDEX_CONCURRENCY ?? DEFAULT_YUANTIJI_INDEX_CONCURRENCY,
  );
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) {
    throw new Error("YUANTIJI_INDEX_CONCURRENCY must be an integer between 1 and 32");
  }
  return concurrency;
}

export function readServerEnv(source: EnvSource = process.env) {
  return {
    jwtSecret: requireEnv(source, "JWT_SECRET"),
    databaseUrl: requireEnv(source, "DATABASE_URL"),
    port: readPort(source),
    host: readHost(source),
    adminNicknames: parseAdminNicknames(source.ADMIN_NICKNAMES),
    xsyFetcherUrl: readXsyFetcherUrl(source),
    xsyFetcherToken: source.XSY_FETCHER_TOKEN,
    xsyFetcherTimeoutMs: readXsyFetcherTimeoutMs(source),
    meiliHost: readMeiliHost(source),
    meiliApiKey: source.MEILI_API_KEY,
    yuantijiChatEndpoint: readOptional(source.YUANTIJI_CHAT_ENDPOINT),
    yuantijiChatApiKey: readOptional(source.YUANTIJI_CHAT_API_KEY),
    yuantijiChatModel: readOptional(source.YUANTIJI_CHAT_MODEL),
    yuantijiEmbeddingEndpoint: readOptional(source.YUANTIJI_EMBEDDING_ENDPOINT),
    yuantijiEmbeddingApiKey: readOptional(source.YUANTIJI_EMBEDDING_API_KEY),
    yuantijiEmbeddingModel: readOptional(source.YUANTIJI_EMBEDDING_MODEL),
    yuantijiTimeoutMs: readYuantijiTimeoutMs(source),
    yuantijiIndexConcurrency: readYuantijiIndexConcurrency(source),
  };
}

export const env = {
  get jwtSecret() {
    return requireEnv(process.env, "JWT_SECRET");
  },
  get databaseUrl() {
    return requireEnv(process.env, "DATABASE_URL");
  },
  get port() {
    return readPort(process.env);
  },
  get host() {
    return readHost(process.env);
  },
  get adminNicknames() {
    return parseAdminNicknames(process.env.ADMIN_NICKNAMES);
  },
  get xsyFetcherUrl() {
    return readXsyFetcherUrl(process.env);
  },
  get xsyFetcherToken() {
    return process.env.XSY_FETCHER_TOKEN;
  },
  get xsyFetcherTimeoutMs() {
    return readXsyFetcherTimeoutMs(process.env);
  },
  get meiliHost() {
    return readMeiliHost(process.env);
  },
  get meiliApiKey() {
    return process.env.MEILI_API_KEY;
  },
  get yuantijiChatEndpoint() {
    return readOptional(process.env.YUANTIJI_CHAT_ENDPOINT);
  },
  get yuantijiChatApiKey() {
    return readOptional(process.env.YUANTIJI_CHAT_API_KEY);
  },
  get yuantijiChatModel() {
    return readOptional(process.env.YUANTIJI_CHAT_MODEL);
  },
  get yuantijiEmbeddingEndpoint() {
    return readOptional(process.env.YUANTIJI_EMBEDDING_ENDPOINT);
  },
  get yuantijiEmbeddingApiKey() {
    return readOptional(process.env.YUANTIJI_EMBEDDING_API_KEY);
  },
  get yuantijiEmbeddingModel() {
    return readOptional(process.env.YUANTIJI_EMBEDDING_MODEL);
  },
  get yuantijiTimeoutMs() {
    return readYuantijiTimeoutMs(process.env);
  },
  get yuantijiIndexConcurrency() {
    return readYuantijiIndexConcurrency(process.env);
  },
};
