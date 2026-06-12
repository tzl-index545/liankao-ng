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
XSY_FETCHER_URL=
XSY_FETCHER_TOKEN=
```

`XSY_FETCHER_URL` 和 `XSY_FETCHER_TOKEN` 可选。配置后，后端访问小视野的请求会转发到国内 `xsy-fetcher` 云函数；不配置时仍然直连小视野。
