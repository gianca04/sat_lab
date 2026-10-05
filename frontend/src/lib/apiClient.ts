/**
 * apiClient — fetch wrapper centralizado.
 * Lee VITE_API_BASE_URL y VITE_API_TOKEN del .env de Vite.
 * El token también se puede inyectar en runtime con setToken().
 */

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

let _token: string | null = import.meta.env.VITE_API_TOKEN || null

/** Inyecta un JWT en runtime (ej. después de login exitoso). */
export function setToken(token: string | null) {
  _token = token
  if (token) {
    localStorage.setItem("sat_token", token)
  } else {
    localStorage.removeItem("sat_token")
  }
}

/** Recupera el token guardado en localStorage (persistencia entre recargas). */
export function loadStoredToken(): string | null {
  const stored = localStorage.getItem("sat_token")
  if (stored) {
    _token = stored
  }
  return _token
}

/** Obtiene el token activo actual (de memoria, localStorage o .env) */
export function getToken(): string | null {
  return _token || loadStoredToken() || import.meta.env.VITE_API_TOKEN || null
}

// Cargar token persistido al importar el módulo.
loadStoredToken()

// ─────────────────────────────────────────────────────────────────────────────

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error?.detail ?? `HTTP ${res.status}`)
  }

  // 204 No Content — sin body
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
}
