import { ref } from 'vue'

export function trackRouteLoading(router) {
  const loading = ref(false)
  let pendingRoute

  router.beforeEach((to) => {
    pendingRoute = to
    loading.value = true
  })

  const finish = (to) => {
    // A previous navigation may finish after a newer one has already started.
    if (to !== pendingRoute) return
    pendingRoute = undefined
    loading.value = false
  }

  router.afterEach((to) => finish(to))
  router.onError((error, to) => {
    finish(to)
    console.error(error)
  })

  return loading
}
