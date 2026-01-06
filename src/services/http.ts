const DEFAULT_BASE_URL = 'http://127.0.0.1:8787'

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (!envUrl) {
    return DEFAULT_BASE_URL
  }
  return envUrl.replace(/\/$/, '')
}

const baseUrl = resolveBaseUrl()

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload)
    throw new Error(message || `Request failed with ${response.status}`)
  }

  return payload as T
}
