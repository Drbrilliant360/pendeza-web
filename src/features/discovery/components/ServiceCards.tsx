// Port of 2_client_discovery/presentation/widgets/service_card.dart (ServiceCard + FeaturedServiceCard)
import { CheckCircle2, ChevronRight, Clock, Flame, Star } from 'lucide-react'
import { useState } from 'react'
import { Card, cx, Pill, toneForKey } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { serviceHelpers, type ServiceModel } from '@/lib/models'
import { serviceCategoryIcon } from '../utils'

const DISCOUNT = '#EF4444'
const POPULAR = '#F5A623'
const priceClass = (discounted: boolean) => (discounted ? 'text-[#EF4444]' : 'text-primary-dark dark:text-primary')

function ServiceImage({ service, iconSize, className }: { service: ServiceModel; iconSize: number; className?: string }) {
  const [broken, setBroken] = useState(false)
  const tone = toneForKey(service.category)
  const Icon = serviceCategoryIcon(service.category)
  if (service.imageUrl && !broken) {
    return <img src={service.imageUrl} alt="" loading="lazy" onError={() => setBroken(true)} className={cx('h-full w-full object-cover', className)} />
  }
  return (
    <span className="grid h-full w-full place-items-center">
      <Icon size={iconSize} style={{ color: tone }} />
    </span>
  )
}

export function ServiceCard({ service, selected = false, onClick }: { service: ServiceModel; selected?: boolean; onClick?: () => void }) {
  const t = useT()
  const tone = toneForKey(service.category)
  const discounted = serviceHelpers.hasDiscount(service)
  return (
    <Card onClick={onClick} radius={22} className={cx('!p-3', selected && '!border-primary bg-primary/[0.06]')}>
      <span className="flex items-center gap-3">
        <span className="relative h-16 w-16 shrink-0">
          <span className="block h-full w-full overflow-hidden rounded-[18px]" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
            <ServiceImage service={service} iconSize={26} />
          </span>
          {discounted && (
            <span className="absolute -right-[5px] -top-[5px] rounded-lg border-2 border-card px-[5px] py-[2px] text-[9px] font-extrabold text-white" style={{ background: DISCOUNT }}>
              -{Math.trunc(serviceHelpers.discountPercentage(service))}%
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="t-body line-clamp-2 font-bold">{service.name}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="t-caption flex items-center gap-1">
              <Clock size={13} />
              {service.durationMinutes} {t('common.min')}
            </span>
            {serviceHelpers.isPopular(service) && <Pill label={t('client.salon_details.popular')} color={POPULAR} icon={Flame} />}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          {discounted && <span className="t-caption text-[11px] line-through">{formatCurrency(service.price)}</span>}
          <span className={cx('text-[15px] font-bold', priceClass(discounted))}>{formatCurrency(serviceHelpers.effectivePrice(service))}</span>
          <span className="mt-1.5">
            {selected ? (
              <CheckCircle2 size={24} className="text-primary" fill="currentColor" stroke="white" />
            ) : onClick ? (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/[0.12] text-primary-dark dark:text-primary">
                <ChevronRight size={12} />
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </Card>
  )
}

export function FeaturedServiceCard({ service, onClick }: { service: ServiceModel; onClick?: () => void }) {
  const t = useT()
  const tone = toneForKey(service.category)
  const discounted = serviceHelpers.hasDiscount(service)
  const featured = service.isFeatured
  return (
    <Card onClick={onClick} radius={24} className="!w-[176px] shrink-0 overflow-hidden !p-0" style={{ height: 214 }}>
      <span className="flex h-full flex-col">
        <span
          className="relative block h-[104px] w-full shrink-0"
          style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${tone} 25%, transparent), color-mix(in srgb, ${tone} 10%, transparent))` }}
        >
          <ServiceImage service={service} iconSize={36} />
          <span
            className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-white"
            style={{ background: featured ? '#6C5CE7' : POPULAR }}
          >
            {featured ? <Star size={10} fill="currentColor" /> : <Flame size={10} fill="currentColor" />}
            {t(featured ? 'client.salon_details.featured' : 'client.salon_details.popular')}
          </span>
          {discounted && (
            <span className="absolute right-2.5 top-2.5 rounded-lg px-[7px] py-[3px] text-[10px] font-extrabold text-white" style={{ background: DISCOUNT }}>
              -{Math.trunc(serviceHelpers.discountPercentage(service))}%
            </span>
          )}
        </span>
        <span className="flex flex-1 flex-col px-3 py-2.5">
          <span className="t-body line-clamp-2 font-bold !leading-[1.25]">{service.name}</span>
          <span className="flex-1" />
          <span className="t-caption flex items-center gap-1 text-[11px]">
            <Clock size={12} />
            {service.durationMinutes} {t('common.min')}
          </span>
          <span className="mt-1 flex items-baseline gap-1.5">
            <span className={cx('truncate text-[15px] font-bold', priceClass(discounted))}>{formatCurrency(serviceHelpers.effectivePrice(service))}</span>
            {discounted && <span className="t-caption truncate text-[10.5px] line-through">{formatCurrency(service.price)}</span>}
          </span>
        </span>
      </span>
    </Card>
  )
}
