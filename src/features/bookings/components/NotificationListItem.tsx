// Port of 2_client_notifications/presentation/widgets/notification_list_item.dart
// Swipe left to delete (pointer drag) – plus a small trash button for mouse users.
import { ArrowRight, Bell, CalendarDays, ChevronRight, Clock, CreditCard, Image as ImageIcon, Settings, Star, Tag, Trash2, type LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { cx, IconTile, PrimaryButton } from '@/components/ui'
import { timeAgo } from '@/lib/format'
import { useT } from '@/lib/i18n'
import type { NotificationType } from '@/lib/models'
import type { NotificationModel } from '../api'

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  appointment: CalendarDays,
  promotion: Tag,
  system: Settings,
  payment: CreditCard,
  review: Star,
  general: Bell,
}
const TYPE_COLOR: Record<NotificationType, string> = {
  appointment: '#74B9FF',
  promotion: '#FDCB6E',
  system: '#6C5CE7',
  payment: '#00B894',
  review: '#F5A623',
  general: '#A29BFE',
}

const isBodyLong = (s: string) => s.length > 100 || s.includes('\n')

export function NotificationListItem({
  notification: n,
  onTap,
  onDismiss,
}: {
  notification: NotificationModel
  onTap: () => void
  onDismiss: () => void
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const unread = !n.isRead
  const tone = TYPE_COLOR[n.type]
  const hasImage = !!n.imageUrl
  const long = isBodyLong(n.body)

  const tap = () => {
    if (long) setExpanded((e) => !e)
    onTap()
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center justify-end rounded-[22px] bg-danger pr-6 text-white" aria-hidden>
        <Trash2 size={22} />
      </div>
      <div
        className={cx(
          'group relative cursor-pointer touch-pan-y select-none rounded-[22px] border p-3.5 shadow-sm1 dark:shadow-none',
          unread ? 'border-primary/25 bg-[rgb(247,246,254)] dark:border-primary/40 dark:bg-[rgb(40,40,80)]' : 'border-line/60 bg-card dark:border-line',
          dragging ? '' : 'transition-transform',
        )}
        style={{ transform: `translateX(${dx}px)` }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            tap()
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return
          drag.current = { x: e.clientX, moved: false }
          setDragging(true)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const d = Math.min(0, e.clientX - drag.current.x)
          if (Math.abs(d) > 6) drag.current.moved = true
          setDx(d)
        }}
        onPointerUp={() => {
          const d = drag.current
          drag.current = null
          setDragging(false)
          if (d?.moved && dx < -110) {
            setDx(-window.innerWidth)
            setTimeout(onDismiss, 150)
          } else setDx(0)
        }}
        onPointerCancel={() => {
          drag.current = null
          setDragging(false)
          setDx(0)
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-noclick]')) return
          if (dx !== 0) return
          tap()
        }}
      >
        <div className="flex items-start gap-3">
          {hasImage ? (
            <img src={n.imageUrl!} alt="" className="h-[46px] w-[46px] shrink-0 rounded-[15px] object-cover" />
          ) : (
            <IconTile icon={TYPE_ICON[n.type]} color={tone} size={46} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <p className={cx('t-body line-clamp-2 flex-1', unread ? 'font-bold' : 'font-semibold')}>{n.title}</p>
              {unread && <span className="mt-[5px] h-[9px] w-[9px] shrink-0 rounded-full bg-primary" />}
              <button
                data-noclick
                aria-label={t('common.delete')}
                onClick={onDismiss}
                className="-mr-1 -mt-1 hidden h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger md:grid md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <p className={cx('t-caption mt-1 whitespace-pre-line text-[13px] leading-[1.45]', !expanded && 'line-clamp-2')}>{n.body}</p>
            {long && !expanded && <p className="mt-1 text-xs font-semibold text-primary-dark dark:text-primary">{t('notifications.read_more')}</p>}
            <p className="t-caption mt-2 flex items-center gap-1 text-[11.5px]">
              <Clock size={12} /> {timeAgo(n.createdAt)}
            </p>
          </div>
          {n.actionRoute && n.actionLabel == null && <ChevronRight size={15} className="mt-3 shrink-0 text-muted" />}
        </div>
        {hasImage && <NotificationImage url={n.imageUrl!} />}
        {n.actionRoute && n.actionLabel != null && (
          <div className="mt-3" data-noclick>
            <PrimaryButton icon={ArrowRight} height={48} onClick={onTap}>
              {n.actionLabel}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationImage({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="mt-3 overflow-hidden rounded-2xl">
      {failed ? (
        <div className="grid h-[100px] place-items-center bg-inset text-muted">
          <ImageIcon size={32} />
        </div>
      ) : (
        <img src={url} alt="" className="h-40 w-full bg-inset object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  )
}
