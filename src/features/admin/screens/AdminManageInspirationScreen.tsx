// Port of admin_manage_inspiration_screen.dart (not in the admin nav – the app removed the tab).
// Articles + Lookbook tabs, "New Blog Post" editor, lookbook upload, delete.
// The app's AdminBloc no longer loads inspiration data ("Inspiration is disabled"), so this page
// reads the collections itself with the same queries as InspirationRepositoryImpl.
// The Quill rich-text editor is replaced by a plain-text editor that still saves a Quill delta
// (`contentJson`), with inline images stored as image embeds.
import { BookOpen, FilePlus2, ImagePlus, Images, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFeedback } from '@/components/feedback'
import { cx, fieldClass, PrimaryButton, ProgressBar } from '@/components/ui'
import { useAsync } from '@/lib/hooks'
import { compressImage } from '@/lib/storage'
import * as api from '../api'
import type { InspirationArticle, LookbookImage } from '../api'
import {
  AdminCard,
  AdminCloseButton,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
  AdminModal,
  AdminOutlinedButton,
  AdminPage,
  AdminSegmentedTabBar,
  AdminTextButton,
  GUTTER,
  toneVars,
  useAdminConfirm,
} from '../components/ui'

type Tab = 'articles' | 'lookbook'

export default function AdminManageInspirationScreen() {
  const [tab, setTab] = useState<Tab>('articles')
  const [adding, setAdding] = useState<Tab | null>(null)
  const { data, loading, error, reload } = useAsync(async () => {
    const [articles, lookbook] = await Promise.all([api.getArticles(), api.getLookbook()])
    return { articles, lookbook }
  }, [])

  let body: ReactNode
  if (loading && !data) body = <AdminLoadingState />
  else if (error && !data) body = <AdminErrorState error={error} fallback="Could not load inspiration content" onRetry={() => void reload()} />
  else if (tab === 'articles') body = <ArticlesTab articles={data?.articles ?? []} onChanged={() => void reload()} />
  else body = <LookbookTab items={data?.lookbook ?? []} onChanged={() => void reload()} />

  return (
    <AdminPage
      title="Manage Inspiration"
      icon={BookOpen}
      toolbar={
        <AdminSegmentedTabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'articles', label: 'Articles', icon: BookOpen },
            { value: 'lookbook', label: 'Lookbook', icon: Images },
          ]}
        />
      }
      fab={
        <button onClick={() => setAdding(tab)} className="flex h-14 items-center gap-2.5 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-lg1 transition hover:bg-primary-dark">
          {tab === 'articles' ? (
            <>
              <FilePlus2 size={20} />
              New Blog Post
            </>
          ) : (
            <ImagePlus size={22} />
          )}
        </button>
      }
    >
      {body}
      {adding === 'articles' && (
        <AddArticleDialog
          onClose={() => setAdding(null)}
          onDone={() => {
            setAdding(null)
            void reload()
          }}
        />
      )}
      {adding === 'lookbook' && (
        <AddLookbookDialog
          onClose={() => setAdding(null)}
          onDone={() => {
            setAdding(null)
            void reload()
          }}
        />
      )}
    </AdminPage>
  )
}

/** Confirm → delete → success toast / friendly error. `deleting` is the id being removed. */
function useDelete() {
  const { toastSuccess, toastError } = useFeedback()
  const confirm = useAdminConfirm()
  const [deleting, setDeleting] = useState<string | null>(null)
  const del = async (id: string, title: string, run: () => Promise<void>, onDone: () => void) => {
    if (deleting) return
    const ok = await confirm({ title: 'Delete?', message: `"${title}" will be removed.`, confirmLabel: 'Delete', tone: 'danger', icon: Trash2 })
    if (!ok) return
    setDeleting(id)
    try {
      await run()
      toastSuccess('Deleted')
      onDone()
    } catch (e) {
      toastError(e, 'Could not delete this item', () => void del(id, title, run, onDone))
    } finally {
      setDeleting(null)
    }
  }
  return { del, deleting }
}

