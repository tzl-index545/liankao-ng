import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import UserDetail from '../../src/views/UserDetail.vue'
import * as userApi from '../../src/api/user'

vi.mock('../../src/api/user')

const mountUserDetail = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/users/:id', component: UserDetail }]
  })
  router.push('/users/7')
  await router.isReady()

  const wrapper = mount(UserDetail, {
    global: {
      plugins: [router],
      stubs: { UserName: true }
    }
  })
  await flushPromises()
  return wrapper
}

describe('UserDetail view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userApi.getUserDetail.mockResolvedValue({
      success: true,
      data: { id: 7, nickname: 'tester', rating: 1500 }
    })
  })

  it('keeps the rating-history order supplied by the API', async () => {
    userApi.getUserRatingHistory.mockResolvedValue({
      success: true,
      data: [
        { id: 1, contestId: 20, preContestRating: 1500, postContestRating: 1510 },
        { id: 2, contestId: 5, preContestRating: 1510, postContestRating: 1520 }
      ]
    })

    const wrapper = await mountUserDetail()

    expect(wrapper.vm.sortedRatingHistory.map((item) => item.contestId)).toEqual([20, 5])
  })

  it('does not coerce missing rating values to zero', async () => {
    userApi.getUserRatingHistory.mockResolvedValue({
      success: true,
      data: [
        { id: 1, contestId: 1, preContestRating: 0, postContestRating: 0 }
      ]
    })

    const wrapper = await mountUserDetail()

    expect(wrapper.vm.toNumber(null)).toBeNull()
    expect(wrapper.vm.toNumber(undefined)).toBeNull()
    expect(wrapper.vm.toNumber('')).toBeNull()
    expect(wrapper.vm.sortedRatingHistory).toHaveLength(1)
    expect(wrapper.vm.sortedRatingHistory[0]).toMatchObject({ beforeRating: 0, afterRating: 0 })
  })
})
