
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ContestCard from '../../src/components/ContestCard.vue'
import * as contestApi from '../../src/api/contest'

// Mock contest API
vi.mock('../../src/api/contest')

// Mock router
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/contests/:id', component: { template: '<div>Contest Detail</div>' } }
  ]
})

describe('ContestCard Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockContest = {
    id: 1,
    name: 'Test Contest',
    description: 'Test Description',
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2024-01-02T00:00:00Z',
    qualities: 4.5,
    type: 1
  }

  const push = vi.fn()
  router.push = push

  it('should render contest information correctly', () => {
    const wrapper = mount(ContestCard, {
      props: {
        contest: mockContest
      },
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('Test Contest')
    expect(wrapper.text()).toContain('Test Description')
  })

  it('should format date correctly', () => {
    const wrapper = mount(ContestCard, {
      props: {
        contest: mockContest
      },
      global: {
        plugins: [router]
      }
    })

    const formattedDate = wrapper.vm.formatDate(mockContest.startTime)
    expect(formattedDate).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)
  })

  it('should navigate to contest detail on click', async () => {
    const wrapper = mount(ContestCard, {
      props: {
        contest: mockContest
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.find('.el-card').trigger('click')
    expect(push).toHaveBeenCalledWith('/contests/1')
  })

  it('should handle rating successfully', async () => {
    const mockResponse = { success: true }
    contestApi.voteContest.mockResolvedValue(mockResponse)

    const wrapper = mount(ContestCard, {
      props: {
        contest: mockContest,
        userRating: 0
      },
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.handleRate(5)

    expect(contestApi.voteContest).toHaveBeenCalledWith(1, 5)
    expect(wrapper.emitted('rated')).toBeTruthy()
    expect(wrapper.emitted('rated')[0]).toEqual([{ contestId: 1, rating: 5 }])
  })

  it('should handle rating error', async () => {
    const mockError = new Error('Rating failed')
    contestApi.voteContest.mockRejectedValue(mockError)

    const wrapper = mount(ContestCard, {
      props: {
        contest: mockContest,
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

  it('should display quality rating when available', () => {
    const wrapper = mount(ContestCard, {
      props: {
        contest: mockContest
      },
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).toContain('质量评分: 👑4.50')
  })

  it('should not display quality rating when not available', () => {
    const contestWithoutQuality = {
      ...mockContest,
      qualities: null
    }

    const wrapper = mount(ContestCard, {
      props: {
        contest: contestWithoutQuality
      },
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.text()).not.toContain('质量评分')
  })

})
