<h1 align="center"> <img width="256" height="256" alt="liankao-ng logo" src="https://github.com/user-attachments/assets/d4bab2ab-2788-4e5c-8b3d-a7ed590b446d" /> <br /> <a href="https://liankao.index545.com">liankao-ng</a> </h1>

## 本地开发

安装依赖：

```bash
bun install
```

生成 Prisma Client：

```bash
cd packages/server
bunx --bun prisma generate
```

启动开发服务：

```bash
bun run dev
```

API 文档：

```text
http://localhost:3000/api/openapi
```

查看本地数据库：

```bash
cd packages/server
bunx --bun prisma studio
```

后端环境变量放在 `packages/server/.env`：

```env
DATABASE_URL="file:./data.db"
JWT_SECRET="change-this-secret"
ADMIN_NICKNAMES=alice,bob,admin
XSY_FETCHER_URL=
XSY_FETCHER_TOKEN=
MEILI_HOST=http://127.0.0.1:7700
MEILI_API_KEY=
YUANTIJI_CHAT_ENDPOINT=https://api.deepseek.com/chat/completions
YUANTIJI_CHAT_API_KEY=
YUANTIJI_CHAT_MODEL=deepseek-v4-flash
YUANTIJI_EMBEDDING_ENDPOINT=https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/embeddings
YUANTIJI_EMBEDDING_API_KEY=
YUANTIJI_EMBEDDING_MODEL=qwen3.7-text-embedding
YUANTIJI_TIMEOUT_MS=120000
```

`XSY_FETCHER_URL` 和 `XSY_FETCHER_TOKEN` 可选。配置后，后端访问小视野的请求会转发到国内 `xsy-fetcher` 云函数；不配置时仍然直连小视野。

原题机的简化题意和 embedding 使用两组互相独立的 OpenAI-compatible 完整端点、API key 与模型名。题库和查询必须使用同一个 embedding 配置。

## 原题机索引

先应用 Prisma 迁移并重新生成 Client：

```bash
cd packages/server
bunx --bun prisma migrate deploy
bunx --bun prisma generate
```

增量处理新增或题面、prompt、模型配置发生变化的题目：

```bash
bun run yuantiji:index
```

强制重新生成全部已有完整题面的题目：

```bash
bun run yuantiji:index:full
```

没有 `statementHtml` 的题目会被跳过。简化题意与归一化后的 embedding 缓存在 SQLite 中，在线查询时由后端直接计算余弦相似度，不依赖 Meilisearch。

## Meilisearch 部署

以 Ubuntu 22.04 或更高版本为例，安装最新的 Meilisearch 原生二进制：

```bash
curl -L https://install.meilisearch.com | sh
sudo install -m 0755 meilisearch /usr/local/bin/meilisearch
sudo useradd --system --home /var/lib/meilisearch --shell /usr/sbin/nologin meilisearch
sudo install -d -o meilisearch -g meilisearch /var/lib/meilisearch
```

生成一个至少 16 字节的 `MEILI_MASTER_KEY`，然后创建 `/etc/meilisearch.env`：

```env
MEILI_ENV=production
MEILI_HTTP_ADDR=127.0.0.1:7700
MEILI_DB_PATH=/var/lib/meilisearch/data.ms
MEILI_MASTER_KEY=替换为随机密钥
MEILI_MAX_INDEXING_MEMORY=1Gb
MEILI_MAX_INDEXING_THREADS=1
```

创建 `/etc/systemd/system/meilisearch.service`：

```ini
[Unit]
Description=Meilisearch
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=meilisearch
Group=meilisearch
EnvironmentFile=/etc/meilisearch.env
ExecStart=/usr/local/bin/meilisearch
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/meilisearch

[Install]
WantedBy=multi-user.target
```

启动并验证：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now meilisearch
curl -fsS http://127.0.0.1:7700/health
```

在后端的环境文件中增加：

```env
MEILI_HOST=http://127.0.0.1:7700
MEILI_API_KEY=与_MEILI_MASTER_KEY_相同
```

部署新版后初始化索引，再重启后端：

```bash
cd packages/server
bun run search:reindex
sudo systemctl restart liankao-server
```

Meilisearch 只监听 `127.0.0.1`，无需在 Nginx 或防火墙中对外开放 `7700` 端口。
