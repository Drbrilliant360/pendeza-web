// Port of features/1_onboarding/presentation/screens/client_profile_setup_screen.dart
import { Camera, Check, Loader2, User } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { useFeedback } from '@/components/feedback'
import { cx, PrimaryButton, Sheet } from '@/components/ui'
import { focusFirstInvalid } from '@/lib/validation'
import { useT } from '@/lib/i18n'
import type { Gender } from '@/lib/models'
import { uploadProfilePicture } from './api'
import { AuthHeader, AuthScaffold, FieldError, PhoneNumberInput, TextInput, validatePhone } from './chrome'

/** Gender chips (Icons.male / female / transgender / do_not_disturb_alt). */
const GENDERS: { value: Gender; key: string; glyph: string }[] = [
  { value: 'male', key: 'onboarding.client.gender_male', glyph: '♂' },
  { value: 'female', key: 'onboarding.client.gender_female', glyph: '♀' },
  { value: 'other', key: 'onboarding.client.gender_other', glyph: '⚧' },
  { value: 'prefer_not_to_say', key: 'onboarding.client.gender_prefer_not_say', glyph: '⊘' },
]

/** Splits a stored phone into the national digits shown in the field. */
function nationalDigits(phone: string) {
  if (phone.startsWith('+255')) return phone.substring(4)
  if (phone.startsWith('255')) return phone.substring(3)
  return phone
}

