// Data access for the owner dashboard / schedule / services / clients / analytics group.
// Ports of owner_dashboard_repository_impl.dart, services_repository_impl.dart (+ FirestoreService
// service writes), client_management_repository_impl_new.dart, the owner calendar bloc and analytic_bloc.dart.
// Query shapes match the Dart code exactly so existing composite indexes + rules keep working.
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as qLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getServiceById, getServicesForSalon, getUserProfile } from '@/lib/firestore'
import {
  AppointmentStatus,
  appointmentFromDoc,
  type AppointmentModel,
  type SalonModel,
  type ServiceModel,
  type UserModel,
} from '@/lib/models'

// ── date helpers (Dart DateTime semantics) ───────────────────────────────────
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds())
/** Dart DateTime.weekday: Monday = 1 … Sunday = 7 */
export const dartWeekday = (d: Date) => d.getDay() || 7

const apptCol = () => collection(db, 'appointments')

// ── users / services lookups (FirestoreService.getUserDetails / getServiceDetails) ──
const userCache = new Map<string, Promise<UserModel>>()
/** Throws when the user doc does not exist (same as FirestoreService.getUserDetails). */
export function getUserDetails(uid: string, useCache = true): Promise<UserModel> {
  const load = async () => {
    const u = await getUserProfile(uid)
    if (!u) throw new Error(`User not found with UID: ${uid}`)
    return u
  }
  if (!useCache) return load()
  let p = userCache.get(uid)
  if (!p) {
    p = load()
    userCache.set(uid, p)
    p.catch(() => userCache.delete(uid))
  }
  return p
}

export async function getServiceDetails(serviceId: string): Promise<ServiceModel> {
  const s = await getServiceById(serviceId)
  if (!s) throw new Error('Service not found')
  return s
}

// ── OwnerDashboardRepositoryImpl ─────────────────────────────────────────────
// Note: the Dart repositories swallowed query errors and returned []/0. Here they propagate, so the
// dashboard / analytics / clients screens show an error with Retry instead of misleading zeros.
export async function getAppointmentsForDate(salonId: string, date: Date): Promise<AppointmentModel[]> {
  const snap = await getDocs(
    query(
      apptCol(),
      where('salonId', '==', salonId),
      where('startTime', '>=', Timestamp.fromDate(startOfDay(date))),
      where('startTime', '<=', Timestamp.fromDate(endOfDay(date))),
    ),
  )
  return snap.docs.map(appointmentFromDoc)
}

export async function getAppointmentsForDateRange(salonId: string, startDate: Date, endDate: Date): Promise<AppointmentModel[]> {
  const snap = await getDocs(
    query(
      apptCol(),
      where('salonId', '==', salonId),
      where('startTime', '>=', Timestamp.fromDate(startOfDay(startDate))),
      where('startTime', '<=', Timestamp.fromDate(endOfDay(endDate))),
    ),
  )
  return snap.docs.map(appointmentFromDoc)
}

export async function getNewClientsCount(salonId: string, startDate: Date, endDate: Date): Promise<number> {
  const start = startOfDay(startDate)
  const [recent, previous] = await Promise.all([
    getDocs(
      query(
        apptCol(),
        where('salonId', '==', salonId),
        where('startTime', '>=', Timestamp.fromDate(start)),
        where('startTime', '<=', Timestamp.fromDate(endOfDay(endDate))),
      ),
    ),
    getDocs(query(apptCol(), where('salonId', '==', salonId), where('startTime', '<', Timestamp.fromDate(start)))),
  ])
  const recentClients = new Set(recent.docs.map((d) => appointmentFromDoc(d).clientId))
  const previousClients = new Set(previous.docs.map((d) => appointmentFromDoc(d).clientId))
  let n = 0
  recentClients.forEach((c) => {
    if (!previousClients.has(c)) n++
  })
  return n
}

// ── Dashboard (OwnerDashboardBloc._fetchDashboardData) ──────────────────────
export interface GoLiveChecklist {
  hasPhoto: boolean
  hasHours: boolean
  hasPhone: boolean
  hasService: boolean
  verificationStatus: string
  rejectionReason: string | null
}
export const checklistHelpers = {
  isComplete: (c: GoLiveChecklist) => c.hasPhoto && c.hasHours && c.hasPhone && c.hasService,
  isPending: (c: GoLiveChecklist) => c.verificationStatus === 'pending',
  isApproved: (c: GoLiveChecklist) => c.verificationStatus === 'approved',
  isRejected: (c: GoLiveChecklist) => c.verificationStatus === 'rejected',
  isListed: (c: GoLiveChecklist) => c.verificationStatus === 'approved',
}

