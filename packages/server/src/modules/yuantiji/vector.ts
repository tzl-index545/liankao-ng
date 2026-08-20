export function normalizeEmbedding(values: number[]) {
  if (values.length === 0) throw new Error('Embedding is empty')
  let normSquared = 0
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error('Embedding contains a non-finite value')
    normSquared += value * value
  }
  if (normSquared === 0) throw new Error('Embedding has zero norm')
  const norm = Math.sqrt(normSquared)
  return values.map((value) => value / norm)
}

export function encodeEmbedding(values: number[]) {
  const bytes = new Uint8Array(values.length * Float32Array.BYTES_PER_ELEMENT)
  const view = new DataView(bytes.buffer)
  values.forEach((value, index) => {
    view.setFloat32(index * Float32Array.BYTES_PER_ELEMENT, value, true)
  })
  return bytes
}

export function decodeEmbedding(bytes: Uint8Array, dimensions: number) {
  if (dimensions <= 0 || bytes.byteLength !== dimensions * Float32Array.BYTES_PER_ELEMENT) {
    throw new Error('Stored embedding has invalid dimensions')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const values = new Float32Array(dimensions)
  for (let index = 0; index < dimensions; index += 1) {
    values[index] = view.getFloat32(index * Float32Array.BYTES_PER_ELEMENT, true)
  }
  return values
}

export function normalizedCosineScore(left: ArrayLike<number>, right: ArrayLike<number>) {
  if (left.length !== right.length) throw new Error('Embedding dimensions do not match')
  let cosine = 0
  for (let index = 0; index < left.length; index += 1) {
    cosine += left[index] * right[index]
  }
  return Math.min(1, Math.max(0, (Math.min(1, Math.max(-1, cosine)) + 1) / 2))
}
