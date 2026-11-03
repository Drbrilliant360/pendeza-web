// Port of lib/app/utils/business_hours_utils.dart
export type SalonStatus = 'open' | 'closed' | 'opening' | 'closing' | 'unknown'

function parseTime(s: string): { h: number; m: number } | null {
  const parts = s.split(':')
  if (parts.length !== 2) return null
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

function fmt(t: { h: number; m: number }) {
  const hour = t.h % 12 === 0 ? 12 : t.h % 12
  return `${hour}:${String(t.m).padStart(2, '0')} ${t.h < 12 ? 'AM' : 'PM'}`
}

export const BusinessHoursUtils = {
  getStatus(openingTime: string | null | undefined, closingTime: string | null | undefined, now = new Date()): SalonStatus {
    if (openingTime == null || closingTime == null) return 'unknown'
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
  },

  getStatusText(openingTime: string | null | undefined, closingTime: string | null | undefined, now = new Date()): string {
    const status = BusinessHoursUtils.getStatus(openingTime, closingTime, now)
    const o = openingTime ? parseTime(openingTime) : null
    const c = closingTime ? parseTime(closingTime) : null
    switch (status) {
      case 'open':
        return 'Open Now'
      case 'closed':
        return o ? `Opens at ${fmt(o)}` : 'Closed'
      case 'opening':
        return o ? `Opens at ${fmt(o)}` : 'Opening Soon'
      case 'closing':
        return c ? `Closes at ${fmt(c)}` : 'Closing Soon'
      default:
        return 'Hours not set'
    }
  },

  getStatusColor(status: SalonStatus): string {
    switch (status) {
      case 'open':
        return '#22C55E'
      case 'closed':
        return '#EF4444'
      case 'opening':
      case 'closing':
        return '#F97316'
      default:
        return '#9CA3AF'
    }
  },

  isOpen(openingTime: string | null | undefined, closingTime: string | null | undefined, now = new Date()) {
    const s = BusinessHoursUtils.getStatus(openingTime, closingTime, now)
    return s === 'open' || s === 'closing' || s === 'unknown'
  },

  formatHoursRange(openingTime: string | null | undefined, closingTime: string | null | undefined) {
    if (openingTime == null || closingTime == null) return 'Hours not set'
    const o = parseTime(openingTime)
    const c = parseTime(closingTime)
    if (!o || !c) return `${openingTime} - ${closingTime}`
    return `${fmt(o)} - ${fmt(c)}`
  },
}
