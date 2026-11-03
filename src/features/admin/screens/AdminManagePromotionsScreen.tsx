// Port of admin_manage_promotion_screen.dart (cards grid, create / edit dialog, delete).
import { CalendarDays, CornerUpRight, Loader2, Pencil, Percent, Plus, Tag, Ticket, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAction } from '@/components/feedback'
import { cx } from '@/components/ui'
import { useAdmin, useAdminState } from '../AdminContext'
import type { PromotionModel } from '../api'
import PromotionDialog from '../components/PromotionDialog'
import { AdminCard, AdminEmptyState, AdminErrorState, AdminLoadingState, AdminOutlinedButton, AdminPage, AdminPill, GUTTER, toneVars, useAdminConfirm } from '../components/ui'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** DateFormat('d MMM') */
const dMMM = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`

type DialogState = { promotion: PromotionModel | null } | null

export default function AdminManagePromotionsScreen() {
  const { status, loaded, error, loadAdminData } = useAdminState()
  const [dialog, setDialog] = useState<DialogState>(null)
  const promotions = loaded?.promotions ?? []
  const openNew = () => setDialog({ promotion: null })

  let body: ReactNode = null
  if (status === 'loading' || status === 'initial') body = <AdminLoadingState itemHeight={220} count={3} />
  else if (status === 'error') body = <AdminErrorState error={error} fallback="Could not load promotions" onRetry={() => void loadAdminData()} />
  else if (loaded) {
    body =
      promotions.length === 0 ? (
        <AdminEmptyState icon={Tag} title="No promotions yet" message="Create a promotion to engage users." actionLabel="Create promotion" onAction={openNew} />
      ) : (
        <div className={cx('grid gap-3 pb-24 pt-2 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3', GUTTER)}>
          {promotions.map((p) => (
            <PromotionCard key={p.id} promo={p} onEdit={() => setDialog({ promotion: p })} />
          ))}
        </div>
      )
  }

  return (
    <AdminPage
      title="Promotions"
      subtitle={loaded ? `${promotions.length} total · ${promotions.filter((p) => p.isActive).length} active` : null}
      icon={Tag}
      fab={
        <button onClick={openNew} className="flex h-14 items-center gap-2.5 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-lg1 transition hover:bg-primary-dark">
          <Plus size={20} />
          New promotion
        </button>
      }
    >
      {body}
      {dialog && <PromotionDialog promotion={dialog.promotion} onClose={() => setDialog(null)} />}
    </AdminPage>
  )
}

function discountLabel(p: PromotionModel): string | null {
  const v = p.discountValue
  switch (p.discountType) {
    case 'percentage':
      if (v == null) return null
      return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}% off`
    case 'fixedAmount':
      if (v == null) return null
      return `TZS ${new Intl.NumberFormat('en-US').format(v)} off`
    case 'freebie':
      return 'Free add-on'
    default:
      return null
  }
}

function actionLabel(p: PromotionModel): string | null {
  switch (p.action) {
    case 'openDiscover': return 'Opens Discover'
    case 'openCategory': return 'Opens category'
    case 'openSalon': return 'Opens salon'
    case 'openUrl': return 'Opens link'
    default: return null
  }
}

function BannerFallback() {
  return (
    <div className="grid h-full w-full place-items-center bg-brand-gradient">
      <Tag size={40} className="text-white/85" />
    </div>
  )
}

function PromotionCard({ promo, onEdit }: { promo: PromotionModel; onEdit: () => void }) {
  const { deletePromotion } = useAdmin()
  const confirm = useAdminConfirm()
  const del = useAction(() => deletePromotion(promo.id), { success: 'Promotion deleted', error: 'Could not delete the promotion' })
  const [imgFailed, setImgFailed] = useState(false)
  const expired = promo.endDate < new Date()
  const discount = discountLabel(promo)
  const action = actionLabel(promo)

  const confirmDelete = async () => {
    const ok = await confirm({
      title: 'Delete promotion?',
      message: `"${promo.title}" will be removed for everyone. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: Trash2,
    })
    if (ok) void del.run()
  }

  return (
    <AdminCard padded={false} className="flex h-full flex-col">
      <div className="relative aspect-[2/1] bg-primary/5 dark:bg-inset">
        {promo.imageUrl && !imgFailed ? (
          <img src={promo.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
        ) : (
          <BannerFallback />
        )}
        <div className="absolute left-3 top-3 rounded-full bg-card">
          <AdminPill label={expired ? 'Expired' : promo.isActive ? 'Active' : 'Inactive'} tone={expired ? 'danger' : promo.isActive ? 'success' : 'neutral'} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink">{promo.title}</h3>
        {promo.description && <p className="mt-1 line-clamp-2 text-[12.5px] text-ink/60">{promo.description}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {discount && <AdminPill label={discount} tone="success" icon={Percent} />}
          {promo.promoCode != null && <AdminPill label={promo.promoCode} tone="info" icon={Ticket} />}
          {action && <AdminPill label={action} tone="accent" icon={CornerUpRight} />}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink/60">
          <CalendarDays size={13} />
          {dMMM(promo.startDate)} – {dMMM(promo.endDate)}
        </div>
        <div className="flex-1" />
        <div className="mt-3.5 flex gap-2.5">
          <AdminOutlinedButton icon={Pencil} className="flex-1" disabled={del.pending} onClick={onEdit}>
            Edit
          </AdminOutlinedButton>
          <button
            type="button"
            title="Delete"
            aria-label="Delete"
            disabled={del.pending}
            aria-busy={del.pending || undefined}
            onClick={() => void confirmDelete()}
            style={toneVars('danger')}
            className="a-tint a-ink grid h-[46px] w-[46px] place-items-center rounded-xl transition hover:brightness-95 disabled:cursor-wait"
          >
            {del.pending ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        </div>
      </div>
    </AdminCard>
  )
}
