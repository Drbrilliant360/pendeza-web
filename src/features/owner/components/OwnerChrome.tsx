// Port of lib/features/3_owner_management/presentation/owner_chrome.dart
// (ownerTabAppBar + ownerAppointmentStatusColor) plus small shared owner widgets.
import { Loader2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { cx } from '@/components/ui'
import { getSalonForOwner } from '@/lib/firestore'
import { useAsync } from '@/lib/hooks'
import { AppointmentStatus } from '@/lib/models'

/** ownerTabAppBar – plain centered title bar on the page background. */
export function OwnerTabHeader({ title, actions, leading }: { title: string; actions?: ReactNode; leading?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-page/90 backdrop-blur supports-[backdrop-filter]:bg-page/75">
      <div className="mx-auto grid h-14 w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-3">
        <div className="flex items-center">{leading}</div>
        <h1 className="truncate text-center text-[17px] font-bold text-ink">{title}</h1>
        <div className="flex items-center justify-end gap-1">{actions}</div>
      </div>
    </header>
  )
}

/** Small tinted icon button used in the owner app bars. */
export function HeaderIconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'soft',
  className,
  loading,
  spin,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  variant?: 'soft' | 'gradient' | 'plain' | 'danger'
  className?: string
  /** Show a spinner and block clicks while async work runs. */
  loading?: boolean
  /** Spin the icon itself (refresh buttons) and block clicks. */
  spin?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || spin}
      aria-busy={loading || spin || undefined}
      aria-label={label}
      title={label}
      className={cx(
        'grid h-10 w-10 place-items-center rounded-xl transition active:scale-95',
        variant === 'soft' && 'bg-primary/10 text-primary hover:bg-primary/15',
        variant === 'gradient' && 'border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/15 text-primary hover:from-primary/20',
        variant === 'plain' && 'text-ink hover:bg-inset',
        variant === 'danger' && 'text-danger hover:bg-danger/10',
        'disabled:cursor-wait',
        className,
      )}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} className={spin ? 'animate-spin' : undefined} />}
    </button>
  )
}

/** ownerAppointmentStatusColor */
export function ownerStatusColor(status: string): string {
  switch (status) {
    case AppointmentStatus.confirmed:
      return '#6C5CE7'
    case AppointmentStatus.completed:
      return '#00B894'
    case AppointmentStatus.pendingPayment:
      return '#F0937D'
    case AppointmentStatus.cancelled:
    case AppointmentStatus.paymentFailed:
      return '#FF6B6B'
    case AppointmentStatus.noShow:
      return '#9AA0A6'
    default:
      return '#B2BEC3'
  }
}

/** Gradient tinted icon box used in section headers (calendar_today etc.). */
export function SectionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
      <Icon size={20} />
    </div>
  )
}

/** Extended floating action button, positioned above the mobile tab bar. */
export function Fab({ icon: Icon, label, onClick, loading }: { icon: LucideIcon; label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading || undefined}
      className="fixed bottom-24 right-4 z-30 flex h-14 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-cta transition hover:bg-primary-dark active:scale-95 disabled:cursor-wait disabled:opacity-90 md:bottom-8 md:right-8"
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
      {label}
    </button>
  )
}

/** Resolve the signed-in owner's salon (FirestoreService.getSalonForOwner). */
export function useOwnerSalon() {
  const { user } = useAuth()
  const uid = user?.uid
  return useAsync(async () => {
    if (!uid) throw new Error('User not authenticated')
    const salon = await getSalonForOwner(uid)
    if (!salon) throw new Error('No salon found for owner')
    return salon
  }, [uid])
}

// ── intl DateFormat equivalents ──────────────────────────────────────────────
/** DateFormat.jm() → "3:30 PM" */
export const fmtJm = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
/** DateFormat('MMM d') → "Nov 3" */
export const fmtMMMd = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
/** DateFormat.yMMMd() → "Nov 3, 2026" */
export const fmtYMMMd = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
/** DateFormat.yMMMMEEEEd() → "Tuesday, November 3, 2026" */
export const fmtFull = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
/** DateFormat('MMM d, h:mm a') */
export const fmtMMMdJm = (d: Date) => `${fmtMMMd(d)}, ${fmtJm(d)}`

/** Keyframes for the TweenAnimationBuilder entrance animations (render once per screen). */
export function OwnerKeyframes() {
  return (
    <style>
      {'@keyframes kpiIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}' +
        '@keyframes ownerFadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}'}
    </style>
  )
}
/** Staggered fade/slide-up like the Dart list item TweenAnimationBuilders. */
export const fadeUp = (index: number, base = 300, step = 80) => ({
  animation: `ownerFadeUp ${base + index * step}ms cubic-bezier(0.33,1,0.68,1) both`,
})
