// Port of salon_contact_section.dart + dialogs/edit_salon_dialog.dart (EditContactDialog)
import { Camera, ChevronRight, Copy, Facebook, MessageCircle, Phone, type LucideIcon } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAction } from '@/components/feedback'
import { Card, Field, fieldClass, PrimaryButton, Sheet } from '@/components/ui'
import { focusFirstInvalid, v } from '@/lib/validation'
import type { SalonModel } from '@/lib/models'
import { InfoNote, SectionTitleRow } from '../../components/OwnerChrome'
import { makePhoneCall, openExternal, openWhatsApp } from '../../helpers'
import type { SalonProfileController } from '../useSalonProfile'
import { EditIconButton } from './BasicInfoSection'

const WA = '#25D366'
const IG = '#E4405F'
const FB = '#1877F2'

export default function ContactSection({ salon, ctrl }: { salon: SalonModel; ctrl: SalonProfileController }) {
  const [open, setOpen] = useState(false)
  const openFacebook = (url: string) => openExternal(/^https?:\/\//i.test(url) ? url : `https://${url}`)
  return (
    <div>
      <SectionTitleRow title="Contact & Social Media">
        <EditIconButton label="Edit" onClick={() => setOpen(true)} />
      </SectionTitleRow>
      <Card>
        <ContactRow
          icon={Phone}
          label="Phone"
          value={salon.phoneNumber ?? 'Add phone number'}
          placeholder={salon.phoneNumber == null}
          onClick={salon.phoneNumber ? () => makePhoneCall(salon.phoneNumber!) : undefined}
        />
        <hr className="my-3 border-line/60" />
        <ContactRow
          icon={MessageCircle}
          color={WA}
          label="WhatsApp"
          value={salon.whatsappNumber ?? 'Add WhatsApp number'}
          placeholder={salon.whatsappNumber == null}
          onClick={salon.whatsappNumber ? () => openWhatsApp(salon.whatsappNumber!) : undefined}
        />
        <hr className="my-3 border-line/60" />
        <ContactRow
          icon={Camera}
          color={IG}
          label="Instagram"
          value={salon.instagram != null ? `@${salon.instagram}` : 'Add Instagram'}
          placeholder={salon.instagram == null}
          onClick={salon.instagram ? () => openExternal(`https://instagram.com/${salon.instagram!.replace(/@/g, '')}`) : undefined}
        />
        <hr className="my-3 border-line/60" />
        <ContactRow
          icon={Facebook}
          color={FB}
          label="Facebook"
          value={salon.facebook ?? 'Add Facebook page'}
          placeholder={salon.facebook == null}
          onClick={salon.facebook ? () => openFacebook(salon.facebook!) : undefined}
        />
      </Card>
      {open && <EditContactDialog salon={salon} ctrl={ctrl} onClose={() => setOpen(false)} />}
    </div>
  )
}

function ContactRow({
  icon: Icon,
  label,
  value,
  placeholder,
  onClick,
  color = '#6C5CE7',
}: {
  icon: LucideIcon
  label: string
  value: string
  placeholder?: boolean
  onClick?: () => void
  color?: string
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className="flex w-full items-center gap-4 rounded-lg py-1 text-left hover:enabled:bg-inset/60">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-ink/60">{label}</span>
        <span className={placeholder ? 'block truncate text-[15px] italic text-ink/40' : 'block truncate text-[15px] text-ink'}>{value}</span>
      </span>
      {onClick && <ChevronRight size={16} className="text-ink/30" />}
    </Comp>
  )
}

function PrefixedInput({ icon: Icon, color, prefix, children }: { icon: LucideIcon; color?: string; prefix?: string; children: ReactNode }) {
  return (
    <div className="relative flex items-center">
      <Icon size={18} className="pointer-events-none absolute left-4" style={{ color: color ?? 'rgb(var(--muted))' }} />
      {prefix && <span className="pointer-events-none absolute left-11 text-sm text-muted">{prefix}</span>}
      {children}
    </div>
  )
}

function EditContactDialog({ salon, ctrl, onClose }: { salon: SalonModel; ctrl: SalonProfileController; onClose: () => void }) {
  const save = useAction(ctrl.updateContactInfo, { success: 'Contact information updated!', error: 'Failed to update contact info', onSuccess: onClose })
  const [phone, setPhone] = useState(salon.phoneNumber ?? '')
  const [whatsapp, setWhatsapp] = useState(salon.whatsappNumber ?? '')
  const [instagram, setInstagram] = useState(salon.instagram ?? '')
  const [facebook, setFacebook] = useState(salon.facebook ?? '')
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const validate = () => {
    const p = phone.trim()
    return {
      phone: !p ? 'Phone number is required' : !p.startsWith('+') && !p.startsWith('0') ? 'Enter a valid phone number starting with + or 0, e.g. +255 712 345 678' : null,
      facebook: v.url('Facebook page')(facebook.trim() && !/^https?:\/\//i.test(facebook.trim()) ? `https://${facebook.trim()}` : facebook),
    }
  }
  const errors = submitted ? validate() : { phone: null, facebook: null }
  const phoneError = errors.phone

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (save.pending) return
    setSubmitted(true)
    const errs = validate()
    if (errs.phone || errs.facebook) {
      requestAnimationFrame(() => formRef.current && focusFirstInvalid(formRef.current))
      return
    }
    const ig = instagram.trim()
    void save.run({
      phoneNumber: phone.trim(),
      whatsappNumber: whatsapp.trim() ? whatsapp.trim() : null,
      instagram: ig ? ig.replace(/@/g, '') : null,
      facebook: facebook.trim() ? facebook.trim() : null,
    })
  }

  return (
    <Sheet open onClose={() => !save.pending && onClose()} title="Contact & Social Media">
      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Phone Number" required error={phoneError}>
          <PrefixedInput icon={Phone}>
            <input className={fieldClass(phoneError, 'pl-11')} aria-invalid={!!phoneError} inputMode="tel" autoComplete="tel" type="tel" value={phone} placeholder="+255 712 345 678" onChange={(e) => setPhone(e.target.value)} />
          </PrefixedInput>
        </Field>
        <Field label="WhatsApp Number" hint="Same as phone? Tap to copy">
          <PrefixedInput icon={MessageCircle} color={WA}>
            <input className="field px-11" inputMode="tel" type="tel" value={whatsapp} placeholder="+255 712 345 678" onChange={(e) => setWhatsapp(e.target.value)} />
            <button
              type="button"
              title="Copy from phone"
              aria-label="Copy from phone"
              onClick={(e) => {
                e.preventDefault()
                setWhatsapp(phone)
              }}
              className="absolute right-2 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-inset hover:text-ink"
            >
              <Copy size={18} />
            </button>
          </PrefixedInput>
        </Field>
        <Field label="Instagram Username" hint="Without the @ symbol">
          <PrefixedInput icon={Camera} color={IG} prefix="@">
            <input
              className="field pl-[60px]"
              value={instagram}
              placeholder="yoursalon"
              onChange={(e) => setInstagram(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
            />
          </PrefixedInput>
        </Field>
        <Field label="Facebook Page" hint="Full Facebook page URL" error={errors.facebook}>
          <PrefixedInput icon={Facebook} color={FB}>
            <input className={fieldClass(errors.facebook, 'pl-11')} aria-invalid={!!errors.facebook} type="url" value={facebook} placeholder="facebook.com/yoursalon" onChange={(e) => setFacebook(e.target.value)} />
          </PrefixedInput>
        </Field>
        <InfoNote className="!mt-6">Clients can call or message you directly from your salon profile</InfoNote>
        <PrimaryButton type="submit" loading={save.pending}>
          Save Changes
        </PrimaryButton>
      </form>
    </Sheet>
  )
}
