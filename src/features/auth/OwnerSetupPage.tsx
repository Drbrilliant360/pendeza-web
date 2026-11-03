// Port of features/1_onboarding/presentation/screens/business_type_selection_screen.dart
// → owner_business_details_screen.dart. Both steps live under /owner-setup; step 2 is a
// history entry (navigation state) so the browser back button returns to step 1.
import {
  Building,
  CheckCircle2,
  ChevronLeft,
  CircleMinus,
  Ellipsis,
  Flower2,
  Heart,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Scissors,
  Smile,
  Sparkles,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { cx, ErrorState, PrimaryButton, Skeleton, Steps } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { focusFirstInvalid } from '@/lib/validation'
import { useT } from '@/lib/i18n'
import { loadBusinessTypes, loadRegions, type BusinessType, type Region } from './api'
import { canGoBack, FieldError, TextAreaInput, TextInput } from './chrome'
import { AppValidators } from './validators'

interface DetailsState {
  step: 'details'
  businessTypeIds: string[]
  businessTypeNames: string[]
  suggestedCategories: string[]
}

export default function OwnerSetupPage() {
  const { state } = useLocation() as { state?: Partial<DetailsState> | null }
  const navigate = useNavigate()
  const t = useT()

  const [types, setTypes] = useState<BusinessType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [typesError, setTypesError] = useState<unknown>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedNames, setSelectedNames] = useState<string[]>([])

  const [loadSeq, setLoadSeq] = useState(0)
  const reloadTypes = useCallback(() => setLoadSeq((n) => n + 1), [])
  useEffect(() => {
    let alive = true
    setLoadingTypes(true)
    setTypesError(null)
    loadBusinessTypes()
      .then((d) => alive && setTypes(d))
      .catch((e: unknown) => {
        console.error('Error loading business types', e)
        if (alive) setTypesError(e)
      })
      .finally(() => alive && setLoadingTypes(false))
    return () => {
      alive = false
    }
  }, [loadSeq])

  if (state?.step === 'details') {
    return (
      <OwnerBusinessDetails
        businessTypeIds={state.businessTypeIds ?? []}
        businessTypeNames={state.businessTypeNames ?? []}
        suggestedCategories={state.suggestedCategories ?? []}
        onBack={() => (canGoBack() ? navigate(-1) : navigate(Routes.ownerSetup, { replace: true, state: null }))}
      />
    )
  }

  const toggle = (id: string, name: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((x) => x.filter((v) => v !== id))
      setSelectedNames((x) => x.filter((v) => v !== name))
    } else {
      setSelectedIds((x) => [...x, id])
      setSelectedNames((x) => [...x, name])
    }
  }

  const proceed = () => {
    if (selectedIds.length === 0) return
    // Aggregate suggested categories from selected types
    const suggested = new Set<string>()
    for (const type of types) {
      if (selectedIds.includes(type.id)) for (const c of type.suggestedCategories ?? []) suggested.add(String(c))
    }
    const next: DetailsState = {
      step: 'details',
      businessTypeIds: selectedIds,
      businessTypeNames: selectedNames,
      suggestedCategories: [...suggested],
    }
    navigate(Routes.ownerSetup, { state: next })
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-page">
      <AppBar title={t('business_type.title')} center />
      <div className="mx-auto w-full max-w-4xl flex-1">
        <Steps steps={OWNER_STEPS} current={0} className="mx-auto max-w-md px-6 pt-2" />
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-ink">{t('business_type.headline')}</h2>
          <p className="mt-3 text-sm text-ink/60">{t('business_type.subtitle')}</p>
        </div>
        {loadingTypes ? (
          <div className="grid grid-cols-2 gap-4 px-6 pb-6 sm:grid-cols-3 lg:grid-cols-4" aria-busy aria-label="Loading business types">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-[1.1]" />
            ))}
          </div>
        ) : typesError ? (
          <ErrorState
            title="Couldn't load business types"
            message={friendlyError(typesError, "We couldn't load the list of business types.").message}
            hint={friendlyError(typesError).hint}
            onRetry={reloadTypes}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 px-6 pb-6 sm:grid-cols-3 lg:grid-cols-4">
            {types.map((type) => (
              <BusinessTypeCard key={type.id} type={type} selected={selectedIds.includes(type.id)} onClick={() => toggle(type.id, type.name)} />
            ))}
          </div>
        )}
      </div>
      <div className="sticky bottom-0 bg-page p-6 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-md">
          <PrimaryButton disabled={selectedIds.length === 0} onClick={proceed}>
            {`${t('common.continue')} (${selectedIds.length})`}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

