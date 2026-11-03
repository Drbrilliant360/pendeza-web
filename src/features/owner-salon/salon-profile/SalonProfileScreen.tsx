// Port of lib/features/3_owner_management/salon_profile/presentation/screens/salon_profile_screen.dart
import { CheckCircle2, Clock, Eye, Image as ImageIcon, Info, MapPin, RefreshCw, Share2, Star, Users, Video, XCircle, type LucideIcon } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useFeedback } from '@/components/feedback'
import { ErrorState, ProgressBar, Screen, Skeleton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { salonHelpers, type SalonModel } from '@/lib/models'
import { IconAction, OwnerAppBar, SectionLabel } from '../components/OwnerChrome'
import { shareText } from '../helpers'
import AmenitiesSection from './components/AmenitiesSection'
import BasicInfoSection from './components/BasicInfoSection'
import BusinessHoursSection from './components/BusinessHoursSection'
import ContactSection from './components/ContactSection'
import ImagesSection from './components/ImagesSection'
import VideosSection, { VideoUploadProgress } from './components/VideosSection'
import { useSalonProfile } from './useSalonProfile'

function completion(s: SalonModel) {
  let done = 2 // name, address
  if (s.description) done++
  if (s.primaryImage != null) done++
  if (s.openingTime) done++
  if (s.phoneNumber) done++
  if (s.serviceCategories.length > 0) done++
  return (done / 7) * 100
}
const completionColor = (p: number) => (p < 40 ? '#F44336' : p < 70 ? '#FF9800' : '#4CAF50')
const completionMessage = (p: number) =>
  p < 40
    ? "Let's complete your profile to attract clients"
    : p < 70
      ? 'Great start! Add more details to stand out'
      : p < 100
        ? 'Almost perfect! Just a few touches left'
        : 'Excellent! Your profile is complete'

export default function SalonProfileScreen() {
  const ctrl = useSalonProfile()
  const { toast } = useFeedback()
  const photosRef = useRef<HTMLDivElement>(null)
  const { salon, loading, error, imageUpload, videoUpload } = ctrl
  const loadError = error ? friendlyError(error, 'Could not load your salon profile') : null

  const share = async (s: SalonModel) => {
    const categories = s.serviceCategories.slice(0, 3).join(', ')
    const text = `Check out ${s.salonName} on Pendeza!

${s.description ?? 'A great beauty salon'}

Services: ${categories}
Location: ${s.address}

Book your appointment now on Pendeza app!
https://pendeza.co.tz/salon/${s.id}`
    const r = await shareText(text, `Check out ${s.salonName} on Pendeza!`)
    if (r === 'copied') toast('Copied to clipboard', 'success')
  }

  return (
    <>
      <OwnerAppBar
        title="Salon Profile"
        back
        parent="/owner/profile"
        actions={
          <>
            <IconAction icon={RefreshCw} label="Refresh" onClick={() => void ctrl.refresh()} disabled={!salon} spinning={ctrl.refreshing} />
            <IconAction icon={Eye} label="Preview how clients see your profile" onClick={() => toast('Preview feature coming soon!')} />
          </>
        }
      />

      {(imageUpload || videoUpload) && (
        <div className="sticky top-14 z-20 border-b border-line bg-card shadow-md1">
          <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
            {videoUpload ? (
              <VideoUploadProgress state={videoUpload} ctrl={ctrl} />
            ) : (
              imageUpload && (
                <ProgressBar
                  value={imageUpload.progress * 100}
                  label={
                    imageUpload.total > 1
                      ? `Uploading ${imageUpload.index} of ${imageUpload.total} photos…`
                      : imageUpload.type === 'primary'
                        ? 'Uploading primary photo…'
                        : 'Uploading photo…'
                  }
                  onCancel={ctrl.cancelImageUpload}
                />
              )
            )}
          </div>
        </div>
      )}

      <Screen className="max-w-5xl px-4 pt-6 sm:px-6 md:max-w-5xl">
        {loading && !salon ? (
          <div className="space-y-6">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[200px] w-full" />
            ))}
          </div>
        ) : loadError && !salon ? (
          <ErrorState
            title="Couldn't load your salon profile"
            message={loadError.message}
            hint={loadError.hint}
            offline={loadError.code === 'network'}
            retrying={loading}
            onRetry={() => void ctrl.load()}
          />
        ) : (
          salon && (
            <>
              <HeroHeader salon={salon} />
              <VerificationBanner salon={salon} />

              <div className="mt-6 grid grid-cols-2 gap-4 md:max-w-xl">
                <QuickAction
                  icon={ImageIcon}
                  label="Add Photos"
                  color="#6C5CE7"
                  onClick={() => {
                    toast('Scroll down to the Photos section')
                    photosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                />
                <QuickAction icon={Share2} label="Share Profile" color="#FAB1A0" onClick={() => void share(salon)} />
              </div>

              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <Block label="Basic Information" icon={Info}>
                    <BasicInfoSection salon={salon} ctrl={ctrl} />
                  </Block>
                </div>
                <div ref={photosRef} className="scroll-mt-24 lg:col-span-2">
                  <Block label="Photos" icon={ImageIcon}>
                    <ImagesSection salon={salon} ctrl={ctrl} />
                  </Block>
                </div>
                <div className="lg:col-span-2">
                  <Block label="Video Shorts" icon={Video}>
                    <VideosSection ctrl={ctrl} />
                  </Block>
                </div>
                <Block label="Operating Hours" icon={Clock}>
                  <BusinessHoursSection salon={salon} ctrl={ctrl} />
                </Block>
                <Block label="Contact & Social" icon={Users}>
                  <ContactSection salon={salon} ctrl={ctrl} />
                </Block>
                <div className="lg:col-span-2">
                  <Block label="Amenities" icon={Star}>
                    <AmenitiesSection salon={salon} ctrl={ctrl} />
                  </Block>
                </div>
              </div>
            </>
          )
        )}
      </Screen>
    </>
  )
}

