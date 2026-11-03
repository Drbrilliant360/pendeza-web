// Port of 3_reviews/presentation/screens/write_review_screen.dart
import { AlertCircle, Scissors, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { Card, IconTile, PageHeader, PrimaryButton, RatingStars, usePageTitle } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { updateReview } from '@/lib/firestore'
import type { ReviewModel, SalonModel } from '@/lib/models'
import { submitReview } from '../api'
import SalonGate from '../components/SalonGate'

export default function WriteReviewRoute() {
  return <SalonGate variant="wrapper">{(salon) => <WriteReviewScreen salon={salon} />}</SalonGate>
}

function WriteReviewScreen({ salon }: { salon: SalonModel }) {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const { status, user } = useAuth()
  const { toast, toastSuccess, toastError, confirm } = useFeedback()
  const existing = (location.state as { review?: ReviewModel } | null)?.review ?? null
  const isEdit = !!existing && existing.salonId === salon.id
  const [rating, setRating] = useState(isEdit ? existing.rating : 0)
  const [comment, setComment] = useState(isEdit ? existing.comment : '')
  const [submitting, setSubmitting] = useState(false)
  const [ratingError, setRatingError] = useState<string | null>(null)
  const ratingRef = useRef<HTMLDivElement>(null)
  usePageTitle(`${isEdit ? 'Edit review' : 'Write a review'} · ${salon.salonName}`)

  // Unsaved changes: warn on tab close / reload, and confirm on in-app Cancel.
  const dirty = !submitting && (isEdit ? rating !== existing.rating || comment !== existing.comment : rating > 0 || comment.trim().length > 0)
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
  const cancel = async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Discard your review?',
        message: `Your ${isEdit ? 'changes' : 'review'} for ${salon.salonName} won't be saved.`,
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        destructive: true,
      })
      if (!ok) return
    }
    back()
  }

  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(Routes.salonDetail(salon.id), { replace: true }))

  const ratingLabel =
    rating === 0 ? t('client.salon_details.rating_tap') : t(`client.salon_details.rating_${Math.min(5, Math.max(1, Math.ceil(rating)))}`)

  const submit = async () => {
    if (submitting) return
    if (rating === 0) {
      setRatingError(`${t('client.salon_details.select_rating')} Tap 1 to 5 stars above.`)
      ratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ratingRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
      return
    }
    if (status !== 'authenticated' || !user || user.isGuest) return toast(t('client.salon_details.sign_in_required'), 'error')
    setSubmitting(true)
    try {
      if (isEdit) {
        await updateReview({ salonId: salon.id, reviewId: existing.id, userId: user.uid, rating, comment: comment.trim() })
        toastSuccess('Review updated')
      } else {
        await submitReview({
          salonId: salon.id,
          userId: user.uid,
          userName: user.fullName,
          userProfilePicture: user.profilePictureUrl,
          rating,
          comment: comment.trim(),
        })
        toastSuccess('Review submitted. Thank you!')
      }
      back()
    } catch (e) {
      // e.g. "You have already reviewed this salon…" is passed through as the hint.
      toastError(e, isEdit ? 'Could not update your review' : 'Could not submit your review')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-2xl pb-8">
        <PageHeader title={t(isEdit ? 'client.salon_details.edit_review' : 'client.salon_details.write_review')} subtitle={salon.salonName} onBack={() => void cancel()} />
        <div className="space-y-4 px-5 pt-5">
          <Card radius={22} className="!p-3.5">
            <div className="flex items-center gap-3.5">
              <IconTile icon={Scissors} size={46} solid />
              <div className="min-w-0 flex-1">
                <p className="t-body truncate font-bold">{salon.salonName}</p>
                <p className="t-caption mt-0.5 truncate">{salon.address}</p>
              </div>
            </div>
          </Card>

          <Card radius={24} className={ratingError ? '!border-danger !px-[18px] !py-[22px]' : '!px-[18px] !py-[22px]'}>
            <p className="t-title text-center">
              {t('client.salon_details.rate_prompt')}
              <span className="ml-0.5 text-danger" aria-hidden>
                *
              </span>
            </p>
            <div ref={ratingRef} className="mt-4 flex justify-center" data-invalid={ratingError ? 'true' : undefined}>
              <RatingStars
                value={rating}
                size={44}
                onChange={(v) => {
                  setRating(v)
                  setRatingError(null)
                }}
              />
            </div>
            {ratingError && (
              <p role="alert" className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-danger">
                <AlertCircle size={14} /> {ratingError}
              </p>
            )}
            <p className={`mt-3 text-center text-sm font-bold ${rating === 0 ? 'text-muted' : 'text-primary-dark dark:text-primary'}`}>{ratingLabel}</p>
          </Card>

          <Card radius={24} className="!px-[18px] !pb-2.5 !pt-[18px]">
            <label className="t-body block font-bold" htmlFor="review-comment">
              {t('client.salon_details.comment_title')}
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={5}
              maxLength={500}
              placeholder={t('client.salon_details.comment_hint')}
              className="field mt-3 resize-none"
              style={{ textTransform: 'none' }}
              autoCapitalize="sentences"
            />
            <p className="t-caption mt-1 text-right">{comment.length}/500</p>
          </Card>

          <div className="pt-2.5">
            <PrimaryButton icon={Send} loading={submitting} onClick={submit}>
              {submitting ? (isEdit ? 'Updating…' : 'Submitting…') : t(isEdit ? 'client.salon_details.update_review' : 'client.salon_details.submit_review')}
            </PrimaryButton>
            <button onClick={() => void cancel()} disabled={submitting} className="mt-2 h-12 w-full rounded-2xl font-semibold text-muted hover:bg-inset disabled:opacity-50">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
