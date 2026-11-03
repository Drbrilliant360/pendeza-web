// Port of features/0_auth/presentation/widgets/auth_chrome.dart plus the shared form widgets
// used by auth/onboarding (text_form_field.dart, phone_number_input_field.dart).
import { AlertCircle, ChevronLeft, Eye, EyeOff, Loader2, type LucideIcon } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { cx, ProgressBar } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useT } from '@/lib/i18n'
import { AuthError } from '@/auth/AuthContext'

/** True when the browser history has an in-app entry to go back to (context.canPop()). */
export function canGoBack() {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === 'number' && idx > 0
}

/** context.pop() with a fallback route for deep links. */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return () => (canGoBack() ? navigate(-1) : navigate(fallback, { replace: true }))
}

/** Snackbar text used by the auth screens: message + recovery hint. */
export function errorText(e: unknown, withHint = true) {
  if (e instanceof AuthError) return withHint && e.recoveryHint ? `${e.message} ${e.recoveryHint}` : e.message
  // Never surface raw Firebase/JS error text.
  const f = friendlyError(e, 'Something went wrong. Please try again.')
  return withHint && f.hint ? `${f.message} ${f.hint}` : f.message
}

/** AuthScaffold – full-screen auth page with optional back button + loading overlay. */
export function AuthScaffold({
  children,
  isLoading,
  loadingMessage,
  progress,
  onBack,
}: {
  children: ReactNode
  isLoading?: boolean
  loadingMessage?: string
  /** 0–100 for a determinate progress bar in the loading overlay (e.g. photo upload). */
  progress?: number | null
  onBack?: () => void
}) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-page">
      {onBack && (
        <div className="px-3 pt-3">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            disabled={isLoading}
            className="grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-ink/5 disabled:opacity-40"
          >
            <ChevronLeft size={26} />
          </button>
        </div>
      )}
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md p-6">{children}</div>
      </div>
      {isLoading && <AuthLoadingOverlay message={loadingMessage} progress={progress} />}
    </div>
  )
}

/** AuthLoadingOverlay – dimmed barrier with loader and status line. */
export function AuthLoadingOverlay({ message, progress }: { message?: string; progress?: number | null }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/50 px-6" aria-busy role="status" aria-live="polite">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-white/10">
        <Loader2 size={48} className="animate-spin text-white" />
      </div>
      {message && <p className="text-center text-base font-semibold text-white">{message}</p>}
      {progress != null && (
        <div className="w-full max-w-xs rounded-2xl bg-card px-4 py-3">
          <ProgressBar value={progress} label="Uploading photo" />
        </div>
      )}
    </div>
  )
}

/** AuthHeader – optional leading widget, centered title + subtitle. */
export function AuthHeader({ title, subtitle, leading }: { title: string; subtitle: string; leading?: ReactNode }) {
  return (
    <div className="flex flex-col">
      {leading && <div className="mb-6 flex justify-center">{leading}</div>}
      <h1 className="text-center text-[28px] font-bold leading-tight tracking-[-0.4px] text-ink">{title}</h1>
      <p className="mt-2 text-center text-base text-ink/65">{subtitle}</p>
    </div>
  )
}

/** Inline field label with optional required asterisk. */
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="mb-1.5 block text-[13px] font-semibold text-ink">
      {label}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      )}
    </span>
  )
}

/** Inline "how to fix it" error under a field. */
export function FieldError({ error }: { error?: string | null }) {
  if (!error) return null
  return (
    <span className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger" role="alert">
      <AlertCircle size={14} className="mt-px shrink-0" />
      {error}
    </span>
  )
}

/** authOutlinedButtonStyle */
export const authOutlinedClass =
  'flex w-full items-center justify-center rounded-2xl border-[1.5px] border-primary/30 py-4 text-base font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-60'

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | null
  prefixIcon?: LucideIcon
  suffix?: ReactNode
}

