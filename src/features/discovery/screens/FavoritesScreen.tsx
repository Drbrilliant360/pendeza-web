// Port of 2_client_favorites/presentation/screens/favorites_screen.dart
import { Heart, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { EmptyState, ErrorState, GlassCircleButton, PageHeader, Screen, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useT } from '@/lib/i18n'
import { clearAllFavorites, getSalonsByIds } from '@/lib/firestore'
import type { SalonModel } from '@/lib/models'
import SalonCard from '../components/SalonCard'
import { useFavorites } from '../favoritesStore'

type State = { status: 'loading' } | { status: 'empty' } | { status: 'error'; error: unknown; title: string } | { status: 'loaded'; salons: SalonModel[] }

export default function FavoritesScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { user, isGuest, requestAuthentication } = useAuth()
  const { toastSuccess, toastError, confirm } = useFeedback()
  const [clearing, setClearing] = useState(false)
  const fav = useFavorites()
  const uid = !isGuest && user ? user.uid : null
  const [state, setState] = useState<State>(isGuest ? { status: 'empty' } : { status: 'loading' })
  const idsKey = fav.ids.join(',')

  // LoadFavorites / RefreshFavorites – re-fetch salon details whenever the realtime id list changes.
  const load = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return setState({ status: 'empty' })
      try {
        const salons = await getSalonsByIds(ids)
        setState({ status: 'loaded', salons })
      } catch (e) {
        console.error('Error loading favorites', e)
        setState({ status: 'error', error: e, title: "Couldn't load your favorites" })
      }
    },
    [],
  )

  useEffect(() => {
    if (!uid) return setState({ status: 'empty' })
    if (!fav.ready) return
    void load(idsKey ? idsKey.split(',') : [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, fav.ready, idsKey, load])

  const clearAll = async () => {
    if (clearing) return
    const ok = await confirm({
      title: t('client.favorites.clear_dialog_title'),
      message: t('client.favorites.clear_dialog_content'),
      confirmText: t('client.favorites.clear_all_action'),
      cancelText: t('common.cancel'),
      destructive: true,
    })
    if (!ok) return
    await doClear()
  }
  const doClear = async () => {
    if (!uid) return
    const prev = state
    setClearing(true)
    setState({ status: 'loading' })
    try {
      await clearAllFavorites(uid)
      setState({ status: 'empty' })
      toastSuccess('All favorites cleared')
    } catch (e) {
      // Keep the list the user had; explain what happened with a Retry.
      setState(prev)
      toastError(e, 'Could not clear favorites', () => void doClear())
    } finally {
      setClearing(false)
    }
  }

  const hasFavorites = state.status === 'loaded' && state.salons.length > 0

  return (
    <Screen className="max-w-5xl">
      <PageHeader
        title={t('client.profile.menu.favorites')}
        subtitle={hasFavorites ? t('client.favorites.saved_count', [state.salons.length]) : null}
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(Routes.clientProfile, { replace: true }))}
        actions={hasFavorites ? <GlassCircleButton icon={Trash2} size={42} label={t('client.favorites.clear_all_action')} onClick={clearAll} /> : undefined}
      />
      {state.status === 'loading' ? (
        <Grid busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[0.75] !rounded-[26px]" />
          ))}
        </Grid>
      ) : state.status === 'empty' ? (
        <EmptyState
          icon={Heart}
          color="#EF4444"
          title={t('client.favorites.empty_title')}
          message={isGuest ? t('client.booking.guest_prompt') : t('client.favorites.empty_msg')}
          actionLabel={isGuest ? t('auth.login.button') : t('client.favorites.explore_salons')}
          onAction={() => (isGuest ? requestAuthentication('favorite') : navigate(Routes.clientDiscover))}
          className="pt-16"
        />
      ) : state.status === 'error' ? (
        <ErrorState
          title={state.title}
          message={friendlyError(state.error).message}
          hint={friendlyError(state.error).hint}
          onRetry={() => {
            setState({ status: 'loading' })
            void load(fav.ids)
          }}
          className="pt-16"
        />
      ) : (
        <Grid>
          {state.salons.map((s) => (
            <SalonCard key={s.id} salon={s} className="aspect-[0.75] w-full" onClick={() => navigate(Routes.salonDetail(s.id), { state: { salon: s } })} />
          ))}
        </Grid>
      )}
    </Screen>
  )
}

function Grid({ children, busy }: { children: React.ReactNode; busy?: boolean }) {
  return <div aria-busy={busy || undefined} className="grid grid-cols-2 gap-3.5 px-5 pb-6 pt-[18px] sm:grid-cols-3 lg:grid-cols-4">{children}</div>
}
