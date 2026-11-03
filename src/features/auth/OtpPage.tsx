// Port of features/0_auth/presentation/screens/otp_screen.dart (+ the /otp route builder:
// without a sessionId in navigation state the phone-auth screen is shown instead).
import { ShieldCheck, Timer, TimerOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthError, useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { cx, PrimaryButton } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { AuthHeader, AuthScaffold, useGoBack } from './chrome'
import PhoneAuthPage, { type OtpRouteState } from './PhoneAuthPage'

const CODE_LIFETIME = 120 // 2 minutes
const RESEND_COOLDOWN = 30
const PIN_COUNT = 6

const verificationExpired = () =>
  new AuthError(
    'Verification code has expired. Please request a new code.',
    'session-expired',
    'Tap "Resend Code" to get a new verification code',
  )

export default function OtpRoute() {
  const { state } = useLocation() as { state?: Partial<OtpRouteState> | null }
  const sessionId = state?.sessionId ?? ''
  if (!sessionId) return <PhoneAuthPage />
  return <OtpScreen key={sessionId} sessionId={sessionId} phoneNumber={state?.phoneNumber ?? ''} />
}

const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function OtpScreen({ sessionId: initialSessionId, phoneNumber }: { sessionId: string; phoneNumber: string }) {
  const t = useT()
  const goBack = useGoBack(Routes.phoneAuth)
  const { toastSuccess, toastError } = useFeedback()
  const { status, verifyPhoneOtp, requestPhoneOtp } = useAuth()

  /** Latest Briq session id; updated when a new code is sent (including resend). */
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [code, setCode] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)

  const [expiresAt, setExpiresAt] = useState(() => Date.now() + CODE_LIFETIME * 1000)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const inputRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)

  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000))
  const isExpired = remainingSeconds <= 0
  const resendCooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const isLoading = busy || status === 'loading'

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const shake = () => {
    pinRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(8px)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 500, easing: 'ease-in' },
    )
  }

  const showError = useCallback(
    (e: unknown) => {
      shake()
      toastError(e)
    },
    [toastError],
  )

  const verify = async (pin = code) => {
    // Pinput validator (autovalidate on submit)
    if (isExpired) {
      setPinError(t('auth.otp.expired'))
      showError(verificationExpired())
      return
    }
    if (pin.length !== PIN_COUNT) {
      setPinError(t('auth.otp.incomplete'))
      return
    }
    setPinError(null)
    if (busy) return
    setBusy(true)
    try {
      await verifyPhoneOtp(sessionId, pin, phoneNumber || undefined)
    } catch (e) {
      showError(e)
      setCode('')
      setTimeout(() => inputRef.current?.focus(), 0)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (resendCooldown > 0 || isLoading) return
    setCode('')
    setPinError(null)
    setBusy(true)
    try {
      const newSession = await requestPhoneOtp(phoneNumber)
      setSessionId(newSession)
      const n = Date.now()
      setNow(n)
      setExpiresAt(n + CODE_LIFETIME * 1000)
      setCooldownUntil(n + RESEND_COOLDOWN * 1000)
      toastSuccess(t('auth.otp.code_sent'))
    } catch (e) {
      if (e instanceof AuthError && e.cooldownSeconds) setCooldownUntil(Date.now() + e.cooldownSeconds * 1000)
      showError(e)
    } finally {
      setBusy(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const timerColor = isExpired ? '#FF6B6B' : remainingSeconds <= 30 ? '#F5A623' : '#6C5CE7'
  const canResend = resendCooldown === 0 && !isLoading

  return (
    <AuthScaffold isLoading={isLoading} loadingMessage={t('auth.otp.verifying')} onBack={goBack}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void verify()
        }}
        className="flex flex-col"
      >
        <AuthHeader
          title={t('auth.otp.title')}
          subtitle={t('auth.otp.description', [phoneNumber])}
          leading={<ShieldCheck size={80} className={isExpired ? 'text-danger' : 'text-primary'} />}
        />
        <div className="h-6" />

        {/* Countdown timer */}
        <div className="flex justify-center">
          <div
            className="inline-flex items-center gap-2 rounded-[20px] px-4 py-2 text-sm font-semibold"
            style={{ color: timerColor, background: `color-mix(in srgb, ${timerColor} 10%, transparent)` }}
          >
            {isExpired ? <TimerOff size={20} /> : <Timer size={20} />}
            <span>{isExpired ? t('auth.otp.expired') : t('auth.otp.expires_in', [formatTime(remainingSeconds)])}</span>
          </div>
        </div>

        <div className="h-8" />

        {/* PIN input */}
        <div ref={pinRef}>
          <div className="relative mx-auto flex w-full max-w-[384px] justify-center gap-2">
            {Array.from({ length: PIN_COUNT }, (_, i) => {
              const ch = code[i]
              const active = focused && !isLoading && !isExpired && i === Math.min(code.length, PIN_COUNT - 1)
              return (
                <div
                  key={i}
                  className={cx(
                    'grid aspect-[56/60] w-full max-w-[56px] place-items-center rounded-xl border bg-card text-2xl font-semibold text-ink transition',
                    pinError
                      ? 'border-2 border-danger'
                      : active
                        ? cx('border-2', isExpired ? 'border-danger' : 'border-primary')
                        : ch
                          ? 'border-primary bg-primary/10'
                          : 'border-line',
                    (isLoading || isExpired) && 'opacity-60',
                  )}
                >
                  {ch ?? (active ? <span className="h-6 w-0.5 animate-pulse rounded bg-primary" /> : '')}
                </div>
              )
            })}
            <input
              ref={inputRef}
              aria-label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={PIN_COUNT}
              disabled={isLoading || isExpired}
              value={code}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, PIN_COUNT)
                setCode(v)
                if (pinError) setPinError(null)
                if (v.length === PIN_COUNT) void verify(v)
              }}
              className="absolute inset-0 h-full w-full cursor-text opacity-0"
            />
          </div>
          {pinError && <p className="mt-2 text-center text-xs text-danger">{pinError}</p>}
        </div>

        <div className="h-8" />

        <PrimaryButton type="submit" loading={isLoading} disabled={isExpired} height={56}>
          {isExpired ? t('auth.otp.expired') : t('auth.otp.button')}
        </PrimaryButton>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1 text-sm text-ink">
          <span>{t('auth.otp.didnt_receive')}</span>
          <button
            type="button"
            disabled={!canResend}
            onClick={resend}
            className={cx('min-h-[40px] rounded-lg px-2 py-1.5 font-bold', canResend ? 'text-primary hover:bg-primary/10' : 'text-muted')}
          >
            {resendCooldown > 0 ? t('auth.otp.resend_in', [resendCooldown]) : t('auth.otp.resend_action')}
          </button>
        </div>

        <p className="mt-2 text-center text-xs text-ink/65">{t('auth.otp.helper')}</p>
      </form>
    </AuthScaffold>
  )
}
