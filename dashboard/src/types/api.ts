export type ApiStatus = 'ok' | 'error'

export type ApiResponse<T> = {
  status: ApiStatus
  message?: string
  data: T
}
