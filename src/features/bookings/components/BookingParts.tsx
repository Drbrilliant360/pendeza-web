// Booking step widgets: BookingStepHeader, BookingSummaryFooter, ServicePrice,
// ServiceSelectionCard, BookingServiceTile, BookingTotalRow, AppointmentSummaryCard.
import {
  Brush,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
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
import { useNavigate } from 'react-router-dom'
import { canGoBack } from '@/features/auth/chrome'
import { BrandHero, cx, GlassCircleButton, IconTile, PrimaryButton, toneForKey } from '@/components/ui'
import { formatCurrency, formatTime } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { serviceHelpers, type ServiceModel } from '@/lib/models'

/** shared/widgets/service_category_icon.dart */
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

/** "Wed, Nov 5" (DateFormat('EEE, MMM d')) */
export const fmtDayShort = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

// ── header ───────────────────────────────────────────────────────────────────
export function BookingStepHeader({
  step,
  title,
  subtitle,
  onBack,
  parent,
}: {
  step: 1 | 2 | 3
  title: string
  subtitle: string
  onBack?: () => void
  /** Where Back goes when there is no in-app history (deep link / refresh). */
  parent?: string
}) {
  const t = useT()
  const navigate = useNavigate()
  const labels = [t('client.booking.step_services'), t('client.booking.step_time'), t('client.booking.step_confirm')]
  return (
    <BrandHero radius={28} padded={false} className="mx-4 mt-2">
      <div className="px-3.5 pb-4 pr-4 pt-3.5">
        <div className="flex items-center gap-3">
          <GlassCircleButton icon={ChevronLeft} size={42} label="Back" onClick={onBack ?? (() => (canGoBack() || !parent ? navigate(-1) : navigate(parent, { replace: true })))} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-bold leading-tight">{title}</h1>
            {subtitle && <p className="truncate text-[12.5px] text-white/85">{subtitle}</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-2 pl-0.5" aria-label={t('common.step', [step, 3])}>
          {labels.map((label, i) => {
            const reached = i < step
            const current = i === step - 1
            return (
              <div key={label} className="min-w-0 flex-1">
                <div className={cx('h-[5px] rounded-full transition-colors duration-300', reached ? 'bg-white' : 'bg-white/30')} />
                <p className={cx('mt-1.5 truncate text-[11px]', current ? 'font-bold' : 'font-medium', reached ? 'text-white' : 'text-white/65')}>{label}</p>
              </div>
            )
          })}
        </div>
      </div>
    </BrandHero>
  )
}

// ── footer ───────────────────────────────────────────────────────────────────
export function BookingSummaryFooter({
  totalPrice,
  totalDurationMinutes,
  buttonText,
  buttonIcon,
  onButtonPressed,
  loading,
  label,
  caption,
}: {
  totalPrice: number
  totalDurationMinutes: number
  buttonText: string
  buttonIcon: LucideIcon
  onButtonPressed?: (() => void) | null
  loading?: boolean
  label?: string
  caption?: string | null
}) {
  const t = useT()
  const captionText = caption !== undefined ? caption : totalDurationMinutes > 0 ? t('client.booking.approx_duration', [totalDurationMinutes]) : null
  return (
    <div className="sticky bottom-0 z-10 mt-auto rounded-t-[28px] border-t border-line bg-card shadow-[0_-6px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_-6px_24px_rgba(0,0,0,0.4)]">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-[5]">
          <p className="t-caption truncate">{label ?? t('common.total_label')}</p>
          <p className="truncate text-[20px] font-bold text-primary-dark dark:text-primary">{formatCurrency(totalPrice)}</p>
          {captionText && <p className="t-caption truncate text-[11.5px]">{captionText}</p>}
        </div>
        <div className="flex-[6]">
          <PrimaryButton icon={buttonIcon} loading={loading} disabled={!onButtonPressed} onClick={() => onButtonPressed?.()}>
            {buttonText}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

// ── service rows ─────────────────────────────────────────────────────────────
export function ServicePrice({ service, fontSize = 15 }: { service: ServiceModel; fontSize?: number }) {
  return (
    <div className="flex shrink-0 flex-col items-end">
      {serviceHelpers.hasDiscount(service) && <span className="t-caption text-[11px] line-through">{formatCurrency(service.price)}</span>}
      <span className="font-bold text-primary-dark dark:text-primary" style={{ fontSize }}>
        {formatCurrency(serviceHelpers.effectivePrice(service))}
      </span>
    </div>
  )
}

export function ServiceSelectionCard({ service, isSelected, onTap }: { service: ServiceModel; isSelected: boolean; onTap: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={isSelected}
      className={cx(
        'flex w-full items-start gap-3.5 rounded-[22px] border py-3.5 pl-3.5 pr-4 text-left shadow-sm1 transition active:scale-[0.995] dark:shadow-none',
        isSelected ? 'border-primary bg-primary/[0.06] dark:bg-primary/[0.18]' : 'border-line/60 bg-card hover:border-primary/40 dark:border-line',
      )}
    >
      <span
        className={cx(
          'mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full transition',
          isSelected ? 'bg-brand-gradient shadow-[0_4px_10px_-3px_rgba(108,92,231,0.4)]' : 'border-2 border-muted/50',
        )}
      >
        <Check size={16} strokeWidth={3} className={cx('text-white transition-transform', isSelected ? 'scale-100' : 'scale-0')} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="t-body line-clamp-2 font-bold">{service.name}</span>
        {service.description && <span className="t-caption mt-[3px] line-clamp-2">{service.description}</span>}
        <span className="t-caption mt-2 flex items-center gap-1 font-semibold">
          <Clock size={13} className={isSelected ? 'text-primary-dark dark:text-primary' : 'text-muted'} />
          {service.durationMinutes} {t('common.min')}
        </span>
      </span>
      <ServicePrice service={service} />
    </button>
  )
}

export function BookingServiceTile({ service }: { service: ServiceModel }) {
  const t = useT()
  return (
    <div className="flex items-center gap-3 py-2">
      <IconTile icon={serviceCategoryIcon(service.category)} color={toneForKey(service.category)} size={40} />
      <div className="min-w-0 flex-1">
        <p className="t-body line-clamp-2 font-semibold">{service.name}</p>
        <p className="t-caption mt-0.5">
          {service.durationMinutes} {t('common.min')}
        </p>
      </div>
      <ServicePrice service={service} fontSize={14.5} />
    </div>
  )
}

export function BookingTotalRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="t-body flex-1 font-normal text-muted">{title}</span>
      <span className="t-body font-bold">{value}</span>
    </div>
  )
}

// ── confirmation ticket ──────────────────────────────────────────────────────
export function AppointmentSummaryCard({ salonName, when }: { salonName: string; when: Date | null }) {
  const t = useT()
  return (
    <BrandHero radius={28} padded={false}>
      <div className="p-[18px]">
        <div className="flex items-center gap-3.5">
          <div className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[15px] border border-white/30 bg-white/20">
            <Scissors size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[1px] text-white/80">{t('client.booking.your_booking')}</p>
            <p className="mt-0.5 line-clamp-2 text-[19px] font-bold leading-tight">{salonName}</p>
          </div>
        </div>
        {when && (
          <div className="mt-4 flex items-center rounded-[20px] border border-white/25 bg-white/15 px-4 py-3.5">
            <When icon={CalendarDays} label={t('common.date')} value={fmtDayShort(when)} className="flex-[6]" />
            <div className="mx-3 h-[38px] w-px bg-white/35" />
            <When icon={Clock} label={t('common.time')} value={formatTime(when)} className="flex-[4]" />
          </div>
        )}
      </div>
    </BrandHero>
  )
}

function When({ icon: Icon, label, value, className }: { icon: LucideIcon; label: string; value: string; className?: string }) {
  return (
    <div className={cx('flex min-w-0 items-center gap-2.5', className)}>
      <Icon size={20} className="shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.8px] text-white/80">{label}</p>
        <p className="truncate text-[14.5px] font-bold">{value}</p>
      </div>
    </div>
  )
}

