
import request from '../utils/request'

export const getUserList = (params) => {
  return request({
    url: '/user/list',
    method: 'get',
    params
  })
}

export const getUserDetail = (id) => {
  return request({
    url: `/user/${id}`,
    method: 'get'
  })
}

export const getUserRatingChanges = (id) => {
  return request({
    url: `/user/${id}/ratingUserChanges`,
    method: 'get'
  })
}

export const getUserRatingHistory = (id) => {
  return request({
    url: `/user/${id}/ratingHistory`,
    method: 'get'
  })
}
