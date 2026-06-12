'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fetcher = require('../index');
const { _private } = fetcher;

test('validateAllowedUrl rejects non-xsy hosts', () => {
  assert.throws(
    () => _private.validateAllowedUrl('https://example.com/JudgeOnline/contest.php?cid=1'),
    /url host is not allowed/
  );
});

test('validateAllowedUrl accepts whitelisted contest urls', () => {
  const url = _private.validateAllowedUrl('http://xsy.gdgzez.com.cn/JudgeOnline/contest.php?cid=1');
  assert.equal(url.pathname, '/JudgeOnline/contest.php');
  assert.equal(url.searchParams.get('cid'), '1');
});

test('mainHandler rejects missing token', async () => {
  process.env.XSY_FETCHER_TOKEN = 'secret';
  const res = await fetcher.main_handler({
    httpMethod: 'POST',
    path: '/xsy/fetch-html',
    headers: {},
    body: JSON.stringify({
      url: 'http://xsy.gdgzez.com.cn/JudgeOnline/modifypage.php',
      xsytoken: 'abc',
    }),
  });

  assert.equal(res.statusCode, 401);
});