/** CustomTextFormField – labelled input with optional prefix icon / suffix and error text. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, prefixIcon: Icon, suffix, className, required, ...rest },
  ref,
) {
  const cls = cx('field', Icon && 'pl-11', suffix && 'pr-12', error && 'field-invalid border-danger focus:border-danger focus:ring-danger/20', className)
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <div className="relative">
        {Icon && <Icon size={20} className="pointer-events-none absolute left-4 top-[14px] text-muted" />}
        <input ref={ref} className={cls} aria-invalid={!!error} aria-required={required || undefined} {...rest} />
        {suffix && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      <FieldError error={error} />
    </label>
  )
})

/** Multi-line variant of TextInput (maxLines: 2). */
export function TextAreaInput({
  label,
  error,
  prefixIcon: Icon,
  className,
  required,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string | null; prefixIcon?: LucideIcon }) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <div className="relative">
        {Icon && <Icon size={20} className="pointer-events-none absolute left-4 top-[14px] text-muted" />}
        <textarea
          rows={2}
          className={cx('field resize-none', Icon && 'pl-11', error && 'field-invalid border-danger focus:border-danger focus:ring-danger/20', className)}
          aria-invalid={!!error}
          aria-required={required || undefined}
          {...rest}
        />
      </div>
      <FieldError error={error} />
    </label>
  )
}

/** Password field with the visibility toggle used by login / signup. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<TextInputProps, 'type' | 'suffix'>>(function PasswordInput(props, ref) {
  const [obscured, setObscured] = useState(true)
  return (
    <TextInput
      ref={ref}
      {...props}
      type={obscured ? 'password' : 'text'}
      suffix={
        <button
          type="button"
          tabIndex={-1}
          aria-label={obscured ? 'Show password' : 'Hide password'}
          onClick={() => setObscured((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink"
        >
          {obscured ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      }
    />
  )
})

// ── PhoneNumberInputField ───────────────────────────────────────────────────
/** Country codes offered by the picker (country_code_picker, TZ favourite first). */
export const COUNTRY_CODES = [
  { code: 'TZ', dial: '+255', flag: '🇹🇿' },
  { code: 'KE', dial: '+254', flag: '🇰🇪' },
  { code: 'UG', dial: '+256', flag: '🇺🇬' },
  { code: 'RW', dial: '+250', flag: '🇷🇼' },
  { code: 'BI', dial: '+257', flag: '🇧🇮' },
  { code: 'CD', dial: '+243', flag: '🇨🇩' },
  { code: 'MZ', dial: '+258', flag: '🇲🇿' },
  { code: 'MW', dial: '+265', flag: '🇲🇼' },
  { code: 'ZM', dial: '+260', flag: '🇿🇲' },
  { code: 'ZA', dial: '+27', flag: '🇿🇦' },
  { code: 'NG', dial: '+234', flag: '🇳🇬' },
  { code: 'AE', dial: '+971', flag: '🇦🇪' },
  { code: 'GB', dial: '+44', flag: '🇬🇧' },
  { code: 'US', dial: '+1', flag: '🇺🇸' },
  { code: 'IN', dial: '+91', flag: '🇮🇳' },
]

/** PhoneNumberInputField validator (digits only, 9 digits, starts with 6 or 7). */
export function validatePhone(value: string, t: (k: string) => string): string | null {
  if (!value) return t('common.phone_required')
  if (value.length !== 9) return t('common.phone_error_length')
  if (!value.startsWith('6') && !value.startsWith('7')) return t('common.phone_error_prefix')
  return null
}

export function PhoneNumberInput({
  value,
  onChange,
  countryCode,
  onCountryChange,
  error,
  disabled,
  label,
  autoFocus,
  required,
  onBlur,
}: {
  value: string
  onChange: (digits: string) => void
  countryCode: string
  onCountryChange: (dial: string) => void
  error?: string | null
  disabled?: boolean
  label?: string
  autoFocus?: boolean
  required?: boolean
  onBlur?: () => void
}) {
  const t = useT()
  return (
    <label className="block">
      <FieldLabel label={label ?? t('onboarding.client.phone_label')} required={required} />
      <div
        className={cx(
          'flex items-stretch overflow-hidden rounded-2xl border bg-card transition focus-within:ring-2',
          error ? 'border-danger focus-within:ring-danger/20' : 'border-line focus-within:border-primary focus-within:ring-primary/20',
          disabled && 'opacity-60',
        )}
      >
        <select
          aria-label="Country code"
          value={countryCode}
          disabled={disabled}
          onChange={(e) => onCountryChange(e.target.value)}
          className="border-r border-line bg-transparent pl-3 pr-1 text-sm text-ink outline-none"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.dial}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder="712345678"
          aria-invalid={!!error}
          aria-required={required || undefined}
          onBlur={onBlur}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/70"
        />
      </div>
      <FieldError error={error} />
    </label>
  )
}
