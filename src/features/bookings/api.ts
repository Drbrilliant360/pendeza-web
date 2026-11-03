// Data access for the bookings group: BookingRepositoryImpl, AppointmentsRepositoryImpl,
// NotificationRepository and ProfileRepositoryImpl (same collections / fields / query shapes).
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import * as fs from '@/lib/firestore'
import {
  parseNotificationType,
  toDate,
  type AppointmentModel,
  type Gender,
  type NotificationType,
  type SalonModel,
  type ServiceModel,
} from '@/lib/models'
import { compressImage, uploadFile } from '@/lib/storage'

// ── booking ──────────────────────────────────────────────────────────────────
/** FirestoreService.createAppointment: waits up to 10s for the server ack, then proceeds optimistically. */
export async function createAppointment(a: {
  clientId: string
  salonId: string
  serviceIds: string[]
  startTime: Date
  durationMinutes: number
  totalPrice: number
  status: string
}): Promise<string> {
  const ref = doc(collection(db, 'appointments'))
  const write = setDoc(ref, {
    clientId: a.clientId,
    salonId: a.salonId,
    staffId: null,
    serviceIds: a.serviceIds,
    startTime: Timestamp.fromDate(a.startTime),
    durationMinutes: a.durationMinutes,
    totalPrice: a.totalPrice,
    status: a.status,
    createdAt: serverTimestamp(),
  })
  write.catch((e) => console.error(`Error creating appointment ${ref.id}`, e))
  await Promise.race([write, new Promise((r) => setTimeout(r, 10000))])
  return ref.id
}

// ── appointments (appointment_with_details.dart) ─────────────────────────────
export interface AppointmentWithDetails {
  appointment: AppointmentModel
  salon: SalonModel
  services: ServiceModel[]
}
export const serviceNames = (d: AppointmentWithDetails) => d.services.map((s) => s.name).join(', ')

/** AppointmentsRepositoryImpl.getAppointments – skips appointments whose salon/services can't be loaded. */
export async function getAppointmentsWithDetails(clientId: string): Promise<AppointmentWithDetails[]> {
  let raw: AppointmentModel[]
  try {
    raw = await fs.getAppointmentsForClient(clientId)
  } catch (e) {
    console.error('Error fetching appointments for client', e)
    raw = []
  }
  if (raw.length === 0) return []

  const salonMap = new Map<string, SalonModel>()
  await Promise.all(
    [...new Set(raw.map((a) => a.salonId))].map(async (id) => {
      try {
        const s = await fs.getSalonById(id)
        if (s) salonMap.set(id, s)
      } catch (e) {
        console.error(`Failed to fetch salon ${id}`, e)
      }
    }),
  )
  const serviceMap = new Map<string, ServiceModel>()
  await Promise.all(
    [...new Set(raw.flatMap((a) => a.serviceIds))].map(async (id) => {
      try {
        const s = await fs.getServiceById(id)
        if (s) serviceMap.set(id, s)
      } catch (e) {
        console.error(`Failed to fetch service ${id}`, e)
      }
    }),
  )

  const out: AppointmentWithDetails[] = []
  for (const appointment of raw) {
    const salon = salonMap.get(appointment.salonId)
    if (!salon) continue
    const services: ServiceModel[] = []
    let all = true
    for (const id of appointment.serviceIds) {
      const s = serviceMap.get(id)
      if (!s) {
        all = false
        break
      }
      services.push(s)
    }
    if (all) out.push({ appointment, salon, services })
  }
  return out
}

// ── notifications (collections 'notifications' + 'notification_inbox') ───────
export interface NotificationModel {
  id: string
  userId: string
  title: string
  body: string
  type: NotificationType
  createdAt: Date
  isRead: boolean
  readAt: Date | null
  imageUrl: string | null
  actionRoute: string | null
  actionLabel: string | null
  data: Record<string, unknown> | null
  isBroadcast: boolean
}

const asStr = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const asObj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Timestamp) ? (v as Record<string, unknown>) : null

