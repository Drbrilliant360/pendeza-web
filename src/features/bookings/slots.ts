// Slot helpers from BookingBloc (_generateTimeSlots / _filterBookedSlots / _filterPastSlots)
// and TimeslotSelectionScreen._SlotGroups.
import { AppointmentStatus, appointmentHelpers, type AppointmentModel } from '@/lib/models'

const pad = (n: number) => String(n).padStart(2, '0')

/** Parses "HH:mm" (or "h:mm AM") → minutes since midnight, null if unparseable. */
export function parseSlot(slot: string): { h: number; m: number } | null {
  const s = slot.trim()
  let m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (m) {
    const h = Number(m[1])
    const min = Number(m[2])
    if (h > 23 || min > 59) return null
    return { h, m: min }
  }
  m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(s)
  if (m) {
    let h = Number(m[1]) % 12
    if (m[3].toLowerCase() === 'pm') h += 12
    return { h, m: Number(m[2]) }
  }
  return null
}

/** Opening → closing every [interval] minutes; handles closing after midnight. */
export function generateTimeSlots(openingTime: string, closingTime: string, interval = 30): string[] {
  const open = parseSlot(openingTime)
  const close = parseSlot(closingTime)
  if (!open || !close) return []
  const start = open.h * 60 + open.m
  let end = close.h * 60 + close.m
  if (end < start) end += 24 * 60
  const slots: string[] = []
  for (let cur = start; cur < end; cur += interval) {
    const t = cur % (24 * 60)
    slots.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`)
  }
  return slots
}

export function slotToDate(date: Date, slot: string): Date | null {
  const p = parseSlot(slot)
  if (!p) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), p.h, p.m)
}

/** Drops slots overlapping a *Confirmed* appointment for the whole service duration. */
export function filterBookedSlots(
  baseSlots: string[],
  existing: AppointmentModel[],
  date: Date,
  serviceDuration: number,
): string[] {
  const confirmed = existing.filter((a) => a.status === AppointmentStatus.confirmed)
  if (confirmed.length === 0) return baseSlots
  return baseSlots.filter((slot) => {
    const slotStart = slotToDate(date, slot)
    if (!slotStart) return false
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000)
    return !confirmed.some((a) => slotStart < appointmentHelpers.endTime(a) && slotEnd > a.startTime)
  })
}

/** When [date] is today, removes slots starting within the next 15 minutes. */
export function filterPastSlots(slots: string[], date: Date, now = new Date()): string[] {
  const isToday =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  if (!isToday) return slots
  const cutoff = new Date(now.getTime() + 15 * 60000)
  return slots.filter((slot) => {
    const t = slotToDate(date, slot)
    return !!t && t > cutoff
  })
}

export type SlotGroupKey = 'morning' | 'afternoon' | 'evening'
export interface SlotGroup {
  key: SlotGroupKey | null
  slots: string[]
}

/** Morning (<12) / Afternoon (<17) / Evening; one flat group when a slot isn't "HH:mm". */
export function groupSlots(slots: string[]): SlotGroup[] {
  const hours: number[] = []
  for (const s of slots) {
    const h = parseInt(s.split(':')[0].trim(), 10)
    if (isNaN(h) || !s.includes(':')) return [{ key: null, slots }]
    hours.push(h)
  }
  const morning: string[] = []
  const afternoon: string[] = []
  const evening: string[] = []
  slots.forEach((s, i) => (hours[i] < 12 ? morning : hours[i] < 17 ? afternoon : evening).push(s))
  const out: SlotGroup[] = []
  if (morning.length) out.push({ key: 'morning', slots: morning })
  if (afternoon.length) out.push({ key: 'afternoon', slots: afternoon })
  if (evening.length) out.push({ key: 'evening', slots: evening })
  return out
}
