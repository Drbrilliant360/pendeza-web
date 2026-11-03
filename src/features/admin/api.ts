// Port of admin_repository_impl.dart + the Firestore/Storage/Functions calls made directly
// in admin_bloc.dart, admin_manage_notification_screen.dart (NotificationService.sendNotificationToRole)
// and the inspiration repository. Collection names, fields and query shapes match the app.
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { deleteFileByUrl, uploadFile } from '@/lib/storage'
import { updateUserRole as fsUpdateUserRole } from '@/lib/firestore'
import {
  appointmentFromDoc,
  salonFromDoc,
  toDate,
  toDateOrNull,
  userFromDoc,
  type AppointmentModel,
  type SalonModel,
  type UserModel,
} from '@/lib/models'

// ── PromotionModel (lib/shared/models/promotion_model.dart) ──────────────────
export type PromotionType = 'platform' | 'salon' | 'personalized'
export type DiscountType = 'percentage' | 'fixedAmount' | 'freebie' | 'none'
export type PromotionAction = 'openDiscover' | 'openSalon' | 'openCategory' | 'openUrl' | 'none'
export type PromotionAudience = 'all' | 'newUsers' | 'returning' | 'inactive'
export const DISCOUNT_TYPES: DiscountType[] = ['percentage', 'fixedAmount', 'freebie', 'none']

export interface PromotionModel {
  id: string
  type: PromotionType
  salonId: string | null
  salonName: string | null
  title: string
  description: string
  imageUrl: string
  promoCode: string | null
  discountType: DiscountType
  discountValue: number | null
  minimumSpend: number | null
  maximumDiscount: number | null
  applicableServiceIds: string[] | null
  applicableCategoryIds: string[] | null
  startDate: Date
  endDate: Date
  isActive: boolean
  audience: PromotionAudience
  priority: number
  usageLimit: number | null
  usageCount: number
  usageLimitPerUser: number | null
  isFeatured: boolean
  featuredUntil: Date | null
  action: PromotionAction
  actionValue: string | null
  createdAt: Date
  updatedAt: Date | null
  createdBy: string | null
}

const pick = <T extends string>(v: unknown, allowed: readonly T[], fb: T): T => (allowed.includes(v as T) ? (v as T) : fb)
const s = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const n = (v: unknown): number | null => (typeof v === 'number' ? v : null)
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null)
const list = (v: unknown): string[] | null => (Array.isArray(v) ? v.map(String) : null)
const tsOrNow = (v: unknown): Date => (v instanceof Timestamp || v instanceof Date ? toDate(v) : new Date())

export function promotionFromDoc(d: DocumentSnapshot<DocumentData>): PromotionModel {
  const x = d.data() ?? {}
  return {
    id: d.id,
    type: pick(x.type, ['platform', 'salon', 'personalized'] as const, 'platform'),
    salonId: s(x.salonId),
    salonName: s(x.salonName),
    title: s(x.title) ?? '',
    description: s(x.description) ?? '',
    imageUrl: s(x.imageUrl) ?? '',
    promoCode: s(x.promoCode),
    discountType: pick(x.discountType, DISCOUNT_TYPES, 'none'),
    discountValue: n(x.discountValue),
    minimumSpend: n(x.minimumSpend),
    maximumDiscount: n(x.maximumDiscount),
    applicableServiceIds: list(x.applicableServiceIds),
    applicableCategoryIds: list(x.applicableCategoryIds),
    startDate: tsOrNow(x.startDate),
    endDate: tsOrNow(x.endDate),
    isActive: typeof x.isActive === 'boolean' ? x.isActive : true,
    audience: pick(x.audience, ['all', 'newUsers', 'returning', 'inactive'] as const, 'all'),
    priority: int(x.priority) ?? 0,
    usageLimit: int(x.usageLimit),
    usageCount: int(x.usageCount) ?? 0,
    usageLimitPerUser: int(x.usageLimitPerUser),
    isFeatured: typeof x.isFeatured === 'boolean' ? x.isFeatured : false,
    featuredUntil: x.featuredUntil instanceof Timestamp ? x.featuredUntil.toDate() : null,
    action: pick(x.action, ['openDiscover', 'openSalon', 'openCategory', 'openUrl', 'none'] as const, 'none'),
    actionValue: s(x.actionValue),
    createdAt: tsOrNow(x.createdAt),
    updatedAt: x.updatedAt instanceof Timestamp ? x.updatedAt.toDate() : null,
    createdBy: s(x.createdBy),
  }
}

