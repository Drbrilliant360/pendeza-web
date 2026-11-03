// Port of video_shorts/presentation/screens/video_viewer_screen.dart – full-screen,
// vertically swiping (scroll-snap) HTML5 video viewer with "Book Now".
import { CalendarDays, Loader2, Play, Store, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { useFeedback } from '@/components/feedback'
import { useBooking } from '@/features/bookings/BookingContext'
import { getSalonById } from '@/lib/firestore'
import { formattedDuration, type SalonVideoModel } from '../types'

export default function VideoViewer({ videos, initialIndex, onClose }: { videos: SalonVideoModel[]; initialIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(initialIndex)
  const [booking, setBooking] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { startBooking } = useBooking()
  const { toastError } = useFeedback()

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = initialIndex * el.clientHeight
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const node = scroller.current
        if (node) node.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * node.clientHeight, behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const idx = Math.round(el.scrollTop / el.clientHeight)
    if (idx !== current) setCurrent(idx)
  }

  // _navigateToBooking: load the salon, start booking, go to service selection.
  const bookNow = async (v: SalonVideoModel) => {
    if (booking) return
    setBooking(true)
    try {
      const salon = await getSalonById(v.salonId)
      if (!salon) throw new Error('Salon not found')
      startBooking(salon)
      onClose()
      navigate(Routes.serviceSelection(v.salonId), { state: { salonName: v.salonName } })
    } catch (e) {
      toastError(e, 'Could not open this salon', () => void bookNow(v))
    } finally {
      setBooking(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] animate-[slideUp_.35s_cubic-bezier(.22,1,.36,1)] bg-black" role="dialog" aria-modal>
      <style>{'@keyframes slideUp{from{transform:translateY(100%)}to{transform:none}}'}</style>
      <div ref={scroller} onScroll={onScroll} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll">
        {videos.map((v, i) => (
          <VideoPage key={v.id} video={v} active={i === current} preload={Math.abs(i - current) <= 1} onBook={() => bookNow(v)} />
        ))}
      </div>
      <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1.5 text-sm font-bold text-white">
        {current + 1} / {videos.length}
      </div>
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70">
        <X size={24} />
      </button>
      {booking && (
        <div className="absolute inset-0 grid place-items-center bg-black/50" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 size={36} className="animate-spin" />
            <span className="text-sm font-semibold">Opening salon…</span>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

function VideoPage({ video, active, preload, onBook }: { video: SalonVideoModel; active: boolean; preload: boolean; onBook: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState({ cur: 0, dur: 0, buf: 0 })

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (active) v.play().catch(() => setPlaying(false))
    else v.pause()
  }, [active, ready])

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play().catch(() => setPlaying(false))
    else v.pause()
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = ref.current
    if (!v || !progress.dur) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * progress.dur
  }

  return (
    <section className="relative h-full w-full snap-start snap-always overflow-hidden">
      <div
        className="absolute inset-0"
        role="button"
        tabIndex={active ? 0 : -1}
        aria-label={playing ? 'Pause video' : 'Play video'}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
      >
        {preload ? (
          <video
            ref={ref}
            src={video.videoUrl}
            poster={video.thumbnailUrl}
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-contain"
            onLoadedData={() => setReady(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget
              setProgress({ cur: v.currentTime, dur: v.duration || 0, buf: v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0 })
            }}
          />
        ) : (
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      {buffering && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 size={36} className="animate-spin text-white" />
        </div>
      )}
      {ready && !playing && !buffering && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="rounded-full bg-black/50 p-5">
            <Play size={50} className="text-white" fill="white" />
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[300px] bg-gradient-to-b from-transparent to-black/80" />
      <div className="absolute bottom-[200px] right-4 rounded-2xl bg-black/60 px-2.5 py-1.5 text-xs font-bold text-white">
        {formattedDuration(video.durationSeconds)}
      </div>
      <div className="absolute inset-x-4 bottom-5 mx-auto max-w-xl">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/20">
            {video.salonImage ? (
              <img src={video.salonImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-white">
                <Store size={20} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-white">
            <p className="truncate text-base font-bold">{video.salonName}</p>
            {video.salonAddress && <p className="truncate text-xs text-white/80">{video.salonAddress}</p>}
          </div>
        </div>
        {video.caption ? <p className="mb-4 mt-3 line-clamp-3 text-sm text-white">{video.caption}</p> : <div className="h-3" />}
        <button
          onClick={onBook}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-white transition hover:bg-primary-dark"
        >
          <CalendarDays size={20} />
          Book Now
        </button>
      </div>
      {ready && progress.dur > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 cursor-pointer bg-white/10" onClick={seek}>
          <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${(progress.buf / progress.dur) * 100}%` }} />
          <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${(progress.cur / progress.dur) * 100}%` }} />
        </div>
      )}
    </section>
  )
}
