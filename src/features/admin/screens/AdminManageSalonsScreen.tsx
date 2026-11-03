// Port of admin_manage_salon_screen.dart (status filters, search, salon cards with owner,
// approve / reject-with-reason, details sheet).
import { BadgeCheck, Building2, Check, Clock, FileText, Hourglass, Image as ImageIcon, Info, Loader2, Map, MapPin, OctagonX, Phone, Tag, X, XCircle } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAction } from '@/components/feedback'
import { Avatar, cx, Sheet } from '@/components/ui'
import { salonHelpers, type SalonModel, type UserModel } from '@/lib/models'
import { useAdmin, useAdminState } from '../AdminContext'
import { fetchOwner } from '../api'
import {
  AdminCard,
  AdminDialogFrame,
  AdminEmptyState,
  AdminErrorState,
  AdminFilledButton,
  AdminFilterBar,
  AdminFilterChip,
  AdminInfoRow,
  AdminLoadingState,
  AdminOutlinedButton,
  AdminPage,
  AdminPill,
  AdminSearchField,
  AdminTextButton,
  GUTTER,
  toneVars,
  useAdminConfirm,
  type AdminTone,
} from '../components/ui'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const statusTone = (s: SalonModel): AdminTone => (salonHelpers.isApproved(s) ? 'success' : salonHelpers.isPending(s) ? 'warning' : 'danger')

function StatusPill({ salon }: { salon: SalonModel }) {
  if (salonHelpers.isApproved(salon)) return <AdminPill label="Approved" tone="success" icon={BadgeCheck} />
  if (salonHelpers.isPending(salon)) return <AdminPill label="Pending" tone="warning" icon={Hourglass} />
  return <AdminPill label="Rejected" tone="danger" icon={XCircle} />
}

export default function AdminManageSalonsScreen() {
  const { status, loaded, error, loadAdminData } = useAdminState()
  const location = useLocation()
  // The dashboard can deep-link straight to the pending queue.
  const [filter, setFilter] = useState<StatusFilter>(() => {
    const st = (location.state as { filter?: string } | null)?.filter ?? new URLSearchParams(location.search).get('status')
    return st === 'pending' || st === 'approved' || st === 'rejected' ? st : 'all'
  })
  const [search, setSearch] = useState('')
  const salons = loaded?.salons ?? []

  let body: ReactNode = null
  if (status === 'loading' || status === 'initial') body = <AdminLoadingState itemHeight={150} />
  else if (status === 'error') body = <AdminErrorState error={error} fallback="Could not load salons" onRetry={() => void loadAdminData()} />
  else if (loaded) {
    let list = filter === 'all' ? salons : salons.filter((s) => s.verificationStatus === filter)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((s) => s.salonName.toLowerCase().includes(q) || s.address.toLowerCase().includes(q))
    if (list.length === 0) {
      const filtering = q !== '' || filter !== 'all'
      body = (
        <AdminEmptyState
          icon={Building2}
          title={filtering ? 'No matching salons' : 'No salons yet'}
          message={filtering ? 'Try a different search or switch the status filter.' : 'Salons appear here once owners register them.'}
        />
      )
    } else {
      body = (
        <div className={cx('grid gap-3 pb-8 pt-2 min-[900px]:grid-cols-2', GUTTER)}>
          {list.map((s) => (
            <SalonCard key={s.id} salon={s} users={loaded.users} />
          ))}
        </div>
      )
    }
  }

  const pendingCount = salons.filter(salonHelpers.isPending).length
  return (
    <AdminPage
      title="Salons"
      subtitle={loaded ? `${salons.length} registered · ${pendingCount} pending` : null}
      icon={Building2}
      toolbar={loaded && <AdminSearchField hint="Search by salon name or address" onChange={setSearch} />}
      filters={
        loaded && (
          <AdminFilterBar>
            <AdminFilterChip label="All" count={salons.length} selected={filter === 'all'} onClick={() => setFilter('all')} />
            <AdminFilterChip label="Pending" count={pendingCount} tone="warning" selected={filter === 'pending'} onClick={() => setFilter('pending')} />
            <AdminFilterChip label="Approved" count={salons.filter(salonHelpers.isApproved).length} tone="success" selected={filter === 'approved'} onClick={() => setFilter('approved')} />
            <AdminFilterChip label="Rejected" count={salons.filter(salonHelpers.isRejected).length} tone="danger" selected={filter === 'rejected'} onClick={() => setFilter('rejected')} />
          </AdminFilterBar>
        )
      }
    >
      {body}
    </AdminPage>
  )
}

interface Owner { name: string | null; email: string | null; avatar: string | null; loaded: boolean }

