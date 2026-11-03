// Port of salon_amenities_section.dart (+ _EditAmenitiesDialog)
import { Accessibility, Baby, BookOpen, CheckCircle2, CircleCheck, Coffee, CreditCard, Loader2, ParkingSquare, PlusCircle, Smartphone, Snowflake, Tv, Wifi, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useAction } from '@/components/feedback'
import { Card, Sheet } from '@/components/ui'
import type { SalonModel } from '@/lib/models'
import { SectionTitleRow } from '../../components/OwnerChrome'
import type { SalonProfileController } from '../useSalonProfile'
import { EditIconButton } from './BasicInfoSection'

export const AVAILABLE_AMENITIES = [
  'WiFi',
  'Parking',
  'Air Conditioning',
  'Credit Cards',
  'Mobile Money',
  'Wheelchair Accessible',
  'Kids Friendly',
  'Refreshments',
  'Magazine/Books',
  'TV',
]

export function amenityIcon(amenity: string): LucideIcon {
  switch (amenity.toLowerCase()) {
    case 'wifi':
      return Wifi
    case 'parking':
      return ParkingSquare
    case 'air conditioning':
      return Snowflake
    case 'credit cards':
      return CreditCard
    case 'mobile money':
      return Smartphone
    case 'wheelchair accessible':
      return Accessibility
    case 'kids friendly':
      return Baby
    case 'refreshments':
      return Coffee
    case 'magazine/books':
      return BookOpen
    case 'tv':
      return Tv
    default:
      return CheckCircle2
  }
}

export default function AmenitiesSection({ salon, ctrl }: { salon: SalonModel; ctrl: SalonProfileController }) {
  const [open, setOpen] = useState(false)
  const current = salon.amenities ?? []
  return (
    <div>
      <SectionTitleRow title="Amenities & Features">
        <EditIconButton label="Edit" onClick={() => setOpen(true)} />
      </SectionTitleRow>
      {current.length === 0 ? (
        <Card className="flex flex-col items-center p-8 text-center">
          <PlusCircle size={48} className="text-primary/50" />
          <p className="mt-4 text-sm text-ink/60">Add amenities to attract more clients</p>
        </Card>
      ) : (
        <Card className="flex flex-wrap gap-2">
          {current.map((a) => {
            const Icon = amenityIcon(a)
            return (
              <span key={a} className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                <Icon size={18} /> {a}
              </span>
            )
          })}
        </Card>
      )}
      {open && <EditAmenitiesDialog salon={salon} ctrl={ctrl} onClose={() => setOpen(false)} />}
    </div>
  )
}

function EditAmenitiesDialog({ salon, ctrl, onClose }: { salon: SalonModel; ctrl: SalonProfileController; onClose: () => void }) {
  const save = useAction(ctrl.updateAmenities, { success: 'Amenities updated!', error: 'Failed to update amenities', onSuccess: onClose })
  const [selected, setSelected] = useState<string[]>(() => [...(salon.amenities ?? [])])

  const toggle = (a: string, on: boolean) => setSelected((s) => (on ? [...s, a] : s.filter((x) => x !== a)))

  return (
    <Sheet open onClose={() => !save.pending && onClose()} title="Select Amenities">
      <p className="mb-4 text-sm text-ink/70">Select all that apply to your salon</p>
      <div className="grid gap-1 sm:grid-cols-2">
        {AVAILABLE_AMENITIES.map((a) => {
          const Icon = amenityIcon(a)
          return (
            <label key={a} className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2.5 hover:bg-inset">
              <input type="checkbox" checked={selected.includes(a)} onChange={(e) => toggle(a, e.target.checked)} className="h-5 w-5 accent-primary" />
              <Icon size={20} className="text-primary" />
              <span className="text-[15px] text-ink">{a}</span>
            </label>
          )
        })}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-primary/10 p-3 text-[12.5px] text-ink">
        <CircleCheck size={20} className="text-primary" />
        {selected.length} amenities selected
      </div>
      <button
        onClick={() => void save.run(selected)}
        disabled={save.pending}
        aria-busy={save.pending || undefined}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-70"
      >
        {save.pending && <Loader2 size={18} className="animate-spin" />}
        {save.pending ? 'Saving…' : 'Save Amenities'}
      </button>
    </Sheet>
  )
}
