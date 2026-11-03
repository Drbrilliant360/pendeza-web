// Port of features/0_auth/presentation/screens/forgot_password.dart
import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { PrimaryButton } from '@/components/ui'
import { focusFirstInvalid } from '@/lib/validation'
import { useT } from '@/lib/i18n'
import { AuthScaffold, TextInput, useGoBack } from './chrome'
import { AppValidators } from './validators'

export default function ForgotPasswordPage() {
  const t = useT()
  const goBack = useGoBack(Routes.login)
  const { toastSuccess, toastError } = useFeedback()
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const err = AppValidators.email(email)
    setError(err)
    if (err) {
      requestAnimationFrame(() => focusFirstInvalid())
      return
    }
    if (loading) return
    setLoading(true)
    try {
      await sendPasswordReset(email.trim())
      toastSuccess(t('auth.forgot_password.email_sent'))
      setLoading(false)
      goBack()
    } catch (e) {
      toastError(e, "Couldn't send the reset email")
      setLoading(false)
    }
  }

  return (
    <AuthScaffold onBack={loading ? undefined : goBack}>
      <form onSubmit={submit} noValidate className="flex flex-col">
        <h1 className="text-center text-[28px] font-bold leading-tight tracking-[-0.4px] text-ink">{t('auth.forgot_password.title')}</h1>
        <p className="mt-3 text-center text-base text-ink/70">{t('auth.forgot_password.description')}</p>
        <div className="h-12" />
        <TextInput
          label={t('auth.login.email_label')}
          placeholder={t('common.email_hint')}
          type="email"
          autoComplete="email"
          disabled={loading}
          required
          value={email}
          onBlur={() => email && setError(AppValidators.email(email))}
          error={error}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(AppValidators.email(e.target.value))
          }}
        />
        <div className="h-8" />
        <PrimaryButton type="submit" loading={loading} height={56}>
          {t('auth.forgot_password.button')}
        </PrimaryButton>
      </form>
    </AuthScaffold>
  )
}
