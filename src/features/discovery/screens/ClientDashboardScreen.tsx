// Port of 2_client_dashboard/presentation/screens/client_dashboard_screen.dart
import { Building2, RefreshCw, Tag } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { ErrorState, IconTile, Screen, SectionHeader, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useT } from '@/lib/i18n'
import { ALL_CATEGORIES, type SalonModel } from '@/lib/models'
import { getApprovedVideos, getAppointmentsWithDetails, getDashboardPromotions, upcomingAppointments, type AppointmentWithDetails } from '../api'
import DashboardHeader from '../components/DashboardHeader'
import { CategoryGrid, QuickActionsBar, UpcomingAppointmentCard } from '../components/DashboardWidgets'
import PromotionCarousel from '../components/PromotionCarousel'
import SalonCard from '../components/SalonCard'
import VideoStories, { type VideoShortsState } from '../components/VideoStories'
import { discovery, useDiscovery } from '../discoveryStore'
import type { PromotionModel } from '../types'

type PromoState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; promotions: PromotionModel[] }
type UpNextState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; item: AppointmentWithDetails | null }

export default function ClientDashboardScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const disc = useDiscovery()
  const [promos, setPromos] = useState<PromoState>({ status: 'loading' })
  const [videos, setVideos] = useState<VideoShortsState>({ status: 'loading' })
  const [upNext, setUpNext] = useState<UpNextState>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const uid = !isGuest && user ? user.uid : null

  const loadPromos = useCallback(async (showLoading = false) => {
    if (showLoading) setPromos({ status: 'loading' })
    try {
      setPromos({ status: 'loaded', promotions: await getDashboardPromotions() })
    } catch {
      setPromos({ status: 'error' })
    }
  }, [])
  const loadVideos = useCallback(async (showLoading: boolean) => {
    if (showLoading) setVideos({ status: 'loading' })
    try {
      setVideos({ status: 'loaded', videos: await getApprovedVideos() })
    } catch {
      setVideos({ status: 'error' })
    }
  }, [])
  const loadAppointments = useCallback(
    async (showLoading = false) => {
      if (!uid) return setUpNext({ status: 'loaded', item: null })
      if (showLoading) setUpNext({ status: 'loading' })
      try {
        const all = await getAppointmentsWithDetails(uid)
        setUpNext({ status: 'loaded', item: upcomingAppointments(all)[0] ?? null })
      } catch (e) {
        console.error(e)
        setUpNext({ status: 'error' })
      }
    },
    [uid],
  )

  useEffect(() => {
    void discovery.load()
    void loadPromos(true)
    void loadVideos(true)
  }, [loadPromos, loadVideos])
  useEffect(() => void loadAppointments(true), [loadAppointments])

  const refresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await Promise.all([discovery.refresh(), loadPromos(), loadVideos(false), loadAppointments()])
    setRefreshing(false)
  }

  const goDiscover = (categoryId?: string) => navigate(Routes.clientDiscover, categoryId ? { state: { categoryId } } : undefined)
  const openSalon = (s: SalonModel) => navigate(Routes.salonDetail(s.id), { state: { salon: s } })

  const onPromotionTap = (p: PromotionModel) => {
    switch (p.action) {
      case 'openDiscover':
        return goDiscover()
      case 'openCategory':
        return goDiscover(p.actionValue || undefined)
      case 'openSalon':
        if (p.actionValue) navigate(Routes.salonDetail(p.actionValue))
        return
      default:
        return // openUrl is a TODO in the app; none = informational
    }
  }

  return (
    <Screen className="max-w-5xl">
      <DashboardHeader />
      <div className="mt-2 hidden justify-end px-5 md:flex">
        <button onClick={refresh} disabled={refreshing} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-inset hover:text-ink">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <div className="h-5 md:h-2" />

      <VideoStories state={videos} onRetry={() => loadVideos(true)} />
      <div className="h-2" />

      {uid && upNext.status === 'loading' && (
        <section aria-busy="true">
          <SectionHeader title={t('client.dashboard.up_next')} />
          <div className="h-3.5" />
          <div className="px-5">
            <Skeleton className="h-[96px] !rounded-[24px]" />
          </div>
        </section>
      )}
      {uid && upNext.status === 'error' && (
        <section>
          <SectionHeader title={t('client.dashboard.up_next')} />
          <InlineSectionError message="Couldn't load your next appointment." onRetry={() => void loadAppointments(true)} />
        </section>
      )}
      {upNext.status === 'loaded' && upNext.item && (
        <section>
          <SectionHeader title={t('client.dashboard.up_next')} />
          <div className="h-3.5" />
          <UpcomingAppointmentCard item={upNext.item} onClick={() => navigate(Routes.clientBookings)} />
        </section>
      )}

      <div className="pb-7 pt-3">
        <QuickActionsBar onAction={(a) => (a === 'favorites' ? navigate(Routes.clientFavorites) : goDiscover())} />
      </div>

      {promos.status === 'loading' ? (
        <div className="px-5 pb-7" aria-busy="true">
          <Skeleton className="h-[210px] !rounded-[28px]" />
        </div>
      ) : promos.status === 'error' ? (
        <section className="pb-7">
          <SectionHeader title={t('client.dashboard.special_offers')} />
          <InlineSectionError icon={Tag} message="Couldn't load special offers." onRetry={() => void loadPromos(true)} />
        </section>
      ) : (
        promos.promotions.length > 0 && (
          <section className="pb-7">
            <SectionHeader title={t('client.dashboard.special_offers')} />
            <div className="h-2.5" />
            <PromotionCarousel promotions={promos.promotions} onTap={onPromotionTap} />
          </section>
        )
      )}

      <section>
        <SectionHeader
          title={t('client.dashboard.browse_categories')}
          actionLabel={t('client.dashboard.see_all')}
          onAction={() => navigate(Routes.clientCategories)}
        />
        <div className="h-3.5" />
        <div className="px-5">
          <CategoryGrid categories={ALL_CATEGORIES} onSelect={(id) => goDiscover(id)} />
        </div>
      </section>
      <div className="h-8" />

      <SectionHeader title={t('client.dashboard.recommended')} actionLabel={t('client.dashboard.see_all')} onAction={() => goDiscover()} />
      <div className="h-3.5" />
      {disc.status === 'loading' || disc.status === 'initial' ? (
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[300px] w-[68vw] min-w-[230px] max-w-[300px] shrink-0 !rounded-[26px]" />
          ))}
        </div>
      ) : disc.status === 'loaded' && disc.allSalons.length === 0 ? (
        <div className="mx-5 flex flex-col items-center rounded-3xl border border-line bg-inset px-5 py-8 text-center">
          <IconTile icon={Building2} size={56} />
          <p className="t-heading mt-3.5">{t('client.dashboard.no_salons_title')}</p>
          <p className="t-caption mt-1">{t('client.dashboard.no_salons_msg')}</p>
        </div>
      ) : disc.status === 'loaded' ? (
        <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-5 pb-2">
          {disc.allSalons.map((s) => (
            <SalonCard key={s.id} salon={s} onClick={() => openSalon(s)} className="h-[300px] w-[68vw] min-w-[230px] max-w-[300px] shrink-0 snap-start" />
          ))}
        </div>
      ) : disc.status === 'error' ? (
        <ErrorState
          className="!py-6"
          title="Couldn't load salons"
          message={friendlyError(disc.error).message}
          hint={friendlyError(disc.error).hint}
          onRetry={() => void discovery.load()}
        />
      ) : null}
    </Screen>
  )
}

/** Compact per-section error row with Retry (keeps the rest of the dashboard usable). */
function InlineSectionError({ message, onRetry, icon: Icon = RefreshCw }: { message: string; onRetry: () => void; icon?: typeof RefreshCw }) {
  const t = useT()
  return (
    <div role="alert" className="mx-5 mt-2.5 flex items-center gap-2.5 rounded-2xl border border-line bg-inset px-4 py-3">
      <Icon size={18} className="shrink-0 text-ink/40" />
      <span className="flex-1 text-[13px] text-ink/70">{message}</span>
      <button onClick={onRetry} className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10">
        {t('common.retry')}
      </button>
    </div>
  )
}
