// TypeScript ports of the Flutter models in lib/shared/models + feature models.
// Field names match the Firestore documents exactly so the web app shares data with mobile.
import { Timestamp, type DocumentSnapshot, type DocumentData } from 'firebase/firestore'

// ── helpers ──────────────────────────────────────────────────────────────────
export function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d
  }
  if (v && typeof v === 'object' && 'seconds' in (v as object)) {
    return new Date((v as { seconds: number }).seconds * 1000)
  }
  return new Date()
}
export const toDateOrNull = (v: unknown): Date | null => (v == null ? null : toDate(v))
const str = (v: unknown, fb = ''): string => (typeof v === 'string' ? v : fb)
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const num = (v: unknown, fb = 0): number => (typeof v === 'number' ? v : fb)
const numOrNull = (v: unknown): number | null => (typeof v === 'number' ? v : null)
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
function firestoreBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim()
    if (['true', '1', 'yes'].includes(s)) return true
    if (['false', '0', 'no'].includes(s)) return false
  }
  return fallback
}

// ── User ─────────────────────────────────────────────────────────────────────
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type Role = 'client' | 'owner' | 'admin'

export interface UserModel {
  uid: string
  email: string
  fullName: string
  username: string | null
  phoneNumber: string | null
  profilePictureUrl: string | null
  role: Role | string | null
  gender: Gender | null
  fcmTokens: string[]
  createdAt: Date
  updatedAt: Date | null
  isGuest: boolean
}

export function userFromDoc(doc: DocumentSnapshot<DocumentData>): UserModel {
  const d = doc.data() ?? {}
  const g = strOrNull(d.gender)?.toLowerCase()
  return {
    uid: doc.id,
    email: str(d.email),
    fullName: str(d.fullName),
    username: strOrNull(d.username),
    phoneNumber: strOrNull(d.phoneNumber),
    profilePictureUrl: strOrNull(d.profilePictureUrl),
    role: strOrNull(d.role),
    gender: g ? ((['male', 'female', 'other', 'prefer_not_to_say'].includes(g) ? g : 'prefer_not_to_say') as Gender) : null,
    fcmTokens: strList(d.fcmTokens),
    createdAt: toDate(d.createdAt),
    updatedAt: toDateOrNull(d.updatedAt),
    isGuest: false,
  }
}

export function guestUser(): UserModel {
  return {
    uid: `guest_${Date.now()}`,
    email: '',
    fullName: 'Guest',
    username: null,
    phoneNumber: null,
    profilePictureUrl: null,
    role: 'client',
    gender: null,
    fcmTokens: [],
    createdAt: new Date(),
    updatedAt: null,
    isGuest: true,
  }
}

export const isAdmin = (u: UserModel | null | undefined) => !!u && u.role === 'admin' && !u.isGuest
export const hasCompleteMandatoryFields = (u: UserModel) =>
  !!u.phoneNumber && !!u.gender && !!u.fullName && u.fullName !== 'New User'

// ── Salon ────────────────────────────────────────────────────────────────────
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | string

export interface SalonModel {
  id: string
  ownerId: string
  salonName: string
  address: string
  serviceCategories: string[]
  createdAt: Date
  businessTypeIds: string[]
  businessTypeNames: string[]
  region: string | null
  district: string | null
  verificationStatus: VerificationStatus
  submittedAt: Date | null
  reviewedAt: Date | null
  rejectionReason: string | null
  primaryImage: string | null
  imageGallery: string[] | null
  phoneNumber: string | null
  whatsappNumber: string | null
  instagram: string | null
  facebook: string | null
  description: string | null
  openingTime: string | null
  closingTime: string | null
  amenities: string[] | null
  /** extra denormalised fields some docs carry (rating, reviewCount, …) */
  raw: DocumentData
}

export function salonFromDoc(doc: DocumentSnapshot<DocumentData>): SalonModel {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    ownerId: str(d.ownerId),
    salonName: str(d.salonName),
    address: str(d.address),
    serviceCategories: strList(d.serviceCategories),
    createdAt: toDate(d.createdAt),
    businessTypeIds: strList(d.businessTypeIds),
    businessTypeNames: strList(d.businessTypeNames),
    region: strOrNull(d.region),
    district: strOrNull(d.district),
    verificationStatus: str(d.verificationStatus, 'approved'),
    submittedAt: toDateOrNull(d.submittedAt),
    reviewedAt: toDateOrNull(d.reviewedAt),
    rejectionReason: strOrNull(d.rejectionReason),
    primaryImage: strOrNull(d.primaryImage),
    imageGallery: d.imageGallery != null ? strList(d.imageGallery) : null,
    phoneNumber: strOrNull(d.phoneNumber),
    whatsappNumber: strOrNull(d.whatsappNumber),
    instagram: strOrNull(d.instagram),
    facebook: strOrNull(d.facebook),
    description: strOrNull(d.description),
    openingTime: strOrNull(d.openingTime),
    closingTime: strOrNull(d.closingTime),
    amenities: d.amenities != null ? strList(d.amenities) : null,
    raw: d,
  }
}

