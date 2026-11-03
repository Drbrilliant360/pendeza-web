// Port of salon_videos_section.dart (section, upload progress card, add-video sheet,
// video options sheet, edit caption + delete dialogs). Playback uses <video>.
import { CloudUpload, Image as ImageIcon, Info, Loader2, Minimize2, Pencil, Play, PlayCircle, Save, Trash2, Video, VideoOff, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useAction, useFeedback } from '@/components/feedback'
import { Card, ProgressBar, Sheet } from '@/components/ui'
import { CountBadge, DialogActions, SectionTitleRow, TextBtn } from '../../components/OwnerChrome'
import { generateVideoThumbnail, getVideoDuration, MAX_VIDEO_DURATION_SECONDS, MAX_VIDEOS_PER_SALON } from '../../helpers'
import { formatVideoDuration, type SalonVideoModel } from '../../models'
import { videoStageText, type SalonProfileController, type VideoStage, type VideoUploadState } from '../useSalonProfile'

const STAGE_COLOR: Record<VideoStage, string> = {
  compressing: '#2196F3',
  uploading_video: '#4CAF50',
  uploading_thumbnail: '#9C27B0',
  processing: '#FF9800',
  saving: '#FF9800',
}
const STAGE_ICON: Record<VideoStage, LucideIcon> = {
  compressing: Minimize2,
  uploading_video: CloudUpload,
  uploading_thumbnail: ImageIcon,
  processing: Video,
  saving: Save,
}

export function useConfirmCancelUpload(ctrl: SalonProfileController) {
  const { confirm, toast } = useFeedback()
  return async () => {
    const ok = await confirm({
      title: 'Cancel Video Upload?',
      message: 'Are you sure you want to cancel this upload?',
      confirmText: 'Cancel Upload',
      cancelText: 'Continue Uploading',
      destructive: true,
    })
    if (ok) {
      ctrl.cancelVideoUpload()
      toast('Upload cancelled', 'warning')
    }
  }
}

