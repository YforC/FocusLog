import { request } from './http'

export type Log = {
  id: string
  item_id: string
  date: string
  value: number
  note: string
  created_at: string
  updated_at: string
}

export type ListLogsParams = {
  item_id?: string
  start?: string
  end?: string
  limit?: number
}

export const listLogs = async (params: ListLogsParams = {}) => {
  const search = new URLSearchParams()
  if (params.item_id) {
    search.set('item_id', params.item_id)
  }
  if (params.start) {
    search.set('start', params.start)
  }
  if (params.end) {
    search.set('end', params.end)
  }
  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit))
  }
  const query = search.toString()
  const data = await request<unknown>(`/logs${query ? `?${query}` : ''}`)
  if (!Array.isArray(data)) {
    throw new Error('记录数据响应异常')
  }
  return data as Log[]
}

export type CreateLogPayload = {
  item_id: string
  date: string
  value?: number
  note?: string
}

export const createLog = (payload: CreateLogPayload) =>
  request<{ id: string }>('/logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const deleteLog = (id: string) =>
  request<{ ok: boolean }>(`/logs/${id}`, {
    method: 'DELETE',
  })
