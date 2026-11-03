// Port of 2_client_booking/presentation/screens/timeslot_selection_screen.dart
import { ArrowRight, CalendarX, Clock, Sun, Sunrise, Sunset, type LucideIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { useBooking } from '../BookingContext'
import { BookingStepHeader, BookingSummaryFooter, fmtDayShort } from '../components/BookingParts'
import { HorizontalDayPicker, TimeSlotChip } from '../components/DayPicker'
import { groupSlots, type SlotGroupKey } from '../slots'

const GROUP_ICON: Record<SlotGroupKey, LucideIcon> = { morning: Sunrise, afternoon: Sun, evening: Sunset }

export default function TimeslotSelectionScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const { salonId = '' } = useParams()
  const b = useBooking()
  const { phase, salon, status } = b

  const lost = phase === 'initial' || (phase === 'inProgress' && salon?.id !== salonId)
  // Hard refresh / deep link: the flow lives in memory, so restart from step 1.
  useEffect(() => {
    if (lost) navigate(Routes.serviceSelection(salonId), { replace: true })
  }, [lost, navigate, salonId])

  // initState
  const inited = useRef(false)
  useEffect(() => {
    if (inited.current || phase !== 'inProgress' || lost) return
    inited.current = true
    if (b.selectedDate && status !== 'selectingTime' && status !== 'reviewing') void b.fetchTimeSlots()
    else if (!b.selectedDate) b.selectDate(new Date())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lost])

  // In-progress failure is shown inline (ErrorState with Retry) below – errorMessage is already friendly text.

  const selectedDate = b.selectedDate ?? new Date()
  const slot = b.selectedTimeSlot

  const navigating = useRef(false)
  const proceed = () => {
    if (!slot) {
      toast(t('client.booking.error_no_time'), 'warning')
      return
    }
    if (navigating.current || !salon) return
    navigating.current = true
    setTimeout(() => (navigating.current = false), 600)
    navigate(Routes.bookingConfirmation(salon.id))
  }

  const dateSection = (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-5">
        <h2 className="t-title">{t('client.booking.choose_date')}</h2>
        <span className="t-caption font-semibold">{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>
      <div className="mt-1">
        <HorizontalDayPicker selectedDate={selectedDate} onDateSelected={(d) => b.selectDate(d)} />
      </div>
    </div>
  )

  const footer = (enabled: boolean) => (
    <BookingSummaryFooter
      totalPrice={enabled ? b.totalPrice : 0}
      totalDurationMinutes={0}
      label={t('client.booking.total_payable')}
      caption={slot ? `${fmtDayShort(selectedDate)} • ${slot}` : t('client.booking.pick_time_hint')}
      buttonText={t('client.booking.review_btn')}
      buttonIcon={ArrowRight}
      onButtonPressed={enabled && slot ? proceed : null}
    />
  )

  let body
  if (phase === 'failure' && b.failure) {
    body = (
      <ErrorState
        title={t('common.oops')}
        message={b.failure.error}
        hint={b.failure.hint}
        onRetry={() => navigate(Routes.serviceSelection(salonId), { replace: true })}
      />
    )
  } else if (phase === 'inProgress' && !lost && status === 'failure') {
    body = (
      <>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pt-[18px]">
          {dateSection}
          <ErrorState
            title="Couldn't load available times"
            message={b.errorMessage ?? undefined}
            hint="Check your connection and try again."
            onRetry={() => void b.fetchTimeSlots()}
          />
        </div>
        {footer(false)}
      </>
    )
  } else if (phase === 'inProgress' && !lost && (status === 'selectingTime' || status === 'reviewing')) {
    const slots = b.availableTimeSlots
    const total = b.totalDurationMinutes
    body = (
      <>
        <div className="mx-auto w-full max-w-3xl flex-1 pb-6 pt-[18px]">
          {dateSection}
          <div className="mt-3.5 px-5">
            <h2 className="t-title">{t('client.booking.available_slots')}</h2>
            {total > 0 && (
              <p className="t-caption mt-1 flex items-center gap-1.5">
                <Clock size={13} /> {t('client.booking.est_duration', [total])}
              </p>
            )}
          </div>
          <div className="mt-3.5">
            {slots.length === 0 ? (
              <EmptyState
                className="pt-2"
                icon={CalendarX}
                title={t('client.booking.no_slots')}
                message={t('client.booking.no_slots_hint')}
                color="#F5A623"
              />
            ) : (
              <div className="px-5">
                {groupSlots(slots).map((g) => {
                  const Icon = g.key ? GROUP_ICON[g.key] : null
                  return (
                    <div key={g.key ?? 'all'} className="mb-3.5">
                      {g.key && Icon && (
                        <div className="mb-2.5 mt-1.5 flex items-center gap-2 text-muted">
                          <Icon size={16} />
                          <span className="t-label">{t(`client.booking.${g.key}`)}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2.5 min-[300px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
                        {g.slots.map((s) => (
                          <TimeSlotChip key={s} slot={s} isSelected={s === slot} onTap={() => b.selectTimeSlot(s)} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {footer(true)}
      </>
    )
  } else {
    body = (
      <>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pt-[18px]">
          {dateSection}
          <div className="mt-3.5 px-5" aria-busy aria-label="Loading available times">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <div className="mt-4 grid grid-cols-2 gap-2.5 min-[300px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
              {Array.from({ length: 12 }, (_, i) => (
                <Skeleton key={i} className="h-11 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        {footer(false)}
      </>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <div className="mx-auto w-full max-w-3xl">
        <BookingStepHeader step={2} parent={Routes.serviceSelection(salonId)} title={t('client.booking.select_time_title')} subtitle={phase === 'inProgress' ? salon?.salonName ?? '' : ''} />
      </div>
      <div className="flex flex-1 flex-col">{body}</div>
    </div>
  )
}
