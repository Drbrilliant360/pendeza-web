// Port of lib/features/3_owner_profile_screen/edit_owner_profile_screen.dart
// (ProfileBloc UpdateProfileImage + UpdateProfileInfo → api.updateProfileImage / updateProfileData).
import { Camera, Image as ImageIcon, Loader2, Phone, User, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { useFeedback } from '@/components/feedback'
import { Avatar, Field, fieldClass, PrimaryButton, ProgressBar, Screen, cx } from '@/components/ui'
import { useT } from '@/lib/i18n'
import type { Gender } from '@/lib/models'
import { focusFirstInvalid, v } from '@/lib/validation'
import { updateProfileData, updateProfileImage } from './api'
import { OwnerAppBar, PickSourceSheet, useBack, useUnsavedChangesWarning } from './components/OwnerChrome'
import { OwnerSalonRoutes } from './paths'
import { compressProfilePicture } from './helpers'

const GENDERS: { value: Gender; key: string }[] = [
  { value: 'male', key: 'onboarding.client.gender_male' },
  { value: 'female', key: 'onboarding.client.gender_female' },
  { value: 'other', key: 'onboarding.client.gender_other' },
  { value: 'prefer_not_to_say', key: 'onboarding.client.gender_prefer_not_say' },
]

export default function EditOwnerProfileScreen() {
  const t = useT()
  const goBack = useBack(OwnerSalonRoutes.profile)
  const { status, user, reloadUser } = useAuth()
  const { toastSuccess, toastError, confirm } = useFeedback()
  const formRef = useRef<HTMLFormElement>(null)

  const [name, setName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phoneNumber ?? '')
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null)
  const [image, setImage] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pickOpen, setPickOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [preparing, setPreparing] = useState(false)

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const dirty =
    !saved && !!user && (image != null || name !== (user.fullName ?? '') || phone !== (user.phoneNumber ?? '') || gender !== (user.gender ?? null))
  useUnsavedChangesWarning(dirty)

  if (status !== 'authenticated' || !user) return null

  const onPicked = async (file: File) => {
    setPreparing(true)
    try {
      const compressed = await compressProfilePicture(file).catch(() => file)
      setImage(compressed)
      setPreview(URL.createObjectURL(compressed))
    } finally {
      setPreparing(false)
    }
  }

  // Errors appear after the first submit and clear live as fields are fixed.
  const validate = () => {
    const n = name.trim()
    return {
      name: !n ? t('onboarding.client.name_error_empty') : n.length < 2 ? t('onboarding.client.name_error_short') : null,
      phone: v.required('Phone number')(phone), // app accepts any non-empty number
    }
  }
  const errors = submitted ? validate() : { name: null, phone: null }

  const back = async () => {
    if (saving) return
    if (dirty) {
      const ok = await confirm({ title: 'Discard changes?', message: 'Your profile changes have not been saved.', confirmText: 'Discard', cancelText: 'Keep editing', destructive: true })
      if (!ok) return
    }
    goBack()
  }

  const onSubmit = async (ev?: FormEvent) => {
    ev?.preventDefault()
    if (saving) return
    setSubmitted(true)
    const errs = validate()
    if (errs.name || errs.phone) {
      requestAnimationFrame(() => formRef.current && focusFirstInvalid(formRef.current))
      return
    }
    setSaving(true)
    try {
      if (image) {
        try {
          setUploadPct(0)
          await updateProfileImage(user.uid, image, (f) => setUploadPct(f * 100))
        } catch (e) {
          toastError(e, 'Failed to upload image', () => void onSubmit())
          return
        } finally {
          setUploadPct(null)
        }
      }
      try {
        await updateProfileData(user.uid, { fullName: name.trim(), phoneNumber: phone.trim(), gender: gender ?? null })
      } catch (e) {
        toastError(e, 'Failed to update profile info', () => void onSubmit())
        return
      }
      await reloadUser().catch((e) => console.error('reloadUser failed', e))
      setSaved(true)
      toastSuccess('Profile updated successfully')
      goBack()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <OwnerAppBar title={t('owner.profile.edit_title')} back onBack={() => void back()} />
      <Screen className="max-w-xl px-4 pt-6 sm:px-6">
        <form ref={formRef} onSubmit={(e) => void onSubmit(e)} noValidate>
          <div className="flex flex-col items-center">
            <button
              type="button"
              disabled={saving || preparing}
              aria-label={t('owner.profile.tap_to_change')}
              onClick={() => setPickOpen(true)}
              className="relative rounded-full"
            >
              {preview ? (
                <img src={preview} alt="" className="h-[120px] w-[120px] rounded-full object-cover" />
              ) : (
                <Avatar url={user.profilePictureUrl} name={user.fullName} size={120} />
              )}
              <span className="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full border-[3px] border-page bg-primary text-white">
                <Camera size={18} />
              </span>
              {((saving && image) || preparing) && (
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
                  <Loader2 size={24} className="animate-spin text-white" />
                </span>
              )}
            </button>
            {uploadPct != null ? (
              <ProgressBar className="mt-3 max-w-[240px]" value={uploadPct} label="Uploading photo…" />
            ) : (
              <p className="mt-2 text-[12.5px] text-ink/60">{t('owner.profile.tap_to_change')}</p>
            )}
          </div>

          <div className="mt-8 space-y-5">
            <Field label={t('onboarding.client.name_label')} required error={errors.name}>
              <IconInput icon={User}>
                <input className={fieldClass(errors.name, 'pl-11')} aria-invalid={!!errors.name} autoComplete="name" value={name} placeholder={t('onboarding.client.name_hint')} onChange={(e) => setName(e.target.value)} />
              </IconInput>
            </Field>
            <Field label={t('onboarding.client.phone_label')} required error={errors.phone}>
              <IconInput icon={Phone}>
                <input className={fieldClass(errors.phone, 'pl-11')} aria-invalid={!!errors.phone} type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder="e.g. 712345678" onChange={(e) => setPhone(e.target.value)} />
              </IconInput>
            </Field>

            <div>
              <p className="mb-1 text-[12.5px] text-ink/60">{t('onboarding.client.gender_label')}</p>
              <div className="rounded-2xl border border-line/40 bg-card p-2">
                {GENDERS.map((g) => (
                  <label key={g.value} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-inset">
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === g.value}
                      onChange={() => setGender(g.value)}
                      className={cx('h-5 w-5 accent-primary')}
                    />
                    <span className="text-[15px] text-ink">{t(g.key)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <PrimaryButton type="submit" className="mt-9" loading={saving} aria-label={saving ? 'Saving…' : undefined}>
            {t('owner.profile.save_changes')}
          </PrimaryButton>
        </form>
      </Screen>

      <PickSourceSheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title={t('common.choose_photo_title')}
        accept="image/*"
        onPicked={(files) => void onPicked(files[0])}
        options={[
          { icon: Camera, title: t('common.camera'), capture: 'user' },
          { icon: ImageIcon, title: t('common.gallery') },
        ]}
      />
    </>
  )
}

function IconInput({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="relative">
      <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      {children}
    </div>
  )
}
