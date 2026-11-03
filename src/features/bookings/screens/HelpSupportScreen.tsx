// Port of 3_owner_profile_screen/help_support_screen.dart (`?showFAQ=false` hides the FAQ).
import { ChevronDown, ChevronRight, CircleHelp, ExternalLink, Mail, MessageCircle, Phone, Sparkles, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { cx, PageHeader } from '@/components/ui'
import { useGoBack } from '@/features/auth/chrome'
import { useT } from '@/lib/i18n'

const EMAIL = 'alphatechlab@gmail.com'

export default function HelpSupportScreen() {
  const t = useT()
  const [params] = useSearchParams()
  const goBack = useGoBack(Routes.clientProfile)
  const showFAQ = params.get('showFAQ') !== 'false'

  const contacts: { icon: LucideIcon; title: string; subtitle: string; color: string; href: string; external?: boolean }[] = [
    {
      icon: Mail,
      title: t('help.email_support'),
      subtitle: EMAIL,
      color: '#6C5CE7',
      href: `mailto:${EMAIL}?subject=${encodeURIComponent('Support Request - Pendeza App')}`,
    },
    {
      icon: MessageCircle,
      title: t('help.whatsapp_support'),
      subtitle: '+255 792 747 056',
      color: '#25D366',
      // Same number the app's _launchWhatsApp dials.
      href: `https://wa.me/255793747056?text=${encodeURIComponent('Hello, I need help with the Pendeza app.')}`,
      external: true,
    },
    { icon: Phone, title: t('help.call_support'), subtitle: '+255 710 698 702', color: '#74B9FF', href: 'tel:+255710698702' },
  ]

  return (
    <div className="min-h-dvh bg-page pb-24">
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t('help.title')} onBack={goBack} />
        <div className="px-5 pt-5">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-center text-white">
            <div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-white/20">
              <CircleHelp size={40} />
            </div>
            <h2 className="mt-4 text-xl font-bold">{t('help.header_title')}</h2>
            <p className="mt-1 text-sm text-white/90">{t('help.header_subtitle')}</p>
          </div>

          <SectionTitle title={t('help.contact_section')} />
          <div className="grid gap-4 md:grid-cols-3">
            {contacts.map((c) => (
              <a
                key={c.title}
                href={c.href}
                target={c.external ? '_blank' : undefined}
                rel={c.external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-sm1 transition hover:shadow-md1 dark:shadow-none"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color }}>
                  <c.icon size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-ink">{c.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{c.subtitle}</span>
                </span>
                {c.external ? (
                  <>
                    <ExternalLink size={18} className="text-muted/70" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </>
                ) : (
                  <ChevronRight size={18} className="text-muted/70" />
                )}
              </a>
            ))}
          </div>

          {showFAQ && (
            <>
              <SectionTitle title={t('help.faq_section')} />
              {[1, 2, 3, 4, 5].map((i) => (
                <FaqItem key={i} question={t(`help.faq${i}_question`)} answer={t(`help.faq${i}_answer`)} />
              ))}
            </>
          )}

          <SectionTitle title={t('help.about_section')} />
          <div className="flex items-center gap-4 rounded-3xl bg-card p-6 shadow-sm1 dark:shadow-none">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles size={24} />
            </span>
            <div>
              <p className="text-base font-bold text-ink">Pendeza</p>
              <p className="text-xs text-muted">{t('help.app_version', ['1.0.0'])}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 mt-8 flex items-center gap-2">
      <span className="h-5 w-1 rounded-sm bg-gradient-to-b from-primary to-accent" />
      <h3 className="text-xl font-bold text-ink">{title}</h3>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-4 rounded-3xl bg-card shadow-sm1 dark:shadow-none">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <CircleHelp size={18} />
        </span>
        <span className="flex-1 text-sm font-semibold text-ink">{question}</span>
        <ChevronDown size={18} className={cx('text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{answer}</p>}
    </div>
  )
}
