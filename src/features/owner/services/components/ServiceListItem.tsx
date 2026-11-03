// _ServiceListItem from services/presentation/screens/service_list_screen.dart
import { Brush, Clock, Eye, Hand, Loader2, Pause, PenLine, Scissors, Smile, Sparkles, Star, Stethoscope, Tag, User, type LucideIcon } from 'lucide-react'
import { cx } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { serviceHelpers, type ServiceModel } from '@/lib/models'

function categoryIcon(category: string): LucideIcon {
  const c = category.toLowerCase()
  if (c.includes('hair')) return Scissors
  if (c.includes('nail')) return Hand
  if (c.includes('massage')) return Sparkles
  if (c.includes('skin') || c.includes('facial')) return Smile
  if (c.includes('makeup') || c.includes('beauty')) return Brush
  if (c.includes('braid') || c.includes('extension')) return User
  if (c.includes('lash') || c.includes('brow')) return Eye
  if (c.includes('men') || c.includes('groom')) return Scissors
  if (c.includes('body') || c.includes('spa')) return Sparkles
  if (c.includes('tattoo') || c.includes('piercing')) return PenLine
  if (c.includes('medical')) return Stethoscope
  return Scissors
}

export default function ServiceListItem({
  service,
  onOpen,
  onToggleActive,
  toggling = false,
}: {
  service: ServiceModel
  onOpen: () => void
  onToggleActive: () => void
  /** The active/paused change is being saved (UI already shows the new state optimistically). */
  toggling?: boolean
}) {
  const t = useT()
  const inactive = !service.isActive
  const hasDiscount = serviceHelpers.hasDiscount(service)
  const Icon = categoryIcon(service.category)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
        e.preventDefault()
        onOpen()
      }}
      className={cx(
        'flex cursor-pointer items-center gap-4 rounded-2xl border bg-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition hover:border-primary/40 dark:shadow-none',
        inactive ? 'border-warning/40 opacity-60' : 'border-line/70',
      )}
    >
      <div className="relative shrink-0">
        <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-[14px] border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
          {service.imageUrl ? <img src={service.imageUrl} alt="" className="h-full w-full object-cover" /> : <Icon size={26} />}
        </div>
        {serviceHelpers.isPopular(service) && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[14px] w-[14px] place-items-center rounded-full bg-warning text-white">
            <Star size={10} fill="currentColor" />
          </span>
        )}
        {inactive && (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-[14px] w-[14px] place-items-center rounded-full bg-warning text-white">
            <Pause size={10} fill="currentColor" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center">
          <span className={cx('min-w-0 flex-1 truncate text-base font-bold text-ink', inactive && 'line-through')}>{service.name}</span>
          {service.isFeatured && (
            <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary dark:text-primary-light">
              {t('owner.services.featured')}
            </span>
          )}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <InfoChip icon={Clock} text={`${service.durationMinutes} ${t('common.min')}`} color="#6C5CE7" />
          {service.category && <InfoChip icon={Tag} text={service.category} color="#9C27B0" />}
          {service.bookingsCount > 0 && (
            <span className="shrink-0 text-[10px] text-muted">{t('owner.services.bookings_count', [service.bookingsCount])}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        {hasDiscount && <span className="mb-0.5 text-xs text-muted line-through">{formatCurrency(service.price)}</span>}
        <span
          className={cx(
            'rounded-[10px] px-2.5 py-1.5 text-sm font-bold text-white',
            hasDiscount
              ? 'bg-danger shadow-[0_2px_6px_rgba(244,67,54,0.3)]'
              : 'bg-success shadow-[0_2px_6px_rgba(76,175,80,0.3)]',
          )}
        >
          {formatCurrency(serviceHelpers.effectivePrice(service))}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleActive()
          }}
          disabled={toggling}
          aria-busy={toggling || undefined}
          aria-pressed={!inactive}
          className={cx(
            'relative mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[\'\'] disabled:cursor-wait',
            inactive ? 'bg-success/10 text-success' : 'bg-warning/15 text-[#E0A800]',
          )}
        >
          {toggling && <Loader2 size={10} className="animate-spin" />}
          {inactive ? t('owner.services.activate') : t('owner.services.pause')}
        </button>
      </div>
    </div>
  )
}

function InfoChip({ icon: Icon, text, color }: { icon: LucideIcon; text: string; color: string }) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-[3px] rounded-md px-1.5 py-[3px] text-[10px] font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
    >
      <Icon size={10} className="shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  )
}
