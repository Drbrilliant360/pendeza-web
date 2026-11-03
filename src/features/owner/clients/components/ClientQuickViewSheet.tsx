// Port of clients/presentation/widgets/client_quick_view_bottom_sheet.dart
import { Calendar, Clock, Copy, Phone } from 'lucide-react'
import { useFeedback } from '@/components/feedback'
import { Avatar, Sheet } from '@/components/ui'
import { lastVisitFormatted, type RegularClient } from '../../api'

export default function ClientQuickViewSheet({ client, onClose }: { client: RegularClient | null; onClose: () => void }) {
  const { toast, toastSuccess } = useFeedback()
  if (!client) return null

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(client.phone ?? '')
      toastSuccess('Phone number copied')
    } catch {
      toast("Couldn't copy automatically. Select the number and copy it instead.", 'error')
    }
  }

  return (
    <Sheet open onClose={onClose}>
      <div className="flex flex-col items-center pt-3 text-center">
        <div className="rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-[3px]">
          <Avatar url={client.photoUrl} name={client.name} size={96} />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-ink">{client.name}</h2>
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary dark:text-primary-light">
            <Calendar size={16} />
            {client.visitCount} visits
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-inset px-4 py-2 text-sm font-semibold text-ink/70">
            <Clock size={16} />
            {lastVisitFormatted(client)}
          </span>
        </div>
      </div>

      {client.phone != null && (
        <div className="mt-8 flex items-center gap-4 rounded-2xl bg-inset p-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Phone size={20} fill="currentColor" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted">Phone Number</p>
            <a href={`tel:${client.phone}`} className="text-sm font-semibold text-ink hover:text-primary">
              {client.phone}
            </a>
          </div>
          <button onClick={() => void copyPhone()} title="Copy" aria-label="Copy" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-card">
            <Copy size={20} />
          </button>
        </div>
      )}

      <button onClick={onClose} className="mt-6 h-14 w-full rounded-2xl bg-primary text-sm font-bold text-white hover:bg-primary-dark">
        Close
      </button>
    </Sheet>
  )
}
