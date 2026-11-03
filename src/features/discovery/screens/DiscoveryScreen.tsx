// Port of 2_client_discovery/presentation/screens/discovery_screen.dart
import { Building2, RefreshCw, Search, SlidersHorizontal, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { cx, EmptyState, ErrorState, Pill, Screen, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useT } from '@/lib/i18n'
import { ALL_CATEGORIES, type SalonModel } from '@/lib/models'
import FilterPanel from '../components/FilterPanel'
import SalonCard from '../components/SalonCard'
import { activeFilterCount, discovery, useDiscovery } from '../discoveryStore'

export default function DiscoveryScreen() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const state = useDiscovery()
  const [search, setSearch] = useState(state.status === 'loaded' ? state.searchQuery ?? '' : '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const lastRouteCategory = useRef<string | null | undefined>(undefined)

  // didChangeDependencies: apply the category passed by the route, else load once.
  const routeState = location.state as { categoryId?: string } | null
  const fromRoute = routeState?.categoryId || params.get('category') || null
  useEffect(() => {
    if (fromRoute !== lastRouteCategory.current) {
      lastRouteCategory.current = fromRoute
      if (fromRoute) {
        discovery.filterByCategory(fromRoute)
        return
      }
    }
    if (discovery.getState().status === 'initial') void discovery.load()
  }, [fromRoute, location.key])

  const onSearch = (q: string) => {
    setSearch(q)
    discovery.search(q)
  }
  const clearEverything = () => {
    onSearch('')
    discovery.applyFilters({ categoryId: null, minRating: null, sortType: 'popularity' })
  }
  const openSalon = (s: SalonModel) => navigate(Routes.salonDetail(s.id), { state: { salon: s } })

  const selectedId = state.status === 'loaded' ? state.filters.categoryId : null
  const active = state.status === 'loaded' ? activeFilterCount(state.filters) : 0

  return (
    <Screen className="max-w-6xl">
      {/* header */}
      <div className="px-5 pb-3.5 pt-[18px]">
        <div className="flex items-center gap-2">
          <h1 className="t-display flex-1">{t('client.discover.title')}</h1>
          <button
            onClick={async () => {
              if (refreshing) return
              setRefreshing(true)
              await discovery.refresh()
              setRefreshing(false)
            }}
            disabled={refreshing}
            title="Refresh"
            aria-label="Refresh"
            className="hidden h-9 w-9 place-items-center rounded-full text-muted hover:bg-inset hover:text-ink md:grid"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {state.status === 'loaded' && <Pill label={String(state.filteredSalons.length)} icon={Building2} />}
        </div>
        <div className="mt-3.5 flex gap-2.5">
          <div className="flex flex-1 items-center rounded-[18px] border border-line bg-card shadow-sm1 focus-within:border-primary">
            <Search size={20} className="ml-4 shrink-0 text-muted" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              type="search"
              enterKeyHint="search"
              placeholder={t('client.discover.search_hint')}
              className="h-[54px] min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button onClick={() => onSearch('')} aria-label="Clear search" className="mr-3 text-muted hover:text-ink">
                <XCircle size={18} fill="currentColor" stroke="rgb(var(--card))" />
              </button>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setFiltersOpen(true)}
              aria-label={t('client.discover.filter.title')}
              className="grid h-[54px] w-[54px] place-items-center rounded-[18px] bg-brand-gradient text-white shadow-cta"
            >
              <SlidersHorizontal size={22} />
            </button>
            {active > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-page bg-[#FF6B6B] text-[10px] font-bold text-white">
                {active}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* category chips */}
      <div className="no-scrollbar flex h-[46px] items-center gap-2 overflow-x-auto px-5">
        <CategoryChip label={t('client.discover.all')} selected={selectedId == null} onClick={() => discovery.filterByCategory(null)} />
        {ALL_CATEGORIES.map((c) => (
          <CategoryChip key={c.id} label={t(`categories.${c.name}`)} selected={selectedId === c.id} onClick={() => discovery.filterByCategory(c.id)} />
        ))}
      </div>
      <div className="h-2" />

      {/* results */}
      {state.status === 'loading' || state.status === 'initial' ? (
        <Grid busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[0.72] !rounded-[26px]" />
          ))}
        </Grid>
      ) : state.status === 'error' ? (
        <ErrorState
          title={state.refresh ? "Couldn't refresh salons" : "Couldn't load salons"}
          message={friendlyError(state.error).message}
          hint={friendlyError(state.error).hint}
          onRetry={() => void discovery.load()}
        />
      ) : state.filteredSalons.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('client.discover.no_results_title')}
          message={t('client.discover.no_results')}
          actionLabel={t('client.discover.clear_filters')}
          onAction={clearEverything}
        />
      ) : (
        <Grid>
          {state.filteredSalons.map((s, i) => (
            <SalonCard
              key={s.id}
              salon={s}
              onClick={() => openSalon(s)}
              className="aspect-[0.72] w-full animate-[fadeUp_.4s_ease-out_both]"
              style={{ animationDelay: `${(i % 8) * 50}ms` }}
            />
          ))}
        </Grid>
      )}
      <style>{'@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}'}</style>
      <FilterPanel open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </Screen>
  )
}

function Grid({ children, busy }: { children: React.ReactNode; busy?: boolean }) {
  return <div aria-busy={busy || undefined} className="grid grid-cols-[repeat(auto-fill,minmax(min(160px,45%),1fr))] gap-3.5 px-5 pt-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">{children}</div>
}

function CategoryChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'h-full shrink-0 whitespace-nowrap rounded-full px-[18px] text-[13px] transition-all duration-200',
        selected ? 'bg-brand-gradient font-bold text-white shadow-[0_5px_12px_-3px_rgba(108,92,231,0.3)]' : 'border border-line bg-card font-medium text-ink hover:bg-inset',
      )}
      style={{ height: 38 }}
    >
      {label}
    </button>
  )
}
