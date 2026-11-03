// Port of salon_basic_info_section.dart (+ EditSalonDialog for basic info)
import { FileText, MapPin, Pencil, Store, type LucideIcon } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Card, Field, fieldClass, PrimaryButton, Sheet } from '@/components/ui'
import { focusFirstInvalid } from '@/lib/validation'
import type { SalonModel } from '@/lib/models'
import { useAction } from '@/components/feedback'
import { InfoNote, SectionTitleRow } from '../../components/OwnerChrome'
import type { SalonProfileController } from '../useSalonProfile'

export function InfoRow({ icon: Icon, label, value, placeholder }: { icon: LucideIcon; label: string; value: string; placeholder?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <Icon size={20} className="mt-0.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-ink/60">{label}</p>
        <p className={placeholder ? 'mt-1 text-[15px] italic text-ink/40' : 'mt-1 whitespace-pre-line break-words text-[15px] text-ink'}>{value}</p>
      </div>
    </div>
  )
}

export function EditIconButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid h-10 w-10 place-items-center rounded-full text-primary hover:bg-primary/10">
      <Pencil size={20} />
    </button>
  )
}

export default function BasicInfoSection({ salon, ctrl }: { salon: SalonModel; ctrl: SalonProfileController }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <SectionTitleRow title="Basic Information">
        <EditIconButton label="Edit" onClick={() => setOpen(true)} />
      </SectionTitleRow>
      <Card>
        <InfoRow icon={Store} label="Salon Name" value={salon.salonName} />
        <hr className="my-3 border-line/60" />
        <InfoRow icon={FileText} label="Description" value={salon.description ?? 'Add a description'} placeholder={salon.description == null} />
        <hr className="my-3 border-line/60" />
        <InfoRow icon={MapPin} label="Address" value={salon.address} />
      </Card>
      {open && <EditBasicInfoDialog salon={salon} ctrl={ctrl} onClose={() => setOpen(false)} />}
    </div>
  )
}

function EditBasicInfoDialog({ salon, ctrl, onClose }: { salon: SalonModel; ctrl: SalonProfileController; onClose: () => void }) {
  const save = useAction(ctrl.updateBasicInfo, { success: 'Basic information updated!', error: 'Failed to update basic info', onSuccess: onClose })
  const [name, setName] = useState(salon.salonName)
  const [description, setDescription] = useState(salon.description ?? '')
  const [address, setAddress] = useState(salon.address)
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const validate = () => ({
    name: !name.trim() ? 'Salon name is required' : name.trim().length < 3 ? 'Name must be at least 3 characters' : null,
    address: !address.trim() ? 'Address is required – enter the street and area clients should come to' : null,
  })
  // Shown after the first submit attempt; clears as the owner types.
  const errors = submitted ? validate() : { name: null, address: null }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (save.pending) return
    setSubmitted(true)
    const errs = validate()
    if (errs.name || errs.address) {
      requestAnimationFrame(() => formRef.current && focusFirstInvalid(formRef.current))
      return
    }
    const desc = description.trim()
    void save.run({ salonName: name.trim(), description: desc ? desc : null, address: address.trim() })
  }

  return (
    <Sheet open onClose={() => !save.pending && onClose()} title="Edit Basic Information">
      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Salon Name" required error={errors.name}>
          <input className={fieldClass(errors.name)} aria-invalid={!!errors.name} maxLength={80} value={name} placeholder="Enter salon name" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className="field" rows={3} value={description} placeholder="Describe your salon (optional)" onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Address" required error={errors.address}>
          <textarea className={fieldClass(errors.address)} aria-invalid={!!errors.address} rows={2} value={address} placeholder="Enter salon address" onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <InfoNote className="!mt-6">This information will be visible to all clients</InfoNote>
        <PrimaryButton type="submit" loading={save.pending}>
          Save Changes
        </PrimaryButton>
      </form>
    </Sheet>
  )
}
