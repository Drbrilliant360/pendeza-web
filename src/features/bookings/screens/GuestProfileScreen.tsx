// Port of 2_client_profile/presentation/screens/guest_profile_screen.dart (wallet hidden: payments disabled)
import { Bell, CalendarDays, ChevronRight, CircleArrowRight, CircleCheck, Heart, Info, Search, User, UserPlus, type LucideIcon } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { BrandHero, Card, IconTile, Screen, SectionHeader, toneAt } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { HeroThemeButton, ThemeModeSheet } from '../components/ProfileParts'

export default function GuestProfileScreen() {
  const t = useT()
  const navigate = useNavigate()
  const [themeOpen, setThemeOpen] = useState(false)

  const benefits: { icon: LucideIcon; title: string; description: string }[] = [
    { icon: CalendarDays, title: t('client.guest_profile.benefit_book_title'), description: t('client.guest_profile.benefit_book_desc') },
    { icon: Heart, title: t('client.guest_profile.benefit_favorites_title'), description: t('client.guest_profile.benefit_favorites_desc') },
    { icon: Bell, title: t('client.guest_profile.benefit_notifications_title'), description: t('client.guest_profile.benefit_notifications_desc') },
  ]

  return (
    <Screen>
      <div className="px-4 pt-2">
        <BrandHero radius={32} padded={false}>
          <div className="relative px-6 pb-6 pt-7 text-center">
            <div className="absolute right-3 top-3">
              <HeroThemeButton onClick={() => setThemeOpen(true)} />
            </div>
            <div className="mx-auto grid h-[104px] w-[104px] place-items-center rounded-full border border-white/25 bg-white/10">
              <div className="grid h-20 w-20 place-items-center rounded-full border border-white/40 bg-white/20">
                <User size={40} fill="currentColor" />
              </div>
            </div>
            <h1 className="mt-[18px] text-2xl font-bold leading-tight tracking-[-0.3px]">{t('client.guest_profile.welcome')}</h1>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-normal text-white/90">{t('client.guest_profile.subtitle')}</p>
            <div className="mx-auto mt-[22px] flex max-w-md flex-col gap-2.5">
              <button
                onClick={() => navigate(Routes.signup)}
                className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white text-[14.5px] font-bold text-primary-dark hover:bg-white/90"
              >
                <UserPlus size={18} /> {t('client.guest_profile.create_account')}
              </button>
              <button
                onClick={() => navigate(Routes.login)}
                className="flex h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/55 bg-white/10 text-[14.5px] font-semibold text-white hover:bg-white/20"
              >
                <CircleArrowRight size={18} /> {t('auth.login.button')}
              </button>
            </div>
          </div>
        </BrandHero>
      </div>

      <div className="mt-6 px-5">
        <Card onClick={() => navigate(Routes.clientFavorites)} className="!p-3.5">
          <div className="flex items-center gap-3.5">
            <IconTile icon={Heart} color="#FF7A90" size={46} solid />
            <div className="min-w-0 flex-1">
              <p className="t-heading">{t('client.profile.menu.favorites')}</p>
              <p className="t-caption mt-0.5">{t('client.guest_profile.favorites_subtitle')}</p>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </div>
        </Card>
      </div>

      <div className="mt-7 md:grid md:grid-cols-2 md:gap-2">
        <div>
          <SectionHeader title={t('client.guest_profile.why_create_account')} />
          <div className="mt-3.5 px-5">
            <Card className="!px-[18px] !py-2">
              {benefits.map((b, i) => (
                <Fragment key={b.title}>
                  {i > 0 && <div className="h-px bg-line/60" />}
                  <Row icon={b.icon} color={toneAt(i)} title={b.title} subtitle={b.description} />
                </Fragment>
              ))}
            </Card>
          </div>
        </div>
        <div className="mt-7 md:mt-0">
          <SectionHeader title={t('client.guest_profile.available_as_guest')} />
          <div className="mt-3.5 px-5">
            <Card className="!px-[18px] !py-2">
              <Row icon={Search} color="#6C5CE7" title={t('client.guest_profile.browse_salons')} subtitle={t('client.guest_profile.browse_salons_desc')} check />
              <div className="h-px bg-line/60" />
              <Row icon={Info} color="#6C5CE7" title={t('client.guest_profile.view_details')} subtitle={t('client.guest_profile.view_details_desc')} check />
            </Card>
          </div>
        </div>
      </div>
      <ThemeModeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />
    </Screen>
  )
}

function Row({ icon, color, title, subtitle, check }: { icon: LucideIcon; color: string; title: string; subtitle: string; check?: boolean }) {
  return (
    <div className={`flex gap-3.5 py-3.5 ${check ? 'items-center' : 'items-start'}`}>
      <IconTile icon={icon} color={color} size={42} />
      <div className="min-w-0 flex-1">
        <p className="t-heading">{title}</p>
        <p className="t-caption mt-0.5">{subtitle}</p>
      </div>
      {check && <CircleCheck size={20} className="shrink-0 text-success" />}
    </div>
  )
}
