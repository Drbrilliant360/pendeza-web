// Port of services/presentation/widgets/categorized_service_dropdowns.dart
import { Field, fieldClass } from '@/components/ui'
import type { ServiceCategoryDef, ServiceDefinition } from '../../api'

export function serviceOptionLabel(s: ServiceDefinition) {
  const meta = [
    ...(s.defaultDuration != null ? [`${s.defaultDuration}min`] : []),
    ...(s.defaultPrice != null ? [`TZS ${s.defaultPrice.toFixed(0)}`] : []),
  ].join(' • ')
  return meta ? `${s.name}  —  ${meta}` : s.name
}

export default function CategorizedServiceDropdowns({
  serviceData,
  categoryIndex,
  serviceIndex,
  onCategorySelected,
  onServiceSelected,
  categoryError,
  serviceError,
}: {
  serviceData: ServiceCategoryDef[]
  categoryIndex: number | null
  serviceIndex: number | null
  onCategorySelected: (index: number) => void
  onServiceSelected: (index: number) => void
  categoryError?: string | null
  serviceError?: string | null
}) {
  const filtered = categoryIndex != null ? serviceData[categoryIndex]?.services ?? [] : []
  return (
    <div className="space-y-5">
      <Field label="Service Category" error={categoryError} required>
        <select
          className={fieldClass(categoryError)}
          aria-invalid={!!categoryError}
          value={categoryIndex ?? ''}
          onChange={(e) => e.target.value !== '' && onCategorySelected(Number(e.target.value))}
        >
          <option value="" disabled>
            Select a Category
          </option>
          {serviceData.map((c, i) => (
            <option key={c.category + i} value={i}>
              {c.category}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Service Name" error={serviceError} required hint={categoryIndex == null ? 'Choose a category first.' : undefined}>
        <select
          className={fieldClass(serviceError)}
          aria-invalid={!!serviceError}
          disabled={categoryIndex == null}
          value={serviceIndex ?? ''}
          onChange={(e) => e.target.value !== '' && onServiceSelected(Number(e.target.value))}
        >
          <option value="" disabled>
            Select a Service
          </option>
          {filtered.map((s, i) => (
            <option key={s.name + i} value={i}>
              {serviceOptionLabel(s)}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}
