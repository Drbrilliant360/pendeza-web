// Port of features/0_auth/presentation/screens/signup_screen.dart
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { PrimaryButton } from '@/components/ui'
import { focusFirstInvalid } from '@/lib/validation'
import { useT } from '@/lib/i18n'
import { AuthHeader, AuthScaffold, PasswordInput, TextInput, useGoBack } from './chrome'
import { AppValidators } from './validators'

export default function SignupPage() {
  const t = useT()
  const navigate = useNavigate()
  const goBack = useGoBack(Routes.login)
  const { toastSuccess, toastError } = useFeedback()
  const { status, signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  // Form autovalidates (onUserInteraction) only after the first submit attempt.
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const isLoading = busy || status === 'loading'

  const errors = {
    name: AppValidators.notEmpty(name),
    email: AppValidators.email(email),
    password: AppValidators.password(password),
    confirm: AppValidators.valuesMatch(confirm, password, 'Passwords do not match'),
  }
  const [blurred, setBlurred] = useState<Record<string, boolean>>({})
  const show = (e: string | null, key?: string) => (touched || (key && blurred[key]) ? e : null)
  const blur = (key: string) => () => setBlurred((b) => ({ ...b, [key]: true }))

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    setTouched(true)
    if (errors.name || errors.email || errors.password || errors.confirm) {
      requestAnimationFrame(() => focusFirstInvalid())
      return
    }
    if (busy) return
    setBusy(true)
    try {
      await signUp(name.trim(), email.trim(), password.trim())
      toastSuccess('Account created')
    } catch (e) {
      toastError(e, "Couldn't create your account")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScaffold isLoading={isLoading} loadingMessage={t('auth.signup.creating')} onBack={goBack}>
      <form onSubmit={submit} noValidate className="flex flex-col">
        <AuthHeader title={t('auth.signup.title')} subtitle={t('auth.signup.subtitle')} />
        <div className="h-8" />
        <TextInput
          label={t('auth.signup.name_label')}
          placeholder={t('auth.signup.name_hint')}
          autoComplete="name"
          disabled={isLoading}
          value={name}
          required
          error={show(errors.name, 'name')}
          onBlur={blur('name')}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="h-6" />
        <TextInput
          label={t('auth.signup.email_label')}
          placeholder={t('common.email_hint')}
          type="email"
          autoComplete="email"
          disabled={isLoading}
          value={email}
          required
          error={show(errors.email, 'email')}
          onBlur={blur('email')}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="h-6" />
        <PasswordInput
          label={t('auth.signup.password_label')}
          autoComplete="new-password"
          disabled={isLoading}
          value={password}
          required
          error={show(errors.password, 'password')}
          onBlur={blur('password')}
          onChange={(e) => setPassword(e.target.value)}
        />
        {!show(errors.password, 'password') && (
          <p className="t-caption mt-1 text-xs">At least 8 characters, with upper- and lower-case letters, a number and a symbol (@$!%*?&).</p>
        )}
        <div className="h-6" />
        <PasswordInput
          label={t('auth.signup.confirm_password_label')}
          autoComplete="new-password"
          disabled={isLoading}
          value={confirm}
          required
          error={show(errors.confirm, 'confirm')}
          onBlur={blur('confirm')}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <div className="h-8" />
        <PrimaryButton type="submit" loading={isLoading} height={56}>
          {t('auth.signup.button')}
        </PrimaryButton>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1 text-sm text-ink">
          <span>{t('auth.signup.have_account')}</span>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => navigate(Routes.login)}
            className="min-h-[40px] rounded-lg px-2 py-1.5 font-bold text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {t('auth.signup.signin_link')}
          </button>
        </div>
      </form>
    </AuthScaffold>
  )
}