export const salonHelpers = {
  allImages: (s: SalonModel) => [...(s.primaryImage ? [s.primaryImage] : []), ...(s.imageGallery ?? [])],
  fullLocation: (s: SalonModel) => (s.region && s.district ? `${s.district}, ${s.region}` : null),
  isApproved: (s: SalonModel) => s.verificationStatus === 'approved',
  isPending: (s: SalonModel) => s.verificationStatus === 'pending',
  isRejected: (s: SalonModel) => s.verificationStatus === 'rejected',
  isBookable: (s: SalonModel) => s.verificationStatus !== 'pending',
  hasContactInfo: (s: SalonModel) => !!(s.phoneNumber || s.whatsappNumber || s.instagram || s.facebook),
  /** SalonModel.isOpen – open if no hours set, else compares HH:mm against now */
  isOpen: (s: SalonModel, now = new Date()) => {
    if (!s.openingTime || !s.closingTime) return true
    try {
      const [oh, om] = s.openingTime.split(':').map(Number)
      const [ch, cm] = s.closingTime.split(':').map(Number)
      const open = new Date(now); open.setHours(oh, om, 0, 0)
      const close = new Date(now); close.setHours(ch, cm, 0, 0)
      return now > open && now < close
    } catch {
      return true
    }
  },
}

// ── Service ──────────────────────────────────────────────────────────────────
export interface ServiceModel {
  id: string
  salonId: string
  name: string
  description: string
  price: number
  durationMinutes: number
  category: string
  isActive: boolean
  imageUrl: string | null
  bookingsCount: number
  discountedPrice: number | null
  tags: string[]
  isFeatured: boolean
  sortOrder: number
  staffNote: string | null
  requiresDeposit: boolean
  depositAmount: number | null
  maxDailyBookings: number | null
  createdAt: Date | null
  updatedAt: Date | null
}

export function serviceFromDoc(doc: DocumentSnapshot<DocumentData>): ServiceModel {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    salonId: str(d.salonId),
    name: str(d.name),
    description: str(d.description),
    price: num(d.price),
    durationMinutes: Math.trunc(num(d.durationMinutes)),
    category: str(d.category, 'Other'),
    isActive: firestoreBool(d.isActive, true),
    imageUrl: strOrNull(d.imageUrl),
    bookingsCount: Math.trunc(num(d.bookingsCount)),
    discountedPrice: numOrNull(d.discountedPrice),
    tags: strList(d.tags),
    isFeatured: d.isFeatured === true,
    sortOrder: Math.trunc(num(d.sortOrder)),
    staffNote: strOrNull(d.staffNote),
    requiresDeposit: d.requiresDeposit === true,
    depositAmount: numOrNull(d.depositAmount),
    maxDailyBookings: numOrNull(d.maxDailyBookings),
    createdAt: toDateOrNull(d.createdAt),
    updatedAt: toDateOrNull(d.updatedAt),
  }
}

export const serviceHelpers = {
  hasDiscount: (s: ServiceModel) => s.discountedPrice != null && s.discountedPrice < s.price,
  effectivePrice: (s: ServiceModel) => (s.discountedPrice != null && s.discountedPrice < s.price ? s.discountedPrice : s.price),
  discountPercentage: (s: ServiceModel) =>
    s.discountedPrice != null && s.discountedPrice < s.price ? ((s.price - s.discountedPrice) / s.price) * 100 : 0,
  isPopular: (s: ServiceModel) => s.bookingsCount >= 10,
}

// ── Appointment ──────────────────────────────────────────────────────────────
export const AppointmentStatus = {
  pendingPayment: 'Pending Payment',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  noShow: 'No Show',
  paymentFailed: 'Payment Failed',
} as const
export const ACTIVE_STATUSES: string[] = [AppointmentStatus.pendingPayment, AppointmentStatus.confirmed]
export const TERMINAL_STATUSES: string[] = [
  AppointmentStatus.completed,
  AppointmentStatus.cancelled,
  AppointmentStatus.noShow,
  AppointmentStatus.paymentFailed,
]
export const WALK_IN_CLIENT_ID = 'walk-in'

export interface AppointmentModel {
  id: string
  clientId: string
  salonId: string
  staffId: string | null
  serviceIds: string[]
  startTime: Date
  durationMinutes: number
  totalPrice: number
  status: string
  createdAt: Date
  paymentMethod: string | null
  paymentTransactionId: string | null
  paidAt: Date | null
  walkInName: string | null
  raw: DocumentData
}

