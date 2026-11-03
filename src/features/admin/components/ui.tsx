// Port of lib/features/5_admin_panel/presentation/widgets/admin_ui.dart:
// the admin design system (tones, page, cards, pills, stat tiles, search, filter chips,
// segmented tabs, empty/error/loading states, dialog frame, info rows).
import { ArrowUpRight, LogOut, Search, ShieldHalf, X, XCircle, type LucideIcon } from 'lucide-react'
import { createContext, useContext, useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { cx, ErrorState, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { ThemeModeButton } from '@/layouts/MainShell'
import '../admin.css'

// ── TOKENS ──────────────────────────────────────────────────────────────────
export type AdminTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

interface ToneDef { base: string; inkL: string; inkD: string; fillL: string; fgL: string; fillD: string; fgD: string }
const TONE_DEFS: Record<AdminTone, ToneDef> = {
  neutral: { base: 'rgb(var(--ink) / 0.55)', inkL: 'rgb(var(--ink) / 0.62)', inkD: 'rgb(var(--ink) / 0.62)', fillL: 'rgb(var(--ink) / 0.85)', fgL: 'rgb(var(--card))', fillD: 'rgb(var(--ink) / 0.85)', fgD: 'rgb(var(--card))' },
  primary: { base: '#6C5CE7', inkL: '#5F3DC4', inkD: '#A29BFE', fillL: '#6C5CE7', fgL: '#FFFFFF', fillD: '#6C5CE7', fgD: '#FFFFFF' },
  accent: { base: '#FAB1A0', inkL: '#B2482D', inkD: '#FAB1A0', fillL: '#FAB1A0', fgL: '#3A1409', fillD: '#FAB1A0', fgD: '#3A1409' },
  success: { base: '#00B894', inkL: '#007A63', inkD: '#55EFC4', fillL: '#00896C', fgL: '#FFFFFF', fillD: '#00B894', fgD: '#06231C' },
  warning: { base: '#F5A623', inkL: '#8A5A00', inkD: '#FDCB6E', fillL: '#F5A623', fgL: '#2B1B00', fillD: '#F5A623', fgD: '#2B1B00' },
  danger: { base: '#FF6B6B', inkL: '#C62F2F', inkD: '#FF7675', fillL: '#D64545', fgL: '#FFFFFF', fillD: '#FF7675', fgD: '#2A0B0B' },
  info: { base: '#74B9FF', inkL: '#1F6FB5', inkD: '#74B9FF', fillL: '#2B7CC4', fgL: '#FFFFFF', fillD: '#74B9FF', fgD: '#071B2E' },
}

/** CSS variables for a tone — combine with the `.a-*` classes in admin.css. */
export function toneVars(tone: AdminTone): CSSProperties {
  const d = TONE_DEFS[tone]
  return {
    '--a-base': d.base,
    '--a-ink-l': d.inkL,
    '--a-ink-d': d.inkD,
    '--a-fill-l': d.fillL,
    '--a-fg-l': d.fgL,
    '--a-fill-d': d.fillD,
    '--a-fg-d': d.fgD,
  } as CSSProperties
}
export const toneBase = (tone: AdminTone) => TONE_DEFS[tone].base

/** Semantic tone for a user role (adminRoleTone). */
export function adminRoleTone(role?: string | null): AdminTone {
  switch (role) {
    case 'admin': return 'danger'
    case 'owner': return 'info'
    case 'client': return 'success'
    default: return 'neutral'
  }
}
/** "owner" → "Owner" (adminRoleLabel). */
export function adminRoleLabel(role?: string | null): string {
  if (!role) return 'No role'
  return role[0].toUpperCase() + role.slice(1)
}

// ── SHELL SCOPE ─────────────────────────────────────────────────────────────
interface ShellScope { onLogout: () => void }
export const AdminShellScope = createContext<ShellScope | null>(null)

// ── BUTTONS ─────────────────────────────────────────────────────────────────
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: AdminTone; icon?: LucideIcon; loading?: boolean }
const BtnSpinner = () => <span className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />

export function AdminFilledButton({ tone = 'primary', icon: Icon, loading, className, children, style, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={{ ...toneVars(tone), ...style }}
      className={cx('a-fill inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold tracking-[0.1px] transition hover:brightness-105 disabled:cursor-not-allowed disabled:hover:brightness-100', className)}
    >
      {loading ? <BtnSpinner /> : Icon && <Icon size={17} />}
      {children}
    </button>
  )
}

export function AdminOutlinedButton({ tone = 'primary', icon: Icon, loading, className, children, style, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={{ ...toneVars(tone), ...style }}
      className={cx('a-ink a-border-soft inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl border bg-transparent px-5 text-sm font-semibold transition hover:bg-[color-mix(in_srgb,var(--a-base)_8%,transparent)] disabled:opacity-50', className)}
    >
      {loading ? <BtnSpinner /> : Icon && <Icon size={16} />}
      {children}
    </button>
  )
}

export function AdminTextButton({ tone = 'primary', loading, className, children, style, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={{ ...toneVars(tone), ...style }}
      className={cx('a-ink inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition hover:bg-ink/5 disabled:opacity-50', className)}
    >
      {loading && <BtnSpinner />}
      {children}
    </button>
  )
}

/** Round bordered icon button used in page headers (Refresh / Sign out). `spinning` animates the icon while work runs. */
export function AdminIconButton({ icon: Icon, label, onClick, className, spinning }: { icon: LucideIcon; label: string; onClick?: () => void; className?: string; spinning?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-busy={spinning || undefined}
      disabled={spinning}
      className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-card text-ink/60 transition hover:text-ink disabled:cursor-wait', className)}
    >
      <Icon size={19} className={cx(spinning && 'animate-spin text-primary')} />
    </button>
  )
}

// ── PAGE ────────────────────────────────────────────────────────────────────
/**
 * AdminPage: one consistent header, an optional toolbar (search / tabs) and a full-bleed
 * filter row, then width-constrained content. On phones the header also carries the
 * theme + sign-out buttons (there is no sidebar there).
 */
export function AdminPage({
  title,
  subtitle,
  icon,
  actions,
  toolbar,
  filters,
  children,
  fab,
}: {
  title: string
  subtitle?: string | null
  icon?: LucideIcon
  actions?: ReactNode
  toolbar?: ReactNode
  filters?: ReactNode
  children: ReactNode
  fab?: ReactNode
}) {
  const shell = useContext(AdminShellScope)
  useEffect(() => {
    document.title = `${title} · Pendeza Admin`
  }, [title])
  return (
    <div className="mx-auto w-full max-w-[1180px] pb-28 min-[900px]:pb-10">
      <header className="flex items-center gap-3 px-4 pb-3 pt-4 sm:px-6">
        {icon && <AdminIconTile icon={icon} gradient />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-bold leading-tight tracking-[-0.3px] text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-ink/60">{subtitle}</p>}
        </div>
        {actions}
        {shell && (
          <div className="flex items-center gap-1 min-[900px]:hidden">
            <ThemeModeButton className="h-11 w-11 border border-line bg-card" />
            <AdminIconButton icon={LogOut} label="Sign out" onClick={shell.onLogout} />
          </div>
        )}
      </header>
      {toolbar && <div className="px-4 pb-2 sm:px-6">{toolbar}</div>}
      {filters && <div className="pb-2 pt-1">{filters}</div>}
      {children}
      {fab && <div className="fixed bottom-24 right-4 z-30 min-[900px]:bottom-8 min-[900px]:right-8">{fab}</div>}
    </div>
  )
}

/** Horizontal gutter used by page bodies. */
export const GUTTER = 'px-4 sm:px-6'

// ── SURFACES ────────────────────────────────────────────────────────────────
export function AdminCard({
  children,
  className,
  onClick,
  tone,
  surface,
  padded = true,
  style,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  /** tinted surface + border in this tone (AdminCard(color: toneSurface, borderColor: …)) */
  tone?: AdminTone
  /** inset fill without border */
  surface?: 'inset'
  padded?: boolean
  style?: CSSProperties
}) {
  // A div with button semantics, so cards can contain their own action buttons.
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick()) : undefined}
      style={{ ...(tone ? toneVars(tone) : {}), ...style }}
      className={cx(
        'block w-full overflow-hidden rounded-[18px] border text-left',
        surface === 'inset' ? 'border-transparent bg-primary/5 dark:bg-inset' : tone ? 'a-surface a-border-45' : 'border-line/70 bg-card shadow-sm1 dark:border-line dark:shadow-none',
        padded && 'p-4',
        onClick && 'cursor-pointer transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Rounded square holding an icon; the gradient variant is the brand mark. */
export function AdminIconTile({ icon: Icon, tone = 'primary', gradient, size = 44 }: { icon: LucideIcon; tone?: AdminTone; gradient?: boolean; size?: number }) {
  const radius = size * 0.3
  if (gradient) {
    return (
      <div
        className="grid shrink-0 place-items-center bg-brand-gradient text-white"
        style={{ width: size, height: size, borderRadius: radius, boxShadow: '0 4px 12px rgba(108,92,231,0.28)' }}
      >
        <Icon size={size * 0.5} />
      </div>
    )
  }
  return (
    <div className="a-tint a-ink grid shrink-0 place-items-center" style={{ ...toneVars(tone), width: size, height: size, borderRadius: radius }}>
      <Icon size={size * 0.5} />
    </div>
  )
}

export function AdminPill({ label, tone = 'neutral', icon: Icon, className }: { label: ReactNode; tone?: AdminTone; icon?: LucideIcon; className?: string }) {
  return (
    <span
      style={toneVars(tone)}
      className={cx('a-tint a-ink inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none tracking-[0.2px]', className)}
    >
      {Icon && <Icon size={12} className="shrink-0" />}
      <span className="truncate">{label}</span>
    </span>
  )
}

export function AdminSectionHeader({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold leading-snug text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-ink/60">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  )
}

export function AdminStatTile({ icon, label, value, tone = 'primary', onClick }: { icon: LucideIcon; label: string; value: string; tone?: AdminTone; onClick?: () => void }) {
  return (
    <AdminCard onClick={onClick}>
      <div className="flex items-center">
        <AdminIconTile icon={icon} tone={tone} size={40} />
        <span className="flex-1" />
        {onClick && <ArrowUpRight size={16} className="text-ink/60" />}
      </div>
      <div className="mt-3.5 truncate text-[28px] font-bold leading-tight tracking-[-0.3px] text-ink">{value}</div>
      <div className="mt-0.5 truncate text-[12.5px] text-ink/60">{label}</div>
    </AdminCard>
  )
}

// ── INPUTS ──────────────────────────────────────────────────────────────────
export function AdminSearchField({ hint, onChange }: { hint: string; onChange: (v: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="relative">
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/60" />
      <input
        type="search"
        value={value}
        placeholder={hint}
        enterKeyHint="search"
        onChange={(e) => {
          setValue(e.target.value)
          onChange(e.target.value)
        }}
        className="h-[46px] w-full rounded-[14px] border border-line bg-card pl-10 pr-10 text-sm font-medium text-ink outline-none transition placeholder:font-normal placeholder:text-ink/50 focus:border-primary focus:ring-1 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear"
          title="Clear"
          onClick={() => {
            setValue('')
            onChange('')
          }}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink/60 hover:text-ink"
        >
          <XCircle size={18} />
        </button>
      )}
    </div>
  )
}

export function AdminFilterChip({
  label,
  count,
  icon: Icon,
  selected,
  tone = 'primary',
  onClick,
}: {
  label: string
  count?: number
  icon?: LucideIcon
  selected: boolean
  tone?: AdminTone
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={toneVars(tone)}
      className={cx(
        'inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition',
        selected ? 'a-tint-16 a-border a-ink border-[1.4px]' : 'border-line bg-card text-ink/60 hover:text-ink',
      )}
    >
      {Icon && <Icon size={15} />}
      {label}
      {count != null && (
        <span className={cx('ml-0.5 rounded-full px-[7px] py-0.5 text-[11px] font-bold', selected ? 'bg-[color-mix(in_srgb,var(--a-base)_22%,transparent)]' : 'bg-primary/5 dark:bg-inset')}>
          {count}
        </span>
      )}
    </button>
  )
}

/** Horizontally scrolling row of AdminFilterChips (wraps on wide screens). */
export function AdminFilterBar({ children }: { children: ReactNode }) {
  return <div className={cx('a-scroll-x flex gap-2 overflow-x-auto', GUTTER)}>{children}</div>
}

/** Pill-style segmented control. */
export function AdminSegmentedTabBar<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; icon: LucideIcon }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex rounded-[14px] border border-line bg-primary/5 p-1 dark:bg-inset">
      {tabs.map((t) => {
        const on = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={cx(
              'flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] text-[13.5px] transition',
              on ? 'bg-card font-bold text-primary-dark shadow-sm1 dark:text-primary-light dark:shadow-none' : 'font-medium text-ink/60 hover:text-ink',
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ── STATES ──────────────────────────────────────────────────────────────────
export function AdminEmptyState({
  icon: Icon,
  title,
  message,
  tone = 'primary',
  actionLabel,
  onAction,
}: {
  icon: LucideIcon
  title: string
  message?: string | null
  tone?: AdminTone
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex justify-center p-8">
      <div className="flex max-w-[360px] flex-col items-center text-center">
        <div style={toneVars(tone)} className="a-tint a-ink grid h-[84px] w-[84px] place-items-center rounded-full">
          <Icon size={36} />
        </div>
        <h3 className="mt-5 text-base font-bold text-ink">{title}</h3>
        {message && <p className="mt-1.5 text-[13.5px] leading-snug text-ink/60">{message}</p>}
        {actionLabel && onAction && (
          <AdminFilledButton tone={tone} className="mt-5" onClick={onAction}>
            {actionLabel}
          </AdminFilledButton>
        )}
      </div>
    </div>
  )
}

/** Page-level load failure: friendly message + "how to fix" hint + Try again (never raw error text). */
export function AdminErrorState({ error, fallback = 'Something went wrong.', title = "Couldn't load this page", onRetry }: { error: unknown; fallback?: string; title?: string; onRetry: () => void }) {
  const f = friendlyError(error, fallback)
  return <ErrorState title={title} message={f.message} hint={f.hint} onRetry={onRetry} offline={f.code === 'network'} />
}

/** Skeleton list shown while admin data is loading. */
export function AdminLoadingState({ count = 6, itemHeight = 76 }: { count?: number; itemHeight?: number }) {
  return (
    <div className={cx('flex flex-col gap-3 pb-6 pt-2', GUTTER)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="w-full rounded-[18px]" style={{ height: itemHeight }} />
      ))}
    </div>
  )
}

// ── DIALOGS & SHEETS ────────────────────────────────────────────────────────
/** Centered modal (showDialog) with the admin's rounded frame. */
export function AdminModal({ open, onClose, maxWidth = 420, children }: { open: boolean; onClose: () => void; maxWidth?: number; children: ReactNode }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5 py-6" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-full w-full flex-col overflow-hidden rounded-3xl bg-card shadow-lg1" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  )
}

/** AdminDialogFrame: icon, title, message, optional child, right-aligned actions. */
export function AdminDialogFrame({
  open,
  onClose,
  icon,
  tone = 'primary',
  title,
  message,
  children,
  actions,
  maxWidth = 420,
}: {
  open: boolean
  onClose: () => void
  icon?: LucideIcon
  tone?: AdminTone
  title: string
  message?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  maxWidth?: number
}) {
  return (
    <AdminModal open={open} onClose={onClose} maxWidth={maxWidth}>
      <div className="overflow-y-auto px-6 pb-5 pt-6">
        {icon && (
          <div className="mb-4">
            <AdminIconTile icon={icon} tone={tone} size={48} />
          </div>
        )}
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {message && <p className="mt-2 text-[13.5px] leading-snug text-ink/60">{message}</p>}
        {children && <div className="mt-4">{children}</div>}
        {actions && <div className="mt-6 flex justify-end gap-2">{actions}</div>}
      </div>
    </AdminModal>
  )
}

export interface AdminConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: AdminTone
  icon?: LucideIcon
}
type ConfirmFn = (o: AdminConfirmOptions) => Promise<boolean>
const ConfirmCtx = createContext<ConfirmFn | null>(null)

/** Provides showAdminConfirmDialog to the admin pages. */
export function AdminConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(AdminConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const confirm: ConfirmFn = (o) => new Promise((resolve) => setState({ ...o, resolve }))
  const close = (v: boolean) => {
    state?.resolve(v)
    setState(null)
  }
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AdminDialogFrame
        open={!!state}
        onClose={() => close(false)}
        icon={state?.icon}
        tone={state?.tone ?? 'primary'}
        title={state?.title ?? ''}
        message={state?.message}
        actions={
          <>
            <AdminTextButton tone="neutral" onClick={() => close(false)}>
              {state?.cancelLabel ?? 'Cancel'}
            </AdminTextButton>
            <AdminFilledButton tone={state?.tone ?? 'primary'} onClick={() => close(true)}>
              {state?.confirmLabel ?? 'Confirm'}
            </AdminFilledButton>
          </>
        }
      />
    </ConfirmCtx.Provider>
  )
}
export function useAdminConfirm(): ConfirmFn {
  const c = useContext(ConfirmCtx)
  if (!c) throw new Error('useAdminConfirm outside AdminConfirmProvider')
  return c
}

/** Icon + label + value row used in detail sheets and dialogs. */
export function AdminInfoRow({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="mb-3.5 flex items-start gap-3">
      <AdminIconTile icon={icon} size={32} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-[0.3px] text-ink/60">{label}</div>
        <div className="mt-0.5 whitespace-pre-line break-words text-sm font-medium text-ink">{value}</div>
      </div>
    </div>
  )
}

/** Close button used at the top-right of admin dialogs. */
export function AdminCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Close" aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/5 text-ink/60 hover:text-ink dark:bg-inset">
      <X size={18} />
    </button>
  )
}

/** Labelled form section caption ("BASIC INFO"). */
export function AdminLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('text-[11px] font-bold uppercase tracking-[0.3px] text-ink/60', className)}>{children}</div>
}

export const BrandIcon = ShieldHalf
