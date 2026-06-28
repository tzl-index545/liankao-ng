type EnvSource = Record<string, string | undefined>;

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_XSY_FETCHER_TIMEOUT_MS = 10000;

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
};
