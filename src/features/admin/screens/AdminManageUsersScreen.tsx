// Port of admin_manage_user_screen.dart + widgets/admin_user_list_item.dart
import { ChevronRight, UserX, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Avatar } from '@/components/ui'
import { formatDate } from '@/lib/format'
import type { UserModel } from '@/lib/models'
import { useAdminState } from '../AdminContext'
import AdminRoleDialog from '../components/AdminRoleDialog'
import { AdminDataTable } from '../components/AdminDataTable'
import {
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminFilterBar,
  AdminFilterChip,
  AdminLoadingState,
  AdminPage,
  AdminPill,
  AdminSearchField,
  adminRoleLabel,
  adminRoleTone,
} from '../components/ui'

type RoleFilter = 'all' | 'client' | 'owner' | 'admin'
const contactOf = (u: UserModel) => (u.email ? u.email : u.phoneNumber ?? 'No contact details')

export default function AdminManageUsersScreen() {
  const { status, loaded, error, loadAdminData } = useAdminState()
  const [role, setRole] = useState<RoleFilter>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<UserModel | null>(null)
  const users = loaded?.users ?? []
  const count = (r: string) => users.filter((u) => u.role === r).length

  let body: ReactNode = null
  if (status === 'loading' || status === 'initial') body = <AdminLoadingState />
  else if (status === 'error') body = <AdminErrorState error={error} fallback="Could not load users" onRetry={() => void loadAdminData()} />
  else if (loaded) {
    let result = role === 'all' ? users : users.filter((u) => u.role === role)
    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phoneNumber ?? '').toLowerCase().includes(q))
    }
    if (result.length === 0) {
      const filtering = query !== '' || role !== 'all'
      body = (
        <AdminEmptyState
          icon={UserX}
          title={filtering ? 'No matching users' : 'No users yet'}
          message={filtering ? 'Try a different search or clear the filters.' : 'Accounts will appear here as people sign up.'}
        />
      )
    } else {
      body = (
        <AdminDataTable
          rows={result}
          rowKey={(u) => u.uid}
          rowsPerPage={25}
          cardMinWidth={420}
          onRowClick={setEditing}
          renderCard={(u) => <UserListItem user={u} onClick={() => setEditing(u)} />}
          columns={[
            {
              key: 'name',
              label: 'User',
              render: (u) => (
                <div className="flex items-center gap-3">
                  <Avatar url={u.profilePictureUrl} name={u.fullName} size={36} />
                  <span className="font-bold">{u.fullName || 'Unnamed user'}</span>
                </div>
              ),
            },
            { key: 'email', label: 'Email', render: (u) => <span className="text-ink/70">{u.email || '—'}</span> },
            { key: 'phone', label: 'Phone', render: (u) => <span className="text-ink/70">{u.phoneNumber ?? '—'}</span> },
            { key: 'joined', label: 'Joined', render: (u) => <span className="text-ink/70">{formatDate(u.createdAt)}</span> },
            { key: 'role', label: 'Role', align: 'right', render: (u) => <AdminPill label={adminRoleLabel(u.role)} tone={adminRoleTone(u.role)} /> },
          ]}
        />
      )
    }
  }

  return (
    <AdminPage
      title="Users"
      subtitle={loaded ? `${users.length} accounts` : null}
      icon={Users}
      toolbar={loaded && <AdminSearchField hint="Search by name, email or phone" onChange={setQuery} />}
      filters={
        loaded && (
          <AdminFilterBar>
            <AdminFilterChip label="All" count={users.length} selected={role === 'all'} onClick={() => setRole('all')} />
            <AdminFilterChip label="Clients" count={count('client')} tone="success" selected={role === 'client'} onClick={() => setRole('client')} />
            <AdminFilterChip label="Owners" count={count('owner')} tone="info" selected={role === 'owner'} onClick={() => setRole('owner')} />
            <AdminFilterChip label="Admins" count={count('admin')} tone="danger" selected={role === 'admin'} onClick={() => setRole('admin')} />
          </AdminFilterBar>
        )
      }
    >
      {body}
      {editing && <AdminRoleDialog user={editing} onClose={() => setEditing(null)} />}
    </AdminPage>
  )
}

/** AdminUserListItem */
function UserListItem({ user, onClick }: { user: UserModel; onClick: () => void }) {
  return (
    <AdminCard onClick={onClick} className="!px-4 !py-3.5">
      <div className="flex items-center">
        <Avatar url={user.profilePictureUrl} name={user.fullName} size={44} />
        <div className="ml-3.5 min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{user.fullName || 'Unnamed user'}</div>
          <div className="mt-0.5 truncate text-[12.5px] text-ink/60">{contactOf(user)}</div>
        </div>
        <div className="ml-3 shrink-0">
          <AdminPill label={adminRoleLabel(user.role)} tone={adminRoleTone(user.role)} />
        </div>
        <ChevronRight size={14} className="ml-1.5 shrink-0 text-ink/60" />
      </div>
    </AdminCard>
  )
}
