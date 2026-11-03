// Composition of all route tables (lib/app/config/app_router.dart).
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom'
import MainShell from '@/layouts/MainShell'
import { AppConfig } from '@/lib/config'
import { authRoutes, onboardingRoutes } from '@/features/auth/routes'
import { discoveryRootRoutes, discoveryShellRoutes } from '@/features/discovery/routes'
import { bookingsRootRoutes, bookingsShellRoutes } from '@/features/bookings/routes'
import { ownerRootRoutes, ownerShellRoutes } from '@/features/owner/routes'
import { ownerSalonRootRoutes, ownerSalonShellRoutes } from '@/features/owner-salon/routes'
import { adminRoutes } from '@/features/admin/routes'
import RootGuard from './RootGuard'
import NotFound from './NotFound'
import RouteError from './RouteError'
import { Routes } from './redirect'

// Payments are switched off in the mobile app (AppConfig.paymentsEnabled = false):
// /payment* → client bookings, /client/wallet* → client home, exactly like the app's route redirects.
const disabledPaymentRoutes: RouteObject[] = AppConfig.paymentsEnabled
  ? []
  : [
      { path: '/payment/*', element: <Navigate to={Routes.clientBookings} replace /> },
      { path: '/payment', element: <Navigate to={Routes.clientBookings} replace /> },
    ]
const disabledWalletRoutes: RouteObject[] = AppConfig.paymentsEnabled
  ? []
  : [{ path: '/client/wallet/*', element: <Navigate to={Routes.clientHome} replace /> }]

export const router = createBrowserRouter([
  {
    element: <RootGuard />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: null },
      ...authRoutes,
      ...onboardingRoutes,
      ...discoveryRootRoutes,
      ...bookingsRootRoutes,
      ...ownerRootRoutes,
      ...ownerSalonRootRoutes,
      ...disabledPaymentRoutes,
      ...adminRoutes,
      {
        element: <MainShell />,
        children: [
          ...discoveryShellRoutes,
          ...bookingsShellRoutes,
          ...disabledWalletRoutes,
          ...ownerShellRoutes,
          ...ownerSalonShellRoutes,
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
