// src/modules/auth/index.ts
import { Elysia, status,t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { AuthService } from './service'
import { RegisterBody,LoginBody } from './model'
import { openapi } from '@elysiajs/openapi'
import { env } from '../../config/env'

const JWT_SECRET = env.jwtSecret

export const auth = new Elysia({ prefix: '/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  )
  .post(
    '/register',
    async ({ body, jwt, cookie: { token } }) => {
      const { xsytoken, nickname, unHashedPassword } = body
      const service = new AuthService()

      try {
        const userPayload=await service.register(xsytoken, nickname, unHashedPassword);
        const jwtToken = await jwt.sign(userPayload)
        token.value = jwtToken;
        token.path = '/';
        token.maxAge = 7 * 24 * 60 * 60; // 7 days
        return { 
          success: true as const, 
          message: 'Registration successful',
          data: {
            token: jwtToken,
            ...userPayload
          }
        }
      } catch (error: any) {
        return status(400, { success:false as const,message: "Check your token!!!"+(error.message || ' UKE') })
      }
    },
    {
      body: RegisterBody,
      response: {
        200: t.Object({ 
          success: t.Boolean(), 
          message: t.String(),
          data: t.Object({
            token: t.String(),
            id: t.Number(),
            nickname: t.String()
          })
        }),
        400: t.Object({ success: t.Boolean(), message: t.String() }),
      },
      detail: {
        summary: '注册用户 /auth/register',
        description: '使用用户名、小视野的 cookie 以及明文密码注册用户。哈希会在后端完成',
        tags: ['auth']
      }
    }
  )
  .post(
    '/login',
    async ({ body, jwt, cookie: { token } }) => {
      const { nickname, unHashedPassword } = body
      const service = new AuthService()

      try {
        const userPayload = await service.login(nickname, unHashedPassword)
        const jwtToken = await jwt.sign(userPayload)
        console.log(userPayload,jwtToken)
        token.value = jwtToken;
        token.path = '/';
        token.maxAge = 7 * 24 * 60 * 60; // 7 days
        return { 
          success: true, 
          message: 'Login successful',
          data: {
            token: jwtToken,
            ...userPayload
          }
        }
      } catch (error: any) {
        return status(401, {success:false, message: "Check your password or nickname!!!"+(error.message || ' UKE') })
      }
    },
    {
      body: LoginBody,
      response: {
        200: t.Object({ 
          success: t.Boolean(), 
          message: t.String(),
          data: t.Object({
            token: t.String(),
            id: t.Number(),
            nickname: t.String()
          })
        }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
      },
      detail: {
        summary: '登录 /auth/login',
        description: '使用用户 nickname 和未哈希密码登录',
        tags: ['auth']
      },
    }
  )
  // .get(
    // '/*',
    // ()=>{ return "OK"}
  // )
