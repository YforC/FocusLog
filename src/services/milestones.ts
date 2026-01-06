import { request } from './http'

export type Milestone = {
  id: string
  goal_id: string
  title: string
  start_date: string | null
  end_date: string | null
  priority: number
  status: 'active' | 'completed' | 'archived'
  notes: string
  created_at: string
  updated_at: string
}

export type ListMilestonesParams = {
  goal_id?: string
}

export const listMilestones = async (params: ListMilestonesParams = {}) => {
  const search = new URLSearchParams()
  if (params.goal_id) {
    search.set('goal_id', params.goal_id)
  }
  const query = search.toString()
  const data = await request<unknown>(`/milestones${query ? `?${query}` : ''}`)
  if (!Array.isArray(data)) {
    throw new Error('Milestones data response invalid')
  }
  return data as Milestone[]
}

export type CreateMilestonePayload = {
  goal_id: string
  title: string
  start_date?: string | null
  end_date?: string | null
  priority?: number
  status?: Milestone['status']
  notes?: string
}

export const createMilestone = (payload: CreateMilestonePayload) =>
  request<{ id: string }>('/milestones', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export type UpdateMilestonePayload = Partial<CreateMilestonePayload>

export const updateMilestone = (id: string, payload: UpdateMilestonePayload) =>
  request<{ ok: boolean }>(`/milestones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteMilestone = (id: string) =>
  request<{ ok: boolean }>(`/milestones/${id}`, {
    method: 'DELETE',
  })
