// Salon photo with the app's fallback chain: primary image → deterministic placeholder → icon.
import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx } from '@/components/ui'
import { placeholderForSalon } from '../utils'

export default function SalonImage({ salonId, url, alt, className }: { salonId: string; url?: string | null; alt: string; className?: string }) {
  const sources = [url, placeholderForSalon(salonId)].filter((s): s is string => !!s)
  const [idx, setIdx] = useState(0)
  useEffect(() => { setIdx(0) }, [url, salonId])
  if (idx >= sources.length) {
    return (
      <div className={cx('grid place-items-center bg-inset text-muted', className)}>
        <ImageOff size={28} />
      </div>
    )
  }
  return <img src={sources[idx]} alt={alt} loading="lazy" className={cx('object-cover', className)} onError={() => setIdx((i) => i + 1)} />
}
