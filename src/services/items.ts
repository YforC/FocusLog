import { request } from './http'

export type Item = {
  id: string
  title: string
  kind: 'todo' | 'habit'
  measure: 'check' | 'time' | 'count'
  milestone_id?: string | null
  priority?: number
  schedule_type?: string
  schedule_value?: number
  sort_order?: number
  created_at?: string
  updated_at?: string
  archived_at?: string | null
}

export const listItems = async () => {
  const data = await request<unknown>('/items')
  if (!Array.isArray(data)) {
    throw new Error('计划数据响应异常')
  }
  return data as Item[]
}

export type CreateItemPayload = {
  title: string
  kind?: Item['kind']
  measure?: Item['measure']
  milestone_id?: string | null
  priority?: number
  schedule_type?: string
  schedule_value?: number
  sort_order?: number
}

export const createItem = (payload: CreateItemPayload) =>
  request<{ id: string }>('/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export type UpdateItemPayload = {
  title?: string
  kind?: Item['kind']
  measure?: Item['measure']
  milestone_id?: string | null
  priority?: number
}

export const updateItem = (id: string, payload: UpdateItemPayload) =>
  request<{ ok: boolean }>(`/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteItem = (id: string) =>
  request<{ ok: boolean }>(`/items/${id}`, {
    method: 'DELETE',
  })