const OWNER_STEPS = ['Business type', 'Salon details']

function AppBar({ title, center, onBack, disabled }: { title: string; center?: boolean; onBack?: () => void; disabled?: boolean }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 bg-page px-2">
      {onBack ? (
        <button
          type="button"
          aria-label="Back"
          disabled={disabled}
          onClick={onBack}
          className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-ink/5 disabled:opacity-40"
        >
          <ChevronLeft size={26} />
        </button>
      ) : (
        <div className="w-10" />
      )}
      <h1 className={cx('flex-1 truncate text-lg font-semibold text-ink', center && 'text-center')}>{title}</h1>
      <div className="w-10" />
    </header>
  )
}

const ICONS: Record<string, LucideIcon> = {
  content_cut: Scissors,
  spa: Flower2,
  face_retouching_natural: Sparkles,
  favorite: Heart,
  wc: Users,
  face: Smile,
  remove_circle_outline: CircleMinus,
  more_horiz: Ellipsis,
}

function BusinessTypeCard({ type, selected, onClick }: { type: BusinessType; selected: boolean; onClick: () => void }) {
  const Icon = ICONS[type.icon] ?? Store
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        'flex aspect-[1.1] flex-col items-center justify-center rounded-2xl px-2 transition duration-200',
        selected ? 'border-2 border-primary bg-primary/10 shadow-[0_4px_8px_rgba(108,92,231,0.2)]' : 'border border-line bg-card hover:border-primary/40',
      )}
    >
      <div className={cx('rounded-full p-3', selected ? 'bg-primary text-white' : 'bg-inset text-ink/70')}>
        <Icon size={28} />
      </div>
      <span className={cx('mt-3 line-clamp-2 text-center text-sm', selected ? 'font-bold text-primary' : 'font-medium text-ink')}>{type.name}</span>
      {selected && <CheckCircle2 size={16} className="mt-1 text-primary" />}
    </button>
  )
}

