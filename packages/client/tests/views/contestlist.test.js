import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ContestList from '../../src/views/ContestList.vue'
import * as contestApi from '../../src/api/contest'

vi.mock('../../src/api/contest')

async function mountContestList() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/contests', component: ContestList }]
  })
  router.push('/contests')
  await router.isReady()

  const wrapper = mount(ContestList, {
    global: { plugins: [router] }
  })
  await flushPromises()
  return wrapper
}

describe('ContestList view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contestApi.getContestList.mockResolvedValue({
      success: true,
      data: { items: [], total: 0 }
    })
  })

  it('does not expose the contest crawler as a login credential pair', async () => {
    const wrapper = await mountContestList()
    const contestInput = wrapper.get('input[name="contest-crawl-range"]')
    const sessionInput = wrapper.get('input[name="xsy-session-token"]')

    expect(contestInput.attributes('type')).toBe('text')
    expect(contestInput.attributes('autocomplete')).toBe('off')
    expect(sessionInput.attributes('type')).toBe('text')
    expect(sessionInput.attributes('autocomplete')).toBe('off')
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
  })

  it('keeps the session token after crawling', async () => {
    contestApi.crawlContest.mockResolvedValue({ success: true })
    const wrapper = await mountContestList()
    const contestInput = wrapper.get('input[name="contest-crawl-range"]')
    const sessionInput = wrapper.get('input[name="xsy-session-token"]')

    await contestInput.setValue('1001')
    await sessionInput.setValue('test-session-id')
    await wrapper.get('.contest-actions .el-button--primary').trigger('click')
    await flushPromises()

    expect(contestApi.crawlContest).toHaveBeenCalledWith(1001, 'test-session-id')
    expect(sessionInput.element.value).toBe('test-session-id')
  })
})