/** PromotionModel.toFirestore() */
export function promotionToFirestore(p: PromotionModel): DocumentData {
  return {
    type: p.type,
    salonId: p.salonId,
    salonName: p.salonName,
    title: p.title,
    description: p.description,
    imageUrl: p.imageUrl,
    promoCode: p.promoCode,
    discountType: p.discountType,
    discountValue: p.discountValue,
    minimumSpend: p.minimumSpend,
    maximumDiscount: p.maximumDiscount,
    applicableServiceIds: p.applicableServiceIds,
    applicableCategoryIds: p.applicableCategoryIds,
    startDate: Timestamp.fromDate(p.startDate),
    endDate: Timestamp.fromDate(p.endDate),
    isActive: p.isActive,
    audience: p.audience,
    priority: p.priority,
    usageLimit: p.usageLimit,
    usageCount: p.usageCount,
    usageLimitPerUser: p.usageLimitPerUser,
    isFeatured: p.isFeatured,
    featuredUntil: p.featuredUntil ? Timestamp.fromDate(p.featuredUntil) : null,
    action: p.action,
    actionValue: p.actionValue,
    createdAt: Timestamp.fromDate(p.createdAt),
    updatedAt: p.updatedAt ? Timestamp.fromDate(p.updatedAt) : null,
    createdBy: p.createdBy,
  }
}

/** PromotionModel(...) constructor defaults */
export function newPromotion(p: Pick<PromotionModel, 'id' | 'title' | 'description' | 'imageUrl' | 'promoCode' | 'discountType' | 'discountValue' | 'action' | 'actionValue' | 'startDate' | 'endDate' | 'createdAt' | 'isActive'>): PromotionModel {
  return {
    type: 'platform',
    salonId: null,
    salonName: null,
    minimumSpend: null,
    maximumDiscount: null,
    applicableServiceIds: null,
    applicableCategoryIds: null,
    audience: 'all',
    priority: 0,
    usageLimit: null,
    usageCount: 0,
    usageLimitPerUser: null,
    isFeatured: false,
    featuredUntil: null,
    updatedAt: null,
    createdBy: null,
    ...p,
  }
}

// ── AdminRepositoryImpl ──────────────────────────────────────────────────────
export async function getAllUsers(): Promise<UserModel[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(userFromDoc)
}

export async function getAllSalons(): Promise<SalonModel[]> {
  const snap = await getDocs(collection(db, 'salons'))
  return snap.docs.map(salonFromDoc)
}

export const updateUserRole = (uid: string, role: string) => fsUpdateUserRole(uid, role)

export async function getAllAppointments(limit = 200): Promise<AppointmentModel[]> {
  const snap = await getDocs(query(collection(db, 'appointments'), orderBy('startTime', 'desc'), qLimit(limit)))
  return snap.docs.map(appointmentFromDoc)
}

export async function getServiceNamesByIds(ids: Iterable<string>): Promise<Record<string, string>> {
  const unique = [...new Set([...ids].filter((id) => id.length > 0))]
  const names: Record<string, string> = {}
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10)
    const snap = await getDocs(query(collection(db, 'services'), where(documentId(), 'in', chunk)))
    for (const d of snap.docs) {
      const name = d.get('name')
      if (typeof name === 'string' && name) names[d.id] = name
    }
  }
  return names
}

export async function getPlatformPromotions(): Promise<PromotionModel[]> {
  const snap = await getDocs(query(collection(db, 'promotions'), orderBy('createdAt', 'desc')))
  return snap.docs.map(promotionFromDoc)
}

/** promotions/promo_{ms}.jpg (AdminBloc._onAdd/UpdatePlatformPromotion) */
export async function uploadPromotionImage(file: Blob, onProgress?: (pct: number) => void): Promise<string> {
  return uploadFile(`promotions/promo_${Date.now()}.jpg`, file, onProgress)
}

export async function addPromotion(p: PromotionModel) {
  const ref = doc(collection(db, 'promotions'))
  await setDoc(ref, promotionToFirestore({ ...p, id: ref.id }))
}

export async function updatePromotion(p: PromotionModel) {
  await updateDoc(doc(db, 'promotions', p.id), promotionToFirestore(p))
}

export async function deletePromotion(id: string) {
  await deleteDoc(doc(db, 'promotions', id))
}

export async function approveSalon(salonId: string) {
  await updateDoc(doc(db, 'salons', salonId), {
    verificationStatus: 'approved',
    reviewedAt: serverTimestamp(),
    rejectionReason: deleteField(),
  })
}

export async function rejectSalon(salonId: string, reason: string) {
  await updateDoc(doc(db, 'salons', salonId), {
    verificationStatus: 'rejected',
    reviewedAt: serverTimestamp(),
    rejectionReason: reason,
  })
}

/** Owner notification written by AdminBloc after approve / reject. */
export async function notifySalonOwner(salonId: string, build: (salonName: string) => { title: string; body: string; actionRoute: string }) {
  const snap = await getDoc(doc(db, 'salons', salonId))
  if (!snap.exists()) return
  const ownerId = snap.get('ownerId')
  const salonName = (snap.get('salonName') as string | undefined) ?? 'Your salon'
  if (typeof ownerId !== 'string') return
  const { title, body, actionRoute } = build(salonName)
  await addDoc(collection(db, 'notifications'), {
    userId: ownerId,
    title,
    body,
    type: 'system',
    createdAt: serverTimestamp(),
    isRead: false,
    actionRoute,
  })
}

