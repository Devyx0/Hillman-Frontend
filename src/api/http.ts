/**
 * HTTP client for the Hillman Centrale API. Adds the Supabase access token, parses the API's error format
 * (`{ error: { code, message, details } }`, messages in French) and retries once after refreshing the token on 401.
 */
import { API_URL } from './config'
import { accessToken, clearSession, refreshSession } from './auth'
import { t } from '../i18n'

export class ApiError extends Error {
  /** HTTP status (0 = network error). */
  readonly status: number
  /** API error code: NOT_FOUND, FORBIDDEN, VALIDATION, POSSIBLE_DUPLICATE, BUSINESS_RULE… */
  readonly code: string
  readonly details?: unknown
  /** `message`: French message from the API (or from this client for network errors). */
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** Query-string values; undefined / null / '' are left out. */
export type Query = Record<string, string | number | boolean | null | undefined>

interface RequestOptions {
  query?: Query
  /** JSON body (objects) or multipart (FormData). */
  body?: unknown
  /** No Authorization header (lead intake uses its own key). */
  anonymous?: boolean
  headers?: Record<string, string>
}

function url(path: string, query?: Query) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  const s = qs.toString()
  return `${API_URL}${path}${s ? `?${s}` : ''}`
}

async function send(method: string, path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData
  const headers: Record<string, string> = { ...opts.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  try {
    return await fetch(url(path, opts.query), {
      method,
      headers,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Impossible de joindre le serveur. Vérifiez votre connexion.')
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | undefined)?.error
    throw new ApiError(res.status, err?.code ?? `HTTP_${res.status}`, err?.message ?? 'Erreur du serveur.', err?.details)
  }
  return data as T
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const token = opts.anonymous ? null : await accessToken()
  if (!opts.anonymous && !token) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentification requise.')
  let res = await send(method, path, opts, token)
  if (res.status === 401 && !opts.anonymous) {
    // The token may have expired between the check and the call (or been revoked): refresh once, then give up.
    const s = await refreshSession()
    // Retry only with a new token; a 401 with a freshly refreshed token means the session is no longer valid.
    if (s && s.accessToken !== token) {
      res = await send(method, path, opts, s.accessToken)
      if (res.status === 401) clearSession()
    }
  }
  return parse<T>(res)
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>('POST', path, { body: body ?? {}, query }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body: body ?? {} }),
  del: <T = void>(path: string) => request<T>('DELETE', path),
}

/** UI message for any error thrown by the API layer. */
export function errorMessage(e: unknown, fallback = 'Une erreur est survenue. Réessayez dans un moment.'): string {
  // Messages are French (the API's and this client's); `t` translates the ones the dictionaries know.
  if (e instanceof ApiError) {
    // Zod validation: show the first field message when the API gives one (each part translated on its own).
    const detail = (e.code === 'VALIDATION' || e.code === 'BAD_REQUEST') && Array.isArray(e.details) ? (e.details[0] as { message?: string } | undefined)?.message : undefined
    return detail ? `${t(e.message)} ${t(detail)}` : t(e.message)
  }
  if (e instanceof Error && e.message) return t(e.message)
  return t(fallback)
}
