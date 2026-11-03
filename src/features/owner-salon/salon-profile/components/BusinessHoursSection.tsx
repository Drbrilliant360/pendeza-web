// Port of salon_business_hours_section.dart + dialogs/edit_hours_dialog.dart
import { Clock } from 'lucide-react'
import { useState } from 'react'
import { useAction } from '@/components/feedback'
import { Card, PrimaryButton, Sheet, cx } from '@/components/ui'
import type { SalonModel } from '@/lib/models'
import { InfoNote, SectionTitleRow } from '../../components/OwnerChrome'
import type { SalonProfileController } from '../useSalonProfile'
import { EditIconButton } from './BasicInfoSection'

export default function BusinessHoursSection({ salon, ctrl }: { salon: SalonModel; ctrl: SalonProfileController }) {
  const [open, setOpen] = useState(false)
  const has = salon.openingTime != null && salon.closingTime != null
  const hours = has ? `${salon.openingTime} - ${salon.closingTime}` : 'Not set'
  return (
    <div>
      <SectionTitleRow title="Business Hours">
        <EditIconButton label="Edit" onClick={() => setOpen(true)} />
      </SectionTitleRow>
      <Card>
        <DayRow day="Monday - Friday" time={hours} closed={!has} />
        <hr className="my-3 border-line/60" />
        <DayRow day="Saturday" time={hours} closed={!has} />
        <hr className="my-3 border-line/60" />
        <DayRow day="Sunday" time="Closed" closed />
      </Card>
      {open && <EditHoursDialog salon={salon} ctrl={ctrl} onClose={() => setOpen(false)} />}
    </div>
  )
}

function DayRow({ day, time, closed }: { day: string; time: string; closed: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px] font-medium text-ink">{day}</span>
      <span className={cx('text-[15px] font-bold', closed ? 'text-danger' : 'text-primary')}>{time}</span>
    </div>
  )
}

const valid = (t: string) => /^\d{1,2}:\d{2}$/.test(t)

function EditHoursDialog({ salon, ctrl, onClose }: { salon: SalonModel; ctrl: SalonProfileController; onClose: () => void }) {
  const save = useAction(ctrl.updateBusinessHours, { success: 'Business hours updated!', error: 'Failed to update business hours', onSuccess: onClose })
  const pad = (t: string) => t.split(':').map((p) => p.padStart(2, '0')).join(':')
  const [opening, setOpening] = useState(pad(salon.openingTime && valid(salon.openingTime) ? salon.openingTime : '08:00'))
  const [closing, setClosing] = useState(pad(salon.closingTime && valid(salon.closingTime) ? salon.closingTime : '20:00'))

  return (
    <Sheet open onClose={() => !save.pending && onClose()} title="Business Hours">
      <div className="space-y-5">
        <TimeField label="Opening Time" value={opening} onChange={setOpening} />
        <TimeField label="Closing Time" value={closing} onChange={setClosing} />
        <InfoNote>These hours will be visible to all clients</InfoNote>
        <PrimaryButton onClick={() => void save.run(opening, closing)} loading={save.pending} disabled={!valid(opening) || !valid(closing)}>
          Save Hours
        </PrimaryButton>
      </div>
    </Sheet>
  )
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      <span className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 focus-within:border-primary">
        <Clock size={22} className="text-primary" />
        <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent text-[16px] font-medium text-ink outline-none" />
      </span>
    </label>
  )
}
