// Port of DiscoveryBloc (app-wide singleton shared by the dashboard and the discover tab).
import { useSyncExternalStore } from 'react'
import { getSalons } from '@/lib/firestore'
import type { SalonModel } from '@/lib/models'

export type SortType = 'popularity' | 'rating' | 'newest'
export const SORT_LABELS: Record<SortType, string> = { popularity: 'Popular', rating: 'Top Rated', newest: 'Newest' }

export interface DiscoveryFilters {
  categoryId: string | null
  maxDistanceKm: number | null
  minRating: number | null
  sortType: SortType
}
const DEFAULT_FILTERS: DiscoveryFilters = { categoryId: null, maxDistanceKm: null, minRating: null, sortType: 'popularity' }

export type DiscoveryState =
  | { status: 'initial' }
  | { status: 'loading' }
  | { status: 'error'; error: unknown; refresh?: boolean }
  | {
      status: 'loaded'
      allSalons: SalonModel[]
      filteredSalons: SalonModel[]
      filters: DiscoveryFilters
      searchQuery: string | null
    }

let state: DiscoveryState = { status: 'initial' }
let pendingCategoryId: string | null = null
const listeners = new Set<() => void>()
const emit = (s: DiscoveryState) => {
  state = s
  listeners.forEach((l) => l())
}

// ── filtering helpers (identical to the bloc) ────────────────────────────────
function sortSalons(salons: SalonModel[], sortType: SortType) {
  const sorted = [...salons]
  if (sortType === 'popularity') sorted.sort((a, b) => a.salonName.localeCompare(b.salonName))
  else if (sortType === 'rating') sorted.sort((a, b) => b.salonName.localeCompare(a.salonName))
  else sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return sorted
}
function applyAll(salons: SalonModel[], f: DiscoveryFilters, q: string | null) {
  let out = [...salons]
  if (q) {
    const lq = q.toLowerCase()
    out = out.filter(
      (s) =>
        s.salonName.toLowerCase().includes(lq) ||
        s.address.toLowerCase().includes(lq) ||
        s.serviceCategories.some((c) => c.toLowerCase().includes(lq)),
    )
  }
  if (f.categoryId) {
    const key = f.categoryId.toLowerCase()
    out = out.filter((s) => s.serviceCategories.some((c) => c.toLowerCase().includes(key)))
  }
  // distance + rating filters are mocks in the app (return all salons)
  return sortSalons(out, f.sortType)
}

export const activeFilterCount = (f: DiscoveryFilters) =>
  (f.categoryId != null ? 1 : 0) + (f.maxDistanceKm != null ? 1 : 0) + (f.minRating != null ? 1 : 0)

// ── events ───────────────────────────────────────────────────────────────────
export const discovery = {
  getState: () => state,

  async load() {
    emit({ status: 'loading' })
    try {
      const salons = await getSalons()
      const filters = pendingCategoryId ? { ...DEFAULT_FILTERS, categoryId: pendingCategoryId } : DEFAULT_FILTERS
      pendingCategoryId = null
      emit({ status: 'loaded', allSalons: salons, filteredSalons: applyAll(salons, filters, null), filters, searchQuery: null })
    } catch (e) {
      console.error('Failed to load salons', e)
      emit({ status: 'error', error: e })
    }
  },

  async refresh() {
    try {
      const salons = await getSalons()
      const cur = state
      if (cur.status === 'loaded') {
        emit({ ...cur, allSalons: salons, filteredSalons: applyAll(salons, cur.filters, cur.searchQuery) })
      } else {
        const filters = pendingCategoryId ? { ...DEFAULT_FILTERS, categoryId: pendingCategoryId } : DEFAULT_FILTERS
        pendingCategoryId = null
        emit({ status: 'loaded', allSalons: salons, filteredSalons: applyAll(salons, filters, null), filters, searchQuery: null })
      }
    } catch (e) {
      console.error('Failed to refresh salons', e)
      emit({ status: 'error', error: e, refresh: true })
    }
  },

  search(q: string) {
    const cur = state
    if (cur.status !== 'loaded') return
    emit({ ...cur, searchQuery: q, filteredSalons: applyAll(cur.allSalons, cur.filters, q) })
  },

  filterByCategory(categoryId: string | null) {
    const cur = state
    if (cur.status !== 'loaded') {
      pendingCategoryId = categoryId
      if (cur.status === 'initial' || cur.status === 'error') void discovery.load()
      return
    }
    const filters = { ...cur.filters, categoryId }
    emit({ ...cur, filters, filteredSalons: applyAll(cur.allSalons, filters, cur.searchQuery) })
  },

  applyFilters(p: { categoryId: string | null; minRating: number | null; sortType: SortType; maxDistanceKm?: number | null }) {
    const cur = state
    if (cur.status !== 'loaded') return
    const filters: DiscoveryFilters = {
      categoryId: p.categoryId,
      minRating: p.minRating,
      sortType: p.sortType,
      maxDistanceKm: p.maxDistanceKm ?? null,
    }
    emit({ ...cur, filters, filteredSalons: applyAll(cur.allSalons, filters, cur.searchQuery) })
  },

  reset() {
    const cur = state
    if (cur.status !== 'loaded') return
    emit({ ...cur, filters: DEFAULT_FILTERS, searchQuery: null, filteredSalons: sortSalons(cur.allSalons, 'popularity') })
  },
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function useDiscovery() {
  return useSyncExternalStore(subscribe, () => state)
}
