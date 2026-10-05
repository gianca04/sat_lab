/**
 * useApi — minimal data-fetching hook using native fetch + apiClient.
 * No external dependencies (no React Query / SWR).
 * Usage: const { data, loading, error, refetch } = useApi<Node[]>("/api/nodes")
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { api } from "@/lib/apiClient"

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(
  path: string | null,
  params?: Record<string, string | number | boolean | undefined>,
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Serialize params so inline object literals (e.g. `{ limit: 10 }`) don't
  // change identity on every render and trigger an infinite re-fetch loop.
  const fullPath = useMemo(() => {
    if (!path) return null
    if (!params) return path
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v))
    }
    const s = qs.toString()
    return s ? `${path}?${s}` : path
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(params ?? null)])

  const fetchData = useCallback(async () => {
    if (!fullPath) return

    // Cancel previous in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    try {
      const result = await api.get<T>(fullPath, { signal: abortRef.current.signal })
      setData(result)
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message ?? "Error desconocido")
      }
    } finally {
      setLoading(false)
    }
  }, [fullPath])

  useEffect(() => {
    fetchData()

    const handleGlobalRefresh = () => {
      fetchData()
    }

    window.addEventListener("app:refresh", handleGlobalRefresh)

    return () => {
      abortRef.current?.abort()
      window.removeEventListener("app:refresh", handleGlobalRefresh)
    }
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
