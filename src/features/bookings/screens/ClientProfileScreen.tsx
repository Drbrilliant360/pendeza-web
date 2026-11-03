// Port of 2_client_profile/presentation/screens/profile_screen.dart (+ ProfileBloc, ProfileHeaderWidget).
// Wallet section hidden: payments are disabled.
import { BadgeCheck, Bell, Camera, CircleHelp, CircleUser, Globe, Heart, Loader2, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Routes } from '@/app/redirect'
import { useAction, useFeedback } from '@/components/feedback'
import { Avatar, BrandHero, LoadingScreen, Screen, TONES } from '@/components/ui'
import { useAsync } from '@/lib/hooks'
import { useI18n, useT } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import type { UserModel } from '@/lib/models'
import { getUserStats, type ProfileStats } from '../api'
import { useAvatarUpload } from '../components/useAvatarUpload'
import {
  HeroThemeButton,
  LanguageSheet,
  ProfileMenuTile,
  ProfileSectionCard,
  ProfileStatItem,
  ThemeModeSheet,
  themeModeIcon,
  useThemeModeLabel,
} from '../components/ProfileParts'
import GuestProfileScreen from './GuestProfileScreen'

export default function ClientProfileScreen() {
  const { status, user } = useAuth()
  if (status === 'guest') return <GuestProfileScreen />
  if (status === 'authenticated' && user) return <AuthenticatedProfileView user={user} />
  return <LoadingScreen />
}

const EMPTY: ProfileStats = { totalBookings: 0, totalReviews: 0, totalFavorites: 0 }

