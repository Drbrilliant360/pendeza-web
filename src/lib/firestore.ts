// Port of lib/app/services/firestore_service.dart (Firebase JS SDK, same collections/fields).
// Feature modules may add their own data functions next to their screens; keep shared ones here.
import {
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment,
  limit as qLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  appointmentFromDoc,
  reviewFromDoc,
  salonFromDoc,
  serviceFromDoc,
  userFromDoc,
  type AppointmentModel,
  type Gender,
  type ReviewModel,
  type SalonModel,
  type ServiceModel,
  type UserModel,
} from './models'

// ── users ────────────────────────────────────────────────────────────────────
export async function createUser(p: {
  uid: string
  email: string
  fullName: string
  phoneNumber?: string | null
  profilePictureUrl?: string | null
}) {
  // Same shape as UserModel.toFirestore(); web has no FCM token so fcmTokens is [].
  await setDoc(doc(db, 'users', p.uid), {
    email: p.email,
    fullName: p.fullName,
    username: null,
    phoneNumber: p.phoneNumber ?? null,
    profilePictureUrl: p.profilePictureUrl ?? null,
    role: null,
    gender: null,
    fcmTokens: [],
    createdAt: Timestamp.now(),
    updatedAt: null,
  })
}

export async function getUserProfile(uid: string): Promise<UserModel | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? userFromDoc(snap) : null
}

export async function updateUserRole(uid: string, role: string) {
  await updateDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() })
}

export async function updateUserProfile(
  uid: string,
  p: { fullName?: string; profilePictureUrl?: string; phoneNumber?: string; gender?: Gender },
) {
  if (p.fullName == null && p.profilePictureUrl == null && p.phoneNumber == null && p.gender == null) return
  const data: DocumentData = { updatedAt: serverTimestamp() }
  if (p.fullName != null) data.fullName = p.fullName
  if (p.profilePictureUrl != null) data.profilePictureUrl = p.profilePictureUrl ? p.profilePictureUrl : deleteField()
  if (p.phoneNumber != null) data.phoneNumber = p.phoneNumber
  if (p.gender != null) data.gender = p.gender
  await updateDoc(doc(db, 'users', uid), data)
}

export async function completeClientProfile(p: {
  uid: string
  fullName: string
  phoneNumber: string
  gender: Gender
  profilePictureUrl?: string | null
}) {
  const data: DocumentData = {
    fullName: p.fullName,
    phoneNumber: p.phoneNumber,
    gender: p.gender,
    updatedAt: serverTimestamp(),
  }
  if (p.profilePictureUrl) data.profilePictureUrl = p.profilePictureUrl
  await updateDoc(doc(db, 'users', p.uid), data)
}

// ── salons ───────────────────────────────────────────────────────────────────
export async function createSalon(p: {
  ownerId: string
  salonName: string
  address: string
  serviceCategories: string[]
  businessTypeIds?: string[]
  businessTypeNames?: string[]
  region?: string | null
  district?: string | null
  openingTime?: string
  closingTime?: string
}): Promise<string> {
  const ref = doc(collection(db, 'salons'))
  const now = Timestamp.now()
  await setDoc(ref, {
    ownerId: p.ownerId,
    salonName: p.salonName,
    address: p.address,
    serviceCategories: p.serviceCategories,
    createdAt: now,
    businessTypeIds: p.businessTypeIds ?? [],
    businessTypeNames: p.businessTypeNames ?? [],
    ...(p.region ? { region: p.region } : {}),
    ...(p.district ? { district: p.district } : {}),
    verificationStatus: 'pending',
    submittedAt: now,
    imageGallery: [],
    openingTime: p.openingTime ?? '08:00',
    closingTime: p.closingTime ?? '20:00',
    amenities: [],
  })
  return ref.id
}

export async function getSalonForOwner(ownerId: string): Promise<SalonModel | null> {
  const snap = await getDocs(query(collection(db, 'salons'), where('ownerId', '==', ownerId), qLimit(1)))
  return snap.empty ? null : salonFromDoc(snap.docs[0])
}

