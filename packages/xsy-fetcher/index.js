'use strict';

const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.XSY_REQUEST_TIMEOUT_MS || '8000', 10);

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0';

const ALLOWED_PATHS = new Set([
  '/JudgeOnline/modifypage.php',
  '/JudgeOnline/contest.php',
  '/JudgeOnline/contestrank.xls.php',
]);

function response(statusCode, payload) {
  return {
    isBase64Encoded: false,
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

function isValidPhpSessionId(id) {
  return typeof id === 'string' && /^[-,a-zA-Z0-9]{1,128}$/.test(id);
}

function isPositiveInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function getHeader(headers, name) {
  if (!headers) return undefined;
  const direct = headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
  if (direct !== undefined) return direct;

  const key = Object.keys(headers).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function requireInternalToken(event) {
  const expected = process.env.XSY_FETCHER_TOKEN;
  if (!expected) {
    const error = new Error('XSY_FETCHER_TOKEN is not configured');
    error.statusCode = 500;
    throw error;
  }

  const actual = getHeader(event.headers, 'x-internal-token');
  if (String(actual || '') !== expected) {
    const error = new Error('unauthorized');
    error.statusCode = 401;
    throw error;
  }
}

function validateAllowedUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    const error = new Error('invalid url');
    error.statusCode = 400;
    throw error;
  }

  if (url.protocol !== 'http:' || url.hostname !== 'xsy.gdgzez.com.cn') {
    const error = new Error('url host is not allowed');
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_PATHS.has(url.pathname)) {
    const error = new Error('url path is not allowed');
    error.statusCode = 400;
    throw error;
  }

  if (url.pathname !== '/JudgeOnline/modifypage.php') {
    const cid = url.searchParams.get('cid');
    if (!isPositiveInteger(cid)) {
      const error = new Error('cid must be a positive integer');
      error.statusCode = 400;
      throw error;
    }
  }

  return url;
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('invalid json body');
    error.statusCode = 400;
    throw error;
  }
}

async function fetchXsyHtml(url, xsytoken) {
  if (!isValidPhpSessionId(xsytoken)) {
    const error = new Error('invalid xsytoken');
    error.statusCode = 400;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Cookie: `PHPSESSID=${xsytoken}`,
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      },
    });
    const html = await res.text();

    console.log(
      JSON.stringify({
        event: 'xsy_fetch',
        path: url.pathname,
        status: res.status,
        elapsedMs: Date.now() - startedAt,
      })
    );

    if (!res.ok) {
      const error = new Error(`xsy returned HTTP ${res.status}`);
      error.statusCode = res.status >= 500 ? 502 : 400;
      throw error;
    }

    return html;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      const timeoutError = new Error('xsy request timed out');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function mainHandler(event) {
  const method = event.httpMethod || event.requestContext?.httpMethod || event.requestContext?.http?.method;
  const path = event.path || event.rawPath || event.requestContext?.path || '/';

  if (method === 'GET' && path.endsWith('/healthz')) {
    return response(200, { success: true, data: { status: 'ok' } });
  }

  if (method !== 'POST') {
    return response(405, { success: false, message: 'method not allowed' });
  }

  requireInternalToken(event);

  const body = parseBody(event);
  const url = validateAllowedUrl(body.url);
  const html = await fetchXsyHtml(url, body.xsytoken);

  return response(200, { success: true, data: { html } });
}

exports.main_handler = async (event, context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  try {
    return await mainHandler(event || {});
  } catch (error) {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    console.error(
      JSON.stringify({
        event: 'request_failed',
        statusCode,
        message: error.message,
      })
    );

    return response(statusCode, {
      success: false,
      message: error.message || 'internal error',
    });
  }
};

module.exports._private = {
  ALLOWED_PATHS,
  fetchXsyHtml,
  isValidPhpSessionId,
  mainHandler,
  parseBody,
  validateAllowedUrl,
};
