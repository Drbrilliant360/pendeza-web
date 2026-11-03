// Port of dashboard/presentation/widgets/kpi_card.dart
import type { LucideIcon } from 'lucide-react'

export default function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  onClick,
  index = 0,
}: {
  title: string
  value: string
  icon: LucideIcon
  color: string
  onClick?: () => void
  index?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex aspect-[1.3] w-full flex-col justify-center rounded-[20px] border border-line/60 bg-card px-4 py-2 text-left shadow-md1 transition active:scale-95 dark:border-line dark:shadow-none md:aspect-auto md:min-h-[120px]"
      style={{ animation: `kpiIn ${400 + index * 100}ms cubic-bezier(0.33,1,0.68,1) both` }}
    >
      <Icon size={20} style={{ color }} />
      <span className="mt-2 block truncate text-[20px] font-bold leading-[1.1] text-ink">{value}</span>
      <span className="mt-0.5 block truncate text-[11px] text-muted">{title}</span>
    </button>
  )
}
