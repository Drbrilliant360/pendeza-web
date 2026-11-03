// Port of 2_client_booking/presentation/screens/service_selection_screen.dart
import { ArrowRight, Scissors } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { serviceHelpers, type ServiceModel } from '@/lib/models'
import { useBooking } from '../BookingContext'
import { BookingStepHeader, BookingSummaryFooter, ServiceSelectionCard } from '../components/BookingParts'

interface NavState {
  salonName?: string
  preselectedService?: ServiceModel
}

export default function ServiceSelectionScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const { salonId = '' } = useParams()
  const navState = (useLocation().state ?? {}) as NavState
  const booking = useBooking()
  const { phase, salon, status, availableServices, failure } = booking

  // Deep link / hard refresh: (re)start the flow for this salon.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    if (booking.phase !== 'inProgress' || booking.salon?.id !== salonId) void booking.startBookingWithId(salonId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId])

  // initState: restore selection from the flow, else the preselected service.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>()
    if (booking.phase === 'inProgress' && booking.salon?.id === salonId) booking.selectedServices.forEach((s) => ids.add(s.id))
    if (ids.size === 0 && navState.preselectedService) ids.add(navState.preselectedService.id)
    return ids
  })

  const selected = useMemo(() => availableServices.filter((s) => selectedIds.has(s.id)), [availableServices, selectedIds])
  const totalPrice = selected.reduce((a, s) => a + serviceHelpers.effectivePrice(s), 0)
  const totalDuration = selected.reduce((a, s) => a + s.durationMinutes, 0)
  const hasSelection = selected.length > 0

  const toggle = (s: ServiceModel) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(s.id)) next.delete(s.id)
      else next.add(s.id)
      return next
    })

  const navigating = useRef(false)
  const proceed = () => {
    if (!hasSelection) {
      toast(t('client.booking.error_no_service'), 'warning')
      return
    }
    if (navigating.current) return
    navigating.current = true
    setTimeout(() => (navigating.current = false), 600)
    if (phase === 'inProgress' && salon) {
      booking.selectServices(selected)
      navigate(Routes.timeslotSelection(salon.id))
    } else {
      toast(t('client.booking.error_process_lost'), 'error')
      navigate(Routes.salonDetail(salonId), { replace: true })
    }
  }

  const salonName = navState.salonName ?? (salon?.id === salonId ? salon.salonName : '') ?? 'Salon'
  const showsServices = phase === 'inProgress' && (status === 'selectingServices' || status === 'selectingTime' || status === 'reviewing')
  // Services still loading for a different salon → keep showing the skeleton
  const ready = showsServices && salon?.id === salonId

  let body
  if (phase === 'failure' && failure) {
    body = (
      <ErrorState
        title={t('common.oops')}
        message={failure.error}
        hint={failure.hint}
        onRetry={() => void booking.startBookingWithId(salonId)}
      />
    )
  } else if (phase === 'inProgress' && status === 'failure' && salon?.id === salonId) {
    body = (
      <ErrorState
        title="Couldn't load services"
        message={booking.errorMessage ?? undefined}
        hint="Check your connection and try again."
        onRetry={() => void booking.fetchServices()}
      />
    )
  } else if (ready && availableServices.length === 0) {
    body = <EmptyState icon={Scissors} title={t('client.booking.empty_services')} />
  } else if (ready) {
    body = (
      <>
        <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-6 pt-[18px]">
          <p className="t-body mb-3.5 font-normal text-muted">{t('client.booking.select_services_header')}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {availableServices.map((s, i) => (
              <div key={s.id} className="animate-[fadeUp_0.3s_ease-out_both]" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                <ServiceSelectionCard service={s} isSelected={selectedIds.has(s.id)} onTap={() => toggle(s)} />
              </div>
            ))}
          </div>
        </div>
        <BookingSummaryFooter
          totalPrice={totalPrice}
          totalDurationMinutes={totalDuration}
          label={hasSelection ? t('client.booking.services_selected', [selected.length]) : t('client.booking.total_price_label')}
          caption={hasSelection ? t('client.booking.approx_duration', [totalDuration]) : null}
          buttonText={t('client.booking.next_time_btn')}
          buttonIcon={ArrowRight}
          onButtonPressed={hasSelection ? proceed : null}
        />
      </>
    )
  } else {
    body = <LoadingList />
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <style>{'@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}'}</style>
      <div className="mx-auto w-full max-w-3xl">
        <BookingStepHeader step={1} parent={Routes.salonDetail(salonId)} title={t('client.booking.choose_services')} subtitle={salonName || 'Salon'} />
      </div>
      <div className="flex flex-1 flex-col">{body}</div>
    </div>
  )
}

function LoadingList() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-3 px-5 pb-6 pt-[18px] md:grid-cols-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[92px] rounded-[22px]" />
      ))}
    </div>
  )
}