export function appointmentFromDoc(doc: DocumentSnapshot<DocumentData>): AppointmentModel {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    clientId: str(d.clientId),
    salonId: str(d.salonId),
    staffId: strOrNull(d.staffId),
    serviceIds: strList(d.serviceIds),
    startTime: toDate(d.startTime),
    durationMinutes: Math.trunc(num(d.durationMinutes)),
    totalPrice: num(d.totalPrice),
    status: str(d.status, AppointmentStatus.pendingPayment),
    createdAt: toDate(d.createdAt),
    paymentMethod: strOrNull(d.paymentMethod),
    paymentTransactionId: strOrNull(d.paymentTransactionId),
    paidAt: toDateOrNull(d.paidAt),
    walkInName: strOrNull(d.walkInName),
    raw: d,
  }
}

export const appointmentHelpers = {
  endTime: (a: AppointmentModel) => new Date(a.startTime.getTime() + a.durationMinutes * 60000),
  isWalkIn: (a: AppointmentModel) => a.clientId === WALK_IN_CLIENT_ID || !!a.walkInName?.trim(),
  isActive: (a: AppointmentModel) => ACTIVE_STATUSES.includes(a.status),
  isTerminal: (a: AppointmentModel) => TERMINAL_STATUSES.includes(a.status),
  /** Only confirmed future appointments count as upcoming (matches Dart). */
  isUpcoming: (a: AppointmentModel) => a.startTime > new Date() && a.status === AppointmentStatus.confirmed,
  isPast: (a: AppointmentModel) => a.startTime < new Date(),
}

// ── Review (salons/{salonId}/reviews/{id}) ───────────────────────────────────
export interface ReviewModel {
  id: string
  salonId: string
  userId: string
  userName: string
  userProfilePicture: string | null
  rating: number
  comment: string
  createdAt: Date
  updatedAt: Date | null
  isVerifiedBooking: boolean
  appointmentId: string | null
  ownerReply: string | null
  ownerRepliedAt: Date | null
  ownerUserId: string | null
  helpfulCount: number
}

export function reviewFromDoc(doc: DocumentSnapshot<DocumentData>): ReviewModel {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    salonId: str(d.salonId),
    userId: str(d.userId),
    userName: str(d.userName, 'Anonymous'),
    userProfilePicture: strOrNull(d.userProfilePicture),
    rating: num(d.rating),
    comment: str(d.comment),
    createdAt: toDate(d.createdAt),
    updatedAt: toDateOrNull(d.updatedAt),
    isVerifiedBooking: d.isVerifiedBooking === true,
    appointmentId: strOrNull(d.appointmentId),
    ownerReply: strOrNull(d.ownerReply),
    ownerRepliedAt: toDateOrNull(d.ownerRepliedAt),
    ownerUserId: strOrNull(d.ownerUserId),
    helpfulCount: Math.trunc(num(d.helpfulCount)),
  }
}

// ── Notification (users/{uid}/notifications + notification_inbox broadcasts) ─
export type NotificationType = 'appointment' | 'promotion' | 'system' | 'payment' | 'review' | 'general'
export function parseNotificationType(v: unknown): NotificationType {
  const s = String(v ?? '').toLowerCase()
  if (s === 'appointment') return 'appointment'
  if (s === 'promotion' || s === 'promotional') return 'promotion'
  if (s === 'system') return 'system'
  if (s === 'payment') return 'payment'
  if (s === 'review') return 'review'
  return 'general'
}

// ── Category (lib/shared/models/category_data.dart) ─────────────────────────
export interface CategoryModel {
  id: string
  name: string
  iconUrl: string
}
const cat = (id: string, name: string, asset: string): CategoryModel => ({
  id,
  name,
  iconUrl: `/images/categories/${asset}`,
})
/** Note: henna/braids/men images are referenced by the app but absent from its assets. */
export const ALL_CATEGORIES: CategoryModel[] = [
  cat('hair', 'Hair & styling', 'hair_styling.png'),
  cat('nails', 'Nails', 'nails.png'),
  cat('massage', 'Massage', 'massage.png'),
  cat('barbershop', 'Barbering', 'barbering.png'),
  cat('spa', 'Spa', 'spa.png'),
  cat('makeup', 'Makeup', 'makeup.png'),
  cat('facials', 'Facials & skincare', 'facials_skincare.png'),
  cat('lashes', 'Eyebrows & eyelashes', 'eyebrows_lashes.png'),
  cat('waxing', 'Hair removal', 'hair_removal.png'),
  cat('body', 'Body', 'body.png'),
  cat('henna', 'Henna & Mehndi', 'henna.png'),
  cat('braids', 'Braids & Locs', 'braids.png'),
  cat('men', "Men's Grooming", 'men_grooming.png'),
]