function ArticlesTab({ articles, onChanged }: { articles: InspirationArticle[]; onChanged: () => void }) {
  const { del, deleting } = useDelete()
  if (articles.length === 0) return <AdminEmptyState icon={BookOpen} title="No articles posted yet." />
  return (
    <div className={cx('grid gap-3 pb-24 pt-2 min-[720px]:grid-cols-2', GUTTER)}>
      {articles.map((a) => (
        <AdminCard key={a.id} padded={false}>
          {a.imageUrl && <img src={a.imageUrl} alt="" loading="lazy" className="h-[120px] w-full object-cover" />}
          <div className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-ink">{a.title}</div>
              <div className="mt-0.5 line-clamp-2 text-[12.5px] text-ink/60">{a.summary}</div>
            </div>
            <button
              type="button"
              aria-label="Delete"
              title="Delete"
              style={toneVars('danger')}
              className="a-ink grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-danger/10 disabled:opacity-60"
              disabled={deleting != null}
              aria-busy={deleting === a.id || undefined}
              onClick={() => void del(a.id, a.title, () => api.deleteArticle(a.id, a.imageUrl), onChanged)}
            >
              {deleting === a.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
          </div>
        </AdminCard>
      ))}
    </div>
  )
}

function LookbookTab({ items, onChanged }: { items: LookbookImage[]; onChanged: () => void }) {
  const { del, deleting } = useDelete()
  if (items.length === 0) return <AdminEmptyState icon={Images} title="No lookbook items posted yet." />
  return (
    <div className={cx('grid grid-cols-3 gap-2 pb-24 pt-2 md:grid-cols-4 lg:grid-cols-5', GUTTER)}>
      {items.map((it) => (
        <div key={it.id} className="relative aspect-square overflow-hidden rounded-xl bg-inset">
          <img src={it.imageUrl} alt={it.title} loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center bg-black/45 pl-2.5 text-white">
            <span className="min-w-0 flex-1 truncate text-xs">{it.title}</span>
            <button
              type="button"
              aria-label="Delete"
              title="Delete"
              className="grid h-9 w-9 shrink-0 place-items-center text-danger-light disabled:opacity-60"
              disabled={deleting != null}
              aria-busy={deleting === it.id || undefined}
              onClick={() => void del(it.id, it.title, () => api.deleteLookbookItem(it.id, it.imageUrl), onChanged)}
            >
              {deleting === it.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function usePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return setUrl(null)
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

const IMAGE_LINE = /^!\[\]\((\S+)\)$/
/** Plain text with `![](url)` lines → Quill delta JSON (text inserts + image embeds). */
function toDeltaJson(text: string): string {
  const ops: ({ insert: string } | { insert: { image: string } })[] = []
  for (const line of text.split('\n')) {
    const m = IMAGE_LINE.exec(line.trim())
    if (m) {
      ops.push({ insert: { image: m[1] } })
      ops.push({ insert: '\n' })
    } else ops.push({ insert: `${line}\n` })
  }
  if (ops.length === 0) ops.push({ insert: '\n' })
  return JSON.stringify(ops)
}

function AddArticleDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toastSuccess, toastError } = useFeedback()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [insertPct, setInsertPct] = useState(0)
  const [coverPct, setCoverPct] = useState<number | null>(null)
  const coverPreview = usePreview(cover)
  const coverRef = useRef<HTMLInputElement>(null)
  const contentImgRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const insertContentImage = async (file: File) => {
    setInserting(true)
    setInsertPct(0)
    try {
      const url = await api.uploadInspirationImage(await compressImage(file), 'article_content', setInsertPct)
      const el = textRef.current
      const pos = el?.selectionStart ?? content.length
      const end = el?.selectionEnd ?? pos
      setContent((c) => `${c.slice(0, pos)}\n![](${url})\n${c.slice(end)}`)
    } catch (e) {
      toastError(e, 'Failed to insert image')
    } finally {
      setInserting(false)
    }
  }

  const submit = async () => {
    setSubmitted(true)
    if (!title.trim() || !summary.trim() || loading || inserting) return
    setLoading(true)
    try {
      let imageUrl: string | null = null
      if (cover) {
        const blob = await compressImage(cover)
        setCoverPct(0)
        imageUrl = await api.uploadInspirationImage(blob, 'articles', setCoverPct)
        setCoverPct(null)
      }
      await api.addArticle({ title: title.trim(), summary: summary.trim(), contentJson: toDeltaJson(content), imageUrl })
      toastSuccess('Article published')
      onDone()
    } catch (e) {
      setLoading(false)
      setCoverPct(null)
      toastError(e, 'Could not publish the article', () => void submit())
    }
  }

  return (
    <AdminModal open onClose={() => !loading && onClose()} maxWidth={760}>
      <div className="flex items-center gap-3 border-b border-line py-3 pl-6 pr-3">
        <h2 className="flex-1 text-lg font-bold text-ink">Write Article</h2>
        <AdminTextButton loading={loading} disabled={inserting} onClick={() => void submit()} className="font-bold">
          {loading ? 'Publishing…' : 'PUBLISH'}
        </AdminTextButton>
        <AdminCloseButton onClick={() => !loading && onClose()} />
      </div>
      {loading && (
        <div className="border-b border-line px-6 py-3">
          <ProgressBar value={coverPct} label={coverPct != null ? 'Uploading cover image…' : 'Publishing article…'} />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setCover(e.target.files[0])} />
        <button
          type="button"
          disabled={loading}
          onClick={() => coverRef.current?.click()}
          className="flex h-[150px] w-full flex-col items-center justify-center rounded-xl bg-inset bg-cover bg-center text-ink/60"
          style={coverPreview ? { backgroundImage: `url("${coverPreview}")` } : undefined}
        >
          {!coverPreview && (
            <>
              <ImagePlus size={40} />
              <span className="text-sm">Add Cover Image</span>
            </>
          )}
        </button>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article Title *" aria-invalid={submitted && !title} className="mt-6 w-full bg-transparent text-2xl font-bold text-ink outline-none placeholder:text-ink/40" />
        {submitted && !title && <div className="text-xs font-medium text-danger" role="alert">Enter a title for the article.</div>}
        <div className="my-2 h-px bg-line" />
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="Short summary (appears in list view)... *" aria-invalid={submitted && !summary} className="w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink/40" />
        {submitted && !summary && <div className="text-xs font-medium text-danger" role="alert">Enter a short summary – it appears in the list view.</div>}
        <div className="my-2 h-px bg-line" />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-ink/50">Article Content</span>
          <input ref={contentImgRef} type="file" accept="image/*" hidden onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void insertContentImage(f)
            e.target.value = ''
          }} />
          <AdminOutlinedButton type="button" icon={ImagePlus} className="h-9 px-3 text-xs" loading={inserting} disabled={loading} onClick={() => contentImgRef.current?.click()}>
            {inserting ? 'Uploading…' : 'Insert image'}
          </AdminOutlinedButton>
        </div>
        {inserting && <ProgressBar className="mt-2" value={insertPct} label="Uploading image…" />}
        <textarea
          ref={textRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your amazing story..."
          className="mt-2 min-h-[300px] w-full rounded-lg border border-line bg-transparent p-2 text-sm text-ink outline-none focus:border-primary"
        />
      </div>
    </AdminModal>
  )
}

function AddLookbookDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toastSuccess, toastError } = useFeedback()
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [pct, setPct] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const preview = usePreview(file)
  const ref = useRef<HTMLInputElement>(null)

  const submit = async () => {
    setSubmitted(true)
    if (!title.trim() || !file || loading) return
    setLoading(true)
    try {
      const blob = await compressImage(file)
      setPct(0)
      const imageUrl = await api.uploadInspirationImage(blob, 'lookbook', setPct)
      setPct(null)
      await api.addLookbookItem({ title: title.trim(), imageUrl, tags: tags.split(',').map((t) => t.trim()) })
      toastSuccess('Lookbook item posted')
      onDone()
    } catch (e) {
      setLoading(false)
      setPct(null)
      toastError(e, 'Could not post the lookbook item', () => void submit())
    }
  }

  return (
    <AdminModal open onClose={() => !loading && onClose()} maxWidth={420}>
      <div className="overflow-y-auto px-6 pb-5 pt-6">
        <h2 className="text-lg font-bold text-ink">Add Lookbook Item</h2>
        <label className="mt-4 block">
          <span className="mb-2 block text-xs text-ink/60">
            Title<span className="ml-0.5 text-danger" aria-hidden>*</span>
          </span>
          <input className={fieldClass(submitted && !title ? 'x' : null)} aria-invalid={submitted && !title} value={title} onChange={(e) => setTitle(e.target.value)} />
          {submitted && !title && <span className="mt-1 block text-xs font-medium text-danger" role="alert">Enter a title for this look.</span>}
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-xs text-ink/60">Tags (comma-separated)</span>
          <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
        <div className="mt-4">
          {preview ? (
            <button type="button" aria-label="Change image" disabled={loading} onClick={() => ref.current?.click()} className="block rounded-lg">
              <img src={preview} alt="" className="h-[100px] rounded-lg object-cover" />
            </button>
          ) : (
            <AdminOutlinedButton type="button" icon={ImagePlus} disabled={loading} onClick={() => ref.current?.click()}>
              Select Image
            </AdminOutlinedButton>
          )}
          {submitted && !file && <span className="mt-1 block text-xs text-danger">Please select an image</span>}
        </div>
        {loading && <ProgressBar className="mt-4" value={pct} label={pct != null ? 'Uploading image…' : 'Posting…'} />}
        <div className="mt-6 flex items-center justify-end gap-2">
          <AdminTextButton tone="neutral" disabled={loading} onClick={onClose}>
            Cancel
          </AdminTextButton>
          <PrimaryButton loading={loading} height={50} className="w-auto px-8" onClick={() => void submit()}>
            Post
          </PrimaryButton>
        </div>
      </div>
    </AdminModal>
  )
}
