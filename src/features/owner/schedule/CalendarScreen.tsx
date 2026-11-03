// Port of calendar/presentation/screens/calendar_screen.dart (+ OwnerCalendarBloc)
import { CalendarDays, CalendarMinus, CalendarRange, CalendarCheck, Scissors, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { Avatar, cx, ErrorState, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { createAppointment, getSalonForOwner, getServicesForSalon } from '@/lib/firestore'
import { formatCurrency, isSameDay } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { AppointmentStatus, WALK_IN_CLIENT_ID, serviceHelpers, type AppointmentModel, type ServiceModel } from '@/lib/models'
import { getConfirmedAppointmentsForSalon } from '../api'
import { Fab, HeaderIconButton, OwnerKeyframes, OwnerTabHeader, SectionIcon, fadeUp, fmtJm, fmtYMMMd, ownerStatusColor } from '../components/OwnerChrome'
import { useAppointmentClient } from '../components/useAppointmentClient'
import AppointmentDetailsDialog from './components/AppointmentDetailsDialog'
import TableCalendar, { type CalendarFormat } from './components/TableCalendar'
import WalkInSheet from './components/WalkInSheet'

type LoadState =
  | { kind: 'loading'; date: Date }
  | { kind: 'loaded'; date: Date; appointments: AppointmentModel[] }
  | { kind: 'error'; date: Date; error: unknown }

export default function CalendarScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { toast, toastSuccess, toastError } = useFeedback()
  const [openingWalkIn, setOpeningWalkIn] = useState(false)
  const { status, user } = useAuth()

  const [focusedDay, setFocusedDay] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [format, setFormat] = useState<CalendarFormat>('month')
  const [state, setState] = useState<LoadState>(() => ({ kind: 'loading', date: new Date() }))
  const [detail, setDetail] = useState<AppointmentModel | null>(null)
  const [walkIn, setWalkIn] = useState<{ services: ServiceModel[]; salonId: string; key: number } | null>(null)

  const salonIdRef = useRef<string | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const seq = useRef(0)

  const ensureSalonId = useCallback(async () => {
    if (salonIdRef.current) return salonIdRef.current
    if (status === 'authenticated' && user && user.role === 'owner') {
      const salon = await getSalonForOwner(user.uid)
      if (!salon) throw new Error('Salon not found for owner.')
      salonIdRef.current = salon.id
      return salon.id
    }
    throw new Error('User is not an authenticated owner.')
  }, [status, user])

  /** LoadAppointmentsForDate */
  const load = useCallback(
    async (date: Date) => {
      const cur = stateRef.current
      const silent = cur.kind === 'loaded' && isSameDay(cur.date, date)
      if (!silent) setState({ kind: 'loading', date })
      const id = ++seq.current
      try {
        const salonId = await ensureSalonId()
        const appointments = await getConfirmedAppointmentsForSalon(salonId, date)
        if (id === seq.current) setState({ kind: 'loaded', date, appointments })
      } catch (e) {
        console.error(e)
        if (id === seq.current) setState({ kind: 'error', date, error: e })
      }
    },
    [ensureSalonId],
  )

  useEffect(() => {
    void load(selectedDay)
    // initial load only (LoadAppointmentsForDate(DateTime.now()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user?.uid])

  const onDaySelected = (day: Date, focused: Date) => {
    if (!isSameDay(selectedDay, day)) {
      setSelectedDay(day)
      setFocusedDay(focused)
      void load(day)
    }
  }

  const goToToday = () => {
    const now = new Date()
    if (!isSameDay(selectedDay, now)) {
      setSelectedDay(now)
      setFocusedDay(now)
      void load(now)
    } else {
      setFocusedDay(now)
    }
  }

  const openWalkInSheet = async () => {
    if (status !== 'authenticated' || !user || openingWalkIn) return
    let services: ServiceModel[] = []
    let salonId: string | null = null
    setOpeningWalkIn(true)
    try {
      const salon = await getSalonForOwner(user.uid)
      if (salon) {
        salonId = salon.id
        services = await getServicesForSalon(salon.id)
      }
    } catch (e) {
      // The app ignored this; surfacing it avoids a misleading "add a service first" message.
      toastError(e, "Couldn't load your services", () => void openWalkInSheet())
      return
    } finally {
      setOpeningWalkIn(false)
    }
    if (!salonId || !services.some((s) => s.isActive)) {
      toast(t('owner.calendar.walk_in_no_services'), 'info', {
        label: t('owner.services.add_btn'),
        onClick: () => navigate(Routes.ownerServices),
      })
      return
    }
    setWalkIn({ services, salonId, key: Date.now() })
  }

  const submitWalkIn = async ({ clientName, service, startTime }: { clientName: string; service: ServiceModel; startTime: Date }) => {
    if (!walkIn) return
    await createAppointment({
      clientId: WALK_IN_CLIENT_ID,
      salonId: walkIn.salonId,
      staffId: null,
      serviceIds: [service.id],
      startTime,
      durationMinutes: service.durationMinutes,
      totalPrice: serviceHelpers.effectivePrice(service),
      status: AppointmentStatus.confirmed,
      paymentMethod: null,
      paymentTransactionId: null,
      paidAt: null,
      walkInName: clientName,
    })
  }

  const showFor = (s: LoadState) => isSameDay(s.date, selectedDay)

  return (
    <div className="pb-28 md:pb-12">
      <OwnerKeyframes />
      <OwnerTabHeader
        title={t('owner.calendar.title')}
        actions={
          <>
            <HeaderIconButton
              icon={format === 'month' ? CalendarRange : CalendarDays}
              label={format === 'month' ? t('owner.calendar.week_view') : t('owner.calendar.month_view')}
              onClick={() => setFormat((f) => (f === 'month' ? 'week' : 'month'))}
            />
            <HeaderIconButton icon={CalendarCheck} variant="gradient" label={t('common.date_today')} onClick={goToToday} />
          </>
        }
      />

      <div className="mx-auto w-full max-w-5xl md:grid md:grid-cols-[minmax(0,420px)_1fr] md:items-start md:gap-6 md:px-4">
        <div className="m-4 rounded-[20px] border border-line/70 bg-card p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-none md:sticky md:top-16 md:m-0 md:mt-4">
          <TableCalendar
            focusedDay={focusedDay}
            selectedDay={selectedDay}
            format={format}
            onDaySelected={onDaySelected}
            onPageChanged={setFocusedDay}
          />
        </div>

        <div className="md:mt-4">
          <div className="flex items-center gap-3 px-5 md:px-0">
            <SectionIcon icon={CalendarDays} />
            <h2 className="truncate text-base font-bold text-ink">{t('owner.calendar.list_header', [fmtYMMMd(selectedDay)])}</h2>
          </div>

          <div className="mt-4 px-5 md:px-0">
            {state.kind === 'error' && showFor(state) ? (
              <ErrorState
                title="Couldn't load appointments"
                message={friendlyError(state.error).message}
                hint={friendlyError(state.error).hint}
                onRetry={() => void load(selectedDay)}
              />
            ) : state.kind === 'loaded' && showFor(state) ? (
              state.appointments.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <CalendarMinus size={48} className="text-primary/60" />
                  <h3 className="mt-4 text-xl font-bold text-ink">{t('owner.calendar.no_appointments')}</h3>
                  <p className="mt-2 text-sm text-ink/65">{t('owner.calendar.no_appointments_msg')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.appointments.map((a, i) => (
                    <div key={a.id} style={fadeUp(i)}>
                      <AppointmentItem appointment={a} onOpen={() => setDetail(a)} />
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-4" aria-busy="true" aria-label="Loading appointments">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-[86px] w-full" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Fab icon={UserPlus} label={t('owner.calendar.walk_in')} loading={openingWalkIn} onClick={() => void openWalkInSheet()} />

      {detail && (
        <AppointmentDetailsDialog
          appointment={detail}
          onClose={() => {
            setDetail(null)
            void load(selectedDay)
          }}
        />
      )}

      {walkIn && (
        <WalkInSheet
          key={walkIn.key}
          open
          selectedDay={selectedDay}
          services={walkIn.services}
          onSubmit={submitWalkIn}
          onClose={(created) => {
            setWalkIn(null)
            if (created) {
              void load(selectedDay)
              toastSuccess(t('owner.calendar.walk_in_success'))
            }
          }}
        />
      )}
    </div>
  )
}

function AppointmentItem({ appointment, onOpen }: { appointment: AppointmentModel; onOpen: () => void }) {
  const t = useT()
  const client = useAppointmentClient(appointment)
  const displayName = client ? client.fullName : client === null ? 'Unknown Client' : t('common.loading_details')
  const statusColor = ownerStatusColor(appointment.status)
  const muted =
    appointment.status === AppointmentStatus.cancelled ||
    appointment.status === AppointmentStatus.paymentFailed ||
    appointment.status === AppointmentStatus.noShow

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.05] to-accent/[0.03] text-left shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition hover:border-primary/35"
      style={{ opacity: muted ? 0.55 : 1 }}
    >
      <span className="w-[5px] shrink-0" style={{ background: statusColor }} />
      <span className="flex min-w-0 flex-1 items-center gap-4 p-4">
        <span className="rounded-full bg-gradient-to-br from-primary/30 to-accent/30 p-0.5">
          <Avatar url={client?.profilePictureUrl} name={displayName} size={52} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cx('block truncate text-base font-bold text-ink', client === undefined && 'animate-pulse text-ink/50')}>{displayName}</span>
          <span className="mt-1 flex items-center gap-1 text-sm text-ink/70">
            <Scissors size={14} className="text-ink/60" />
            {`${appointment.serviceIds.length} ${t('owner.calendar.services_count')}`}
          </span>
        </span>
        <span className="flex flex-col items-end">
          <span className="rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-xs font-bold text-white shadow-[0_2px_6px_rgba(108,92,231,0.3)]">
            {fmtJm(appointment.startTime)}
          </span>
          <span className="mt-1.5 text-xs font-semibold" style={{ color: statusColor }}>
            {formatCurrency(appointment.totalPrice)}
          </span>
        </span>
      </span>
    </button>
  )
}
