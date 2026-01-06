import { request } from './http'

export type SettingsMap = Record<string, string>

export const getSettings = async () => {
  const data = await request<unknown>('/settings')
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('设置数据响应异常')
  }
  return data as SettingsMap
}

export const saveSettings = (payload: Record<string, string | number>) =>
  request<{ ok: boolean; updated: number }>('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
