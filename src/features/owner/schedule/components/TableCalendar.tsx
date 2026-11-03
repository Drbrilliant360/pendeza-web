// Minimal port of the table_calendar widget as configured in calendar_screen.dart
// (Sunday-first, outside days visible, centered title, no format button, month/week formats).
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cx } from '@/components/ui'
import { isSameDay } from '@/lib/format'

export type CalendarFormat = 'month' | 'week'

const FIRST_DAY = new Date(2020, 0, 1)
const LAST_DAY = new Date(2030, 11, 31)
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const weekStart = (d: Date) => addDays(d, -d.getDay())

function visibleDays(focused: Date, format: CalendarFormat): Date[] {
  if (format === 'week') {
    const s = weekStart(focused)
    return Array.from({ length: 7 }, (_, i) => addDays(s, i))
  }
  const first = new Date(focused.getFullYear(), focused.getMonth(), 1)
  const last = new Date(focused.getFullYear(), focused.getMonth() + 1, 0)
  const start = weekStart(first)
  const end = addDays(weekStart(last), 6)
  const out: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
  return out
}

export default function TableCalendar({
  focusedDay,
  selectedDay,
  format,
  onDaySelected,
  onPageChanged,
}: {
  focusedDay: Date
  selectedDay: Date
  format: CalendarFormat
  onDaySelected: (selected: Date, focused: Date) => void
  onPageChanged: (focused: Date) => void
}) {
  const days = visibleDays(focusedDay, format)
  const today = new Date()

  const page = (dir: 1 | -1) => {
    const next =
      format === 'week'
        ? addDays(focusedDay, 7 * dir)
        : new Date(focusedDay.getFullYear(), focusedDay.getMonth() + dir, 1)
    if (next < new Date(FIRST_DAY.getFullYear(), FIRST_DAY.getMonth(), 1) || next > LAST_DAY) return
    onPageChanged(next)
  }

  const title = focusedDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <button type="button" aria-label="Previous" onClick={() => page(-1)} className="grid h-10 w-10 place-items-center rounded-full text-primary hover:bg-primary/10">
          <ChevronLeft size={22} />
        </button>
        <span className="text-base font-bold text-ink">{title}</span>
        <button type="button" aria-label="Next" onClick={() => page(1)} className="grid h-10 w-10 place-items-center rounded-full text-primary hover:bg-primary/10">
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="grid grid-cols-7 pb-1 text-center text-[12px] font-medium text-muted">
        {DOW.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d) => {
          const outside = format === 'month' && d.getMonth() !== focusedDay.getMonth()
          const disabled = d < FIRST_DAY || d > LAST_DAY
          const selected = isSameDay(d, selectedDay)
          const isToday = isSameDay(d, today)
          return (
            <div key={d.toISOString()} className="flex justify-center">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDaySelected(d, d)}
                className={cx(
                  'grid h-10 w-10 place-items-center rounded-full text-sm transition md:h-11 md:w-11',
                  selected
                    ? 'bg-gradient-to-br from-primary to-accent font-bold text-white shadow-[0_2px_8px_rgba(108,92,231,0.4)]'
                    : isToday
                      ? 'border-2 border-primary/50 bg-gradient-to-br from-primary/30 to-accent/30 font-bold text-primary'
                      : outside
                        ? 'text-muted/60 hover:bg-inset'
                        : 'text-ink hover:bg-inset',
                  disabled && 'opacity-30',
                )}
              >
                {d.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
