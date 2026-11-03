// Port of 2_client_appointments (AppointmentsScreen + AppointmentsBloc).
// Payments are disabled → only the Upcoming / Past tabs exist (no Pending tab).
import { CalendarPlus, Clock } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { EmptyState, ErrorState, Screen, SegmentedTabs, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useAsync } from '@/lib/hooks'
import { useT } from '@/lib/i18n'
import { AppointmentStatus, TERMINAL_STATUSES } from '@/lib/models'
import { getAppointmentsWithDetails, type AppointmentWithDetails } from '../api'
import { AppointmentCard, AppointmentDetailsSheet } from '../components/AppointmentCard'

type Bucket = 'upcoming' | 'past'
interface Loaded {
  pending: AppointmentWithDetails[]
  upcoming: AppointmentWithDetails[]
  past: AppointmentWithDetails[]
}

/** AppointmentsBloc._onFetchAppointmentsRequested categorisation */
function categorise(all: AppointmentWithDetails[]): Loaded {
  const now = new Date()
  const pending = all
    .filter((d) => d.appointment.status === AppointmentStatus.pendingPayment)
    .sort((a, b) => a.appointment.createdAt.getTime() - b.appointment.createdAt.getTime())
  const upcoming = all
    .filter((d) => d.appointment.status === AppointmentStatus.confirmed && d.appointment.startTime > now)
    .sort((a, b) => a.appointment.startTime.getTime() - b.appointment.startTime.getTime())
  const past = all
    .filter((d) => {
      const s = d.appointment.status
      return TERMINAL_STATUSES.includes(s) || (s === AppointmentStatus.confirmed && d.appointment.startTime < now)
    })
    .sort((a, b) => b.appointment.startTime.getTime() - a.appointment.startTime.getTime())
  return { pending, upcoming, past }
}

export default function AppointmentsScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const [tab, setTab] = useState<Bucket>('upcoming')
  const [open, setOpen] = useState<AppointmentWithDetails | null>(null)

  const uid = status === 'authenticated' ? user?.uid ?? null : null
  const { data, error, loading, reload } = useAsync<Loaded>(async () => {
    if (status === 'guest' || status === 'authRequired') return { pending: [], upcoming: [], past: [] }
    if (!uid) throw new Error('Please sign in to view your appointments.')
    return categorise(await getAppointmentsWithDetails(uid))
  }, [uid, status])

  const active = data ? data.upcoming.length : 0
  const items = data ? data[tab] : []

  const errorView = error
    ? (() => {
        const f = friendlyError(error, "We couldn't load your appointments.")
        return <ErrorState title="Couldn't load appointments" message={f.message} hint={f.hint} retrying={loading} onRetry={() => void reload()} />
      })()
    : null

  let body
  if (error) {
    body = errorView
  } else if (loading || !data) {
    body = (
      <div className="px-5 pt-1">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="mb-3.5 h-[172px] rounded-[26px]" />
        ))}
      </div>
    )
  } else if (items.length === 0) {
    body =
      tab === 'upcoming' ? (
        <EmptyState
          icon={CalendarPlus}
          title={t('client.appointments.empty_upcoming_title')}
          message={t('client.appointments.empty_upcoming_msg')}
          actionLabel={t('client.appointments.book_now')}
          onAction={() => navigate(Routes.clientDiscover)}
          className="whitespace-pre-line"
        />
      ) : (
        <EmptyState icon={Clock} color="#8A8FA0" title={t('client.appointments.empty_past_title')} message={t('client.appointments.empty_past_msg')} />
      )
  } else {
    body = (
      <div className="grid gap-3.5 px-5 pt-1 lg:grid-cols-2">
        {items.map((d, i) => (
          <div key={d.appointment.id} className="animate-[fadeUp_0.35s_ease-out_both]" style={{ animationDelay: `${Math.min(i, 8) * 80}ms` }}>
            <AppointmentCard details={d} onTap={() => setOpen(d)} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <Screen className="max-w-5xl">
      <style>{'@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}'}</style>
      <div className="flex items-center gap-3 px-5 pb-3 pt-[18px]">
        <h1 className="t-display min-w-0 flex-1 truncate">{t('client.appointments.title')}</h1>
        {active > 0 && (
          <span className="rounded-full bg-brand-gradient px-3.5 py-2 text-xs font-bold text-white shadow-[0_5px_12px_-3px_rgba(108,92,231,0.35)]">
            {t('client.appointments.active_count', [active])}
          </span>
        )}
      </div>
      <div className="px-5 pb-3 pt-1">
        <SegmentedTabs<Bucket>
          tabs={[
            { value: 'upcoming', label: t('client.appointments.tab_upcoming') },
            { value: 'past', label: t('client.appointments.tab_past') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {body}
      <AppointmentDetailsSheet details={open} onClose={() => setOpen(null)} />
    </Screen>
  )
}
