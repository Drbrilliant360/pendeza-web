// Port of clients/presentation/widgets/recent_bookings_section.dart
import { BadgeCheck, Calendar, CheckCircle2, Circle, Clock, Scissors, XCircle, type LucideIcon } from 'lucide-react'
import { useT } from '@/lib/i18n'
import type { AppointmentModel } from '@/lib/models'
import { fmtMMMdJm } from '../../components/OwnerChrome'

export default function RecentBookingsSection({ bookings }: { bookings: AppointmentModel[] }) {
  const t = useT()
  if (bookings.length === 0) {
    return (
      <div className="m-5 flex flex-col items-center rounded-[20px] border border-line/60 bg-card p-8 text-center dark:border-line">
        <Calendar size={48} className="text-ink/30" />
        <p className="mt-4 text-base font-semibold text-ink">{t('owner.clients.no_bookings_title')}</p>
        <p className="mt-2 text-xs text-muted">{t('owner.clients.no_bookings_msg')}</p>
      </div>
    )
  }
  return (
    <div>
      <h2 className="t-title px-5">{t('owner.clients.recent_bookings')}</h2>
      <div className="mt-4 grid gap-4 px-5 lg:grid-cols-2">
        {bookings.map((b) => (
          <BookingItem key={b.id} booking={b} />
        ))}
      </div>
    </div>
  )
}

function servicesSummary(b: AppointmentModel) {
  if (b.serviceIds.length === 0) return 'Appointment'
  if (b.serviceIds.length === 1) return '1 Service'
  return `${b.serviceIds.length} Services`
}

function BookingItem({ booking }: { booking: AppointmentModel }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-line/60 bg-card p-4 dark:border-line">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Scissors size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{servicesSummary(booking)}</span>
          <span className="truncate text-right text-sm font-bold text-primary">TZS {booking.totalPrice.toFixed(0)}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <Calendar size={12} className="shrink-0" />
          <span className="truncate">{fmtMMMdJm(booking.startTime)}</span>
        </div>
        <div className="mt-1.5">
          <StatusBadge status={booking.status} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  let color: string | null
  let icon: LucideIcon
  switch (status.toLowerCase()) {
    case 'completed':
      color = '#00B894'
      icon = CheckCircle2
      break
    case 'confirmed':
      color = '#6C5CE7'
      icon = BadgeCheck
      break
    case 'pending payment':
      color = '#F0937D'
      icon = Clock
      break
    case 'cancelled':
      color = '#FF6B6B'
      icon = XCircle
      break
    default:
      color = null
      icon = Circle
  }
  const Icon = icon
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-[3px] text-[10px] font-semibold ${color ? '' : 'bg-inset text-ink'}`}
      style={color ? { background: `color-mix(in srgb, ${color} 15%, transparent)`, color } : undefined}
    >
      <Icon size={10} className="shrink-0" />
      <span className="truncate">{status}</span>
    </span>
  )
}