function AuthenticatedProfileView({ user }: { user: UserModel }) {
  const t = useT()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { confirm } = useFeedback()
  const { lang } = useI18n()
  const { mode } = useTheme()
  const themeLabel = useThemeModeLabel()
  const [themeOpen, setThemeOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  // Stats are non-critical: getUserStats already falls back to zeros on failure (as in the app).
  const { data, loading: statsLoading } = useAsync(() => getUserStats(user.uid), [user.uid])
  const stats = data ?? EMPTY
  const avatar = useAvatarUpload(user.uid)
  const signOutAction = useAction(() => signOut(), { success: 'Signed out', error: "Couldn't sign out" })

  const logout = async () => {
    const ok = await confirm({
      title: t('client.profile.logout_title'),
      message: t('client.profile.logout_confirm'),
      confirmText: t('client.profile.menu.logout'),
      cancelText: t('common.cancel'),
      destructive: true,
    })
    if (ok) await signOutAction.run()
  }

  const hasVerifiedPhone = !!user.phoneNumber

  return (
    <Screen>
      {avatar.element}
      <div className="px-4 pt-2">
        <BrandHero radius={32} padded={false}>
          <div className="relative px-5 pb-5 pt-[26px] text-center">
            <div className="absolute right-2.5 top-2.5">
              <HeroThemeButton onClick={() => setThemeOpen(true)} />
            </div>
            <div className="relative mx-auto w-fit">
              <button type="button" onClick={avatar.pick} disabled={avatar.uploading} className="rounded-full border-2 border-white/70 bg-white/20 p-1" aria-label="Change profile picture">
                <Avatar url={user.profilePictureUrl} name={user.fullName} size={100} />
              </button>
              {avatar.uploading && (
                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/45">
                  <Loader2 className="animate-spin text-white" size={32} />
                </div>
              )}
              <button
                type="button"
                onClick={avatar.pick}
                disabled={avatar.uploading}
                aria-label="Change profile picture"
                className="absolute bottom-0.5 right-0.5 grid h-[31px] w-[31px] place-items-center rounded-full bg-card text-primary shadow-[0_3px_8px_rgba(0,0,0,0.2)]"
              >
                <Camera size={15} fill="currentColor" />
              </button>
            </div>
            {avatar.uploading && <div className="mx-auto mt-3 max-w-[260px] rounded-2xl bg-card px-3 py-2 text-left">{avatar.progressBar}</div>}
            <h1 className="mt-3.5 line-clamp-2 text-[23px] font-bold leading-tight tracking-[-0.3px]">{user.fullName}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-[13px] text-white/85">
              <span className="truncate">{user.email}</span>
              {hasVerifiedPhone && <BadgeCheck size={15} className="shrink-0 text-[#8FE3C9]" />}
            </p>
            <div className="mx-auto mt-5 flex max-w-lg items-stretch rounded-[22px] border border-white/25 bg-white/15 py-3">
              <div className="flex-1">
                <ProfileStatItem label={t('client.profile.stats.bookings')} value={String(stats.totalBookings)} loading={statsLoading} onTap={() => navigate(Routes.clientBookings)} />
              </div>
              <div className="my-1 w-px bg-white/25" />
              <div className="flex-1">
                <ProfileStatItem label={t('client.profile.stats.reviews')} value={String(stats.totalReviews)} loading={statsLoading} />
              </div>
              <div className="my-1 w-px bg-white/25" />
              <div className="flex-1">
                <ProfileStatItem label={t('client.profile.stats.saved')} value={String(stats.totalFavorites)} loading={statsLoading} onTap={() => navigate(Routes.clientFavorites)} />
              </div>
            </div>
          </div>
        </BrandHero>
      </div>

      <div className="px-5 py-6 md:grid md:grid-cols-2 md:gap-x-5">
        <div>
          <SectionLabel>{t('client.profile.section_account')}</SectionLabel>
          <ProfileSectionCard>
            <ProfileMenuTile
              icon={CircleUser}
              iconColor={TONES[0]}
              title={t('client.profile.menu.edit_profile')}
              subtitle={t('client.profile.edit_profile_subtitle')}
              onTap={() => navigate(Routes.editProfile)}
            />
            <ProfileMenuTile icon={Heart} iconColor="#FF7A90" title={t('client.profile.menu.favorites')} onTap={() => navigate(Routes.clientFavorites)} />
            <ProfileMenuTile icon={Bell} iconColor="#F5A623" title={t('client.profile.menu.notifications')} onTap={() => navigate(Routes.clientNotifications)} />
          </ProfileSectionCard>
        </div>
        <div className="mt-6 md:mt-0">
          <SectionLabel>{t('client.profile.section_preferences')}</SectionLabel>
          <ProfileSectionCard>
            <ProfileMenuTile
              icon={Globe}
              iconColor="#4DA3FF"
              title={t('client.profile.menu.language')}
              trailing={
                <span className="t-caption font-bold !text-primary">
                  {lang === 'sw' ? t('client.profile.language_selector.swahili') : t('client.profile.language_selector.english')}
                </span>
              }
              onTap={() => setLangOpen(true)}
            />
            <ProfileMenuTile
              icon={themeModeIcon(mode)}
              iconColor="#B57BFF"
              title={t('appearance.title')}
              trailing={<span className="t-caption font-bold !text-primary">{themeLabel(mode)}</span>}
              onTap={() => setThemeOpen(true)}
            />
            <ProfileMenuTile icon={CircleHelp} iconColor="#00B894" title={t('client.profile.menu.help')} onTap={() => navigate(`${Routes.helpSupport}?showFAQ=false`)} />
          </ProfileSectionCard>
        </div>
        <div className="mt-8 md:col-span-2">
          <ProfileSectionCard>
            <ProfileMenuTile
              icon={signOutAction.pending ? Loader2 : LogOut}
              title={signOutAction.pending ? 'Signing out…' : t('client.profile.menu.logout')}
              isDestructive
              showChevron={false}
              onTap={() => !signOutAction.pending && void logout()}
            />
          </ProfileSectionCard>
        </div>
      </div>
      <ThemeModeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} />
    </Screen>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <p className="t-label mb-2.5 ml-1.5">{children}</p>
}
