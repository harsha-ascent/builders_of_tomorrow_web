/** Tiny localStorage helpers so the site works with no account at all. */

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeLocal<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked; ignore */
  }
}

export function removeLocal(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const LOCAL_KEYS = {
  designs: 'bot:designs:v1',
  launches: 'bot:launches:v1',
  worksheet: (workshop: string, id: string) => `bot:worksheet:${workshop}:${id}:v1`,
  worksheetIndex: 'bot:worksheet-index:v1',
} as const
