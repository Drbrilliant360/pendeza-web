// Port of lib/shared/widgets/salon_card.dart – photo-first card with favourite heart.
import { BadgeCheck, Clock, MapPin } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cx, Pill } from '@/components/ui'
import { salonHelpers, type SalonModel } from '@/lib/models'
import FavoriteButton from './FavoriteButton'
import SalonImage from './SalonImage'

export default function SalonCard({
  salon,
  onClick,
  className,
  style,
}: {
  salon: SalonModel
  onClick?: () => void
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setCompact(e.contentRect.width < 200))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const category = salon.serviceCategories[0] ?? null
  const hasHours = !!salon.openingTime && !!salon.closingTime

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      className={cx(
        'relative cursor-pointer overflow-hidden rounded-[26px] shadow-[0_10px_20px_-8px_rgba(0,0,0,0.18)] transition-transform active:scale-[0.98]',
        className,
      )}
      style={style}
    >
      <SalonImage salonId={salon.id} url={salon.primaryImage} alt={salon.salonName} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, transparent 32%, rgba(0,0,0,0.30) 60%, rgba(0,0,0,0.85) 100%)',
        }}
      />
      <div className="absolute right-2.5 top-2.5">
        <FavoriteButton salonId={salon.id} />
      </div>
      <div className="absolute inset-x-3.5 bottom-3.5 text-white">
        <div className="flex items-center gap-1.5">
          <span className={cx('truncate font-bold leading-tight', compact ? 'text-[14.5px]' : 'text-[16.5px]')}>{salon.salonName}</span>
          {salonHelpers.isApproved(salon) && <BadgeCheck size={15} className="shrink-0 text-[#8FE3C9]" />}
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <MapPin size={11} className="shrink-0 text-white/80" />
          <span className={cx('truncate text-white/85', compact ? 'text-[11px]' : 'text-xs')}>{salon.district ?? salon.address}</span>
        </div>
        {(category || (hasHours && !compact)) && (
          <div className="mt-2.5 flex min-w-0 items-center gap-1.5">
            {category && <Pill label={category} onDark className="min-w-0" />}
            {hasHours && !compact && <Pill label={`${salon.openingTime} – ${salon.closingTime}`} icon={Clock} onDark className="shrink-0" />}
          </div>
        )}
      </div>
    </div>
  )
}
