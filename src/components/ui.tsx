// Port of lib/shared/widgets/client_ui.dart (+ common widgets: loading, avatar, rating stars,
// bottom sheet/modal). Use these everywhere so screens look like the mobile app.
import clsx from 'clsx'
import { AlertCircle, ArrowRight, Check, ChevronLeft, Loader2, RefreshCw, Star, WifiOff, X, type LucideIcon } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { initials } from '@/lib/format'

export const cx = clsx

/** ClientPalette.tones */
export const TONES = ['#6C5CE7', '#FF7A90', '#00B894', '#F5A623', '#4DA3FF', '#B57BFF']
export const toneAt = (i: number) => TONES[((i % TONES.length) + TONES.length) % TONES.length]
export const toneForKey = (key: string) => toneAt([...key].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length)

// ── Hero ─────────────────────────────────────────────────────────────────────
/** ClientBrandHero – gradient panel with soft glows. */
export function BrandHero({
  children,
  className,
  radius = 30,
  padded = true,
}: {
  children: ReactNode
  className?: string
  radius?: number
  padded?: boolean
}) {
  return (
    <div
      className={cx('relative overflow-hidden bg-hero-light text-white shadow-hero dark:bg-hero-dark dark:shadow-none', className)}
      style={{ borderRadius: radius }}
    >
      <Glow className="-right-[50px] -top-[60px]" size={220} color="rgba(255,255,255,0.16)" />
      <Glow className="-bottom-[90px] -left-[70px]" size={240} color="rgba(162,155,254,0.30)" />
      <Glow className="-bottom-[40px] right-10" size={120} color="rgba(250,177,160,0.18)" />
      <div className={cx('relative', padded && 'p-5')}>{children}</div>
    </div>
  )
}
function Glow({ className, size, color }: { className: string; size: number; color: string }) {
  return (
    <div
      aria-hidden
      className={cx('pointer-events-none absolute rounded-full', className)}
      style={{ width: size, height: size, background: `radial-gradient(circle, ${color}, transparent 70%)` }}
    />
  )
}

/** GlassCircleButton – translucent white circle used on the hero. */
export function GlassCircleButton({
  icon: Icon,
  onClick,
  label,
  badge = 0,
  size = 46,
}: {
  icon: LucideIcon
  onClick?: () => void
  label: string
  badge?: number
  size?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative grid shrink-0 place-items-center rounded-full border border-white/30 bg-white/20 text-white transition hover:bg-white/30 active:scale-95"
      style={{ width: size, height: size }}
    >
      <Icon size={21} />
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-primary bg-danger px-1 text-[10px] font-bold leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

/** True when there's an in-app page to go back to (false on deep links / new tabs). */
export const canGoBack = () => ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0

/** ClientPageHeader – compact brand header for pushed screens. */
export function PageHeader({
  title,
  subtitle,
  actions,
  onBack,
  showBack = true,
  className,
}: {
  title: string
  subtitle?: string | null
  actions?: ReactNode
  onBack?: () => void
  showBack?: boolean
  className?: string
}) {
  const navigate = useNavigate()
  const back = onBack ?? (() => (canGoBack() ? navigate(-1) : navigate('/')))
  return (
    <BrandHero radius={28} padded={false} className={cx('mx-4 mt-2', className)}>
      <div className={cx('flex items-center gap-3 py-3.5 pr-3.5', showBack ? 'pl-3.5' : 'pl-5')}>
        {showBack && <GlassCircleButton icon={ChevronLeft} size={42} label="Back" onClick={back} />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-[12.5px] text-white/85">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </BrandHero>
  )
}

// ── Buttons ──────────────────────────────────────────────────────────────────
/** ClientPrimaryButton – gradient CTA with spinner + disabled state. */
export function PrimaryButton({
  children,
  icon: Icon,
  loading,
  disabled,
  className,
  height = 54,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon; loading?: boolean; height?: number }) {
  const enabled = !disabled && !loading
  const active = enabled || loading
  return (
    <button
      {...rest}
      disabled={!enabled}
      aria-busy={loading || undefined}
      className={cx(
        'flex w-full items-center justify-center gap-2 rounded-[18px] px-3 text-[13.5px] font-bold tracking-[0.2px] transition',
        active ? 'bg-brand-gradient text-white shadow-cta hover:brightness-105 active:scale-[0.99]' : 'bg-ink/10 text-muted',
        className,
      )}
      style={{ height }}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={22} />
      ) : (
        <>
          <span className="truncate">{children}</span>
          {Icon && <Icon size={18} />}
        </>
      )}
    </button>
  )
}

/** SecondaryButton / OutlinedButton equivalent */
export function SecondaryButton({
  children,
  icon: Icon,
  className,
  loading,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'flex h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-card px-5 text-sm font-semibold text-ink transition hover:border-primary/50 hover:text-primary disabled:opacity-50',
        className,
      )}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : Icon && <Icon size={18} />}
      {children}
    </button>
  )
}

