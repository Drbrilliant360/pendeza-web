// Port of services/presentation/screens/service_list_screen.dart (+ ServicesBloc fetch / toggle)
import { ArrowDownWideNarrow, Check, Plus, Search, SearchX, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { cx, EmptyState, ErrorState, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { getServicesForSalon } from '@/lib/firestore'
import { useT } from '@/lib/i18n'
import type { ServiceModel } from '@/lib/models'
import { updateService } from '../api'
import { Fab, HeaderIconButton, OwnerKeyframes, OwnerTabHeader, fadeUp, useOwnerSalon } from '../components/OwnerChrome'
import ServiceListItem from './components/ServiceListItem'

type SortBy = 'name' | 'price' | 'price_desc' | 'popular' | 'duration'

export default function ServiceListScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { toastSuccess, toastError } = useFeedback()
  const salonRes = useOwnerSalon()
  const salonId = salonRes.data?.id

  const [services, setServices] = useState<ServiceModel[] | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [retrying, setRetrying] = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [showInactiveOnly, setShowInactiveOnly] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const fetchServices = async (id: string) => {
    try {
      const list = await getServicesForSalon(id)
      setServices(list)
      setError(null)
    } catch (e) {
      console.error('Error loading services', e)
      setError(e)
    }
  }
  const retryLoad = async () => {
    setRetrying(true)
    try {
      if (salonId) await fetchServices(salonId)
      else await salonRes.reload()
    } finally {
      setRetrying(false)
    }
  }

  useEffect(() => {
    if (salonId) void fetchServices(salonId)
  }, [salonId])

  const setActiveLocal = (id: string, isActive: boolean) =>
    setServices((list) => list && list.map((s) => (s.id === id ? { ...s, isActive } : s)))

  const toggleActive = async (service: ServiceModel) => {
    if (!services || toggling.has(service.id)) return
    const newStatus = !service.isActive
    setToggling((p) => new Set(p).add(service.id))
    setActiveLocal(service.id, newStatus) // optimistic
    try {
      await updateService({ ...service, isActive: newStatus })
      toastSuccess(newStatus ? 'Service activated' : 'Service paused')
    } catch (e) {
      setActiveLocal(service.id, service.isActive) // roll back
      toastError(e, newStatus ? 'Could not activate service' : 'Could not pause service')
    } finally {
      setToggling((p) => {
        const n = new Set(p)
        n.delete(service.id)
        return n
      })
    }
  }

  const filtered = useMemo(() => {
    if (!services) return []
    let list = [...services]
    const q = search.toLowerCase()
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }
    if (selectedCategory != null) list = list.filter((s) => s.category === selectedCategory)
    if (showInactiveOnly) list = list.filter((s) => !s.isActive)
    switch (sortBy) {
      case 'price':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'popular':
        list.sort((a, b) => b.bookingsCount - a.bookingsCount)
        break
      case 'duration':
        list.sort((a, b) => a.durationMinutes - b.durationMinutes)
        break
      default:
        list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    }
    return list
  }, [services, search, selectedCategory, showInactiveOnly, sortBy])

  const categories = useMemo(() => [...new Set((services ?? []).map((s) => s.category))], [services])

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'name', label: t('owner.services.sort_name') },
    { value: 'price', label: t('owner.services.sort_price_asc') },
    { value: 'price_desc', label: t('owner.services.sort_price_desc') },
    { value: 'popular', label: t('owner.services.sort_popular') },
    { value: 'duration', label: t('common.duration') },
  ]

  const openService = (s?: ServiceModel) =>
    s
      ? navigate(`${Routes.ownerAddEditService}?id=${encodeURIComponent(s.id)}`, { state: { service: s } })
      : navigate(Routes.ownerAddEditService)

  const loadError = salonRes.error ?? error
  let body
  if (loadError && !services) {
    const f = friendlyError(loadError)
    body = <ErrorState title="Couldn't load services" message={f.message} hint={f.hint} onRetry={() => void retryLoad()} retrying={retrying || salonRes.loading} />
  } else if (!services) {
    body = (
      <div className="space-y-4 p-5" aria-busy="true" aria-label="Loading services">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[90px] w-full" />
        ))}
      </div>
    )
  } else {
    const activeCount = services.filter((s) => s.isActive).length
    const inactiveCount = services.length - activeCount
    body = (
      <>
        {/* Stats bar */}
        <div className="flex items-center gap-2 bg-inset/60 px-5 py-2">
          <StatPill text={t('owner.services.active_count', [activeCount])} color="#00B894" selected={!showInactiveOnly} onClick={() => setShowInactiveOnly(false)} />
          <StatPill text={t('owner.services.inactive_count', [inactiveCount])} color="#E0A800" selected={showInactiveOnly} onClick={() => setShowInactiveOnly(true)} />
          <span className="ml-auto text-xs text-muted">{t('owner.services.shown_count', [filtered.length])}</span>
        </div>

        {/* Search & filter */}
        <div className="p-4">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="field rounded-xl pl-10 pr-10"
              placeholder={t('owner.services.search_hint')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="Clear" onClick={() => setSearch('')} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-inset">
                <X size={18} />
              </button>
            )}
          </div>
          {categories.length > 1 && (
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
              <FilterChip label={t('owner.services.all')} selected={selectedCategory == null} onClick={() => setSelectedCategory(null)} />
              {categories.map((c) => (
                <FilterChip key={c} label={c} selected={selectedCategory === c} onClick={() => setSelectedCategory(c)} />
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="Nothing Found" message={search ? t('owner.services.no_match') : t('owner.services.empty_msg')} />
        ) : (
          <div className="grid gap-4 px-5 lg:grid-cols-2">
            {filtered.map((s, i) => (
              <div key={s.id} style={fadeUp(i, 200, 50)}>
                <ServiceListItem service={s} onOpen={() => openService(s)} onToggleActive={() => void toggleActive(s)} toggling={toggling.has(s.id)} />
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="pb-32 md:pb-24">
      <OwnerKeyframes />
      <OwnerTabHeader
        title={t('owner.services.title')}
        actions={<SortMenu open={sortOpen} setOpen={setSortOpen} options={sortOptions} value={sortBy} onChange={setSortBy} label={t('owner.services.sort')} />}
      />
      <div className="mx-auto w-full max-w-5xl">{body}</div>
      <Fab icon={Plus} label={t('owner.services.add_action')} onClick={() => openService()} />
    </div>
  )
}

function SortMenu({
  open,
  setOpen,
  options,
  value,
  onChange,
  label,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  options: { value: SortBy; label: string }[]
  value: SortBy
  onChange: (v: SortBy) => void
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, setOpen])
  return (
    <div className="relative" ref={ref}>
      <HeaderIconButton icon={ArrowDownWideNarrow} variant="plain" label={label} onClick={() => setOpen(!open)} />
      {open && (
        <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-2xl border border-line bg-card py-1 shadow-lg1">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ink hover:bg-inset"
            >
              <span className="w-[18px]">{value === o.value && <Check size={18} />}</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatPill({ text, color, selected, onClick }: { text: string; color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('rounded-full border px-3 py-1.5 text-xs', selected ? 'font-semibold' : 'border-line text-muted')}
      style={selected ? { color, borderColor: color, background: `color-mix(in srgb, ${color} 20%, transparent)` } : undefined}
    >
      {text}
    </button>
  )
}

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'h-9 shrink-0 whitespace-nowrap rounded-lg px-3 text-xs transition',
        selected ? 'bg-primary text-white' : 'bg-inset text-ink hover:bg-ink/10',
      )}
    >
      {label}
    </button>
  )
}
