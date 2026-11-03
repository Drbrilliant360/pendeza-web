// Data access for the owner salon group. Mirrors:
//  - salon_profile_repository_impl.dart
//  - owner_promotions_repository_impl.dart
//  - inspiration_repository_impl.dart
//  - profile_repository_impl.dart (updateProfileImage / updateProfileData, used by EditOwnerProfileScreen)
import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions, storage } from '@/lib/firebase'
import { deleteFileByUrl } from '@/lib/storage'
import { salonFromDoc, type SalonModel } from '@/lib/models'
import {
  articleFromDoc,
  lookbookFromDoc,
  promotionFromDoc,
  promotionToFirestore,
  salonVideoFromDoc,
  salonVideoToFirestore,
  type InspirationArticleModel,
  type LookbookImageModel,
  type PromotionModel,
  type SalonVideoModel,
} from './models'

const salonRef = (salonId: string) => doc(db, 'salons', salonId)

/** Resumable upload with metadata; returns the task so callers can cancel it. */
export function startUpload(
  path: string,
  data: Blob,
  metadata: { contentType?: string; customMetadata?: Record<string, string> },
  onProgress?: (fraction: number) => void,
): { task: UploadTask; done: Promise<string> } {
  const task = uploadBytesResumable(ref(storage, path), data, metadata)
  const done = new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (s) => {
        if (s.totalBytes > 0) onProgress?.(s.bytesTransferred / s.totalBytes)
      },
      reject,
      () => {
        getDownloadURL(task.snapshot.ref).then(resolve, reject)
      },
    )
  })
  return { task, done }
}

// ── Salon profile ───────────────────────────────────────────────────────────
export async function getSalonProfile(salonId: string): Promise<SalonModel> {
  const snap = await getDoc(salonRef(salonId))
  if (!snap.exists()) throw new Error('Salon not found')
  return salonFromDoc(snap)
}

export async function updateBasicInfo(p: { salonId: string; salonName: string; description: string | null; address: string }) {
  await updateDoc(salonRef(p.salonId), {
    salonName: p.salonName,
    description: p.description,
    address: p.address,
    updatedAt: serverTimestamp(),
  })
}

export async function updateContactInfo(p: {
  salonId: string
  phoneNumber: string
  whatsappNumber: string | null
  instagram: string | null
  facebook: string | null
}) {
  await updateDoc(salonRef(p.salonId), {
    phoneNumber: p.phoneNumber,
    whatsappNumber: p.whatsappNumber,
    instagram: p.instagram,
    facebook: p.facebook,
    updatedAt: serverTimestamp(),
  })
}

/** uploadImage – salons/{salonId}/{primary|gallery}/{primary|gallery}_{ts}.jpg with the same metadata. */
export async function uploadSalonImage(p: { salonId: string; data: Blob; isPrimary: boolean; onProgress?: (f: number) => void; onTask?: (task: UploadTask) => void }) {
  const ts = Date.now()
  const kind = p.isPrimary ? 'primary' : 'gallery'
  const path = `salons/${p.salonId}/${kind}/${kind}_${ts}.jpg`
  const { task, done } = startUpload(path, p.data, { contentType: 'image/jpeg', customMetadata: { uploadedBy: p.salonId, type: kind } }, p.onProgress)
  p.onTask?.(task)
  try {
    return await done
  } catch (e) {
    const s = String(e)
    if (s.includes('403') || s.includes('unauthorized')) {
      throw new Error('Permission denied. Please check your internet connection and try again.')
    }
    // Rethrow as-is: the UI maps Storage error codes to friendly text (never shown raw).
    throw e
  }
}

export async function updatePrimaryImage(salonId: string, imageUrl: string) {
  await updateDoc(salonRef(salonId), { primaryImage: imageUrl, updatedAt: serverTimestamp() })
}

export async function addGalleryImage(salonId: string, imageUrl: string) {
  await updateDoc(salonRef(salonId), { imageGallery: arrayUnion(imageUrl), updatedAt: serverTimestamp() })
}

/** deleteImage – storage delete, ignoring failures. */
export const deleteImage = (url: string) => deleteFileByUrl(url)

