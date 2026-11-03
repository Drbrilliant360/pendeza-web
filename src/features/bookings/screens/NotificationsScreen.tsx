// Port of 2_client_notifications/presentation/screens/notifications_screen.dart
import { BellOff, CircleCheck, Ellipsis, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { useGoBack } from '@/features/auth/chrome'
import { useAction, useFeedback } from '@/components/feedback'
import { cx, EmptyState, ErrorState, GlassCircleButton, PageHeader, Screen, Skeleton } from '@/components/ui'
import { useT } from '@/lib/i18n'
import type { NotificationModel } from '../api'
import { NotificationListItem } from '../components/NotificationListItem'
import { useNotifications } from '../useNotifications'

export default function NotificationsScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { toastSuccess, toastError, confirm } = useFeedback()
  const goBack = useGoBack(Routes.clientHome)
  const n = useNotifications({ onError: (e, context, retry) => toastError(e, context, retry) })
  const { state } = n
  const loaded = state.kind === 'loaded' ? state : null
  const unread = loaded ? loaded.notifications.filter((x) => !x.isRead).length : 0

  const handleTap = (item: NotificationModel) => {
    if (!item.isRead) void n.markAsRead(item.id)
    if (item.actionRoute) navigate(item.actionRoute)
  }

  const handleDismiss = (item: NotificationModel) => {
    n.deleteNotification(item.id)
    toastSuccess(t('notifications.deleted'), { label: t('common.undo'), onClick: () => n.undoDelete(item.id) })
  }

  const refresh = useAction(() => n.refresh(), { error: "Couldn't refresh notifications" })
  const markAllAction = useAction(() => n.markAllAsRead(), {
    success: t('notifications.all_marked_read'),
    error: "Couldn't mark all as read",
  })
  const deleteAllAction = useAction(() => n.deleteAll(), {
    success: 'All notifications deleted',
    error: "Couldn't delete notifications",
  })
  const markAll = () => void markAllAction.run()

  const deleteAll = async () => {
    const ok = await confirm({
      title: t('notifications.delete_all_title'),
      message: t('notifications.delete_all_confirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    })
    if (ok) void deleteAllAction.run()
  }

  let body
  if (state.kind === 'loading') {
    body = (
      <div className="flex flex-col gap-3 px-5 pb-8 pt-[18px]" aria-busy aria-label="Loading notifications">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-[22px] border border-line/60 bg-card p-3.5 dark:border-line">
            <Skeleton className="h-[46px] w-[46px] shrink-0 rounded-[15px]" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-2/3 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-1/4 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    )
  } else if (state.kind === 'error') {
    body = (
      <ErrorState title={t('notifications.error_title')} message={state.message} hint={state.hint} onRetry={() => void n.load()} />
    )
  } else if (loaded && loaded.notifications.length === 0) {
    body = <EmptyState icon={BellOff} title={t('notifications.empty_title')} message={t('notifications.empty_message')} />
  } else if (loaded) {
    body = (
      <div
        className={cx('flex flex-col gap-3 px-5 pb-8 pt-[18px] transition-opacity', deleteAllAction.pending && 'pointer-events-none opacity-50')}
        aria-busy={deleteAllAction.pending || undefined}
      >
        {deleteAllAction.pending && (
          <p className="t-caption flex items-center justify-center gap-2" role="status">
            <Loader2 size={14} className="animate-spin" /> Deleting…
          </p>
        )}
        {loaded.notifications.map((item) => (
          <NotificationListItem key={item.id} notification={item} onTap={() => handleTap(item)} onDismiss={() => handleDismiss(item)} />
        ))}
      </div>
    )
  }

  return (
    <Screen>
      <PageHeader
        onBack={goBack}
        title={t('notifications.title')}
        subtitle={unread > 0 ? t('notifications.unread_count', [unread]) : null}
        actions={
          <>
            {loaded && (
              <span className={cx(refresh.pending && 'pointer-events-none [&_svg]:animate-spin')} aria-busy={refresh.pending || undefined}>
                <GlassCircleButton icon={RefreshCw} size={42} label={refresh.pending ? 'Refreshing…' : 'Refresh'} onClick={() => void refresh.run()} />
              </span>
            )}
            {loaded && loaded.notifications.length > 0 && (
              <MenuButton
                hasUnread={loaded.unreadCount > 0}
                busy={markAllAction.pending || deleteAllAction.pending}
                onMarkAll={markAll}
                onDeleteAll={() => void deleteAll()}
              />
            )}
          </>
        }
      />
      {body}
    </Screen>
  )
}

function MenuButton({
  hasUnread,
  busy,
  onMarkAll,
  onDeleteAll,
}: {
  hasUnread: boolean
  busy: boolean
  onMarkAll: () => void
  onDeleteAll: () => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <span className={cx(busy && '[&_svg]:animate-spin')}>
        <GlassCircleButton icon={busy ? Loader2 : Ellipsis} size={42} label={busy ? 'Working…' : 'More'} onClick={() => !busy && setOpen((o) => !o)} />
      </span>
      {open && (
        <div className="absolute right-0 top-12 z-30 min-w-[210px] overflow-hidden rounded-2xl border border-line bg-card py-1.5 text-ink shadow-lg1">
          {hasUnread && (
            <button
              onClick={() => {
                setOpen(false)
                onMarkAll()
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-inset"
            >
              <CircleCheck size={20} className="text-primary" /> {t('notifications.mark_all_read')}
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false)
              onDeleteAll()
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-danger hover:bg-inset"
          >
            <Trash2 size={20} /> {t('notifications.delete_all')}
          </button>
        </div>
      )}
    </div>
  )
}
