// Port of 2_client_discovery/presentation/widgets/filter_panel.dart
import { BarChart3, Check, RotateCcw, Sparkles, Star, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx, Sheet } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { ALL_CATEGORIES } from '@/lib/models'
import { discovery, SORT_LABELS, useDiscovery, type SortType } from '../discoveryStore'

const RATINGS = [1.0, 2.0, 3.0, 4.0, 4.5]
const fmtRating = (r: number) => (Number.isInteger(r) ? r.toFixed(1) : String(r))

export default function FilterPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const state = useDiscovery()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [minRating, setMinRating] = useState<number | null>(null)
  const [sortType, setSortType] = useState<SortType>('popularity')

  useEffect(() => {
    if (open && state.status === 'loaded') {
      setCategoryId(state.filters.categoryId)
      setMinRating(state.filters.minRating)
      setSortType(state.filters.sortType)
    }
    // initialise only when the panel opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const reset = () => {
    setCategoryId(null)
    setMinRating(null)
    setSortType('popularity')
  }
  const apply = () => {
    discovery.applyFilters({ categoryId, minRating, sortType })
    onClose()
  }

  const sortOptions: { value: SortType; icon: LucideIcon; desc: string }[] = [
    { value: 'popularity', icon: BarChart3, desc: t('client.discover.filter.sort_popularity_desc') },
    { value: 'rating', icon: Star, desc: t('client.discover.filter.sort_rating_desc') },
    { value: 'newest', icon: Sparkles, desc: t('client.discover.filter.sort_newest_desc') },
  ]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={
        <div className="flex items-center">
          <span className="flex-1 text-[22px]">{t('client.discover.filter.title')}</span>
          <button onClick={reset} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-primary-dark hover:bg-primary/10 dark:text-primary">
            <RotateCcw size={16} />
            {t('client.discover.filter.reset')}
          </button>
        </div>
      }
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="h-[52px] flex-1 rounded-2xl border border-line text-[14.5px] font-semibold text-ink hover:bg-inset">
            {t('common.cancel')}
          </button>
          <button onClick={apply} className="h-[52px] flex-[2] rounded-2xl bg-primary text-[14.5px] font-bold text-white hover:bg-primary-dark">
            {t('client.discover.filter.apply')}
          </button>
        </div>
      }
    >
      <Section title={t('client.discover.filter.category')}>
        <div className="flex flex-wrap gap-2">
          <Chip label={t('client.discover.filter.all_categories')} selected={categoryId == null} onClick={() => setCategoryId(null)} />
          {ALL_CATEGORIES.map((c) => (
            <Chip key={c.id} label={t(`categories.${c.name}`)} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)} />
          ))}
        </div>
      </Section>
      <Section title={t('client.discover.filter.min_rating')}>
        <div className="flex flex-wrap gap-2">
          <Chip label={t('client.discover.filter.any_rating')} selected={minRating == null} onClick={() => setMinRating(null)} />
          {RATINGS.map((r) => (
            <Chip key={r} label={`${fmtRating(r)}+`} star selected={minRating === r} onClick={() => setMinRating(r)} />
          ))}
        </div>
      </Section>
      <Section title={t('client.discover.filter.sort_by')} last>
        {sortOptions.map((o) => {
          const on = sortType === o.value
          const Icon = o.icon
          return (
            <button
              key={o.value}
              onClick={() => setSortType(o.value)}
              className={cx(
                'mb-2.5 flex w-full items-center gap-3.5 rounded-[18px] p-3.5 text-left transition',
                on ? 'border-[1.6px] border-primary bg-primary/10' : 'border border-line bg-card hover:bg-inset',
              )}
            >
              <span className={cx('grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px]', on ? 'bg-brand-gradient text-white' : 'bg-primary/10 text-primary')}>
                <Icon size={19} fill={o.value === 'rating' ? 'currentColor' : 'none'} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-heading block">{SORT_LABELS[o.value]}</span>
                <span className="t-caption mt-0.5 block">{o.desc}</span>
              </span>
              <span className={cx('grid h-[22px] w-[22px] place-items-center rounded-full border-[1.8px]', on ? 'border-primary bg-primary text-white' : 'border-line')}>
                {on && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </Section>
    </Sheet>
  )
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? '' : 'mb-[26px]'}>
      <p className="t-label mb-3">{title}</p>
      {children}
    </div>
  )
}

function Chip({ label, selected, onClick, star }: { label: string; selected: boolean; onClick: () => void; star?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] transition',
        selected ? 'border-[1.6px] border-primary bg-primary/[0.14] font-bold text-primary-dark dark:text-primary' : 'border border-line bg-card font-medium text-ink hover:bg-inset',
      )}
    >
      {star && <Star size={14} className="text-[#F5A623]" fill="currentColor" />}
      {label}
    </button>
  )
}
