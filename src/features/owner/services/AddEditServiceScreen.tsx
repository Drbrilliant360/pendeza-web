// Port of services/presentation/screens/add_edit_service_screen.dart (+ ServicesBloc add/update/delete)
import { AlertCircle, BarChart3, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, PauseCircle, RefreshCw, Star, Trash2, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { cx, ErrorState, Field, fieldClass, FormErrorSummary, LoadingScreen, PrimaryButton, Skeleton } from '@/components/ui'
import { check, focusFirstInvalid, v } from '@/lib/validation'
import { friendlyError } from '@/lib/errors'
import { getSalonForOwner, getServiceById } from '@/lib/firestore'
import { useT } from '@/lib/i18n'
import { serviceHelpers, type ServiceModel } from '@/lib/models'
import { addService, deleteService, loadServiceDefinitions, updateService, type ServiceCategoryDef } from '../api'
import { HeaderIconButton, OwnerTabHeader } from '../components/OwnerChrome'
import CategorizedServiceDropdowns from './components/CategorizedServiceDropdowns'

/** Resolves the service to edit: navigation state, else ?id=, else add mode. */
export default function AddEditServiceScreen() {
  const { state } = useLocation() as { state?: { service?: ServiceModel } | null }
  const [params] = useSearchParams()
  const id = params.get('id')
  const fromState = state?.service && (!id || state.service.id === id) ? state.service : undefined
  const [service, setService] = useState<ServiceModel | null | undefined>(fromState ?? (id ? undefined : null))
  const [loadError, setLoadError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (fromState || !id) return
    let alive = true
    setLoadError(null)
    getServiceById(id)
      .then((s) => {
        if (!alive) return
        if (s) setService(s)
        else setLoadError(new Error('This service no longer exists'))
      })
      .catch((e) => alive && setLoadError(e))
    return () => {
      alive = false
    }
  }, [id, fromState, attempt])

  if (loadError) {
    // Previously a failed lookup silently fell back to "Add service" mode, which was misleading.
    const f = friendlyError(loadError)
    return (
      <div className="pb-28 md:pb-12">
        <OwnerTabHeader title="Service" leading={<HeaderIconButton icon={ChevronLeft} variant="plain" label="Back" onClick={() => navigate(Routes.ownerServices)} />} />
        <ErrorState title="Couldn't load this service" message={f.message} hint={f.hint} onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    )
  }
  if (service === undefined) return <LoadingScreen message="Loading service…" />
  return <AddEditServiceForm key={service?.id ?? 'new'} service={service} />
}

