// Friendly crash screen (replaces React Router's developer error page).
import { Home } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ErrorState, SecondaryButton } from '@/components/ui'
import { friendlyError } from '@/lib/errors'

export default function RouteError() {
  const err = useRouteError()
  console.error(err)
  const notFound = isRouteErrorResponse(err) && err.status === 404
  // A failed lazy-chunk load usually means a new version was deployed.
  const staleBuild = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String((err as Error)?.message ?? ''))
  const f = friendlyError(err)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4">
      <ErrorState
        title={notFound ? 'Page not found' : staleBuild ? 'A new version is available' : 'Something went wrong'}
        message={notFound ? "The page you're looking for doesn't exist." : staleBuild ? 'Pendeza was updated while you were using it.' : f.message}
        hint={staleBuild ? 'Reload the page to get the latest version.' : 'Reloading the page usually fixes this. Your data is safe.'}
        offline={f.code === 'network'}
        onRetry={() => window.location.reload()}
      />
      <SecondaryButton icon={Home} onClick={() => window.location.assign('/')}>Go to home</SecondaryButton>
      
    </div>
  )
}
