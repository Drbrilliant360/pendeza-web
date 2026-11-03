// Port of lib/screens/main_screen.dart: client (4 tabs) / owner (5 tabs) shell.
// Mobile: bottom tab bar like the app. Desktop (md+): left sidebar with the same destinations.
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import {
  BarChart3,
  CalendarDays,
  Compass,
  Home,
  Moon,
  Monitor,
  Scissors,
  Sun,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { cx } from '@/components/ui'
import { db } from '@/lib/firebase'
import { ACTIVE_STATUSES, AppointmentStatus, toDate } from '@/lib/models'
import { useTheme } from '@/lib/theme'

interface NavItem { to: string; label: string; icon: LucideIcon; badge?: number }

/** AppointmentsState.activeAppointmentsCount = pending-payment + upcoming(confirmed, future) */
function useActiveAppointmentsCount(uid: string | null) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!uid) { setCount(0); return }
    const q = query(collection(db, 'appointments'), where('clientId', '==', uid), where('status', 'in', ACTIVE_STATUSES))
    return onSnapshot(
      q,
      (snap) => {
        const now = new Date()
        setCount(
          snap.docs.filter((d) => {
            const st = d.get('status')
            return st === AppointmentStatus.pendingPayment || toDate(d.get('startTime')) > now
          }).length,
        )
      },
      () => setCount(0),
    )
  }, [uid])
  return count
}

export function ThemeModeButton({ className }: { className?: string }) {
  const { mode, toggle } = useTheme()
  const Icon = mode === 'system' ? Monitor : mode === 'light' ? Sun : Moon
  return (
    <button onClick={toggle} title={`Theme: ${mode}`} aria-label={`Theme: ${mode}`} className={cx('grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-inset hover:text-ink', className)}>
      <Icon size={19} />
    </button>
  )
}

export default function MainShell() {
  const { user, isGuest } = useAuth()
  const { pathname } = useLocation()
  const role = user?.role === 'owner' ? 'owner' : 'client'
  const badge = useActiveAppointmentsCount(role === 'client' && !isGuest ? user?.uid ?? null : null)

  const items: NavItem[] =
    role === 'client'
      ? [
          { to: Routes.clientHome, label: 'Home', icon: Home },
          { to: Routes.clientDiscover, label: 'Discover', icon: Compass },
          { to: Routes.clientBookings, label: 'Bookings', icon: CalendarDays, badge },
          { to: Routes.clientProfile, label: 'Profile', icon: User },
        ]
      : [
          { to: Routes.ownerHome, label: 'Home', icon: BarChart3 },
          { to: Routes.ownerSchedule, label: 'Schedule', icon: CalendarDays },
          { to: Routes.ownerServices, label: 'Services', icon: Scissors },
          { to: Routes.ownerClients, label: 'Clients', icon: Users },
          { to: Routes.ownerProfile, label: 'Profile', icon: User },
        ]

  // Scroll to top on route change (pages are separate screens in the app)
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="min-h-screen bg-page md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line/60 bg-card px-3 py-5 dark:border-line md:flex lg:w-64">
        <div className="flex items-center gap-2.5 px-3 pb-6">
          <img src="/images/icons/App_Icon.png" alt="" className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-bold tracking-tight text-ink">Pendeza</span>
          {role === 'owner' && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Business</span>}
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition',
                  isActive ? 'bg-primary/10 font-bold text-primary-dark dark:text-primary-light' : 'font-medium text-muted hover:bg-inset hover:text-ink',
                )
              }
            >
              <it.icon size={20} />
              <span className="flex-1">{it.label}</span>
              {!!it.badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{it.badge > 99 ? '99+' : it.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between px-2">
          <span className="t-caption">Appearance</span>
          <ThemeModeButton />
        </div>
      </aside>

      <a href="#main" className="sr-only z-50 rounded-xl bg-primary px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <main id="main" className="min-w-0 flex-1 pt-[env(safe-area-inset-top)]">
        <Outlet />
      </main>

      {/* Mobile bottom nav (AdaptiveBottomNav) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/50 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(0,0,0,0.06)] backdrop-blur dark:border-line md:hidden">
        <div className="mx-auto flex h-[64px] max-w-xl items-stretch">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className="flex flex-1 flex-col items-center justify-center gap-0.5">
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <it.icon size={items.length > 4 ? 22 : 24} strokeWidth={isActive ? 2.4 : 1.8} className={cx('transition', isActive ? 'scale-110 text-primary' : 'text-ink/60')} />
                    {!!it.badge && (
                      <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                        {it.badge > 99 ? '99+' : it.badge}
                      </span>
                    )}
                  </span>
                  <span className={cx('text-[10.5px]', isActive ? 'font-bold text-primary' : 'text-ink/60')}>{it.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
