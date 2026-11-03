import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getSalonById } from './firestore'
import type { SalonModel } from './models'

/** Generic async loader with reload (BLoC Loading/Loaded/Error equivalent). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const seq = useRef(0)
  const run = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const r = await fn()
      if (id === seq.current) setData(r)
    } catch (e) {
      console.error(e)
      if (id === seq.current) setError(e as Error)
    } finally {
      if (id === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => void run(), [run])
  return { data, error, loading, reload: run, setData }
}

/**
 * _SalonFetchWrapper / SalonDeepLinkResolver: use the salon passed in
 * navigation state (`navigate(path, { state: { salon } })`), else fetch by id.
 */
export function useSalon(salonId: string | undefined) {
  const { state } = useLocation() as { state?: { salon?: SalonModel } | null }
  const initial = state?.salon && state.salon.id === salonId ? state.salon : undefined
  const res = useAsync(async () => {
    if (initial) return initial
    if (!salonId) throw new Error('Salon not found')
    const s = await getSalonById(salonId)
    if (!s) throw new Error('Salon not found')
    return s
  }, [salonId])
  return { salon: res.data ?? initial, loading: !initial && res.loading, error: res.error, reload: res.reload }
}
