// Web ports of lib/app/helpers/{image_compressor_helper,video_compressor_helper,contact_helper}.dart
// and lib/app/utils/client_invite_util.dart.
import { compressImage } from '@/lib/storage'
import type { SalonModel } from '@/lib/models'

// ── ImageCompressionHelper ──────────────────────────────────────────────────
/** compressImage: skip under 150KB, else 1200px / q75 (flutter_image_compress stand-in). */
export async function compressSalonPhoto(file: File): Promise<Blob> {
  if (file.size < 150 * 1024) return file
  return compressImage(file, 1200, 0.75)
}
/** compressProfilePicture: 400px / q70 */
export const compressProfilePicture = (file: File) => compressImage(file, 400, 0.7)

// ── VideoCompressionHelper ──────────────────────────────────────────────────
export const MAX_VIDEO_DURATION_SECONDS = 60
export const MAX_VIDEOS_PER_SALON = 3

function loadVideo(file: Blob): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = url
    video.onloadedmetadata = () => resolve({ video, url })
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video'))
    }
  })
}

/** getVideoDuration – seconds (rounded) or null. */
export async function getVideoDuration(file: Blob): Promise<number | null> {
  try {
    const { video, url } = await loadVideo(file)
    const d = video.duration
    URL.revokeObjectURL(url)
    return Number.isFinite(d) ? Math.round(d) : null
  } catch {
    return null
  }
}

/** generateThumbnail – first frame as JPEG (quality 75). */
export async function generateVideoThumbnail(file: Blob): Promise<Blob | null> {
  try {
    const { video, url } = await loadVideo(file)
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve()
      video.onerror = () => reject(new Error('seek failed'))
      video.currentTime = Math.min(0.1, (video.duration || 1) / 2)
    })
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.75))
  } catch {
    return null
  }
}

// ── ContactHelper ────────────────────────────────────────────────────────────
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
export function openWhatsApp(phone: string, message?: string) {
  const clean = phone.replace(/\D/g, '')
  openExternal(`https://wa.me/${clean}${message ? `?text=${encodeURIComponent(message)}` : ''}`)
}
export function makePhoneCall(phone: string) {
  window.location.href = `tel:${phone}`
}
export const createInquiryMessage = (salonName: string, serviceName?: string) =>
  serviceName
    ? `Hi ${salonName}! 👋 I saw your ${serviceName} service on Pendeza and I have a question.`
    : `Hi ${salonName}! 👋 I found you on Pendeza and would like to make an inquiry.`
export const createBookingMessage = (salonName: string, date: string, time: string) =>
  `Hi ${salonName}! 👋 I have a booking on ${date} at ${time}. I'd like to confirm the location details.`

// ── share_plus stand-in ─────────────────────────────────────────────────────
/** Returns 'shared' | 'copied' | 'failed'. */
export async function shareText(text: string, subject?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ text, title: subject })
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

// ── ClientInviteUtil ────────────────────────────────────────────────────────
export const PLAY_STORE_LINK = 'https://play.google.com/store/apps/details?id=com.bpsa.pendeza'
export const buildInviteMessage = (salonName: string) =>
  `Hi! This is ${salonName}. We are now using the Pendeza app to make booking your ` +
  `appointments easier. Download it here to see our services and book your next visit: ` +
  `\n\n${PLAY_STORE_LINK}`
export const inviteClient = (salon: SalonModel) =>
  shareText(buildInviteMessage(salon.salonName), `Book with ${salon.salonName} on Pendeza`)
