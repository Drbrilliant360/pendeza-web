// Port of admin_manage_notification_screen.dart: Compose tab (audience, type, title, message,
// optional image, call-to-action) sending through the `send_admin_notification` callable
// (NotificationService.sendNotificationToRole), and a realtime History tab over notification_inbox.
import { Timestamp } from 'firebase/firestore'
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Hand,
  Image as ImageIcon,
  ImagePlus,
  Link2,
  Loader2,
  Pencil,
  Send,
  Settings,
  Tag,
  TriangleAlert,
  Type,
  User,
  Users,
  BellOff,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFeedback } from '@/components/feedback'
import { friendlyError } from '@/lib/errors'
import { cx, fieldClass, ProgressBar } from '@/components/ui'
import { compressImage } from '@/lib/storage'
import { listenNotificationInbox, sendNotificationToRole, uploadNotificationImage, type InboxItem } from '../api'
import {
  AdminCard,
  AdminDialogFrame,
  AdminEmptyState,
  AdminFilledButton,
  AdminFilterChip,
  AdminLoadingState,
  AdminPage,
  AdminPill,
  AdminSectionHeader,
  AdminSegmentedTabBar,
  AdminStatTile,
  AdminTextButton,
  GUTTER,
  toneVars,
  useAdminConfirm,
  type AdminTone,
} from '../components/ui'

const PREDEFINED_ROUTES = [
  { label: 'None', route: '' },
  { label: 'Home / Dashboard', route: '/client/dashboard' },
  { label: 'Discover Salons', route: '/client/discover' },
  { label: 'My Appointments', route: '/client/appointments' },
  { label: 'My Wallet', route: '/client/wallet' },
  { label: 'Favorites', route: '/client/favorites' },
  { label: 'Profile', route: '/client/profile' },
  { label: 'Custom...', route: 'custom' },
]

type InboxState = { loading: true; error: null; items: InboxItem[] } | { loading: false; error: string | null; items: InboxItem[] }
const INBOX_SLOW_AFTER = 15000

function friendlyInboxError(e: unknown): string {
  const code = (e as { code?: string } | null)?.code
  if (code === 'permission-denied') return 'You don’t have permission to read notification history.'
  if (code === 'unavailable') return 'Can’t reach the server right now. Check your connection.'
  const f = friendlyError(e, 'Could not load notification history.')
  return f.hint ? `${f.message} ${f.hint}` : f.message
}

/** analytics.sent / analytics.failed as written by the Cloud Function. */
function analyticsCount(n: InboxItem, key: 'sent' | 'failed'): number {
  const a = n.analytics
  if (a && typeof a === 'object' && typeof (a as Record<string, unknown>)[key] === 'number') return Math.trunc((a as Record<string, number>)[key])
  return 0
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDateTime(d: Date): string {
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor(diff / 60000)
  if (days > 7) return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'Just now'
}

/** Listen exactly once and share the latest value with both tabs (see Dart comment). */
function useInbox() {
  const [inbox, setInbox] = useState<InboxState>({ loading: true, error: null, items: [] })
  const unsub = useRef<(() => void) | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const listen = useCallback(() => {
    unsub.current?.()
    if (timer.current) clearTimeout(timer.current)
    setInbox({ loading: true, error: null, items: [] })
    // If nothing arrives (offline, blocked by App Check, …) say so instead of showing a skeleton forever.
    timer.current = setTimeout(() => {
      setInbox((s) => (s.loading ? { loading: false, error: 'This is taking longer than expected. Check your connection and try again.', items: [] } : s))
    }, INBOX_SLOW_AFTER)
    unsub.current = listenNotificationInbox(
      (items) => {
        if (timer.current) clearTimeout(timer.current)
        setInbox({ loading: false, error: null, items })
      },
      (e) => {
        if (timer.current) clearTimeout(timer.current)
        setInbox({ loading: false, error: friendlyInboxError(e), items: [] })
      },
    )
  }, [])

  useEffect(() => {
    listen()
    return () => {
      unsub.current?.()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [listen])
  return { inbox, listen }
}

type Tab = 'compose' | 'history'

export default function AdminManageNotificationsScreen() {
  const [tab, setTab] = useState<Tab>('compose')
  const { inbox, listen } = useInbox()
  return (
    <AdminPage
      title="Notifications"
      subtitle="Send push messages to users"
      icon={Bell}
      toolbar={
        <AdminSegmentedTabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'compose', label: 'Compose', icon: Pencil },
            { value: 'history', label: 'History', icon: Clock },
          ]}
        />
      }
    >
      <div className="mx-auto max-w-[760px]">{tab === 'compose' ? <ComposerTab inbox={inbox} onSent={() => setTab('history')} /> : <HistoryTab inbox={inbox} onRetry={listen} />}</div>
    </AdminPage>
  )
}

