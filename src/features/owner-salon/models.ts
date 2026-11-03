// Ports of lib/shared/models/{salon_video_model,promotion_model}.dart and
// lib/features/3_owner_inspiration/data/model/*.dart (same Firestore field names).
import { Timestamp, type DocumentData, type DocumentSnapshot } from 'firebase/firestore'
import { toDate, toDateOrNull } from '@/lib/models'

const str = (v: unknown, fb = ''): string => (typeof v === 'string' ? v : fb)
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const numOrNull = (v: unknown): number | null => (typeof v === 'number' ? v : null)
const intOr = (v: unknown, fb: number): number => (typeof v === 'number' ? Math.trunc(v) : fb)
const strListOrNull = (v: unknown): string[] | null => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null)

// ── SalonVideoModel (salon_videos/{id}) ─────────────────────────────────────
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

export function salonVideoFromDoc(doc: DocumentSnapshot<DocumentData>): SalonVideoModel {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    salonId: str(d.salonId),
    salonName: str(d.salonName),
    salonImage: strOrNull(d.salonImage),
    salonAddress: strOrNull(d.salonAddress),
    videoUrl: str(d.videoUrl),
    thumbnailUrl: str(d.thumbnailUrl),
    caption: strOrNull(d.caption),
    durationSeconds: intOr(d.durationSeconds, 0),
    createdAt: toDate(d.createdAt),
    ownerId: str(d.ownerId),
  }
}

export function salonVideoToFirestore(v: SalonVideoModel): DocumentData {
  return {
    salonId: v.salonId,
    salonName: v.salonName,
    ...(v.salonImage != null ? { salonImage: v.salonImage } : {}),
    ...(v.salonAddress != null ? { salonAddress: v.salonAddress } : {}),
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    ...(v.caption != null ? { caption: v.caption } : {}),
    durationSeconds: v.durationSeconds,
    createdAt: Timestamp.fromDate(v.createdAt),
    ownerId: v.ownerId,
  }
}

/** SalonVideoModel.formattedDuration – "0:45" */
export const formatVideoDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

// ── PromotionModel (salons/{salonId}/promotions/{id}) ───────────────────────
export type PromotionType = 'platform' | 'salon' | 'personalized'
export type DiscountType = 'percentage' | 'fixedAmount' | 'freebie' | 'none'
export const DISCOUNT_TYPES: DiscountType[] = ['percentage', 'fixedAmount', 'freebie', 'none']
export type PromotionAction = 'openDiscover' | 'openSalon' | 'openCategory' | 'openUrl' | 'none'
export type PromotionAudience = 'all' | 'newUsers' | 'returning' | 'inactive'

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

const oneOf = <T extends string>(v: unknown, values: readonly T[], fb: T): T =>
  typeof v === 'string' && (values as readonly string[]).includes(v) ? (v as T) : fb

export function promotionFromDoc(doc: DocumentSnapshot<DocumentData>, salonId?: string): PromotionModel {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    type: oneOf(d.type, ['platform', 'salon', 'personalized'] as const, 'platform'),
    salonId: salonId ?? strOrNull(d.salonId),
    salonName: strOrNull(d.salonName),
    title: str(d.title),
    description: str(d.description),
    imageUrl: str(d.imageUrl),
    promoCode: strOrNull(d.promoCode),
    discountType: oneOf(d.discountType, DISCOUNT_TYPES, 'none'),
    discountValue: numOrNull(d.discountValue),
    minimumSpend: numOrNull(d.minimumSpend),
    maximumDiscount: numOrNull(d.maximumDiscount),
    applicableServiceIds: strListOrNull(d.applicableServiceIds),
    applicableCategoryIds: strListOrNull(d.applicableCategoryIds),
    startDate: toDate(d.startDate),
    endDate: toDate(d.endDate),
    isActive: typeof d.isActive === 'boolean' ? d.isActive : true,
    audience: oneOf(d.audience, ['all', 'newUsers', 'returning', 'inactive'] as const, 'all'),
    priority: intOr(d.priority, 0),
    usageLimit: numOrNull(d.usageLimit),
    usageCount: intOr(d.usageCount, 0),
    usageLimitPerUser: numOrNull(d.usageLimitPerUser),
    isFeatured: d.isFeatured === true,
    featuredUntil: toDateOrNull(d.featuredUntil),
    action: oneOf(d.action, ['openDiscover', 'openSalon', 'openCategory', 'openUrl', 'none'] as const, 'none'),
    actionValue: strOrNull(d.actionValue),
    createdAt: toDate(d.createdAt),
    updatedAt: toDateOrNull(d.updatedAt),
    createdBy: strOrNull(d.createdBy),
  }
}

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

function formatPromoCurrency(amount: number) {
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K TZS`
  return `${amount.toFixed(0)} TZS`
}

/** PromotionModel.discountText */
export function promotionDiscountText(p: PromotionModel): string {
  switch (p.discountType) {
    case 'percentage':
      return `${p.discountValue != null ? Math.trunc(p.discountValue) : 'null'}% OFF`
    case 'fixedAmount':
      return `${formatPromoCurrency(p.discountValue ?? 0)} OFF`
    case 'freebie':
      return 'FREE GIFT'
    default:
      return ''
  }
}

// ── Inspiration ──────────────────────────────────────────────────────────────
export interface InspirationArticleModel {
  id: string
  title: string
  summary: string
  contentJson: string
  imageUrl: string | null
  publishedAt: Date
}

export function articleFromDoc(doc: DocumentSnapshot<DocumentData>): InspirationArticleModel {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    title: str(d.title),
    summary: str(d.summary, str(d.body)),
    contentJson: str(d.contentJson, '[{"insert":"\\n"}]'),
    imageUrl: strOrNull(d.imageUrl),
    publishedAt: toDate(d.publishedAt),
  }
}

export interface LookbookImageModel {
  id: string
  imageUrl: string
  title: string
  description: string | null
  tags: string[]
}

export function lookbookFromDoc(doc: DocumentSnapshot<DocumentData>): LookbookImageModel {
  const d = doc.data() ?? {}
  return {
    id: doc.id,
    imageUrl: str(d.imageUrl),
    title: str(d.title, 'Untitled'),
    description: strOrNull(d.description),
    tags: strListOrNull(d.tags) ?? [],
  }
}
