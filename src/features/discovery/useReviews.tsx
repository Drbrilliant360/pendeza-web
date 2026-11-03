// Port of ReviewsBloc (load / refresh / sort / delete / owner reply / helpful).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFeedback } from '@/components/feedback'
import * as fs from '@/lib/firestore'
import type { ReviewModel } from '@/lib/models'
import { loadReviews, type ReviewsData } from './api'

export type ReviewsState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: unknown }
  | ({ status: 'loaded'; sortBy: fs.ReviewSort } & ReviewsData)

/** Mutations resolve to `true` on success so callers can close dialogs / roll back optimistic UI. */
export interface ReviewsApi {
  state: ReviewsState
  refreshing: boolean
  sorting: fs.ReviewSort | null
  reload: () => Promise<void>
  refresh: () => Promise<void>
  sort: (s: fs.ReviewSort) => Promise<void>
  deleteReview: (r: ReviewModel) => Promise<boolean>
  addOwnerReply: (r: ReviewModel, ownerId: string, text: string) => Promise<boolean>
  deleteOwnerReply: (r: ReviewModel) => Promise<boolean>
  markHelpful: (r: ReviewModel) => Promise<boolean>
}

export function useReviewsBloc(salonId: string): ReviewsApi {
  const [state, setState] = useState<ReviewsState>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [sorting, setSorting] = useState<fs.ReviewSort | null>(null)
  const { toastSuccess, toastError } = useFeedback()
  const stateRef = useRef(state)
  stateRef.current = state

  const fetchInto = useCallback(
    async (sortBy: fs.ReviewSort, showLoading: boolean) => {
      if (showLoading) setState({ status: 'loading' })
      try {
        const data = await loadReviews(salonId, sortBy)
        setState(data.reviews.length ? { status: 'loaded', sortBy, ...data } : { status: 'empty' })
      } catch (e) {
        console.error('Error loading reviews', e)
        // A failed background refresh keeps the reviews already on screen and just explains why.
        if (!showLoading && stateRef.current.status === 'loaded') toastError(e, 'Could not refresh reviews')
        else setState({ status: 'error', error: e })
      }
    },
    [salonId, toastError],
  )

  useEffect(() => {
    void fetchInto('recent', true)
  }, [fetchInto])

  const currentSort = () => (stateRef.current.status === 'loaded' ? stateRef.current.sortBy : 'recent')

  const reload = useCallback(() => fetchInto(currentSort(), true), [fetchInto])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchInto(currentSort(), false)
    } finally {
      setRefreshing(false)
    }
  }, [fetchInto])

  const sort = useCallback(
    async (sortBy: fs.ReviewSort) => {
      const cur = stateRef.current
      if (cur.status !== 'loaded') return
      setSorting(sortBy)
      try {
        const reviews = await fs.getReviewsForSalon(salonId, sortBy)
        const latest = stateRef.current
        if (latest.status === 'loaded') setState({ ...latest, reviews, sortBy })
      } catch (e) {
        toastError(e, 'Could not sort reviews', () => void sort(sortBy))
      } finally {
        setSorting(null)
      }
    },
    [salonId, toastError],
  )

  const deleteReview = useCallback(
    async (r: ReviewModel) => {
      try {
        await fs.deleteReview({ salonId, reviewId: r.id, userId: r.userId })
        toastSuccess('Review deleted')
        await fetchInto('recent', true)
        return true
      } catch (e) {
        toastError(e, 'Could not delete review')
        return false
      }
    },
    [salonId, toastSuccess, toastError, fetchInto],
  )

  const addOwnerReply = useCallback(
    async (r: ReviewModel, ownerId: string, text: string) => {
      try {
        const salon = await fs.getSalonById(salonId)
        if (!salon || salon.ownerId !== ownerId) throw new Error('Only the salon owner can reply to reviews')
        await fs.addOwnerReplyToReview({ salonId, reviewId: r.id, ownerId, replyText: text })
        toastSuccess('Reply posted')
        await fetchInto('recent', true)
        return true
      } catch (e) {
        toastError(e, 'Could not post reply')
        return false
      }
    },
    [salonId, toastSuccess, toastError, fetchInto],
  )

  const deleteOwnerReply = useCallback(
    async (r: ReviewModel) => {
      try {
        await fs.deleteOwnerReply({ salonId, reviewId: r.id })
        toastSuccess('Reply deleted')
        await fetchInto('recent', true)
        return true
      } catch (e) {
        toastError(e, 'Could not delete reply')
        return false
      }
    },
    [salonId, toastSuccess, toastError, fetchInto],
  )

  const markHelpful = useCallback(
    async (r: ReviewModel) => {
      const bump = (d: number) => {
        const cur = stateRef.current
        if (cur.status === 'loaded') {
          setState({ ...cur, reviews: cur.reviews.map((x) => (x.id === r.id ? { ...x, helpfulCount: Math.max(0, x.helpfulCount + d) } : x)) })
        }
      }
      bump(1) // optimistic
      try {
        await fs.incrementReviewHelpfulCount({ salonId, reviewId: r.id })
        return true
      } catch (e) {
        bump(-1) // roll back
        toastError(e, 'Could not record your vote')
        return false
      }
    },
    [salonId, toastError],
  )

  return { state, refreshing, sorting, reload, refresh, sort, deleteReview, addOwnerReply, deleteOwnerReply, markHelpful }
}

const Ctx = createContext<ReviewsApi | null>(null)
export function ReviewsProvider({ salonId, children }: { salonId: string; children: ReactNode }) {
  const api = useReviewsBloc(salonId)
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
export function useReviews() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useReviews outside ReviewsProvider')
  return c
}
