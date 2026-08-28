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

  it('mentions ongoing contests when registration fails', async () => {
    registerAction.mockRejectedValue(new Error('Check your token!!!'))
    const messageSpy = vi.spyOn(ElMessage, 'error').mockImplementation(() => {})
    const wrapper = await mountRegister()
    const inputs = wrapper.findAll('input')

    await inputs[0].setValue('test-user')
    await inputs[1].setValue('password123')
    await inputs[2].setValue('test-session')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(registerAction).toHaveBeenCalledTimes(1)
    expect(messageSpy).toHaveBeenCalledWith(
      'Check your token!!!；提示：有正在进行的比赛时无法注册'
    )
  })
})