function FieldLabel({ text, helper, badge }: { text: string; helper?: string; badge?: string }) {
  return (
    <div className="mb-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-ink">{text}</span>
        {badge && <AdminPill label={badge} tone="info" />}
      </div>
      {helper && <div className="mt-0.5 text-[12.5px] text-ink/60">{helper}</div>}
    </div>
  )
}

function IconInput({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="relative">
      <Icon size={20} className="pointer-events-none absolute left-3.5 top-[14px] text-ink/50" />
      {children}
    </div>
  )
}

function ComposerTab({ inbox, onSent }: { inbox: InboxState; onSent: () => void }) {
  const { toast, toastSuccess, toastError } = useFeedback()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [actionLabel, setActionLabel] = useState('')
  const [actionRoute, setActionRoute] = useState('')
  const [audience, setAudience] = useState<'all' | 'clients' | 'owners'>('all')
  const [type, setType] = useState('general')
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const confirm = useAdminConfirm()
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [customDraft, setCustomDraft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!image) return setPreview(null)
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const reached = inbox.items.reduce((t, n) => t + analyticsCount(n, 'sent'), 0)
  const isPredefined = PREDEFINED_ROUTES.some((r) => r.route === actionRoute)
  const dropdownValue = actionRoute === '' ? '' : isPredefined ? actionRoute : 'custom'
  const isValid = title.trim() !== '' && body.trim() !== ''
  const titleError = submitted && !title.trim() ? 'Enter a title for the notification.' : null
  const bodyError = submitted && !body.trim() ? 'Enter the message users will see.' : null

  const removeImage = () => {
    if (sending) return
    setImage(null)
    setUploadedUrl(null)
  }

  const uploadImage = async (): Promise<string | null> => {
    // Reuse an image already uploaded by a previous (failed) send attempt.
    if (!image || uploadedUrl) return uploadedUrl
    setUploading(true)
    setUploadPct(0)
    try {
      const url = await uploadNotificationImage(await compressImage(image, 1200, 0.8), setUploadPct)
      setUploadedUrl(url)
      setUploading(false)
      return url
    } catch (e) {
      setUploading(false)
      // As in the app: the notification still goes out, just without the image.
      toastError(e, 'Could not upload the image – sending without it')
      return null
    }
  }

  const send = async (skipConfirm = false) => {
    if (sending) return
    setSubmitted(true)
    if (!title.trim() || !body.trim()) {
      toast('Please fill in both title and message', 'error')
      return
    }
    if (!skipConfirm) {
      const who = audience === 'all' ? 'every Pendeza user' : audience === 'clients' ? 'all clients' : 'all salon owners'
      const ok = await confirm({
        title: 'Send notification?',
        message: `"${title.trim()}" will be pushed to ${who}. This can't be undone.`,
        confirmLabel: 'Send now',
        tone: audience === 'all' ? 'danger' : 'primary',
        icon: Send,
      })
      if (!ok) return
    }
    setSending(true)
    try {
      let imageUrl: string | null = null
      if (image) imageUrl = await uploadImage()
      let data: Record<string, unknown> | null = null
      if (actionRoute || actionLabel || imageUrl != null) {
        data = {
          ...(actionRoute ? { route: actionRoute } : {}),
          ...(actionLabel ? { actionLabel } : {}),
          ...(imageUrl != null ? { imageUrl } : {}),
          type,
        }
      }
      await sendNotificationToRole({ title: title.trim(), body: body.trim(), role: audience === 'all' ? null : audience, data })
      setTitle('')
      setBody('')
      setActionLabel('')
      setActionRoute('')
      setAudience('all')
      setType('general')
      setImage(null)
      setUploadedUrl(null)
      setSubmitted(false)
      toastSuccess('Notification sent successfully!')
      onSent()
    } catch (e) {
      toastError(e, 'Failed to send notification', () => void send(true))
    } finally {
      setSending(false)
    }
  }

  const typeChip = (value: string, label: string, icon: LucideIcon) => <AdminFilterChip label={label} icon={icon} selected={type === value} onClick={() => setType(value)} />
  const shownImage = preview ?? uploadedUrl

  return (
    <div className={cx('pb-8 pt-2', GUTTER)}>
      <div className="grid grid-cols-2 gap-3">
        <AdminStatTile icon={Send} label="Recent broadcasts" value={inbox.loading ? '–' : `${inbox.items.length}`} />
        <AdminStatTile icon={CheckCircle2} label="Devices reached" value={inbox.loading ? '–' : `${reached}`} tone="success" />
      </div>
      <AdminCard className="mt-4 !p-5">
        <AdminSectionHeader title="Compose notification" subtitle="Reach your users instantly" />

        <div className="mt-[22px]">
          <FieldLabel text="Target audience" />
          <div className="flex flex-wrap gap-2">
            <AdminFilterChip label="Everyone" icon={Users} selected={audience === 'all'} onClick={() => setAudience('all')} />
            <AdminFilterChip label="Clients only" icon={User} tone="success" selected={audience === 'clients'} onClick={() => setAudience('clients')} />
            <AdminFilterChip label="Salon owners" icon={Briefcase} tone="info" selected={audience === 'owners'} onClick={() => setAudience('owners')} />
          </div>
        </div>

        <div className="mt-[22px]">
          <FieldLabel text="Notification type" />
          <div className="flex flex-wrap gap-2">
            {typeChip('general', 'General', Bell)}
            {typeChip('promotion', 'Promotion', Tag)}
            {typeChip('appointment', 'Appointment', CalendarDays)}
            {typeChip('system', 'System', Settings)}
          </div>
        </div>

        <div className="mt-[22px]">
          <FieldLabel text="Title *" />
          <IconInput icon={Type}>
            <input className={fieldClass(titleError, 'pl-11')} aria-invalid={!!titleError} onBlur={() => !title.trim() && setSubmitted(true)} maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., New feature available!" />
          </IconInput>
          <div className="mt-1 flex text-xs">
            {titleError && <span className="font-medium text-danger" role="alert">{titleError}</span>}
            <span className="ml-auto text-ink/50">{title.length}/60</span>
          </div>
        </div>

        <div className="mt-2">
          <FieldLabel text="Message *" />
          <textarea className={fieldClass(bodyError, 'resize-none')} aria-invalid={!!bodyError} rows={4} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your notification message here…" />
          <div className="mt-1 flex text-xs">
            {bodyError && <span className="font-medium text-danger" role="alert">{bodyError}</span>}
            <span className="ml-auto text-ink/50">{body.length}/500</span>
          </div>
        </div>

        <div className="mt-[22px]">
          <FieldLabel text="Image" helper="Make the notification more engaging" badge="Optional" />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                setImage(f)
                setUploadedUrl(null)
              }
              e.target.value = ''
            }}
          />
          {shownImage ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img src={shownImage} alt="" className="h-[170px] w-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 grid place-items-center bg-black/50">
                  <Loader2 size={30} className="animate-spin text-white" />
                </div>
              )}
              {!sending && (
                <button
                  type="button"
                  title="Remove image"
                  aria-label="Remove image"
                  onClick={removeImage}
                  style={toneVars('danger')}
                  className="a-ink absolute right-2.5 top-2.5 grid h-10 w-10 place-items-center rounded-full bg-card"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-[124px] w-full flex-col items-center justify-center rounded-2xl border border-line bg-primary/5 dark:bg-inset">
              <span style={toneVars('primary')} className="a-tint a-ink grid h-11 w-11 place-items-center rounded-[13px]">
                <ImagePlus size={22} />
              </span>
              <span className="mt-2.5 text-sm font-medium text-ink">Tap to add an image</span>
              <span className="text-[12.5px] text-ink/60">JPG or PNG, up to 2 MB</span>
            </button>
          )}
        </div>

        <div className="mt-[22px]">
          <FieldLabel text="Call-to-action" helper="Add a button that opens a specific screen" badge="Optional" />
          <IconInput icon={Hand}>
            <input className="field pl-11" value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} placeholder='Button text (e.g., "Book Now", "View Offer")' />
          </IconInput>
          <div className="mt-3">
            <span className="mb-1.5 block text-xs text-ink/60">Destination screen</span>
            <IconInput icon={Link2}>
              <select
                className="field pl-11"
                value={dropdownValue}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'custom') {
                    setCustomDraft(isPredefined ? '' : actionRoute)
                    setCustomOpen(true)
                  } else setActionRoute(v)
                }}
              >
                {PREDEFINED_ROUTES.map((r) => (
                  <option key={r.route} value={r.route}>
                    {r.label}
                  </option>
                ))}
              </select>
            </IconInput>
          </div>
          {actionRoute !== '' && !isPredefined && (
            <div className="mt-3">
              <IconInput icon={FileText}>
                <input className="field pl-11" value={actionRoute} onChange={(e) => setActionRoute(e.target.value)} placeholder="Custom route (e.g., /salon/abc123)" />
              </IconInput>
            </div>
          )}
        </div>

        {sending && (
          <ProgressBar
            className="mt-[22px]"
            value={uploading ? uploadPct : null}
            label={uploading ? 'Uploading image…' : 'Sending notification…'}
          />
        )}
        <AdminFilledButton className="mt-[26px] h-[52px] w-full" icon={sending ? undefined : Send} loading={sending} disabled={!isValid} onClick={() => void send()}>
          {sending ? (uploading ? 'Uploading image…' : 'Sending…') : 'Send notification'}
        </AdminFilledButton>
      </AdminCard>

      <AdminDialogFrame
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        icon={Link2}
        title="Custom route"
        message="Enter the in-app path the button should open."
        actions={
          <>
            <AdminTextButton tone="neutral" onClick={() => setCustomOpen(false)}>
              Cancel
            </AdminTextButton>
            <AdminFilledButton
              onClick={() => {
                setActionRoute(customDraft)
                setCustomOpen(false)
              }}
            >
              Save
            </AdminFilledButton>
          </>
        }
      >
        <label className="block">
          <span className="mb-1.5 block text-xs text-ink/60">Route path</span>
          <input autoFocus className="field" value={customDraft} onChange={(e) => setCustomDraft(e.target.value)} placeholder="e.g., /salon/abc123" />
        </label>
      </AdminDialogFrame>
    </div>
  )
}

