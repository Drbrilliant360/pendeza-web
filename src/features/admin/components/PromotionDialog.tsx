// Port of _AddPromotionDialog in admin_manage_promotion_screen.dart
import { ImagePlus, Pencil, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAction, useFeedback } from '@/components/feedback'
import { cx, fieldClass, PrimaryButton, ProgressBar } from '@/components/ui'
import { focusFirstInvalid } from '@/lib/validation'
import { compressImage } from '@/lib/storage'
import { useAdmin } from '../AdminContext'
import { DISCOUNT_TYPES, newPromotion, type DiscountType, type PromotionAction, type PromotionModel } from '../api'
import { AdminCloseButton, AdminIconTile, AdminLabel, AdminModal, AdminTextButton, useAdminConfirm } from './ui'

const DISCOUNT_LABELS: Record<DiscountType, string> = {
  percentage: 'Percentage',
  fixedAmount: 'Fixed amount',
  freebie: 'Freebie',
  none: 'No discount',
}
const ACTIONS: { value: PromotionAction; label: string }[] = [
  { value: 'none', label: 'No action' },
  { value: 'openDiscover', label: 'Open Discovery' },
  { value: 'openCategory', label: 'Open Category' },
  { value: 'openSalon', label: 'Open Salon' },
]

/** CustomTextFormField-style label above the control */
function LabeledField({ label, error, required, children }: { label: string; error?: string | null; required?: boolean; children: ReactNode }) {
  return (
    <label className="block" data-invalid={error ? 'true' : undefined}>
      <span className="mb-2 block text-xs text-ink/60">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-danger" role="alert">{error}</span>}
    </label>
  )
}

