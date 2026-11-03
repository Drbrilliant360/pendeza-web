// Port of dashboard/presentation/widgets/upcoming_appointments_list.dart
import { CalendarDays, CheckCircle2, Scissors } from 'lucide-react'
import { Avatar, cx } from '@/components/ui'
import { isSameDay } from '@/lib/format'
import { useT } from '@/lib/i18n'
import type { AppointmentModel } from '@/lib/models'
import { fadeUp, fmtJm, fmtMMMd, SectionIcon } from '../../components/OwnerChrome'
import { useAppointmentClient } from '../../components/useAppointmentClient'

export default function UpcomingAppointmentsList({
  appointments,
  onAppointmentTap,
}: {
  appointments: AppointmentModel[]
  onAppointmentTap?: () => void
}) {
  const t = useT()

  if (appointments.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3">
          <SectionIcon icon={CalendarDays} />
          <h2 className="t-title">{t('owner.dashboard.upcoming')}</h2>
        </div>
        <div className="mt-4 rounded-[20px] border border-line/60 bg-gradient-to-r from-inset to-card p-8 text-center dark:border-line">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10">
            <CheckCircle2 size={48} className="text-primary/50" />
          </div>
          <p className="mt-4 text-sm font-medium text-muted">{t('owner.dashboard.no_upcoming')}</p>
          <p className="mt-1 text-xs text-muted/70">{t('owner.dashboard.no_upcoming_desc')}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <SectionIcon icon={CalendarDays} />
        <h2 className="t-title min-w-0 flex-1 truncate">{t('owner.dashboard.upcoming')}</h2>
        {onAppointmentTap && (
          <button onClick={onAppointmentTap} className="rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-primary hover:bg-primary/10 dark:text-primary-light">
            {t('owner.dashboard.view_schedule')}
          </button>
        )}
        <span className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 to-accent/15 px-2.5 py-1 text-xs font-bold text-primary dark:text-primary-light">
          {appointments.length}
        </span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {appointments.map((a, i) => (
          <div key={a.id} style={fadeUp(i)}>
            <UpcomingItem appointment={a} onTap={onAppointmentTap} />
          </div>
        ))}
      </div>
    </div>
  )
}

function UpcomingItem({ appointment, onTap }: { appointment: AppointmentModel; onTap?: () => void }) {
  const t = useT()
  const client = useAppointmentClient(appointment)
  const name = client ? client.fullName : client === null ? 'Unknown Client' : t('common.loading_details')
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.05] to-accent/[0.03] p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition hover:border-primary/30"
    >
      <div className="rounded-full bg-gradient-to-br from-primary/30 to-accent/30 p-0.5">
        <Avatar url={client?.profilePictureUrl} name={name} size={48} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-base font-bold text-ink', client === undefined && 'animate-pulse text-ink/50')}>{name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/70">
          <Scissors size={14} className="text-ink/60" />
          {t('owner.dashboard.services_count', [appointment.serviceIds.length])}
        </p>
      </div>
      <div className="flex flex-col items-end">
        {!isSameDay(appointment.startTime, new Date()) && (
          <span className="mb-1 text-[11px] font-semibold text-muted">{fmtMMMd(appointment.startTime)}</span>
        )}
        <span className="rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2 text-sm font-bold text-white shadow-[0_2px_6px_rgba(108,92,231,0.3)]">
          {fmtJm(appointment.startTime)}
        </span>
      </div>
    </button>
  )
}
