import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ContestDetail from '../../src/views/ContestDetail.vue'
import * as contestApi from '../../src/api/contest'

vi.mock('../../src/api/contest')

const createTestRouter = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contests/:id', component: ContestDetail },
      { path: '/problems/:id', component: { template: '<div>Problem</div>' } },
      { path: '/users/:id', component: { template: '<div>User</div>' } }
    ]
  })

  router.push('/contests/2429')
  await router.isReady()
  return router
}

const mountContestDetail = async () => {
  const router = await createTestRouter()
  const wrapper = mount(ContestDetail, {
    global: {
      plugins: [router]
    }
  })
  await flushPromises()
  return wrapper
}

describe('ContestDetail view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contestApi.getContestDetail.mockResolvedValue({
      success: true,
      data: {
        id: 2429,
        name: 'Test Contest',
        description: 'Test Description',
        startTime: '2026-01-01T00:00:00Z',
        endTime: '2026-01-01T02:00:00Z',
        qualities: null,
        type: null
      }
    })
    contestApi.getContestProblems.mockResolvedValue({
      success: true,
      data: [{ id: 1, name: 'A', description: '', point: 100, order: 1 }]
    })
    contestApi.getContestRanklist.mockResolvedValue({
      success: true,
      data: []
    })
  })

  it('formats rating deltas with sign and color classes', async () => {
    const wrapper = await mountContestDetail()

    const positiveRow = { preContestRating: 1500, postContestRating: 1523 }
    const negativeRow = { preContestRating: 1500, postContestRating: 1488 }
    const zeroRow = { preContestRating: 1500, postContestRating: 1500 }

    expect(wrapper.vm.getRatingDelta(positiveRow)).toBe(23)
    expect(wrapper.vm.formatRatingDelta(positiveRow)).toBe('+23')
    expect(wrapper.vm.ratingDeltaClass(positiveRow)).toContain('rating-delta-positive')

    expect(wrapper.vm.getRatingDelta(negativeRow)).toBe(-12)
    expect(wrapper.vm.formatRatingDelta(negativeRow)).toBe('-12')
    expect(wrapper.vm.ratingDeltaClass(negativeRow)).toContain('rating-delta-negative')

    expect(wrapper.vm.getRatingDelta(zeroRow)).toBe(0)
    expect(wrapper.vm.formatRatingDelta(zeroRow)).toBe('0')
    expect(wrapper.vm.ratingDeltaClass(zeroRow)).toContain('rating-delta-zero')
  })

  it('shows zero delta when rating data is missing', async () => {
    const wrapper = await mountContestDetail()

    const missingPreRating = { preContestRating: null, postContestRating: 1510 }
    const missingPostRating = { preContestRating: 1500, postContestRating: null }

    expect(wrapper.vm.getRatingDelta(missingPreRating)).toBe(0)
    expect(wrapper.vm.formatRatingDelta(missingPreRating)).toBe('0')
    expect(wrapper.vm.ratingDeltaClass(missingPreRating)).toContain('rating-delta-zero')

    expect(wrapper.vm.getRatingDelta(missingPostRating)).toBe(0)
    expect(wrapper.vm.formatRatingDelta(missingPostRating)).toBe('0')
    expect(wrapper.vm.ratingDeltaClass(missingPostRating)).toContain('rating-delta-zero')
  })
})