export default function PromotionDialog({ promotion, onClose }: { promotion: PromotionModel | null; onClose: () => void }) {
  const { addPromotion, updatePromotion } = useAdmin()
  const { toast } = useFeedback()
  const editing = promotion != null
  const [title, setTitle] = useState(promotion?.title ?? '')
  const [desc, setDesc] = useState(promotion?.description ?? '')
  const [code, setCode] = useState(promotion?.promoCode ?? '')
  const [discountType, setDiscountType] = useState<DiscountType>(promotion?.discountType ?? 'percentage')
  const [discountValue, setDiscountValue] = useState(promotion?.discountValue?.toString() ?? '')
  const [action, setAction] = useState<PromotionAction>(promotion?.action ?? 'none')
  const [actionValue, setActionValue] = useState(promotion?.actionValue ?? '')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!image) return setPreview(null)
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const needsActionValue = action === 'openCategory' || action === 'openSalon'
  const errors = {
    title: !title.trim() ? 'Enter a title, e.g. "Summer Sale".' : null,
    desc: !desc.trim() ? 'Enter a short description of the offer.' : null,
    value: discountValue.trim() && !(Number(discountValue) >= 0) ? 'Value must be a number, e.g. 20.' : null,
    actionValue: needsActionValue && !actionValue.trim() ? (action === 'openCategory' ? 'Enter the category ID this promotion opens.' : 'Enter the salon ID this promotion opens.') : null,
  }
  const valid = !errors.title && !errors.desc && !errors.value && !errors.actionValue
  const formRef = useRef<HTMLFormElement>(null)

  const save = useAction(
    async (promo: PromotionModel) => {
      const blob = image ? await compressImage(image) : null
      if (blob) setProgress(0)
      const onProgress = (pct: number) => setProgress(pct)
      if (editing) await updatePromotion(promo, blob, onProgress)
      else await addPromotion(promo, blob, onProgress)
    },
    {
      success: editing ? 'Promotion updated' : 'Promotion created',
      error: editing ? 'Could not save the promotion' : 'Could not create the promotion',
      onSuccess: onClose,
      onError: () => setProgress(null),
    },
  )
  const loading = save.pending
  const confirm = useAdminConfirm()
  const dirty =
    image != null ||
    title !== (promotion?.title ?? '') ||
    desc !== (promotion?.description ?? '') ||
    code !== (promotion?.promoCode ?? '') ||
    discountValue !== (promotion?.discountValue?.toString() ?? '') ||
    actionValue !== (promotion?.actionValue ?? '')
  const close = async () => {
    if (loading) return
    if (dirty) {
      const ok = await confirm({ title: 'Discard changes?', message: 'Your changes to this promotion will be lost.', confirmLabel: 'Discard', tone: 'danger' })
      if (!ok) return
    }
    onClose()
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (loading) return
    setSubmitted(true)
    if (!valid) requestAnimationFrame(() => formRef.current && focusFirstInvalid(formRef.current))
    // If editing, image is optional (can use existing). If new, image is required.
    if (valid && (image != null || editing)) {
      const parsed = discountValue ? Number.parseFloat(discountValue) : NaN
      const now = new Date()
      const promo = newPromotion({
        id: promotion?.id ?? '',
        title: title.trim(),
        description: desc.trim(),
        imageUrl: promotion?.imageUrl ?? '',
        promoCode: code.trim() ? code.trim() : null,
        discountType,
        discountValue: Number.isNaN(parsed) ? null : parsed,
        action,
        actionValue: actionValue.trim() ? actionValue.trim() : null,
        startDate: promotion?.startDate ?? now,
        endDate: promotion?.endDate ?? new Date(now.getTime() + 30 * 86400000),
        createdAt: promotion?.createdAt ?? now,
        isActive: promotion?.isActive ?? true,
      })
      void save.run(promo)
    } else if (image == null && !editing) {
      toast('Please select an image', 'warning')
    }
  }

  const existingUrl = promotion?.imageUrl ?? ''
  const shownImage = preview ?? (existingUrl || null)

  return (
    <AdminModal open onClose={() => void close()} maxWidth={540}>
      <div className="flex items-center gap-3 pb-2 pl-6 pr-3 pt-5">
        <AdminIconTile icon={editing ? Pencil : Sparkles} size={40} />
        <h2 className="flex-1 text-lg font-bold text-ink">{editing ? 'Edit promotion' : 'New promotion'}</h2>
        <AdminCloseButton onClick={() => void close()} />
      </div>
      <form ref={formRef} noValidate onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setImage(e.target.files[0])} />
          <button
            type="button"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
            className="relative block h-[140px] w-full overflow-hidden rounded-2xl border border-line bg-primary/5 bg-cover bg-center dark:bg-inset"
            style={shownImage ? { backgroundImage: `url("${shownImage}")` } : undefined}
          >
            {shownImage ? (
              <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink">
                <ImagePlus size={14} />
                Change
              </span>
            ) : (
              <span className="flex flex-col items-center">
                <AdminIconTile icon={ImagePlus} size={44} />
                <span className="mt-2.5 text-sm font-medium text-ink">
                  Add a banner image<span className="ml-0.5 text-danger" aria-hidden>*</span>
                </span>
                <span className="text-[12.5px] text-ink/60">Tap to choose from your gallery</span>
              </span>
            )}
          </button>
          {submitted && !image && !editing && <span className="mt-1 block text-xs text-danger">Please select an image</span>}

          <AdminLabel className="mt-[22px]">BASIC INFO</AdminLabel>
          <div className="mt-2.5 flex flex-col gap-3">
            <LabeledField label="Title (e.g., Summer Sale)" required error={submitted ? errors.title : null}>
              <input className={fieldClass(submitted ? errors.title : null)} aria-invalid={submitted && !!errors.title} maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} />
            </LabeledField>
            <LabeledField label="Description" required error={submitted ? errors.desc : null}>
              <input className={fieldClass(submitted ? errors.desc : null)} aria-invalid={submitted && !!errors.desc} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </LabeledField>
          </div>

          <AdminLabel className="mt-[22px]">DISCOUNT</AdminLabel>
          <div className="mt-2.5 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <LabeledField label="Type">
              <select className="field" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                {DISCOUNT_TYPES.map((d) => (
                  <option key={d} value={d}>
                    {DISCOUNT_LABELS[d]}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="Value" error={submitted ? errors.value : null}>
              <input className={fieldClass(submitted ? errors.value : null)} aria-invalid={submitted && !!errors.value} inputMode="decimal" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
            </LabeledField>
          </div>
          <div className="mt-3">
            <LabeledField label="Promo code (optional)">
              <input className="field" value={code} onChange={(e) => setCode(e.target.value)} />
            </LabeledField>
          </div>

          <AdminLabel className="mt-[22px]">ON TAP</AdminLabel>
          <div className="mt-2.5">
            <LabeledField label="Navigate to">
              <select className="field" value={action} onChange={(e) => setAction(e.target.value as PromotionAction)}>
                {ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
                {/* keep an existing openUrl value selectable */}
                {action === 'openUrl' && <option value="openUrl">Open link</option>}
              </select>
            </LabeledField>
          </div>
          {needsActionValue && (
            <div className="mt-3">
              <LabeledField label={action === 'openCategory' ? 'Category ID (e.g., massage, nails)' : 'Salon ID (from database)'} required error={submitted ? errors.actionValue : null}>
                <input className={fieldClass(submitted ? errors.actionValue : null)} aria-invalid={submitted && !!errors.actionValue} value={actionValue} onChange={(e) => setActionValue(e.target.value)} />
              </LabeledField>
            </div>
          )}
          <div className="h-2" />
        </div>
        {loading && (
          <div className="px-6 pt-3">
            <ProgressBar
              value={progress != null && progress < 100 ? progress : null}
              label={progress != null && progress < 100 ? 'Uploading banner image…' : editing ? 'Saving changes…' : 'Creating promotion…'}
            />
          </div>
        )}
        <div className={cx('flex items-center gap-2 px-6 pb-5 pt-3')}>
          <AdminTextButton type="button" tone="neutral" disabled={loading} onClick={() => void close()}>
            Cancel
          </AdminTextButton>
          <PrimaryButton type="submit" loading={loading} aria-label={loading ? 'Saving…' : undefined} height={50} className="flex-1">
            {editing ? 'Save changes' : 'Create promotion'}
          </PrimaryButton>
        </div>
      </form>
    </AdminModal>
  )
}
