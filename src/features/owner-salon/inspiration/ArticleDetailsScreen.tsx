// Port of lib/features/3_owner_inspiration/presentation/screens/article_details_screen.dart
import { ChevronLeft, FileX, User } from 'lucide-react'
import { useLocation, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingScreen, usePageTitle } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useAsync } from '@/lib/hooks'
import { useT } from '@/lib/i18n'
import { getArticleById } from '../api'
import type { InspirationArticleModel } from '../models'
import { OwnerAppBar, useBack } from '../components/OwnerChrome'
import { OwnerSalonRoutes } from '../paths'
import QuillContent from './QuillContent'

export default function ArticleDetailsScreen() {
  const t = useT()
  const { articleId } = useParams()
  const { state } = useLocation() as { state?: { article?: InspirationArticleModel } | null }
  const initial = state?.article && state.article.id === articleId ? state.article : undefined
  const { data, loading, error, reload } = useAsync(async () => initial ?? (articleId ? await getArticleById(articleId) : null), [articleId])
  const article = data ?? initial
  const back = useBack(OwnerSalonRoutes.inspiration)
  usePageTitle(article?.title)

  if (!article) {
    if (loading) return <LoadingScreen message="Loading article…" />
    if (error) {
      const f = friendlyError(error, "Couldn't load this article")
      return (
        <>
          <OwnerAppBar title="Article" back parent={OwnerSalonRoutes.inspiration} />
          <ErrorState title="Couldn't load this article" message={f.message} hint={f.hint} offline={f.code === 'network'} onRetry={() => void reload()} />
        </>
      )
    }
    return <EmptyState icon={FileX} title="Article not found" actionLabel="Back" onAction={back} className="pt-24" />
  }

  return (
    <div className="pb-28 md:pb-10">
      <div className="relative h-[250px] w-full overflow-hidden bg-primary md:h-[340px]">
        {article.imageUrl && <img src={article.imageUrl} alt="" className="h-full w-full object-cover" />}
        <button
          onClick={back}
          aria-label="Back"
          className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/45"
        >
          <ChevronLeft size={22} />
        </button>
      </div>
      <article className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <h1 className="break-words text-[26px] font-bold leading-[1.2] text-ink">{article.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-[12.5px]">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/40 text-card">
            <User size={16} />
          </span>
          <span className="font-bold text-ink">{t('owner.inspiration.author')}</span>
          <span className="text-ink">•</span>
          <span className="text-muted">{article.publishedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <hr className="my-5 border-line" />
        <QuillContent json={article.contentJson} fallback={article.summary} />
      </article>
    </div>
  )
}
