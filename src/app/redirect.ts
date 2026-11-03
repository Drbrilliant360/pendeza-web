// Exact port of AppRouter.redirect in lib/app/config/app_router.dart.
import type { AuthStatus } from '@/auth/AuthContext'
import { AuthReturnStore } from '@/auth/authReturnStore'
import type { UserModel } from '@/lib/models'

export const Routes = {
  splash: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  phoneAuth: '/phone-auth',
  otp: '/otp',
  roleSelection: '/role-selection',
  clientSetup: '/client-setup',
  ownerSetup: '/owner-setup',

  clientHome: '/client/home',
  clientDiscover: '/client/discover',
  clientBookings: '/client/bookings',
  clientProfile: '/client/profile',
  clientFavorites: '/client/favorites',
  editProfile: '/client/edit-profile',
  clientNotifications: '/client/notifications',
  clientCategories: '/client/categories',
  clientWallet: '/client/wallet',
  walletHistory: '/client/wallet/history',

  salonDetail: (id: string) => `/salon/${id}`,
  salonGallery: (id: string) => `/salon/${id}/gallery`,
  serviceSelection: (id: string) => `/salon/${id}/services`,
  timeslotSelection: (id: string) => `/salon/${id}/schedule`,
  bookingConfirmation: (id: string) => `/salon/${id}/confirm`,
  writeReview: (id: string) => `/salon/${id}/review`,
  salonReviews: (id: string) => `/salon/${id}/reviews`,

  paymentSelection: '/payment',
  paymentReceipt: '/payment/receipt',
  helpSupport: '/help-support',

  ownerHome: '/owner/home',
  ownerSchedule: '/owner/schedule',
  ownerServices: '/owner/services',
  ownerAddEditService: '/owner/services/add-edit-service',
  ownerClients: '/owner/clients',
  ownerInspiration: '/owner/inspiration',
  ownerAnalytics: '/owner/analytics',
  ownerProfile: '/owner/profile',
  ownerSalonProfile: '/owner/salon-profile',

  adminHome: '/admin/home',
  adminUsers: '/admin/users',
  adminSalons: '/admin/salons',
  adminPromotions: '/admin/promotions',
  adminNotifications: '/admin/notifications',
  adminTransactions: '/admin/transactions',
} as const

const LOGIN_PATHS = new Set<string>([Routes.login, Routes.signup, Routes.forgotPassword, Routes.phoneAuth, Routes.otp])
const ONBOARDING_PATHS = new Set<string>([Routes.roleSelection, Routes.clientSetup, Routes.ownerSetup])

export function computeRedirect(status: AuthStatus, user: UserModel | null, path: string): string | null {
  const loc = path.length > 1 ? path.replace(/\/+$/, '') : path
  const loggingIn = LOGIN_PATHS.has(loc)
  const onboarding = ONBOARDING_PATHS.has(loc)
  const splashing = loc === Routes.splash
  const isAdminArea = loc.startsWith('/admin')
  const isClientArea = loc.startsWith('/client')
  const isSalonArea = loc.startsWith('/salon')

  if (status === 'initial' || status === 'loading') return null

  if (status === 'guest') {
    if (splashing) return Routes.clientHome
    if (loggingIn || onboarding) return null
    AuthReturnStore.clear()
    if (isClientArea || isSalonArea || loc === Routes.helpSupport) return null
    return Routes.clientHome
  }
  if (status === 'authRequired') return loggingIn ? null : Routes.login
  if (status === 'roleSelection') return loc === Routes.roleSelection ? null : Routes.roleSelection
  if (status === 'clientSetup') return loc === Routes.clientSetup ? null : Routes.clientSetup
  if (status === 'ownerSetup') return loc === Routes.ownerSetup ? null : Routes.ownerSetup

  if (status === 'authenticated' && user) {
    const role = user.role
    if (role === 'admin') {
      if (loggingIn || onboarding || splashing) {
        AuthReturnStore.clear()
        return Routes.adminHome
      }
      return isAdminArea ? null : Routes.adminHome
    }
    if (isAdminArea) return role === 'owner' ? Routes.ownerHome : Routes.clientHome
    if (loggingIn || onboarding || splashing) {
      if (role === 'owner') {
        AuthReturnStore.clear()
        return Routes.ownerHome
      }
      return AuthReturnStore.consume() ?? Routes.clientHome
    }
    AuthReturnStore.complete()
    return null
  }
  return null
}
