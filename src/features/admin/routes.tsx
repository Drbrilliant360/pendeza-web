// Admin route table + shell. Owned by the admin port; composed in src/app/router.tsx.
import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Routes } from '@/app/redirect'
import AdminShell from './AdminShell'
import { AdminLoadingState } from './components/ui'

const AdminDashboardScreen = lazy(() => import('./screens/AdminDashboardScreen'))
const AdminManageUsersScreen = lazy(() => import('./screens/AdminManageUsersScreen'))
const AdminManageSalonsScreen = lazy(() => import('./screens/AdminManageSalonsScreen'))
const AdminManagePromotionsScreen = lazy(() => import('./screens/AdminManagePromotionsScreen'))
const AdminManageNotificationsScreen = lazy(() => import('./screens/AdminManageNotificationsScreen'))
const AdminManageTransactionsScreen = lazy(() => import('./screens/AdminManageTransactionsScreen'))
const AdminManageInspirationScreen = lazy(() => import('./screens/AdminManageInspirationScreen'))

const page = (el: ReactNode) => <Suspense fallback={<div className="pt-20"><AdminLoadingState count={4} /></div>}>{el}</Suspense>

export const adminRoutes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      { path: Routes.adminHome, element: page(<AdminDashboardScreen />) },
      { path: Routes.adminUsers, element: page(<AdminManageUsersScreen />) },
      { path: Routes.adminSalons, element: page(<AdminManageSalonsScreen />) },
      { path: Routes.adminPromotions, element: page(<AdminManagePromotionsScreen />) },
      { path: Routes.adminNotifications, element: page(<AdminManageNotificationsScreen />) },
      { path: Routes.adminTransactions, element: page(<AdminManageTransactionsScreen />) },
      // Not in the admin nav (the app removed the Inspiration tab); reachable by URL only.
      { path: '/admin/inspiration', element: page(<AdminManageInspirationScreen />) },
    ],
  },
]
