// Data access for the discovery group: PromotionsService, VideoShortsRepository,
// AppointmentsRepository.getAppointments (dashboard "Up next"), NotificationRepository
// unread badge, favorites stream and the ReviewsRepository wrappers.
import {
  collection,
  collectionGroup,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import * as fs from '@/lib/firestore'
import {
  AppointmentStatus,
  type AppointmentModel,
  type ReviewModel,
  type SalonModel,
  type ServiceModel,
} from '@/lib/models'
import { promotionFromDoc, videoFromDoc, isPromotionValid, type PromotionModel, type SalonVideoModel } from './types'

// ── Promotions (PromotionsService.getDashboardPromotions) ────────────────────
async function getPlatformPromotions(): Promise<PromotionModel[]> {
  const snap = await getDocs(
    query(
      collection(db, 'promotions'),
      where('isActive', '==', true),
      where('endDate', '>', Timestamp.now()),
      orderBy('endDate'),
    ),
  )
  const promos = snap.docs.map((d) => promotionFromDoc(d))
  promos.sort((a, b) => b.priority - a.priority)
  return promos
}

async function getFeaturedSalonPromotions(): Promise<PromotionModel[]> {
  const featuredSnap = await getDocs(
    query(
      collectionGroup(db, 'promotions'),
      where('isFeatured', '==', true),
      where('isActive', '==', true),
      where('endDate', '>', Timestamp.now()),
      limit(10),
    ),
  )
  return featuredSnap.docs.map((d) => promotionFromDoc(d, d.ref.parent.parent?.id ?? null))
}

/**
 * A failing source is skipped (as in the app) so the carousel still shows what loaded;
 * only when every source fails does this throw, letting the dashboard offer a Retry.
 */
export async function getDashboardPromotions(): Promise<PromotionModel[]> {
  const [platformRes, featuredRes] = await Promise.allSettled([getPlatformPromotions(), getFeaturedSalonPromotions()])
  if (platformRes.status === 'rejected') console.error('Error fetching platform promotions', platformRes.reason)
  if (featuredRes.status === 'rejected') console.error('Error fetching dashboard promotions', featuredRes.reason)
  if (platformRes.status === 'rejected' && featuredRes.status === 'rejected') throw platformRes.reason
  const platform = platformRes.status === 'fulfilled' ? platformRes.value : []
  const featured = featuredRes.status === 'fulfilled' ? featuredRes.value : []
  const all = [...platform, ...featured]
  all.sort((a, b) => {
    const aPlat = a.type === 'platform'
    const bPlat = b.type === 'platform'
    if (aPlat && a.priority > 0 && !bPlat) return -1
    if (bPlat && b.priority > 0 && !aPlat) return 1
    return b.priority - a.priority
  })
  // Respect PromotionModel.isValid (start date / usage limit are not part of the query).
  return all.filter((p) => isPromotionValid(p))
}

// ── Video shorts (salon_videos) ──────────────────────────────────────────────
function parseVideos(docs: Parameters<typeof videoFromDoc>[0][]): SalonVideoModel[] {
  const out: SalonVideoModel[] = []
  for (const d of docs) {
    try {
      out.push(videoFromDoc(d))
    } catch (e) {
      console.error(`[VideoShortsRepo] Parsing error on doc ${d.id}`, e)
    }
  }
  return out
}

/** Errors propagate so the stories row can show its error + Retry state. */
export async function getApprovedVideos(max = 20): Promise<SalonVideoModel[]> {
  const snap = await getDocs(query(collection(db, 'salon_videos'), orderBy('createdAt', 'desc'), limit(max)))
  return parseVideos(snap.docs)
}

/** SalonGalleryScreen._fetchVideos – errors propagate (the tab shows a retry state). */
export async function getSalonVideos(salonId: string): Promise<SalonVideoModel[]> {
  const snap = await getDocs(
    query(collection(db, 'salon_videos'), where('salonId', '==', salonId), orderBy('createdAt', 'desc')),
  )
  return snap.docs.map(videoFromDoc)
}

// ── Appointments with details (AppointmentsRepositoryImpl.getAppointments) ───
export interface AppointmentWithDetails {
  appointment: AppointmentModel
  salon: SalonModel
  services: ServiceModel[]
}
export const serviceNames = (a: AppointmentWithDetails) => a.services.map((s) => s.name).join(', ')

export async function getAppointmentsWithDetails(clientId: string): Promise<AppointmentWithDetails[]> {
  const raw = await fs.getAppointmentsForClient(clientId)
  if (!raw.length) return []
  const salonMap = new Map<string, SalonModel>()
  for (const id of new Set(raw.map((a) => a.salonId))) {
    try {
      const s = await fs.getSalonById(id)
      if (s) salonMap.set(id, s)
    } catch (e) {
      console.error(`Failed to fetch salon ${id}`, e)
    }
  }
  const serviceMap = new Map<string, ServiceModel>()
  for (const id of new Set(raw.flatMap((a) => a.serviceIds))) {
    try {
      const s = await fs.getServiceById(id)
      if (s) serviceMap.set(id, s)
    } catch (e) {
      console.error(`Failed to fetch service ${id}`, e)
    }
  }
  const out: AppointmentWithDetails[] = []
  for (const a of raw) {
    const salon = salonMap.get(a.salonId)
    if (!salon) continue
    const services: ServiceModel[] = []
    let ok = true
    for (const id of a.serviceIds) {
      const s = serviceMap.get(id)
      if (!s) {
        ok = false
        break
      }
      services.push(s)
    }
    if (ok) out.push({ appointment: a, salon, services })
  }
  return out
}

/** AppointmentsBloc: upcoming = Confirmed + start in the future (pending payment hidden while payments are off). */
export function upcomingAppointments(all: AppointmentWithDetails[], now = new Date()) {
  return all
    .filter((a) => a.appointment.status === AppointmentStatus.confirmed && a.appointment.startTime > now)
    .sort((a, b) => a.appointment.startTime.getTime() - b.appointment.startTime.getTime())
}

// ── Notifications unread badge (NotificationRepository.streamUnreadCount) ────
export function watchUnreadNotificationCount(userId: string, cb: (n: number) => void) {
  return onSnapshot(
    query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false)),
    (snap) => cb(snap.size),
    () => cb(0),
  )
}