/** FilledButton (solid primary). `loading` shows a spinner and blocks repeat clicks. */
export function FilledButton({ children, className, loading, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-[14.5px] font-bold text-white transition hover:bg-primary-dark disabled:opacity-50',
        className,
      )}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  )
}

// ── Surfaces ─────────────────────────────────────────────────────────────────
/** ClientCard */
export function Card({
  children,
  className,
  onClick,
  radius = 22,
  style,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  radius?: number
  style?: CSSProperties
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'block w-full border border-line/60 bg-card p-4 text-left shadow-sm1 dark:border-line dark:shadow-none',
        onClick && 'transition hover:border-primary/40 active:scale-[0.995]',
        className,
      )}
      style={{ borderRadius: radius, ...style }}
    >
      {children}
    </Comp>
  )
}

/** ClientIconTile – rounded square icon holder. */
export function IconTile({ icon: Icon, color = '#6C5CE7', size = 44, solid = false }: { icon: LucideIcon; color?: string; size?: number; solid?: boolean }) {
  const radius = size * 0.32
  if (solid) {
    return (
      <div
        className="grid shrink-0 place-items-center text-white"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: `linear-gradient(135deg, color-mix(in srgb, ${color} 82%, white), color-mix(in srgb, ${color} 88%, black))`,
          boxShadow: `0 5px 12px -3px color-mix(in srgb, ${color} 35%, transparent)`,
        }}
      >
        <Icon size={size * 0.48} />
      </div>
    )
  }
  return (
    <div
      className="grid shrink-0 place-items-center"
      style={{ width: size, height: size, borderRadius: radius, background: `color-mix(in srgb, ${color} 13%, transparent)`, color }}
    >
      <Icon size={size * 0.5} />
    </div>
  )
}

/** ClientPill */
export function Pill({ label, color = '#6C5CE7', icon: Icon, onDark, className }: { label: ReactNode; color?: string; icon?: LucideIcon; onDark?: boolean; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11px] font-bold tracking-[0.2px]',
        onDark && 'border border-white/30 bg-white/20 text-white',
        className,
      )}
      style={onDark ? undefined : { background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      {Icon && <Icon size={12} />}
      <span className="truncate">{label}</span>
    </span>
  )
}

/** ClientSectionHeader */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  trailing,
  className,
}: {
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-end gap-2 px-5', className)}>
      <div className="min-w-0 flex-1">
        <h2 className="t-title truncate">{title}</h2>
        {subtitle && <p className="t-caption mt-0.5">{subtitle}</p>}
      </div>
      {trailing}
      {actionLabel && onAction && (
        <button onClick={onAction} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-primary-dark hover:bg-primary/10 dark:text-primary-light">
          {actionLabel}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}

/** ClientEmptyState */
export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  color = '#6C5CE7',
  className,
}: {
  icon: LucideIcon
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  color?: string
  className?: string
}) {
  return (
    <div className={cx('flex justify-center px-8 py-10', className)}>
      <div className="flex max-w-[340px] flex-col items-center text-center">
        <div
          className="grid h-[116px] w-[116px] place-items-center rounded-full"
          style={{ background: `radial-gradient(circle, color-mix(in srgb, ${color} 22%, transparent), color-mix(in srgb, ${color} 4%, transparent))` }}
        >
          <IconTile icon={icon} color={color} size={64} solid />
        </div>
        <h3 className="t-title mt-[22px]">{title}</h3>
        {message && <p className="t-caption mt-2 text-[13.5px] leading-relaxed">{message}</p>}
        {actionLabel && onAction && (
          <FilledButton className="mt-[22px]" onClick={onAction}>
            {actionLabel}
          </FilledButton>
        )}
      </div>
    </div>
  )
}

