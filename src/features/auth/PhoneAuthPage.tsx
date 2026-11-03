// Port of features/0_auth/presentation/screens/phone_auth_screen.dart
import { Smartphone } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { PrimaryButton } from '@/components/ui'
import { focusFirstInvalid } from '@/lib/validation'
import { useT } from '@/lib/i18n'
import { AuthHeader, AuthScaffold, PhoneNumberInput, useGoBack, validatePhone } from './chrome'

export interface OtpRouteState {
  sessionId: string
  phoneNumber: string
}

export default function PhoneAuthPage() {
  const t = useT()
  const navigate = useNavigate()
  const goBack = useGoBack(Routes.login)
  const { toastError } = useFeedback()
  const { status, requestPhoneOtp } = useAuth()
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+255') // Default to Tanzania
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isLoading = busy || status === 'loading'

  const sendOtp = async (ev: FormEvent) => {
    ev.preventDefault()
    const err = validatePhone(phone, t)
    setError(err)
    if (err) {
      requestAnimationFrame(() => focusFirstInvalid())
      return
    }
    const phoneNumber = countryCode + phone.trim()
    if (busy) return
    setBusy(true)
    try {
      const sessionId = await requestPhoneOtp(phoneNumber)
      const state: OtpRouteState = { sessionId, phoneNumber }
      // When this screen is shown as the /otp fallback, replace instead of stacking.
      navigate(Routes.otp, { state, replace: window.location.pathname === Routes.otp })
    } catch (e) {
      toastError(e, "Couldn't send the verification code")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScaffold isLoading={isLoading} loadingMessage={t('auth.phone.sending')} onBack={goBack}>
      <form onSubmit={sendOtp} noValidate className="flex flex-col">
        <AuthHeader
          title={t('auth.phone.title')}
          subtitle={t('auth.phone.description')}
          leading={<Smartphone size={80} className="text-primary" />}
        />
        <div className="h-8" />
        <PhoneNumberInput
          value={phone}
          onChange={(v) => {
            setPhone(v)
            if (error) setError(validatePhone(v, t))
          }}
          onBlur={() => phone && setError(validatePhone(phone, t))}
          required
          countryCode={countryCode}
          onCountryChange={setCountryCode}
          error={error}
          autoFocus
        />
        <div className="h-8" />
        <PrimaryButton type="submit" loading={isLoading} height={56}>
          {t('auth.phone.button')}
        </PrimaryButton>
      </form>
    </AuthScaffold>
  )
}
