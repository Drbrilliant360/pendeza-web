// Port of lib/features/3_owner_inspiration/presentation/screens/inspiration_screen.dart (+ InspirationBloc).
// Note: market_trend_card.dart and anonymous_benchmark_widget.dart are empty files in the app, so there
// is nothing to port for them.
import { BarChart3, Images, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, EmptyState, ErrorState, Screen, Sheet, Skeleton, cx } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useAsync } from '@/lib/hooks'
import { useT } from '@/lib/i18n'
import * as api from '../api'
import { IconAction, OwnerAppBar } from '../components/OwnerChrome'
import type { InspirationArticleModel, LookbookImageModel } from '../models'
import { OwnerSalonRoutes } from '../paths'

type Tab = 'trends' | 'lookbook'
const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function InspirationScreen() {
  const [tab, setTab] = useState<Tab>('trends')
  const { data, error, loading, reload } = useAsync(async () => {
    const articles = await api.getArticles()
    const lookbook = await api.getLookbook()
    return { articles, lookbook }
  }, [])

  return (
    <>
      <OwnerAppBar title="Inspiration Hub" actions={<IconAction icon={RefreshCw} label="Refresh" onClick={() => void reload()} spinning={loading} />} />
      <div className="sticky top-14 z-20 border-b border-line/60 bg-page/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl">
          {(
            [
              ['trends', BarChart3, 'Market Trends'],
              ['lookbook', Images, 'Lookbook'],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cx(
                'flex flex-1 flex-col items-center gap-1 border-b-2 py-2.5 text-[13px] font-semibold transition',
                tab === value ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink',
              )}
              aria-pressed={tab === value}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <Screen className="max-w-5xl px-4 pt-6 sm:px-6 md:max-w-5xl">
        {loading && !data ? (
          tab === 'trends' ? (
            <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading articles">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="overflow-hidden rounded-[22px] border border-line/60 bg-card">
                  <Skeleton className="h-40 w-full rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-5 w-3/4 rounded-lg" />
                    <Skeleton className="h-3 w-full rounded-lg" />
                    <Skeleton className="h-3 w-2/3 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading lookbook">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full rounded-[22px]" />
              ))}
            </div>
          )
        ) : error && !data ? (
          (() => {
            const f = friendlyError(error, 'Failed to load inspiration')
            return <ErrorState title="Failed to load inspiration" message={f.message} hint={f.hint} offline={f.code === 'network'} retrying={loading} onRetry={() => void reload()} />
          })()
        ) : data ? (
          tab === 'trends' ? (
            <TrendsTab articles={data.articles} />
          ) : (
            <LookbookTab images={data.lookbook} />
          )
        ) : null}
      </Screen>
    </>
  )
}

function TrendsTab({ articles }: { articles: InspirationArticleModel[] }) {
  const navigate = useNavigate()
  if (articles.length === 0) return <EmptyState icon={BarChart3} title="No trends yet. Check back soon!" />
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {articles.map((a) => (
        <Card key={a.id} className="overflow-hidden !p-0" onClick={() => navigate(OwnerSalonRoutes.article(a.id), { state: { article: a } })}>
          {a.imageUrl && <img src={a.imageUrl} alt="" loading="lazy" className="h-40 w-full bg-inset object-cover" />}
          <div className="p-4">
            <h3 className="line-clamp-2 text-[18px] font-bold text-ink">{a.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm text-ink">{a.summary}</p>
            <p className="mt-2 text-xs text-muted">{fmt(a.publishedAt)}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}

function LookbookTab({ images }: { images: LookbookImageModel[] }) {
  const t = useT()
  const [open, setOpen] = useState<LookbookImageModel | null>(null)
  if (images.length === 0) return <EmptyState icon={Images} title="Lookbook coming soon!" />
  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => (
          <Card key={img.id} className="flex aspect-[3/4] flex-col overflow-hidden !p-0" onClick={() => setOpen(img)}>
            <img src={img.imageUrl} alt={img.title} loading="lazy" className="min-h-0 w-full flex-1 bg-inset object-cover" />
            <p className="line-clamp-2 p-2 text-center text-sm text-ink">{img.title}</p>
          </Card>
        ))}
      </div>
      <Sheet open={open != null} onClose={() => setOpen(null)}>
        {open && (
          <div className="text-center">
            <img src={open.imageUrl} alt={open.title} className="mx-auto max-h-[60vh] max-w-full rounded-xl object-contain" />
            <h3 className="mt-4 text-[18px] font-bold text-ink">{open.title}</h3>
            {open.description && <p className="mt-2 text-sm text-ink">{open.description}</p>}
            <button onClick={() => setOpen(null)} className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
              {t('common.close')}
            </button>
          </div>
        )}
      </Sheet>
    </>
  )
}