export async function deletePrimaryImage(salonId: string) {
  await updateDoc(salonRef(salonId), { primaryImage: deleteField(), updatedAt: serverTimestamp() })
}

export async function deleteGalleryImage(salonId: string, index: number) {
  const snap = await getDoc(salonRef(salonId))
  const data = snap.data() ?? {}
  const gallery: string[] = Array.isArray(data.imageGallery) ? [...(data.imageGallery as string[])] : []
  if (index >= 0 && index < gallery.length) {
    gallery.splice(index, 1)
    await updateDoc(salonRef(salonId), { imageGallery: gallery, updatedAt: serverTimestamp() })
  }
}

export async function updateBusinessHours(p: { salonId: string; openingTime: string; closingTime: string }) {
  await updateDoc(salonRef(p.salonId), { openingTime: p.openingTime, closingTime: p.closingTime, updatedAt: serverTimestamp() })
}

export async function updateAmenities(p: { salonId: string; amenities: string[] }) {
  await updateDoc(salonRef(p.salonId), { amenities: p.amenities, updatedAt: serverTimestamp() })
}

// ── Salon videos (salon_videos) ─────────────────────────────────────────────
export async function getSalonVideos(salonId: string): Promise<SalonVideoModel[]> {
  const snap = await getDocs(query(collection(db, 'salon_videos'), where('salonId', '==', salonId), orderBy('createdAt', 'desc')))
  return snap.docs.map(salonVideoFromDoc)
}

export async function getVideoCount(salonId: string): Promise<number> {
  const snap = await getCountFromServer(query(collection(db, 'salon_videos'), where('salonId', '==', salonId)))
  return snap.data().count
}

/** uploadVideo – salon_videos/{salonId}/{ts}.mp4, contentType video/mp4. Returns a cancellable task. */
export function uploadSalonVideo(p: { salonId: string; file: Blob; onProgress?: (f: number) => void }) {
  return startUpload(`salon_videos/${p.salonId}/${Date.now()}.mp4`, p.file, { contentType: 'video/mp4' }, p.onProgress)
}

/** uploadVideoThumbnail – salon_videos/{salonId}/thumbnails/{videoId}_thumb.jpg */
export function uploadVideoThumbnail(p: { salonId: string; videoId: string; thumbnail: Blob }) {
  return startUpload(`salon_videos/${p.salonId}/thumbnails/${p.videoId}_thumb.jpg`, p.thumbnail, { contentType: 'image/jpeg' }).done
}

/** _callVideoProcessingCloudFunction – process_salon_video (errors are swallowed by the caller). */
export async function callVideoProcessingFunction(p: { salonId: string; videoUrl: string; duration: number; caption: string | null }) {
  const user = auth.currentUser
  if (!user) return
  await httpsCallable(functions, 'process_salon_video')({
    salonId: p.salonId,
    videoUrl: p.videoUrl,
    duration: p.duration,
    caption: p.caption,
    ownerId: user.uid,
    timestamp: new Date().toISOString(),
  })
}

export async function createVideoRecord(p: {
  salonId: string
  ownerId: string
  videoUrl: string
  thumbnailUrl: string
  durationSeconds: number
  caption: string | null
}): Promise<SalonVideoModel> {
  const salonSnap = await getDoc(salonRef(p.salonId))
  const salonData = salonSnap.data() ?? {}
  const videoRef = doc(collection(db, 'salon_videos'))
  const video: SalonVideoModel = {
    id: videoRef.id,
    salonId: p.salonId,
    salonName: String(salonData.salonName ?? ''),
    salonImage: typeof salonData.primaryImage === 'string' ? salonData.primaryImage : null,
    salonAddress: typeof salonData.address === 'string' ? salonData.address : null,
    videoUrl: p.videoUrl,
    thumbnailUrl: p.thumbnailUrl,
    caption: p.caption,
    durationSeconds: p.durationSeconds,
    createdAt: new Date(),
    ownerId: p.ownerId,
  }
  await setDoc(videoRef, salonVideoToFirestore(video))
  return video
}

