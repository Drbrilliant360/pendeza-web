// Port of AdminBloc (admin_bloc.dart): one shared store provided by the admin shell
// (BlocProvider(create: sl<AdminBloc>()..add(LoadAdminData()))).
// AdminLoading / AdminLoaded / AdminError map to `status`. Like the bloc, an error that
// happens while data is already loaded keeps the loaded data (the bloc re-emits the
// previous state) – we surface it as a friendly snackbar instead of a flash.
// Reloads while data is already on screen keep it visible and set `refreshing` instead of
// flashing skeletons. Mutations throw on failure so screens can wire them with useAction
// (pending state + success toast + friendly error toast).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFeedback } from '@/components/feedback'
import type { AppointmentModel, SalonModel, UserModel } from '@/lib/models'
import * as api from './api'
import type { PromotionModel } from './api'

export interface AdminData {
  users: UserModel[]
  salons: SalonModel[]
  promotions: PromotionModel[]
  appointments: AppointmentModel[]
  serviceNames: Record<string, string>
}
export type AdminStatus = 'initial' | 'loading' | 'loaded' | 'error'

interface AdminCtx {
  status: AdminStatus
  data: AdminData | null
  /** Raw load error (render with AdminErrorState, which turns it into friendly text). */
  error: unknown
  /** A reload is running while data is already shown. */
  refreshing: boolean
  loadAdminData: () => Promise<void>
  loadAllAppointments: (limit?: number) => Promise<void>
  updateUserRole: (uid: string, role: string) => Promise<void>
  addPromotion: (p: PromotionModel, image?: Blob | null, onProgress?: (pct: number) => void) => Promise<void>
  updatePromotion: (p: PromotionModel, image?: Blob | null, onProgress?: (pct: number) => void) => Promise<void>
  deletePromotion: (id: string) => Promise<void>
  approveSalon: (salonId: string) => Promise<void>
  rejectSalon: (salonId: string, reason: string) => Promise<void>
}
const Ctx = createContext<AdminCtx | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const { toastError } = useFeedback()
  const [status, setStatus] = useState<AdminStatus>('initial')
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [refreshing, setRefreshing] = useState(false)
  const dataRef = useRef<AdminData | null>(null)
  dataRef.current = data

  /** Start a load: skeletons the first time, a refresh indicator afterwards. */
  const begin = useCallback(() => {
    if (dataRef.current) setRefreshing(true)
    else setStatus('loading')
  }, [])

  const fail = useCallback(
    (e: unknown, fallback: string, retry: () => void) => {
      setRefreshing(false)
      if (dataRef.current) {
        setStatus('loaded')
        toastError(e, fallback, retry)
      } else {
        setError(e)
        setStatus('error')
      }
    },
    [toastError],
  )

  const loadAdminData = useCallback(async () => {
    begin()
    try {
      const [users, salons, promotions, appointments] = await Promise.all([
        api.getAllUsers(),
        api.getAllSalons(),
        api.getPlatformPromotions(),
        api.getAllAppointments(),
      ])
      setData({ users, salons, promotions, appointments, serviceNames: dataRef.current?.serviceNames ?? {} })
      setError(null)
      setStatus('loaded')
      setRefreshing(false)
    } catch (e) {
      console.error('Failed to load admin data', e)
      fail(e, 'Could not load admin data', () => void loadAdminData())
    }
  }, [begin, fail])

  const loadAllAppointments = useCallback(
    async (limit = 200) => {
      begin()
      try {
        const appointments = await api.getAllAppointments(limit)
        let users = dataRef.current?.users ?? []
        let salons = dataRef.current?.salons ?? []
        if (users.length === 0) users = await api.getAllUsers()
        if (salons.length === 0) salons = await api.getAllSalons()
        const serviceNames = await api.getServiceNamesByIds(appointments.flatMap((a) => a.serviceIds))
        setData((d) => ({ promotions: d?.promotions ?? [], users, salons, appointments, serviceNames }))
        setError(null)
        setStatus('loaded')
        setRefreshing(false)
      } catch (e) {
        console.error('Failed to load appointments', e)
        fail(e, 'Could not load bookings', () => void loadAllAppointments(limit))
      }
    },
    [begin, fail],
  )

  const updateUserRole = useCallback(
    async (uid: string, role: string) => {
      await api.updateUserRole(uid, role)
      await loadAdminData()
    },
    [loadAdminData],
  )

  const savePromotion = useCallback(
    async (p: PromotionModel, image: Blob | null | undefined, isNew: boolean, onProgress?: (pct: number) => void) => {
      let imageUrl = p.imageUrl
      if (image) imageUrl = await api.uploadPromotionImage(image, onProgress)
      const promo = { ...p, imageUrl }
      if (isNew) await api.addPromotion(promo)
      else await api.updatePromotion(promo)
      await loadAdminData()
    },
    [loadAdminData],
  )

  const deletePromotion = useCallback(
    async (id: string) => {
      await api.deletePromotion(id)
      await loadAdminData()
    },
    [loadAdminData],
  )

  const approveSalon = useCallback(
    async (salonId: string) => {
      await api.approveSalon(salonId)
      await api.notifySalonOwner(salonId, (name) => ({
        title: 'Salon Approved! 🎉',
        body: `${name} has been approved and is now visible to clients.`,
        actionRoute: '/owner/home',
      }))
      await loadAdminData()
    },
    [loadAdminData],
  )

  const rejectSalon = useCallback(
    async (salonId: string, reason: string) => {
      await api.rejectSalon(salonId, reason)
      await api.notifySalonOwner(salonId, (name) => ({
        title: 'Salon Action Required',
        body: `${name} was not approved. Reason: ${reason}`,
        actionRoute: '/owner/salon-profile',
      }))
      await loadAdminData()
    },
    [loadAdminData],
  )

  useEffect(() => {
    void loadAdminData()
  }, [loadAdminData])

  const value = useMemo<AdminCtx>(
    () => ({
      status,
      data,
      error,
      refreshing,
      loadAdminData,
      loadAllAppointments,
      updateUserRole,
      addPromotion: (p, img, onProgress) => savePromotion(p, img, true, onProgress),
      updatePromotion: (p, img, onProgress) => savePromotion(p, img, false, onProgress),
      deletePromotion,
      approveSalon,
      rejectSalon,
    }),
    [status, data, error, refreshing, loadAdminData, loadAllAppointments, updateUserRole, savePromotion, deletePromotion, approveSalon, rejectSalon],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAdmin() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAdmin outside AdminProvider')
  return c
}

/** BlocBuilder helper: `loaded` is the data only when the state is AdminLoaded. */
export function useAdminState() {
  const a = useAdmin()
  const loaded = a.status === 'loaded' ? a.data : null
  return { ...a, loaded }
}