function buildChecklist(salon: SalonModel, services: ServiceModel[]): GoLiveChecklist {
  return {
    hasPhoto: !!salon.primaryImage?.trim() || (salon.imageGallery != null && salon.imageGallery.length > 0),
    hasHours: salon.openingTime != null && salon.closingTime != null,
    hasPhone: !!salon.phoneNumber?.trim() || !!salon.whatsappNumber?.trim(),
    hasService: services.some((s) => s.isActive),
    verificationStatus: salon.verificationStatus,
    rejectionReason: salon.rejectionReason,
  }
}

export interface DashboardStats {
  todayRevenue: number
  todayAppointmentsCount: number
  newClientsThisWeek: number
  occupancyRate: number
  upcomingToday: AppointmentModel[]
  upcomingAll: AppointmentModel[]
  lastUpdated: Date
}
export interface DashboardData {
  stats: DashboardStats
  salonName: string
  checklist: GoLiveChecklist
}

function calculateOccupancyRate(appointments: AppointmentModel[], openingTime: string, closingTime: string): number {
  try {
    const [oh, om] = openingTime.split(':').map((x) => parseInt(x, 10))
    const [ch, cm] = closingTime.split(':').map((x) => parseInt(x, 10))
    if ([oh, om, ch, cm].some((x) => Number.isNaN(x))) throw new Error('bad time')
    const total = ch * 60 + cm - (oh * 60 + om)
    if (total <= 0) return 0
    const booked = appointments.reduce((s, a) => s + a.durationMinutes, 0)
    const rate = (booked / total) * 100
    return rate > 100 ? 100 : rate
  } catch {
    return 0
  }
}

export async function loadDashboard(salon: SalonModel): Promise<DashboardData> {
  const now = new Date()
  const today = startOfDay(now)
  const startOfWeek = addDays(today, -(dartWeekday(today) - 1))
  const endOfWeek = addDays(startOfWeek, 6)
  const next7Days = addDays(today, 7)

  const [todayAppointments, newClientsCount, weekAppointments, services] = await Promise.all([
    getAppointmentsForDate(salon.id, today),
    getNewClientsCount(salon.id, startOfWeek, endOfWeek),
    getAppointmentsForDateRange(salon.id, today, next7Days),
    getServicesForSalon(salon.id),
  ])

  const lower = (a: AppointmentModel) => a.status.toLowerCase()
  const todayRevenue = todayAppointments
    .filter((a) => lower(a) === 'completed' || lower(a) === 'confirmed')
    .reduce((s, a) => s + a.totalPrice, 0)
  const notCancelled = todayAppointments.filter((a) => lower(a) !== 'cancelled')
  const upcomingToday = notCancelled.filter((a) => a.startTime > now).sort((a, b) => +a.startTime - +b.startTime)
  const upcomingAll = weekAppointments
    .filter((a) => a.startTime > now && lower(a) !== 'cancelled' && lower(a) !== 'payment failed')
    .sort((a, b) => +a.startTime - +b.startTime)

  return {
    salonName: salon.salonName,
    checklist: buildChecklist(salon, services),
    stats: {
      todayRevenue,
      todayAppointmentsCount: notCancelled.length,
      newClientsThisWeek: newClientsCount,
      occupancyRate: calculateOccupancyRate(notCancelled, salon.openingTime ?? '08:00', salon.closingTime ?? '20:00'),
      upcomingToday: upcomingToday.slice(0, 5),
      upcomingAll: upcomingAll.slice(0, 10),
      lastUpdated: new Date(),
    },
  }
}

