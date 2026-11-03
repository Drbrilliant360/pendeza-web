// Port of features/2_client_booking BookingBloc. Provided app-wide in src/App.tsx.
// CONTRACT (used by other feature groups – keep these names/signatures):
//   const { startBooking } = useBooking()
//   startBooking(salon)                               // == BookingBloc.add(StartBooking(salon))
//   navigate(Routes.serviceSelection(salon.id), { state: { salonName, preselectedService } })
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { AppConfig } from '@/lib/config'
import { friendlyError } from '@/lib/errors'
import * as fs from '@/lib/firestore'
import { AppointmentStatus, serviceHelpers, type SalonModel, type ServiceModel } from '@/lib/models'
import { createAppointment } from './api'
import { filterBookedSlots, filterPastSlots, generateTimeSlots, slotToDate } from './slots'

/** BookingStatus enum */
export type BookingStatus =
  | 'initial'
  | 'loading'
  | 'loadingServices'
  | 'selectingServices'
  | 'selectingTime'
  | 'reviewing'
  | 'processing'
  | 'success'
  | 'failure'

/** BookingInitial / BookingInProgress / BookingSuccess / BookingFailure */
export type BookingPhase = 'initial' | 'inProgress' | 'success' | 'failure'

interface State {
  phase: BookingPhase
  salon: SalonModel | null
  status: BookingStatus
  availableServices: ServiceModel[]
  selectedServices: ServiceModel[]
  selectedDate: Date | null
  selectedTimeSlot: string | null
  availableTimeSlots: string[]
  /** Always user-friendly text (never a raw error). */
  errorMessage: string | null
  /** BookingFailure.error / isGuestAttempt. `error` is user-friendly text; `hint` says how to fix it. */
  failure: BookingFailure | null
  /** BookingSuccess.appointmentId */
  appointmentId: string | null
}

export interface BookingFailure {
  error: string
  hint?: string
  isGuestAttempt: boolean
}

/** Friendly "<context>. <cause>" text for the UI – never raw error strings. */
function friendly(e: unknown, context: string): { error: string; hint?: string } {
  const f = friendlyError(e, context)
  return { error: f.message === context ? context : `${context} ${f.message}`, hint: f.hint }
}

const INITIAL: State = {
  phase: 'initial',
  salon: null,
  status: 'initial',
  availableServices: [],
  selectedServices: [],
  selectedDate: null,
  selectedTimeSlot: null,
  availableTimeSlots: [],
  errorMessage: null,
  failure: null,
  appointmentId: null,
}

export interface BookingContextValue {
  salon: SalonModel | null
  selectedServices: ServiceModel[]
  /** BookingBloc StartBooking(salon) */
  startBooking: (salon: SalonModel) => void
  /** BookingBloc StartBookingWithId(salonId) – used when a booking URL is opened directly */
  startBookingWithId: (salonId: string) => Promise<void>
  /** BookingBloc ResetBooking */
  resetBooking: () => void

  // ── extended state ──
  phase: BookingPhase
  status: BookingStatus
  availableServices: ServiceModel[]
  selectedDate: Date | null
  selectedTimeSlot: string | null
  availableTimeSlots: string[]
  errorMessage: string | null
  failure: BookingFailure | null
  appointmentId: string | null
  totalPrice: number
  totalDurationMinutes: number

  // ── extended events ──
  fetchServices: () => Promise<void>
  selectServices: (services: ServiceModel[]) => void
  selectDate: (date: Date) => void
  fetchTimeSlots: () => Promise<void>
  selectTimeSlot: (slot: string) => void
  /** Resolves to the new appointment id, or null on failure. */
  confirmBooking: () => Promise<string | null>
}

const Ctx = createContext<BookingContextValue | null>(null)

const sumDuration = (s: ServiceModel[]) => s.reduce((a, x) => a + x.durationMinutes, 0)
const sumPrice = (s: ServiceModel[]) => s.reduce((a, x) => a + serviceHelpers.effectivePrice(x), 0)

