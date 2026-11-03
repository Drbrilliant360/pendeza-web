// Port of 2_client_booking/presentation/screens/booking_confirmation_screen.dart
// Payments are disabled: ConfirmBooking writes a 'Confirmed' appointment, then (BookingSuccess)
// we show the success snackbar, reset the flow and go to My Appointments.
import { CalendarDays, CircleCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { Card, ErrorState, Spinner } from '@/components/ui'
import { formatCurrency } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { useBooking } from '../BookingContext'
import { AppointmentSummaryCard, BookingServiceTile, BookingStepHeader, BookingSummaryFooter, BookingTotalRow } from '../components/BookingParts'
import { AuthPromptDialog } from '../components/AuthPromptDialog'
import { slotToDate } from '../slots'

export default function BookingConfirmationScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { toast, toastSuccess } = useFeedback()
  const { isGuest } = useAuth()
  const { salonId = '' } = useParams()
  const b = useBooking()
  const { phase, salon, status } = b
  const done = useRef(false)
  const [prompt, setPrompt] = useState(false)

  const lost =
    phase === 'initial' ||
    (phase === 'inProgress' && (salon?.id !== salonId || !b.selectedDate || !b.selectedTimeSlot || b.selectedServices.length === 0))
  useEffect(() => {
    if (lost && !done.current) navigate(Routes.serviceSelection(salonId), { replace: true })
  }, [lost, navigate, salonId])

  // BookingFailure (non-guest) → snackbar (friendly text from BookingContext, with Retry)
  useEffect(() => {
    if (phase === 'failure' && b.failure && !b.failure.isGuestAttempt)
      toast(b.failure.hint ? `${b.failure.error} ${b.failure.hint}` : b.failure.error, 'error', { label: t('common.retry'), onClick: () => void confirm() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const confirm = async () => {
    if (isGuest) {
      setPrompt(true)
      return
    }
    const id = await b.confirmBooking()
    if (id && !done.current) {
      done.current = true
      toastSuccess(t('client.booking.success_msg'))
      navigate(Routes.clientBookings, { replace: true })
      b.resetBooking()
    }
  }

  const header = <BookingStepHeader step={3} parent={Routes.timeslotSelection(salonId)} title={t('client.booking.confirm_title')} subtitle={phase === 'inProgress' ? salon?.salonName ?? '' : ''} />

  let body
  if ((phase !== 'inProgress' && phase !== 'failure') || (phase === 'failure' && b.failure?.isGuestAttempt) || lost) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <Spinner />
        <p className="t-caption">{t('common.loading_details')}</p>
      </div>
    )
  } else if (phase === 'failure') {
    body = (
      <ErrorState
        title={t('common.oops')}
        message={b.failure?.error}
        hint={b.failure?.hint}
        retrying={status === 'processing'}
        onRetry={() => void confirm()}
      />
    )
  } else {
    const loading = status === 'processing'
    const services = b.selectedServices
    const when = b.selectedDate && b.selectedTimeSlot ? slotToDate(b.selectedDate, b.selectedTimeSlot) : null
    body = (
      <>
        <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-6 pt-[18px] md:grid md:grid-cols-2 md:items-start md:gap-6">
          <div className="animate-[fadeUp_0.45s_ease-out_both]">
            <AppointmentSummaryCard salonName={salon?.salonName ?? ''} when={when} />
          </div>
          <div className="mt-[22px] md:mt-0">
            <h2 className="t-title">{t('client.booking.summary_title')}</h2>
            <div className="mt-3 animate-[fadeUp_0.57s_ease-out_both]">
              <Card radius={24} className="px-4 pb-3 pt-2">
                {services.map((s, i) => (
                  <div key={s.id} className={i > 0 ? 'border-t border-line' : undefined}>
                    <BookingServiceTile service={s} />
                  </div>
                ))}
                <div className="my-2 border-t border-line" />
                <BookingTotalRow title={t('common.duration')} value={`${b.totalDurationMinutes} ${t('common.min')}`} />
                <BookingTotalRow title={t('common.total')} value={formatCurrency(b.totalPrice)} />
              </Card>
            </div>
          </div>
        </div>
        <BookingSummaryFooter
          totalPrice={b.totalPrice}
          totalDurationMinutes={b.totalDurationMinutes}
          buttonText={t('client.booking.confirm_btn')}
          buttonIcon={CircleCheck}
          loading={loading}
          caption={loading ? 'Booking your appointment…' : undefined}
          onButtonPressed={loading ? null : () => void confirm()}
        />
      </>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <style>{'@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'}</style>
      <div className="mx-auto w-full max-w-3xl">{header}</div>
      <div className="flex flex-1 flex-col">{body}</div>
      <AuthPromptDialog
        open={prompt}
        onClose={() => setPrompt(false)}
        featureName="booking"
        customMessage={t('client.booking.guest_prompt')}
        icon={CalendarDays}
        returnRoute={pathname}
      />
    </div>
  )
}
