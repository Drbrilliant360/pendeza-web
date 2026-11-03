// Port of FavoritesBloc + FavoritesRepositoryImpl (authenticated path, users/{uid}/favorites).
// A single realtime listener per signed-in user keeps every heart in sync.
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useAuth, useRequireAuth } from '@/auth/AuthContext'
import { useFeedback } from '@/components/feedback'
import { addFavoriteSalon, removeFavoriteSalon } from '@/lib/firestore'
import { watchFavoriteSalonIds } from './api'

interface FavState {
  uid: string | null
  ids: string[]
  ready: boolean
  pending: string[]
}
let state: FavState = { uid: null, ids: [], ready: false, pending: [] }
const listeners = new Set<() => void>()
const set = (patch: Partial<FavState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
let unsub: (() => void) | null = null
let refs = 0

function attach(uid: string | null) {
  if (state.uid === uid && (unsub || !uid)) return
  unsub?.()
  unsub = null
  set({ uid, ids: [], ready: !uid, pending: [] })
  if (uid) {
    unsub = watchFavoriteSalonIds(uid, (ids) => {
      if (state.uid === uid) set({ ids, ready: true })
    })
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function useFavorites() {
  const { user, isGuest } = useAuth()
  const uid = !isGuest && user ? user.uid : null
  const requireAuth = useRequireAuth()
  const { toastSuccess, toastError } = useFeedback()

  useEffect(() => {
    refs++
    attach(uid)
    return () => {
      refs--
      if (refs === 0) {
        unsub?.()
        unsub = null
        state = { uid: null, ids: [], ready: false, pending: [] }
      }
    }
  }, [uid])

  const snap = useSyncExternalStore(subscribe, () => state)

  const toggle = useCallback(
    async (salonId: string) => {
      if (!requireAuth('favorite')) return
      if (!uid || state.pending.includes(salonId)) return
      const wasFav = state.ids.includes(salonId)
      set({ pending: [...state.pending, salonId], ids: wasFav ? state.ids.filter((i) => i !== salonId) : [salonId, ...state.ids] })
      try {
        if (wasFav) await removeFavoriteSalon(uid, salonId)
        else await addFavoriteSalon(uid, salonId)
        // Removing offers Undo (simply re-adds the favorite).
        if (wasFav) toastSuccess('Removed from favorites', { label: 'Undo', onClick: () => void toggleRef.current(salonId) })
        else toastSuccess('Added to favorites')
      } catch (e) {
        // Roll back the optimistic change.
        set({ ids: wasFav ? [salonId, ...state.ids.filter((i) => i !== salonId)] : state.ids.filter((i) => i !== salonId) })
        toastError(e, wasFav ? 'Could not remove from favorites' : 'Could not add to favorites', () => void toggleRef.current(salonId))
      } finally {
        set({ pending: state.pending.filter((p) => p !== salonId) })
      }
    },
    [uid, requireAuth, toastSuccess, toastError],
  )

  const toggleRef = useRef(toggle)
  toggleRef.current = toggle

  return {
    ids: snap.uid === uid ? snap.ids : [],
    ready: snap.uid === uid && snap.ready,
    isFavorite: (salonId: string) => snap.uid === uid && snap.ids.includes(salonId),
    isPending: (salonId: string) => snap.pending.includes(salonId),
    toggle,
  }
}