/** Salon card owner lookup fallback (users/{ownerId}). */
export async function fetchOwner(ownerId: string): Promise<{ name: string; email: string; avatar: string | null } | null> {
  const snap = await getDoc(doc(db, 'users', ownerId))
  if (!snap.exists()) return null
  return {
    name: (snap.get('fullName') as string | undefined) ?? 'Unknown',
    email: (snap.get('email') as string | undefined) ?? '',
    avatar: (snap.get('profilePictureUrl') as string | undefined) ?? null,
  }
}

// ── Notifications (notification_inbox + send_admin_notification) ────────────
export type InboxItem = Record<string, unknown>

/** notification_inbox ordered by sentAt desc, limit 50, realtime. */
export function listenNotificationInbox(onData: (items: InboxItem[]) => void, onError: (e: unknown) => void) {
  return onSnapshot(
    query(collection(db, 'notification_inbox'), orderBy('sentAt', 'desc'), qLimit(50)),
    (snap) => onData(snap.docs.map((d) => d.data())),
    onError,
  )
}

/** notification_images/notification_{ms}.jpg */
export async function uploadNotificationImage(file: Blob, onProgress?: (pct: number) => void) {
  return uploadFile(`notification_images/notification_${Date.now()}.jpg`, file, onProgress)
}

/** NotificationService.sendNotificationToRole → callable send_admin_notification */
export async function sendNotificationToRole(p: { title: string; body: string; role: string | null; data: Record<string, unknown> | null }) {
  let targetAudience: string
  if (p.role == null || p.role === 'all') targetAudience = 'all'
  else if (p.role === 'client') targetAudience = 'clients'
  else if (p.role === 'owner') targetAudience = 'owners'
  else targetAudience = p.role
  const callable = httpsCallable(functions, 'send_admin_notification', { timeout: 60000 })
  const res = await callable({
    title: p.title,
    body: p.body,
    targetAudience,
    imageUrl: p.data?.imageUrl ?? null,
    route: p.data?.route ?? null,
    customData: p.data,
    priority: 'high',
    saveToInbox: true,
  })
  return res.data
}

// ── Inspiration (inspiration_articles / lookbook_images) ─────────────────────
export interface InspirationArticle { id: string; title: string; summary: string; contentJson: string; imageUrl: string | null; publishedAt: Date }
export interface LookbookImage { id: string; imageUrl: string; title: string; description: string | null; tags: string[] }

export async function getArticles(): Promise<InspirationArticle[]> {
  const snap = await getDocs(query(collection(db, 'inspiration_articles'), orderBy('publishedAt', 'desc'), qLimit(20)))
  return snap.docs.map((d) => {
    const x = d.data()
    return {
      id: d.id,
      title: s(x.title) ?? '',
      summary: s(x.summary) ?? s(x.body) ?? '',
      contentJson: s(x.contentJson) ?? '[{"insert":"\\n"}]',
      imageUrl: s(x.imageUrl),
      publishedAt: toDateOrNull(x.publishedAt) ?? new Date(),
    }
  })
}

export async function getLookbook(): Promise<LookbookImage[]> {
  const snap = await getDocs(query(collection(db, 'lookbook_images'), orderBy('uploadedAt', 'desc'), qLimit(50)))
  return snap.docs.map((d) => {
    const x = d.data()
    return { id: d.id, imageUrl: s(x.imageUrl) ?? '', title: s(x.title) ?? 'Untitled', description: s(x.description), tags: list(x.tags) ?? [] }
  })
}

/** inspiration_images/{folder}/{ms}.jpg (AdminBloc._uploadImage) */
export const uploadInspirationImage = (file: Blob, folder: 'articles' | 'lookbook' | 'article_content', onProgress?: (pct: number) => void) =>
  uploadFile(`inspiration_images/${folder}/${Date.now()}.jpg`, file, onProgress)

export async function addArticle(p: { title: string; summary: string; contentJson: string; imageUrl: string | null }) {
  await addDoc(collection(db, 'inspiration_articles'), { ...p, category: 'trends', publishedAt: Timestamp.now(), views: 0 })
}

export async function addLookbookItem(p: { title: string; imageUrl: string; tags: string[] }) {
  await addDoc(collection(db, 'lookbook_images'), { ...p, description: '', uploadedAt: Timestamp.now() })
}

export async function deleteArticle(id: string, imageUrl: string | null) {
  if (imageUrl) await deleteFileByUrl(imageUrl)
  await deleteDoc(doc(db, 'inspiration_articles', id))
}

export async function deleteLookbookItem(id: string, imageUrl: string) {
  if (imageUrl) await deleteFileByUrl(imageUrl)
  await deleteDoc(doc(db, 'lookbook_images', id))
}