export default function ClientSetupPage() {
  const t = useT()
  const { toast, toastSuccess, toastError } = useFeedback()
  const { user, status, completeClientProfile } = useAuth()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+255')
  const [gender, setGender] = useState<Gender | null>(null)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [sourceOpen, setSourceOpen] = useState(false)
  const [errors, setErrors] = useState<{ name?: string | null; phone?: string | null; gender?: string | null }>({})
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [saving, setSaving] = useState(false)
  const prefilled = useRef(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const isLoading = uploading || saving || status === 'loading'
  const existingImageUrl = user?.profilePictureUrl ?? null

  // initState: prefill from the profile in ClientProfileSetupRequired
  useEffect(() => {
    if (prefilled.current || !user || user.isGuest) return
    prefilled.current = true
    if (user.fullName && user.fullName !== 'New User') setName(user.fullName)
    if (user.phoneNumber) setPhone(nationalDigits(user.phoneNumber).replace(/\D/g, '').slice(0, 9))
    if (user.gender) setGender(user.gender)
  }, [user])

  useEffect(() => {
    if (!pickedFile) return setPreview(null)
    const url = URL.createObjectURL(pickedFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [pickedFile])

  const onPicked = (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast(t('onboarding.client.photo_error'), 'error')
      return
    }
    setPickedFile(f)
  }

  const validateName = (v: string) => {
    if (!v.trim()) return t('onboarding.client.name_error_empty')
    if (v.trim().length < 2) return t('onboarding.client.name_error_short')
    return null
  }

  const finish = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = { name: validateName(name), phone: validatePhone(phone, t), gender: gender ? null : t('onboarding.client.gender_error') }
    setErrors(e)
    if (e.name || e.phone || e.gender) {
      requestAnimationFrame(() => focusFirstInvalid())
      return
    }
    if (!gender) return
    if (!user || user.isGuest) return
    if (isLoading) return

    let imageUrl: string | null = null
    if (pickedFile) {
      setUploadPct(0)
      setUploading(true)
      try {
        imageUrl = await uploadProfilePicture(user.uid, pickedFile, setUploadPct)
      } catch (err) {
        // Like the app: a failed photo upload doesn't block finishing the profile.
        toastError(err, t('onboarding.client.upload_error'))
        imageUrl = null
      }
      setUploading(false)
    }

    setSaving(true)
    try {
      await completeClientProfile({
        fullName: name.trim(),
        phoneNumber: `${countryCode}${phone.trim()}`,
        gender,
        profilePictureUrl: imageUrl,
      })
      toastSuccess('Profile saved')
    } catch (err) {
      toastError(err, "Couldn't save your profile")
    } finally {
      setSaving(false)
    }
  }

  const avatarSrc = preview ?? existingImageUrl

  return (
    <AuthScaffold
      isLoading={isLoading}
      loadingMessage={uploading ? 'Uploading your photo…' : t('onboarding.client.saving')}
      progress={uploading ? uploadPct : null}
    >
      <form onSubmit={finish} noValidate className="flex flex-col">
        <AuthHeader
          title={t('onboarding.client.title')}
          subtitle={t('onboarding.client.headline')}
          leading={
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-primary/10">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User size={48} className="text-primary" />
                  )}
                </div>
                <button
                  type="button"
                  aria-label={t('onboarding.client.upload_photo')}
                  disabled={isLoading}
                  onClick={() => setSourceOpen(true)}
                  className="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full bg-primary text-white shadow-md1 transition hover:bg-primary-dark disabled:opacity-70"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={18} fill="currentColor" stroke="#6C5CE7" />}
                </button>
              </div>
              <span className="mt-3 text-xs text-ink/65">{t('common.optional')}</span>
            </div>
          }
        />
        <div className="h-8" />

        <TextInput
          label={t('onboarding.client.name_label')}
          placeholder={t('onboarding.client.name_hint')}
          prefixIcon={User}
          autoComplete="name"
          enterKeyHint="next"
          disabled={isLoading}
          required
          value={name}
          error={errors.name}
          onBlur={() => name && setErrors((x) => ({ ...x, name: validateName(name) }))}
          onChange={(e) => {
            setName(e.target.value)
            if (errors.name) setErrors((x) => ({ ...x, name: validateName(e.target.value) }))
          }}
        />
        <div className="h-6" />

        <PhoneNumberInput
          label={t('onboarding.client.phone_label')}
          value={phone}
          onChange={(v) => {
            setPhone(v)
            if (errors.phone) setErrors((x) => ({ ...x, phone: validatePhone(v, t) }))
          }}
          onBlur={() => phone && setErrors((x) => ({ ...x, phone: validatePhone(phone, t) }))}
          required
          countryCode={countryCode}
          onCountryChange={setCountryCode}
          disabled={isLoading}
          error={errors.phone}
        />
        <div className="h-6" />

        <span className="text-sm font-semibold text-ink" id="gender-label">
          {t('onboarding.client.gender_label')}
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        </span>
        <div className="mt-3 flex flex-wrap gap-3" role="group" aria-labelledby="gender-label" data-invalid={errors.gender ? 'true' : undefined}>
          {GENDERS.map((g, i) => {
            const selected = gender === g.value
            return (
              <button
                key={g.value}
                type="button"
                disabled={isLoading}
                aria-pressed={selected}
                aria-invalid={!!errors.gender && i === 0}
                onClick={() => {
                  setGender(selected ? null : g.value)
                  if (errors.gender && !selected) setErrors((x) => ({ ...x, gender: null }))
                }}
                className={cx(
                  'inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3 py-2 text-sm transition disabled:opacity-60',
                  selected ? 'border-2 border-primary bg-primary font-semibold text-white' : cx('border bg-card text-ink hover:border-primary/50', errors.gender ? 'border-danger' : 'border-line'),
                )}
              >
                {selected && <Check size={16} />}
                <span className={cx('text-base leading-none', selected ? 'text-white' : 'text-primary')}>{g.glyph}</span>
                <span>{t(g.key)}</span>
              </button>
            )
          })}
        </div>
        <FieldError error={errors.gender} />
        <div className="h-8" />

        <PrimaryButton type="submit" loading={isLoading} height={56}>
          {t('onboarding.client.button')}
        </PrimaryButton>
      </form>

      {/* Image source action sheet (camera / gallery) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          onPicked(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPicked(e.target.files)
          e.target.value = ''
        }}
      />
      <Sheet open={sourceOpen} onClose={() => setSourceOpen(false)} title={t('common.choose_photo_title')}>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="h-12 rounded-2xl bg-inset font-semibold text-primary hover:bg-primary/10"
            onClick={() => {
              setSourceOpen(false)
              cameraRef.current?.click()
            }}
          >
            {t('common.camera')}
          </button>
          <button
            type="button"
            className="h-12 rounded-2xl bg-inset font-semibold text-primary hover:bg-primary/10"
            onClick={() => {
              setSourceOpen(false)
              galleryRef.current?.click()
            }}
          >
            {t('common.gallery')}
          </button>
          <button type="button" className="mt-2 h-12 rounded-2xl font-semibold text-danger hover:bg-danger/10" onClick={() => setSourceOpen(false)}>
            {t('common.cancel')}
          </button>
        </div>
      </Sheet>
    </AuthScaffold>
  )
}
