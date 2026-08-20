import { describe, expect, it } from 'bun:test'
import { cleanSimplifiedStatement } from './prompt'

describe('yuantiji prompt helpers', () => {
  it('extracts and compacts the tagged simplified statement', () => {
    expect(cleanSimplifiedStatement(`
      <SIMPLIFIED_STATEMENT>
      Find the maximum
      subarray sum.
      </SIMPLIFIED_STATEMENT>
    `)).toBe('Find the maximum subarray sum.')
  })

  it('rejects untagged model output', () => {
    expect(() => cleanSimplifiedStatement('Find a path.')).toThrow('invalid tagged response')
  })
})
