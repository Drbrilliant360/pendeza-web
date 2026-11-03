// Port of 2_client_appointments/presentation/widgets/appointment_card.dart + appointment_details_sheet.dart
import {
  BadgeCheck,
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  Info,
  MapPin,
  MessageCircle,
  Scissors,
  Star,
  TriangleAlert,
  UserMinus,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { Avatar, Card, cx, Pill, Sheet } from '@/components/ui'
import { formatCurrency, formatTime } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { AppointmentStatus, serviceHelpers, type AppointmentModel } from '@/lib/models'
import { serviceNames, type AppointmentWithDetails } from '../api'
import { fmtDayShort } from './BookingParts'

export interface AppointmentStatusStyle {
  label: string
  color: string
  icon: LucideIcon
  muted: boolean
}

export function appointmentStatusStyle(a: AppointmentModel): AppointmentStatusStyle {
  switch (a.status.toLowerCase()) {
    case 'pending payment':
      return { label: 'Pending', color: '#F5A623', icon: Clock, muted: false }
    case 'confirmed':
      return a.startTime > new Date()
        ? { label: 'Upcoming', color: '#6C5CE7', icon: CircleCheck, muted: false }
        : { label: 'Completed', color: '#00B894', icon: BadgeCheck, muted: true }
    case 'completed':
      return { label: 'Completed', color: '#00B894', icon: BadgeCheck, muted: true }
    case 'cancelled':
      return { label: 'Cancelled', color: '#FF6B6B', icon: CircleX, muted: true }
    case 'no show':
    case 'noshow':
      return { label: 'No show', color: '#8A8FA0', icon: UserMinus, muted: true }
    case 'payment failed':
      return { label: 'Payment failed', color: '#FF6B6B', icon: TriangleAlert, muted: true }
    default:
      return { label: a.status, color: '#8A8FA0', icon: Info, muted: true }
  }
}

/** Calendar-style day tile ("SEP / 23 / Tue"). */
export function AppointmentDateBlock({ date, muted, width = 62 }: { date: Date; muted?: boolean; width?: number }) {
  return (
    <div
      className={cx(
        'flex shrink-0 flex-col items-center rounded-[18px] py-3',
        muted ? 'border border-line bg-inset text-[#636E72] dark:text-white/70' : 'bg-brand-gradient text-white shadow-[0_6px_14px_-4px_rgba(108,92,231,0.35)]',
      )}
      style={{ width }}
    >
      <span className="text-[10.5px] font-bold uppercase tracking-[1px] opacity-90">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
      <span className="text-[26px] font-bold leading-[1.1]">{date.getDate()}</span>
      <span className="text-[11px] font-medium opacity-85">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
    </div>
  )
}

export function AppointmentCard({ details, onTap }: { details: AppointmentWithDetails; onTap?: () => void }) {
  const a = details.appointment
  const style = appointmentStatusStyle(a)
  return (
    <Card onClick={onTap} radius={26}>
      <div className="flex items-start gap-3.5">
        <AppointmentDateBlock date={a.startTime} muted={style.muted} />
        <div className="min-w-0 flex-1">
          <Pill label={style.label} color={style.color} icon={style.icon} />
          <p className="t-heading mt-2 truncate text-base">{details.salon.salonName}</p>
          <p className="t-caption mt-[3px] flex items-start gap-1.5">
            <Scissors size={13} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{serviceNames(details)}</span>
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-3.5 rounded-2xl bg-inset px-3.5 py-3">
        <Meta icon={Clock} text={formatTime(a.startTime)} />
        <Meta icon={Hourglass} text={`${a.durationMinutes} min`} />
        <span className="ml-auto text-[14.5px] font-bold text-primary-dark dark:text-primary">{formatCurrency(a.totalPrice)}</span>
      </div>
    </Card>
  )
}

function Meta({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="t-body flex items-center gap-1.5 text-[13px] font-semibold">
      <Icon size={15} className="text-muted" />
      {text}
    </span>
  )
}

const waBookingMessage = (salonName: string, date: string, time: string) =>
  `Hi ${salonName}! 👋 I have a booking on ${date} at ${time}. I'd like to confirm the location details.`

export function AppointmentDetailsSheet({ details, onClose }: { details: AppointmentWithDetails | null; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  if (!details) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const a = details.appointment
  const salon = details.salon
  const style = appointmentStatusStyle(a)
  const contact = salon.whatsappNumber ?? salon.phoneNumber
  const canContact = contact != null && !style.muted
  const canReview = a.status === AppointmentStatus.completed

  const openWhatsApp = () => {
    const phone = (contact ?? '').replace(/\D/g, '')
    const msg = waBookingMessage(salon.salonName, a.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), formatTime(a.startTime))
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  return (
    <Sheet open onClose={onClose}>
      <div className="flex items-center gap-3.5 pt-1">
        <Avatar url={salon.primaryImage} name={salon.salonName} size={56} />
        <div className="min-w-0 flex-1">
          <p className="t-title line-clamp-2">{salon.salonName}</p>
          <p className="t-caption mt-1 flex items-center gap-1">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{salon.district ?? salon.address}</span>
          </p>
        </div>
        <Pill label={style.label} color={style.color} icon={style.icon} />
      </div>

      <div className={cx('mt-[18px] flex items-center rounded-[22px] p-4', style.muted ? 'bg-inset' : 'bg-hero-light text-white dark:bg-hero-dark')}>
        <SheetWhen icon={CalendarDays} label={t('common.date')} value={fmtDayShort(a.startTime)} onDark={!style.muted} />
        <div className={cx('h-[38px] w-px', style.muted ? 'bg-line' : 'bg-white/35')} />
        <SheetWhen icon={Clock} label={t('common.time')} value={formatTime(a.startTime)} onDark={!style.muted} padLeft />
      </div>

      <p className="t-label mt-[18px]">{t('common.services')}</p>
      <div className="mt-2">
        {details.services.length === 0 ? (
          <p className="t-body">{serviceNames(details)}</p>
        ) : (
          details.services.map((s) => (
            <div key={s.id} className="flex items-center py-[5px]">
              <span className="t-body flex-1">{s.name}</span>
              <span className="t-caption font-semibold">{formatCurrency(serviceHelpers.effectivePrice(s))}</span>
            </div>
          ))
        )}
      </div>
      <div className="mt-2.5 border-t border-line pt-3">
        <div className="flex items-center gap-1.5">
          <Hourglass size={15} className="text-muted" />
          <span className="t-caption">{a.durationMinutes} min</span>
          <span className="t-caption ml-auto">{t('common.total')}</span>
          <span className="ml-2.5 text-[19px] font-bold text-primary-dark dark:text-primary">{formatCurrency(a.totalPrice)}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {canContact && (
          <button onClick={openWhatsApp} className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-[14.5px] font-bold text-[#06381C] hover:brightness-95">
            <MessageCircle size={18} /> {t('client.appointments.contact_salon')}
          </button>
        )}
        {canReview && (
          <button
            onClick={() => {
              onClose()
              navigate(Routes.writeReview(salon.id), { state: { salon } })
            }}
            className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary text-[14.5px] font-bold text-white hover:bg-primary-dark"
          >
            <Star size={18} /> Write a Review
          </button>
        )}
        <button onClick={onClose} className="h-[46px] rounded-2xl font-semibold text-muted hover:bg-inset">
          {t('common.close')}
        </button>
      </div>
    </Sheet>
  )
}

function SheetWhen({ icon: Icon, label, value, onDark, padLeft }: { icon: LucideIcon; label: string; value: string; onDark: boolean; padLeft?: boolean }) {
  return (
    <div className={cx('flex min-w-0 flex-1 items-center gap-2.5', padLeft && 'pl-4')}>
      <Icon size={20} className={onDark ? 'text-white' : 'text-ink'} />
      <div className="min-w-0">
        <p className={cx('t-label', onDark && '!text-white/80')}>{label}</p>
        <p className={cx('t-body mt-0.5 truncate font-bold', onDark && '!text-white')}>{value}</p>
      </div>
    </div>
  )
}
