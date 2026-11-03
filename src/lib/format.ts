// Port of lib/app/utils/formatters.dart + common helpers
const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
/** "TSh 5,000" (Formatters.formatCurrency) */
export const formatCurrency = (amount?: number | null) => (amount == null ? '' : `TSh ${nf.format(amount)}`)
/** "TZS 5000" (ServiceModel.formattedPrice) */
export const formatTzs = (amount: number) => `TZS ${nf.format(amount)}`
export const formatNumber = (n: number) => nf.format(n)

export const formatDate = (d?: Date | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? d.toLocaleDateString('en-GB', opts) : ''
export const formatTime = (d?: Date | null) =>
  d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
export const formatDateTime = (d?: Date | null) => (d ? `${formatDate(d)}, ${formatTime(d)}` : '')
export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** NotificationModel.timeAgo */
export function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 30) { const m = Math.floor(days / 30); return m === 1 ? '1 month ago' : `${m} months ago` }
  if (days > 7) { const w = Math.floor(days / 7); return w === 1 ? '1 week ago' : `${w} weeks ago` }
  if (days > 0) return days === 1 ? '1 day ago' : `${days} days ago`
  if (hours > 0) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  if (mins > 0) return mins === 1 ? '1 minute ago' : `${mins} minutes ago`
  return 'Just now'
}

export const partiallyHidePhone = (p?: string | null) => (!p || p.length < 9 ? p ?? '' : `${p.slice(0, 3)}*****${p.slice(-2)}`)

export const initials = (name?: string | null) =>
  (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('') || '?'

/** Time-of-day greeting used on dashboards */
export const greeting = (d = new Date()) => {
  const h = d.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