export function BookingProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth()
  const [state, setState] = useState<State>(INITIAL)
  const ref = useRef<State>(INITIAL)
  const slotSeq = useRef(0)
  const startSeq = useRef(0)

  const set = useCallback((next: State) => {
    ref.current = next
    setState(next)
  }, [])
  /** copyWith on the *current* in-progress state (no-op otherwise). */
  const patch = useCallback(
    (p: Partial<State>) => {
      if (ref.current.phase !== 'inProgress') return
      set({ ...ref.current, ...p })
    },
    [set],
  )

  const fetchServices = useCallback(async () => {
    const cur = ref.current
    if (cur.phase !== 'inProgress' || !cur.salon) return
    const salonId = cur.salon.id
    patch({ status: 'loadingServices', errorMessage: null })
    try {
      const services = await fs.getServicesForSalon(salonId)
      if (ref.current.salon?.id !== salonId) return
      patch({ status: 'selectingServices', availableServices: services })
    } catch (e) {
      // The app showed an (incorrect) empty list on failure; surface it with Retry instead.
      console.error('Error fetching services for salon', e)
      if (ref.current.salon?.id !== salonId) return
      patch({ status: 'failure', errorMessage: friendly(e, "Couldn't load services.").error })
    }
  }, [patch])

  const startBooking = useCallback(
    (salon: SalonModel) => {
      startSeq.current++
      set({ ...INITIAL, phase: 'inProgress', salon, status: 'selectingServices' })
      void fetchServices()
    },
    [set, fetchServices],
  )

  const startBookingWithId = useCallback(
    async (salonId: string) => {
      const seq = ++startSeq.current
      try {
        const salon = await fs.getSalonById(salonId)
        if (!salon) throw new Error('Salon not found')
        if (seq !== startSeq.current) return
        startBooking(salon)
      } catch (e) {
        if (seq !== startSeq.current) return
        console.error('Error loading salon for booking', e)
        set({ ...INITIAL, phase: 'failure', failure: { ...friendly(e, 'Could not load salon details.'), isGuestAttempt: false } })
      }
    },
    [set, startBooking],
  )

  const selectServices = useCallback((services: ServiceModel[]) => patch({ selectedServices: services }), [patch])

  const fetchTimeSlots = useCallback(async () => {
    const cur = ref.current
    if (cur.phase !== 'inProgress' || !cur.salon || !cur.selectedDate) return
    const seq = ++slotSeq.current
    const { salon, selectedDate, selectedServices } = cur
    patch({ status: 'processing', errorMessage: null })
    try {
      // Deliberately lenient like the app: if existing bookings can't be read, all slots are offered
      // and the server-side write still guards against conflicts.
      const appointments = await fs.getAppointmentsForSalonOnDate(salon.id, selectedDate).catch((e) => {
        console.error('Error fetching salon appointments for date', e)
        return []
      })
      if (seq !== slotSeq.current) return
      const base = generateTimeSlots(salon.openingTime ?? '08:00', salon.closingTime ?? '20:00', 30)
      let slots = filterBookedSlots(base, appointments, selectedDate, sumDuration(selectedServices))
      slots = filterPastSlots(slots, selectedDate)
      patch({ status: 'selectingTime', availableTimeSlots: slots })
    } catch (e) {
      if (seq !== slotSeq.current) return
      console.error('Error building time slots', e)
      patch({ status: 'failure', errorMessage: friendly(e, "Couldn't load available times.").error })
    }
  }, [patch])

  const selectDate = useCallback(
    (date: Date) => {
      if (ref.current.phase !== 'inProgress') return
      // The web port also clears the previously chosen slot so it can't leak onto another day.
      patch({ selectedDate: date, selectedTimeSlot: null })
      void fetchTimeSlots()
    },
    [patch, fetchTimeSlots],
  )

  const selectTimeSlot = useCallback((slot: string) => patch({ selectedTimeSlot: slot }), [patch])

  const resetBooking = useCallback(() => {
    startSeq.current++
    slotSeq.current++
    set(INITIAL)
  }, [set])

  const authRef = useRef({ authStatus, user })
  authRef.current = { authStatus, user }

  const confirmBooking = useCallback(async (): Promise<string | null> => {
    let cur = ref.current
    // Web addition: allow retrying after a failed (non-guest) attempt without losing the selection.
    if (cur.phase === 'failure' && cur.salon && cur.failure && !cur.failure.isGuestAttempt) {
      cur = { ...cur, phase: 'inProgress', status: 'reviewing', failure: null }
      set(cur)
    }
    if (cur.phase !== 'inProgress' || !cur.salon) return null
    if (cur.status === 'processing') return null // double-submit guard
    const fail = (error: string, isGuestAttempt = false, hint?: string) => {
      set({ ...ref.current, phase: 'failure', failure: { error, hint, isGuestAttempt } })
      return null
    }
    if (!cur.selectedDate || !cur.selectedTimeSlot) return fail('Please select a date and time slot.')
    if (cur.selectedServices.length === 0) return fail('Please select at least one service.')

    patch({ status: 'processing' })
    try {
      const when = slotToDate(cur.selectedDate, cur.selectedTimeSlot)
      if (!when) throw new Error('Invalid time slot')
      const { authStatus: st, user: u } = authRef.current
      if (st !== 'authenticated' || !u || u.isGuest) {
        return fail('You must be logged in to book.', st === 'guest')
      }
      // Payments are disabled (AppConfig.paymentsEnabled = false) → booking is Confirmed straight away.
      const appointmentId = await createAppointment({
        clientId: u.uid,
        salonId: cur.salon.id,
        serviceIds: cur.selectedServices.map((s) => s.id),
        startTime: when,
        durationMinutes: sumDuration(cur.selectedServices),
        totalPrice: sumPrice(cur.selectedServices),
        status: AppConfig.paymentsEnabled ? AppointmentStatus.pendingPayment : AppointmentStatus.confirmed,
      })
      set({ ...ref.current, phase: 'success', status: 'success', appointmentId })
      return appointmentId
    } catch (e) {
      console.error('ConfirmBooking error', e)
      const f = friendly(e, "We couldn't complete your booking.")
      return fail(f.error, false, f.hint)
    }
  }, [patch, set])

  const value = useMemo<BookingContextValue>(
    () => ({
      ...state,
      totalPrice: sumPrice(state.selectedServices),
      totalDurationMinutes: sumDuration(state.selectedServices),
      startBooking,
      startBookingWithId,
      resetBooking,
      fetchServices,
      selectServices,
      selectDate,
      fetchTimeSlots,
      selectTimeSlot,
      confirmBooking,
    }),
    [state, startBooking, startBookingWithId, resetBooking, fetchServices, selectServices, selectDate, fetchTimeSlots, selectTimeSlot, confirmBooking],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBooking() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useBooking outside BookingProvider')
  return c
}
