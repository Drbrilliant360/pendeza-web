// Port of 2_client_discovery/presentation/widgets/enhanced_booking_bottom_bar.dart
import { CalendarPlus, Clock, Star } from 'lucide-react'
import { cx } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { salonHelpers, serviceHelpers, type SalonModel, type ServiceModel } from '@/lib/models'
import { useReviews } from '../useReviews'
import { getSalonStatus, hasBusinessHours, STATUS_COLORS } from '../utils'

export default function BookingBottomBar({
  salon,
  services,
  servicesLoading,
  onBook,
}: {
  salon: SalonModel
  services: ServiceModel[]
  servicesLoading: boolean
  onBook: () => void
}) {
  const t = useT()
  const { state } = useReviews()
  const rating = state.status === 'loaded' ? state.averageRating : 0
  const count = state.status === 'loaded' ? state.reviews.length : 0
  const status = getSalonStatus(salon.openingTime, salon.closingTime)
  const isOpen = status === 'open' || status === 'closing'
  const color = STATUS_COLORS[status]
  const noServices = !servicesLoading && services.length === 0
  const startingPrice = services.length ? Math.min(...services.map(serviceHelpers.effectivePrice)) : null
  const bookable = salonHelpers.isBookable(salon)
  const canBook = bookable && !noServices
  const label = !bookable
    ? t('client.salon_details.pending_approval')
    : noServices
      ? t('client.salon_details.unavailable')
      : t('client.appointments.book_now')

  return (
    <div className="fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto max-w-4xl rounded-t-[28px] border-t border-line bg-card shadow-[0_-6px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_-6px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3.5 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center whitespace-nowrap">
              <Star size={14} className="text-[#F5A623]" fill="currentColor" />
              <span className="t-body ml-1 font-bold">{rating > 0 ? rating.toFixed(1) : '-'}</span>
              {count > 0 && <span className="t-caption ml-1">({count})</span>}
              {hasBusinessHours(salon) && (
                <>
                  <span className="mx-2.5 h-3.5 w-px bg-line" />
                  <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 4px 1px ${color}80` }} />
                  <span className="t-caption ml-1.5 font-bold" style={{ color }}>
                    {t(isOpen ? 'client.salon_details.open' : 'client.salon_details.closed')}
                  </span>
                </>
              )}
            </div>
            <div className="mt-1">
              {servicesLoading ? (
                <div className="h-4 w-[90px] animate-pulse rounded-md bg-inset" />
              ) : startingPrice != null ? (
                <p className="truncate">
                  <span className="t-caption">{t('client.salon_details.from')} </span>
                  <span className="text-base font-bold text-primary-dark dark:text-primary">{formatCurrency(startingPrice)}</span>
                </p>
              ) : noServices ? (
                <p className="t-caption">{t('client.salon_details.no_services_yet')}</p>
              ) : null}
            </div>
          </div>
          <button
            onClick={canBook ? onBook : undefined}
            disabled={!canBook}
            className={cx(
              'flex shrink-0 items-center gap-2 rounded-[18px] px-5 py-3.5 text-[14.5px] font-bold transition',
              canBook ? 'bg-brand-gradient text-white shadow-cta hover:brightness-105' : 'bg-ink/10 text-muted',
            )}
          >
            {canBook ? <CalendarPlus size={20} /> : <Clock size={20} />}
            {label}
          </button>
        </div>
      </div>
    </div>
  )
}
