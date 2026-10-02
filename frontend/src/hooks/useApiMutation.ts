/**
 * useApiMutation — hook para POST / PATCH / DELETE con estado de loading/error.
 * No tiene efecto en montaje; se dispara manualmente con mutate().
 */

import { useCallback, useState } from "react"
import { api } from "@/lib/apiClient"

type Method = "post" | "patch" | "delete"

interface MutationState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseMutationResult<T, B> extends MutationState<T> {
  mutate: (body?: B) => Promise<T | null>
  reset: () => void
}

export function useApiMutation<T = void, B = unknown>(
  method: Method,
  path: string,
): UseMutationResult<T, B> {
  const [state, setState] = useState<MutationState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(
    async (body?: B): Promise<T | null> => {
      setState({ data: null, loading: true, error: null })
      try {
        let result: T
        if (method === "delete") {
          result = await api.delete<T>(path)
        } else if (method === "patch") {
          result = await api.patch<T>(path, body)
        } else {
          result = await api.post<T>(path, body)
        }
        setState({ data: result, loading: false, error: null })
        return result
      } catch (err: unknown) {
        const msg = (err as Error).message ?? "Error desconocido"
        setState({ data: null, loading: false, error: msg })
        return null
      }
    },
    [method, path],
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, mutate, reset }
}
