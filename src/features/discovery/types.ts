// Ports of lib/shared/models/promotion_model.dart, salon_video_model.dart and the
// VideoShortsLoaded.salonStories grouping.
import type { DocumentData, DocumentSnapshot } from 'firebase/firestore'
import { toDate, toDateOrNull } from '@/lib/models'

// ── Promotion ────────────────────────────────────────────────────────────────
export type PromotionType = 'platform' | 'salon' | 'personalized'
export type DiscountType = 'percentage' | 'fixedAmount' | 'freebie' | 'none'
export type PromotionAction = 'openDiscover' | 'openSalon' | 'openCategory' | 'openUrl' | 'none'

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
  startDate: Date
  endDate: Date
  isActive: boolean
  priority: number
  usageLimit: number | null
  usageCount: number
  isFeatured: boolean
  action: PromotionAction
  actionValue: string | null
}

const oneOf = <T extends string>(v: unknown, values: readonly T[], fb: T): T =>
  typeof v === 'string' && (values as readonly string[]).includes(v) ? (v as T) : fb

export function promotionFromDoc(doc: DocumentSnapshot<DocumentData>, salonId?: string | null): PromotionModel {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    type: oneOf(d.type, ['platform', 'salon', 'personalized'] as const, 'platform'),
    salonId: salonId ?? (typeof d.salonId === 'string' ? d.salonId : null),
    salonName: typeof d.salonName === 'string' ? d.salonName : null,
    title: typeof d.title === 'string' ? d.title : '',
    description: typeof d.description === 'string' ? d.description : '',
    imageUrl: typeof d.imageUrl === 'string' ? d.imageUrl : '',
    promoCode: typeof d.promoCode === 'string' ? d.promoCode : null,
    discountType: oneOf(d.discountType, ['percentage', 'fixedAmount', 'freebie', 'none'] as const, 'none'),
    discountValue: typeof d.discountValue === 'number' ? d.discountValue : null,
    startDate: toDate(d.startDate),
    endDate: toDate(d.endDate),
    isActive: typeof d.isActive === 'boolean' ? d.isActive : true,
    priority: typeof d.priority === 'number' ? Math.trunc(d.priority) : 0,
    usageLimit: typeof d.usageLimit === 'number' ? d.usageLimit : null,
    usageCount: typeof d.usageCount === 'number' ? d.usageCount : 0,
    isFeatured: d.isFeatured === true,
    action: oneOf(d.action, ['openDiscover', 'openSalon', 'openCategory', 'openUrl', 'none'] as const, 'none'),
    actionValue: typeof d.actionValue === 'string' ? d.actionValue : null,
  }
}

/** PromotionModel.isValid */
export function isPromotionValid(p: PromotionModel, now = new Date()) {
  const usedUp = p.usageLimit != null && p.usageCount >= p.usageLimit
  return p.isActive && now > p.startDate && now < p.endDate && !usedUp
}

// ── Salon video ──────────────────────────────────────────────────────────────
export interface SalonVideoModel {
  id: string
  salonId: string
  salonName: string
  salonImage: string | null
  salonAddress: string | null
  videoUrl: string
  thumbnailUrl: string
  caption: string | null
  durationSeconds: number
  createdAt: Date
  ownerId: string
}

/** Throws on malformed docs like SalonVideoModel.fromFirestore (callers skip them). */
export function videoFromDoc(doc: DocumentSnapshot<DocumentData>): SalonVideoModel {
  const d = doc.data()
  if (!d) throw new Error('missing data')
  const req = (k: string) => {
    if (typeof d[k] !== 'string') throw new Error(`missing ${k}`)
    return d[k] as string
  }
  return {
    id: doc.id,
    salonId: req('salonId'),
    salonName: req('salonName'),
    salonImage: typeof d.salonImage === 'string' ? d.salonImage : null,
    salonAddress: typeof d.salonAddress === 'string' ? d.salonAddress : null,
    videoUrl: req('videoUrl'),
    thumbnailUrl: req('thumbnailUrl'),
    caption: typeof d.caption === 'string' ? d.caption : null,
    durationSeconds: typeof d.durationSeconds === 'number' ? Math.trunc(d.durationSeconds) : 0,
    createdAt: toDateOrNull(d.createdAt) ?? new Date(),
    ownerId: req('ownerId'),
  }
}

export const formattedDuration = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

export interface SalonStory {
  salonId: string
  salonName: string
  salonImage: string | null
  videos: SalonVideoModel[]
}

/** VideoShortsLoaded.salonStories – group videos by salon, keeping first-seen order. */
export function groupStories(videos: SalonVideoModel[]): SalonStory[] {
  const map = new Map<string, SalonStory>()
  for (const v of videos) {
    const s = map.get(v.salonId)
    if (s) s.videos.push(v)
    else map.set(v.salonId, { salonId: v.salonId, salonName: v.salonName, salonImage: v.salonImage, videos: [v] })
  }
  return [...map.values()]
}
