// Port of 3_reviews/presentation/screens/reviews_screen.dart
import { Pencil, RefreshCw, Star } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { cx, EmptyState, ErrorState, GlassCircleButton, PageHeader, usePageTitle } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useT } from '@/lib/i18n'
import type { ReviewSort } from '@/lib/firestore'
import type { ReviewModel, SalonModel } from '@/lib/models'
import { ReplyDialog, ReviewCard, ReviewsSkeleton, ReviewSummaryCard } from '../components/ReviewWidgets'
import SalonGate from '../components/SalonGate'
import { ReviewsProvider, useReviews } from '../useReviews'

export default function ReviewsRoute() {
  return (
    <SalonGate variant="wrapper">
      {(salon) => (
        <ReviewsProvider salonId={salon.id}>
          <ReviewsScreen salon={salon} />
        </ReviewsProvider>
      )}
    </SalonGate>
  )
}

function ReviewsScreen({ salon }: { salon: SalonModel }) {
  const t = useT()
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const { toast } = useFeedback()
  const reviews = useReviews()
  const { state } = reviews
  const [replyTo, setReplyTo] = useState<ReviewModel | null>(null)
  const authed = status === 'authenticated' && !!user && !user.isGuest
  const currentUserId = authed ? user.uid : null
  const isOwner = authed && user.uid === salon.ownerId
  usePageTitle(`Reviews · ${salon.salonName}`)
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(Routes.salonDetail(salon.id), { replace: true }))

  const writeReview = () => {
    if (!authed) return toast(t('client.salon_details.sign_in_to_review'), 'info')
    navigate(Routes.writeReview(salon.id), { state: { salon } })
  }

  const sorts: { value: ReviewSort; label: string }[] = [
    { value: 'recent', label: t('client.salon_details.sort_recent') },
    { value: 'highest', label: t('client.salon_details.sort_highest') },
    { value: 'lowest', label: t('client.salon_details.sort_lowest') },
  ]

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-3xl pb-28">
        <PageHeader
          title={t('client.salon_details.tab_reviews')}
          subtitle={salon.salonName}
          onBack={back}
          actions={
            <span className={reviews.refreshing ? 'pointer-events-none [&_svg]:animate-spin' : undefined} aria-busy={reviews.refreshing || undefined}>
              <GlassCircleButton icon={RefreshCw} size={42} label="Refresh" onClick={() => void reviews.refresh()} />
            </span>
          }
        />
        {state.status === 'loading' ? (
          <div className="px-5 pt-[18px]">
            <ReviewsSkeleton />
          </div>
        ) : state.status === 'error' ? (
          <ErrorState
            className="pt-16"
            title="Couldn't load reviews"
            message={friendlyError(state.error).message}
            hint={friendlyError(state.error).hint}
            onRetry={() => void reviews.reload()}
          />
        ) : state.status === 'empty' ? (
          <EmptyState className="pt-16" icon={Star} color="#F5A623" title={t('client.salon_details.no_reviews_title')} message={t('client.salon_details.no_reviews_msg')} />
        ) : state.status === 'loaded' ? (
          <div className="px-5 pt-[18px]">
            <ReviewSummaryCard averageRating={state.averageRating} totalReviews={state.totalReviews} distribution={state.distribution} />
            <div className="mt-4 flex flex-wrap gap-2">
              {sorts.map((s) => {
                const on = state.sortBy === s.value
                return (
                  <button
                    key={s.value}
                    onClick={() => void reviews.sort(s.value)}
                    disabled={!!reviews.sorting}
                    aria-pressed={on}
                    aria-busy={reviews.sorting === s.value || undefined}
                    className={cx(
                      'rounded-full px-4 py-[9px] text-[12.5px] transition',
                      reviews.sorting === s.value && 'animate-pulse',
                      on ? 'bg-brand-gradient font-bold text-white' : 'border border-line bg-card font-semibold text-ink hover:bg-inset',
                    )}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
            <div className={cx('mt-3.5 space-y-3 transition-opacity', reviews.sorting && 'opacity-60')}>
              {state.reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  onEdit={() => navigate(Routes.writeReview(salon.id), { state: { salon, review: r } })}
                  onDelete={() => reviews.deleteReview(r)}
                  onReply={() => setReplyTo(r)}
                  onDeleteReply={() => reviews.deleteOwnerReply(r)}
                  onHelpful={authed ? () => reviews.markHelpful(r) : undefined}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* FloatingActionButton.extended */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto flex max-w-3xl justify-end p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            onClick={writeReview}
            className="pointer-events-auto flex h-14 items-center gap-2 rounded-[20px] bg-primary px-5 font-bold text-white shadow-lg1 hover:bg-primary-dark"
          >
            <Pencil size={20} />
            {t('client.salon_details.write_review')}
          </button>
        </div>
      </div>

      <ReplyDialog
        open={!!replyTo}
        onClose={() => setReplyTo(null)}
        onSubmit={async (text) => (replyTo && currentUserId ? reviews.addOwnerReply(replyTo, currentUserId, text) : false)}
      />
    </div>
  )
}
