import { request } from './http'

export type PomodoroSession = {
  id: string
  item_id: string | null
  mode: 'focus' | 'short_break' | 'long_break'
  duration_seconds: number
  started_at: string
  ended_at: string | null
  status: 'running' | 'completed' | 'canceled'
  note: string
  created_at: string
}

export type CreatePomodoroPayload = {
  item_id?: string
  mode: PomodoroSession['mode']
  duration_seconds: number
  started_at?: string
  ended_at?: string
  status?: PomodoroSession['status']
  note?: string
}

export const createPomodoroSession = (payload: CreatePomodoroPayload) =>
  request<{ id: string }>('/pomodoro', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export type ListPomodoroParams = {
  item_id?: string
  start?: string
  end?: string
  limit?: number
}

export const listPomodoroSessions = async (params: ListPomodoroParams = {}) => {
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
  const data = await request<unknown>(`/pomodoro${query ? `?${query}` : ''}`)
  if (!Array.isArray(data)) {
    throw new Error('Pomodoro data response invalid')
  }
  return data as PomodoroSession[]
}
