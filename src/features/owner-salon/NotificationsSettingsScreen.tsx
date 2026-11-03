// Port of lib/features/3_owner_profile_screen/notifications_settings_screen.dart
// Preferences live in local storage under the same keys as LocalStorageService.
import { Bell, CalendarPlus, Clock, CreditCard, MessagesSquare, Smartphone, Star, Tag, Volume2, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useFeedback } from '@/components/feedback'
import { Screen } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { OwnerAppBar, Toggle } from './components/OwnerChrome'
import { OwnerSalonRoutes } from './paths'

function readBool(key: string): boolean {
  try {
    const v = localStorage.getItem(key)
    return v == null ? true : v === 'true'
  } catch {
    return true
  }
}
function writeBool(key: string, v: boolean): boolean {
  try {
    localStorage.setItem(key, String(v))
    return true
  } catch {
    return false
  }
}

interface Pref {
  key: string
  icon: LucideIcon
  title: string
  color: string
}

export default function NotificationsSettingsScreen() {
  const t = useT()
  const { toastSuccess, toast } = useFeedback()
  const [values, setValues] = useState<Record<string, boolean>>({})
  const get = (k: string) => values[k] ?? readBool(k)
  // Optimistic: flip immediately; roll back with a message if the browser refuses to store it.
  const set = (k: string, v: boolean, title: string) => {
    setValues((s) => ({ ...s, [k]: v }))
    if (writeBool(k, v)) {
      toastSuccess(`${title} ${v ? 'turned on' : 'turned off'}`)
    } else {
      setValues((s) => ({ ...s, [k]: !v }))
      toast("Couldn't save this setting – your browser is blocking site storage (private mode?).", 'error')
    }
  }

  const business: Pref[] = [
    { key: 'notif_booking_alerts', icon: CalendarPlus, title: 'booking_alerts', color: '#6C5CE7' },
    { key: 'notif_appointment_reminders', icon: Clock, title: 'appointment_reminders', color: '#FAB1A0' },
    { key: 'notif_client_messages', icon: MessagesSquare, title: 'client_messages', color: '#74B9FF' },
    { key: 'notif_payment_alerts', icon: CreditCard, title: 'payment_alerts', color: '#00B894' },
    { key: 'notif_review_notifications', icon: Star, title: 'review_notifications', color: '#FFC107' },
  ]
  const marketing: Pref[] = [{ key: 'notif_promotion_updates', icon: Tag, title: 'promotion_updates', color: '#9C27B0' }]
  const sound: Pref[] = [
    { key: 'notif_sound_enabled', icon: Volume2, title: 'sound', color: '#3F51B5' },
    { key: 'notif_vibration_enabled', icon: Smartphone, title: 'vibration', color: '#009688' },
  ]

  const renderList = (list: Pref[]) =>
    list.map((p) => (
      <div key={p.key} className="mb-4 flex items-center gap-4 rounded-[20px] border border-line/60 bg-card p-4 shadow-sm1 dark:border-line dark:shadow-none">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px]" style={{ background: `color-mix(in srgb, ${p.color} 10%, transparent)`, color: p.color }}>
          <p.icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-ink">{t(`notifications_settings.${p.title}`)}</p>
          <p className="mt-0.5 text-[12.5px] text-ink/60">{t(`notifications_settings.${p.title}_desc`)}</p>
        </div>
        <Toggle checked={get(p.key)} onChange={(v) => set(p.key, v, t(`notifications_settings.${p.title}`))} color={p.color} label={t(`notifications_settings.${p.title}`)} />
      </div>
    ))

  return (
    <>
      <OwnerAppBar title={t('notifications_settings.title')} back parent={OwnerSalonRoutes.profile} />
      <Screen className="max-w-2xl px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-4 rounded-[20px] border border-primary/20 bg-primary/10 p-6">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Bell size={24} fill="currentColor" />
          </div>
          <div>
            <p className="text-[16px] font-bold text-ink">{t('notifications_settings.header_title')}</p>
            <p className="mt-1 text-[12.5px] text-ink/70">{t('notifications_settings.header_subtitle')}</p>
          </div>
        </div>

        <SectionTitle>{t('notifications_settings.business_section')}</SectionTitle>
        {renderList(business)}
        <SectionTitle>{t('notifications_settings.marketing_section')}</SectionTitle>
        {renderList(marketing)}
        <SectionTitle>{t('notifications_settings.sound_section')}</SectionTitle>
        {renderList(sound)}
      </Screen>
    </>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="mb-4 mt-8 flex items-center gap-2">
      <span className="h-5 w-1 rounded-sm bg-gradient-to-b from-primary to-accent" />
      <h2 className="text-[19px] font-bold text-ink">{children}</h2>
    </div>
  )
}
