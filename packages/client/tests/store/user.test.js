
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '../../src/store/user'
import * as authApi from '../../src/api/auth'

// Mock auth API
vi.mock('../../src/api/auth')

// Mock request module
vi.mock('../../src/utils/request', () => ({
  default: vi.fn(),
}))

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('loginAction', () => {
    it('should login successfully and set isLoggedIn to true', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'test-token',
          id: 1,
          nickname: 'testuser'
        }
      }
      authApi.login.mockResolvedValue(mockResponse)

      const store = useUserStore()
      await store.loginAction({
        nickname: 'testuser',
        unHashedPassword: 'password123'
      })

      expect(store.isLoggedIn).toBe(true)
      expect(authApi.login).toHaveBeenCalledWith({
        nickname: 'testuser',
        unHashedPassword: 'password123'
      })
    })

    it('should throw error on login failure', async () => {
      const mockError = new Error('Login failed')
      authApi.login.mockRejectedValue(mockError)

      const store = useUserStore()

      await expect(
        store.loginAction({
          nickname: 'testuser',
          unHashedPassword: 'wrongpassword'
        })
      ).rejects.toThrow('Login failed')
    })
  })

  describe('registerAction', () => {
    it('should register successfully and set isLoggedIn to true', async () => {
      const mockResponse = {
        success: true,
        message: 'Registration successful',
        data: {
          token: 'test-token',
          id: 1,
          nickname: 'Test User'
        }
      }
      authApi.register.mockResolvedValue(mockResponse)

      const store = useUserStore()
      await store.registerAction({
        xsyusername: 'testuser',
        nickname: 'Test User',
        unHashedPassword: 'password123',
        xsytoken: 'testtoken'
      })

      expect(store.isLoggedIn).toBe(true)
      expect(authApi.register).toHaveBeenCalledWith({
        xsyusername: 'testuser',
        nickname: 'Test User',
        unHashedPassword: 'password123',
        xsytoken: 'testtoken'
      })
    })

    it('should throw error on registration failure', async () => {
      const mockError = new Error('Registration failed')
      authApi.register.mockRejectedValue(mockError)

      const store = useUserStore()

      await expect(
        store.registerAction({
          xsyusername: 'existinguser',
          nickname: 'Existing User',
          unHashedPassword: 'password123',
          xsytoken: 'testtoken'
        })
      ).rejects.toThrow('Registration failed')
    })
  })

  describe('checkLoginAction', () => {
    it('should check login status and set user info', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'test-token',
          id: 1,
          nickname: 'testuser'
        }
      }
      authApi.checkLogin.mockResolvedValue(mockResponse)
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('userInfo', JSON.stringify({ id: 1, nickname: 'testuser' }))

      const store = useUserStore()
      await store.checkLoginAction()

      expect(store.isLoggedIn).toBe(true)
      expect(store.userInfo).toEqual({
        token: 'test-token',
        id: 1,
        nickname: 'testuser'
      })
    })

    it('should set isLoggedIn to false on check failure', async () => {
      const mockError = new Error('Not logged in')
      authApi.checkLogin.mockRejectedValue(mockError)

      const store = useUserStore()
      await expect(store.checkLoginAction()).rejects.toThrow('Not logged in')

      expect(store.isLoggedIn).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear user state', () => {
      const store = useUserStore()
      store.token = 'test-token'
      store.userInfo = { id: 1, nickname: 'testuser' }
      store.isLoggedIn = true

      store.logout()

      expect(store.token).toBe('')
      expect(store.userInfo).toBeNull()
      expect(store.isLoggedIn).toBe(false)
    })
  })
})
