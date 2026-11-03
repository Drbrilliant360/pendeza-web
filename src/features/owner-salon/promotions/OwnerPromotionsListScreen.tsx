// Port of promotions/presentation/screens/owner_promotions_list_screen.dart (+ OwnerPromotionsBloc stream).
import { Plus, Tag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFeedback } from '@/components/feedback'
import { EmptyState, ErrorState, Screen, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import * as api from '../api'
import { OwnerAppBar } from '../components/OwnerChrome'
import type { PromotionModel } from '../models'
import { OwnerSalonRoutes } from '../paths'
import PromotionCard from './PromotionCard'
import { useOwnerSalonId } from './useOwnerSalonId'

export default function OwnerPromotionsListScreen() {
  const navigate = useNavigate()
  const { toastSuccess, toastError, confirm } = useFeedback()
  const { salonId, loading: loadingSalon, error: salonError, retry } = useOwnerSalonId()
  const [promotions, setPromotions] = useState<PromotionModel[] | null>(null)
  const [streamError, setStreamError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  /** Optimistic isActive values while the write is in flight. */
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!salonId) return
    setPromotions(null)
    setStreamError(null)
    return api.watchPromotions(salonId, setPromotions, (e) => {
      console.error('Promotions stream error', e)
      setStreamError(e)
    })
  }, [salonId, attempt])

  const goCreate = () => navigate(OwnerSalonRoutes.createPromotion, { state: { salonId } })

  const clearOptimistic = (id: string) =>
    setOptimistic((o) => {
      const { [id]: _drop, ...rest } = o
      void _drop
      return rest
    })

  // Optimistic switch: flip immediately, roll back with an error toast if the write fails.
  const toggle = async (p: PromotionModel, isActive: boolean) => {
    if (!salonId || p.id in optimistic) return
    setOptimistic((o) => ({ ...o, [p.id]: isActive }))
    try {
      await api.togglePromotionStatus({ salonId, promotionId: p.id, isActive })
      toastSuccess(isActive ? 'Promotion activated' : 'Promotion paused')
    } catch (e) {
      toastError(e, 'Failed to update status', () => void toggle(p, isActive))
    } finally {
      clearOptimistic(p.id)
    }
  }

  const remove = async (p: PromotionModel) => {
    if (!salonId || deleting) return
    const ok = await confirm({
      title: 'Delete Promotion',
      message: `Are you sure you want to delete "${p.title}"?`,
      confirmText: 'Delete',
      destructive: true,
    })
    if (!ok) return
    setDeleting(p.id)
    try {
      await api.deletePromotion({ salonId, promotionId: p.id, imageUrl: p.imageUrl })
      toastSuccess('Promotion deleted.')
    } catch (e) {
      toastError(e, 'Could not delete the promotion')
    } finally {
      setDeleting(null)
    }
  }

  let body
  const loadErr = !salonId && salonError ? friendlyError(salonError, 'Failed to load salon data') : streamError && promotions == null ? friendlyError(streamError, 'Could not load promotions') : null
  if (loadErr) {
    body = (
      <ErrorState
        title={salonId ? "Couldn't load promotions" : 'Failed to load salon data'}
        message={loadErr.message}
        hint={loadErr.hint}
        offline={loadErr.code === 'network'}
        retrying={loadingSalon}
        onRetry={salonId ? () => setAttempt((a) => a + 1) : retry}
      />
    )
  } else if (loadingSalon || !salonId || promotions == null) {
    // Skeleton cards shaped like PromotionCard (banner + text + footer).
    body = (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading promotions">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-[20px] border border-line bg-card">
            <Skeleton className="h-[140px] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-2/3 rounded-lg" />
              <Skeleton className="h-3 w-full rounded-lg" />
              <Skeleton className="mt-3 h-8 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  } else if (promotions.length === 0) {
    body = (
      <EmptyState
        icon={Tag}
        title="No Promotions Yet"
        message="Create a promotion to boost your salon visibility!"
        actionLabel="Create Promotion"
        onAction={goCreate}
      />
    )
  } else {
    body = (
      <div className="grid gap-4 md:grid-cols-2">
        {promotions.map((p) => (
          <PromotionCard
            key={p.id}
            promotion={p.id in optimistic ? { ...p, isActive: optimistic[p.id] } : p}
            deleting={deleting === p.id}
            onToggleStatus={(v) => void toggle(p, v)}
            onDelete={() => void remove(p)}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <OwnerAppBar title="My Promotions" back parent={OwnerSalonRoutes.profile} />
      <Screen className="max-w-5xl px-4 pt-4 md:max-w-5xl">{body}</Screen>
      <button
        onClick={goCreate}
        disabled={!salonId}
        className="fixed bottom-24 right-5 z-30 flex items-center disabled:opacity-60 gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white shadow-lg1 hover:bg-primary-dark md:bottom-8 md:right-8"
      >
        <Plus size={20} /> New Promo
      </button>
    </>
  )
}
