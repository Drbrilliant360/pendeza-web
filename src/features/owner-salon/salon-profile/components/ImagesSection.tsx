// Port of salon_images_section.dart
import { Camera, ImagePlus, Images, Lightbulb, Loader2, Pencil, Plus, Star, Trash2, X, ZoomIn, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAction, useFeedback } from '@/components/feedback'
import { Card } from '@/components/ui'
import type { SalonModel } from '@/lib/models'
import { CountBadge, ImageViewer, PickSourceSheet, SectionTitleRow } from '../../components/OwnerChrome'
import type { SalonProfileController } from '../useSalonProfile'

export default function ImagesSection({ salon, ctrl }: { salon: SalonModel; ctrl: SalonProfileController }) {
  const { confirm } = useFeedback()
  const uploading = ctrl.imageUpload != null
  const delPrimary = useAction(ctrl.deletePrimaryImage, { success: 'Primary photo deleted', error: 'Failed to delete primary image' })
  const delGallery = useAction(ctrl.deleteGalleryImage, { success: 'Photo deleted from gallery', error: 'Failed to delete gallery image' })
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const busy = uploading || delPrimary.pending || delGallery.pending
  const [pickOpen, setPickOpen] = useState(false)
  const [pickPrimary, setPickPrimary] = useState(false)
  const setPicker = (p: { isPrimary: boolean }) => {
    if (busy) return
    setPickPrimary(p.isPrimary)
    setPickOpen(true)
  }
  const [viewing, setViewing] = useState<string | null>(null)
  const gallery = salon.imageGallery ?? []
  const hasGallery = gallery.length > 0

  const confirmDeletePrimary = async () => {
    const ok = await confirm({
      title: 'Delete Primary Photo?',
      message: 'This will remove your main salon photo. You can add a new one anytime.',
      confirmText: 'Delete',
      destructive: true,
    })
    if (ok) void delPrimary.run()
  }
  const confirmDeleteGallery = async (index: number) => {
    if (busy) return
    const ok = await confirm({
      title: 'Delete Photo?',
      message: 'This will permanently remove this photo from your gallery.',
      confirmText: 'Delete',
      destructive: true,
    })
    if (!ok) return
    setDeletingIndex(index)
    await delGallery.run(index)
    setDeletingIndex(null)
  }

  return (
    <div>
      <SectionTitleRow title="Photos" badge={hasGallery ? <CountBadge>{gallery.length + (salon.primaryImage ? 1 : 0)}</CountBadge> : undefined}>
        <button
          onClick={() => setPicker({ isPrimary: false })}
          disabled={busy}
          aria-busy={uploading || undefined}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-sm1 hover:bg-primary-dark disabled:opacity-60"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />} {uploading ? 'Uploading…' : 'Add'}
        </button>
      </SectionTitleRow>

      {!salon.primaryImage && !hasGallery && (
        <div className="mb-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-5">
          <div className="flex items-center gap-3">
            <Lightbulb size={24} className="text-primary" />
            <p className="text-[16px] font-bold text-primary">Photo Tips</p>
          </div>
          <div className="mt-3 space-y-1 text-sm text-ink">
            <p>📸 Use good lighting</p>
            <p>✨ Show your best work</p>
            <p>🏪 Include salon interior</p>
            <p>👥 Feature happy clients (with permission)</p>
          </div>
        </div>
      )}

      {salon.primaryImage ? (
        <Card className="mb-4 overflow-hidden !p-0">
          <div className="relative h-[220px] md:h-[300px]">
            <img
              src={salon.primaryImage}
              alt="Primary"
              className="h-full w-full object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
            />
            <div className="absolute inset-x-0 bottom-0 h-[60px] bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
              <Star size={14} fill="currentColor" /> Primary Photo
            </span>
          </div>
          <div className="flex justify-end gap-1 p-2">
            <SmallTextButton icon={ZoomIn} onClick={() => setViewing(salon.primaryImage)}>View</SmallTextButton>
            <SmallTextButton icon={Pencil} disabled={busy} onClick={() => setPicker({ isPrimary: true })}>Change</SmallTextButton>
            <SmallTextButton icon={Trash2} danger disabled={busy} loading={delPrimary.pending} onClick={() => void confirmDeletePrimary()}>
              {delPrimary.pending ? 'Deleting…' : 'Delete'}
            </SmallTextButton>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setPicker({ isPrimary: true })}
          disabled={busy}
          className="mb-4 flex h-[200px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10"
        >
          <Camera size={48} className="text-primary/60" />
          <p className="mt-4 text-[16px] font-semibold text-primary">Add Primary Photo</p>
          <p className="mt-1 text-[12.5px] text-ink/50">This is the first photo clients see</p>
        </button>
      )}

      {(hasGallery || salon.primaryImage) && (
        <div className="mb-2 mt-4 flex items-center gap-1.5 text-ink/60">
          <Images size={16} />
          <span className="text-sm font-medium">Gallery</span>
        </div>
      )}

      {hasGallery ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {gallery.map((url, i) => (
            <div
              key={`${url}-${i}`}
              role="button"
              tabIndex={0}
              aria-label={`View photo ${i + 1}`}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-line transition active:scale-[0.97] active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setViewing(url)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setViewing(url)
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                  e.preventDefault()
                  void confirmDeleteGallery(i)
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                void confirmDeleteGallery(i)
              }}
            >
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
              {deletingIndex === i && (
                <div className="absolute inset-0 grid place-items-center bg-black/50">
                  <Loader2 size={22} className="animate-spin text-white" />
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  void confirmDeleteGallery(i)
                }}
                disabled={busy}
                aria-label="Delete photo"
                className="group/del absolute right-0 top-0 grid h-10 w-10 place-items-center disabled:opacity-40"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white group-hover/del:bg-black/70">
                  <X size={14} />
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        salon.primaryImage && (
          <div className="flex flex-col items-center rounded-2xl border border-line p-5">
            <Images size={36} className="text-ink/30" />
            <p className="mt-2 text-sm text-ink/50">Add more photos to your gallery</p>
            <button onClick={() => setPicker({ isPrimary: false })} disabled={busy} className="mt-2 flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10">
              <Plus size={18} /> Add Photos
            </button>
          </div>
        )
      )}

      <PickSourceSheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title={pickPrimary ? 'Add Primary Photo' : 'Add Photos to Gallery'}
        accept="image/*"
        multiple={!pickPrimary}
        onPicked={(files) => void ctrl.uploadImages(files, pickPrimary)}
        options={[
          { icon: Camera, title: 'Take Photo', subtitle: 'Use your camera', capture: 'environment' },
          { icon: Images, title: 'Choose from Gallery', subtitle: pickPrimary ? 'Select existing photo' : 'Select one or more photos', color: '#FAB1A0' },
        ]}
      />
      <ImageViewer url={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

function SmallTextButton({
  icon: Icon,
  children,
  onClick,
  danger,
  disabled,
  loading,
}: {
  icon: LucideIcon
  children: ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50 ${danger ? 'text-danger hover:bg-danger/10' : 'text-primary hover:bg-primary/10'}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />} {children}
    </button>
  )
}
