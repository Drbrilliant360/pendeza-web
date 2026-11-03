// Port of dashboard/presentation/widgets/dashboard_header.dart
import { Building2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Avatar } from '@/components/ui'
import { useT } from '@/lib/i18n'

export default function DashboardHeader({ salonName }: { salonName: string }) {
  const t = useT()
  const { status, user } = useAuth()
  const h = new Date().getHours()
  const greeting = t(h < 12 ? 'owner.dashboard.greeting_morning' : h < 17 ? 'owner.dashboard.greeting_afternoon' : 'owner.dashboard.greeting_evening')
  const authed = status === 'authenticated' && user
  const ownerName = authed ? user.fullName.split(' ')[0] : 'Owner'
  const imageUrl = authed ? user.profilePictureUrl : null

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.08] to-accent/[0.05] p-4 shadow-[0_4px_20px_rgba(108,92,231,0.08)]">
      <div className="rounded-full bg-gradient-to-br from-primary to-accent p-[3px] shadow-[0_4px_12px_rgba(108,92,231,0.3)]">
        <Avatar url={imageUrl} name={ownerName} size={56} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted">{greeting}</p>
        <div className="mt-1 flex items-center gap-1">
          <span className="truncate text-lg font-bold text-ink">{ownerName}</span>
          <span className="text-xl" style={{ animation: 'kpiIn 600ms cubic-bezier(0.34,1.56,0.64,1) both' }} aria-hidden>
            {'\u{1F44B}'}
          </span>
        </div>
        <div className="mt-0.5 flex">
          <span className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/15 to-accent/15 px-2 py-1 text-xs font-semibold text-primary dark:text-primary-light">
            <Building2 size={12} className="shrink-0" />
            <span className="truncate">{salonName}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