function useOwner(salon: SalonModel, users: UserModel[]): Owner {
  const match = users.find((u) => u.uid === salon.ownerId)
  const [fetched, setFetched] = useState<Owner | null>(null)
  useEffect(() => {
    if (match) return
    let alive = true
    fetchOwner(salon.ownerId)
      .then((o) => {
        if (alive && o) setFetched({ name: o.name, email: o.email, avatar: o.avatar, loaded: true })
      })
      .catch(() => {
        if (alive) setFetched({ name: 'Unknown Owner', email: null, avatar: null, loaded: true })
      })
    return () => {
      alive = false
    }
  }, [match, salon.ownerId])
  if (match) return { name: match.fullName, email: match.email, avatar: match.profilePictureUrl, loaded: true }
  return fetched ?? { name: null, email: null, avatar: null, loaded: false }
}

function SalonCard({ salon, users }: { salon: SalonModel; users: UserModel[] }) {
  const owner = useOwner(salon, users)
  const { approveSalon, rejectSalon } = useAdmin()
  const confirm = useAdminConfirm()
  const [details, setDetails] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const tone = statusTone(salon)
  const approve = useAction(() => approveSalon(salon.id), { success: `${salon.salonName} approved`, error: 'Could not approve the salon' })
  // The reason dialog stays open (with a spinner) until the rejection is saved.
  const reject = useAction((reason: string) => rejectSalon(salon.id, reason), {
    success: `${salon.salonName} rejected`,
    error: 'Could not reject the salon',
    onSuccess: () => setRejecting(false),
  })

  const confirmApprove = async () => {
    const ok = await confirm({
      title: 'Approve salon?',
      message: `"${salon.salonName}" will become visible to all clients.`,
      confirmLabel: 'Approve',
      tone: 'success',
      icon: BadgeCheck,
    })
    if (!ok) return
    void approve.run()
  }

  return (
    <>
      <AdminCard onClick={() => setDetails(true)} className="h-full">
        <div className="flex items-start">
          <Avatar url={salon.primaryImage} name={salon.salonName} size={48} />
          <div className="ml-3.5 min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-ink">{salon.salonName}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[12.5px] text-ink/60">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{salon.address}</span>
            </div>
          </div>
          <div className="ml-2.5 shrink-0">
            <StatusPill salon={salon} />
          </div>
        </div>

        <div className="mt-3.5 flex items-center rounded-xl bg-primary/5 px-3 py-2.5 dark:bg-inset">
          {!owner.loaded ? (
            <Loader2 size={16} className="animate-spin text-primary" />
          ) : (
            <>
              <Avatar url={owner.avatar} name={owner.name} size={24} />
              <div className="ml-2.5 min-w-0 flex-1">
                <div className="text-[11px] font-bold tracking-[0.3px] text-ink/60">OWNER</div>
                <div className="truncate text-sm font-semibold text-ink">{owner.name ?? 'Unknown'}</div>
              </div>
              {owner.email && <div className="ml-2 min-w-0 shrink truncate text-[12.5px] text-ink/60">{owner.email}</div>}
            </>
          )}
        </div>

        {salon.serviceCategories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {salon.serviceCategories.slice(0, 4).map((c) => (
              <AdminPill key={c} label={c} tone="primary" />
            ))}
            {salon.serviceCategories.length > 4 && <AdminPill label={`+${salon.serviceCategories.length - 4}`} tone="neutral" />}
          </div>
        )}

        {salonHelpers.isRejected(salon) && salon.rejectionReason != null && (
          <div style={toneVars(tone)} className="a-tint-10 a-ink mt-3 flex items-start gap-2 rounded-xl p-3 text-[12.5px]">
            <Info size={15} className="mt-px shrink-0" />
            <span>{salon.rejectionReason}</span>
          </div>
        )}

        {salonHelpers.isPending(salon) && (
          <div className="mt-3.5 flex gap-3" onClick={(e) => e.stopPropagation()}>
            <AdminOutlinedButton tone="danger" icon={X} className="flex-1" disabled={approve.pending} loading={reject.pending} onClick={() => setRejecting(true)}>
              Reject
            </AdminOutlinedButton>
            <AdminFilledButton tone="success" icon={Check} className="flex-1" disabled={reject.pending} loading={approve.pending} onClick={() => void confirmApprove()}>
              {approve.pending ? 'Approving…' : 'Approve'}
            </AdminFilledButton>
          </div>
        )}
      </AdminCard>

      <SalonDetailsSheet
        open={details}
        salon={salon}
        owner={owner}
        busy={approve.pending || reject.pending}
        onClose={() => setDetails(false)}
        onReject={() => {
          setDetails(false)
          setRejecting(true)
        }}
        onApprove={() => {
          setDetails(false)
          void confirmApprove()
        }}
      />
      {rejecting && <RejectReasonDialog salon={salon} pending={reject.pending} onCancel={() => !reject.pending && setRejecting(false)} onReject={(reason) => void reject.run(reason)} />}
    </>
  )
}

