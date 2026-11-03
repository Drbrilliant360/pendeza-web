// Owner design chrome (port of 3_owner_management/presentation/owner_chrome.dart) plus the small
// shared widgets the owner salon screens use (switch, info note, pick-source sheet, image viewer).
import { ChevronLeft, ChevronRight, Info, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppointmentStatus } from '@/lib/models'
import { cx, Sheet } from '@/components/ui'

/** Back navigation: previous in-app page when there is one, else the given parent route (deep links). */
export function useBack(parent = '/owner/profile') {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(parent, { replace: true })
  }
}

/** Warn before closing/reloading the tab while a form has unsaved changes. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}

/** ownerTabAppBar – plain centered app bar on the page background. */
export function OwnerAppBar({
  title,
  actions,
  back = false,
  onBack,
  parent,
}: {
  title: string
  actions?: ReactNode
  back?: boolean
  onBack?: () => void
  /** Where Back goes when the page was opened directly (no in-app history). */
  parent?: string
}) {
  const fallbackBack = useBack(parent)
  const goBack = onBack ?? fallbackBack
  return (
    <header className="sticky top-0 z-30 border-b border-line/40 bg-page/90 backdrop-blur dark:border-line/60">
      <div className="mx-auto grid h-14 max-w-3xl grid-cols-[48px_1fr_auto] items-center gap-2 px-2 md:max-w-5xl">
        <div>
          {back && (
            <button onClick={goBack} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-inset">
              <ChevronLeft size={22} />
            </button>
          )}
        </div>
        <h1 className="truncate text-center text-[17px] font-bold text-ink">{title}</h1>
        <div className="flex min-w-[48px] items-center justify-end gap-1">{actions}</div>
      </div>
    </header>
  )
}

/** App-bar icon button. `spinning` rotates the icon (e.g. Refresh while it runs) and blocks repeat clicks. */
export function IconAction({ icon: Icon, label, onClick, disabled, spinning }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; spinning?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || spinning}
      aria-busy={spinning || undefined}
      title={label}
      aria-label={label}
      className={cx('grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-inset', spinning ? 'cursor-wait' : 'disabled:opacity-40')}
    >
      <Icon size={20} className={cx(spinning && 'animate-spin text-primary')} />
    </button>
  )
}

/** ownerAppointmentStatusColor */
export function ownerAppointmentStatusColor(status: string): string {
  switch (status) {
    case AppointmentStatus.confirmed:
      return '#6C5CE7'
    case AppointmentStatus.completed:
      return '#00B894'
    case AppointmentStatus.pendingPayment:
      return '#FAB1A0'
    case AppointmentStatus.cancelled:
    case AppointmentStatus.paymentFailed:
      return '#FF6B6B'
    case AppointmentStatus.noShow:
      return 'rgb(var(--ink) / 0.45)'
    default:
      return 'rgb(var(--muted))'
  }
}

/** CupertinoSwitch / Switch.adaptive */
export function Toggle({ checked, onChange, color = '#6C5CE7', label }: { checked: boolean; onChange: (v: boolean) => void; color?: string; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors', !checked && 'bg-ink/15')}
      style={checked ? { background: color } : undefined}
    >
      <span className={cx('absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-[2px]')} />
    </button>
  )
}

/** Soft primary info strip used at the bottom of the edit dialogs. */
export function InfoNote({ children, icon: Icon = Info, className }: { children: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cx('flex items-center gap-2 rounded-2xl bg-primary/10 p-3 text-[12.5px] text-ink', className)}>
      <Icon size={18} className="shrink-0 text-primary" />
      <span>{children}</span>
    </div>
  )
}

/** Dart `_buildSectionLabel` – icon tile + bold title. */
export function SectionLabel({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <h2 className="text-[16px] font-bold tracking-[0.5px] text-ink">{title}</h2>
    </div>
  )
}

/** Section header row: big title + trailing control (edit icon / add button). */
export function SectionTitleRow({ title, children, badge }: { title: string; children?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="truncate text-[19px] font-bold text-ink">{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  )
}

export function CountBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{children}</span>
}

/** Hidden file inputs + bottom sheet with "camera" / "gallery" options (image_picker stand-in). */
export interface PickOption {
  icon: LucideIcon
  title: string
  subtitle?: string
  color?: string
  capture?: 'user' | 'environment'
}
export function PickSourceSheet({
  open,
  onClose,
  title,
  accept,
  options,
  onPicked,
  multiple,
}: {
  open: boolean
  onClose: () => void
  title: string
  accept: string
  options: PickOption[]
  /** Called with the picked file(s); several only when `multiple` is set (camera capture stays single). */
  onPicked: (files: File[]) => void
  multiple?: boolean
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  return (
    <>
      {options.map((o, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el
          }}
          type="file"
          accept={accept}
          capture={o.capture}
          multiple={multiple && !o.capture}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length > 0) onPicked(files)
          }}
        />
      ))}
      <Sheet open={open} onClose={onClose} title={title}>
        <div className="space-y-1 pb-2">
          {options.map((o, i) => (
            <button
              key={i}
              onClick={() => {
                onClose()
                inputs.current[i]?.click()
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-inset"
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-lg"
                style={{ background: `color-mix(in srgb, ${o.color ?? '#6C5CE7'} 12%, transparent)`, color: o.color ?? '#6C5CE7' }}
              >
                <o.icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{o.title}</span>
                {o.subtitle && <span className="t-caption block">{o.subtitle}</span>}
              </span>
              <ChevronRight size={16} className="text-muted" />
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}

/** Full-screen black image viewer (InteractiveViewer page). */
export function ImageViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [url, onClose])
  if (!url) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black" role="dialog" aria-modal onClick={onClose}>
      <button onClick={onClose} aria-label="Close" className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full text-white hover:bg-white/10">
        <X size={24} />
      </button>
      <img src={url} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

/** Inline dialog footer buttons (TextButton pair). */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex justify-end gap-2">{children}</div>
}
export function TextBtn({ children, onClick, danger, disabled, type = 'button' }: { children: ReactNode; onClick?: () => void; danger?: boolean; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx('rounded-xl px-4 py-2 text-sm font-semibold hover:bg-inset disabled:opacity-50', danger ? 'text-danger' : 'text-primary')}
    >
      {children}
    </button>
  )
}
