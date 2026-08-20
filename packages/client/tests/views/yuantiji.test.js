import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Yuantiji from '../../src/views/Yuantiji.vue'
import * as yuantijiApi from '../../src/api/yuantiji'

vi.mock('../../src/api/yuantiji')

async function mountYuantiji() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/yuantiji', component: Yuantiji },
      { path: '/problems/:id', component: { template: '<div />' } }
    ]
  })
  router.push('/yuantiji')
  await router.isReady()
  return {
    router,
    wrapper: mount(Yuantiji, {
      global: {
        plugins: [router],
        directives: { loading: () => {} }
      }
    })
  }
}

describe('Yuantiji view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    yuantijiApi.searchYuantiji.mockResolvedValue({
      success: true,
      data: {
        simplifiedStatement: 'Find the longest increasing subsequence.',
        indexedCount: 90,
        matches: [{
          id: 42,
          name: 'LIS',
          description: 'Sequence problem',
          similarity: 0.975
        }]
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('submits a trimmed statement and renders top matches', async () => {
    const { wrapper } = await mountYuantiji()
    await wrapper.get('textarea[aria-label="待匹配题面"]').setValue('  求 LIS  ')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(yuantijiApi.searchYuantiji).toHaveBeenCalledWith('求 LIS')
    expect(wrapper.text()).toContain('Find the longest increasing subsequence.')
    expect(wrapper.text()).toContain('97.5%')
    expect(wrapper.text()).toContain('LIS')
  })

  it('opens a matched problem in a new tab', async () => {
    const { wrapper } = await mountYuantiji()
    await wrapper.get('textarea[aria-label="待匹配题面"]').setValue('求 LIS')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    const problemLink = wrapper.get('a.problem-link')

    expect(problemLink.attributes('href')).toBe('/problems/42')
    expect(problemLink.attributes('target')).toBe('_blank')
    expect(problemLink.attributes('rel')).toBe('noopener noreferrer')
  })

  it('shows a ten-second visual progress indicator while searching', async () => {
    vi.useFakeTimers()
    let finishSearch
    yuantijiApi.searchYuantiji.mockReturnValue(new Promise((resolve) => {
      finishSearch = () => resolve({
        success: true,
        data: {
          simplifiedStatement: 'Find the longest increasing subsequence.',
          indexedCount: 90,
          matches: []
        }
      })
    }))
    const { wrapper } = await mountYuantiji()
    await wrapper.get('textarea[aria-label="待匹配题面"]').setValue('求 LIS')
    await wrapper.get('button').trigger('click')

    expect(wrapper.get('.progress-box').text()).toContain('预计还需 10s')
    expect(yuantijiApi.searchYuantiji).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(wrapper.get('.progress-box').text()).toContain('预计还需 5s')

    await vi.advanceTimersByTimeAsync(5_000)
    expect(wrapper.get('.progress-box').text()).toContain('即将完成')

    finishSearch()
    await flushPromises()
    expect(wrapper.find('.progress-box').exists()).toBe(false)
    wrapper.unmount()
  })
})
