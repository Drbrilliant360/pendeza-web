// Port of 2_client_discovery/presentation/screens/salon_detail_screen.dart
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { SegmentedTabs, usePageTitle } from '@/components/ui'
import { useBooking } from '@/features/bookings/BookingContext'
import { useT } from '@/lib/i18n'
import { getServicesForSalon } from '@/lib/firestore'
import type { SalonModel, ServiceModel } from '@/lib/models'
import BookingBottomBar from '../components/BookingBottomBar'
import ReviewsSection from '../components/ReviewsSection'
import SalonGate from '../components/SalonGate'
import SalonHero from '../components/SalonHero'
import SalonOverviewTab from '../components/SalonOverviewTab'
import SalonServicesTab from '../components/SalonServicesTab'
import { ReviewsProvider } from '../useReviews'

type Tab = 'overview' | 'services' | 'reviews'

export default function SalonDetailRoute() {
  return <SalonGate variant="detail">{(salon) => <SalonDetailScreen key={salon.id} salon={salon} />}</SalonGate>
}

function SalonDetailScreen({ salon }: { salon: SalonModel }) {
  const t = useT()
  const navigate = useNavigate()
  const { startBooking } = useBooking()
  const [tab, setTab] = useState<Tab>('overview')
  usePageTitle(salon.salonName)
  const [services, setServices] = useState<ServiceModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const loadServices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getServicesForSalon(salon.id)
      setServices(list.filter((s) => s.isActive))
    } catch (e) {
      console.error('Error loading services', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [salon.id])

  useEffect(() => {
    window.scrollTo(0, 0)
    void loadServices()
  }, [loadServices])

  const book = (preselectedService?: ServiceModel) => {
    startBooking(salon)
    navigate(Routes.serviceSelection(salon.id), { state: { salonName: salon.salonName, ...(preselectedService ? { preselectedService } : {}) } })
  }

  const changeTab = (v: Tab) => {
    setTab(v)
    // keep the tab bar in view when switching from far down the page
    const bar = document.getElementById('salon-tabs')
    if (bar && window.scrollY > bar.offsetTop) window.scrollTo({ top: bar.offsetTop })
  }

  return (
    <ReviewsProvider salonId={salon.id}>
      <div className="min-h-screen bg-page pb-36">
        <SalonHero salon={salon} />
        <div className="mx-auto max-w-4xl">
          <div id="salon-tabs" className="sticky top-14 z-20 bg-page px-5 py-2">
            <SegmentedTabs<Tab>
              value={tab}
              onChange={changeTab}
              tabs={[
                { value: 'overview', label: t('client.salon_details.tab_overview') },
                { value: 'services', label: t('client.salon_details.tab_services') },
                { value: 'reviews', label: t('client.salon_details.tab_reviews') },
              ]}
            />
          </div>
          {tab === 'overview' && <SalonOverviewTab salon={salon} />}
          {tab === 'services' && <SalonServicesTab services={services} loading={loading} error={error} onRetry={loadServices} onServiceTap={(s) => book(s)} />}
          {tab === 'reviews' && (
            <div className="pt-2">
              <ReviewsSection salon={salon} />
            </div>
          )}
        </div>
        <BookingBottomBar salon={salon} services={services} servicesLoading={loading} onBook={() => book()} />
      </div>
    </ReviewsProvider>
  )
}
