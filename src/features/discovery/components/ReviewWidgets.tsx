// Ports of 3_reviews/presentation/widgets: review_card.dart, review_summary_card.dart,
// rating_stars_widget.dart (RatingDistributionChart) and the reply dialog from reviews_screen.dart.
import { BadgeCheck, Building2, Clock, Loader2, MoreHorizontal, Pencil, Reply, Star, ThumbsUp, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFeedback } from '@/components/feedback'
import { Avatar, Card, Pill, RatingStars, Sheet, Skeleton, Spinner } from '@/components/ui'
import { timeAgo } from '@/lib/format'
import { useT } from '@/lib/i18n'
import type { ReviewModel } from '@/lib/models'
import type { ReviewsData } from '../api'

export function ReviewSummaryCard({ averageRating, totalReviews, distribution }: Pick<ReviewsData, 'averageRating' | 'totalReviews' | 'distribution'>) {
  const t = useT()
  return (
    <Card radius={24} className="!p-[18px]">
      <div className="flex items-center gap-5">
        <div className="flex flex-col items-center">
          <span className="text-[40px] font-bold leading-[1.05] text-ink">{averageRating.toFixed(1)}</span>
          <span className="mt-1.5">
            <RatingStars value={averageRating} size={16} />
          </span>
          <span className="t-caption mt-1.5">{t('client.salon_details.ratings_count', [totalReviews])}</span>
        </div>
        <div className="min-w-0 flex-1">
          {totalReviews > 0 &&
            ([5, 4, 3, 2, 1] as const).map((star) => {
              const count = distribution[star] ?? 0
              const pct = totalReviews ? (count / totalReviews) * 100 : 0
              return (
                <div key={star} className="flex items-center py-[3px] text-[11px] font-semibold text-ink/65">
                  <span className="w-3">{star}</span>
                  <Star size={13} className="ml-1 text-[#FFB400]" fill="currentColor" strokeWidth={0} />
                  <span className="ml-2 h-[7px] flex-1 overflow-hidden rounded-full bg-ink/[0.08] dark:bg-ink/[0.14]">
                    <span className="block h-full rounded-full bg-[#FFB400]" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-[30px] text-right">{count}</span>
                </div>
              )
            })}
        </div>
      </div>
    </Card>
  )
}

