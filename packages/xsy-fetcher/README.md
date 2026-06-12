# xsy-fetcher

腾讯云 SCF Node.js 事件函数，用于在国内环境访问小视野，并把完整 HTML 返回给主后端。

主后端负责解析 HTML；这个函数只做三件事：

- 校验 `X-Internal-Token`
- 校验 URL 是否属于小视野白名单
- 带 `PHPSESSID` 请求小视野并返回 HTML

## Runtime

- Function type: Event Function
- Runtime: Nodejs18.15
- Handler: `index.main_handler`

## Environment

```env
XSY_FETCHER_TOKEN=replace-with-a-long-random-secret
XSY_REQUEST_TIMEOUT_MS=8000
```

## Endpoints

```text
GET  /healthz
POST /xsy/fetch-html
```

`/xsy/fetch-html` 需要：

```text
Content-Type: application/json
X-Internal-Token: <XSY_FETCHER_TOKEN>
```

请求体：

```json
{
  "url": "http://xsy.gdgzez.com.cn/JudgeOnline/contest.php?cid=1000",
  "xsytoken": "PHPSESSID"
}
```

返回：

```json
{
  "success": true,
  "data": {
    "html": "<html>...</html>"
  }
}
```

允许路径：

- `/JudgeOnline/modifypage.php`
- `/JudgeOnline/contest.php?cid=<positive-int>`
- `/JudgeOnline/contestrank.xls.php?cid=<positive-int>`

## Deploy

```bash
cd packages/xsy-fetcher
scf deploy
```

部署完成后，把 API 网关 URL 和 token 配到主后端：

```env
XSY_FETCHER_URL=https://service-xxx.gz.apigw.tencentcs.com/release
XSY_FETCHER_TOKEN=replace-with-the-same-secret
```
