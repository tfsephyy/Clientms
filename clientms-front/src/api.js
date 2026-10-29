export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  '',
)
export const API = '/api/v1'

export class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.slice(11)
  let response
  try {
    response = await fetch(`${API_ORIGIN}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(
      'Cannot reach PetFave. Check that the Laravel server is running, then try again.',
      0,
    )
  }
  const data =
    response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    if (
      response.status === 401 &&
      !path.includes('/auth/') &&
      !path.endsWith('/me')
    ) {
      window.dispatchEvent(new Event('petfave:expired'))
    }
    if (response.status === 403)
      window.dispatchEvent(new Event('petfave:permissions'))
    throw new ApiError(
      data?.message ||
        (response.status === 419
          ? 'Your session has expired. Refresh the page and try again.'
          : 'The request could not be completed.'),
      response.status,
      data?.errors,
    )
  }
  return data
}

export async function csrf() {
  await api('/sanctum/csrf-cookie')
}

export function dateTime(value) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'
}

export function localDateTime(value) {
  const date = value ? new Date(value) : new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}
