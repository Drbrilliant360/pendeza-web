// Port of 2_client_dashboard/presentation/widgets/promotion_carousel.dart
// (90% viewport, infinite auto-play every 5s when >1 promo, dot indicators).
import { ArrowRight, Sparkles, Tag, Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cx, Pill } from '@/components/ui'
import { useT } from '@/lib/i18n'
import type { PromotionModel } from '../types'

export default function PromotionCarousel({ promotions, onTap, height = 210 }: { promotions: PromotionModel[]; onTap: (p: PromotionModel) => void; height?: number }) {
  const t = useT()
  const [index, setIndex] = useState(0)
  const [hover, setHover] = useState(false)
  const touchX = useRef<number | null>(null)
  const n = promotions.length

  useEffect(() => {
    if (index >= n) setIndex(0)
  }, [n, index])

  useEffect(() => {
    if (n < 2 || hover) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % n), 5000)
    return () => window.clearInterval(id)
  }, [n, hover])

  if (!n) {
    return (
      <div className="mx-5 grid place-items-center rounded-[28px] border border-line bg-inset" style={{ height }}>
        <div className="flex flex-col items-center gap-3">
          <Tag size={30} className="text-primary" />
          <span className="t-caption">{t('client.dashboard.no_promotions')}</span>
        </div>
      </div>
    )
  }

  const go = (d: number) => setIndex((i) => (i + d + n) % n)

  return (
    <div>
      <div
        className="relative overflow-hidden"
        style={{ height: height + 12 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        <div
          className="flex h-full transition-transform duration-1000 ease-[cubic-bezier(.2,0,0,1)]"
          style={{ transform: `translateX(calc(5% - ${index * 90}%))` }}
        >
          {promotions.map((p, i) => (
            <div key={p.id} className="h-full shrink-0 px-1.5 py-1.5" style={{ width: '90%' }}>
              <button
                onClick={() => onTap(p)}
                className={cx(
                  'relative block h-full w-full overflow-hidden rounded-[28px] text-left shadow-[0_10px_22px_-6px_rgba(0,0,0,0.22)] transition-transform duration-500',
                  i === index ? 'scale-100' : 'scale-[0.88]',
                )}
              >
                <PromoImage url={p.imageUrl} />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.10) 35%, rgba(0,0,0,0.82) 100%)' }}
                />
                <div className="absolute left-3.5 top-3.5">
                  <Pill label={t('client.dashboard.special_offers').toUpperCase()} icon={Sparkles} onDark />
                </div>
                <div className="absolute inset-x-[18px] bottom-4 flex items-end gap-3 text-white">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[21px] font-bold leading-[1.2] tracking-[-0.2px]">{p.title}</p>
                    {p.description && (
                      <p className={cx('mt-1 text-[13px] leading-[1.35] text-white/90', p.promoCode ? 'line-clamp-1' : 'line-clamp-2')}>{p.description}</p>
                    )}
                    {p.promoCode && (
                      <span className="mt-2.5 inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/20 px-3 py-[7px] text-[13px] font-bold tracking-[1.2px]">
                        <Ticket size={14} />
                        {p.promoCode}
                      </span>
                    )}
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-primary-dark">
                    <ArrowRight size={18} />
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
      {n > 1 && (
        <div className="mt-3.5 flex justify-center">
          {promotions.map((p, i) => (
            <button
              key={p.id}
              aria-label={`Promotion ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cx('mx-[3px] h-[7px] rounded transition-all duration-300', i === index ? 'w-[26px] bg-brand-gradient' : 'w-[7px] bg-primary/20')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PromoImage({ url }: { url: string }) {
  const [broken, setBroken] = useState(!url)
  if (broken) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-hero-light dark:bg-hero-dark">
        <Tag size={64} className="text-white/35" fill="currentColor" />
      </div>
    )
  }
  return <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setBroken(true)} />
}
