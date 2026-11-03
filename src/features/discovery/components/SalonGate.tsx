// Ports of SalonDeepLinkResolver (variant="detail") and _SalonFetchWrapper (variant="wrapper")
// from app_router.dart: use the salon passed in navigation state, else fetch by id.
import { ArrowLeft, Compass, RefreshCw, Store } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import { Spinner } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import { useSalon } from '@/lib/hooks'
import type { SalonModel } from '@/lib/models'

export default function SalonGate({ variant, children }: { variant: 'detail' | 'wrapper'; children: (salon: SalonModel) => ReactNode }) {
  const { salonId } = useParams()
  const navigate = useNavigate()
  const { salon, loading, error, reload } = useSalon(salonId)
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(Routes.clientDiscover))

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page">
        <Spinner />
        {variant === 'detail' && <p className="text-sm text-ink/60">Loading salon details...</p>}
      </div>
    )
  }

  if (error || !salon) {
    return (
      <div className="min-h-screen bg-page">
        <header className="flex h-14 items-center gap-2 px-2">
          <button onClick={back} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-inset">
            <ArrowLeft size={22} />
          </button>
          {variant === 'detail' && <h1 className="text-lg font-semibold text-ink">Salon Not Found</h1>}
        </header>
        <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-24 text-center">
          {variant === 'detail' ? (
            <>
              <Store size={64} className="text-ink/30" />
              <p className="mt-4 text-base font-semibold text-ink">Could not load salon details</p>
              <p className="mt-2 text-sm text-ink/60">
                {error ? friendlyError(error, 'The salon may have been removed or is temporarily unavailable.').message : 'The salon may have been removed or is temporarily unavailable.'}
              </p>
              {error && friendlyError(error).hint && <p className="mt-1 text-xs text-ink/50">{friendlyError(error).hint}</p>}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button onClick={() => void reload()} className="flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-primary hover:bg-inset">
                  <RefreshCw size={18} /> Retry
                </button>
                <button
                  onClick={() => navigate(Routes.clientDiscover)}
                  className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  <Compass size={18} /> Discover Salons
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-base text-ink">Could not load salon details</p>
              <button onClick={back} className="mt-4 h-11 rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-dark">
                Go Back
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return <>{children(salon)}</>
}
