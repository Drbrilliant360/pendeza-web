// Port of video_shorts/presentation/widgets/video_story_widget.dart – auto-scrolling
// story circles (one per salon) that open the full-screen viewer.
import { PlayCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n'
import { Skeleton } from '@/components/ui'
import { groupStories, type SalonStory, type SalonVideoModel } from '../types'
import VideoViewer from './VideoViewer'

export type VideoShortsState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; videos: SalonVideoModel[] }

const CIRCLE = 68
const GAP = 8

export default function VideoStories({ state, onRetry }: { state: VideoShortsState; onRetry: () => void }) {
  const t = useT()
  const [viewer, setViewer] = useState<{ videos: SalonVideoModel[]; index: number } | null>(null)

  if (state.status === 'loading') {
    return (
      <div className="no-scrollbar flex h-[105px] items-center gap-2 overflow-hidden px-6">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="shrink-0 !rounded-full" style={{ width: CIRCLE, height: CIRCLE }} />
        ))}
      </div>
    )
  }
  if (state.status === 'error' || state.videos.length === 0) {
    return (
      <div className="flex h-[105px] items-center gap-2 px-6">
        <PlayCircle size={22} className="text-ink/40" />
        <span className="flex-1 truncate text-xs text-ink/60">
          {t(state.status === 'error' ? 'client.dashboard.stories_error' : 'client.dashboard.no_stories')}
        </span>
        {state.status === 'error' && (
          <button onClick={onRetry} className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10">
            {t('common.retry')}
          </button>
        )}
      </div>
    )
  }

  const stories = groupStories(state.videos)
  const open = (storyIndex: number) => {
    const all = stories.flatMap((s) => s.videos)
    let idx = 0
    for (let i = 0; i < storyIndex; i++) idx += stories[i].videos.length
    setViewer({ videos: all, index: idx })
  }

  return (
    <>
      <AutoScrollRow stories={stories} onTap={open} />
      {viewer && <VideoViewer videos={viewer.videos} initialIndex={viewer.index} onClose={() => setViewer(null)} />}
    </>
  )
}

/** _AutoScrollingStoriesRow – advances one item every 3.2s, pauses on user interaction. */
function AutoScrollRow({ stories, onTap }: { stories: SalonStory[]; onTap: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const paused = useRef(false)
  const resumeTimer = useRef<number>()

  useEffect(() => {
    if (stories.length < 2) return
    const id = window.setInterval(() => {
      const el = ref.current
      if (!el || paused.current) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const next = el.scrollLeft + CIRCLE + GAP
      el.scrollTo({ left: next >= max - 4 ? 0 : Math.min(next, max), behavior: 'smooth' })
    }, 3200)
    return () => window.clearInterval(id)
  }, [stories.length])

  useEffect(() => () => window.clearTimeout(resumeTimer.current), [])

  const pause = () => {
    paused.current = true
    window.clearTimeout(resumeTimer.current)
  }
  const scheduleResume = () => {
    window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => (paused.current = false), 2500)
  }

  return (
    <div
      ref={ref}
      onPointerDown={pause}
      onPointerUp={scheduleResume}
      onPointerCancel={scheduleResume}
      onMouseEnter={pause}
      onMouseLeave={scheduleResume}
      onWheel={() => {
        pause()
        scheduleResume()
      }}
      className="no-scrollbar flex h-[105px] items-center overflow-x-auto px-6"
      style={{ gap: GAP }}
    >
      {stories.map((s, i) => (
        <button key={s.salonId} onClick={() => onTap(i)} title={s.salonName} className="relative shrink-0" style={{ width: CIRCLE, height: CIRCLE }}>
          <div className="h-full w-full rounded-full p-[2.5px]" style={{ background: 'linear-gradient(135deg, #6C5CE7, #A29BFE, #FAB1A0, #74B9FF)' }}>
            <div className="h-full w-full rounded-full bg-page p-[2px]">
              <StoryThumb url={s.videos[0].thumbnailUrl} />
            </div>
          </div>
          {s.videos.length > 1 && (
            <span className="absolute -bottom-0.5 -right-0.5 rounded-lg border-[1.5px] border-page bg-primary px-[5px] py-[2px] text-[9px] font-bold text-white">
              {s.videos.length}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function StoryThumb({ url }: { url: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <div className="grid h-full w-full place-items-center rounded-full bg-inset">
        <PlayCircle size={24} className="text-primary/50" fill="currentColor" />
      </div>
    )
  }
  return <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full rounded-full bg-inset object-cover" />
}