export function notificationFromDoc(d: DocumentSnapshot<DocumentData>): NotificationModel {
  const m = d.data() ?? {}
  return {
    id: d.id,
    userId: asStr(m.userId) ?? '',
    title: asStr(m.title) ?? 'Notification',
    body: asStr(m.body) ?? '',
    type: parseNotificationType(m.type),
    createdAt: toDate(m.createdAt),
    isRead: m.isRead === true,
    readAt: m.readAt != null ? toDate(m.readAt) : null,
    imageUrl: asStr(m.imageUrl),
    actionRoute: asStr(m.actionRoute),
    actionLabel: asStr(m.actionLabel),
    data: asObj(m.data),
    isBroadcast: false,
  }
}

function notificationFromBroadcast(d: DocumentSnapshot<DocumentData>, userId: string, isRead: boolean): NotificationModel {
  const m = d.data() ?? {}
  const customData = asObj(m.customData)
  let route = asStr(m.route)
  if (!route) route = asStr(customData?.route)
  return {
    id: `broadcast_${d.id}`,
    userId,
    title: asStr(m.title) ?? 'Announcement',
    body: asStr(m.body) ?? '',
    type: parseNotificationType(m.type),
    createdAt: toDate(m.sentAt),
    isRead,
    readAt: null,
    imageUrl: asStr(m.imageUrl),
    actionRoute: route,
    actionLabel: asStr(customData?.actionLabel),
    data: customData,
    isBroadcast: true,
  }
}

export const firestoreId = (n: NotificationModel) =>
  n.isBroadcast && n.id.startsWith('broadcast_') ? n.id.slice('broadcast_'.length) : n.id

const notificationsCol = () => collection(db, 'notifications')
const inboxCol = () => collection(db, 'notification_inbox')
const thirtyDaysAgo = () => Timestamp.fromDate(new Date(Date.now() - 30 * 86400000))

function relevantBroadcast(target: unknown, role: string | null) {
  const t = typeof target === 'string' ? target : 'all'
  if (t === 'all' || role == null) return true
  return (t === 'clients' && role === 'client') || (t === 'owners' && role === 'owner')
}

async function getReadBroadcastIds(userId: string): Promise<Set<string>> {
  try {
    const snap = await getDocs(query(collectionGroup(db, 'readBy'), where('userId', '==', userId)))
    const ids = new Set<string>()
    snap.docs.forEach((d) => {
      const parent = d.ref.parent.parent
      if (parent) ids.add(parent.id)
    })
    return ids
  } catch (e) {
    console.error('Error getting read broadcast IDs', e)
    return new Set()
  }
}

function recentBroadcastsQuery() {
  return query(inboxCol(), where('sentAt', '>', thirtyDaysAgo()), orderBy('sentAt', 'desc'), qLimit(30))
}

/** NotificationRepository.getNotifications (personal + broadcasts, newest first, max 80). */
export async function getNotifications(userId: string, userRole: string | null = null): Promise<NotificationModel[]> {
  try {
    const [personal, broadcasts, readIds] = await Promise.all([
      getDocs(query(notificationsCol(), where('userId', '==', userId), orderBy('createdAt', 'desc'), qLimit(50))),
      getDocs(recentBroadcastsQuery()),
      getReadBroadcastIds(userId),
    ])
    const all = [
      ...personal.docs.map(notificationFromDoc),
      ...broadcasts.docs
        .filter((d) => relevantBroadcast(d.get('targetAudience'), userRole))
        .map((d) => notificationFromBroadcast(d, userId, readIds.has(d.id))),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return all.slice(0, 80)
  } catch (e) {
    console.error('Error fetching merged notifications', e)
    return []
  }
}

/** NotificationRepository.getUnreadCount */
export async function getUnreadCount(userId: string, userRole: string | null = null): Promise<number> {
  try {
    const personal = await getCountFromServer(
      query(notificationsCol(), where('userId', '==', userId), where('isRead', '==', false)),
    )
    const [broadcasts, readIds] = await Promise.all([getDocs(recentBroadcastsQuery()), getReadBroadcastIds(userId)])
    const broadcastUnread = broadcasts.docs.filter(
      (d) => relevantBroadcast(d.get('targetAudience'), userRole) && !readIds.has(d.id),
    ).length
    return personal.data().count + broadcastUnread
  } catch (e) {
    console.error('Error getting merged unread count', e)
    return 0
  }
}

export function streamNotifications(userId: string, cb: (list: NotificationModel[]) => void) {
  return onSnapshot(
    query(notificationsCol(), where('userId', '==', userId), orderBy('createdAt', 'desc'), qLimit(50)),
    (snap) => cb(snap.docs.map(notificationFromDoc)),
    (e) => console.error('notifications stream', e),
  )
}

export function streamUnreadCount(userId: string, cb: (count: number) => void) {
  return onSnapshot(
    query(notificationsCol(), where('userId', '==', userId), where('isRead', '==', false)),
    (snap) => cb(snap.docs.length),
    (e) => console.error('unread stream', e),
  )
}

export async function markAsRead(notificationId: string) {
  if (notificationId.startsWith('broadcast_')) return
  await updateDoc(doc(notificationsCol(), notificationId), { isRead: true, readAt: serverTimestamp() })
}

export async function markBroadcastAsRead(broadcastDocId: string, userId: string) {
  try {
    await setDoc(doc(db, 'notification_inbox', broadcastDocId, 'readBy', userId), {
      userId,
      readAt: serverTimestamp(),
    })
  } catch (e) {
    console.error('Error marking broadcast as read', e)
  }
}

export async function markAllAsRead(userId: string) {
  const snap = await getDocs(query(notificationsCol(), where('userId', '==', userId), where('isRead', '==', false)))
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { isRead: true, readAt: serverTimestamp() }))
  await batch.commit()
  const broadcasts = await getDocs(query(inboxCol(), where('sentAt', '>', thirtyDaysAgo())))
  const readBatch = writeBatch(db)
  broadcasts.docs.forEach((d) =>
    readBatch.set(doc(d.ref, 'readBy', userId), { userId, readAt: serverTimestamp() }),
  )
  await readBatch.commit()
}