function Block({ label, icon, children }: { label: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <SectionLabel title={label} icon={icon} />
      <div className="mt-4">{children}</div>
    </section>
  )
}

function QuickAction({ icon: Icon, label, color, onClick }: { icon: LucideIcon; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl p-5 transition hover:brightness-95"
      style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
    >
      <Icon size={32} />
      <span className="text-center text-sm font-semibold">{label}</span>
    </button>
  )
}

function HeroHeader({ salon }: { salon: SalonModel }) {
  const pct = completion(salon)
  const color = completionColor(pct)
  const open = salonHelpers.isOpen(salon)
  return (
    <div className="rounded-[20px] border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5 p-6">
      <div className="flex items-center gap-6">
        <div
          className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-[3px] text-[16px] font-bold"
          style={{ borderColor: color, color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          {Math.trunc(pct)}%
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[20px] font-bold text-ink">{salon.salonName}</h2>
          <p className="mt-1 flex items-center gap-1 text-[12.5px] text-ink/60">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{salon.address}</span>
          </p>
          <span
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: open ? '#4CAF50' : '#F44336', background: open ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: open ? '#4CAF50' : '#F44336' }} />
            {open ? 'Open Now' : 'Closed'}
          </span>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-2xl p-4" style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}>
        {pct >= 100 ? <CheckCircle2 size={20} /> : <Info size={20} />}
        <span className="text-[12.5px] font-medium">{completionMessage(pct)}</span>
      </div>
    </div>
  )
}

/** Web addition: surfaces the salon's verification status (pending / rejected + reason). */
function VerificationBanner({ salon }: { salon: SalonModel }) {
  if (salonHelpers.isApproved(salon)) return null
  const rejected = salonHelpers.isRejected(salon)
  const color = rejected ? '#FF6B6B' : '#F5A623'
  const Icon = rejected ? XCircle : Clock
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl p-4" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
      <Icon size={20} style={{ color }} className="mt-0.5 shrink-0" />
      <div className="text-[13px] text-ink">
        <p className="font-bold" style={{ color }}>
          {rejected ? 'Verification rejected' : 'Verification pending'}
        </p>
        <p className="mt-0.5 text-ink/70">
          {rejected
            ? salon.rejectionReason || 'Your salon was not approved. Please update your profile and contact support.'
            : 'Your salon is being reviewed by the Pendeza team.'}
        </p>
      </div>
    </div>
  )
}
