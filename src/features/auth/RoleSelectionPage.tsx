// Port of features/1_onboarding/presentation/screens/role_selection_screen.dart (+ widgets/role_card.dart)
import { Building2, ChevronRight, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { useFeedback } from '@/components/feedback'
import { cx } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { AuthHeader, AuthScaffold } from './chrome'

export default function RoleSelectionPage() {
  const t = useT()
  const { toastError, confirm } = useFeedback()
  const { status, selectRole, signOut, user } = useAuth()
  const [busy, setBusy] = useState(false)
  const isLoading = busy || status === 'loading'

  const [signingOut, setSigningOut] = useState(false)
  const [chosen, setChosen] = useState<'client' | 'owner' | null>(null)

  const choose = async (role: 'client' | 'owner') => {
    if (busy) return
    setChosen(role)
    setBusy(true)
    try {
      await selectRole(role)
    } catch (e) {
      toastError(e, "Couldn't save your choice", () => void choose(role))
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    if (signingOut) return
    const ok = await confirm({
      title: 'Sign out?',
      message: user?.email ? `You'll be signed out of ${user.email}.` : "You'll need to sign in again to continue.",
      confirmText: 'Sign out',
      destructive: true,
    })
    if (!ok) return
    setSigningOut(true)
    try {
      await signOut()
    } catch (e) {
      toastError(e, "Couldn't sign out")
      setSigningOut(false)
    }
  }

  const loadingMessage = busy && chosen ? (chosen === 'owner' ? 'Setting up your business account…' : 'Setting up your account…') : t('common.loading')

  return (
    <AuthScaffold isLoading={isLoading || signingOut} loadingMessage={signingOut ? 'Signing out…' : loadingMessage}>
      <AuthHeader title={t('auth.role.title')} subtitle={t('auth.role.subtitle')} />
      <div className="h-8" />
      <RoleCard
        icon={Users}
        title={t('auth.role.client_title')}
        subtitle={t('auth.role.client_desc')}
        onClick={isLoading ? undefined : () => choose('client')}
      />
      <div className="h-6" />
      <RoleCard
        icon={Building2}
        title={t('auth.role.owner_title')}
        subtitle={t('auth.role.owner_desc')}
        onClick={isLoading ? undefined : () => choose('owner')}
      />
      {/* Web addition: a way out for a signed-in user who hasn't picked a role yet. */}
      <p className="t-caption mt-8 text-center">
        {user?.email ? `${user.email} · ` : ''}
        <button type="button" disabled={signingOut || isLoading} onClick={() => void leave()} className="min-h-[40px] px-1 font-semibold text-primary hover:underline disabled:opacity-50">
          Sign out
        </button>
      </p>
    </AuthScaffold>
  )
}

function RoleCard({ icon: Icon, title, subtitle, onClick }: { icon: LucideIcon; title: string; subtitle: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={cx(
        'flex w-full items-center rounded-[20px] border border-line/60 bg-card px-4 py-6 text-left shadow-md1 transition dark:border-line dark:shadow-none',
        onClick ? 'hover:border-primary/40 active:scale-[0.99]' : 'opacity-60',
      )}
    >
      <div className="grid shrink-0 place-items-center rounded-full bg-primary/10 p-4 text-primary">
        <Icon size={32} fill="currentColor" strokeWidth={1.5} />
      </div>
      <div className="ml-6 min-w-0 flex-1">
        <h3 className="text-xl font-bold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-ink/70">{subtitle}</p>
      </div>
      <ChevronRight size={20} className="ml-3 shrink-0 text-ink/40" />
    </button>
  )
}