// ── Favorites stream (FirestoreService.watchFavoriteSalonIds) ────────────────
export function watchFavoriteSalonIds(userId: string, cb: (ids: string[]) => void) {
  return onSnapshot(
    query(collection(db, 'users', userId, 'favorites'), orderBy('favoritedAt', 'desc')),
    (snap) => cb(snap.docs.map((d) => d.id)),
    () => cb([]),
  )
}

// ── Reviews (ReviewsRepositoryImpl) ──────────────────────────────────────────
export interface ReviewsData {
  reviews: ReviewModel[]
  averageRating: number
  totalReviews: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export async function loadReviews(salonId: string, sortBy: fs.ReviewSort): Promise<ReviewsData> {
  const [reviews, all] = await Promise.all([
    fs.getReviewsForSalon(salonId, sortBy),
    sortBy === 'recent' ? Promise.resolve(null) : fs.getReviewsForSalon(salonId, 'recent'),
  ])
  const base = all ?? reviews
  const avg = base.length ? Math.round((base.reduce((s, r) => s + r.rating, 0) / base.length) * 10) / 10 : 0
  const distribution: ReviewsData['distribution'] = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of base) {
    const stars = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5
    if (stars >= 1 && stars <= 5) distribution[stars] += 1
  }
  return { reviews, averageRating: avg, totalReviews: reviews.length, distribution }
}

/** ReviewsRepositoryImpl.createReview: one review per user per salon. */
export async function submitReview(p: {
  salonId: string
  userId: string
  userName: string
  userProfilePicture: string | null
  rating: number
  comment: string
}) {
  const existing = await fs.getUserReviewForSalon(p.salonId, p.userId)
  if (existing) throw new Error('You have already reviewed this salon. You can edit your existing review.')
  // Verified-booking flag: latest completed appointment at this salon, if any.
  let appointmentId: string | null = null
  try {
    appointmentId = await fs.getCompletedAppointmentIdForReview(p.salonId, p.userId)
  } catch (e) {
    console.error('Error getting completed appointment', e)
  }
  return fs.createReview({ ...p, isVerifiedBooking: !!appointmentId, appointmentId })
}
