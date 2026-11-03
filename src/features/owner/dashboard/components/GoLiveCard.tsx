// Port of dashboard/presentation/widgets/go_live_card.dart
import { AlertTriangle, CheckCircle2, ChevronRight, Circle, Clock, Info, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { cx } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { checklistHelpers as H, type GoLiveChecklist } from '../../api'

export default function GoLiveCard({ checklist }: { checklist: GoLiveChecklist }) {
  const t = useT()
  const navigate = useNavigate()

  // Established, listed salons don't need a daily "you're live" nag.
  if (H.isListed(checklist) && H.isComplete(checklist)) return null

  let icon: LucideIcon = Info
  let color = '#6C5CE7'
  let title = t('owner.dashboard.golive_approved_incomplete_title')
  let body = t('owner.dashboard.golive_approved_incomplete_body')
  let showChecklist = true

  if (H.isPending(checklist)) {
    icon = Clock
    color = '#F0937D'
    title = t('owner.dashboard.golive_pending_title')
    body = t('owner.dashboard.golive_pending_body')
    showChecklist = !H.isComplete(checklist)
  } else if (H.isRejected(checklist)) {
    icon = AlertTriangle
    color = '#FF6B6B'
    title = t('owner.dashboard.golive_rejected_title')
    const reason = checklist.rejectionReason?.trim()
    body = reason ? reason : t('owner.dashboard.golive_pending_body')
  }

  const Icon = icon
  const items = [
    { done: checklist.hasPhoto, label: t('owner.dashboard.golive_photo'), to: Routes.ownerSalonProfile },
    { done: checklist.hasHours, label: t('owner.dashboard.golive_hours'), to: Routes.ownerSalonProfile },
    { done: checklist.hasPhone, label: t('owner.dashboard.golive_phone'), to: Routes.ownerSalonProfile },
    { done: checklist.hasService, label: t('owner.dashboard.golive_service'), to: Routes.ownerServices },
  ]

  return (
    <div
      className="rounded-[20px] border p-5"
      style={{ background: `color-mix(in srgb, ${color} 8%, transparent)`, borderColor: `color-mix(in srgb, ${color} 28%, transparent)` }}
    >
      <div className="flex items-start gap-2">
        <Icon size={22} style={{ color }} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <p className="mt-1 text-[12.5px] text-ink/70">{body}</p>
        </div>
      </div>
      {showChecklist && (
        <>
          <p className="mt-4 text-sm font-semibold text-ink">{t('owner.dashboard.golive_checklist_title')}</p>
          <div className="mt-2">
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                disabled={it.done}
                onClick={() => navigate(it.to)}
                className="flex w-full items-center gap-2.5 rounded-lg py-1.5 text-left enabled:hover:bg-ink/[0.03]"
              >
                {it.done ? (
                  <CheckCircle2 size={20} className="shrink-0 text-primary" fill="currentColor" stroke="white" />
                ) : (
                  <Circle size={20} className="shrink-0 text-ink/35" />
                )}
                <span className={cx('flex-1 text-sm', it.done ? 'text-ink/50 line-through' : 'text-ink/90')}>{it.label}</span>
                {!it.done && <ChevronRight size={14} className="text-ink/40" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
