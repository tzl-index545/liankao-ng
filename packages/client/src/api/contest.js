
import request from '../utils/request'

export const getContestList = (params) => {
  return request({
    url: '/contest/list',
    method: 'get',
    params
  })
}

export const getContestDetail = (id) => {
  return request({
    url: `/contest/${id}`,
    method: 'get'
  })
}

export const getContestProblems = (id) => {
  return request({
    url: `/contest/${id}/problems`,
    method: 'get'
  })
}

export const getContestRanklist = (id) => {
  return request({
    url: `/contest/${id}/ranklist`,
    method: 'get'
  })
}

export const voteContest = (id, score) => {
  return request({
    url: `/vote/contest/${id}`,
    method: 'post',
    data: { x: score }
  })
}

export const crawlContest = (contestId, phpSessionId) => {
  return request({
    url: '/create/contest/crawl',
    method: 'post',
    data: {
      package: {
        contestId,
        phpSessionId
      }
    },
    timeout: 120000
  })
}

export const calculateContestRating = (contestId) => {
  return request({
    url: '/create/contest/rating',
    method: 'post',
    data: {
      package: { contestId }
    },
    timeout: 120000
  })
}
