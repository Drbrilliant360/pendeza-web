// Port of 3_reviews/presentation/widgets/reviews_section.dart (salon detail "Reviews" tab)
import { Pencil, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { EmptyState, ErrorState } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useT } from '@/lib/i18n'
import type { SalonModel } from '@/lib/models'
import { useReviews } from '../useReviews'
import { ReviewCard, ReviewsSkeleton, ReviewSummaryCard } from './ReviewWidgets'

export default function ReviewsSection({ salon }: { salon: SalonModel }) {
  const t = useT()
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const { toast } = useFeedback()
  const reviews = useReviews()
  const { state } = reviews
  const authed = status === 'authenticated' && !!user && !user.isGuest
  const currentUserId = authed ? user.uid : null
  const isOwner = authed && user.uid === salon.ownerId

  const writeReview = () => {
    if (!authed) return toast(t('client.salon_details.sign_in_to_review'), 'info')
    navigate(Routes.writeReview(salon.id), { state: { salon } })
  }

  if (state.status === 'loading') {
    return (
      <div className="px-5 pt-1">
        <ReviewsSkeleton count={2} />
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <ErrorState
        className="!py-8"
        title="Couldn't load reviews"
        message={friendlyError(state.error).message}
        hint={friendlyError(state.error).hint}
        onRetry={() => void reviews.reload()}
      />
    )
  }
  if (state.status === 'empty') {
    return (
      <EmptyState
        className="pt-6"
        icon={Star}
        color="#F5A623"
        title={t('client.salon_details.no_reviews_title')}
        message={t('client.salon_details.no_reviews_msg')}
        actionLabel={t('client.salon_details.write_review')}
        onAction={writeReview}
      />
    )
  }
  if (state.status !== 'loaded') return null

  return (
    <div className="px-5">
      <div className="flex items-center">
        <h2 className="t-title flex-1">{t('client.salon_details.tab_reviews')}</h2>
        <button
          onClick={writeReview}
          className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-[9px] text-[12.5px] font-bold text-primary-dark hover:bg-primary/15 dark:bg-primary/20 dark:text-primary"
        >
          <Pencil size={15} />
          {t('client.salon_details.write_review')}
        </button>
      </div>
      <div className="mt-3.5">
        <ReviewSummaryCard averageRating={state.averageRating} totalReviews={state.totalReviews} distribution={state.distribution} />
      </div>
      <div className="mt-4 space-y-3">
        {state.reviews.slice(0, 3).map((r) => (
          <ReviewCard
            key={r.id}
            review={r}
            currentUserId={currentUserId}
            isOwner={isOwner}
            onEdit={() => navigate(Routes.writeReview(salon.id), { state: { salon, review: r } })}
            onDelete={() => reviews.deleteReview(r)}
            onReply={() => toast(t('client.salon_details.reply_soon'), 'info')}
            onHelpful={authed ? () => reviews.markHelpful(r) : undefined}
          />
        ))}
      </div>
      {state.totalReviews > 3 && (
        <button
          onClick={() => navigate(Routes.salonReviews(salon.id), { state: { salon } })}
          className="mt-3 h-[50px] w-full rounded-2xl border border-line text-sm font-bold text-primary-dark hover:bg-inset dark:text-primary"
        >
          {t('client.salon_details.see_all_n', [state.totalReviews])}
        </button>
      )}
    </div>
  )
}
