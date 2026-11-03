// Port of calendar/presentation/widgets/walk_in_sheet.dart
import { Clock } from 'lucide-react'
import { useState } from 'react'
import { useFeedback } from '@/components/feedback'
import { Field, fieldClass, PrimaryButton, Sheet } from '@/components/ui'
import { focusFirstInvalid, v } from '@/lib/validation'
import { useT } from '@/lib/i18n'
import type { ServiceModel } from '@/lib/models'

const pad = (n: number) => String(n).padStart(2, '0')
const nowHHmm = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** TimeOfDay.format(context) → "3:05 PM" */
const formatTimeOfDay = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function WalkInSheet({
  open,
  selectedDay,
  services,
  onSubmit,
  onClose,
}: {
  open: boolean
  selectedDay: Date
  services: ServiceModel[]
  onSubmit: (p: { clientName: string; service: ServiceModel; startTime: Date }) => Promise<void>
  /** created === true when the walk-in was saved (Navigator.pop(true)) */
  onClose: (created: boolean) => void
}) {
  const t = useT()
  const { toastError } = useFeedback()
  const [nameError, setNameError] = useState<string | null>(null)
  const active = services.filter((s) => s.isActive)
  const [name, setName] = useState('')
  const [serviceId, setServiceId] = useState<string | undefined>(active[0]?.id)
  const [time, setTime] = useState(nowHHmm)
  const [submitting, setSubmitting] = useState(false)

  const service = active.find((s) => s.id === serviceId)

  const save = async () => {
    const clientName = name.trim()
    if (submitting) return
    const err = v.required('Client name')(clientName) ?? (clientName.length < 2 ? 'Enter at least 2 characters for the client name.' : null)
    if (err) {
      setNameError(err)
      requestAnimationFrame(() => focusFirstInvalid())
      return
    }
    if (!service) return
    setSubmitting(true)
    const [h, m] = time.split(':').map(Number)
    const start = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), h, m)
    try {
      await onSubmit({ clientName, service, startTime: start })
      onClose(true)
    } catch (e) {
      setSubmitting(false)
      toastError(e, t('owner.calendar.walk_in_error'), () => void save())
    }
  }

  return (
    <Sheet open={open} onClose={() => !submitting && onClose(false)} title={t('owner.calendar.walk_in_title')}>
      {active.length === 0 ? (
        <p className="text-sm text-ink">{t('owner.calendar.walk_in_no_services')}</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Field label={t('owner.calendar.walk_in_name_label')} error={nameError} required>
            <input
              className={fieldClass(nameError, 'capitalize')}
              value={name}
              onBlur={() => name && !name.trim() && setNameError('Client name is required.')}
              disabled={submitting}
              autoCapitalize="words"
              placeholder={t('owner.calendar.walk_in_name_hint')}
              aria-invalid={!!nameError}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError(null)
              }}
              autoFocus
            />
          </Field>
          <Field label={t('owner.calendar.walk_in_service_label')} required>
            <select className="field" value={serviceId ?? ''} disabled={submitting} onChange={(e) => setServiceId(e.target.value)}>
              {active.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex cursor-pointer items-center gap-3 py-1">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-ink">{t('owner.calendar.walk_in_time_label')}</p>
              <p className="text-sm text-muted">{formatTimeOfDay(time)}</p>
            </div>
            <input
              type="time"
              className="field w-auto"
              value={time}
              disabled={submitting}
              onChange={(e) => e.target.value && setTime(e.target.value)}
              aria-label={t('owner.calendar.walk_in_time_label')}
            />
            <Clock size={22} className="shrink-0 text-primary" />
          </label>
          <PrimaryButton type="submit" loading={submitting} className="mt-2">
            {submitting ? 'Saving…' : t('owner.calendar.walk_in_save')}
          </PrimaryButton>
        </form>
      )}
    </Sheet>
  )
}
