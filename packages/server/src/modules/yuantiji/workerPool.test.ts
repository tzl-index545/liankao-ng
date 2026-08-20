import { describe, expect, it } from 'bun:test'
import { runWithConcurrency } from './workerPool'

describe('runWithConcurrency', () => {
  it('processes every item without exceeding the configured concurrency', async () => {
    let active = 0
    let maximumActive = 0
    const completed: number[] = []

    await runWithConcurrency([1, 2, 3, 4, 5, 6], 3, async (item) => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await Bun.sleep(item % 2 === 0 ? 2 : 1)
      completed.push(item)
      active -= 1
    })

    expect(maximumActive).toBe(3)
    expect(completed.sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('does not start more workers than items', async () => {
    let active = 0
    let maximumActive = 0

    await runWithConcurrency([1, 2], 8, async () => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await Bun.sleep(1)
      active -= 1
    })

    expect(maximumActive).toBe(2)
  })
})
