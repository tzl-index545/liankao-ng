import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ProblemDetail from '../../src/views/ProblemDetail.vue'
import * as problemApi from '../../src/api/problem'

vi.mock('../../src/api/problem')

const problem = {
  id: 42,
  name: 'A + B',
  description: '求两个数之和',
  difficulties: null,
  qualities: 4.5,
  statementHtml: '<section class="statement-section"><h2>题目描述</h2><div>求 $a+b$ 的值</div></section>',
  statementFetchedAt: '2026-07-31T12:00:00.000Z',
  contestIds: [2446],
  sources: [
    {
      contestId: 2446,
      sourcePid: 0,
      sourceUrl: 'http://xsy.gdgzez.com.cn/JudgeOnline/problem.php?cid=2446&pid=0'
    }
  ]
}

async function mountProblemDetail() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/problems/:id', component: ProblemDetail },
      { path: '/contests/:id', component: { template: '<div>Contest</div>' } }
    ]
  })
  router.push('/problems/42')
  await router.isReady()

  const wrapper = mount(ProblemDetail, {
    global: { plugins: [router] }
  })
  await flushPromises()
  return wrapper
}

describe('ProblemDetail view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    problemApi.getProblemDetail.mockResolvedValue({ success: true, data: problem })
  })

  it('loads and renders the stored statement with its source', async () => {
    const wrapper = await mountProblemDetail()

    expect(problemApi.getProblemDetail).toHaveBeenCalledWith('42')
    expect(wrapper.text()).toContain('A + B')
    expect(wrapper.text()).toContain('题目描述')
    expect(wrapper.text()).toContain('求')
    expect(wrapper.find('.katex').exists()).toBe(true)
    expect(wrapper.find('.problem-sources a').attributes('href')).toBe(problem.sources[0].sourceUrl)
  })

  it('shows an empty state when an old problem has no statement', async () => {
    problemApi.getProblemDetail.mockResolvedValue({
      success: true,
      data: { ...problem, statementHtml: null }
    })

    const wrapper = await mountProblemDetail()
    expect(wrapper.text()).toContain('该题暂无已抓取题面')
  })
})
