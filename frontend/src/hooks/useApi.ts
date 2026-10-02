/**
 * useApi — minimal data-fetching hook using native fetch + apiClient.
 * No external dependencies (no React Query / SWR).
 * Usage: const { data, loading, error, refetch } = useApi<Node[]>("/api/nodes")
 */

import { useCallback, useEffect, useRef, useState } from "react"
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

  const buildPath = useCallback(() => {
    if (!path) return null
    if (!params) return path
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v))
    }
    const s = qs.toString()
    return s ? `${path}?${s}` : path
  }, [path, params])

  const fetchData = useCallback(async () => {
    const fullPath = buildPath()
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
  }, [buildPath])

  useEffect(() => {
    fetchData()
    return () => abortRef.current?.abort()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
