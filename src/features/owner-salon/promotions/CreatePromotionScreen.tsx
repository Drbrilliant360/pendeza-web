// Port of promotions/presentation/screens/create_promotion_screen.dart.
// The paid "Boost" path (Snippe payment link + PaymentWebView + verifyTransaction) is not available on
// the web: payment secrets must never ship to the browser and payments are disabled app-wide
// (AppConfig.paymentsEnabled = false). With Boost on, the owner is told and can create without boost.
import { CalendarDays, ImagePlus, Zap } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFeedback } from '@/components/feedback'
import { ErrorState, Field, fieldClass, FormErrorSummary, PrimaryButton, ProgressBar, Screen, Spinner, cx } from '@/components/ui'
import { AppConfig } from '@/lib/config'
import { friendlyError } from '@/lib/errors'
import { check, focusFirstInvalid, v } from '@/lib/validation'
import * as api from '../api'
import { OwnerAppBar, Toggle, useBack, useUnsavedChangesWarning } from '../components/OwnerChrome'
import { OwnerSalonRoutes } from '../paths'
import { DISCOUNT_TYPES, type DiscountType, type PromotionModel } from '../models'
import { useOwnerSalonId } from './useOwnerSalonId'

const toInputDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromInputDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

interface Errors { image?: string | null; title?: string | null; description?: string | null; value?: string | null; dates?: string | null }

