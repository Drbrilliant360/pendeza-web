// Port of features/0_auth/presentation/dialog/auth_prompt_dialog.dart
import { CircleArrowRight, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AuthReturnStore } from '@/auth/authReturnStore'
import { Routes } from '@/app/redirect'
import { Sheet } from '@/components/ui'

function defaultMessage(feature: string) {
  switch (feature.toLowerCase()) {
    case 'booking':
    case 'book':
      return 'Sign in to book and manage your appointments'
    case 'favorite':
    case 'save':
      return 'Sign in to save your favorite salons'
    case 'review':
      return 'Sign in to share your experience'
    default:
      return 'Sign in to unlock all features'
  }
}

export function AuthPromptDialog({
  open,
  onClose,
  featureName,
  customMessage,
  icon: Icon = ShieldCheck,
  returnRoute,
}: {
  open: boolean
  onClose: () => void
  featureName: string
  customMessage?: string
  icon?: LucideIcon
  returnRoute?: string
}) {
  const navigate = useNavigate()
  const go = (path: string) => {
    AuthReturnStore.setPending(returnRoute)
    onClose()
    navigate(path, { state: { returnRoute } })
  }
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex flex-col items-center px-2 pb-2 pt-4 text-center">
        <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-brand-gradient text-white shadow-cta">
          <Icon size={44} />
        </div>
        <h2 className="mt-6 text-[22px] font-bold text-ink">Sign In Required</h2>
        <p className="t-caption mt-3 text-sm">{customMessage ?? defaultMessage(featureName)}</p>
        <button
          onClick={() => go(Routes.login)}
          className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-bold text-white hover:bg-primary-dark"
        >
          <CircleArrowRight size={20} /> Sign In
        </button>
        <button
          onClick={() => go(Routes.signup)}
          className="mt-3 h-14 w-full rounded-2xl border-[1.5px] border-primary/30 text-[15px] font-semibold text-ink hover:bg-primary/5"
        >
          Create Account
        </button>
        <button type="button" onClick={onClose} className="mt-2 min-h-[40px] px-3 text-sm text-muted underline">
          Continue Browsing
        </button>
      </div>
    </Sheet>
  )
}

