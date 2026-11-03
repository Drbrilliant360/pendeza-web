// ProfileMenuTile, ProfileSectionCard, ProfileStatItem, theme-mode sheet (theme_mode_button.dart)
// and the language action sheet used on the profile screens.
import { Check, ChevronRight, CircleCheck, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { useFeedback } from '@/components/feedback'
import { cx, IconTile, Sheet } from '@/components/ui'
import { useI18n, useT, type Lang } from '@/lib/i18n'
import { useTheme, type ThemeMode } from '@/lib/theme'

export function ProfileMenuTile({
  icon,
  title,
  subtitle,
  trailing,
  onTap,
  iconColor,
  showChevron = true,
  isDestructive = false,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  trailing?: ReactNode
  onTap?: () => void
  iconColor?: string
  showChevron?: boolean
  isDestructive?: boolean
}) {
  const color = isDestructive ? '#FF6B6B' : iconColor ?? '#6C5CE7'
  return (
    <button type="button" onClick={onTap} className="flex w-full items-center gap-3.5 px-4 py-[13px] text-left transition hover:bg-inset/60">
      <IconTile icon={icon} color={color} size={42} />
      <div className="min-w-0 flex-1">
        <p className={cx('t-heading', isDestructive && '!text-danger')}>{title}</p>
        {subtitle && <p className="t-caption mt-0.5">{subtitle}</p>}
      </div>
      {trailing}
      {showChevron && !trailing && <ChevronRight size={16} className="text-muted" />}
    </button>
  )
}

export function ProfileSectionCard({ children }: { children: ReactNode[] | ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean)
  return (
    <div className="overflow-hidden rounded-[24px] border border-line/60 bg-card shadow-sm1 dark:border-line dark:shadow-none">
      {items.map((c, i) => (
        <Fragment key={i}>
          {c}
          {i < items.length - 1 && <div className="ml-[72px] mr-4 h-px bg-line/60" />}
        </Fragment>
      ))}
    </div>
  )
}

export function ProfileStatItem({ label, value, onTap, loading }: { label: string; value: string; onTap?: () => void; loading?: boolean }) {
  return (
    <button type="button" onClick={onTap} disabled={!onTap} className="flex min-h-[44px] w-full flex-col items-center rounded-2xl px-2 py-1.5 enabled:hover:bg-white/10">
      {loading ? (
        <span className="my-[3px] block h-6 w-8 animate-pulse rounded-md bg-white/30" aria-label="Loading" />
      ) : (
        <span className="text-2xl font-bold leading-[1.15] text-white">{value}</span>
      )}
      <span className="mt-0.5 max-w-full truncate text-[10.5px] font-semibold uppercase tracking-[0.9px] text-white/80">{label}</span>
    </button>
  )
}

// ── appearance ───────────────────────────────────────────────────────────────
export const themeModeIcon = (m: ThemeMode): LucideIcon => (m === 'light' ? Sun : m === 'dark' ? Moon : Monitor)
export function useThemeModeLabel() {
  const t = useT()
  return (m: ThemeMode) => t(`appearance.${m}`)
}

export function ThemeModeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const label = useThemeModeLabel()
  const { mode, setMode } = useTheme()
  const { toastSuccess } = useFeedback()
  return (
    <Sheet open={open} onClose={onClose} title={t('appearance.title')}>
      <p className="t-caption -mt-1 text-[13px]">{t('appearance.subtitle')}</p>
      <div className="mt-4 flex flex-col gap-2.5">
        {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => {
          const Icon = themeModeIcon(m)
          const sel = m === mode
          return (
            <button
              key={m}
              type="button"
              aria-pressed={sel}
              onClick={() => {
                if (m !== mode) {
                  setMode(m)
                  toastSuccess(`Appearance set to ${label(m)}`)
                }
                onClose()
              }}
              className={cx('flex items-center gap-3.5 rounded-[18px] p-3.5 text-left transition', sel ? 'border-[1.6px] border-primary bg-primary/10' : 'border border-line bg-card hover:bg-inset')}
            >
              <span className={cx('grid h-[42px] w-[42px] place-items-center rounded-[13px]', sel ? 'bg-brand-gradient text-white' : 'bg-primary/10 text-primary')}>
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-ink">{label(m)}</span>
                <span className="block text-[12.5px] text-muted">{t(`appearance.${m}_desc`)}</span>
              </span>
              {sel && <CircleCheck size={22} className="text-primary" />}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const { lang, setLang } = useI18n()
  const { toastSuccess } = useFeedback()
  const options: { value: Lang; label: string }[] = [
    { value: 'en', label: t('client.profile.language_selector.english') },
    { value: 'sw', label: t('client.profile.language_selector.swahili') },
  ]
  return (
    <Sheet open={open} onClose={onClose} title={t('client.profile.language_selector.title')}>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={lang === o.value}
            onClick={() => {
              if (o.value !== lang) {
                setLang(o.value)
                toastSuccess(o.value === 'sw' ? 'Lugha imebadilishwa: Kiswahili' : 'Language changed to English')
              }
              onClose()
            }}
            className="flex h-14 items-center justify-between rounded-2xl border border-line bg-card px-4 text-[15px] font-semibold text-ink hover:bg-inset"
          >
            {o.label}
            {lang === o.value && <Check size={20} className="text-primary" />}
          </button>
        ))}
        <button type="button" onClick={onClose} className="mt-1 h-12 rounded-2xl font-bold text-primary hover:bg-inset">
          {t('common.cancel')}
        </button>
      </div>
    </Sheet>
  )
}

/** Glass theme button pinned on the profile hero (ThemeModeButton(onDark: true)). */
export function HeroThemeButton({ onClick }: { onClick: () => void }) {
  const { mode } = useTheme()
  const label = useThemeModeLabel()
  const t = useT()
  const Icon = themeModeIcon(mode)
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${t('appearance.title')}: ${label(mode)}`}
      aria-label={`${t('appearance.title')}: ${label(mode)}`}
      className="grid h-[42px] w-[42px] place-items-center rounded-full border border-white/30 bg-white/20 text-white hover:bg-white/30"
    >
      <Icon size={21} />
    </button>
  )
}
