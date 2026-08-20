import { describe, expect, it } from 'bun:test'
import {
  decodeEmbedding,
  encodeEmbedding,
  normalizeEmbedding,
  normalizedCosineScore,
} from './vector'

describe('yuantiji vector helpers', () => {
  it('normalizes and round-trips float32 embeddings', () => {
    const normalized = normalizeEmbedding([3, 4])
    const decoded = decodeEmbedding(encodeEmbedding(normalized), 2)
    expect(Array.from(decoded)[0]).toBeCloseTo(0.6)
    expect(Array.from(decoded)[1]).toBeCloseTo(0.8)
  })

  it('maps cosine similarity from [-1, 1] to [0, 1]', () => {
    expect(normalizedCosineScore([1, 0], [1, 0])).toBe(1)
    expect(normalizedCosineScore([1, 0], [0, 1])).toBe(0.5)
    expect(normalizedCosineScore([1, 0], [-1, 0])).toBe(0)
  })

  it('rejects invalid vectors', () => {
    expect(() => normalizeEmbedding([])).toThrow('empty')
    expect(() => normalizeEmbedding([0, 0])).toThrow('zero norm')
    expect(() => decodeEmbedding(new Uint8Array(4), 2)).toThrow('invalid dimensions')
  })
})
