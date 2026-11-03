// Port of clients/presentation/widgets/regular_clients_section.dart
import { Star } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { lastVisitFormatted, type RegularClient } from '../../api'

export default function RegularClientsSection({ clients, onSelect }: { clients: RegularClient[]; onSelect: (c: RegularClient) => void }) {
  const t = useT()
  return (
    <div>
      <div className="flex items-center gap-2 px-5">
        <Star size={20} className="text-accent" fill="currentColor" />
        <h2 className="t-title">{t('owner.clients.regulars_title')}</h2>
      </div>
      <div className="no-scrollbar mt-4 flex overflow-x-auto px-4">
        {clients.map((c) => (
          <button key={c.id} type="button" onClick={() => onSelect(c)} className="flex w-[87px] shrink-0 flex-col items-center px-1.5">
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-primary to-accent p-[3px]">
                <div className="rounded-full bg-card p-0.5">
                  <Avatar url={c.photoUrl} name={c.name} size={56} />
                </div>
              </div>
              <span className="absolute bottom-0 right-0 rounded-[10px] border-2 border-card bg-gradient-to-r from-primary to-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                {c.visitCount}
              </span>
            </div>
            <span className="mt-1.5 w-full truncate text-center text-xs font-semibold text-ink">{c.name.split(' ')[0]}</span>
            <span className="w-full truncate text-center text-[10px] text-muted">{lastVisitFormatted(c)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
