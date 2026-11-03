// Port of FavoriteIconButton (white circle heart with pop animation).
import { Heart } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { cx } from '@/components/ui'
import { useFavorites } from '../favoritesStore'

export default function FavoriteButton({ salonId, size = 20, className }: { salonId: string; size?: number; className?: string }) {
  const fav = useFavorites()
  const on = fav.isFavorite(salonId)
  const loading = fav.isPending(salonId)
  const [pop, setPop] = useState(false)

  const onClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (loading) return
    if (!on) {
      setPop(true)
      setTimeout(() => setPop(false), 300)
    }
    void fav.toggle(salonId)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={on ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={on}
      aria-busy={loading || undefined}
      className={cx(
        'relative grid place-items-center rounded-full bg-white/90 p-1.5 after:absolute after:-inset-1.5 after:content-[\'\'] shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform duration-300',
        pop && 'scale-[1.3]',
        className,
      )}
    >
      {/* Optimistic: the heart flips immediately; it pulses softly until the write lands (rolls back on failure). */}
      <Heart size={size} className={cx(on ? 'text-danger' : 'text-[#2D3436]', loading && 'animate-pulse')} fill={on ? 'currentColor' : 'none'} />
    </button>
  )
}
