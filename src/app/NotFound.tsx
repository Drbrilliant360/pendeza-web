import { SearchX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState icon={SearchX} title="Page Not Found" message="The page you are looking for doesn't exist." actionLabel="Go Home" onAction={() => navigate('/')} />
    </div>
  )
}