/** ClientSegmentedTabs */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cx('flex rounded-[18px] border border-line/60 bg-inset p-1 dark:border-line', className)} role="tablist">
      {tabs.map((t) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={cx(
              'h-[42px] flex-1 truncate rounded-[14px] px-2 text-[13.5px] transition',
              on ? 'bg-card font-bold text-primary-dark shadow-sm1 dark:text-primary-light' : 'font-medium text-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Misc widgets ─────────────────────────────────────────────────────────────
export function Spinner({ size = 28, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cx('animate-spin text-primary', className)} />
}

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <Spinner />
      {message && <p className="t-caption">{message}</p>}
    </div>
  )
}

/** Shimmer placeholder block */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cx('animate-pulse rounded-2xl bg-ink/[0.07]', className)} style={style} />
}

/** ProfileAvatar */
export function Avatar({ url, name, size = 44, className }: { url?: string | null; name?: string | null; size?: number; className?: string }) {
  return url ? (
    <img src={url} alt={name ?? ''} className={cx('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <div
      className={cx('grid shrink-0 place-items-center rounded-full bg-brand-gradient font-bold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  )
}

/** RatingStarsWidget – display or input */
export function RatingStars({ value, size = 16, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i - 0.25
        const half = !filled && value >= i - 0.75
        return (
          <button
            key={i}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(i)}
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
            className={cx('relative', onChange ? 'cursor-pointer transition hover:scale-110' : 'cursor-default')}
          >
            <Star size={size} className="text-[#F5A623]/30" fill="currentColor" strokeWidth={0} />
            {(filled || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: filled ? '100%' : '50%' }}>
                <Star size={size} className="text-[#F5A623]" fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Modal bottom sheet on mobile, centered dialog on desktop (showModalBottomSheet / showDialog). */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cx(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-card shadow-lg1 sm:rounded-[28px]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />
        {title != null && (
          <div className="flex items-center gap-3 px-5 pb-2 pt-4">
            <div className="t-title min-w-0 flex-1">{title}</div>
            <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-inset text-muted hover:text-ink">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2">{children}</div>
        {footer && <div className="border-t border-line/60 px-5 py-4 dark:border-line">{footer}</div>}
      </div>
    </div>
  )
}

/**
 * Labeled form field wrapper (CustomTextFormField). Shows a required asterisk, and an inline
 * error with an icon that replaces the hint. Give the input `aria-invalid={!!error}` and the
 * `.field-invalid` class (or use `fieldClass(error)`) so it is highlighted too.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string
  error?: string | null
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx('block', className)} data-invalid={error ? 'true' : undefined}>
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger" role="alert">
          <AlertCircle size={14} className="mt-px shrink-0" />
          {error}
        </span>
      ) : hint ? (
        <span className="t-caption mt-1 block">{hint}</span>
      ) : null}
    </label>
  )
}

/** `.field` input classes, red-highlighted when there is an error. */
export const fieldClass = (error?: string | null, extra?: string) => cx('field', error && 'field-invalid', extra)

/** Banner listing what to fix, shown above a form's submit button after a failed submit. */
export function FormErrorSummary({ errors, className }: { errors: (string | null | undefined | false)[]; className?: string }) {
  const list = errors.filter(Boolean) as string[]
  if (!list.length) return null
  return (
    <div role="alert" className={cx('rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger', className)}>
      <p className="flex items-center gap-2 font-bold">
        <AlertCircle size={16} /> Please fix {list.length === 1 ? 'this' : `these ${list.length}`} before continuing:
      </p>
      <ul className="ml-6 mt-1 list-disc space-y-0.5">
        {list.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  )
}

/** Page <title> + visible heading consistency: sets document.title while mounted. */
export function usePageTitle(title?: string | null) {
  useEffect(() => {
    if (title) document.title = `${title} · Pendeza`
  }, [title])
}

/** Screen container used inside shells: page padding + bottom room for the tab bar. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-3xl pb-28 md:pb-10', className)}>{children}</div>
}

/** Network image with graceful fallback */
export function Img({ src, alt, className, fallback }: { src?: string | null; alt: string; className?: string; fallback?: ReactNode }) {
  if (!src) return <>{fallback ?? <div className={cx('bg-brand-gradient opacity-80', className)} />}</>
  return <img src={src} alt={alt} loading="lazy" className={cx('object-cover', className)} onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
}


// ── Progress & error states ─────────────────────────────────────────────────
/**
 * Progress bar for uploads and long operations. Pass `value` (0–100) for a determinate bar
 * with percentage, or omit it for an indeterminate one.
 */
export function ProgressBar({ value, label, className, onCancel }: { value?: number | null; label?: ReactNode; className?: string; onCancel?: () => void }) {
  const pct = value == null ? null : Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className={cx('w-full', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined} aria-label={typeof label === 'string' ? label : 'Progress'}>
      {(label || pct != null || onCancel) && (
        <div className="mb-1.5 flex items-center gap-2 text-[12.5px]">
          <span className="min-w-0 flex-1 truncate font-medium text-ink">{label}</span>
          {pct != null && <span className="font-bold tabular-nums text-primary">{pct}%</span>}
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-full px-2 py-0.5 font-semibold text-muted hover:bg-inset hover:text-danger">
              Cancel
            </button>
          )}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-primary/15">
        {pct == null ? (
          <div className="h-full w-2/5 animate-[indeterminate_1.1s_ease-in-out_infinite] rounded-full bg-brand-gradient" />
        ) : (
          <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-300" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  )
}

/** Step indicator for multi-step flows ("Step 2 of 3"). */
export function Steps({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={cx('flex items-center gap-2', className)} aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((label, i) => {
        const done = i < current
        const on = i === current
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cx(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                done ? 'bg-success text-white' : on ? 'bg-primary text-white' : 'bg-inset text-muted',
              )}
            >
              {done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            <span className={cx('truncate text-[12px]', on ? 'font-bold text-ink' : 'text-muted')}>{label}</span>
            {i < steps.length - 1 && <span className={cx('h-px flex-1', done ? 'bg-success' : 'bg-line')} />}
          </li>
        )
      })}
    </ol>
  )
}

/** Inline/full-section error with a friendly message and Retry (ErrorDisplayWidget). */
export function ErrorState({
  title = "Couldn't load this",
  message,
  hint,
  onRetry,
  retrying,
  offline,
  className,
}: {
  title?: string
  message?: string
  hint?: string
  onRetry?: () => void
  retrying?: boolean
  offline?: boolean
  className?: string
}) {
  const Icon = offline ? WifiOff : AlertCircle
  return (
    <div className={cx('flex justify-center px-6 py-10', className)} role="alert">
      <div className="flex max-w-[360px] flex-col items-center text-center">
        <IconTile icon={Icon} color="#FF6B6B" size={60} solid />
        <h3 className="t-title mt-5">{title}</h3>
        {message && <p className="mt-2 text-[13.5px] text-ink/80">{message}</p>}
        {hint && <p className="t-caption mt-1">{hint}</p>}
        {onRetry && (
          <FilledButton className="mt-5" loading={retrying} onClick={onRetry}>
            {!retrying && <RefreshCw size={17} />} Try again
          </FilledButton>
        )}
      </div>
    </div>
  )
}
