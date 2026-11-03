// Port of 2_client_discovery/presentation/widgets/salon_hero_appbar.dart
import { BadgeCheck, ChevronLeft, Heart, MapPin, Share, Star, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { cx, Pill } from '@/components/ui'
import { AppConfig } from '@/lib/config'
import { salonHelpers, type SalonModel } from '@/lib/models'
import { useFavorites } from '../favoritesStore'
import { useReviews } from '../useReviews'
import { getSalonStatus, getSalonStatusText, shareText, STATUS_COLORS } from '../utils'
import SalonImage from './SalonImage'

const EXPANDED = 340

export default function SalonHero({ salon }: { salon: SalonModel }) {
  const navigate = useNavigate()
  const { toast, toastSuccess } = useFeedback()
  const [sharing, setSharing] = useState(false)
  const fav = useFavorites()
  const isFav = fav.isFavorite(salon.id)
  const [scroll, setScroll] = useState(0)

  useEffect(() => {
    const on = () => setScroll(window.scrollY)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const collapsed = Math.min(1, Math.max(0, (scroll - (EXPANDED - 160)) / 90))
  const isCollapsed = collapsed > 0.6

  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(Routes.clientDiscover))
  const share = async () => {
    if (sharing) return
    setSharing(true)
    try {
      const link = AppConfig.salonDeepLink(salon.id)
      const res = await shareText(`Check out ${salon.salonName} on Pendeza! Book your appointment now.\n\n${link}`, `Book ${salon.salonName} on Pendeza`)
      if (res === 'copied') toastSuccess('Link copied to clipboard')
      else if (res === 'failed') toast("Couldn't share this salon. Copy the page address from your browser instead.", 'error')
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      {/* pinned bar */}
      <div
        className={cx('fixed inset-x-0 top-0 z-30 transition-colors duration-200', isCollapsed ? 'border-b border-line/60 bg-page/95 backdrop-blur' : 'bg-transparent')}
      >
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-1 px-2.5">
          <GlassButton icon={ChevronLeft} label="Back" onClick={back} collapsed={isCollapsed} />
          <p className="min-w-0 flex-1 truncate text-center text-base font-bold text-ink" style={{ opacity: collapsed }}>
            {salon.salonName}
          </p>
          <GlassButton icon={Share} label="Share" onClick={share} collapsed={isCollapsed} busy={sharing} />
          <GlassButton
            icon={Heart}
            label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            onClick={() => void fav.toggle(salon.id)}
            collapsed={isCollapsed}
            active={isFav}
            busy={fav.isPending(salon.id)}
          />
        </div>
      </div>

      {/* photo */}
      <div className="relative mx-auto max-w-4xl overflow-hidden md:mt-0" style={{ height: EXPANDED }}>
        <SalonImage salonId={salon.id} url={salon.primaryImage} alt={salon.salonName} className="absolute inset-0 h-full w-full" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 28%, rgba(0,0,0,0.30) 55%, rgba(0,0,0,0.82) 100%)' }}
        />
        <div className="absolute inset-x-5 bottom-11" style={{ opacity: Math.max(0, 1 - collapsed * 1.6) }}>
          <Identity salon={salon} />
        </div>
        <div className="absolute inset-x-0 -bottom-px h-7 rounded-t-[30px] bg-page" />
      </div>
    </>
  )
}

function Identity({ salon }: { salon: SalonModel }) {
  const { state } = useReviews()
  const status = getSalonStatus(salon.openingTime, salon.closingTime)
  const color = STATUS_COLORS[status]
  return (
    <div className="text-white">
      <div className="flex flex-wrap items-center gap-2">
        {status !== 'unknown' && (
          <span className="flex items-center gap-[7px] rounded-full border border-white/25 bg-black/35 px-2.5 py-[5px] text-[11.5px] font-bold">
            <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}99` }} />
            {getSalonStatusText(salon.openingTime, salon.closingTime)}
          </span>
        )}
        {state.status === 'loaded' && state.totalReviews > 0 && (
          <Pill label={`${state.averageRating.toFixed(1)} (${state.totalReviews})`} icon={Star} onDark />
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <h1 className="line-clamp-2 text-[27px] font-bold leading-[1.2] tracking-[-0.4px]">{salon.salonName}</h1>
        {salonHelpers.isApproved(salon) && <BadgeCheck size={20} className="shrink-0 text-[#8FE3C9]" />}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <MapPin size={13} className="shrink-0 text-white/85" />
        <span className="truncate text-[13.5px] text-white/90">{salon.district ?? salon.address}</span>
      </div>
    </div>
  )
}

function GlassButton({
  icon: Icon,
  label,
  onClick,
  collapsed,
  active,
  busy,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  collapsed: boolean
  active?: boolean
  busy?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-busy={busy || undefined}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cx(
        'mx-1 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition',
        collapsed ? 'border-transparent text-ink hover:bg-inset' : 'border-white/25 bg-black/30 text-white hover:bg-black/40',
        active && '!text-[#FF6B6B]',
      )}
    >
      <Icon size={21} fill={active ? 'currentColor' : 'none'} className={busy ? 'animate-pulse' : undefined} />
    </button>
  )
}
