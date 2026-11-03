// Port of dialog/admin_role_dialog.dart
import { Building2, Check, ShieldHalf, User, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useAction } from '@/components/feedback'
import { Avatar, cx } from '@/components/ui'
import type { UserModel } from '@/lib/models'
import { useAdmin } from '../AdminContext'
import { AdminCloseButton, AdminFilledButton, AdminIconTile, AdminModal, AdminPill, AdminTextButton, adminRoleLabel, adminRoleTone, toneVars, type AdminTone } from './ui'

interface RoleOption { role: string; title: string; description: string; icon: LucideIcon; tone: AdminTone }
const ROLES: RoleOption[] = [
  { role: 'admin', title: 'Administrator', description: 'Full access to all features and settings', icon: ShieldHalf, tone: 'danger' },
  { role: 'owner', title: 'Salon Owner', description: 'Manage salon services and bookings', icon: Building2, tone: 'info' },
  { role: 'client', title: 'Client', description: 'Book appointments and view services', icon: User, tone: 'success' },
]

export default function AdminRoleDialog({ user, onClose }: { user: UserModel; onClose: () => void }) {
  const { updateUserRole } = useAdmin()
  const [selected, setSelected] = useState<string>(user.role ?? 'client')
  const changed = selected !== user.role
  // Stay open with a spinner until the write lands; close + confirm only on success.
  const save = useAction(() => updateUserRole(user.uid, selected), {
    success: 'Role updated successfully',
    error: 'Could not update the role',
    onSuccess: onClose,
  })
  const close = () => {
    if (!save.pending) onClose()
  }

  return (
    <AdminModal open onClose={close} maxWidth={460}>
      <div className="overflow-y-auto px-6 pb-5 pt-6">
        <div className="flex items-center gap-3.5">
          <Avatar url={user.profilePictureUrl} name={user.fullName} size={52} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold text-ink">{user.fullName || 'Unnamed user'}</div>
            <div className="mt-1">
              <AdminPill label={`Currently ${adminRoleLabel(user.role)}`} tone={adminRoleTone(user.role)} />
            </div>
          </div>
          <AdminCloseButton onClick={close} />
        </div>
        <h3 className="mt-[22px] text-base font-bold text-ink">Change role</h3>
        <p className="mt-0.5 text-[12.5px] text-ink/60">Choose what this person can do in Pendeza.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {ROLES.map((o) => {
            const on = selected === o.role
            return (
              <button
                key={o.role}
                type="button"
                disabled={save.pending}
                onClick={() => setSelected(o.role)}
                style={toneVars(o.tone)}
                className={cx('flex items-center gap-3.5 rounded-2xl p-3.5 text-left transition', on ? 'a-tint-10 a-border border-[1.6px]' : 'border border-line bg-card hover:bg-ink/[0.03]')}
              >
                <AdminIconTile icon={o.icon} tone={o.tone} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink">{o.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-ink/60">{o.description}</div>
                </div>
                <span className={cx('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.6px] transition', on ? 'a-bg-base a-border text-white' : 'border-line')}>
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-6 flex gap-2">
          <AdminTextButton tone="neutral" className="flex-1" disabled={save.pending} onClick={onClose}>
            Cancel
          </AdminTextButton>
          <AdminFilledButton icon={Check} className="flex-[2]" disabled={!changed} loading={save.pending} onClick={() => void save.run()}>
            {save.pending ? 'Saving…' : 'Save changes'}
          </AdminFilledButton>
        </div>
      </div>
    </AdminModal>
  )
}
