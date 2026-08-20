import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProblemList from '../../src/views/ProblemList.vue'
import * as problemApi from '../../src/api/problem'

vi.mock('../../src/api/problem')

async function mountProblemList(path = '/problems') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/problems', component: ProblemList },
      { path: '/problems/:id', component: { template: '<div />' } }
    ]
  })
  router.push(path)
  await router.isReady()
  const wrapper = mount(ProblemList, {
    global: { plugins: [router] }
  })
  await flushPromises()
  return { wrapper, router }
}

describe('ProblemList view search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    problemApi.getProblemList.mockResolvedValue({
      success: true,
      data: { items: [], total: 0 }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restores a URL search and defaults to relevance order', async () => {
    const { wrapper } = await mountProblemList('/problems?q=%E4%BA%8C%E5%88%86')

    expect(wrapper.get('input[aria-label="搜索题库"]').element.value).toBe('二分')
    expect(problemApi.getProblemList).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      q: '二分'
    })
  })

  it('debounces input into the URL and removes q when cleared', async () => {
    vi.useFakeTimers()
    const { wrapper, router } = await mountProblemList()
    const input = wrapper.get('input[aria-label="搜索题库"]')

    await input.setValue('动态规划')
    await vi.advanceTimersByTimeAsync(299)
    expect(router.currentRoute.value.query.q).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(router.currentRoute.value.query.q).toBe('动态规划')
    expect(problemApi.getProblemList).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      q: '动态规划'
    })

    await input.setValue('')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(router.currentRoute.value.query.q).toBeUndefined()
    expect(problemApi.getProblemList).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      order: 'desc'
    })
  })
})
