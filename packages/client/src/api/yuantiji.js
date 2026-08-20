import request from '../utils/request'

export const searchYuantiji = (statement) => {
  return request({
    url: '/yuantiji/search',
    method: 'post',
    data: { statement },
    timeout: 300000
  })
}
