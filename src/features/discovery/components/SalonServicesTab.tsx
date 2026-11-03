// Port of 2_client_discovery/presentation/widgets/salon_services_tab.dart
import { AlertCircle, ChevronDown, Scissors } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cx, EmptyState, IconTile, SectionHeader, Skeleton, toneForKey } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useT } from '@/lib/i18n'
import { serviceHelpers, type ServiceModel } from '@/lib/models'
import { serviceCategoryIcon } from '../utils'
import { FeaturedServiceCard, ServiceCard } from './ServiceCards'

export default function SalonServicesTab({
  services,
  loading,
  error,
  onRetry,
  onServiceTap,
}: {
  services: ServiceModel[]
  loading: boolean
  error: unknown
  onRetry: () => void
  onServiceTap: (s: ServiceModel) => void
}) {
  const t = useT()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (!initialised && services.length) {
      setExpanded(new Set(services.map((s) => s.category)))
      setInitialised(true)
    }
  }, [services, initialised])

  const featured = useMemo(
    () =>
      services
        .filter((s) => s.isFeatured || serviceHelpers.isPopular(s))
        .sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1
          if (!a.isFeatured && b.isFeatured) return 1
          return b.bookingsCount - a.bookingsCount
        }),
    [services],
  )

  const byCategory = useMemo(() => {
    const map = new Map<string, ServiceModel[]>()
    for (const s of services) map.set(s.category, [...(map.get(s.category) ?? []), s])
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  }, [services])

  if (loading) {
    return (
      <div className="px-5 pt-3">
        <Skeleton className="h-[22px] w-[150px]" />
        <div className="mt-3 flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[214px] w-[176px] shrink-0" />
          ))}
        </div>
        <div className="mt-[22px] space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      </div>
    )
  }
  if (error) {
    const f = friendlyError(error)
    return (
      <EmptyState
        icon={AlertCircle}
        color="#EF4444"
        title={t('client.salon_details.failed_services')}
        message={[f.message, f.hint].filter(Boolean).join(' ')}
        actionLabel={t('client.salon_details.try_again')}
        onAction={onRetry}
      />
    )
  }
  if (!services.length) return <EmptyState icon={Scissors} title={t('client.salon_details.no_services')} />

  const toggle = (c: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })

  return (
    <div className="pt-2">
      {featured.length > 0 && (
        <div className="mb-[22px]">
          <SectionHeader title={t('client.salon_details.featured_services')} />
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-[18px]">
            {featured.map((s) => (
              <FeaturedServiceCard key={s.id} service={s} onClick={() => onServiceTap(s)} />
            ))}
          </div>
        </div>
      )}
      {byCategory.map(([category, list]) => {
        const open = expanded.has(category)
        const Icon = serviceCategoryIcon(category)
        return (
          <div key={category}>
            <button onClick={() => toggle(category)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-inset/60">
              <IconTile icon={Icon} color={toneForKey(category)} size={38} />
              <span className="t-heading min-w-0 flex-1 truncate">{category}</span>
              <span className="t-caption rounded-full bg-inset px-[9px] py-[3px] font-bold">{list.length}</span>
              <ChevronDown size={16} className={cx('text-muted transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
              <div className="grid gap-2.5 px-5 pb-2 pt-0.5 lg:grid-cols-2">
                {list.map((s) => (
                  <ServiceCard key={s.id} service={s} onClick={() => onServiceTap(s)} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
