// Port of admin_shell_route.dart: collapsible sidebar on wide screens (≥ 900px),
// bottom bar on phones. Provides the AdminBloc equivalent (AdminProvider) to every page.
import { BarChart3, Bell, Building2, CalendarDays, LogOut, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Sun, Tag, Users, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { useAuth } from '@/auth/AuthContext'
import { useFeedback } from '@/components/feedback'
import { cx, Sheet } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { useTheme, type ThemeMode } from '@/lib/theme'
import { AdminProvider } from './AdminContext'
import { AdminConfirmProvider, AdminIconTile, AdminShellScope, BrandIcon, toneVars, useAdminConfirm, type AdminTone } from './components/ui'

interface NavDestination { route: string; label: string; shortLabel: string; icon: LucideIcon }

// NOTE (from the app): Inspiration tab temporarily removed - will return in future months
const DESTINATIONS: NavDestination[] = [
  { route: Routes.adminHome, label: 'Dashboard', shortLabel: 'Home', icon: BarChart3 },
  { route: Routes.adminUsers, label: 'Users', shortLabel: 'Users', icon: Users },
  { route: Routes.adminSalons, label: 'Salons', shortLabel: 'Salons', icon: Building2 },
  { route: Routes.adminPromotions, label: 'Promotions', shortLabel: 'Promos', icon: Tag },
  { route: Routes.adminNotifications, label: 'Notifications', shortLabel: 'Alerts', icon: Bell },
  { route: Routes.adminTransactions, label: 'Bookings', shortLabel: 'Bookings', icon: CalendarDays },
]

function useViewportWidth() {
  const [w, setW] = useState(() => window.innerWidth)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

export const themeModeIcon = (m: ThemeMode): LucideIcon => (m === 'light' ? Sun : m === 'dark' ? Moon : Monitor)

/** showThemeModeSheet – the three appearance options. */
export function ThemeModeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const { mode, setMode } = useTheme()
  const options: { m: ThemeMode; label: string; desc: string }[] = [
    { m: 'system', label: t('appearance.system'), desc: t('appearance.system_desc') },
    { m: 'light', label: t('appearance.light'), desc: t('appearance.light_desc') },
    { m: 'dark', label: t('appearance.dark'), desc: t('appearance.dark_desc') },
  ]
  return (
    <Sheet open={open} onClose={onClose} title={t('appearance.title')}>
      <p className="t-caption -mt-1 mb-4">{t('appearance.subtitle')}</p>
      <div className="flex flex-col gap-2.5">
        {options.map((o) => {
          const Icon = themeModeIcon(o.m)
          const on = mode === o.m
          return (
            <button
              key={o.m}
              onClick={() => {
                setMode(o.m)
                onClose()
              }}
              className={cx('flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition', on ? 'border-primary bg-primary/10' : 'border-line hover:bg-inset')}
            >
              <span className={cx('grid h-10 w-10 place-items-center rounded-xl', on ? 'bg-primary text-white' : 'bg-inset text-ink')}>
                <Icon size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink">{o.label}</span>
                <span className="t-caption block">{o.desc}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

function SidebarAction({ icon: Icon, label, extended, tone = 'neutral', onClick }: { icon: LucideIcon; label: string; extended: boolean; tone?: AdminTone; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={extended ? undefined : label}
      style={toneVars(tone)}
      className={cx('a-ink flex h-11 items-center rounded-[14px] px-3.5 text-[13.5px] font-semibold transition hover:bg-ink/5', extended ? 'justify-start gap-3.5' : 'justify-center')}
    >
      <Icon size={20} className="shrink-0" />
      {extended && <span className="truncate">{label}</span>}
    </button>
  )
}

function ShellInner() {
  const t = useT()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { mode } = useTheme()
  const confirm = useAdminConfirm()
  const { toastError } = useFeedback()
  const width = useViewportWidth()
  const [sidebarExtended, setSidebarExtended] = useState<boolean | null>(null)
  const [themeOpen, setThemeOpen] = useState(false)

  const useSidebar = width >= 900
  const extended = sidebarExtended ?? width >= 1150
  const found = DESTINATIONS.findIndex((d) => pathname.startsWith(d.route))
  const currentIndex = found < 0 ? 0 : found

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  const confirmLogout = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You will need to sign in again to manage Pendeza.',
      confirmLabel: 'Sign out',
      tone: 'danger',
      icon: LogOut,
    })
    if (!ok) return
    try {
      await signOut()
    } catch (e) {
      toastError(e, 'Could not sign out', () => void signOut())
    }
  }

  return (
    <AdminShellScope.Provider value={{ onLogout: () => void confirmLogout() }}>
      <div className="flex min-h-screen bg-page">
        {useSidebar && (
          <aside
            className="sticky top-0 flex h-screen shrink-0 flex-col border-r border-line bg-card px-3.5 py-4 transition-[width] duration-200 ease-out"
            style={{ width: extended ? 252 : 84 }}
          >
            <div className={cx('flex items-center', extended ? 'justify-start gap-3' : 'justify-center')}>
              <AdminIconTile icon={BrandIcon} gradient size={44} />
              {extended && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-bold leading-tight text-ink">Pendeza</div>
                  <div className="truncate text-[12.5px] text-ink/60">Admin console</div>
                </div>
              )}
            </div>
            <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
              {DESTINATIONS.map((d, i) => {
                const selected = i === currentIndex
                return (
                  <button
                    key={d.route}
                    type="button"
                    title={extended ? undefined : d.label}
                    onClick={() => navigate(d.route)}
                    aria-current={selected ? 'page' : undefined}
                    className={cx(
                      'flex h-12 shrink-0 items-center rounded-[14px] px-3.5 text-sm transition',
                      extended ? 'justify-start gap-3.5' : 'justify-center',
                      selected ? 'bg-primary/[0.14] font-bold text-primary-dark dark:text-primary-light' : 'font-medium text-ink/60 hover:bg-ink/5 hover:text-ink',
                    )}
                  >
                    <d.icon size={22} strokeWidth={selected ? 2.4 : 1.9} className="shrink-0" />
                    {extended && (
                      <>
                        <span className="flex-1 truncate text-left">{d.label}</span>
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </>
                    )}
                  </button>
                )
              })}
            </nav>
            <div className="my-3 h-px bg-line" />
            <SidebarAction icon={extended ? PanelLeftClose : PanelLeftOpen} label={extended ? 'Collapse' : 'Expand'} extended={extended} onClick={() => setSidebarExtended(!extended)} />
            <div className="h-1" />
            <SidebarAction icon={themeModeIcon(mode)} label={t('appearance.title')} extended={extended} onClick={() => setThemeOpen(true)} />
            <div className="h-1" />
            <SidebarAction icon={LogOut} label="Sign out" extended={extended} tone="danger" onClick={() => void confirmLogout()} />
          </aside>
        )}

        <main className="min-w-0 flex-1 pt-[env(safe-area-inset-top)]">
          <Outlet />
        </main>

        {!useSidebar && (
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
            <div className="flex px-1 pb-1.5 pt-2">
              {DESTINATIONS.map((d, i) => {
                const selected = i === currentIndex
                return (
                  <button
                    key={d.route}
                    type="button"
                    aria-label={d.label}
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => navigate(d.route)}
                    className={cx('flex min-w-0 flex-1 flex-col items-center rounded-2xl', selected ? 'text-primary-dark dark:text-primary-light' : 'text-ink/60')}
                  >
                    <span className={cx('grid h-7 w-12 place-items-center rounded-[14px] transition-colors duration-200', selected && 'bg-primary/[0.16]')}>
                      <d.icon size={20} strokeWidth={selected ? 2.4 : 1.9} />
                    </span>
                    <span className={cx('mt-[3px] max-w-full truncate text-[10px]', selected ? 'font-bold' : 'font-medium')}>{d.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}
      </div>
      <ThemeModeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />
    </AdminShellScope.Provider>
  )
}

export default function AdminShell() {
  return (
    <AdminConfirmProvider>
      <AdminProvider>
        <ShellInner />
      </AdminProvider>
    </AdminConfirmProvider>
  )
}
