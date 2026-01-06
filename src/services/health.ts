import { request } from './http'

export type Health = {
  ok: boolean
  timestamp: string
}

export const getHealth = () => request<Health>('/health')
