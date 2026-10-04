import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import UserDetail from '../../src/views/UserDetail.vue'
import * as userApi from '../../src/api/user'

vi.mock('../../src/api/user')
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))

const wrappers = []
let resizeCallback
const disconnect = vi.fn()
const historyItem = (overrides = {}) => ({
  id: 1, contestId: 20, endTime: '2026-09-01T04:00:00Z',
  contestName: `联考第 ${overrides.contestId ?? 20} 场`,
  preContestRating: 1500, postContestRating: 1510, ...overrides
})
const historyResponse = (data) => ({ success: true, data })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

const mountUserDetail = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/users/:id', component: UserDetail }]
  })
  router.push('/users/7')
  await router.isReady()
  const wrapper = mount(UserDetail, {
    global: {
      plugins: [router], stubs: { UserName: true }, directives: { loading: () => {} }
    }
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
const dots = (wrapper) => wrapper.findAll('.rating-point-dot')
const x = (dot) => Number(dot.attributes('cx'))
const y = (dot) => Number(dot.attributes('cy'))

// Model a container resize; jsdom has no layout engine.
const resize = async (wrapper, width) => {
  Object.defineProperty(wrapper.get('.chart-container').element, 'clientWidth', {
    configurable: true, value: width
  })
  resizeCallback()
  await flushPromises()
}

describe('UserDetail view', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback) { resizeCallback = callback }
      observe() {}
      disconnect = disconnect
    })
    userApi.getUserDetail.mockResolvedValue({
      success: true, data: { id: 7, nickname: 'tester', rating: 1500 }
    })
    userApi.getUserRatingHistory.mockResolvedValue(historyResponse([historyItem()]))
  })

  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.unstubAllGlobals()
  })

  it('sorts by end time and spaces contests according to elapsed time, not contest ID or index', async () => {
    userApi.getUserRatingHistory.mockResolvedValue(historyResponse([
      historyItem({ id: 3, contestId: 5, endTime: '2026-09-11T04:00:00Z' }),
      historyItem(),
      historyItem({ id: 2, contestId: 100, endTime: '2026-09-02T04:00:00Z' })
    ]))
    const wrapper = await mountUserDetail()
    const points = dots(wrapper)
    expect(points).toHaveLength(3)
    expect((x(points[1]) - x(points[0])) / (x(points[2]) - x(points[0]))).toBeCloseTo(0.1)
    const labels = wrapper.findAll('.rating-point').map((point) => point.attributes('aria-label'))
    expect(labels[0]).toContain('联考第 20 场，')
    expect(labels[1]).toContain('联考第 100 场，')
    expect(labels[2]).toContain('联考第 5 场，')
    expect(wrapper.findAll('.x-axis-label')[0].text()).toContain('2026-09-01')
    expect(wrapper.findAll('.x-axis-label').at(-1).text()).toContain('2026-09-11')
  })

  it('ignores invalid dates and missing ratings while preserving a real zero', async () => {
    userApi.getUserRatingHistory.mockResolvedValue(historyResponse([
      null, historyItem({ id: 2, endTime: null }), historyItem({ id: 3, endTime: 'not-a-date' }),
      historyItem({ id: 4, postContestRating: null }), historyItem({ id: 5, postContestRating: ' ' }),
      historyItem({ id: 6, postContestRating: Infinity }), historyItem({ preContestRating: 0, postContestRating: 0 })
    ]))
    const wrapper = await mountUserDetail()
    expect(dots(wrapper)).toHaveLength(1)
    expect(Number.isFinite(y(dots(wrapper)[0]))).toBe(true)
    await wrapper.get('.rating-point').trigger('mouseenter')
    expect(wrapper.get('.chart-tooltip').text()).toContain('Rating：0 → 0')
    expect(wrapper.get('.chart-tooltip').text()).toContain('变化：0')
    await wrapper.get('.rating-point').trigger('mouseleave')
    expect(wrapper.find('.chart-tooltip').exists()).toBe(false)
  })

  it('shows an unknown delta as missing rather than zero and supports keyboard focus', async () => {
    userApi.getUserRatingHistory.mockResolvedValue(historyResponse([historyItem({ preContestRating: null })]))
    const wrapper = await mountUserDetail()
    const point = wrapper.get('.rating-point')
    expect(point.attributes('tabindex')).toBe('0')
    await point.trigger('focus')
    expect(wrapper.get('.tooltip-title').text()).toBe('联考第 20 场')
    expect(wrapper.get('.chart-tooltip').text()).toContain('变化：-')
    expect(wrapper.get('.chart-tooltip').text()).toContain('结束时间：2026-09-01')
    await point.trigger('blur')
    expect(wrapper.find('.chart-tooltip').exists()).toBe(false)
  })

  it('keeps a flat, single-contest history visible without forcing every rating band into view', async () => {
    userApi.getUserRatingHistory.mockResolvedValue(historyResponse([historyItem({ postContestRating: 1500 })]))
    const wrapper = await mountUserDetail()
    expect(dots(wrapper)).toHaveLength(1)
    expect(wrapper.findAll('.x-axis-label')).toHaveLength(1)
    const ticks = wrapper.findAll('.axis-labels > text:not(.x-axis-label)').map((tick) => Number(tick.text()))
    expect(Math.min(...ticks)).toBeLessThan(1500)
    expect(Math.max(...ticks)).toBeGreaterThan(1500)
    expect(Math.max(...ticks) - Math.min(...ticks)).toBeLessThan(500)
    expect(wrapper.get('.rating-line').attributes('d')).not.toMatch(/NaN|Infinity/)
  })

  it('keeps simultaneous contests at the same x position and orders ties by contest ID', async () => {
    userApi.getUserRatingHistory.mockResolvedValue(historyResponse([
      historyItem({ id: 2, contestId: 30 }), historyItem({ postContestRating: 1520 })
    ]))
    const wrapper = await mountUserDetail()
    expect(x(dots(wrapper)[0])).toBe(x(dots(wrapper)[1]))
    expect(wrapper.findAll('.rating-point')[0].attributes('aria-label')).toContain('联考第 20 场，')
    expect(wrapper.get('.rating-line').attributes('d')).not.toMatch(/NaN|Infinity/)
  })

  it('distinguishes short time intervals in axis labels', async () => {
    userApi.getUserRatingHistory.mockResolvedValue(historyResponse([
      historyItem(), historyItem({ id: 2, endTime: '2026-09-01T04:01:00Z' })
    ]))
    const wrapper = await mountUserDetail()
    const labels = wrapper.findAll('.x-axis-label').map((tick) => tick.text())
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels[0]).toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('fits tooltips and reduces ticks on narrow screens, including after a resize', async () => {
    userApi.getUserRatingHistory.mockResolvedValue(historyResponse([
      historyItem(), historyItem({ id: 2, endTime: '2026-10-01T04:00:00Z', postContestRating: 1600 })
    ]))
    const wrapper = await mountUserDetail()
    await resize(wrapper, 320)
    expect(wrapper.get('svg').attributes('viewBox')).toBe('0 0 320 360')
    expect(wrapper.findAll('.x-axis-label')).toHaveLength(2)
    for (const point of wrapper.findAll('.rating-point')) {
      await point.trigger('click')
      const { left, width, top } = wrapper.get('.chart-tooltip').element.style
      expect(parseFloat(left)).toBeGreaterThanOrEqual(0)
      expect(parseFloat(left) + parseFloat(width)).toBeLessThanOrEqual(320)
      expect(parseFloat(top)).toBeGreaterThan(0)
      expect(parseFloat(top)).toBeLessThan(360)
    }
    await resize(wrapper, 960)
    expect(wrapper.find('.chart-tooltip').exists()).toBe(false)
    expect(wrapper.findAll('.x-axis-label').length).toBeGreaterThan(2)
  })

  it('reloads on user navigation and ignores late responses from the previous user', async () => {
    const oldUser = deferred()
    const oldHistory = deferred()
    userApi.getUserDetail.mockReturnValueOnce(oldUser.promise)
    userApi.getUserRatingHistory.mockReturnValueOnce(oldHistory.promise)
    const wrapper = await mountUserDetail()
    userApi.getUserDetail.mockResolvedValue({ success: true, data: { id: 8, rating: 1800 } })
    userApi.getUserRatingHistory.mockResolvedValue(historyResponse([historyItem({ contestId: 88 })]))
    await wrapper.vm.$router.push('/users/8')
    await flushPromises()
    expect(userApi.getUserDetail).toHaveBeenLastCalledWith('8')
    expect(userApi.getUserRatingHistory).toHaveBeenLastCalledWith('8')
    oldUser.resolve({ success: true, data: { id: 7, rating: 1234 } })
    oldHistory.resolve(historyResponse([historyItem({ contestId: 77 })]))
    await flushPromises()
    expect(wrapper.get('.basic-info').text()).toContain('1800')
    expect(wrapper.get('.basic-info').text()).not.toContain('1234')
    expect(wrapper.get('.rating-point').attributes('aria-label')).toContain('联考第 88 场，')
  })

  it('clears previous data and distinguishes a failed request from an empty history', async () => {
    const wrapper = await mountUserDetail()
    await wrapper.get('.rating-point').trigger('focus')
    userApi.getUserDetail.mockRejectedValue(new Error('User not found'))
    userApi.getUserRatingHistory.mockRejectedValue(new Error('Network error'))
    await wrapper.vm.$router.push('/users/8')
    await flushPromises()
    expect(wrapper.find('.info-grid').exists()).toBe(false)
    expect(wrapper.get('.user-error').text()).toBe('获取用户信息失败')
    expect(wrapper.get('.chart-empty').text()).toBe('获取 Rating 变化数据失败')
    expect(wrapper.find('.chart-tooltip').exists()).toBe(false)
    expect(dots(wrapper)).toHaveLength(0)
  })

  it('ignores stale failures without hiding the new user loading state', async () => {
    const oldHistory = deferred()
    const newHistory = deferred()
    userApi.getUserRatingHistory.mockReturnValueOnce(oldHistory.promise).mockReturnValueOnce(newHistory.promise)
    const wrapper = await mountUserDetail()
    await wrapper.vm.$router.push('/users/8')
    oldHistory.reject(new Error('stale failure'))
    await flushPromises()
    expect(ElMessage.error).not.toHaveBeenCalled()
    expect(wrapper.find('.chart-empty').exists()).toBe(false)
    newHistory.resolve(historyResponse([]))
    await flushPromises()
    expect(wrapper.get('.chart-empty').text()).toBe('暂无 Rating 变化')
  })

  it('disconnects the resize observer and ignores requests after unmount', async () => {
    const pending = deferred()
    userApi.getUserRatingHistory.mockReturnValueOnce(pending.promise)
    const wrapper = await mountUserDetail()
    wrapper.unmount()
    pending.reject(new Error('late failure'))
    await flushPromises()
    expect(disconnect).toHaveBeenCalledOnce()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
