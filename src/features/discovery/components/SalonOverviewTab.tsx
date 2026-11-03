// Port of salon_overview_tab.dart (info card + hours sheet), salon_description_widget.dart
// and saloon_gallery_widget.dart.
import { ChevronDown, Clock, Facebook, ImageOff, Info, Instagram, Map as MapIcon, MapPin, MessageCircle, Phone, Star, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { Card, cx, IconTile, Pill, SectionHeader, Sheet, toneForKey } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { salonHelpers, type SalonModel } from '@/lib/models'
import { useReviews } from '../useReviews'
import { getSalonStatus, hasBusinessHours, openExternal, STATUS_COLORS, whatsAppUrl } from '../utils'

export default function SalonOverviewTab({ salon }: { salon: SalonModel }) {
  const { state } = useReviews()
  const loaded = state.status === 'loaded' ? state : null
  return (
    <div className="pt-2">
      <SalonInfoCard salon={salon} averageRating={loaded?.averageRating ?? 0} totalReviews={loaded?.totalReviews ?? 0} />
      <div className="h-5" />
      <SalonDescription salon={salon} />
      <div className="h-6" />
      {salonHelpers.allImages(salon).length > 0 && <GalleryPreview salon={salon} />}
    </div>
  )
}

// ── Info card ────────────────────────────────────────────────────────────────
function handleUrl(v: string, base: string) {
  const s = v.trim()
  if (/^https?:\/\//i.test(s)) return s
  return `${base}${s.replace(/^@/, '')}`
}

function SalonInfoCard({ salon, averageRating, totalReviews }: { salon: SalonModel; averageRating: number; totalReviews: number }) {
  const t = useT()
  const [hoursOpen, setHoursOpen] = useState(false)
  const hasRating = totalReviews > 0 && averageRating > 0
  const place = salon.district ?? salon.region ?? 'Tanzania'
  const hasMap = !!(salon.address.trim() || salon.district?.trim() || salon.region?.trim())

  const actions: { label: string; icon: LucideIcon; color: string; onClick: () => void }[] = []
  if (salon.phoneNumber) actions.push({ label: t('client.salon_details.call'), icon: Phone, color: '#6C5CE7', onClick: () => (window.location.href = `tel:${salon.phoneNumber}`) })
  if (salon.whatsappNumber) actions.push({ label: t('client.salon_details.chat'), icon: MessageCircle, color: '#25D366', onClick: () => openExternal(whatsAppUrl(salon.whatsappNumber!)) })
  if (hasMap) {
    actions.push({
      label: t('client.salon_details.map'),
      icon: MapIcon,
      color: '#3B82F6',
      onClick: () => {
        const q = [salon.salonName, salon.address.trim(), salon.district?.trim(), salon.region?.trim()].filter(Boolean).join(', ')
        openExternal(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`)
      },
    })
  }
  actions.push({ label: t('client.salon_details.hours'), icon: Clock, color: '#F5A623', onClick: () => setHoursOpen(true) })
  // Web addition: social profiles stored on the salon (instagram / facebook)
  if (salon.instagram) actions.push({ label: 'Instagram', icon: Instagram, color: '#E1306C', onClick: () => openExternal(handleUrl(salon.instagram!, 'https://instagram.com/')) })
  if (salon.facebook) actions.push({ label: 'Facebook', icon: Facebook, color: '#1877F2', onClick: () => openExternal(handleUrl(salon.facebook!, 'https://facebook.com/')) })

  return (
    <div className="px-5">
      <Card radius={24} className="!p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex shrink-0 items-center gap-1.5 rounded-[14px] bg-[#F5A623]/[0.14] px-3 py-2 dark:bg-[#F5A623]/20">
            <Star size={16} className="text-[#F5A623]" fill="currentColor" />
            <span className="text-[15px] font-bold text-ink">{hasRating ? averageRating.toFixed(1) : t('client.salon_details.new_salon')}</span>
          </span>
          <span className="t-caption min-w-0 flex-1 truncate">
            {hasRating ? t('client.salon_details.reviews_count', [totalReviews]) : t('client.salon_details.no_reviews_title')}
          </span>
          <Pill label={place} icon={MapPin} className="min-w-0" />
        </div>
        <div className="my-3.5 h-px bg-line" />
        <div className="flex">
          {actions.map((a) => (
            <button key={a.label} onClick={a.onClick} className="flex min-w-0 flex-1 flex-col items-center rounded-2xl py-1 transition hover:bg-inset">
              <IconTile icon={a.icon} color={a.color} size={52} solid />
              <span className="t-caption mt-2 w-full truncate text-center font-semibold !text-ink">{a.label}</span>
            </button>
          ))}
        </div>
      </Card>
      <HoursSheet salon={salon} open={hoursOpen} onClose={() => setHoursOpen(false)} />
    </div>
  )
}

function HoursSheet({ salon, open, onClose }: { salon: SalonModel; open: boolean; onClose: () => void }) {
  const t = useT()
  const status = getSalonStatus(salon.openingTime, salon.closingTime)
  const isOpen = status === 'open' || status === 'closing'
  const has = hasBusinessHours(salon)
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex items-center gap-3.5 pt-2">
        <IconTile icon={Clock} color="#F5A623" size={48} solid />
        <div className="min-w-0 flex-1">
          <p className="t-title">{t('client.salon_details.business_hours')}</p>
          <p className="t-caption truncate">{salon.salonName}</p>
        </div>
        {has && <Pill label={t(isOpen ? 'client.salon_details.open' : 'client.salon_details.closed')} color={STATUS_COLORS[status]} />}
      </div>
      <div className="mt-5 rounded-[20px] bg-inset px-[18px]">
        {has ? (
          <>
            <TimeRow label={t('client.salon_details.opens_at')} time={salon.openingTime!} />
            <div className="h-px bg-line" />
            <TimeRow label={t('client.salon_details.closes_at')} time={salon.closingTime!} />
          </>
        ) : (
          <p className="t-body py-[18px] text-center !text-muted">{t('client.salon_details.hours_not_set')}</p>
        )}
      </div>
      <button onClick={onClose} className="mt-5 h-[52px] w-full rounded-2xl bg-primary text-[14.5px] font-bold text-white hover:bg-primary-dark">
        {t('client.salon_details.got_it')}
      </button>
    </Sheet>
  )
}
function TimeRow({ label, time }: { label: string; time: string }) {
  return (
    <div className="flex items-center py-3.5">
      <span className="t-body flex-1">{label}</span>
      <span className="text-[17px] font-bold text-primary-dark dark:text-primary">{time}</span>
    </div>
  )
}

// ── Description ──────────────────────────────────────────────────────────────
function SalonDescription({ salon }: { salon: SalonModel }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const raw = salon.description?.trim()
  const has = !!raw
  const isLong = has && raw.length > 150
  const amenities = salon.amenities ?? []
  return (
    <div className="px-5">
      <Card radius={24} className="!p-[18px]">
        <div className="flex items-center gap-3">
          <IconTile icon={Info} size={38} />
          <h3 className="t-heading line-clamp-2 flex-1">{t('client.salon_details.about', [salon.salonName])}</h3>
        </div>
        <p
          className={cx(
            'mt-3.5 whitespace-pre-line text-sm leading-[1.6]',
            has ? 'text-muted' : 'italic text-muted/70',
            !expanded && 'line-clamp-4',
          )}
        >
          {has ? raw : t('client.salon_details.no_description')}
        </p>
        {isLong && (
          <button onClick={() => setExpanded((e) => !e)} className="mt-2 flex items-center gap-1 text-[13px] font-bold text-primary-dark dark:text-primary">
            {t(expanded ? 'client.salon_details.show_less' : 'client.salon_details.read_more')}
            <ChevronDown size={14} className={cx('transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
        {salon.serviceCategories.length > 0 && (
          <>
            <div className="mb-3.5 mt-4 h-px bg-line" />
            <p className="t-label">{t('client.salon_details.offered')}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {salon.serviceCategories.map((c) => (
                <Chip key={c} label={c} />
              ))}
            </div>
          </>
        )}
        {amenities.length > 0 && (
          <>
            <div className="mb-3.5 mt-4 h-px bg-line" />
            <p className="t-label">Amenities</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {amenities.map((a) => (
                <Chip key={a} label={a} />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
function Chip({ label }: { label: string }) {
  const color = toneForKey(label)
  return (
    <span
      className="rounded-full px-3 py-[7px] text-xs font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color: `color-mix(in srgb, ${color} 85%, rgb(var(--ink)))` }}
    >
      {label}
    </span>
  )
}

// ── Gallery preview ──────────────────────────────────────────────────────────
function GalleryPreview({ salon }: { salon: SalonModel }) {
  const t = useT()
  const navigate = useNavigate()
  const images = salonHelpers.allImages(salon)
  const display = images.slice(0, 4)
  const remaining = images.length - 4
  const go = () => navigate(Routes.salonGallery(salon.id), { state: { salon } })
  return (
    <div>
      <SectionHeader title={t('client.salon_details.gallery')} subtitle={String(images.length)} actionLabel={t('client.salon_details.view_all')} onAction={go} />
      <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto px-5">
        {display.map((url, i) => (
          <button key={url + i} onClick={go} className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[20px] bg-inset shadow-sm1">
            <Thumb url={url} />
            {i === display.length - 1 && remaining > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-black/55 text-xl font-bold text-white">+{remaining}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
export function Thumb({ url, className }: { url: string; className?: string }) {
  const [broken, setBroken] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (broken) {
    return (
      <span className={cx('grid h-full w-full place-items-center bg-inset text-muted', className)}>
        <ImageOff size={22} />
      </span>
    )
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onLoad={() => setLoaded(true)}
      onError={() => setBroken(true)}
      className={cx('h-full w-full object-cover', !loaded && 'animate-pulse bg-ink/[0.07]', className)}
    />
  )
}
