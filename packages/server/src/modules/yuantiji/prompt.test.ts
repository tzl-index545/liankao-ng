import { describe, expect, it } from 'bun:test'
import { buildYuantijiPrompt, cleanSimplifiedStatement } from './prompt'

describe('yuantiji prompt helpers', () => {
  it('injects the original statement into the prompt', () => {
    expect(buildYuantijiPrompt('Before\n[[ORIGINAL]]\nAfter', '  A + B  '))
      .toBe('Before\nA + B\nAfter')
  })

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
