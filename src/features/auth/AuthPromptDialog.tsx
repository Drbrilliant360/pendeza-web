// Port of features/0_auth/presentation/dialog/auth_prompt_dialog.dart – "Sign In Required"
// dialog for guests. Other feature groups may import it:
//   <AuthPromptDialog open={open} onClose={...} featureName="booking" returnRoute={...} />
import { ArrowRightCircle, LockKeyhole, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthReturnStore } from '@/auth/authReturnStore'
import { Routes } from '@/app/redirect'

function promptMessage(feature: string) {
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

export default function AuthPromptDialog({
  open,
  onClose,
  featureName,
  customMessage,
  icon: Icon = LockKeyhole,
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

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const go = (path: string) => {
    AuthReturnStore.setPending(returnRoute)
    onClose()
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-sm animate-[authPromptIn_300ms_cubic-bezier(0.33,1,0.68,1)] overflow-y-auto rounded-[32px] border-[1.5px] border-primary/10 bg-gradient-to-br from-card to-inset p-6 sm:p-8 text-center shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
        <style>{'@keyframes authPromptIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}'}</style>
        <div className="mx-auto grid w-fit place-items-center rounded-full bg-brand-gradient p-5 text-white shadow-[0_8px_20px_rgba(108,92,231,0.4)]">
          <Icon size={48} />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-ink">Sign In Required</h2>
        <p className="mt-3 text-sm text-ink/70">{customMessage ?? promptMessage(featureName)}</p>
        <button
          type="button"
          onClick={() => go(Routes.login)}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-white transition hover:bg-primary-dark"
        >
          <ArrowRightCircle size={20} />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => go(Routes.signup)}
          className="mt-3 w-full rounded-2xl border-[1.5px] border-primary/30 py-4 text-base font-semibold text-ink transition hover:bg-primary/5"
        >
          Create Account
        </button>
        <button type="button" onClick={onClose} className="mt-2 min-h-[40px] px-3 text-sm text-muted underline decoration-ink/50 hover:text-ink/70">
          Continue Browsing
        </button>
      </div>
    </div>
  )
}
