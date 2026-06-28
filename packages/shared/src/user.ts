export type UserPayload = {
  xsyusername: string
  nickname: string
  rating: number
  id: number
}

export type UserObject = {
  id: number
  nickname: string
  xsyusername: string
  rating: number
  realname: string
}

export type UserListResponse = {
  users: UserObject[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}
