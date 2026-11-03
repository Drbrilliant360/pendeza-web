// HorizontalDayPicker (calendar_view.dart) + TimeSlotChip (time_slot_chip.dart)
import { useEffect, useMemo, useRef } from 'react'
import { cx } from '@/components/ui'
import { isSameDay } from '@/lib/format'
import { useT } from '@/lib/i18n'

const ITEM_W = 62
const GAP = 10

export function HorizontalDayPicker({ selectedDate, onDateSelected }: { selectedDate: Date; onDateSelected: (d: Date) => void }) {
  const t = useT()
  const scroller = useRef<HTMLDivElement>(null)
  const days = useMemo(() => {
    const first = new Date()
    return Array.from({ length: 30 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i, first.getHours(), first.getMinutes()))
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const diff = days.findIndex((d) => isSameDay(d, selectedDate))
    if (diff > 0) el.scrollTo({ left: diff * (ITEM_W + GAP), behavior: 'smooth' })
    // only on mount (like initState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const now = new Date()
  return (
    <div ref={scroller} className="no-scrollbar flex gap-[10px] overflow-x-auto px-5 py-2" role="listbox">
      {days.map((date) => {
        const sel = isSameDay(date, selectedDate)
        const today = isSameDay(date, now)
        return (
          <button
            key={date.toDateString()}
            role="option"
            aria-selected={sel}
            aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            onClick={() => onDateSelected(date)}
            className={cx(
              'flex h-[84px] shrink-0 flex-col items-center justify-center rounded-[20px] transition',
              sel
                ? 'bg-brand-gradient text-white shadow-[0_6px_14px_-4px_rgba(108,92,231,0.4)]'
                : today
                  ? 'border-[1.5px] border-primary/55 bg-card'
                  : 'border border-line bg-card hover:border-primary/40',
            )}
            style={{ width: ITEM_W }}
          >
            <span className={cx('text-[11.5px] font-semibold', sel ? 'text-white/90' : today ? 'text-primary-dark dark:text-primary' : 'text-muted')}>
              {today ? t('client.dashboard.today') : date.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className={cx('mt-1 text-[22px] font-bold leading-[1.1]', sel ? 'text-white' : 'text-ink')}>{date.getDate()}</span>
            <span className={cx('mt-1 text-[10.5px]', sel ? 'text-white/80' : 'text-muted')}>{date.toLocaleDateString('en-US', { month: 'short' })}</span>
          </button>
        )
      })}
    </div>
  )
}

export function TimeSlotChip({ slot, isSelected, onTap }: { slot: string; isSelected: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onTap}
      className={cx(
        'h-12 w-full truncate rounded-2xl px-1.5 text-sm transition',
        isSelected
          ? 'bg-brand-gradient font-bold text-white shadow-[0_6px_14px_-4px_rgba(108,92,231,0.4)]'
          : 'border border-line bg-card font-semibold text-ink hover:border-primary/40',
      )}
    >
      {slot}
    </button>
  )
}
