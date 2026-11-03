// Port of admin_manage_transactions_screen.dart – the "Bookings" overview (appointments
// across every salon; payments are disabled so transactions are not shown).
import { Building2, CalendarDays, CalendarClock, CircleDollarSign, Clock, Hourglass, RefreshCw, Scissors, Timer } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Sheet } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { AppointmentStatus, appointmentHelpers, type AppointmentModel, type SalonModel, type UserModel } from '@/lib/models'
import { useAdminState, type AdminData } from '../AdminContext'
import { AdminDataTable } from '../components/AdminDataTable'
import {
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterBar,
  AdminFilterChip,
  AdminIconButton,
  AdminIconTile,
  AdminInfoRow,
  AdminLoadingState,
  AdminPage,
  AdminPill,
  AdminSearchField,
  GUTTER,
  toneVars,
  type AdminTone,
} from '../components/ui'

const ALL_STATUSES: string[] = [
  AppointmentStatus.pendingPayment,
  AppointmentStatus.confirmed,
  AppointmentStatus.completed,
  AppointmentStatus.cancelled,
  AppointmentStatus.noShow,
  AppointmentStatus.paymentFailed,
]

function statusTone(status: string): AdminTone {
  switch (status) {
    case AppointmentStatus.confirmed: return 'success'
    case AppointmentStatus.completed: return 'primary'
    case AppointmentStatus.cancelled: return 'neutral'
    case AppointmentStatus.pendingPayment: return 'warning'
    case AppointmentStatus.noShow:
    case AppointmentStatus.paymentFailed: return 'danger'
    default: return 'info'
  }
}

