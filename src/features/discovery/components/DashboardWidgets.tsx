// Ports of quick_action_bar.dart, upcoming_appointment_widget.dart and category_grid_widget.dart
import { ArrowUpRight, Clock, Flame, Heart, MapPin, MessageCircle, Scissors, Sparkles, Tag } from 'lucide-react'
import { useState } from 'react'
import { Card, cx, IconTile, Pill, toneAt } from '@/components/ui'
import { useT } from '@/lib/i18n'
import type { CategoryModel } from '@/lib/models'
import { serviceNames, type AppointmentWithDetails } from '../api'
import { bookingMessage, openExternal, placeholderForCategory, whatsAppUrl } from '../utils'

// ── Quick actions ────────────────────────────────────────────────────────────
export function QuickActionsBar({ onAction }: { onAction: (a: 'offers' | 'near_me' | 'trending' | 'favorites') => void }) {
  const t = useT()
  const items = [
    { key: 'offers' as const, label: t('client.dashboard.quick_actions.offers'), icon: Tag, color: '#FF7A90' },
    { key: 'near_me' as const, label: t('client.dashboard.quick_actions.near_me'), icon: MapPin, color: toneAt(0) },
    { key: 'trending' as const, label: t('client.dashboard.quick_actions.trending'), icon: Flame, color: '#F5A623' },
    { key: 'favorites' as const, label: t('client.dashboard.quick_actions.saved'), icon: Heart, color: '#B57BFF' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2.5 px-5">
      {items.map((it) => (
        <Card key={it.key} onClick={() => onAction(it.key)} radius={20} className="flex flex-col items-center !px-1.5 !pb-2.5 !pt-3.5">
          <span className="flex w-full flex-col items-center">
            <IconTile icon={it.icon} color={it.color} size={48} solid />
            <span className="mt-2.5 flex min-h-[30px] items-center text-center text-[11.5px] font-semibold leading-[1.2] text-ink line-clamp-2">
              {it.label}
            </span>
          </span>
        </Card>
      ))}
    </div>
  )
}

// ── Up next ──────────────────────────────────────────────────────────────────
function daysAway(when: Date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(when.getFullYear(), when.getMonth(), when.getDate())
  return Math.round((day.getTime() - today.getTime()) / 86400000)
}

export function UpcomingAppointmentCard({ item, onClick }: { item: AppointmentWithDetails; onClick: () => void }) {
  const t = useT()
  const { appointment, salon } = item
  const start = appointment.startTime
  const month = start.toLocaleDateString('en-US', { month: 'short' })
  const day = start.getDate()
  const dateStr = `${month} ${day}`
  const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const d = daysAway(start)
  const dayLabel =
    d === 0 ? t('client.dashboard.today') : d === 1 ? t('client.dashboard.tomorrow') : start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const contact = salon.whatsappNumber ?? salon.phoneNumber

  return (
    <div className="px-5">
      <Card onClick={onClick} radius={24} className="!p-4">
        <span className="flex items-center gap-3.5">
          <span className="flex w-[62px] shrink-0 flex-col items-center rounded-[18px] bg-brand-gradient py-3 text-white shadow-[0_6px_14px_-4px_rgba(108,92,231,0.35)]">
            <span className="text-[26px] font-bold leading-[1.05]">{day}</span>
            <span className="mt-0.5 text-[11px] font-bold uppercase tracking-[1px] text-white/90">{month}</span>
          </span>
          <span className="min-w-0 flex-1">
            <Pill label={`${dayLabel} · ${timeStr}`} color={d === 0 ? '#00B894' : '#6C5CE7'} icon={Clock} />
            <span className="t-heading mt-2 block truncate">{salon.salonName}</span>
            <span className="mt-0.5 flex items-center gap-1.5">
              <Scissors size={13} className="shrink-0 text-muted" />
              <span className="t-caption truncate">{serviceNames(item)}</span>
            </span>
          </span>
          {contact && (
            <span
              role="button"
              tabIndex={0}
              title="Contact Salon"
              aria-label="Contact salon on WhatsApp (opens in a new tab)"
              onClick={(e) => {
                e.stopPropagation()
                openExternal(whatsAppUrl(contact, bookingMessage(salon.salonName, dateStr, timeStr)))
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                e.stopPropagation()
                openExternal(whatsAppUrl(contact, bookingMessage(salon.salonName, dateStr, timeStr)))
              }}
              className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-2xl bg-[#25D366]/15 text-[#1FAF5A] hover:bg-[#25D366]/25"
            >
              <MessageCircle size={22} fill="currentColor" />
            </span>
          )}
        </span>
      </Card>
    </div>
  )
}

// ── Category grid ────────────────────────────────────────────────────────────
export function CategoryGrid({ categories, onSelect, showAll = false }: { categories: CategoryModel[]; onSelect: (id: string) => void; showAll?: boolean }) {
  const list = showAll ? categories : categories.slice(0, 6)
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {list.map((c, i) => (
        <CategoryTile key={c.id} category={c} tone={toneAt(i)} onClick={() => onSelect(c.id)} />
      ))}
    </div>
  )
}

function CategoryTile({ category, tone, onClick }: { category: CategoryModel; tone: string; onClick: () => void }) {
  const t = useT()
  const [src, setSrc] = useState<string | null>(category.iconUrl)
  return (
    <button
      onClick={onClick}
      className="relative aspect-[1.75] overflow-hidden rounded-[22px] border text-left transition-transform active:scale-[0.96] dark:[--cat-a:30%] dark:[--cat-b:12%] sm:aspect-[2]"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${tone} var(--cat-a, 20%), transparent), color-mix(in srgb, ${tone} var(--cat-b, 6%), transparent))`,
        borderColor: `color-mix(in srgb, ${tone} 22%, transparent)`,
      }}
    >
      <span className="absolute inset-y-0 right-0 w-[42%] overflow-hidden rounded-r-[22px]">
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-bottom"
            onError={() => setSrc(src === category.iconUrl ? placeholderForCategory(category.id) ?? null : null)}
          />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <Sparkles size={30} style={{ color: tone, opacity: 0.35 }} />
          </span>
        )}
      </span>
      <span className="absolute inset-0 flex flex-col justify-between py-3.5 pl-3.5" style={{ paddingRight: 'calc(42% + 6px)' }}>
        <span className="t-heading line-clamp-2 !text-[13.5px] !leading-[1.2]">{t(`categories.${category.name}`)}</span>
        <span className={cx('grid h-7 w-7 place-items-center rounded-full text-white')} style={{ background: tone }}>
          <ArrowUpRight size={14} />
        </span>
      </span>
    </button>
  )
}
