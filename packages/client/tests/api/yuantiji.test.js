import { beforeEach, describe, expect, it, vi } from 'vitest'
import { searchYuantiji } from '../../src/api/yuantiji'
import request from '../../src/utils/request'

vi.mock('../../src/utils/request')

describe('Yuantiji API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the statement to the yuantiji search endpoint', async () => {
    request.mockResolvedValue({ success: true, data: { matches: [] } })

    await searchYuantiji('Find the LIS.')

    expect(request).toHaveBeenCalledWith({
      url: '/yuantiji/search',
      method: 'post',
      data: { statement: 'Find the LIS.' },
      timeout: 300000
    })
  })
})