/** "no_show" / "pendingPayment" → "No show" / "Pending payment". */
function statusLabel(status: string): string {
  const spaced = status.replace(/_/g, ' ').replace(/(?<=[a-z])(?=[A-Z])/g, ' ').toLowerCase().trim()
  if (!spaced) return status
  return spaced[0].toUpperCase() + spaced.slice(1)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const hmma = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const longDate = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`

function clientName(a: AppointmentModel, users: UserModel[]): string {
  if (appointmentHelpers.isWalkIn(a)) {
    const w = a.walkInName?.trim()
    return w ? `${w} (walk-in)` : 'Walk-in'
  }
  const u = users.find((x) => x.uid === a.clientId)
  return u && u.fullName.trim() ? u.fullName : 'Unknown client'
}
const salonName = (a: AppointmentModel, salons: SalonModel[]) => salons.find((s) => s.id === a.salonId)?.salonName ?? 'Unknown salon'
function serviceNames(a: AppointmentModel, names: Record<string, string>): string {
  if (a.serviceIds.length === 0) return 'No services'
  const resolved = a.serviceIds.map((id) => names[id]).filter((x): x is string => typeof x === 'string')
  if (resolved.length === 0) return a.serviceIds.length === 1 ? '1 service' : `${a.serviceIds.length} services`
  return resolved.join(', ')
}

interface Row { a: AppointmentModel; client: string; salon: string; services: string }

export default function AdminManageTransactionsScreen() {
  const { status, loaded, error, refreshing, loadAllAppointments } = useAdminState()
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [details, setDetails] = useState<Row | null>(null)
  const load = () => void loadAllAppointments()

  useEffect(() => {
    void loadAllAppointments()
  }, [loadAllAppointments])

  let body: ReactNode = null
  if (status === 'loading' || status === 'initial') body = <AdminLoadingState itemHeight={104} />
  else if (status === 'error') body = <AdminErrorState error={error} fallback="Could not load bookings" onRetry={load} />
  else if (loaded) {
    const rows: Row[] = loaded.appointments.map((a) => ({
      a,
      client: clientName(a, loaded.users),
      salon: salonName(a, loaded.salons),
      services: serviceNames(a, loaded.serviceNames),
    }))
    const term = query.trim().toLowerCase()
    const filtered = rows.filter((r) => {
      if (selected != null && r.a.status !== selected) return false
      if (!term) return true
      return r.client.toLowerCase().includes(term) || r.salon.toLowerCase().includes(term) || r.services.toLowerCase().includes(term) || r.a.status.toLowerCase().includes(term)
    })
    const summary = <Summary appointments={loaded.appointments} />
    if (filtered.length === 0) {
      const hasFilters = query !== '' || selected != null
      body = (
        <>
          <div className={`pt-2 ${GUTTER}`}>{summary}</div>
          <AdminEmptyState
            icon={CalendarDays}
            title={hasFilters ? 'No bookings match your filters' : 'No bookings yet'}
            message={hasFilters ? 'Try a different status or search term.' : 'Appointments across all salons will appear here.'}
          />
        </>
      )
    } else {
      body = (
        <AdminDataTable
          header={<div className="mb-4">{summary}</div>}
          rows={filtered}
          rowKey={(r) => r.a.id}
          rowsPerPage={25}
          cardMinWidth={420}
          onRowClick={setDetails}
          renderCard={(r) => <BookingCard row={r} onClick={() => setDetails(r)} />}
          columns={[
            {
              key: 'date',
              label: 'Date',
              render: (r) => (
                <div>
                  <div className="font-semibold">{`${r.a.startTime.getDate()} ${MONTHS[r.a.startTime.getMonth()]} ${r.a.startTime.getFullYear()}`}</div>
                  <div className="text-[12.5px] text-ink/60">{hmma(r.a.startTime)}</div>
                </div>
              ),
            },
            { key: 'client', label: 'Client', render: (r) => <span className="font-bold">{r.client}</span> },
            { key: 'salon', label: 'Salon', render: (r) => <span className="text-ink/70">{r.salon}</span> },
            { key: 'services', label: 'Services', className: 'max-w-[240px]', render: (r) => <span className="line-clamp-2 text-[12.5px] text-ink/60">{r.services}</span> },
            { key: 'status', label: 'Status', render: (r) => <AdminPill label={statusLabel(r.a.status)} tone={statusTone(r.a.status)} /> },
            { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="whitespace-nowrap font-bold">{formatCurrency(r.a.totalPrice)}</span> },
          ]}
        />
      )
    }
  }

  return (
    <AdminPage
      title="Bookings"
      subtitle={loaded ? `${loaded.appointments.length} appointments` : null}
      icon={CalendarDays}
      actions={<AdminIconButton icon={RefreshCw} label="Refresh" onClick={load} spinning={refreshing || status === 'loading'} />}
      toolbar={loaded && <AdminSearchField hint="Search client, salon or service" onChange={setQuery} />}
      filters={loaded && <Filters state={loaded} selected={selected} onSelect={setSelected} />}
    >
      {body}
      <BookingDetailsSheet row={details} onClose={() => setDetails(null)} />
    </AdminPage>
  )
}

function Filters({ state, selected, onSelect }: { state: AdminData; selected: string | null; onSelect: (s: string | null) => void }) {
  // Only offer statuses that actually occur in the data.
  const counts: Record<string, number> = {}
  for (const a of state.appointments) counts[a.status] = (counts[a.status] ?? 0) + 1
  const statuses = ALL_STATUSES.filter((s) => (counts[s] ?? 0) > 0 || s === selected)
  return (
    <AdminFilterBar>
      <AdminFilterChip label="All" count={state.appointments.length} selected={selected == null} onClick={() => onSelect(null)} />
      {statuses.map((s) => (
        <AdminFilterChip key={s} label={statusLabel(s)} count={counts[s] ?? 0} tone={statusTone(s)} selected={selected === s} onClick={() => onSelect(s)} />
      ))}
    </AdminFilterBar>
  )
}

function Summary({ appointments }: { appointments: AppointmentModel[] }) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday.getTime())
  endOfToday.setDate(endOfToday.getDate() + 1)
  const weekdayIndex = (now.getDay() + 6) % 7 // Monday = 0
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - weekdayIndex)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const today = appointments.filter((a) => a.startTime >= startOfToday && a.startTime < endOfToday).length
  const week = appointments.filter((a) => a.startTime >= startOfWeek && a.startTime < endOfWeek).length
  const upcoming = appointments.filter((a) => a.startTime > now && a.status === AppointmentStatus.confirmed).length

  const tile = (label: string, value: number, icon: typeof Clock, tone: AdminTone) => (
    <AdminCard className="!p-3.5">
      <AdminIconTile icon={icon} tone={tone} size={32} />
      <div className="mt-2.5 truncate text-2xl font-bold leading-tight text-ink">{value}</div>
      <div className="truncate text-[12.5px] text-ink/60">{label}</div>
    </AdminCard>
  )
  return (
    <div className="grid grid-cols-3 gap-3">
      {tile('Today', today, CalendarClock, 'primary')}
      {tile('This week', week, CalendarDays, 'info')}
      {tile('Upcoming', upcoming, Clock, 'success')}
    </div>
  )
}

function DateBadge({ date }: { date: Date }) {
  return (
    <div style={toneVars('primary')} className="a-tint a-ink flex w-[54px] shrink-0 flex-col items-center rounded-[14px] py-2">
      <span className="text-[11px] font-bold tracking-[0.3px]">{MONTHS[date.getMonth()].toUpperCase()}</span>
      <span className="mt-0.5 text-[22px] font-bold leading-tight">{date.getDate()}</span>
      <span className="text-[11px] opacity-80">{DAYS[date.getDay()].slice(0, 3)}</span>
    </div>
  )
}

function BookingCard({ row, onClick }: { row: Row; onClick: () => void }) {
  const { a } = row
  return (
    <AdminCard onClick={onClick} className="h-full">
      <div className="flex items-start">
        <DateBadge date={a.startTime} />
        <div className="ml-3.5 min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-ink">{row.client}</div>
          <div className="mt-0.5 truncate text-[13px] font-medium text-ink/60">{row.salon}</div>
          <div className="mt-0.5 line-clamp-2 text-[12.5px] text-ink/60">{row.services}</div>
          <div className="mt-2 flex items-center gap-1 text-[12.5px] text-ink/60">
            <Clock size={13} />
            {hmma(a.startTime)}
          </div>
        </div>
        <div className="ml-2.5 flex shrink-0 flex-col items-end">
          <AdminPill label={statusLabel(a.status)} tone={statusTone(a.status)} />
          <div className="mt-2.5 text-sm font-bold text-ink">{formatCurrency(a.totalPrice)}</div>
        </div>
      </div>
    </AdminCard>
  )
}

function BookingDetailsSheet({ row, onClose }: { row: Row | null; onClose: () => void }) {
  return (
    <Sheet open={row != null} onClose={onClose}>
      {row && (
        <div className="pt-2">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 text-xl font-bold text-ink">{row.client}</div>
            <AdminPill label={statusLabel(row.a.status)} tone={statusTone(row.a.status)} />
          </div>
          <div className="mt-5">
            <AdminInfoRow icon={Building2} label="Salon" value={row.salon} />
            <AdminInfoRow icon={Scissors} label="Service" value={row.services} />
            <AdminInfoRow icon={CalendarDays} label="Date" value={longDate(row.a.startTime)} />
            <AdminInfoRow icon={Timer} label="Time" value={hmma(row.a.startTime)} />
            <AdminInfoRow icon={Hourglass} label="Duration" value={`${row.a.durationMinutes} min`} />
            <AdminInfoRow icon={CircleDollarSign} label="Total" value={formatCurrency(row.a.totalPrice)} />
          </div>
        </div>
      )}
    </Sheet>
  )
}
