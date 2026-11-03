// Port of clients/presentation/screens/client_management_screen.dart (+ ClientManagementBloc, ClientSearchBar)
import { AlertTriangle, Loader2, RefreshCw, Search, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFeedback } from '@/components/feedback'
import { Avatar, ErrorState, Skeleton, cx } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useT } from '@/lib/i18n'
import type { AppointmentModel } from '@/lib/models'
import { getRecentBookings, getRegularClients, lastVisitFormatted, searchClients, type RegularClient } from '../api'
import { HeaderIconButton, OwnerTabHeader, useOwnerSalon } from '../components/OwnerChrome'
import ClientQuickViewSheet from './components/ClientQuickViewSheet'
import RecentBookingsSection from './components/RecentBookingsSection'
import RegularClientsSection from './components/RegularClientsSection'

interface Loaded {
  /** null = this section failed to load (shown with an inline Retry). */
  regularClients: RegularClient[] | null
  recentBookings: AppointmentModel[] | null
  searchResults: RegularClient[] | null
}

export default function ClientManagementScreen() {
  const t = useT()
  const { toastError } = useFeedback()
  const salonRes = useOwnerSalon()
  const salonId = salonRes.data?.id

  const [data, setData] = useState<Loaded | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<unknown>(null)
  const [selected, setSelected] = useState<RegularClient | null>(null)
  const latestQuery = useRef('')

  const loadData = async (id: string, showLoading: boolean) => {
    if (showLoading) setLoading(true)
    else setRefreshing(true)
    try {
      const [regular, recent] = await Promise.allSettled([getRegularClients(id), getRecentBookings(id)])
      if (regular.status === 'rejected' && recent.status === 'rejected') {
        console.error('Failed to load clients', regular.reason, recent.reason)
        if (showLoading || !data) setError(regular.reason)
        else toastError(regular.reason, 'Could not refresh clients', () => void loadData(id, false))
        return
      }
      if (regular.status === 'rejected') console.error('Failed to load regular clients', regular.reason)
      if (recent.status === 'rejected') console.error('Failed to load recent bookings', recent.reason)
      setData((d) => ({
        regularClients: regular.status === 'fulfilled' ? regular.value : null,
        recentBookings: recent.status === 'fulfilled' ? recent.value : null,
        searchResults: d?.searchResults ?? null,
      }))
      setError(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (salonId) void loadData(salonId, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId])

  useEffect(() => {
    if (salonRes.error) {
      setError(salonRes.error)
      setLoading(false)
    }
  }, [salonRes.error])

  const runSearch = async (value: string) => {
    if (!salonId) return
    setSearching(true)
    setSearchError(null)
    try {
      const results = await searchClients(salonId, value)
      if (latestQuery.current === value) setData((d) => (d ? { ...d, searchResults: results } : d))
    } catch (e) {
      console.error('Error searching clients', e)
      if (latestQuery.current === value) setSearchError(e)
    } finally {
      if (latestQuery.current === value) setSearching(false)
    }
  }

  // ClientSearchBar: 300ms debounce → SearchClients(query)
  const onSearchChanged = (value: string) => {
    setQuery(value)
    latestQuery.current = value
    setSearchError(null)
    setSearching(!!value.trim())
    window.setTimeout(async () => {
      if (latestQuery.current !== value || !salonId) return
      if (!value.trim()) {
        setSearching(false)
        setData((d) => (d ? { ...d, searchResults: null } : d))
        return
      }
      await runSearch(value)
    }, 300)
  }
  const clearSearch = () => {
    setQuery('')
    latestQuery.current = ''
    setSearching(false)
    setSearchError(null)
    setData((d) => (d ? { ...d, searchResults: null } : d))
  }

  const retry = () => {
    setError(null)
    if (salonId) void loadData(salonId, true)
    else {
      setLoading(true)
      void salonRes.reload()
    }
  }

  let body
  if (loading || (!data && !error)) {
    body = <ClientsSkeleton />
  } else if (error || !data) {
    const f = friendlyError(error)
    body = <ErrorState className="min-h-[60vh] items-center" title="Couldn't load clients" message={f.message} hint={f.hint} onRetry={retry} />
  } else {
    const active = query.length > 0
    body = (
      <>
        <div
          className={cx(
            'm-5 flex items-center gap-2 rounded-2xl bg-inset px-4',
            active ? 'border-2 border-primary' : 'border-2 border-transparent',
          )}
        >
          <Search size={20} className={active ? 'text-primary' : 'text-ink/50'} />
          <input
            value={query}
            onChange={(e) => onSearchChanged(e.target.value)}
            placeholder={t('owner.clients.search_hint')}
            aria-busy={searching || undefined}
            className="min-w-0 flex-1 bg-transparent py-4 text-sm text-ink outline-none placeholder:text-ink/50"
          />
          {searching && <Loader2 size={18} className="shrink-0 animate-spin text-primary" aria-label="Searching" />}
          {active && (
            <button aria-label="Clear" onClick={clearSearch}>
              <XCircle size={20} className="text-ink/30" fill="currentColor" stroke="white" />
            </button>
          )}
        </div>

        {active && searchError ? (
          <ErrorState
            title="Search failed"
            message={friendlyError(searchError).message}
            hint={friendlyError(searchError).hint}
            onRetry={() => void runSearch(query)}
            retrying={searching}
          />
        ) : active && searching && !data.searchResults ? (
          <div className="grid gap-4 px-5 lg:grid-cols-2" aria-busy="true" aria-label="Searching clients">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[80px]" />
            ))}
          </div>
        ) : data.searchResults ? (
          data.searchResults.length === 0 ? (
            <div className={cx('flex flex-col items-center py-16 text-center transition-opacity', searching && 'opacity-50')}>
              <Search size={48} className="text-ink/30" />
              <p className="mt-4 text-base font-semibold text-ink">{t('owner.clients.no_results_title')}</p>
              <p className="mt-2 text-xs text-muted">{t('owner.clients.no_results_hint')}</p>
            </div>
          ) : (
            <div className={cx('grid gap-4 px-5 transition-opacity lg:grid-cols-2', searching && 'opacity-50')}>
              {data.searchResults.map((c) => (
                <SearchResultItem key={c.id} client={c} onClick={() => setSelected(c)} />
              ))}
            </div>
          )
        ) : (
          <>
            {data.regularClients == null ? (
              <SectionError message="Couldn't load your regular clients." onRetry={() => salonId && void loadData(salonId, false)} busy={refreshing} />
            ) : (
              data.regularClients.length > 0 && <RegularClientsSection clients={data.regularClients} onSelect={setSelected} />
            )}
            <div className="h-5" />
            {data.recentBookings == null ? (
              <SectionError message="Couldn't load recent bookings." onRetry={() => salonId && void loadData(salonId, false)} busy={refreshing} />
            ) : (
              <RecentBookingsSection bookings={data.recentBookings} />
            )}
          </>
        )}
      </>
    )
  }

  return (
    <div className="pb-28 md:pb-12">
      <OwnerTabHeader
        title={t('owner.clients.title')}
        actions={
          data && salonId ? (
            <HeaderIconButton icon={RefreshCw} variant="plain" label="Refresh" spin={refreshing} onClick={() => void loadData(salonId, false)} />
          ) : undefined
        }
      />
      <div className="mx-auto w-full max-w-5xl">{body}</div>
      <ClientQuickViewSheet client={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function SectionError({ message, onRetry, busy }: { message: string; onRetry: () => void; busy?: boolean }) {
  return (
    <div role="alert" className="mx-5 flex items-center gap-3 rounded-2xl border border-line bg-inset px-4 py-3">
      <AlertTriangle size={18} className="shrink-0 text-danger/70" />
      <span className="flex-1 text-sm text-ink/80">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
      >
        <RefreshCw size={14} className={busy ? 'animate-spin' : undefined} /> Retry
      </button>
    </div>
  )
}

/** Placeholder shaped like the search bar, regulars row and recent bookings list. */
function ClientsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading clients">
      <Skeleton className="m-5 h-[56px]" />
      <Skeleton className="mx-5 h-6 w-40" />
      <div className="mt-4 flex gap-3 overflow-hidden px-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex w-[75px] shrink-0 flex-col items-center gap-1.5">
            <Skeleton className="h-[62px] w-[62px] !rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <Skeleton className="mx-5 mt-8 h-6 w-44" />
      <div className="mt-4 grid gap-4 px-5 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[92px]" />
        ))}
      </div>
    </div>
  )
}

function SearchResultItem({ client, onClick }: { client: RegularClient; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl border border-line/60 bg-card p-4 text-left transition hover:border-primary/40 dark:border-line">
      <Avatar url={client.photoUrl} name={client.name} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{client.name}</p>
        {client.phone != null && <p className="mt-1 text-xs text-muted">{client.phone}</p>}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[11px] font-semibold text-primary dark:text-primary-light">{client.visitCount} visits</span>
        <span className="mt-0.5 text-[11px] text-muted">{lastVisitFormatted(client)}</span>
      </div>
    </button>
  )
}