export async function updateVideoCaption(videoId: string, caption: string) {
  await updateDoc(doc(db, 'salon_videos', videoId), { caption })
}

export async function deleteVideo(videoId: string) {
  const ref_ = doc(db, 'salon_videos', videoId)
  const snap = await getDoc(ref_)
  if (!snap.exists()) throw new Error('Video not found')
  const d = snap.data()
  if (typeof d.videoUrl === 'string') await deleteFileByUrl(d.videoUrl)
  if (typeof d.thumbnailUrl === 'string') await deleteFileByUrl(d.thumbnailUrl)
  await deleteDoc(ref_)
}

export const deleteVideoFile = (url: string) => deleteFileByUrl(url)

// ── Owner promotions (salons/{salonId}/promotions) ──────────────────────────
const promotionsCol = (salonId: string) => collection(db, 'salons', salonId, 'promotions')

export function watchPromotions(salonId: string, onData: (p: PromotionModel[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    query(promotionsCol(salonId), orderBy('createdAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => promotionFromDoc(d, salonId))),
    onError,
  )
}

export async function createPromotion(p: { salonId: string; promotion: PromotionModel; imageFile: File; onProgress?: (fraction: number) => void }) {
  const fileName = `promo_${Date.now()}.jpg`
  const downloadUrl = await startUpload(
    `salons/${p.salonId}/promotions/${fileName}`,
    p.imageFile,
    { contentType: p.imageFile.type || undefined },
    p.onProgress,
  ).done
  const docRef = doc(promotionsCol(p.salonId))
  const promo: PromotionModel = {
    ...p.promotion,
    id: docRef.id,
    imageUrl: downloadUrl,
    salonId: p.salonId,
    type: 'salon',
    createdAt: new Date(),
  }
  await setDoc(docRef, promotionToFirestore(promo))
}

export async function deletePromotion(p: { salonId: string; promotionId: string; imageUrl: string }) {
  await deleteDoc(doc(promotionsCol(p.salonId), p.promotionId))
  if (p.imageUrl) await deleteFileByUrl(p.imageUrl)
}

export async function togglePromotionStatus(p: { salonId: string; promotionId: string; isActive: boolean }) {
  await updateDoc(doc(promotionsCol(p.salonId), p.promotionId), { isActive: p.isActive, updatedAt: serverTimestamp() })
}

/** boostPromotion – only reachable after a verified payment in the app (not available on web). */
export async function boostPromotion(p: { salonId: string; promotionId: string }) {
  const expiry = new Date(Date.now() + 7 * 24 * 3600 * 1000)
  await updateDoc(doc(promotionsCol(p.salonId), p.promotionId), {
    isFeatured: true,
    featuredUntil: Timestamp.fromDate(expiry),
    updatedAt: serverTimestamp(),
  })
}

// ── Inspiration ─────────────────────────────────────────────────────────────
export async function getArticles(): Promise<InspirationArticleModel[]> {
  const snap = await getDocs(query(collection(db, 'inspiration_articles'), orderBy('publishedAt', 'desc'), limit(20)))
  return snap.docs.map(articleFromDoc)
}

export async function getArticleById(id: string): Promise<InspirationArticleModel | null> {
  const snap = await getDoc(doc(db, 'inspiration_articles', id))
  return snap.exists() ? articleFromDoc(snap) : null
}

export async function getLookbook(): Promise<LookbookImageModel[]> {
  const snap = await getDocs(query(collection(db, 'lookbook_images'), orderBy('uploadedAt', 'desc'), limit(50)))
  return snap.docs.map(lookbookFromDoc)
}

// ── Owner personal profile (ProfileRepositoryImpl) ──────────────────────────
export async function updateProfileImage(userId: string, data: Blob, onProgress?: (fraction: number) => void): Promise<string> {
  const url = await startUpload(`profile_pictures/${userId}/profile_pic.jpg`, data, { contentType: 'image/jpeg' }, onProgress).done
  await updateDoc(doc(db, 'users', userId), { profilePictureUrl: url, updatedAt: serverTimestamp() })
  return url
}

export async function updateProfileData(userId: string, data: DocumentData) {
  await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() })
}
