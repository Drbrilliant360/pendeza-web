// Port of 2_client_discovery/presentation/screens/salon_gallery_screen.dart
import { AlertTriangle, ChevronLeft, ChevronRight, ImageIcon, Loader2, Play, Video, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { EmptyState, PageHeader, SegmentedTabs, Skeleton, usePageTitle } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { salonHelpers, type SalonModel } from '@/lib/models'
import { getSalonVideos } from '../api'
import SalonGate from '../components/SalonGate'
import { Thumb } from '../components/SalonOverviewTab'
import VideoViewer from '../components/VideoViewer'
import { formattedDuration, type SalonVideoModel } from '../types'

export default function SalonGalleryRoute() {
  return <SalonGate variant="wrapper">{(salon) => <SalonGalleryScreen salon={salon} />}</SalonGate>
}

type VideosState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; videos: SalonVideoModel[] }

function SalonGalleryScreen({ salon }: { salon: SalonModel }) {
  const t = useT()
  const images = salonHelpers.allImages(salon)
  const [tab, setTab] = useState<'photos' | 'videos'>('photos')
  const [videos, setVideos] = useState<VideosState>({ status: 'loading' })
  const [photoIdx, setPhotoIdx] = useState<number | null>(null)
  const [videoIdx, setVideoIdx] = useState<number | null>(null)
  const navigate = useNavigate()
  usePageTitle(`Gallery · ${salon.salonName}`)
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(Routes.salonDetail(salon.id), { replace: true }))

  const fetchVideos = useCallback(async () => {
    setVideos({ status: 'loading' })
    try {
      setVideos({ status: 'loaded', videos: await getSalonVideos(salon.id) })
    } catch (e) {
      console.error(e)
      setVideos({ status: 'error' })
    }
  }, [salon.id])
  useEffect(() => void fetchVideos(), [fetchVideos])

  const videoCount = videos.status === 'loaded' ? videos.videos.length : 0
  const grid = 'grid grid-cols-3 gap-2 px-5 pb-6 pt-4 sm:grid-cols-4 lg:grid-cols-5'

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-5xl pb-6">
        <PageHeader title={salon.salonName} subtitle={t('client.salon_details.photos')} onBack={back} />
        <div className="px-5 pt-3.5">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'photos', label: `${t('client.salon_details.photos')}${images.length ? ` (${images.length})` : ''}` },
              { value: 'videos', label: `${t('client.salon_details.videos')}${videoCount ? ` (${videoCount})` : ''}` },
            ]}
          />
        </div>

        {tab === 'photos' ? (
          images.length === 0 ? (
            <EmptyState icon={ImageIcon} title={t('client.salon_details.no_photos')} />
          ) : (
            <div className={grid}>
              {images.map((url, i) => (
                <button key={url + i} onClick={() => setPhotoIdx(i)} className="aspect-square overflow-hidden rounded-2xl bg-inset">
                  <Thumb url={url} className="transition-transform hover:scale-105" />
                </button>
              ))}
            </div>
          )
        ) : videos.status === 'loading' ? (
          <div className={grid} aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-[9/16]" />
            ))}
          </div>
        ) : videos.status === 'error' ? (
          <EmptyState icon={AlertTriangle} color="#F5A623" title={t('client.salon_details.videos_error')} actionLabel={t('common.retry')} onAction={fetchVideos} />
        ) : videos.videos.length === 0 ? (
          <EmptyState icon={Video} title={t('client.salon_details.no_videos')} />
        ) : (
          <div className={grid}>
            {videos.videos.map((v, i) => (
              <VideoTile key={v.id} video={v} onClick={() => setVideoIdx(i)} />
            ))}
          </div>
        )}
      </div>
      {photoIdx != null && <PhotoViewer images={images} initial={photoIdx} onClose={() => setPhotoIdx(null)} />}
      {videoIdx != null && videos.status === 'loaded' && <VideoViewer videos={videos.videos} initialIndex={videoIdx} onClose={() => setVideoIdx(null)} />}
    </div>
  )
}

function VideoTile({ video, onClick }: { video: SalonVideoModel; onClick: () => void }) {
  const [broken, setBroken] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return (
    <button onClick={onClick} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-inset">
      {!broken ? (
        <img src={video.thumbnailUrl} alt="" loading="lazy" onLoad={() => setLoaded(true)} onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-ink/30">
          <Video size={28} />
        </span>
      )}
      {!loaded && !broken && (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 size={20} className="animate-spin text-primary" />
        </span>
      )}
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="rounded-full bg-black/35 p-2.5">
          <Play size={22} className="text-white" fill="white" />
        </span>
      </span>
      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">{formattedDuration(video.durationSeconds)}</span>
      {video.caption && (
        <span className="absolute bottom-1.5 left-1.5 right-10 line-clamp-2 text-left text-[9px] font-medium text-white [text-shadow:0_0_4px_rgba(0,0,0,.54)]">
          {video.caption}
        </span>
      )}
    </button>
  )
}

/** _FullScreenImageViewer – swipeable / keyboard-navigable photo viewer with zoom toggle. */
function PhotoViewer({ images, initial, onClose }: { images: string[]; initial: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initial)
  const [zoom, setZoom] = useState(false)
  const [touchX, setTouchX] = useState<number | null>(null)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const n = images.length
  const go = useCallback((d: number) => {
    setZoom(false)
    setIdx((i) => Math.min(n - 1, Math.max(0, i + d)))
  }, [n])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [go, onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black"
      role="dialog"
      aria-modal
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX == null || zoom) return
        const dx = e.changedTouches[0].clientX - touchX
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
        setTouchX(null)
      }}
    >
      <div
        className="absolute inset-0 overflow-auto"
        role="button"
        tabIndex={0}
        aria-label={zoom ? 'Zoom out' : 'Zoom in'}
        onClick={() => setZoom((z) => !z)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setZoom((z) => !z)
          }
        }}
      >
        {loadedSrc !== images[idx] && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center" role="status" aria-label="Loading photo">
            <Loader2 size={34} className="animate-spin text-white/80" />
          </span>
        )}
        <img
          src={images[idx]}
          alt=""
          onLoad={() => setLoadedSrc(images[idx])}
          onError={() => setLoadedSrc(images[idx])}
          className={zoom ? 'mx-auto my-auto max-w-none cursor-zoom-out' : 'h-full w-full cursor-zoom-in object-contain'}
          style={zoom ? { width: '200%' } : undefined}
        />
      </div>
      <div className="absolute inset-x-0 top-0 flex h-14 items-center bg-gradient-to-b from-black/50 to-transparent px-2">
        <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10">
          <X size={24} />
        </button>
        <p className="flex-1 text-center text-sm font-medium text-white">
          {idx + 1} / {n}
        </p>
        <span className="w-10" />
      </div>
      {idx > 0 && (
        <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 md:grid">
          <ChevronLeft size={26} />
        </button>
      )}
      {idx < n - 1 && (
        <button onClick={() => go(1)} aria-label="Next" className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 md:grid">
          <ChevronRight size={26} />
        </button>
      )}
    </div>,
    document.body,
  )
}
