import { request } from './http'

export type DependencyItem = {
  id: string
  title: string
}

export const listItemDependencies = async (itemId: string) => {
  const data = await request<unknown>(`/items/${itemId}/dependencies`)
  if (!Array.isArray(data)) {
    throw new Error('Dependency data response invalid')
  }
  return data as DependencyItem[]
}

export const saveItemDependencies = (itemId: string, dependencies: string[]) =>
  request<{ ok: boolean; count: number }>(`/items/${itemId}/dependencies`, {
    method: 'PUT',
    body: JSON.stringify({ dependencies }),
  })
