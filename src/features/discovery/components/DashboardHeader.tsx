// Port of 2_client_dashboard/presentation/widgets/dashboard_header.dart
import { ArrowRightCircle, Bell, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { Avatar, BrandHero, GlassCircleButton } from '@/components/ui'
import { ThemeModeButton } from '@/layouts/MainShell'
import { useT } from '@/lib/i18n'
import { watchUnreadNotificationCount } from '../api'

function useUnreadCount(uid: string | null) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!uid) {
      setN(0)
      return
    }
    return watchUnreadNotificationCount(uid, setN)
  }, [uid])
  return n
}

export default function DashboardHeader() {
  const t = useT()
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const isAuthenticated = status === 'authenticated' && !!user && !user.isGuest
  const name = isAuthenticated ? user.fullName.split(' ')[0] : 'Guest'
  const unread = useUnreadCount(isAuthenticated ? user.uid : null)

  const h = new Date().getHours()
  const greeting = t(h < 12 ? 'client.dashboard.greeting.morning' : h < 17 ? 'client.dashboard.greeting.afternoon' : 'client.dashboard.greeting.evening')

  return (
    <BrandHero className="mx-4 mt-2" padded={false}>
      <div className="px-5 pb-[18px] pt-5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[1.2px] text-white/80">{greeting}</p>
            <p className="mt-1 truncate text-[27px] font-bold leading-[1.2] tracking-[-0.4px]">
              {name}
              <span className="text-2xl">{'  👋'}</span>
            </p>
          </div>
          <ThemeModeButton className="h-11 w-11 border border-white/30 bg-white/20 !text-white hover:bg-white/30" />
          {isAuthenticated ? (
            <>
              <GlassCircleButton icon={Bell} size={44} badge={unread} label="Notifications" onClick={() => navigate(Routes.clientNotifications)} />
              <button
                onClick={() => navigate(Routes.clientProfile)}
                aria-label="Profile"
                className="ml-0.5 rounded-full border-2 border-white/85 p-0.5"
              >
                <Avatar url={user.profilePictureUrl} name={name} size={42} />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate(Routes.login)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-[11px] text-[13.5px] font-bold text-primary-dark transition hover:bg-white/90"
            >
              <ArrowRightCircle size={18} className="text-primary" fill="currentColor" stroke="white" />
              {t('auth.login.button')}
            </button>
          )}
        </div>
        <button
          onClick={() => navigate(Routes.clientDiscover)}
          className="mt-[18px] flex w-full items-center gap-3 rounded-[18px] bg-white py-2 pl-4 pr-2 text-left transition hover:bg-white/95"
        >
          <Search size={20} className="shrink-0 text-[#636E72]" />
          <span className="flex-1 truncate text-sm font-medium text-[#636E72]">{t('client.dashboard.search_hint')}</span>
          <span className="grid h-[38px] w-[38px] place-items-center rounded-[13px] bg-brand-gradient">
            <SlidersHorizontal size={18} className="text-white" />
          </span>
        </button>
      </div>
    </BrandHero>
  )
}
