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

test('validateAllowedUrl accepts a zero-based contest problem id', () => {
  const url = _private.validateAllowedUrl(
    'http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=0'
  );
  assert.equal(url.pathname, '/JudgeOnline/problem.php');
  assert.equal(url.searchParams.get('pid'), '0');
});

test('validateAllowedUrl rejects malformed problem urls', () => {
  const invalidUrls = [
    'http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446',
    'http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=-1',
    'http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=0&next=x',
    'http://xsy.gdgzez.com.cn:8080/JudgeOnline/problem.php?cid=2446&pid=0',
  ];

  for (const url of invalidUrls) {
    assert.throws(() => _private.validateAllowedUrl(url));
  }
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
