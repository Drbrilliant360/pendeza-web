// Port of features/0_auth/presentation/screens/login_screen.dart (+ _EmailLoginSheet).
import { Info, Loader2, Lock, Mail, Phone, Scissors, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authRequiredMessage, useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { cx, PrimaryButton, Sheet } from '@/components/ui'
import { focusFirstInvalid } from '@/lib/validation'
import { useT } from '@/lib/i18n'
import { AuthHeader, AuthScaffold, authOutlinedClass, PasswordInput, TextInput } from './chrome'
import { LOGIN_EMAIL_RE } from './validators'

const TERMS_URL = 'https://docs.google.com/document/d/1MbdWiMQFP8vjnL2NDC6jehBy-DKCMYdR96CrJRlmVPc/edit?usp=sharing'
const PRIVACY_URL = 'https://docs.google.com/document/d/18eKQRmv3xQgH23d6tTHGTgKyIWzjxC6rbkxViIrU7PE/edit?usp=sharing'

export default function LoginPage() {
  const t = useT()
  const navigate = useNavigate()
  const { toastError } = useFeedback()
  const { status, authRequired, signInWithGoogle, continueAsGuest } = useAuth()
  const [busy, setBusy] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const isLoading = busy || status === 'loading'

  const google = async () => {
    if (busy) return
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      const code = (e as { code?: string })?.code
      // Closing the Google popup is a deliberate user choice, not an error.
      if (code !== 'cancelled') toastError(e, "Couldn't sign in with Google", () => void google())
    } finally {
      setBusy(false)
    }
  }

  /** Leaving the login screen without signing in → back to guest browsing. */
  const leave = () => {
    continueAsGuest()
    navigate(Routes.clientHome, { replace: true })
  }

  return (
    <AuthScaffold isLoading={isLoading && !emailOpen} loadingMessage={t('auth.login.signing_in')} onBack={leave}>
      <div
        className={cx('flex flex-col transition duration-700 ease-out', shown ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0')}
      >
        <AuthHeader
          title={t('auth.login.title')}
          subtitle={t('auth.login.subtitle')}
          leading={
            <div
              className={cx(
                'rounded-full bg-gradient-to-br from-primary/15 to-accent/10 p-6 shadow-[0_8px_20px_rgba(108,92,231,0.2)] transition-transform duration-500',
                shown ? 'scale-100' : 'scale-0',
              )}
            >
              <Scissors size={80} className="text-primary" />
            </div>
          }
        />

        {status === 'authRequired' && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary-dark dark:text-primary-light">
            <Info size={18} className="shrink-0" />
            <span>{authRequiredMessage(authRequired?.triggeredBy)}</span>
          </div>
        )}

        <div className="h-8" />

        {/* Google Sign In Button (Priority) */}
        <button
          type="button"
          disabled={isLoading}
          onClick={google}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-[1.5px] border-line bg-card py-[18px] shadow-sm1 dark:shadow-none transition hover:brightness-[0.98] disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={24} className="animate-spin text-muted" />
          ) : (
            <img src="/images/icons/google.png" alt="" width={24} height={24} />
          )}
          <span className="text-base font-semibold text-ink">{busy ? 'Signing in…' : 'Continue with Google'}</span>
        </button>

        <div className="h-4" />
        <SecondaryAuthButton icon={Mail} label={t('auth.login.continue_email')} tone="primary" disabled={isLoading} onClick={() => setEmailOpen(true)} />
        <div className="h-4" />
        <SecondaryAuthButton icon={Phone} label={t('auth.login.continue_phone')} tone="accent" disabled={isLoading} onClick={() => navigate(Routes.phoneAuth)} />

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-line" />
          <span className="text-xs text-ink/50">{t('auth.login.no_account')}</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <button type="button" disabled={isLoading} onClick={() => navigate(Routes.signup)} className={authOutlinedClass}>
          {t('auth.login.signup_link')}
        </button>

        <p className="mt-8 flex flex-wrap justify-center gap-1 text-xs text-ink/60">
          <span>By continuing, you agree to our</span>
          <a href={TERMS_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
            Terms
          </a>
          <span>and</span>
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
            Privacy Policy
          </a>
        </p>
      </div>

      <EmailLoginSheet open={emailOpen} onClose={() => setEmailOpen(false)} />
    </AuthScaffold>
  )
}

function SecondaryAuthButton({
  icon: Icon,
  label,
  tone,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  tone: 'primary' | 'accent'
  disabled?: boolean
  onClick: () => void
}) {
  const color = tone === 'primary' ? '#6C5CE7' : '#A29BFE'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border-[1.5px] py-[18px] transition hover:brightness-105 disabled:opacity-60"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent), color-mix(in srgb, ${color} 8%, transparent))`,
      }}
    >
      <Icon size={24} fill="currentColor" strokeWidth={1.5} />
      <span className="text-base font-semibold">{label}</span>
    </button>
  )
}

/** _EmailLoginSheet – stays open on error, closes on success (the redirect then leaves /login). */
function EmailLoginSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const { toastError } = useFeedback()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({})
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => emailRef.current?.focus(), 50)
  }, [open])

  const formRef = useRef<HTMLFormElement>(null)
  const [attempted, setAttempted] = useState(false)
  const rules = {
    email: (v: string) => (!v.trim() ? 'Please enter your email' : !LOGIN_EMAIL_RE.test(v.trim()) ? 'Enter a valid email, e.g. name@example.com' : null),
    password: (v: string) => (!v ? 'Please enter your password' : null),
  }
  const validate = () => {
    const e = { email: rules.email(email), password: rules.password(password) }
    setErrors(e)
    return !e.email && !e.password
  }

  const submit = async (ev?: FormEvent) => {
    ev?.preventDefault()
    if (submitting) return
    setAttempted(true)
    if (!validate()) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current ?? document))
      return
    }
    setSubmitting(true)
    try {
      await signIn(email.trim(), password.trim())
      onClose()
    } catch (e) {
      toastError(e, "Couldn't sign in")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => !submitting && onClose()} title={t('auth.login.email_sheet_title')}>
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col pt-2">
        <TextInput
          ref={emailRef}
          label={t('auth.login.email_label')}
          prefixIcon={Mail}
          type="email"
          autoComplete="email"
          enterKeyHint="next"
          disabled={submitting}
          required
          value={email}
          error={errors.email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (attempted || errors.email) setErrors((x) => ({ ...x, email: rules.email(e.target.value) }))
          }}
          onBlur={() => email && setErrors((x) => ({ ...x, email: rules.email(email) }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              passwordRef.current?.focus()
            }
          }}
        />
        <div className="h-4" />
        <PasswordInput
          ref={passwordRef}
          label={t('auth.login.password_label')}
          prefixIcon={Lock}
          autoComplete="current-password"
          enterKeyHint="done"
          disabled={submitting}
          required
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (attempted || errors.password) setErrors((x) => ({ ...x, password: rules.password(e.target.value) }))
          }}
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              onClose()
              navigate(Routes.forgotPassword)
            }}
            className="min-h-[40px] rounded-lg px-2 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {t('auth.login.forgot_password')}
          </button>
        </div>
        <div className="h-4" />
        <PrimaryButton type="submit" loading={submitting} height={56}>
          {t('auth.login.button')}
        </PrimaryButton>
        <div className="h-4" />
      </form>
    </Sheet>
  )
}
