// Resolves the signed-in owner's salon id (FirestoreService.getSalonForOwner), like the promotions screens do.
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { getSalonForOwner } from '@/lib/firestore'

export function useOwnerSalonId() {
  const { user } = useAuth()
  const { state } = useLocation() as { state?: { salonId?: string } | null }
  const [salonId, setSalonId] = useState<string | null>(state?.salonId ?? null)
  const [loading, setLoading] = useState(!state?.salonId)
  /** Raw error; show it via friendlyError / ErrorState, never as text. */
  const [error, setError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (salonId) return
    let alive = true
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        if (!user) throw new Error('User not authenticated')
        const salon = await getSalonForOwner(user.uid)
        if (!salon) throw new Error('No salon found for this owner')
        if (alive) setSalonId(salon.id)
      } catch (e) {
        if (alive) setError(e ?? new Error('unknown'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [user, salonId, attempt])

  return { salonId, loading, error, retry: () => setAttempt((a) => a + 1) }
}
