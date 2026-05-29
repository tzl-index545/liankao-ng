# lkrate

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
```

## 生产部署概览

当前服务器部署方式：

- 服务器：`root@43.248.77.131`
- 应用目录：`/opt/lkrate/app`
- 外部访问端口：`721`
- 后端服务：`lkrate-server`
- 后端监听：`127.0.0.1:3000`
- nginx：监听 `721`，服务前端静态文件，并把 `/api` 反代到后端

访问地址：

```text
http://43.248.77.131:721/
http://43.248.77.131:721/api/openapi
```

生产环境不要把本地的 `packages/server/.env` 覆盖到服务器；生产数据库 `packages/server/data.db` 也不要在日常更新时覆盖，除非明确要替换数据。

## 首次部署

服务器安装基础依赖：

```bash
apt-get update
apt-get install -y ca-certificates curl unzip nginx
curl -fsSL https://bun.sh/install | bash
ln -sf /root/.bun/bin/bun /usr/local/bin/bun
ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx
```

创建应用目录：

```bash
mkdir -p /opt/lkrate/app
```

从本地同步源码到服务器：

```bash
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'packages/*/node_modules' \
  --exclude 'packages/client/dist' \
  --exclude 'packages/server/.env' \
  ./ root@43.248.77.131:/opt/lkrate/app/
```

在服务器写生产环境变量：

```bash
cat > /opt/lkrate/app/packages/server/.env <<'EOF'
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL="file:./data.db"
JWT_SECRET="replace-with-a-long-random-secret"
ADMIN_NICKNAMES=tzl_index545
EOF

chmod 600 /opt/lkrate/app/packages/server/.env
```

如果是首次部署且需要带初始 SQLite 数据库，把本地数据库传到服务器：

```bash
scp packages/server/data.db root@43.248.77.131:/opt/lkrate/app/packages/server/data.db
```

安装依赖、生成 Prisma Client、构建前端：

```bash
cd /opt/lkrate/app
bun install

cd /opt/lkrate/app/packages/server
bunx --bun prisma generate

cd /opt/lkrate/app/packages/client
bun run build
```

配置 systemd：

```bash
cat > /etc/systemd/system/lkrate-server.service <<'EOF'
[Unit]
Description=Lkrate Elysia API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/lkrate/app/packages/server
EnvironmentFile=/opt/lkrate/app/packages/server/.env
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable lkrate-server
systemctl restart lkrate-server
```

配置 nginx 监听 `721`：

```bash
cat > /etc/nginx/sites-available/lkrate <<'EOF'
server {
    listen 721 default_server;
    listen [::]:721 default_server;
    server_name _;

    root /opt/lkrate/app/packages/client/dist;
    index index.html;

    client_max_body_size 20m;

    location = /api {
        proxy_pass http://127.0.0.1:3000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/lkrate /etc/nginx/sites-enabled/lkrate
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

## 后续更新部署

日常发布代码改动时，不要覆盖生产 `.env` 和 `data.db`：

```bash
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'packages/*/node_modules' \
  --exclude 'packages/client/dist' \
  --exclude 'packages/server/.env' \
  --exclude 'packages/server/data.db' \
  ./ root@43.248.77.131:/opt/lkrate/app/
```

然后在服务器执行：

```bash
cd /opt/lkrate/app
bun install

cd /opt/lkrate/app/packages/server
bunx --bun prisma generate
systemctl restart lkrate-server

cd /opt/lkrate/app/packages/client
bun run build

nginx -t
systemctl reload nginx
```

如果 Prisma schema 有迁移，先确认迁移策略，再在生产执行对应迁移命令；不要直接覆盖生产数据库。

## 服务检查

```bash
systemctl status lkrate-server --no-pager
systemctl status nginx --no-pager
ss -ltnp '( sport = :721 or sport = :3000 )'
curl -fsSI http://127.0.0.1:721/
curl -fsSI http://127.0.0.1:721/api/openapi
```

查看日志：

```bash
journalctl -u lkrate-server -n 100 --no-pager
tail -n 100 /var/log/nginx/access.log
tail -n 100 /var/log/nginx/error.log
```

## 回滚

部署前可以先备份当前应用目录：

```bash
cp -a /opt/lkrate/app /opt/lkrate/app.backup.$(date +%Y%m%d%H%M%S)
```

回滚时把备份目录换回 `/opt/lkrate/app`，然后重启服务：

```bash
systemctl restart lkrate-server
systemctl restart nginx
```
