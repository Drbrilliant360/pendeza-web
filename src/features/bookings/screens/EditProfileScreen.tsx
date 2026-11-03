// Port of 2_client_profile/presentation/screens/edit_profile_screen.dart
// (web extra: tapping the avatar uploads a new picture, same Storage path as the profile hero).
import { Camera, Check, Loader2, Phone, User } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useAction, useFeedback } from '@/components/feedback'
import { useGoBack } from '@/features/auth/chrome'
import { check, focusFirstInvalid, v } from '@/lib/validation'
import { Avatar, Card, cx, Field, fieldClass, FormErrorSummary, PageHeader, PrimaryButton } from '@/components/ui'
import { useT } from '@/lib/i18n'
import type { Gender, UserModel } from '@/lib/models'
import { updateProfileData } from '../api'
import { useAvatarUpload } from '../components/useAvatarUpload'

const GENDERS: { value: Gender; key: string }[] = [
  { value: 'male', key: 'onboarding.client.gender_male' },
  { value: 'female', key: 'onboarding.client.gender_female' },
  { value: 'other', key: 'onboarding.client.gender_other' },
  { value: 'prefer_not_to_say', key: 'onboarding.client.gender_prefer_not_say' },
]

export default function EditProfileScreen() {
  const { status, user } = useAuth()
  if (status !== 'authenticated' || !user) return null
  return <EditProfileForm user={user} />
}

function EditProfileForm({ user }: { user: UserModel }) {
  const t = useT()
  const goBack = useGoBack(Routes.clientProfile)
  const { reloadUser } = useAuth()
  const { confirm } = useFeedback()
  const avatar = useAvatarUpload(user.uid)
  const formRef = useRef<HTMLFormElement>(null)
  const [name, setName] = useState(user.fullName)
  const [phone, setPhone] = useState(user.phoneNumber ?? '')
  const [gender, setGender] = useState<Gender | null>(user.gender)
  const [touched, setTouched] = useState<{ name?: boolean; phone?: boolean }>({})
  const [submitted, setSubmitted] = useState(false)

  // Same rules as the app (both required), with "how to fix" wording.
  const errors = {
    name: check(name, v.required(t('client.edit_profile.full_name')), v.minLength(t('client.edit_profile.full_name'), 2)),
    phone: check(phone, v.required(t('client.edit_profile.phone'))),
  }
  const shown = {
    name: submitted || touched.name ? errors.name : null,
    phone: submitted || touched.phone ? errors.phone : null,
  }
  const dirty = name !== user.fullName || phone !== (user.phoneNumber ?? '') || gender !== user.gender

  const saveAction = useAction(
    async () => {
      await updateProfileData(user.uid, { fullName: name.trim(), phoneNumber: phone.trim(), gender })
      await reloadUser()
    },
    { success: 'Profile updated successfully', error: 'Failed to update profile info', onSuccess: () => goBack() },
  )

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty || saveAction.pending) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, saveAction.pending])

  const back = async () => {
    if (dirty && !saveAction.pending) {
      const ok = await confirm({
        title: 'Discard changes?',
        message: 'Your profile changes have not been saved.',
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        destructive: true,
      })
      if (!ok) return
    }
    goBack()
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (saveAction.pending) return
    setSubmitted(true)
    if (errors.name || errors.phone) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current ?? document))
      return
    }
    void saveAction.run()
  }

  return (
    <div className="min-h-dvh bg-page pb-8">
      {avatar.element}
      <div className="mx-auto max-w-2xl">
        <PageHeader title={t('client.edit_profile.title')} onBack={() => void back()} />
        <form ref={formRef} onSubmit={save} noValidate className="px-5 pt-[22px]">
          <div className="flex flex-col items-center">
            <button type="button" onClick={avatar.pick} disabled={avatar.uploading} className="relative rounded-full bg-brand-gradient p-1 shadow-[0_8px_20px_-4px_rgba(108,92,231,0.35)]" aria-label="Change profile picture">
              <span className="block rounded-full bg-page p-[3px]">
                <Avatar url={user.profilePictureUrl} name={user.fullName} size={92} />
              </span>
              {avatar.uploading ? (
                <span className="absolute inset-1 grid place-items-center rounded-full bg-black/45">
                  <Loader2 className="animate-spin text-white" size={28} />
                </span>
              ) : (
                <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-card text-primary shadow">
                  <Camera size={14} fill="currentColor" />
                </span>
              )}
            </button>
            {avatar.uploading && <div className="mt-3 w-full max-w-[260px]">{avatar.progressBar}</div>}
            <p className="t-title mt-3 max-w-full truncate">{user.fullName}</p>
            <p className="t-caption mt-0.5">{user.email}</p>
          </div>

          <Card radius={24} className="mt-6 !p-[18px]">
            <Field label={t('client.edit_profile.full_name')} error={shown.name} required>
              <IconInput icon={<User size={18} />}>
                <input
                  className={fieldClass(shown.name, 'pl-11')}
                  aria-invalid={!!shown.name}
                  aria-required
                  disabled={saveAction.pending}
                  value={name}
                  placeholder={t('client.edit_profile.name_hint')}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((x) => ({ ...x, name: true }))}
                  autoComplete="name"
                />
              </IconInput>
            </Field>
            <Field className="mt-[18px]" label={t('client.edit_profile.phone')} error={shown.phone} required>
              <IconInput icon={<Phone size={18} />}>
                <input
                  className={fieldClass(shown.phone, 'pl-11')}
                  aria-invalid={!!shown.phone}
                  aria-required
                  disabled={saveAction.pending}
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  placeholder={t('client.edit_profile.phone_hint')}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setTouched((x) => ({ ...x, phone: true }))}
                  autoComplete="tel"
                />
              </IconInput>
            </Field>
          </Card>

          <p className="t-label mt-[22px]">{t('client.edit_profile.gender')}</p>
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {GENDERS.map((g) => {
              const sel = gender === g.value
              return (
                <button
                  key={g.value}
                  type="button"
                  aria-pressed={sel}
                  disabled={saveAction.pending}
                  onClick={() => setGender(g.value)}
                  className={cx(
                    'flex items-center gap-1.5 rounded-full px-[18px] py-[11px] text-[13.5px] transition',
                    sel ? 'bg-brand-gradient font-bold text-white' : 'border border-line bg-card font-semibold text-ink hover:border-primary/40',
                  )}
                >
                  {sel && <Check size={15} strokeWidth={3} />}
                  {t(g.key)}
                </button>
              )
            })}
          </div>

          {submitted && <FormErrorSummary className="mt-6" errors={[errors.name, errors.phone]} />}
          <PrimaryButton type="submit" icon={Check} loading={saveAction.pending} className="mt-8">
            {t('client.edit_profile.save')}
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}

function IconInput({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">{icon}</span>
      {children}
    </div>
  )
}
