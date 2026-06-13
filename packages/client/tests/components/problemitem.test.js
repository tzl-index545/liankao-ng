
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ProblemItem from '../../src/components/ProblemItem.vue'
import * as problemApi from '../../src/api/problem'

// Mock problem API
vi.mock('../../src/api/problem')

// Mock router
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/problems/:id', component: { template: '<div>Problem Detail</div>' } }
  ]
})

describe('ProblemItem Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockProblem = {
    id: 1,
    name: 'Test Problem',
    description: 'Test Description',
    difficulties: 3.5,
    qualities: 4.5
  }

  const push = vi.fn()
  router.push = push

  it('should render problem information correctly', () => {
    const wrapper = mount(ProblemItem, {
      props: {
        problem: mockProblem
      },
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('Test Problem')
    expect(wrapper.text()).toContain('Test Description')
  })

  it('should display difficulty when available', () => {
    const wrapper = mount(ProblemItem, {
      props: {
        problem: mockProblem
      },
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('难度: 3.5')
  })

  it('should not display difficulty when not available', () => {
    const problemWithoutDifficulty = {
      ...mockProblem,
      difficulties: null
    }

    const wrapper = mount(ProblemItem, {
      props: {
        problem: problemWithoutDifficulty
      },
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).not.toContain('难度:')
  })

  it('should display quality when available', () => {
    const wrapper = mount(ProblemItem, {
      props: {
        problem: mockProblem
      },
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('质量: 4.50')
  })

  it('should not display quality when not available', () => {
    const problemWithoutQuality = {
      ...mockProblem,
      qualities: null
    }

    const wrapper = mount(ProblemItem, {
      props: {
        problem: problemWithoutQuality
      },
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).not.toContain('质量:')
  })

  it('should navigate to problem detail on click', async () => {
    const wrapper = mount(ProblemItem, {
      props: {
        problem: mockProblem
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.find('.el-card').trigger('click')
    expect(push).toHaveBeenCalledWith('/problems/1')
  })

  it('should handle rating successfully', async () => {
    const mockResponse = { success: true }
    problemApi.voteProblem.mockResolvedValue(mockResponse)

    const wrapper = mount(ProblemItem, {
      props: {
        problem: mockProblem,
        userRating: 0
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.handleRate(5)

    expect(problemApi.voteProblem).toHaveBeenCalledWith(1, 5)
    expect(wrapper.emitted('rated')).toBeTruthy()
    expect(wrapper.emitted('rated')[0]).toEqual([{ problemId: 1, rating: 5 }])
  })

  it('should handle rating error', async () => {
    const mockError = new Error('Rating failed')
    problemApi.voteProblem.mockRejectedValue(mockError)

    const wrapper = mount(ProblemItem, {
      props: {
        problem: mockProblem,
        userRating: 0
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.handleRate(5)

    expect(wrapper.vm.localRating).toBe(0)
    expect(wrapper.emitted('rated')).toBeFalsy()
  })
})