export async function getSalonById(salonId: string): Promise<SalonModel | null> {
  const snap = await getDoc(doc(db, 'salons', salonId))
  return snap.exists() ? salonFromDoc(snap) : null
}

/** Approved salons only (client discovery). */
export async function getSalons(): Promise<SalonModel[]> {
  const snap = await getDocs(query(collection(db, 'salons'), where('verificationStatus', '==', 'approved')))
  return snap.docs.map(salonFromDoc)
}

export async function getSalonsByIds(ids: string[]): Promise<SalonModel[]> {
  const out: SalonModel[] = []
  for (const id of ids) {
    const s = await getSalonById(id)
    if (s && s.verificationStatus === 'approved') out.push(s)
  }
  return out
}

// ── services ─────────────────────────────────────────────────────────────────
export async function getServicesForSalon(salonId: string): Promise<ServiceModel[]> {
  const snap = await getDocs(query(collection(db, 'services'), where('salonId', '==', salonId)))
  return snap.docs.map(serviceFromDoc)
}

export async function getServiceById(id: string): Promise<ServiceModel | null> {
  const snap = await getDoc(doc(db, 'services', id))
  return snap.exists() ? serviceFromDoc(snap) : null
}

// ── appointments ─────────────────────────────────────────────────────────────
export async function createAppointment(a: Omit<AppointmentModel, 'id' | 'createdAt' | 'raw'>): Promise<string> {
  const ref = doc(collection(db, 'appointments'))
  await setDoc(ref, {
    clientId: a.clientId,
    salonId: a.salonId,
    staffId: a.staffId,
    serviceIds: a.serviceIds,
    startTime: Timestamp.fromDate(a.startTime),
    durationMinutes: a.durationMinutes,
    totalPrice: a.totalPrice,
    status: a.status,
    createdAt: serverTimestamp(),
    ...(a.paymentMethod ? { paymentMethod: a.paymentMethod } : {}),
    ...(a.paymentTransactionId ? { paymentTransactionId: a.paymentTransactionId } : {}),
    ...(a.paidAt ? { paidAt: Timestamp.fromDate(a.paidAt) } : {}),
    ...(a.walkInName ? { walkInName: a.walkInName } : {}),
  })
  return ref.id
}

export async function updateAppointmentStatus(id: string, status: string) {
  await updateDoc(doc(db, 'appointments', id), { status, updatedAt: serverTimestamp() })
}

export async function getAppointmentsForClient(clientId: string): Promise<AppointmentModel[]> {
  const snap = await getDocs(
    query(collection(db, 'appointments'), where('clientId', '==', clientId), orderBy('startTime', 'desc')),
  )
  return snap.docs.map(appointmentFromDoc)
}

export async function getAppointmentsForSalonOnDate(salonId: string, date: Date): Promise<AppointmentModel[]> {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
  const snap = await getDocs(
    query(
      collection(db, 'appointments'),
      where('salonId', '==', salonId),
      where('startTime', '>=', Timestamp.fromDate(start)),
      where('startTime', '<=', Timestamp.fromDate(end)),
      where('status', '!=', 'Cancelled'),
    ),
  )
  return snap.docs.map(appointmentFromDoc)
}

// ── reviews ──────────────────────────────────────────────────────────────────
export type ReviewSort = 'recent' | 'highest' | 'lowest'
export async function getReviewsForSalon(salonId: string, sortBy: ReviewSort = 'recent', limit?: number) {
  const c: QueryConstraint[] = [
    sortBy === 'recent'
      ? orderBy('createdAt', 'desc')
      : sortBy === 'highest'
        ? orderBy('rating', 'desc')
        : orderBy('rating', 'asc'),
  ]
  if (limit) c.push(qLimit(limit))
  const snap = await getDocs(query(collection(db, 'salons', salonId, 'reviews'), ...c))
  return snap.docs.map(reviewFromDoc)
}