// ── Calendar (AppointmentsRepository.getConfirmedAppointmentsForSalon) ──────
export async function getConfirmedAppointmentsForSalon(salonId: string, date: Date): Promise<AppointmentModel[]> {
  const snap = await getDocs(
    query(
      apptCol(),
      where('salonId', '==', salonId),
      where('startTime', '>=', Timestamp.fromDate(startOfDay(date))),
      where('startTime', '<=', Timestamp.fromDate(endOfDay(date))),
      orderBy('startTime', 'asc'),
    ),
  )
  const rank = (m: AppointmentModel) => {
    if (m.status === AppointmentStatus.cancelled || m.status === AppointmentStatus.paymentFailed) return 2
    if (m.status === AppointmentStatus.completed || m.status === AppointmentStatus.noShow) return 1
    return 0
  }
  return snap.docs
    .map(appointmentFromDoc)
    .sort((a, b) => rank(a) - rank(b) || +a.startTime - +b.startTime)
}

// ── Services (FirestoreService.addService / updateService / deleteService) ──
export type ServiceDraft = Omit<ServiceModel, 'id' | 'createdAt' | 'updatedAt' | 'depositAmount' | 'maxDailyBookings'> & {
  depositAmount?: number | null
  maxDailyBookings?: number | null
}

/** ServiceModel.toFirestore() on a new doc */
export async function addService(s: ServiceDraft): Promise<void> {
  const ref = doc(collection(db, 'services'))
  const data: DocumentData = {
    salonId: s.salonId,
    name: s.name,
    description: s.description,
    price: s.price,
    durationMinutes: s.durationMinutes,
    category: s.category,
    isActive: s.isActive,
    ...(s.imageUrl != null ? { imageUrl: s.imageUrl } : {}),
    bookingsCount: s.bookingsCount,
    ...(s.discountedPrice != null ? { discountedPrice: s.discountedPrice } : {}),
    tags: s.tags,
    isFeatured: s.isFeatured,
    sortOrder: s.sortOrder,
    ...(s.staffNote != null ? { staffNote: s.staffNote } : {}),
    requiresDeposit: s.requiresDeposit,
    ...(s.depositAmount != null ? { depositAmount: s.depositAmount } : {}),
    ...(s.maxDailyBookings != null ? { maxDailyBookings: s.maxDailyBookings } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(ref, data)
}

/** Same field subset FirestoreService.updateService writes. */
export async function updateService(s: Pick<ServiceModel, 'id' | 'name' | 'description' | 'price' | 'durationMinutes' | 'category' | 'isActive'>) {
  await updateDoc(doc(db, 'services', s.id), {
    name: s.name,
    description: s.description,
    price: s.price,
    durationMinutes: s.durationMinutes,
    category: s.category,
    isActive: s.isActive,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteService(serviceId: string) {
  await deleteDoc(doc(db, 'services', serviceId))
}

/** /data/beauty_services.json (ServiceCategory / ServiceDefinition) */
export interface ServiceDefinition {
  name: string
  description: string
  defaultDuration: number | null
  defaultPrice: number | null
}
export interface ServiceCategoryDef {
  category: string
  icon: string | null
  services: ServiceDefinition[]
}
export async function loadServiceDefinitions(): Promise<ServiceCategoryDef[]> {
  const res = await fetch('/data/beauty_services.json')
  if (!res.ok) throw new Error('Could not load service definitions')
  const data = (await res.json()) as unknown[]
  return data.map((raw) => {
    const c = (raw ?? {}) as Record<string, unknown>
    const list = Array.isArray(c.services) ? (c.services as Record<string, unknown>[]) : []
    return {
      category: typeof c.category === 'string' ? c.category : '',
      icon: typeof c.icon === 'string' ? c.icon : null,
      services: list.map((s) => ({
        name: typeof s.name === 'string' ? s.name : '',
        description: typeof s.description === 'string' ? s.description : '',
        defaultDuration: typeof s.defaultDuration === 'number' ? Math.trunc(s.defaultDuration) : null,
        defaultPrice: typeof s.defaultPrice === 'number' ? s.defaultPrice : null,
      })),
    }
  })
}

// ── Clients (ClientManagementRepositoryImpl) ────────────────────────────────
export interface RegularClient {
  id: string
  name: string
  phone: string | null
  photoUrl: string | null
  lastVisit: Date
  visitCount: number
}
export function lastVisitFormatted(c: RegularClient): string {
  const days = Math.floor((Date.now() - c.lastVisit.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 60) return '1mo ago'
  return `${Math.floor(days / 30)}mo ago`
}

const toRegular = (u: UserModel, lastVisit: Date, visits: number): RegularClient => ({
  id: u.uid,
  name: u.fullName,
  phone: u.phoneNumber,
  photoUrl: u.profilePictureUrl,
  lastVisit,
  visitCount: visits,
})

export async function getRegularClients(salonId: string): Promise<RegularClient[]> {
  const snap = await getDocs(query(apptCol(), where('salonId', '==', salonId), where('status', '==', 'Completed')))
  const visitsByClient = new Map<string, Date[]>()
  for (const d of snap.docs) {
    const a = appointmentFromDoc(d)
    const list = visitsByClient.get(a.clientId) ?? []
    list.push(a.startTime)
    visitsByClient.set(a.clientId, list)
  }
  const candidates = [...visitsByClient.entries()].filter(([, v]) => v.length >= 2)
  const results = await Promise.all(
    candidates.map(async ([clientId, visits]) => {
      try {
        const u = await getUserDetails(clientId, false)
        const last = visits.reduce((m, v) => (v > m ? v : m), visits[0])
        return toRegular(u, last, visits.length)
      } catch {
        return null
      }
    }),
  )
  return results
    .filter((r): r is RegularClient => r != null)
    .sort((a, b) => b.visitCount - a.visitCount || +b.lastVisit - +a.lastVisit)
    .slice(0, 8)
}

export async function getRecentBookings(salonId: string): Promise<AppointmentModel[]> {
  const snap = await getDocs(query(apptCol(), where('salonId', '==', salonId), orderBy('createdAt', 'desc'), qLimit(10)))
  return snap.docs.map(appointmentFromDoc)
}

export async function searchClients(salonId: string, q: string): Promise<RegularClient[]> {
  if (!q) return []
  const snap = await getDocs(query(apptCol(), where('salonId', '==', salonId)))
  const all = snap.docs.map(appointmentFromDoc)
  const ids = [...new Set(all.map((a) => a.clientId))]
  const lq = q.toLowerCase()
  const results = await Promise.all(
    ids.map(async (clientId) => {
      try {
        const u = await getUserDetails(clientId, false)
        const match = u.fullName.toLowerCase().includes(lq) || (u.phoneNumber?.toLowerCase().includes(lq) ?? false)
        if (!match) return null
        const completed = all
          .filter((a) => a.clientId === clientId && a.status === 'Completed')
          .sort((a, b) => +b.startTime - +a.startTime)
        if (completed.length === 0) return null
        return toRegular(u, completed[0].startTime, completed.length)
      } catch {
        return null
      }
    }),
  )
  return results.filter((r): r is RegularClient => r != null).sort((a, b) => b.visitCount - a.visitCount)
}

// ── Analytics (AnalyticsBloc._fetchAnalytics) ───────────────────────────────
export interface AnalyticsData {
  weeklyRevenue: number[]
  servicePopularity: Map<string, number>
  topServices: [string, number][]
}

export async function loadAnalytics(salon: SalonModel): Promise<AnalyticsData> {
  const now = new Date()
  const thirtyDaysAgo = addDays(now, -30)
  const appointments = await getAppointmentsForDateRange(salon.id, thirtyDaysAgo, now)
  const services = await getServicesForSalon(salon.id)

  // Weekly revenue (Mon–Sun of the current week; `monday` keeps the current time-of-day like Dart)
  const monday = addDays(now, -(dartWeekday(now) - 1))
  const weeklyRevenue = new Array<number>(7).fill(0)
  for (const a of appointments) {
    if (a.status === 'Confirmed' && a.startTime > monday) weeklyRevenue[dartWeekday(a.startTime) - 1] += a.totalPrice
  }

  // Service popularity (last 30 days, confirmed only), keyed by service name
  const byId = new Map<string, number>()
  for (const a of appointments) {
    if (a.status !== 'Confirmed') continue
    for (const id of a.serviceIds) byId.set(id, (byId.get(id) ?? 0) + 1)
  }
  const servicePopularity = new Map<string, number>()
  byId.forEach((count, id) => {
    const name = services.find((s) => s.id === id)?.name ?? 'Unknown'
    servicePopularity.set(name, count)
  })
  const topServices = [...servicePopularity.entries()].sort((a, b) => b[1] - a[1])
  return { weeklyRevenue, servicePopularity, topServices }
}
