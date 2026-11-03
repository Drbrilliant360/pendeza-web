// Port of dashboard/presentation/screens/owner_dashboard_screen.dart (+ OwnerDashboardBloc)
import { CalendarDays, ChevronRight, Store, Tag, TrendingUp, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { ErrorState, Screen, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { getSalonForOwner } from '@/lib/firestore'
import { formatCurrency } from '@/lib/format'
import { useAsync } from '@/lib/hooks'
import { useT } from '@/lib/i18n'
import { loadDashboard } from '../api'
import { OwnerKeyframes } from '../components/OwnerChrome'
import DashboardHeader from './components/DashboardHeader'
import GoLiveCard from './components/GoLiveCard'
import KpiCard from './components/KpiCard'
import UpcomingAppointmentsList from './components/UpcomingAppointmentsList'

export default function OwnerDashboardScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const uid = status === 'authenticated' ? user?.uid : undefined

  const { data, error, loading, reload } = useAsync(async () => {
    if (!uid) throw new Error('You are not signed in')
    const salon = await getSalonForOwner(uid)
    if (!salon) throw new Error('No salon found for your account')
    return await loadDashboard(salon)
  }, [uid])

  if (loading && !data) {
    return <DashboardSkeleton label={t('owner.dashboard.loading')} />
  }

  if (error || !data) {
    const f = friendlyError(error, "We couldn't load your dashboard.")
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <ErrorState title={t('owner.dashboard.error_title')} message={f.message} hint={f.hint} onRetry={() => void reload()} retrying={loading} />
      </div>
    )
  }

  const { stats, checklist, salonName } = data

  return (
    <Screen className="max-w-5xl px-5 pt-5">
      <OwnerKeyframes />
      <DashboardHeader salonName={salonName} />

      <div className="mt-5 space-y-5">
        <GoLiveCard checklist={checklist} />

        {/* Quick action: manage salon profile */}
        <button
          type="button"
          onClick={() => navigate(Routes.ownerSalonProfile)}
          className="flex w-full items-center gap-4 rounded-[20px] bg-gradient-to-br from-primary to-primary/80 p-5 text-left text-white shadow-[0_4px_12px_rgba(108,92,231,0.3)] transition hover:brightness-105 active:scale-[0.99]"
        >
          <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl bg-white/20">
            <Store size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold">{t('owner.dashboard.manage_salon')}</p>
            <p className="mt-1 text-xs text-white/90">{t('owner.dashboard.manage_salon_desc')}</p>
          </div>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <span className="h-5 w-1 rounded-sm bg-gradient-to-b from-primary to-accent" />
        <h2 className="t-title">{t('owner.dashboard.todays_overview')}</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          index={0}
          title={t('owner.dashboard.revenue')}
          value={formatCurrency(stats.todayRevenue)}
          icon={TrendingUp}
          color="#6C5CE7"
          onClick={() => navigate(Routes.ownerSchedule)}
        />
        <KpiCard
          index={1}
          title={t('owner.dashboard.appointments')}
          value={t('owner.dashboard.appointments_today', [stats.todayAppointmentsCount])}
          icon={CalendarDays}
          color="#F0937D"
          onClick={() => navigate(Routes.ownerSchedule)}
        />
        <KpiCard
          index={2}
          title={t('owner.dashboard.new_clients')}
          value={t('owner.dashboard.clients_week', [stats.newClientsThisWeek])}
          icon={UserPlus}
          color="#00B894"
          onClick={() => navigate(Routes.ownerClients)}
        />
        <KpiCard
          index={3}
          title={t('owner.dashboard.promotions')}
          value={t('owner.dashboard.promotions_desc')}
          icon={Tag}
          color="#6C5CE7"
          onClick={() => navigate('/owner/promotions')}
        />
      </div>

      <div className="mt-10">
        <UpcomingAppointmentsList
          appointments={stats.upcomingAll.length > 0 ? stats.upcomingAll : stats.upcomingToday}
          onAppointmentTap={() => navigate(Routes.ownerSchedule)}
        />
      </div>
    </Screen>
  )
}

/** Placeholder shaped like the dashboard (header, go-live card, KPI grid, upcoming list). */
function DashboardSkeleton({ label }: { label: string }) {
  return (
    <Screen className="max-w-5xl px-5 pt-5">
      <div aria-busy="true" aria-label={label}>
        <Skeleton className="h-[96px] !rounded-3xl" />
        <Skeleton className="mt-5 h-[92px] !rounded-[20px]" />
        <Skeleton className="mt-8 h-6 w-48" />
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-[1.3] !rounded-[20px] md:aspect-auto md:h-[120px]" />
          ))}
        </div>
        <Skeleton className="mt-10 h-6 w-56" />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[82px]" />
          ))}
        </div>
      </div>
    </Screen>
  )
}
