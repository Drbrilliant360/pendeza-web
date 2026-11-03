// Ports of lib/app/utils/business_hours_utils.dart, shared/utils/placeholder_images.dart,
// shared/widgets/service_category_icon.dart and app/helpers/contact_helper.dart.
import {
  Brush,
  Eye,
  Flower2,
  Hand,
  PenLine,
  Scissors,
  Smile,
  Stethoscope,
  User,
  type LucideIcon,
} from 'lucide-react'

// ── Business hours ───────────────────────────────────────────────────────────
export type SalonStatus = 'open' | 'closed' | 'opening' | 'closing' | 'unknown'

function parseTime(s: string): { h: number; m: number } | null {
  const parts = s.split(':')
  if (parts.length !== 2) return null
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

function fmt12(t: { h: number; m: number }) {
  const hour = t.h % 12 === 0 ? 12 : t.h % 12
  return `${hour}:${String(t.m).padStart(2, '0')} ${t.h < 12 ? 'AM' : 'PM'}`
}

export function getSalonStatus(openingTime: string | null, closingTime: string | null, now = new Date()): SalonStatus {
  if (!openingTime || !closingTime) return 'unknown'
  const o = parseTime(openingTime)
  const c = parseTime(closingTime)
  if (!o || !c) return 'unknown'
  const cur = now.getHours() * 60 + now.getMinutes()
  const open = o.h * 60 + o.m
  const close = c.h * 60 + c.m
  const overnight = close < open
  const isOpen = overnight ? cur >= open || cur < close : cur >= open && cur < close
  if (isOpen) {
    const untilClose = overnight && cur >= open ? 24 * 60 - cur + close : close - cur
    return untilClose <= 60 && untilClose > 0 ? 'closing' : 'open'
  }
  const untilOpen = cur < open ? open - cur : 24 * 60 - cur + open
  return untilOpen <= 60 ? 'opening' : 'closed'
}

export function getSalonStatusText(openingTime: string | null, closingTime: string | null, now = new Date()) {
  const status = getSalonStatus(openingTime, closingTime, now)
  const o = openingTime ? parseTime(openingTime) : null
  const c = closingTime ? parseTime(closingTime) : null
  switch (status) {
    case 'open':
      return 'Open Now'
    case 'closed':
      return o ? `Opens at ${fmt12(o)}` : 'Closed'
    case 'opening':
      return o ? `Opens at ${fmt12(o)}` : 'Opening Soon'
    case 'closing':
      return c ? `Closes at ${fmt12(c)}` : 'Closing Soon'
    default:
      return 'Hours not set'
  }
}

export const STATUS_COLORS: Record<SalonStatus, string> = {
  open: '#22C55E',
  closed: '#EF4444',
  opening: '#F97316',
  closing: '#F97316',
  unknown: '#9CA3AF',
}

export const hasBusinessHours = (s: { openingTime: string | null; closingTime: string | null }) =>
  !!s.openingTime && !!s.closingTime

// ── Placeholder images ───────────────────────────────────────────────────────
const SALON_IMAGES = [
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1585747860019-8a54e6c0acc5?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1540555700478-4be289fbec6a?w=400&h=300&fit=crop',
]
const CATEGORY_IMAGES: Record<string, string> = {
  hair: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=400&fit=crop',
  nails: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=400&fit=crop',
  massage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&h=400&fit=crop',
  barbershop: 'https://images.unsplash.com/photo-1585747860019-8a54e6c0acc5?w=300&h=400&fit=crop',
  spa: 'https://images.unsplash.com/photo-1540555700478-4be289fbec6a?w=300&h=400&fit=crop',
  makeup: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=400&fit=crop',
  facials: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=400&fit=crop',
  lashes: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=300&h=400&fit=crop',
  waxing: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=300&h=400&fit=crop',
  body: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=300&h=400&fit=crop',
  henna: 'https://images.unsplash.com/photo-1599707367812-042af423e0e7?w=300&h=400&fit=crop',
  braids: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=300&h=400&fit=crop',
  men: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&h=400&fit=crop',
}
/** PlaceholderImages.forSalon – deterministic per salon id. */
export function placeholderForSalon(salonId: string) {
  let h = 0
  for (const ch of salonId) h = (h * 31 + ch.charCodeAt(0)) | 0
  return SALON_IMAGES[Math.abs(h) % SALON_IMAGES.length]
}
export const placeholderForCategory = (id: string): string | undefined => CATEGORY_IMAGES[id]

// ── Service category icon ────────────────────────────────────────────────────
export function serviceCategoryIcon(category: string): LucideIcon {
  const c = category.toLowerCase()
  if (c.includes('hair')) return Scissors
  if (c.includes('nail')) return Hand
  if (c.includes('massage')) return Flower2
  if (c.includes('skin') || c.includes('facial')) return Smile
  if (c.includes('makeup') || c.includes('beauty')) return Brush
  if (c.includes('braid') || c.includes('extension')) return User
  if (c.includes('lash') || c.includes('brow')) return Eye
  if (c.includes('men') || c.includes('groom')) return Scissors
  if (c.includes('body') || c.includes('spa')) return Flower2
  if (c.includes('tattoo') || c.includes('piercing')) return PenLine
  if (c.includes('medical')) return Stethoscope
  return Scissors
}

// ── Contact helper ───────────────────────────────────────────────────────────
export function whatsAppUrl(phone: string, message?: string) {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
export const bookingMessage = (salonName: string, date: string, time: string) =>
  `Hi ${salonName}! 👋 I have a booking on ${date} at ${time}. I'd like to confirm the location details.`

export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** share_plus → navigator.share with clipboard fallback. Returns 'shared' | 'copied' | 'failed'. */
export async function shareText(text: string, subject?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title: subject, text })
      return 'shared'
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'shared'
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
