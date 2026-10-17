export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type TokenGetter = () => Promise<string | null>

export async function apiFetch<T>(
  path: string,
  getToken: TokenGetter,
  init: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  const token = await getToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let body: BodyInit | undefined
  if (init.body instanceof FormData) {
    body = init.body
  } else if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.body)
  }
  const res = await fetch(path, { ...init, headers, body })
  if (!res.ok) {
    let message = res.statusText
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message || `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
