export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let nextIndex = 0
  const workerCount = Math.min(concurrency, items.length)

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      await worker(items[index]!, index)
    }
  }

  await Promise.all(Array.from({ length: workerCount }, runWorker))
}