export async function deleteNotification(notificationId: string) {
  if (notificationId.startsWith('broadcast_')) return
  await deleteDoc(doc(notificationsCol(), notificationId))
}

export async function deleteAllNotifications(userId: string) {
  const snap = await getDocs(query(notificationsCol(), where('userId', '==', userId)))
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

// ── profile (ProfileRepositoryImpl) ──────────────────────────────────────────
export interface ProfileStats {
  totalBookings: number
  totalReviews: number
  totalFavorites: number
}

export async function getUserStats(userId: string): Promise<ProfileStats> {
  const bookingsQ = query(collection(db, 'appointments'), where('clientId', '==', userId))
  const reviewsQ = query(collection(db, 'reviews'), where('userId', '==', userId))
  const favoritesQ = collection(db, 'users', userId, 'favorites')
  try {
    const [b, r, f] = await Promise.all([
      getCountFromServer(bookingsQ),
      getCountFromServer(reviewsQ),
      getCountFromServer(favoritesQ),
    ])
    return { totalBookings: b.data().count, totalReviews: r.data().count, totalFavorites: f.data().count }
  } catch (e) {
    console.warn('ProfileRepo: aggregate query failed, falling back to regular queries', e)
    try {
      const [b, r, f] = await Promise.all([
        getDocs(query(bookingsQ, qLimit(1000))),
        getDocs(query(reviewsQ, qLimit(1000))),
        getDocs(query(favoritesQ, qLimit(1000))),
      ])
      return { totalBookings: b.size, totalReviews: r.size, totalFavorites: f.size }
    } catch (e2) {
      console.error('ProfileRepo: failed to fetch stats', e2)
      return { totalBookings: 0, totalReviews: 0, totalFavorites: 0 }
    }
  }
}

/** Uploads to profile_pictures/{uid}/profile_pic.jpg and stores the URL on users/{uid}. */
export async function updateProfileImage(userId: string, file: File, onProgress?: (pct: number) => void): Promise<string> {
  try {
    const blob = await compressImage(file, 800, 0.8)
    const url = await uploadFile(`profile_pictures/${userId}/profile_pic.jpg`, blob, onProgress)
    await updateDoc(doc(db, 'users', userId), { profilePictureUrl: url, updatedAt: serverTimestamp() })
    return url
  } catch (e) {
    console.error('ProfileRepo: failed to upload image', e)
    throw e // mapped to friendly text by the UI (toastError)
  }
}

export async function updateProfileData(
  userId: string,
  data: { fullName: string; phoneNumber: string; gender: Gender | null },
) {
  try {
    await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() })
  } catch (e) {
    console.error('ProfileRepo: failed to update profile data', e)
    throw e // mapped to friendly text by the UI (toastError)
  }
}
