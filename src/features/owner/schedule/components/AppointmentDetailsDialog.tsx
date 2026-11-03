// Port of calendar/presentation/widgets/appointment_details_dialog.dart
import { AlertCircle, CalendarDays, Clock, Hourglass, Info, Loader2, NotebookText, RefreshCw, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useFeedback } from '@/components/feedback'
import { Avatar, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { updateAppointmentStatus } from '@/lib/firestore'
import { formatCurrency } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { appointmentHelpers, serviceHelpers, type AppointmentModel, type ServiceModel } from '@/lib/models'
import { getServiceDetails, getUserDetails } from '../../api'
import { fmtFull, fmtJm, ownerStatusColor } from '../../components/OwnerChrome'
import type { ClientInfo } from '../../components/useAppointmentClient'

export default function AppointmentDetailsDialog({ appointment, onClose }: { appointment: AppointmentModel; onClose: () => void }) {
  const t = useT()
  const { toastSuccess, toastError, confirm } = useFeedback()
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [services, setServices] = useState<ServiceModel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState<'complete' | 'cancel' | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        const servicePromises = appointment.serviceIds.map((id) => getServiceDetails(id))
        if (appointmentHelpers.isWalkIn(appointment)) {
          const s = await Promise.all(servicePromises)
          if (!alive) return
          setClient({
            fullName: appointment.walkInName?.trim() || t('owner.calendar.walk_in_client'),
            profilePictureUrl: null,
            phoneNumber: null,
          })
          setServices(s)
          setLoading(false)
          return
        }
        const [u, ...s] = await Promise.all([getUserDetails(appointment.clientId, false), ...servicePromises])
        if (!alive) return
        const user = u as Awaited<ReturnType<typeof getUserDetails>>
        setClient({ fullName: user.fullName, profilePictureUrl: user.profilePictureUrl, phoneNumber: user.phoneNumber })
        setServices(s as ServiceModel[])
        setLoading(false)
      } catch (e) {
        if (!alive) return
        console.error('Failed to load appointment details', e)
        setLoadError(e)
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment.id, attempt])

  const close = () => {
    if (!pending) onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !pending && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, pending])

  const status = appointment.status.toLowerCase()

  const markComplete = async () => {
    const ok = await confirm({
      title: t('owner.calendar.mark_complete_title'),
      message: `${t('owner.calendar.mark_complete_confirm')} (${client?.fullName ?? 'Client'} · ${fmtFull(appointment.startTime)}, ${fmtJm(appointment.startTime)})`,
      confirmText: t('owner.calendar.mark_complete'),
      cancelText: t('common.cancel'),
    })
    if (!ok || pending) return
    setPending('complete')
    try {
      await updateAppointmentStatus(appointment.id, 'Completed')
      setPending(null)
      onClose()
      toastSuccess(t('owner.calendar.mark_complete_success'))
    } catch (e) {
      setPending(null)
      toastError(e, 'Could not mark the appointment complete')
    }
  }

  const cancel = async () => {
    const ok = await confirm({
      title: t('owner.calendar.cancel_title'),
      message: `${t('owner.calendar.cancel_confirm')} (${client?.fullName ?? 'Client'} · ${fmtFull(appointment.startTime)}, ${fmtJm(appointment.startTime)})`,
      confirmText: t('owner.calendar.cancel_yes'),
      cancelText: t('owner.calendar.cancel_keep'),
      destructive: true,
    })
    if (!ok || pending) return
    setPending('cancel')
    try {
      await updateAppointmentStatus(appointment.id, 'Cancelled')
      setPending(null)
      onClose()
      toastSuccess(t('owner.calendar.cancel_success'))
    } catch (e) {
      setPending(null)
      toastError(e, 'Could not cancel the appointment')
    }
  }

  const statusColor = ownerStatusColor(appointment.status)
  const ready = !loading && !loadError

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={close} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[20px] bg-card shadow-lg1">
        <div className="flex items-center gap-2 px-6 pt-6">
          <NotebookText size={22} className="text-ink" />
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-ink">{t('owner.calendar.appointment_details')}</h2>
          <button onClick={close} disabled={!!pending} title="Close" aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-inset hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading appointment details">
              <Skeleton className="h-4 w-16" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 !rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="mt-4 h-4 w-24" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-4 h-4 w-28" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : loadError ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center" role="alert">
              <AlertCircle size={48} className="text-danger" />
              <p className="mt-4 text-sm font-semibold text-ink">Couldn't load appointment details</p>
              <p className="mt-1 text-sm text-ink/80">{friendlyError(loadError).message}</p>
              {friendlyError(loadError).hint && <p className="mt-1 text-xs text-muted">{friendlyError(loadError).hint}</p>}
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="mt-4 flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-primary hover:bg-inset"
              >
                <RefreshCw size={16} /> Retry
              </button>
            </div>
          ) : (
            <div>
              <SectionTitle>Client</SectionTitle>
              <div className="flex items-center gap-3">
                <Avatar url={client?.profilePictureUrl} name={client?.fullName ?? 'Unknown'} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-base text-ink">{client?.fullName ?? 'Unknown Client'}</p>
                  {client?.phoneNumber && <p className="text-xs text-muted">{client.phoneNumber}</p>}
                </div>
              </div>
              <Divider />

              <SectionTitle>Date &amp; Time</SectionTitle>
              <div className="space-y-2">
                <DetailRow icon={<CalendarDays size={18} />} text={fmtFull(appointment.startTime)} />
                <DetailRow icon={<Clock size={18} />} text={fmtJm(appointment.startTime)} />
                <DetailRow icon={<Hourglass size={18} />} text={`${appointment.durationMinutes} minutes`} />
              </div>
              <Divider />

              <SectionTitle>Services Booked</SectionTitle>
              {services.length === 0 ? (
                <p className="text-sm italic text-muted">No services found</p>
              ) : (
                services.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 pt-1 text-sm text-ink">
                    <span>•</span>
                    <span className="min-w-0 flex-1">{s.name}</span>
                    <span className="font-medium">{formatCurrency(serviceHelpers.effectivePrice(s))}</span>
                  </div>
                ))
              )}
              <p className="mt-2 text-right text-base font-bold text-primary">Total: {formatCurrency(appointment.totalPrice)}</p>
              <Divider />

              <SectionTitle>Status</SectionTitle>
              <span
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-[0.5px]"
                style={{ background: `color-mix(in srgb, ${statusColor} 12%, transparent)`, color: statusColor }}
              >
                <Info size={18} />
                {appointment.status.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-1 px-4 pb-4">
          {ready && status !== 'completed' && status !== 'cancelled' && (
            <ActionButton className="text-primary hover:bg-primary/10" onClick={() => void markComplete()} loading={pending === 'complete'} disabled={!!pending}>
              {t('owner.calendar.mark_complete')}
            </ActionButton>
          )}
          {ready && status !== 'cancelled' && (
            <ActionButton className="text-danger hover:bg-danger/10" onClick={() => void cancel()} loading={pending === 'cancel'} disabled={!!pending}>
              {t('common.cancel')}
            </ActionButton>
          )}
          <ActionButton className="text-primary hover:bg-primary/10" onClick={close} disabled={!!pending}>
            Close
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-sm font-bold text-primary">{children}</p>
}
function Divider() {
  return <div className="my-3 h-px bg-line" />
}
function DetailRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-4 text-sm text-ink">
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{text}</span>
    </div>
  )
}
function ActionButton({
  children,
  className,
  onClick,
  loading,
  disabled,
}: {
  children: ReactNode
  className: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:opacity-60 ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}
