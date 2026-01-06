import { request } from './http'

export type Goal = {
  id: string
  title: string
  period: 'longterm' | 'weekly' | 'monthly'
  start_date: string | null
  end_date: string | null
  priority: number
  status: 'active' | 'completed' | 'archived'
  notes: string
  created_at: string
  updated_at: string
}

export type ListGoalsParams = {
  period?: Goal['period']
  status?: Goal['status']
}

export const listGoals = async (params: ListGoalsParams = {}) => {
  const search = new URLSearchParams()
  if (params.period) {
    search.set('period', params.period)
  }
  if (params.status) {
    search.set('status', params.status)
  }
  const query = search.toString()
  const data = await request<unknown>(`/goals${query ? `?${query}` : ''}`)
  if (!Array.isArray(data)) {
    throw new Error('Goals data response invalid')
  }
  return data as Goal[]
}

export type CreateGoalPayload = {
  title: string
  period?: Goal['period']
  start_date?: string | null
  end_date?: string | null
  priority?: number
  status?: Goal['status']
  notes?: string
}

export const createGoal = (payload: CreateGoalPayload) =>
  request<{ id: string }>('/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export type UpdateGoalPayload = Partial<CreateGoalPayload>

export const updateGoal = (id: string, payload: UpdateGoalPayload) =>
  request<{ ok: boolean }>(`/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteGoal = (id: string) =>
  request<{ ok: boolean }>(`/goals/${id}`, {
    method: 'DELETE',
  })
