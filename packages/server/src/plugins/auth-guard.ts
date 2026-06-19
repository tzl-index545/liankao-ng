import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import type { UserPayload } from '../types/user'

export const authGuard = new Elysia({ name: 'auth.guard' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET!,
      exp: '7d',
    })
  )
  .derive({ as: 'scoped' }, async ({ jwt, request, set, path }) => {
    if (path.startsWith('/auth')) {
      return {}
    }
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 403
      throw new Error('UNAUTHORIZED!!! Try to logout and login')
    }
    const token = authHeader.slice(7)
    const payload = await jwt.verify(token)
    if (!payload) {
      set.status = 403
      throw new Error('INVALID_TOKEN!!! Try to logout and login')
    }
    return { user: payload as UserPayload }
  })
  .onError(({ code, error, set }) => {
    if (code === 'UNKNOWN') {
      if (error.message === 'UNAUTHORIZED') {
        set.status = 403
        return 'Unauthorized: Missing or invalid token'
      }
      else if (error.message === 'INVALID_TOKEN') {
        set.status = 403
        return 'Forbidden: Token is invalid or expired'
      }else{
        set.status = 403;
        return error;
      }
    }
  })

// 导出 authGuard 的派生类型，供路由使用
export type AuthGuard = typeof authGuard;