const parseIntStrict = (s: string) => (/^[-+]?\d+$/.test(s.trim()) ? parseInt(s.trim(), 10) : null)
const parseDouble = (s: string) => {
  const v = s.trim()
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function AddEditServiceForm({ service }: { service: ServiceModel | null }) {
  const t = useT()
  const navigate = useNavigate()
  const { toastSuccess, toastError, confirm } = useFeedback()
  const { user } = useAuth()
  const isEditing = service != null

  const [name, setName] = useState(service?.name ?? '')
  const [price, setPrice] = useState(service ? service.price.toFixed(0) : '')
  const [duration, setDuration] = useState(service ? String(service.durationMinutes) : '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [category, setCategory] = useState(service?.category ?? '')
  const [staffNote, setStaffNote] = useState(service?.staffNote ?? '')
  const [discountedPrice, setDiscountedPrice] = useState(service?.discountedPrice != null ? service.discountedPrice.toFixed(0) : '')
  const [isActive, setIsActive] = useState(service?.isActive ?? true)
  const [isFeatured, setIsFeatured] = useState(service?.isFeatured ?? false)
  const [requiresDeposit, setRequiresDeposit] = useState(service?.requiresDeposit ?? false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [defs, setDefs] = useState<ServiceCategoryDef[]>([])
  const [defsLoading, setDefsLoading] = useState(true)
  const [defsError, setDefsError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const loadDefs = useCallback(() => {
    let alive = true
    setDefsLoading(true)
    setDefsError(null)
    loadServiceDefinitions()
      .then((d) => alive && setDefs(d))
      .catch((e) => {
        console.error('Could not load service definitions', e)
        if (alive) setDefsError(e)
      })
      .finally(() => alive && setDefsLoading(false))
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => loadDefs(), [loadDefs])

  const catIdx = defs.findIndex((c) => c.category === category)
  const categoryIndex = catIdx >= 0 ? catIdx : null
  const svcIdx = categoryIndex != null ? defs[categoryIndex].services.findIndex((s) => s.name === name) : -1
  const serviceIndex = svcIdx >= 0 ? svcIdx : null

  // Validation runs live; a field's message shows once it was blurred or after the first submit.
  const allErrors: Record<string, string | null> = {
    category: !defsLoading && !defsError && categoryIndex == null ? 'Choose a service category.' : null,
    service: !defsLoading && !defsError && serviceIndex == null ? 'Choose a service from the list.' : null,
    price: check(price, v.positiveNumber('Price')),
    duration: check(duration, v.required('Duration'), v.integerRange('Duration (minutes)', 5, 600)),
    discountedPrice: !discountedPrice.trim()
      ? null
      : check(discountedPrice, v.positiveNumber('Sale price')) ??
        ((parseDouble(price) ?? 0) > 0 && (parseDouble(discountedPrice) ?? 0) >= (parseDouble(price) ?? 0) ? 'Sale price must be lower than the regular price.' : null),
  }
  const errors = Object.fromEntries(Object.entries(allErrors).map(([k, e]) => [k, submitted || touched[k] ? e : null]))
  const blur = (k: string) => () => setTouched((t) => (t[k] ? t : { ...t, [k]: true }))

  // Unsaved-changes guard
  const initial = JSON.stringify([service?.name ?? '', service ? service.price.toFixed(0) : '', service ? String(service.durationMinutes) : '', service?.description ?? '', service?.category ?? '', service?.staffNote ?? '', service?.discountedPrice != null ? service.discountedPrice.toFixed(0) : '', service?.isActive ?? true, service?.isFeatured ?? false, service?.requiresDeposit ?? false])
  const current = JSON.stringify([name, price, duration, description, category, staffNote, discountedPrice, isActive, isFeatured, requiresDeposit])
  const dirty = !saving && !deleting && initial !== current
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(Routes.ownerServices, { replace: true })
  }
  const requestBack = async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Discard changes?',
        message: isEditing ? `Your changes to "${service.name}" won't be saved.` : "This new service won't be saved.",
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        destructive: true,
      })
      if (!ok) return
    }
    goBack()
  }

  const save = async () => {
    if (saving || deleting) return
    setSubmitted(true)
    if (Object.values(allErrors).some(Boolean)) {
      if (allErrors.discountedPrice) setShowAdvanced(true)
      requestAnimationFrame(() => focusFirstInvalid())
      return
    }

    const model = {
      name: name.trim(),
      price: parseDouble(price) ?? 0,
      durationMinutes: parseIntStrict(duration) ?? 0,
      description: description.trim(),
      category: category.trim(),
      isActive,
    }
    setSaving(true)
    try {
      if (isEditing) {
        await updateService({ id: service.id, ...model })
        toastSuccess('Service saved')
      } else {
        if (!user) throw new Error('You are not signed in')
        const salon = await getSalonForOwner(user.uid)
        if (!salon) throw new Error('No salon found for your account')
        await addService({
          ...model,
          salonId: salon.id,
          isFeatured,
          requiresDeposit,
          staffNote: staffNote.trim() ? staffNote.trim() : null,
          discountedPrice: discountedPrice.trim() ? parseDouble(discountedPrice) : null,
          bookingsCount: 0,
          imageUrl: null,
          tags: [],
          sortOrder: 0,
        })
        toastSuccess('Service added')
      }
      goBack()
    } catch (e) {
      setSaving(false)
      toastError(e, isEditing ? 'Could not save service' : 'Could not add service', () => void save())
    }
  }

  const remove = async () => {
    if (!service || saving || deleting) return
    const ok = await confirm({
      title: t('owner.services.delete_confirm_title'),
      message: t('owner.services.delete_confirm_msg', [service.name]),
      confirmText: t('owner.services.delete_btn'),
      cancelText: t('common.cancel'),
      destructive: true,
    })
    if (!ok) return
    setDeleting(true)
    try {
      await deleteService(service.id)
      toastSuccess('Service deleted')
      goBack()
    } catch (e) {
      setDeleting(false)
      toastError(e, 'Could not delete service')
    }
  }

  return (
    <div className="pb-28 md:pb-12">
      <OwnerTabHeader
        title={isEditing ? t('owner.services.edit_title') : t('owner.services.add_title')}
        leading={<HeaderIconButton icon={ChevronLeft} variant="plain" label="Back" onClick={() => void requestBack()} />}
        actions={
          isEditing ? (
            <HeaderIconButton icon={Trash2} variant="danger" label={t('owner.services.delete_btn')} loading={deleting} onClick={() => void remove()} />
          ) : undefined
        }
      />
      <form
        noValidate
        className="mx-auto w-full max-w-2xl space-y-5 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {isEditing && (
          <div
            className={cx(
              'flex items-center gap-4 rounded-xl border p-4',
              isActive ? 'border-success/30 bg-success/10' : 'border-warning/40 bg-warning/10',
            )}
          >
            {isActive ? <CheckCircle2 className="text-success" /> : <PauseCircle className="text-[#E0A800]" />}
            <div className="min-w-0 flex-1">
              <p className={cx('text-sm font-bold', isActive ? 'text-success' : 'text-[#E0A800]')}>{isActive ? 'Active' : 'Paused'}</p>
              <p className="text-xs text-muted">{isActive ? 'This service is visible to clients' : 'This service is hidden from clients'}</p>
            </div>
            <Switch checked={isActive} onChange={setIsActive} color="#00B894" label="Active" />
          </div>
        )}

        {defsLoading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading service list">
            <Skeleton className="h-[52px] !rounded-xl" />
            <Skeleton className="h-[52px] !rounded-xl" />
          </div>
        ) : defsError ? (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/[0.06] p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Couldn't load the list of services</p>
              <p className="mt-0.5 text-xs text-muted">{friendlyError(defsError).hint ?? 'Please try again.'}</p>
            </div>
            <button type="button" onClick={() => loadDefs()} className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : (
          <CategorizedServiceDropdowns
            serviceData={defs}
            categoryIndex={categoryIndex}
            serviceIndex={serviceIndex}
            categoryError={errors.category}
            serviceError={errors.service}
            onCategorySelected={(i) => {
              setCategory(defs[i].category)
              setName('')
              setDescription('')
              setPrice('')
              setDuration('')
            }}
            onServiceSelected={(i) => {
              const s = defs[categoryIndex ?? 0].services[i]
              setName(s.name)
              setDescription(s.description)
              if (s.defaultPrice != null && !price) setPrice(s.defaultPrice.toFixed(0))
              if (s.defaultDuration != null && !duration) setDuration(String(s.defaultDuration))
            }}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label={`${t('owner.services.price_label')} (TZS)`} error={errors.price} required>
            <input
              className={fieldClass(errors.price)}
              aria-invalid={!!errors.price}
              inputMode="decimal"
              placeholder="e.g. 25000"
              value={price}
              onBlur={blur('price')}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </Field>
          <Field label={`${t('owner.services.duration_label')} (min)`} error={errors.duration} required>
            <input
              className={fieldClass(errors.duration)}
              aria-invalid={!!errors.duration}
              inputMode="numeric"
              placeholder="e.g. 60"
              value={duration}
              onBlur={blur('duration')}
              onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>

        <Field label={t('owner.services.desc_label')}>
          <textarea className="field resize-none" rows={3} placeholder={t('owner.services.desc_hint')} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <button type="button" onClick={() => setShowAdvanced((o) => !o)} className="flex w-full items-center gap-2 rounded-lg py-2 text-left">
          {showAdvanced ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-primary" />}
          <span className="text-sm font-semibold text-primary">Advanced Options</span>
          <span className="ml-auto rounded-xl bg-inset px-2 py-1 text-xs text-muted">Optional</span>
        </button>

        {showAdvanced && (
          <div className="space-y-4 rounded-xl bg-inset/60 p-4">
            <Field label="Sale Price in TZS (Optional)" error={errors.discountedPrice}>
              <input
                className={fieldClass(errors.discountedPrice)}
                aria-invalid={!!errors.discountedPrice}
                inputMode="decimal"
                placeholder="Leave empty for no discount"
                value={discountedPrice}
                onBlur={blur('discountedPrice')}
                onChange={(e) => setDiscountedPrice(e.target.value.replace(/[^\d.]/g, ''))}
              />
            </Field>
            <Field label="Staff Note (Internal)">
              <textarea className="field resize-none" rows={2} placeholder="Notes visible only to your team" value={staffNote} onChange={(e) => setStaffNote(e.target.value)} />
            </Field>
            <ToggleOption icon={Star} color="#F5A623" title="Featured Service" subtitle="Highlight this service in your menu" value={isFeatured} onChange={setIsFeatured} />
            <ToggleOption icon={CircleDollarSign} color="#6C5CE7" title="Requires Deposit" subtitle="Clients must pay deposit when booking" value={requiresDeposit} onChange={setRequiresDeposit} />
          </div>
        )}

        {submitted && <FormErrorSummary errors={Object.values(allErrors)} />}
        <div className="pt-3">
          <PrimaryButton type="submit" loading={saving} disabled={deleting}>
            {saving ? 'Saving…' : isEditing ? t('owner.services.save_btn') : t('owner.services.add_btn')}
          </PrimaryButton>
        </div>

        {isEditing && service.bookingsCount > 0 && (
          <div className="mt-3 rounded-xl bg-inset/60 p-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-ink" />
              <span className="text-sm font-bold text-ink">Performance</span>
            </div>
            <div className="mt-4 flex justify-around">
              <StatItem icon={<Calendar size={24} className="text-primary" />} value={`${service.bookingsCount}`} label="Total Bookings" />
              {serviceHelpers.isPopular(service) && (
                <StatItem icon={<Star size={24} className="text-[#F5A623]" fill="currentColor" />} value="Popular" label="Top Service" valueClass="text-[#F5A623]" />
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

function Switch({ checked, onChange, color, label }: { checked: boolean; onChange: (v: boolean) => void; color: string; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition', !checked && 'bg-ink/20')}
      style={checked ? { background: color } : undefined}
    >
      <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  )
}

function ToggleOption({
  icon: Icon,
  color,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: LucideIcon
  color: string
  title: string
  subtitle: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={20} style={{ color }} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>
      <Switch checked={value} onChange={onChange} color={color} label={title} />
    </div>
  )
}

function StatItem({ icon, value, label, valueClass }: { icon: ReactNode; value: string; label: string; valueClass?: string }) {
  return (
    <div className="flex flex-col items-center">
      {icon}
      <span className={cx('mt-1 text-base font-bold text-ink', valueClass)}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}
