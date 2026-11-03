// Port of admin_dashboard_screen.dart
import { BadgeCheck, Bell, Building2, CalendarDays, CalendarCheck, ChevronRight, Hourglass, Tag, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { cx, Skeleton } from '@/components/ui'
import { salonHelpers } from '@/lib/models'
import { useAdminState, type AdminData } from '../AdminContext'
import {
  AdminCard,
  AdminErrorState,
  AdminIconTile,
  AdminPage,
  AdminSectionHeader,
  AdminStatTile,
  BrandIcon,
  GUTTER,
  toneBase,
  type AdminTone,
} from '../components/ui'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** DateFormat('EEEE, d MMMM') */
const longDate = (d: Date) => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`

export default function AdminDashboardScreen() {
  const { status, loaded, error, loadAdminData } = useAdminState()
  let body: ReactNode = null
  if (status === 'loading' || status === 'initial') body = <DashboardSkeleton />
  else if (status === 'error') body = <AdminErrorState error={error} fallback="Could not load the dashboard" onRetry={() => void loadAdminData()} />
  else if (loaded) body = <DashboardBody state={loaded} />
  return (
    <AdminPage title="Dashboard" subtitle={longDate(new Date())} icon={BrandIcon}>
      {body}
    </AdminPage>
  )
}

/** Placeholder shaped like the dashboard (hero, stat tiles, breakdown cards) while data loads. */
function DashboardSkeleton() {
  return (
    <div className={cx('pb-8 pt-1', GUTTER)} aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-[150px] w-full rounded-3xl" />
      <Skeleton className="mt-7 h-5 w-40 rounded-lg" />
      <div className="mt-3">
        <Grid min={168}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[124px] rounded-[18px]" />
          ))}
        </Grid>
      </div>
      <div className="mt-7">
        <Grid min={340}>
          <Skeleton className="h-[210px] rounded-[18px]" />
          <Skeleton className="h-[210px] rounded-[18px]" />
        </Grid>
      </div>
    </div>
  )
}

/** _ResponsiveGrid: equal-width columns of at least `min` px. */
function Grid({ min, children }: { min: number; children: ReactNode }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}>
      {children}
    </div>
  )
}

function DashboardBody({ state }: { state: AdminData }) {
  const navigate = useNavigate()
  const pending = state.salons.filter(salonHelpers.isPending).length
  return (
    <div className={cx('pb-8 pt-1', GUTTER)}>
      <HeroCard state={state} />
      {pending > 0 && (
        <div className="mt-4">
          <AdminCard tone="warning" onClick={() => navigate(Routes.adminSalons, { state: { filter: 'pending' } })}>
            <div className="flex items-center gap-3.5">
              <AdminIconTile icon={Hourglass} tone="warning" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-ink">{pending === 1 ? '1 salon is waiting for approval' : `${pending} salons are waiting for approval`}</div>
                <div className="mt-0.5 text-[12.5px] text-ink/60">Review them so they become visible to clients.</div>
              </div>
              <ChevronRight size={18} className="a-ink" />
            </div>
          </AdminCard>
        </div>
      )}

      <div className="mt-7">
        <AdminSectionHeader title="Platform overview" />
      </div>
      <div className="mt-3">
        <Grid min={168}>
          <AdminStatTile icon={Users} label="Total users" value={`${state.users.length}`} tone="primary" onClick={() => navigate(Routes.adminUsers)} />
          <AdminStatTile icon={Building2} label="Salons" value={`${state.salons.length}`} tone="accent" onClick={() => navigate(Routes.adminSalons)} />
          <AdminStatTile icon={Tag} label="Promotions" value={`${state.promotions.length}`} tone="success" onClick={() => navigate(Routes.adminPromotions)} />
          <AdminStatTile icon={CalendarDays} label="Bookings" value={`${state.appointments.length}`} tone="info" onClick={() => navigate(Routes.adminTransactions)} />
        </Grid>
      </div>

      <div className="mt-7">
        <Grid min={340}>
          <BreakdownCard
            title="People"
            subtitle="Accounts by role"
            segments={[
              { label: 'Clients', count: state.users.filter((u) => u.role === 'client').length, tone: 'success' },
              { label: 'Salon owners', count: state.users.filter((u) => u.role === 'owner').length, tone: 'info' },
              { label: 'Admins', count: state.users.filter((u) => u.role === 'admin').length, tone: 'danger' },
            ]}
          />
          <BreakdownCard
            title="Salon approvals"
            subtitle="Verification status"
            segments={[
              { label: 'Approved', count: state.salons.filter(salonHelpers.isApproved).length, tone: 'success' },
              { label: 'Pending', count: state.salons.filter(salonHelpers.isPending).length, tone: 'warning' },
              { label: 'Rejected', count: state.salons.filter(salonHelpers.isRejected).length, tone: 'danger' },
            ]}
          />
        </Grid>
      </div>

      <div className="mt-7">
        <AdminSectionHeader title="Shortcuts" />
      </div>
      <div className="mt-3">
        <Grid min={320}>
          <ShortcutTile icon={Bell} title="Send notification" subtitle="Push a message to users" tone="info" onClick={() => navigate(Routes.adminNotifications)} />
          <ShortcutTile icon={Tag} title="Manage promotions" subtitle="Platform offers & banners" tone="success" onClick={() => navigate(Routes.adminPromotions)} />
          <ShortcutTile icon={BadgeCheck} title="Review salons" subtitle="Approve or reject applications" tone="accent" onClick={() => navigate(Routes.adminSalons)} />
          <ShortcutTile icon={CalendarCheck} title="All bookings" subtitle="Appointments across every salon" tone="primary" onClick={() => navigate(Routes.adminTransactions)} />
        </Grid>
      </div>
    </div>
  )
}

function HeroCard({ state }: { state: AdminData }) {
  const stats = [
    { value: state.users.length, label: 'Users', icon: Users },
    { value: state.salons.length, label: 'Salons', icon: Building2 },
    { value: state.appointments.length, label: 'Bookings', icon: CalendarDays },
  ]
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand-gradient text-white" style={{ boxShadow: '0 10px 24px -6px rgba(108,92,231,0.3)' }}>
      <div className="pointer-events-none absolute -right-10 -top-[50px] h-[170px] w-[170px] rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-[70px] right-[50px] h-[130px] w-[130px] rounded-full bg-white/[0.07]" />
      <div className="relative p-5">
        <div className="text-[11px] font-bold tracking-[1.2px] text-white/70">WELCOME BACK</div>
        <div className="mt-1.5 text-xl font-bold leading-tight">Here’s how Pendeza is doing</div>
        <div className="mt-5 flex items-center">
          {stats.map((s, i) => (
            <div key={s.label} className="flex min-w-0 flex-1 items-center">
              {i > 0 && <div className="mx-3.5 h-10 w-px shrink-0 bg-white/[0.22]" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                  <s.icon size={13} className="shrink-0" />
                  <span className="truncate">{s.label}</span>
                </div>
                <div className="mt-1 truncate text-[26px] font-bold leading-tight">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface Segment { label: string; count: number; tone: AdminTone }

function BreakdownCard({ title, subtitle, segments }: { title: string; subtitle: string; segments: Segment[] }) {
  const total = segments.reduce((a, s) => a + s.count, 0)
  return (
    <AdminCard className="!p-5">
      <AdminSectionHeader title={title} subtitle={subtitle} trailing={<span className="text-2xl font-bold text-ink">{total}</span>} />
      <div className="mt-[18px] flex h-2.5 overflow-hidden rounded-full bg-primary/5 dark:bg-inset">
        {total > 0 &&
          segments
            .filter((s) => s.count > 0)
            .map((s) => (
              <div key={s.label} className="h-full pr-0.5" style={{ flexGrow: s.count, flexBasis: 0 }}>
                <div className="h-full w-full" style={{ background: toneBase(s.tone) }} />
              </div>
            ))}
      </div>
      <div className="mt-[18px] flex flex-col gap-3">
        {segments.map((s) => {
          const percent = total === 0 ? 0 : Math.round((s.count / total) * 100)
          return (
            <div key={s.label} className="flex items-center">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: toneBase(s.tone) }} />
              <span className="ml-2.5 flex-1 text-sm font-medium text-ink">{s.label}</span>
              <span className="text-sm font-bold text-ink">{s.count}</span>
              <span className="w-12 text-right text-[12.5px] text-ink/60">{percent}%</span>
            </div>
          )
        })}
      </div>
    </AdminCard>
  )
}

function ShortcutTile({ icon, title, subtitle, tone, onClick }: { icon: typeof Bell; title: string; subtitle: string; tone: AdminTone; onClick: () => void }) {
  return (
    <AdminCard onClick={onClick}>
      <div className="flex items-center gap-3.5">
        <AdminIconTile icon={icon} tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{title}</div>
          <div className="mt-0.5 truncate text-[12.5px] text-ink/60">{subtitle}</div>
        </div>
        <ChevronRight size={16} className="text-ink/60" />
      </div>
    </AdminCard>
  )
}
