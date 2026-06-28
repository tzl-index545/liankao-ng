import axios from "axios";
import { env } from "../config/env";

type FetcherResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

function getFetcherBaseUrl() {
  return env.xsyFetcherUrl;
}

function getFetcherToken() {
  return env.xsyFetcherToken;
}

export function isXsyFetcherConfigured() {
  return Boolean(getFetcherBaseUrl());
}

function isXsyUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" && parsed.hostname === "xsy.gdgzez.com.cn";
  } catch {
    return false;
  }
}

function getFetcherHeaders() {
  const token = getFetcherToken();
  if (!token) {
    throw new Error("XSY_FETCHER_TOKEN is required when XSY_FETCHER_URL is configured");
  }

  return {
    "Content-Type": "application/json",
    "X-Internal-Token": token,
  };
}

async function callFetcher<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const baseUrl = getFetcherBaseUrl();
  if (!baseUrl) throw new Error("XSY_FETCHER_URL is not configured");

  const response = await axios.post<FetcherResponse<T>>(`${baseUrl}${path}`, body, {
    timeout: env.xsyFetcherTimeoutMs,
    headers: getFetcherHeaders(),
  });

  if (!response.data?.success || !response.data.data) {
    throw new Error(response.data?.message || "xsy fetcher request failed");
  }

  return response.data.data;
}

export async function fetchXsyHtmlViaFetcher(
  url: string,
  xsytoken: string
): Promise<string | null> {
  if (!isXsyFetcherConfigured() || !isXsyUrl(url)) return null;

  const data = await callFetcher<{ html: string }>("/xsy/fetch-html", {
    url,
    xsytoken,
  });

  return data.html;
}