// ── Step 2: OwnerBusinessDetailsScreen ──────────────────────────────────────
function OwnerBusinessDetails({
  businessTypeIds,
  businessTypeNames,
  suggestedCategories,
  onBack,
}: {
  businessTypeIds: string[]
  businessTypeNames: string[]
  suggestedCategories: string[]
  onBack: () => void
}) {
  const t = useT()
  const { toastSuccess, toastError, confirm } = useFeedback()
  const { user, status, completeOwnerProfile } = useAuth()
  const [blurred, setBlurred] = useState<Record<string, boolean>>({})
  const blur = (k: string) => () => setBlurred((b) => ({ ...b, [k]: true }))

  const [salonName, setSalonName] = useState('')
  const [address, setAddress] = useState('')
  const [categories, setCategories] = useState(() => suggestedCategories.join(', '))
  const [regions, setRegions] = useState<Region[]>([])
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [regionsFailed, setRegionsFailed] = useState(false)
  const [regionsSeq, setRegionsSeq] = useState(0)
  const [region, setRegion] = useState<string | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const isLoading = busy || status === 'loading'

  useEffect(() => {
    let alive = true
    setLoadingRegions(true)
    setRegionsFailed(false)
    loadRegions()
      .then((d) => alive && setRegions(d))
      .catch((e: unknown) => {
        // Regions are required to finish, so surface the failure with a Retry.
        if (!alive) return
        setRegionsFailed(true)
        toastError(e, "Couldn't load regions", () => setRegionsSeq((n) => n + 1))
      })
      .finally(() => alive && setLoadingRegions(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionsSeq])

  const districts = (regions.find((r) => r.name === region)?.districts ?? []).map((d) => d.name).sort()

  const errors = {
    salonName: AppValidators.notEmpty(salonName, 'Enter your salon name.'),
    region: region == null ? t('onboarding.owner.region_error') : null,
    district: district == null ? t('onboarding.owner.district_error') : null,
    address: AppValidators.notEmpty(address, 'Enter your street address or a nearby landmark.'),
    categories: AppValidators.notEmpty(categories, 'Enter at least one service category, separated by commas (e.g. Haircut, Braiding).'),
  }
  const show = (e: string | null, key?: string) => (submitted || (key && blurred[key]) ? e : null)

  const dirty = !!(salonName.trim() || address.trim() || region || categories !== suggestedCategories.join(', '))
  useEffect(() => {
    if (!dirty || busy) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, busy])

  const back = async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Discard salon details?',
        message: "The details you've entered for your salon will be lost.",
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        destructive: true,
      })
      if (!ok) return
    }
    onBack()
  }

  const complete = async (ev: FormEvent) => {
    ev.preventDefault()
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) {
      requestAnimationFrame(() => focusFirstInvalid())
      return
    }
    if (!user || user.isGuest || isLoading) return
    const cats = categories
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
    setBusy(true)
    try {
      await completeOwnerProfile({
        salonName: salonName.trim(),
        address: address.trim(),
        serviceCategories: cats,
        businessTypeIds,
        businessTypeNames,
        region,
        district,
      })
      toastSuccess('Your salon has been created')
    } catch (e) {
      toastError(e, "Couldn't create your salon")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-page">
      <AppBar title={t('onboarding.owner.title')} onBack={() => void back()} disabled={isLoading} />
      <form onSubmit={complete} noValidate className="mx-auto flex w-full max-w-lg flex-col p-6">
        <Steps steps={OWNER_STEPS} current={1} className="mb-6" />
        <h2 className="text-center text-2xl font-bold text-ink">{t('onboarding.owner.headline')}</h2>
        <div className="h-6" />

        <TextInput
          label={t('onboarding.owner.salon_name_label')}
          placeholder={t('onboarding.owner.salon_name_hint')}
          prefixIcon={Store}
          disabled={isLoading}
          required
          value={salonName}
          onBlur={blur('salonName')}
          error={show(errors.salonName, 'salonName')}
          onChange={(e) => setSalonName(e.target.value)}
        />
        <div className="h-6" />

        <SelectField
          label={loadingRegions ? `${t('onboarding.owner.region_label')} (loading…)` : t('onboarding.owner.region_label')}
          icon={MapIcon}
          required
          error={show(errors.region)}
        >
          <select
            aria-invalid={!!show(errors.region)}
            aria-required
            className="field appearance-none pl-11"
            disabled={isLoading || loadingRegions}
            value={region ?? ''}
            onChange={(e) => {
              if (!e.target.value) return
              setRegion(e.target.value)
              setDistrict(null) // Reset district when region changes
            }}
          >
            <option value="" disabled hidden />
            {regions.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </SelectField>
        {regionsFailed && (
          <button
            type="button"
            onClick={() => setRegionsSeq((n) => n + 1)}
            className="mt-1.5 rounded-lg px-1 text-xs font-semibold text-primary hover:underline"
          >
            Couldn't load regions. Tap to retry
          </button>
        )}
        <div className="h-6" />

        <SelectField label={t('onboarding.owner.district_label')} icon={Building} required error={show(errors.district)}>
          <select
            aria-invalid={!!show(errors.district)}
            aria-required
            className="field appearance-none pl-11"
            disabled={isLoading || districts.length === 0}
            value={district ?? ''}
            onChange={(e) => setDistrict(e.target.value || null)}
          >
            <option value="" disabled hidden />
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </SelectField>
        <div className="h-6" />

        <TextInput
          label={t('onboarding.owner.address_label')}
          placeholder={t('onboarding.owner.address_hint')}
          prefixIcon={MapPin}
          disabled={isLoading}
          required
          value={address}
          onBlur={blur('address')}
          error={show(errors.address, 'address')}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="h-6" />

        <TextAreaInput
          label={t('onboarding.owner.categories_label')}
          placeholder={t('onboarding.owner.categories_hint')}
          prefixIcon={LayoutGrid}
          disabled={isLoading}
          required
          value={categories}
          onBlur={blur('categories')}
          error={show(errors.categories, 'categories')}
          onChange={(e) => setCategories(e.target.value)}
        />
        <div className="h-8" />

        <PrimaryButton type="submit" loading={isLoading}>
          {t('onboarding.owner.button')}
        </PrimaryButton>
        {busy && <p className="t-caption mt-3 text-center" role="status">Creating your salon… this can take a few seconds.</p>}
      </form>
    </div>
  )
}

function SelectField({
  label,
  icon: Icon,
  error,
  required,
  children,
}: {
  label: string
  icon: LucideIcon
  error?: string | null
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </span>
      <div className={cx('relative', error && '[&_select]:border-danger')}>
        <Icon size={20} className="pointer-events-none absolute left-4 top-[14px] z-[1] text-muted" />
        {children}
        <ChevronLeft size={18} className="pointer-events-none absolute right-4 top-[15px] -rotate-90 text-muted" />
      </div>
      <FieldError error={error} />
    </label>
  )
}
