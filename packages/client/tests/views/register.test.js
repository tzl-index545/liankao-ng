import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Register from '../../src/views/Register.vue'
import { ElMessage } from 'element-plus'

const { registerAction } = vi.hoisted(() => ({
  registerAction: vi.fn()
}))

vi.mock('../../src/store/user', () => ({
  useUserStore: () => ({ registerAction })
}))

async function mountRegister() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/register', component: Register }]
  })
  router.push('/register')
  await router.isReady()

  return mount(Register, {
    global: { plugins: [router] }
  })
}

describe('Register view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('explains the real-name restriction before submission', async () => {
    const wrapper = await mountRegister()

    expect(wrapper.text()).toContain('小视野有比赛正在进行时，无法获取真实姓名')
    expect(wrapper.text()).toContain('请在比赛结束后注册')
    expect(registerAction).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows the specific failure without appending an unrelated contest warning', async () => {
    const reason = '评分站昵称须为 4–20 个字符，请检查后重试。'
    registerAction.mockRejectedValue(new Error(reason))
    const messageSpy = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    const wrapper = await mountRegister()
    const inputs = wrapper.findAll('input')

    await inputs[0].setValue('test-user')
    await inputs[1].setValue('password123')
    await inputs[2].setValue('test-session')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(registerAction).toHaveBeenCalledTimes(1)
    expect(messageSpy).toHaveBeenCalledWith(reason)
    wrapper.unmount()
    messageSpy.mockRestore()
  })
})
