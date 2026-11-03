// Port of promotions/presentation/widgets/promotion_card.dart
import { Image as ImageIcon, Loader2, Trash2, Users, Zap } from 'lucide-react'
import { useState } from 'react'
import { cx } from '@/components/ui'
import { Toggle } from '../components/OwnerChrome'
import { promotionDiscountText, type PromotionModel } from '../models'

export default function PromotionCard({
  promotion,
  onToggleStatus,
  onDelete,
  deleting,
}: {
  promotion: PromotionModel
  onToggleStatus: (isActive: boolean) => void
  onDelete: () => void
  deleting?: boolean
}) {
  const [broken, setBroken] = useState(false)
  return (
    <div className="overflow-hidden rounded-[20px] bg-card shadow-md1 dark:border dark:border-line dark:shadow-none">
      <div className="relative h-[140px] bg-ink/10">
        {promotion.imageUrl && !broken ? (
          <img src={promotion.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <div className="grid h-full place-items-center bg-ink/15 text-muted">
            <ImageIcon size={24} />
          </div>
        )}
        <span className={cx('absolute right-2 top-2 rounded px-2 py-1 text-[10px] font-bold text-white', promotion.isActive ? 'bg-success' : 'bg-ink/45')}>
          {promotion.isActive ? 'ACTIVE' : 'PAUSED'}
        </span>
        {promotion.isFeatured && (
          <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded bg-accent-gradient px-2 py-1 text-[10px] font-bold text-white">
            <Zap size={12} fill="currentColor" /> BOOSTED
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 flex-1 truncate text-[16px] font-bold text-ink">{promotion.title}</h3>
          <span className="shrink-0 font-bold text-primary">{promotionDiscountText(promotion)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-[12.5px] text-muted">{promotion.description}</p>
        <hr className="my-3 border-line/60" />
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[12.5px] text-ink">
            <Users size={16} className="text-muted" /> {promotion.usageCount} Used
          </span>
          <div className="flex items-center gap-1">
            <Toggle checked={promotion.isActive} onChange={onToggleStatus} color="#00B894" label="Active" />
            <button
              onClick={onDelete}
              disabled={deleting}
              aria-busy={deleting || undefined}
              aria-label={`Delete promotion ${promotion.title}`}
              className="grid h-10 w-10 place-items-center rounded-full text-danger hover:bg-danger/10 disabled:opacity-60"
            >
              {deleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