export default function CreatePromotionScreen() {
  const { toastSuccess, toastError, confirm } = useFeedback()
  const goBack = useBack(OwnerSalonRoutes.promotions)
  const { salonId, loading: loadingSalon, error: salonError, retry } = useOwnerSalonId()
  const fileRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountValue, setDiscountValue] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('percentage')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [boost, setBoost] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const dirty = !done && !!(title || description || discountValue || start || end || image)
  useUnsavedChangesWarning(dirty)

  const today = new Date()
  const minDate = toInputDate(today)
  const maxDate = toInputDate(new Date(today.getTime() + 365 * 24 * 3600 * 1000))

  // Errors show after the first submit attempt and clear live as the owner fixes them.
  const validate = (): Errors => ({
    image: image ? null : 'Add a cover image – tap the box above to choose one.',
    title: check(title, v.required('Title')),
    description: check(description, v.required('Description')),
    value: check(discountValue, v.positiveNumber(discountType === 'percentage' ? 'Percent' : 'Amount')) ??
      (discountType === 'percentage' && Number(discountValue) > 100 ? 'Percent must be 100 or less.' : null),
    dates: !start || !end ? 'Pick both a start and an end date.' : fromInputDate(end) < fromInputDate(start) ? 'The end date must be on or after the start date.' : null,
  })
  const errors: Errors = submitted ? validate() : {}

  const back = async () => {
    if (busy) return
    if (dirty) {
      const ok = await confirm({ title: 'Discard this promotion?', message: 'Your changes will be lost.', confirmText: 'Discard', cancelText: 'Keep editing', destructive: true })
      if (!ok) return
    }
    goBack()
  }

  const createDirectly = async (promotion: PromotionModel) => {
    if (!salonId || !image || busy) return
    setBusy(true)
    setProgress(0)
    try {
      await api.createPromotion({ salonId, promotion, imageFile: image, onProgress: (f) => setProgress(f * 100) })
      setDone(true)
      toastSuccess('Promotion created successfully!')
      goBack()
    } catch (e) {
      toastError(e, 'Could not create the promotion', () => void createDirectly(promotion))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!salonId) return
    setSubmitted(true)
    const errs = validate()
    if (Object.values(errs).some(Boolean)) {
      requestAnimationFrame(() => {
        if (errs.image) fileRef.current?.parentElement?.querySelector<HTMLElement>('[data-image-picker]')?.focus()
        else if (formRef.current) focusFirstInvalid(formRef.current)
      })
      return
    }

    const parsed = parseFloat(discountValue)
    const now = new Date()
    const promotion: PromotionModel = {
      id: '',
      type: 'salon',
      salonId: null,
      salonName: null,
      title: title.trim(),
      description: description.trim(),
      imageUrl: '',
      promoCode: null,
      discountType,
      discountValue: Number.isFinite(parsed) ? parsed : null,
      minimumSpend: null,
      maximumDiscount: null,
      applicableServiceIds: null,
      applicableCategoryIds: null,
      startDate: fromInputDate(start),
      endDate: fromInputDate(end),
      isActive: true,
      audience: 'all',
      priority: 0,
      usageLimit: null,
      usageCount: 0,
      usageLimitPerUser: null,
      isFeatured: false,
      featuredUntil: null,
      action: 'none',
      actionValue: null,
      createdAt: now,
      updatedAt: null,
      createdBy: null,
    }

    if (boost && !AppConfig.paymentsEnabled) {
      const ok = await confirm({
        title: 'Boost payment not available on web yet',
        message:
          'Paying to boost a promotion (10,000 TZS) is only available in the Pendeza mobile app for now. You can create this promotion without the boost and boost it later from the app.',
        confirmText: 'Create without Boost',
        cancelText: 'Cancel',
      })
      if (ok) {
        setBoost(false)
        await createDirectly(promotion)
      }
      return
    }
    await createDirectly(promotion)
  }

  if (salonError && !salonId) {
    const f = friendlyError(salonError, 'Could not load your salon')
    return (
      <>
        <OwnerAppBar title="Create Promotion" back parent={OwnerSalonRoutes.promotions} />
        <ErrorState title="Failed to load salon data" message={f.message} hint={f.hint} offline={f.code === 'network'} retrying={loadingSalon} onRetry={retry} />
      </>
    )
  }

  if (loadingSalon || !salonId) {
    return (
      <>
        <OwnerAppBar title="Create Promotion" back parent={OwnerSalonRoutes.promotions} />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Spinner />
          <p className="t-body">Loading salon information...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <OwnerAppBar title="Create Promotion" back onBack={() => void back()} />
      <Screen className="max-w-2xl px-4 pt-6 sm:px-6">
        <form ref={formRef} onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) {
                setImage(f)
                setPreview(URL.createObjectURL(f))
              }
            }}
          />
          <div>
            <button
              type="button"
              data-image-picker
              disabled={busy}
              aria-invalid={!!errors.image}
              aria-label={preview ? 'Change cover image' : 'Add cover image'}
              onClick={() => fileRef.current?.click()}
              className={cx(
                'flex h-[180px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border bg-ink/5 bg-cover bg-center md:h-[240px]',
                errors.image ? 'border-2 border-danger' : 'border-line',
              )}
              style={preview ? { backgroundImage: `url(${preview})` } : undefined}
            >
              {!preview && (
                <>
                  <ImagePlus size={40} className="text-muted" />
                  <span className="mt-2 text-sm text-muted">
                    Add Cover Image<span className="ml-0.5 text-danger">*</span>
                  </span>
                </>
              )}
            </button>
            {errors.image && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{errors.image}</p>}
          </div>

          <Field label="Title (e.g., Summer Glow)" required error={errors.title}>
            <input className={fieldClass(errors.title)} aria-invalid={!!errors.title} maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Description" required error={errors.description}>
            <textarea className={fieldClass(errors.description)} aria-invalid={!!errors.description} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <div>
            <p className="mb-2 font-bold text-ink">Discount Details</p>
            <div className="space-y-4">
              <Field label="Type">
                <select className="field" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                  {DISCOUNT_TYPES.map((d) => (
                    <option key={d} value={d}>
                      {d.toUpperCase()}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={discountType === 'percentage' ? 'Percent (%)' : 'Amount (TZS)'} required error={errors.value}>
                <input
                  className={fieldClass(errors.value)}
                  aria-invalid={!!errors.value}
                  inputMode="decimal"
                  type="number"
                  min={0}
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-ink">
              Duration<span className="-ml-1.5 text-danger" aria-hidden>*</span> <CalendarDays size={16} className="text-muted" />
            </p>
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              <label className="block">
                <span className="t-caption mb-1 block">Start</span>
                <input
                  type="date"
                  className={fieldClass(errors.dates && !start ? errors.dates : null)}
                  aria-invalid={!!errors.dates && !start}
                  min={minDate}
                  max={maxDate}
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value)
                    if (end && e.target.value > end) setEnd(e.target.value)
                  }}
                />
              </label>
              <label className="block">
                <span className="t-caption mb-1 block">End</span>
                <input
                  type="date"
                  className={fieldClass(errors.dates && start ? errors.dates : null)}
                  aria-invalid={!!errors.dates && !!start}
                  min={start || minDate} max={maxDate} value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
            </div>
            {errors.dates && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{errors.dates}</p>}
            {start && end && (
              <p className="t-caption mt-1">
                {(() => {
                  const s = fromInputDate(start)
                  const en = fromInputDate(end)
                  return `${s.getDate()}/${s.getMonth() + 1} - ${en.getDate()}/${en.getMonth() + 1}`
                })()}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <Zap size={22} className="text-warning" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">Boost Visibility</p>
                <p className="text-[12.5px] text-muted">Feature on home screen for 7 days (10,000 TZS)</p>
              </div>
              <Toggle checked={boost} onChange={setBoost} color="#FF9800" label="Boost Visibility" />
            </div>
            {boost && !AppConfig.paymentsEnabled && (
              <p className="mt-3 rounded-xl bg-warning/10 p-2.5 text-[12px] text-ink">
                Payment is not available on the web yet. Boosting can be purchased from the Pendeza mobile app.
              </p>
            )}
          </div>

          {submitted && <FormErrorSummary errors={Object.values(errors)} />}
          {busy && (
            <ProgressBar
              value={progress != null && progress < 100 ? progress : null}
              label={progress != null && progress < 100 ? 'Uploading cover image…' : 'Creating promotion…'}
            />
          )}
          <PrimaryButton type="submit" loading={busy} disabled={busy}>
            {boost ? 'Pay & Create' : 'Create Promotion'}
          </PrimaryButton>
        </form>
      </Screen>
    </>
  )
}