export function ReviewCard({
  review,
  currentUserId,
  isOwner,
  onEdit,
  onDelete,
  onReply,
  onDeleteReply,
  onHelpful,
}: {
  review: ReviewModel
  currentUserId: string | null
  isOwner: boolean
  onEdit?: () => void
  onDelete?: () => Promise<boolean>
  onReply?: () => void
  onDeleteReply?: () => Promise<boolean>
  onHelpful?: () => Promise<boolean>
}) {
  const t = useT()
  const isAuthor = !!currentUserId && currentUserId === review.userId
  const isEdited = !!review.updatedAt && review.updatedAt > review.createdAt
  const hasReply = !!review.ownerReply
  const [voted, setVoted] = useState(false)
  const [busy, setBusy] = useState<'delete' | 'reply' | null>(null)
  const { confirm } = useFeedback()
  const runBusy = async (kind: 'delete' | 'reply', fn?: () => Promise<boolean>) => {
    if (!fn || busy) return
    const ok = await confirm(
      kind === 'delete'
        ? { title: 'Delete your review?', message: `Your ${review.rating}-star review will be permanently removed.`, confirmText: 'Delete review', destructive: true }
        : { title: 'Delete your reply?', message: `Your reply to ${review.userName}'s review will be removed.`, confirmText: 'Delete reply', destructive: true },
    )
    if (!ok) return
    setBusy(kind)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card radius={22} className={busy === 'delete' ? '!p-4 opacity-60' : '!p-4'}>
      <div className="flex items-center gap-3">
        <Avatar url={review.userProfilePicture} name={review.userName} size={40} />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="t-body truncate font-bold">{review.userName}</span>
          {review.isVerifiedBooking && <Pill label={t('client.salon_details.verified')} color="#22C55E" icon={BadgeCheck} className="shrink-0" />}
        </div>
        {isAuthor &&
          (busy === 'delete' ? (
            <span className="grid h-9 w-9 place-items-center" aria-label="Deleting review">
              <Spinner size={18} />
            </span>
          ) : (
            <AuthorMenu onEdit={onEdit} onDelete={onDelete ? () => void runBusy('delete', onDelete) : undefined} />
          ))}
      </div>
      <div className="mt-3 flex items-center gap-1">
        <RatingStars value={review.rating} size={17} />
        <span className="flex-1" />
        <Clock size={12} className="text-muted" />
        <span className="t-caption">{timeAgo(review.createdAt)}</span>
        {isEdited && <span className="t-caption ml-1.5 italic">({t('client.salon_details.edited')})</span>}
      </div>
      {review.comment && <p className="mt-2.5 whitespace-pre-line text-sm leading-[1.55] text-ink">{review.comment}</p>}
      {hasReply && (
        <div className="mt-3.5 rounded-2xl bg-primary/[0.07] p-3.5 dark:bg-primary/[0.16]">
          <div className="flex items-center gap-2 text-primary-dark dark:text-primary">
            <Building2 size={15} />
            <span className="flex-1 text-[12.5px] font-bold">{t('client.salon_details.owner_response')}</span>
            {isOwner && onDeleteReply && (
              <button
                onClick={() => void runBusy('reply', onDeleteReply)}
                disabled={busy === 'reply'}
                aria-label="Delete reply"
                className="-m-2.5 grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-60"
              >
                {busy === 'reply' ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
              </button>
            )}
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-[1.5] text-ink">{review.ownerReply}</p>
          {review.ownerRepliedAt && <p className="t-caption mt-1.5">{timeAgo(review.ownerRepliedAt)}</p>}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3">
        {isOwner && !hasReply && onReply && (
          <button onClick={onReply} className="flex h-10 items-center gap-1.5 text-[13px] font-bold text-primary-dark dark:text-primary">
            <Reply size={16} />
            {t('client.salon_details.reply')}
          </button>
        )}
        <span className="flex-1" />
        {onHelpful && !isAuthor && (
          <button
            onClick={async () => {
              if (voted) return
              setVoted(true) // optimistic; rolled back if the vote fails
              if (!(await onHelpful())) setVoted(false)
            }}
            aria-pressed={voted}
            disabled={voted}
            className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted transition hover:bg-inset hover:text-ink disabled:text-primary"
          >
            <ThumbsUp size={14} fill={voted ? 'currentColor' : 'none'} />
            Helpful{review.helpfulCount > 0 ? ` (${review.helpfulCount})` : ''}
          </button>
        )}
        {(!onHelpful || isAuthor) && review.helpfulCount > 0 && (
          <span className="t-caption flex items-center gap-1.5">
            <ThumbsUp size={13} /> {review.helpfulCount}
          </span>
        )}
      </div>
    </Card>
  )
}

function AuthorMenu({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Review options" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-inset">
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-lg1">
          <button
            onClick={() => {
              setOpen(false)
              onEdit?.()
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-inset"
          >
            <Pencil size={18} />
            {t('client.salon_details.edit_review')}
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onDelete?.()
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-inset"
          >
            <Trash2 size={18} />
            {t('client.salon_details.delete_review')}
          </button>
        </div>
      )}
    </div>
  )
}

export function ReplyDialog({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (text: string) => Promise<boolean> }) {
  const t = useT()
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  useEffect(() => {
    if (open) setText('')
  }, [open])
  const post = async () => {
    if (posting || !text.trim()) return
    setPosting(true)
    try {
      // Keep the dialog (and the typed reply) open if posting fails so the owner can retry.
      if (await onSubmit(text.trim())) onClose()
    } finally {
      setPosting(false)
    }
  }
  const close = () => !posting && onClose()
  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('client.salon_details.reply_title')}
      footer={
        <div className="flex gap-3">
          <button onClick={close} disabled={posting} className="h-12 flex-1 rounded-2xl border border-line font-semibold text-ink hover:bg-inset disabled:opacity-50">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => void post()}
            disabled={posting || !text.trim()}
            aria-busy={posting || undefined}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {posting && <Loader2 size={18} className="animate-spin" />}
            {posting ? 'Posting…' : t('client.salon_details.post_reply')}
          </button>
        </div>
      }
    >
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="field resize-none" placeholder={t('client.salon_details.reply_hint')} autoFocus />
    </Sheet>
  )
}

/** Placeholder shaped like the summary card + review cards while reviews load. */
export function ReviewsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading reviews">
      <Skeleton className="h-[132px] !rounded-[24px]" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="rounded-[22px] border border-line/60 bg-card p-4 dark:border-line">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 !rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="mt-3 h-4 w-24" />
            <Skeleton className="mt-2.5 h-3.5 w-full" />
            <Skeleton className="mt-1.5 h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
