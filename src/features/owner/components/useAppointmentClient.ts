import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'
import { appointmentHelpers, type AppointmentModel } from '@/lib/models'
import { getUserDetails } from '../api'

export interface ClientInfo {
  fullName: string
  profilePictureUrl: string | null
  phoneNumber: string | null
}

/**
 * FutureBuilder<UserModel> used by the calendar / dashboard rows: walk-ins resolve to their
 * walkInName (or "Walk-in"); others load users/{clientId} (cached). `undefined` while loading,
 * `null` when the user could not be loaded.
 */
export function useAppointmentClient(appointment: AppointmentModel): ClientInfo | null | undefined {
  const t = useT()
  const walkIn = appointmentHelpers.isWalkIn(appointment)
  const [info, setInfo] = useState<ClientInfo | null | undefined>(undefined)

  useEffect(() => {
    if (walkIn) return
    let alive = true
    setInfo(undefined)
    getUserDetails(appointment.clientId)
      .then((u) => alive && setInfo({ fullName: u.fullName, profilePictureUrl: u.profilePictureUrl, phoneNumber: u.phoneNumber }))
      .catch(() => alive && setInfo(null))
    return () => {
      alive = false
    }
  }, [appointment.clientId, walkIn])

  if (walkIn) {
    return { fullName: appointment.walkInName?.trim() || t('owner.calendar.walk_in_client'), profilePictureUrl: null, phoneNumber: null }
  }
  return info
}
