import { Elysia, status, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./modules/auth";
import { contest } from "./modules/contest"
import { problem } from "./modules/problem"
import { vote } from "./modules/vote"
import { rating } from "./modules/rating"
import { create } from "./modules/create"
import { user } from "./modules/user"
import openapi from "@elysiajs/openapi";

const app = new Elysia({ prefix: '/api' })
    .use(
      cors({
        origin: true,
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    )
    .use(auth)
    .use(contest)
    .use(problem)
    .use(vote)
    .use(rating)
    .use(create)
    .use(user)
    .use(openapi({
      documentation: {
        info: {
          title: 'liankao-ng API',
          version: '1.0.0',
        },
        tags: [
          { name: 'auth', description: '注册与登录' },
          { name: 'contest', description: '比赛（需登录）' },
          { name: 'problem', description: '题目（需登录）' },
          { name: 'vote', description: '投票（需登录）' },
          { name: 'rating', description: '等级分查询' },
          { name: 'create', description: '创建比赛并计算 rating（需登录）' },
          { name: 'user', description: '用户查询' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    }))
    .get('/*', () => {
        return status(404,{message:"API not found."});
    },{
      response: {
        404 : t.String(),
      },
    })

export type App = typeof app

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOST ?? "0.0.0.0"

app.listen({ port, hostname })
