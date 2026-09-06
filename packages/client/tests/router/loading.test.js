import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { trackRouteLoading } from '../../src/router/loading'

const page = { template: '<div>Page</div>' }

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup(routes) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  return { router, loading: trackRouteLoading(router) }
}

describe('route loading', () => {
  it('keeps the initial page loading until its component resolves', async () => {
    const pending = deferred()
    const { router, loading } = setup([
      { path: '/', redirect: '/contests' },
      { path: '/contests', component: () => pending.promise },
    ])

    const navigation = router.push('/')
    await flushPromises()
    expect(loading.value).toBe(true)

    pending.resolve(page)
    await navigation
    expect(loading.value).toBe(false)
    expect(router.currentRoute.value.path).toBe('/contests')
  })

  it('does not let an older navigation clear the newer loading state', async () => {
    const first = deferred()
    const second = deferred()
    const { router, loading } = setup([
      { path: '/first', component: () => first.promise },
      { path: '/second', component: () => second.promise },
    ])

    const firstNavigation = router.push('/first')
    await flushPromises()
    const secondNavigation = router.push('/second')
    await flushPromises()
    first.resolve(page)
    await firstNavigation
    expect(loading.value).toBe(true)

    second.resolve(page)
    await secondNavigation
    expect(loading.value).toBe(false)
    expect(router.currentRoute.value.path).toBe('/second')
  })

  it('clears loading on a rejected import and can load another page', async () => {
    const pending = deferred()
    const error = new Error('Failed to fetch dynamically imported module')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { router, loading } = setup([
      { path: '/broken', component: () => pending.promise },
      { path: '/working', component: page },
    ])

    try {
      const navigation = router.push('/broken')
      const rejection = expect(navigation).rejects.toThrow(error.message)
      await flushPromises()
      expect(loading.value).toBe(true)
      pending.reject(error)
      await rejection
      expect(loading.value).toBe(false)
      expect(log).toHaveBeenCalledWith(error)

      await router.push('/working')
      expect(loading.value).toBe(false)
      expect(router.currentRoute.value.path).toBe('/working')
    } finally {
      log.mockRestore()
    }
  })

  it('clears loading when a navigation guard cancels the navigation', async () => {
    const { router, loading } = setup([
      { path: '/', component: page },
      { path: '/blocked', component: page },
    ])
    await router.push('/')
    router.beforeEach((to) => to.path !== '/blocked')

    await router.push('/blocked')
    expect(loading.value).toBe(false)
    expect(router.currentRoute.value.path).toBe('/')
  })
})