export default function VideosSection({ ctrl }: { ctrl: SalonProfileController }) {
  const { toast, confirm } = useFeedback()
  const { videos, videoUpload } = ctrl
  const isUploading = videoUpload != null
  const canAddMore = videos.length < MAX_VIDEOS_PER_SALON
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<SalonVideoModel | null>(null)
  const [editing, setEditing] = useState<SalonVideoModel | null>(null)
  const del = useAction(ctrl.deleteVideo, { success: 'Video deleted', error: 'Could not delete the video' })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const openAdd = () => {
    if (isUploading) {
      toast('Please wait for current upload to complete', 'warning')
      return
    }
    setAddOpen(true)
  }

  const confirmDelete = async (video: SalonVideoModel) => {
    const ok = await confirm({
      title: 'Delete Video?',
      message: 'This will permanently delete this video. This action cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
    })
    if (!ok) return
    setDeletingId(video.id)
    await del.run(video.id)
    setDeletingId(null)
  }

  return (
    <div>
      <SectionTitleRow title="Video Shorts" badge={<CountBadge>{`${videos.length}/${MAX_VIDEOS_PER_SALON}`}</CountBadge>}>
        {canAddMore && !isUploading && (
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-sm1 hover:bg-primary-dark">
            <Video size={18} /> Add Video
          </button>
        )}
        {isUploading && (
          <span className="flex items-center gap-1.5 rounded-2xl bg-primary/10 px-3 py-2 text-[11px] text-primary">
            <Loader2 size={16} className="animate-spin" /> Uploading...
          </span>
        )}
      </SectionTitleRow>

      {videoUpload && (
        <Card className="mb-4">
          <VideoUploadProgress state={videoUpload} ctrl={ctrl} />
        </Card>
      )}

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4">
        <Info size={20} className="shrink-0 text-primary" />
        <div>
          <p className="text-[12.5px] text-ink/80">Short videos (max 60 sec) showcase your work.</p>
          <p className="text-[12.5px] text-ink/60">Videos go live immediately after upload.</p>
        </div>
      </div>

      {videos.length === 0 ? (
        <Card className="flex flex-col items-center p-8 text-center">
          <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-primary/10">
            <PlayCircle size={48} className="text-primary/60" />
          </div>
          <p className="mt-4 text-[16px] font-semibold text-ink">No videos yet</p>
          <p className="mt-2 whitespace-pre-line text-sm text-ink/60">{'Add short videos to showcase your best work\nand attract more clients!'}</p>
          {canAddMore && !isUploading && (
            <button onClick={openAdd} className="mt-5 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
              <Video size={18} /> Add Your First Video
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2 md:max-w-xl">
          {videos.map((v) => (
            <VideoThumbnailCard key={v.id} video={v} deleting={deletingId === v.id} onClick={() => setSelected(v)} />
          ))}
        </div>
      )}

      {addOpen && (
        <AddVideoSheet
          onClose={() => setAddOpen(false)}
          onSelected={(p) => {
            setAddOpen(false)
            void ctrl.uploadVideo(p)
          }}
        />
      )}

      {selected && (
        <Sheet open onClose={() => setSelected(null)}>
          <video
            src={selected.videoUrl}
            poster={selected.thumbnailUrl}
            controls
            playsInline
            autoPlay
            className="mx-auto max-h-[60vh] w-full rounded-2xl bg-black object-contain"
          />
          {selected.caption && <p className="mt-4 text-center text-sm text-ink">{selected.caption}</p>}
          <p className="mt-4 text-center text-[12.5px] text-ink/60">Duration: {formatVideoDuration(selected.durationSeconds)}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setEditing(selected)
                setSelected(null)
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-line text-sm font-semibold text-primary hover:bg-primary/5"
            >
              <Pencil size={18} /> Edit Caption
            </button>
            <button
              onClick={() => {
                const v = selected
                setSelected(null)
                void confirmDelete(v)
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-danger/40 text-sm font-semibold text-danger hover:bg-danger/5"
            >
              <Trash2 size={18} /> Delete
            </button>
          </div>
        </Sheet>
      )}

      {editing && <EditCaptionDialog video={editing} ctrl={ctrl} onClose={() => setEditing(null)} />}
    </div>
  )
}

export function VideoUploadProgress({ state, ctrl }: { state: VideoUploadState; ctrl: SalonProfileController }) {
  const confirmCancel = useConfirmCancelUpload(ctrl)
  const color = STAGE_COLOR[state.stage]
  const Icon = STAGE_ICON[state.stage]
  const pct = Math.trunc(state.progress * 100)
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}>
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <ProgressBar
            value={state.progress > 0 ? pct : null}
            label={videoStageText(state.stage)}
            onCancel={state.stage === 'compressing' || state.stage === 'uploading_video' ? () => void confirmCancel() : undefined}
          />
        </div>
      </div>
      {state.stage === 'compressing' && <p className="mt-2 text-[12.5px] text-ink/60">Optimizing for best quality and size...</p>}
    </div>
  )
}

function VideoThumbnailCard({ video, onClick, deleting }: { video: SalonVideoModel; onClick: () => void; deleting?: boolean }) {
  const [broken, setBroken] = useState(false)
  return (
    <button onClick={onClick} disabled={deleting} aria-busy={deleting || undefined} className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-line shadow-md1">
      {broken || !video.thumbnailUrl ? (
        <VideoOff size={24} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ink/30" />
      ) : (
        <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-black/70" />
      <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white">
        <Play size={22} fill="currentColor" />
      </span>
      <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{formatVideoDuration(video.durationSeconds)}</span>
      <span className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-success" />
      {deleting && (
        <span className="absolute inset-0 grid place-items-center bg-black/50">
          <Loader2 size={22} className="animate-spin text-white" />
        </span>
      )}
    </button>
  )
}

function EditCaptionDialog({ video, ctrl, onClose }: { video: SalonVideoModel; ctrl: SalonProfileController; onClose: () => void }) {
  const [caption, setCaption] = useState(video.caption ?? '')
  const save = useAction(() => ctrl.updateVideoCaption(video.id, caption.trim()), { success: 'Caption updated!', error: 'Could not update the caption', onSuccess: onClose })
  return (
    <Sheet open onClose={() => !save.pending && onClose()} title="Edit Caption">
      <textarea className="field" rows={3} maxLength={150} value={caption} placeholder="Add a caption (optional)" onChange={(e) => setCaption(e.target.value)} />
      <p className="t-caption mt-1 text-right">{caption.length}/150</p>
      <DialogActions>
        <TextBtn onClick={onClose} disabled={save.pending}>
          Cancel
        </TextBtn>
        <button
          onClick={() => void save.run()}
          disabled={save.pending}
          aria-busy={save.pending || undefined}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-70"
        >
          {save.pending && <Loader2 size={16} className="animate-spin" />}
          {save.pending ? 'Saving…' : 'Save'}
        </button>
      </DialogActions>
    </Sheet>
  )
}

function AddVideoSheet({
  onClose,
  onSelected,
}: {
  onClose: () => void
  onSelected: (p: { file: File; thumbnail: Blob; durationSeconds: number; caption: string | null }) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [thumb, setThumb] = useState<Blob | null>(null)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const recordRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => void (thumbUrl && URL.revokeObjectURL(thumbUrl)), [thumbUrl])

  const pick = async (f: File) => {
    setProcessing(true)
    setError(null)
    setFile(f)
    try {
      const d = await getVideoDuration(f)
      if (d == null) {
        setFile(null)
        setError('Could not read video duration')
        return
      }
      if (d > MAX_VIDEO_DURATION_SECONDS) {
        setFile(null)
        setError(`Video must be ${MAX_VIDEO_DURATION_SECONDS} seconds or less. Your video is ${d} seconds.`)
        return
      }
      const t = await generateVideoThumbnail(f)
      setDuration(d)
      setThumb(t)
      setThumbUrl(t ? URL.createObjectURL(t) : null)
      if (!t) setError('Error selecting video: could not generate a preview')
    } catch (e) {
      setFile(null)
      console.error(e)
      setError('Error selecting video: this file could not be read. Try a different MP4 or MOV video.')
    } finally {
      setProcessing(false)
    }
  }

  const clear = () => {
    setFile(null)
    setThumb(null)
    setThumbUrl(null)
    setDuration(null)
    setError(null)
  }

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) void pick(f)
  }

  return (
    <Sheet open onClose={onClose} title="Add Video Short">
      <p className="-mt-1 mb-4 text-[12.5px] text-ink/60">Max 60 seconds • Goes live immediately after upload</p>
      <input ref={recordRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={onInput} />
      <input ref={galleryRef} type="file" accept="video/*" className="hidden" onChange={onInput} />

      {!file ? (
        <div className="space-y-3">
          <OptionTile icon={Video} title="Record Video" subtitle="Use your camera" color="#6C5CE7" disabled={processing} onClick={() => recordRef.current?.click()} />
          <OptionTile icon={ImageIcon} title="Choose from Gallery" subtitle="Select existing video" color="#FAB1A0" disabled={processing} onClick={() => galleryRef.current?.click()} />
        </div>
      ) : (
        <div>
          <div className="relative h-[200px] overflow-hidden rounded-2xl bg-black">
            {thumbUrl ? (
              <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              processing && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
                  <Loader2 className="animate-spin" />
                  <span className="text-sm">Generating preview...</span>
                </div>
              )
            )}
            {thumbUrl && (
              <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white">
                <Play size={30} fill="currentColor" />
              </span>
            )}
            {duration != null && (
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs font-bold text-white">{formatVideoDuration(duration)}</span>
            )}
            <button onClick={clear} aria-label="Remove video" className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70">
              <X size={18} />
            </button>
          </div>
          {thumb && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-success">
              <PlayCircle size={16} /> Video ready to upload
            </p>
          )}
        </div>
      )}

      {error && <div className="mt-4 rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      {file && thumb && duration != null && (
        <div className="mt-4">
          <textarea className="field" rows={2} maxLength={150} value={caption} placeholder="Add a short description..." onChange={(e) => setCaption(e.target.value)} />
          <p className="t-caption mt-1 text-right">{caption.length}/150</p>
          <button
            disabled={processing}
            onClick={() => onSelected({ file, thumbnail: thumb, durationSeconds: duration, caption: caption.trim() || null })}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {processing ? <Loader2 size={18} className="animate-spin" /> : <CloudUpload size={20} />}
            {processing ? 'Processing...' : 'Upload Video'}
          </button>
        </div>
      )}
    </Sheet>
  )
}

function OptionTile({ icon: Icon, title, subtitle, color, onClick, disabled }: { icon: LucideIcon; title: string; subtitle: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition hover:brightness-95 disabled:opacity-50"
      style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, background: `color-mix(in srgb, ${color} 5%, transparent)` }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
        <Icon size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="t-caption block">{subtitle}</span>
      </span>
      {disabled ? <Loader2 size={16} className="animate-spin text-muted" /> : <span className="text-muted">›</span>}
    </button>
  )
}
