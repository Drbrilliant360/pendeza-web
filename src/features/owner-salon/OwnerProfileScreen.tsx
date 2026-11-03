// Port of lib/features/3_owner_profile_screen/owner_profile_screen.dart
import { Bell, Building2, ChevronRight, CheckCircle2, CircleHelp, Globe, LogOut, UserCircle, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { ThemeModeButton } from '@/layouts/MainShell'
import { useFeedback } from '@/components/feedback'
import { Avatar, Screen, SecondaryButton, Sheet } from '@/components/ui'
import { useI18n } from '@/lib/i18n'
import { OwnerAppBar } from './components/OwnerChrome'
import { OwnerSalonRoutes } from './paths'

export default function OwnerProfileScreen() {
  const { t, lang, setLang } = useI18n()
  const { status, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [langOpen, setLangOpen] = useState(false)
  const { confirm, toastError } = useFeedback()
  const [signingOut, setSigningOut] = useState(false)

  const confirmSignOut = async () => {
    if (signingOut) return
    const ok = await confirm({
      title: `${t('client.profile.menu.logout')}?`,
      message: 'You will need to sign in again to manage your salon.',
      confirmText: t('client.profile.menu.logout'),
      destructive: true,
    })
    if (!ok) return
    setSigningOut(true)
    try {
      await signOut()
    } catch (e) {
      toastError(e, 'Could not sign out', () => void signOut())
      setSigningOut(false)
    }
  }

  const isLoading = status === 'loading'
  const fullName = user?.fullName ?? 'Salon Owner'
  const email = user?.email ?? ''

  return (
    <>
      <OwnerAppBar title={t('client.profile.title')} actions={<ThemeModeButton className="md:hidden" />} />
      <Screen className="px-4 pt-6 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <Avatar url={user?.profilePictureUrl} name={fullName} size={100} />
          <h2 className="t-display mt-4 max-w-full truncate">{fullName}</h2>
          <p className="max-w-full truncate text-[15px] text-ink/70">{email}</p>
        </div>

        <div className="mt-8 md:grid md:grid-cols-2 md:gap-8">
          <div>
            <SectionTitle>{t('owner.profile.business_section')}</SectionTitle>
            <MenuItem
              icon={Building2}
              title={t('owner.profile.manage_salon')}
              subtitle={t('owner.profile.manage_salon_subtitle')}
              onClick={isLoading ? undefined : () => navigate(Routes.ownerSalonProfile)}
            />
          </div>

          <div className="mt-8 md:mt-0">
            <SectionTitle>{t('owner.profile.account_section')}</SectionTitle>
            <MenuItem
              icon={UserCircle}
              title={t('client.profile.menu.edit_profile')}
              subtitle={t('owner.profile.edit_profile_subtitle')}
              onClick={isLoading ? undefined : () => navigate(OwnerSalonRoutes.editProfile)}
            />
            <MenuItem
              icon={Bell}
              title={t('client.profile.menu.notifications')}
              subtitle={t('owner.profile.notifications_subtitle')}
              onClick={isLoading ? undefined : () => navigate(OwnerSalonRoutes.notificationSettings)}
            />
            <MenuItem
              icon={Globe}
              title={t('client.profile.menu.language')}
              subtitle={lang === 'sw' ? 'Kiswahili' : 'English'}
              onClick={() => setLangOpen(true)}
            />
            <MenuItem
              icon={CircleHelp}
              title={t('client.profile.menu.help')}
              subtitle={t('owner.profile.help_subtitle')}
              onClick={isLoading ? undefined : () => navigate(Routes.helpSupport)}
            />
          </div>
        </div>

        <SecondaryButton icon={LogOut} className="mt-8 w-full" disabled={isLoading} loading={signingOut} onClick={() => void confirmSignOut()}>
          {t('client.profile.menu.logout')}
        </SecondaryButton>
      </Screen>

      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title={t('client.profile.language_selector.title')}>
        {(
          [
            ['en', '🇺🇸', t('client.profile.language_selector.english')],
            ['sw', '🇹🇿', t('client.profile.language_selector.swahili')],
          ] as const
        ).map(([code, flag, label]) => (
          <button
            key={code}
            onClick={() => {
              setLang(code)
              setLangOpen(false)
            }}
            className="flex w-full items-center gap-4 rounded-2xl px-2 py-3.5 text-left hover:bg-inset"
          >
            <span className="text-2xl">{flag}</span>
            <span className="flex-1 text-[15px] text-ink">{label}</span>
            {lang === code && <CheckCircle2 size={22} className="text-primary" />}
          </button>
        ))}
      </Sheet>
    </>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <p className="mb-2 text-[14px] font-bold tracking-[1.2px] text-ink/60">{children}</p>
}

function MenuItem({ icon: Icon, title, subtitle, onClick }: { icon: LucideIcon; title: string; subtitle: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left transition hover:bg-inset disabled:opacity-60"
    >
      <Icon size={28} className="shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium text-ink">{title}</span>
        <span className="block text-[12.5px] text-ink/60">{subtitle}</span>
      </span>
      <ChevronRight size={18} className="text-muted" />
    </button>
  )
}
