// Port of lib/shared/widgets/data_table.dart (CustomDataTable on data_table_2, paginated)
// adapted for the web: a real table on desktop (md+) and the app's card list on phones.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cx } from '@/components/ui'
import { GUTTER } from './ui'

export interface Column<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function AdminDataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  renderCard,
  rowsPerPage = 10,
  cardMinWidth = 360,
  header,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  /** mobile / card rendering of a row */
  renderCard: (row: T) => ReactNode
  rowsPerPage?: number
  cardMinWidth?: number
  /** content rendered above both layouts (scrolls with the list) */
  header?: ReactNode
}) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / rowsPerPage))
  useEffect(() => {
    if (page >= pages) setPage(0)
  }, [page, pages])
  const start = page * rowsPerPage
  const visible = rows.slice(start, start + rowsPerPage)

  return (
    <div className={cx('pb-8 pt-2', GUTTER)}>
      {header}
      {/* Phones: card list (grid like the app) */}
      <div className="grid gap-3 md:hidden" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${cardMinWidth}px, 100%), 1fr))` }}>
        {rows.map((r) => (
          <div key={rowKey(r)}>{renderCard(r)}</div>
        ))}
      </div>
      {/* Desktop: paginated table */}
      <div className="hidden overflow-hidden rounded-[18px] border border-line/70 bg-card shadow-sm1 dark:border-line dark:shadow-none md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-primary/[0.04] dark:bg-inset">
                {columns.map((c) => (
                  <th key={c.key} className={cx('px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3px] text-ink/60', c.align === 'right' && 'text-right', c.className)}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={rowKey(r)}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(r)) : undefined}
                  className={cx('border-b border-line/60 last:border-0 dark:border-line', onRowClick && 'cursor-pointer transition hover:bg-primary/[0.04] focus:bg-primary/[0.06] focus:outline-none active:bg-primary/[0.1]')}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cx('px-4 py-3 align-middle text-sm text-ink', c.align === 'right' && 'text-right', c.className)}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-end gap-3 border-t border-line px-4 py-2.5 text-[12.5px] text-ink/60">
            <span>
              {start + 1}–{Math.min(start + rowsPerPage, rows.length)} of {rows.length}
            </span>
            <button aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5 disabled:opacity-40">
              <ChevronLeft size={18} />
            </button>
            <button aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5 disabled:opacity-40">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
