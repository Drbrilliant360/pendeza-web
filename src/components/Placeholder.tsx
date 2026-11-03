import { Construction } from 'lucide-react'
import { EmptyState, Screen } from './ui'
/** Temporary stand-in used while a screen is being ported. */
export default function Placeholder({ name }: { name: string }) {
  return (
    <Screen>
      <EmptyState icon={Construction} title={name} message="This screen is being ported from the mobile app." />
    </Screen>
  )
}
