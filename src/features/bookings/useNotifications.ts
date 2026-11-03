// Port of 2_client_notifications NotificationBloc as a hook (load, realtime personal stream,
// mark read / all read, delete with a 4s undo window, delete all).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { friendlyError } from '@/lib/errors'
import * as api from './api'
import type { NotificationModel } from './api'

export const UNDO_WINDOW_MS = 4000

type NState =
  | { kind: 'initial' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string; hint?: string }
  | { kind: 'loaded'; notifications: NotificationModel[]; unreadCount: number }

const byNewest = (a: NotificationModel, b: NotificationModel) => b.createdAt.getTime() - a.createdAt.getTime()

export interface NotificationHookOptions {
  /** Called when a user-initiated action fails (so the screen can show a friendly toast). */
  onError?: (e: unknown, context: string, retry?: () => void) => void
}

export function useNotifications(opts: NotificationHookOptions = {}) {
  const onErrorRef = useRef(opts.onError)
  onErrorRef.current = opts.onError
  const report = (e: unknown, context: string, retry?: () => void) => {
    console.error(context, e)
    onErrorRef.current?.(e, context, retry)
  }
  const { status, user } = useAuth()
  const uid = status === 'authenticated' && user && !user.isGuest ? user.uid : null
  // Dart's _currentUserRole returns null → broadcasts are shown regardless of role.
  const role: string | null = null

  const [state, setStateRaw] = useState<NState>({ kind: 'initial' })
  const ref = useRef<NState>(state)
  const set = useCallback((s: NState) => {
    ref.current = s
    setStateRaw(s)
  }, [])
  const pending = useRef(new Map<string, { n: NotificationModel; timer: ReturnType<typeof setTimeout> }>())

  const withoutPending = (list: NotificationModel[]) => (pending.current.size ? list.filter((n) => !pending.current.has(n.id)) : list)
  const minusPendingUnread = (count: number) =>
    Math.max(0, count - [...pending.current.values()].filter((p) => !p.n.isRead && !p.n.isBroadcast).length)

  const fetchAll = useCallback(async (u: string) => {
    const notifications = await api.getNotifications(u, role)
    const unreadCount = await api.getUnreadCount(u, role)
    return { notifications, unreadCount }
  }, [role])

  const load = useCallback(async () => {
    if (!uid) {
      set({ kind: 'error', message: 'Please sign in to see your notifications.' })
      return
    }
    set({ kind: 'loading' })
    try {
      const r = await fetchAll(uid)
      set({ kind: 'loaded', notifications: withoutPending(r.notifications), unreadCount: minusPendingUnread(r.unreadCount) })
    } catch (e) {
      console.error('Error loading notifications', e)
      const f = friendlyError(e, "We couldn't load your notifications.")
      set({ kind: 'error', message: f.message, hint: f.hint })
    }
     
  }, [uid, fetchAll, set])

  /** Resolves true on success; throws on failure so the caller can show feedback. */
  const refresh = useCallback(async () => {
    if (!uid) return
    const r = await fetchAll(uid)
    set({ kind: 'loaded', notifications: withoutPending(r.notifications), unreadCount: minusPendingUnread(r.unreadCount) })
  }, [uid, fetchAll, set])

  // Load + realtime personal streams while authenticated.
  useEffect(() => {
    if (!uid) {
      set({ kind: 'initial' })
      return
    }
    void load()
    const unsubList = api.streamNotifications(uid, (personal) => {
      const cur = ref.current
      if (cur.kind !== 'loaded') return
      const broadcasts = cur.notifications.filter((n) => n.isBroadcast)
      set({ ...cur, notifications: [...withoutPending(personal), ...broadcasts].sort(byNewest) })
    })
    const unsubCount = api.streamUnreadCount(uid, (count) => {
      const cur = ref.current
      if (cur.kind === 'loaded') set({ ...cur, unreadCount: minusPendingUnread(count) })
    })
    return () => {
      unsubList()
      unsubCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  // close(): finish deletes that weren't undone.
  useEffect(() => {
    const map = pending.current
    return () => {
      map.forEach((p) => {
        clearTimeout(p.timer)
        if (!p.n.isBroadcast) api.deleteNotification(p.n.id).catch((e) => console.error('Error deleting notification', e))
      })
      map.clear()
    }
  }, [])

  const markAsRead = useCallback(
    async (id: string) => {
      const cur = ref.current
      if (cur.kind !== 'loaded' || !uid) return
      const n = cur.notifications.find((x) => x.id === id)
      if (!n || n.isRead) return
      // Optimistic: mark read immediately, roll back on failure.
      set({
        ...cur,
        notifications: cur.notifications.map((x) => (x.id === id ? { ...x, isRead: true } : x)),
        unreadCount: Math.max(0, cur.unreadCount - 1),
      })
      try {
        if (n.isBroadcast) await api.markBroadcastAsRead(api.firestoreId(n), uid)
        else await api.markAsRead(id)
      } catch (e) {
        const now = ref.current
        if (now.kind === 'loaded')
          set({
            ...now,
            notifications: now.notifications.map((x) => (x.id === id ? { ...x, isRead: false } : x)),
            unreadCount: now.unreadCount + 1,
          })
        report(e, "Couldn't mark the notification as read")
      }
    },
     
    [uid, set],
  )

  /** Optimistic; rolls back and rethrows on failure so the caller can show feedback. */
  const markAllAsRead = useCallback(async () => {
    const before = ref.current
    if (!uid || before.kind !== 'loaded') return
    set({ ...before, notifications: before.notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 })
    try {
      await api.markAllAsRead(uid)
    } catch (e) {
      const now = ref.current
      if (now.kind === 'loaded') {
        const wasUnread = new Set(before.notifications.filter((n) => !n.isRead).map((n) => n.id))
        set({
          ...now,
          notifications: now.notifications.map((n) => (wasUnread.has(n.id) ? { ...n, isRead: false } : n)),
          unreadCount: before.unreadCount,
        })
      }
      throw e
    }
  }, [uid, set])

  const reinsert = useCallback(
    (n: NotificationModel) => {
      const now = ref.current
      if (now.kind !== 'loaded') return
      set({ ...now, notifications: [...now.notifications, n].sort(byNewest), unreadCount: now.unreadCount + (n.isRead ? 0 : 1) })
    },
    [set],
  )

  const commitDelete = useCallback(
    async (id: string) => {
      const p = pending.current.get(id)
      if (!p) return
      try {
        if (!p.n.isBroadcast) await api.deleteNotification(id)
        pending.current.delete(id)
      } catch (e) {
        pending.current.delete(id)
        reinsert(p.n)
        report(e, "Couldn't delete the notification")
      }
    },
     
    [reinsert],
  )

  const deleteNotification = useCallback(
    (id: string) => {
      const cur = ref.current
      if (cur.kind !== 'loaded' || pending.current.has(id)) return
      const n = cur.notifications.find((x) => x.id === id)
      if (!n) return
      pending.current.set(id, { n, timer: setTimeout(() => void commitDelete(id), UNDO_WINDOW_MS) })
      set({
        ...cur,
        notifications: cur.notifications.filter((x) => x.id !== id),
        unreadCount: n.isRead ? cur.unreadCount : Math.max(0, cur.unreadCount - 1),
      })
    },
    [commitDelete, set],
  )

  const undoDelete = useCallback(
    (id: string) => {
      const p = pending.current.get(id)
      if (!p) return
      clearTimeout(p.timer)
      pending.current.delete(id)
      reinsert(p.n)
    },
    [reinsert],
  )

  /** Rethrows on failure so the caller can show feedback. */
  const deleteAll = useCallback(async () => {
    if (!uid) return
    await api.deleteAllNotifications(uid)
    pending.current.forEach((p) => clearTimeout(p.timer))
    pending.current.clear()
    const cur = ref.current
    set({
      kind: 'loaded',
      notifications: cur.kind === 'loaded' ? cur.notifications.filter((n) => n.isBroadcast).map((n) => ({ ...n, isRead: true })) : [],
      unreadCount: 0,
    })
  }, [uid, set])

  return { state, load, refresh, markAsRead, markAllAsRead, deleteNotification, undoDelete, deleteAll }
}

/**
 * Live unread badge count (personal + unread broadcasts, then kept fresh by the personal
 * unread stream) – for other groups' bell icons.
 */
export function useUnreadNotificationCount(): number {
  const { status, user } = useAuth()
  const uid = status === 'authenticated' && user && !user.isGuest ? user.uid : null
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!uid) {
      setCount(0)
      return
    }
    let alive = true
    let personal = 0
    let broadcastUnread = 0
    const emit = () => alive && setCount(personal + broadcastUnread)
    const unsub = api.streamUnreadCount(uid, (c) => {
      personal = c
      emit()
    })
    // Background badge count: failures are non-critical and stay silent (logged only).
    void api
      .getNotifications(uid)
      .then((list) => {
        broadcastUnread = list.filter((n) => n.isBroadcast && !n.isRead).length
        emit()
      })
      .catch((e) => console.error('Error loading broadcast unread count', e))
    return () => {
      alive = false
      unsub()
    }
  }, [uid])
  return count
}