function SalonDetailsSheet({ open, salon, owner, busy, onClose, onReject, onApprove }: { open: boolean; salon: SalonModel; owner: Owner; busy: boolean; onClose: () => void; onReject: () => void; onApprove: () => void }) {
  const approved = salonHelpers.isApproved(salon)
  const pending = salonHelpers.isPending(salon)
  const rejected = salonHelpers.isRejected(salon)
  const location = salonHelpers.fullLocation(salon)
  const imageCount = (salon.primaryImage ? 1 : 0) + (salon.imageGallery?.length ?? 0)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      footer={
        (pending || rejected || approved) && (
          <div className="flex gap-3">
            {(approved || pending) && (
              <AdminOutlinedButton tone="danger" className="flex-1" disabled={busy} onClick={onReject}>
                {approved ? 'Revoke approval' : 'Reject'}
              </AdminOutlinedButton>
            )}
            {(pending || rejected) && (
              <AdminFilledButton tone="success" className="flex-1" disabled={busy} onClick={onApprove}>
                Approve salon
              </AdminFilledButton>
            )}
          </div>
        )
      }
    >
      <div className="pt-2">
        <div className="flex items-center gap-3.5">
          <Avatar url={salon.primaryImage} name={salon.salonName} size={60} />
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold text-ink">{salon.salonName}</div>
            <div className="mt-1.5">
              <StatusPill salon={salon} />
            </div>
          </div>
        </div>
        <div className="mt-[22px]">
          <AdminInfoRow icon={MapPin} label="Address" value={salon.address} />
          {location && <AdminInfoRow icon={Map} label="Location" value={location} />}
          {salon.phoneNumber != null && <AdminInfoRow icon={Phone} label="Phone" value={salon.phoneNumber} />}
          {salon.description && <AdminInfoRow icon={FileText} label="Description" value={salon.description} />}
          {salon.openingTime != null && salon.closingTime != null && <AdminInfoRow icon={Clock} label="Hours" value={`${salon.openingTime} - ${salon.closingTime}`} />}
          <AdminInfoRow icon={Tag} label="Categories" value={salon.serviceCategories.length === 0 ? 'None' : salon.serviceCategories.join(', ')} />
          {salon.businessTypeNames.length > 0 && <AdminInfoRow icon={Building2} label="Business type" value={salon.businessTypeNames.join(', ')} />}
          <AdminInfoRow icon={ImageIcon} label="Images" value={`${imageCount} photo(s)`} />
        </div>
        <AdminCard surface="inset" className="mt-1 !p-3.5">
          <div className="flex items-center gap-3">
            <Avatar url={owner.avatar} name={owner.name} size={40} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold tracking-[0.3px] text-ink/60">OWNER</div>
              <div className="text-sm font-bold text-ink">{owner.name ?? 'Loading…'}</div>
              {owner.email && <div className="text-[12.5px] text-ink/60">{owner.email}</div>}
            </div>
          </div>
        </AdminCard>
      </div>
    </Sheet>
  )
}

/** _RejectReasonDialog: returns the trimmed reason. */
function RejectReasonDialog({ salon, pending, onCancel, onReject }: { salon: SalonModel; pending: boolean; onCancel: () => void; onReject: (reason: string) => void }) {
  const [text, setText] = useState('')
  const reason = text.trim()
  return (
    <AdminDialogFrame
      open
      onClose={onCancel}
      icon={OctagonX}
      tone="danger"
      title="Reject salon"
      message={`Tell "${salon.salonName}" why it was rejected so the owner can fix it.`}
      actions={
        <>
          <AdminTextButton tone="neutral" disabled={pending} onClick={onCancel}>
            Cancel
          </AdminTextButton>
          <AdminFilledButton tone="danger" disabled={!reason} loading={pending} onClick={() => onReject(reason)}>
            {pending ? 'Rejecting…' : 'Reject'}
          </AdminFilledButton>
        </>
      }
    >
      <textarea
        autoFocus
        rows={3}
        maxLength={250}
        value={text}
        disabled={pending}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reason for rejection…"
        className="field resize-none"
      />
      <div className="mt-1 text-right text-xs text-ink/50">{text.length}/250</div>
    </AdminDialogFrame>
  )
}