export async function createReview(r: Omit<ReviewModel, 'id' | 'createdAt' | 'updatedAt' | 'ownerReply' | 'ownerRepliedAt' | 'ownerUserId' | 'helpfulCount'>) {
  const ref = doc(collection(db, 'salons', r.salonId, 'reviews'))
  await setDoc(ref, {
    salonId: r.salonId,
    userId: r.userId,
    userName: r.userName,
    userProfilePicture: r.userProfilePicture,
    rating: r.rating,
    comment: r.comment,
    createdAt: Timestamp.now(),
    updatedAt: null,
    isVerifiedBooking: r.isVerifiedBooking,
    appointmentId: r.appointmentId,
    ownerReply: null,
    ownerRepliedAt: null,
    ownerUserId: null,
    helpfulCount: 0,
  })
  return ref.id
}

async function findReviewDoc(reviewId: string) {
  const snap = await getDocs(query(collectionGroup(db, 'reviews'), where(documentId(), '==', reviewId)))
  if (snap.empty) throw new Error('Review not found')
  return snap.docs[0]
}
/** Reviews live in a subcollection; prefer passing salonId when known. */
function reviewRef(salonId: string, reviewId: string) {
  return doc(db, 'salons', salonId, 'reviews', reviewId)
}

export async function updateReview(p: { salonId: string; reviewId: string; userId: string; rating: number; comment: string }) {
  const ref = reviewRef(p.salonId, p.reviewId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Review not found')
  if (snap.data().userId !== p.userId) throw new Error('You can only update your own reviews')
  await updateDoc(ref, { rating: p.rating, comment: p.comment, updatedAt: serverTimestamp() })
}

export async function deleteReview(p: { salonId: string; reviewId: string; userId: string }) {
  const ref = reviewRef(p.salonId, p.reviewId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Review not found')
  if (snap.data().userId !== p.userId) throw new Error('You can only delete your own reviews')
  await deleteDoc(ref)
}

export async function getUserReviewForSalon(salonId: string, userId: string) {
  const snap = await getDocs(
    query(collection(db, 'salons', salonId, 'reviews'), where('userId', '==', userId), qLimit(1)),
  )
  return snap.empty ? null : reviewFromDoc(snap.docs[0])
}

export async function getCompletedAppointmentIdForReview(salonId: string, userId: string) {
  const snap = await getDocs(
    query(
      collection(db, 'appointments'),
      where('clientId', '==', userId),
      where('salonId', '==', salonId),
      where('status', '==', 'Completed'),
      orderBy('startTime', 'desc'),
      qLimit(1),
    ),
  )
  return snap.empty ? null : snap.docs[0].id
}

export async function addOwnerReplyToReview(p: { salonId?: string; reviewId: string; ownerId: string; replyText: string }) {
  const ref = p.salonId ? reviewRef(p.salonId, p.reviewId) : (await findReviewDoc(p.reviewId)).ref
  await updateDoc(ref, { ownerReply: p.replyText, ownerRepliedAt: serverTimestamp(), ownerUserId: p.ownerId })
}

export async function deleteOwnerReply(p: { salonId?: string; reviewId: string }) {
  const ref = p.salonId ? reviewRef(p.salonId, p.reviewId) : (await findReviewDoc(p.reviewId)).ref
  await updateDoc(ref, { ownerReply: deleteField(), ownerRepliedAt: deleteField(), ownerUserId: deleteField() })
}

export async function incrementReviewHelpfulCount(p: { salonId?: string; reviewId: string }) {
  const ref = p.salonId ? reviewRef(p.salonId, p.reviewId) : (await findReviewDoc(p.reviewId)).ref
  await updateDoc(ref, { helpfulCount: increment(1) })
}

// ── favorites (users/{uid}/favorites/{salonId}) ─────────────────────────────
export async function addFavoriteSalon(userId: string, salonId: string) {
  await setDoc(doc(db, 'users', userId, 'favorites', salonId), {
    salonId,
    userId,
    favoritedAt: serverTimestamp(),
  })
}
export async function removeFavoriteSalon(userId: string, salonId: string) {
  await deleteDoc(doc(db, 'users', userId, 'favorites', salonId))
}
export async function getFavoriteSalonIds(userId: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'users', userId, 'favorites'), orderBy('favoritedAt', 'desc')))
  return snap.docs.map((d) => d.id)
}
export async function clearAllFavorites(userId: string) {
  const snap = await getDocs(collection(db, 'users', userId, 'favorites'))
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}
