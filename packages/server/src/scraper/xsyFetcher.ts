import axios from "axios";
import { env } from "../config/env";
import { parseXsyPageUrl } from "./xsyUrl";

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
  if (!isXsyFetcherConfigured()) return null;
  const validatedUrl = parseXsyPageUrl(url).url.toString();

  const data = await callFetcher<{ html: string }>("/xsy/fetch-html", {
    url: validatedUrl,
    xsytoken,
  });

  return data.html;
}