function HistoryTab({ inbox, onRetry }: { inbox: InboxState; onRetry: () => void }) {
  if (inbox.loading) return <AdminLoadingState itemHeight={120} count={4} />
  if (inbox.error != null) {
    return <AdminEmptyState icon={TriangleAlert} tone="danger" title="Couldn’t load history" message={inbox.error} actionLabel="Try again" onAction={onRetry} />
  }
  if (inbox.items.length === 0) {
    return <AdminEmptyState icon={BellOff} title="No notifications sent yet" message="Messages you send will show up here with their status." />
  }
  return (
    <div className={cx('flex flex-col gap-3 pb-8 pt-2', GUTTER)}>
      {inbox.items.map((n, i) => (
        <HistoryCard key={i} notif={n} />
      ))}
    </div>
  )
}

function HistoryCard({ notif }: { notif: InboxItem }) {
  const str = (v: unknown) => (typeof v === 'string' ? v : null)
  const title = str(notif.title) ?? 'Untitled'
  const body = str(notif.body) ?? ''
  const sentAt = notif.sentAt instanceof Timestamp ? notif.sentAt.toDate() : null
  const targetAudience = str(notif.targetAudience) ?? 'unknown'
  const imageUrl = str(notif.imageUrl)
  // The composer sends the CTA label inside `customData`.
  const customData = notif.customData
  const actionLabel = str(notif.actionLabel) ?? (customData && typeof customData === 'object' ? str((customData as Record<string, unknown>).actionLabel) : null)

  // Delivery: counts under `analytics`; older docs used a plain `delivered` flag.
  const sentCount = analyticsCount(notif, 'sent')
  const failedCount = analyticsCount(notif, 'failed')
  const legacyDelivered = notif.delivered === true
  let delivery: { label: string; tone: AdminTone; icon: LucideIcon }
  if (sentCount > 0 || legacyDelivered) delivery = { label: sentCount > 0 ? `Sent to ${sentCount}` : 'Delivered', tone: 'success', icon: CheckCircle2 }
  else if (failedCount > 0) delivery = { label: 'Failed', tone: 'danger', icon: XCircle }
  else delivery = { label: 'Sent', tone: 'info', icon: Send }

  let audience: { icon: LucideIcon; tone: AdminTone; label: string }
  switch (targetAudience) {
    case 'clients':
      audience = { icon: User, tone: 'success', label: 'Clients' }
      break
    case 'owners':
      audience = { icon: Briefcase, tone: 'info', label: 'Salon owners' }
      break
    default:
      audience = { icon: Users, tone: 'primary', label: targetAudience.startsWith('topic:') ? `Topic · ${targetAudience.slice(6)}` : 'Everyone' }
  }

  return (
    <AdminCard>
      <div className="flex items-center">
        <span style={toneVars(audience.tone)} className="a-tint a-ink grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px]">
          <audience.icon size={19} />
        </span>
        <div className="ml-3 min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{title}</div>
          <div className="text-[12.5px] text-ink/60">{audience.label}</div>
        </div>
        <div className="ml-2 shrink-0">
          <AdminPill label={delivery.label} tone={delivery.tone} icon={delivery.icon} />
        </div>
      </div>
      {body && <p className="mt-3 line-clamp-3 text-sm text-ink/60">{body}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {imageUrl && <AdminPill label="Has image" tone="info" icon={ImageIcon} />}
        {actionLabel && <AdminPill label={`CTA: ${actionLabel}`} tone="success" icon={Hand} />}
        {failedCount > 0 && sentCount > 0 && <AdminPill label={`${failedCount} failed`} tone="warning" icon={TriangleAlert} />}
        <span className="inline-flex items-center gap-1 text-[12.5px] text-ink/60">
          <Clock size={13} />
          {sentAt ? formatDateTime(sentAt) : 'Unknown time'}
        </span>
      </div>
    </AdminCard>
  )
}
