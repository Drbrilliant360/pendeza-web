// Route table for this feature group. Owned by the group's port; composed in src/app/router.tsx.
import type { RouteObject } from 'react-router-dom'
import AnalyticsHubScreen from './analytics/AnalyticsHubScreen'
import ClientManagementScreen from './clients/ClientManagementScreen'
import OwnerDashboardScreen from './dashboard/OwnerDashboardScreen'
import CalendarScreen from './schedule/CalendarScreen'
import AddEditServiceScreen from './services/AddEditServiceScreen'
import ServiceListScreen from './services/ServiceListScreen'

/** Routes rendered inside the shell (tab bar / sidebar visible) */
export const ownerShellRoutes: RouteObject[] = [
  { path: '/owner/home', element: <OwnerDashboardScreen /> },
  { path: '/owner/schedule', element: <CalendarScreen /> },
  { path: '/owner/services', element: <ServiceListScreen /> },
  // Service to edit arrives in location.state.service; ?id=<serviceId> keeps edit mode on refresh.
  { path: '/owner/services/add-edit-service', element: <AddEditServiceScreen /> },
  { path: '/owner/clients', element: <ClientManagementScreen /> },
  { path: '/owner/analytics', element: <AnalyticsHubScreen /> },
]

/** Full-screen routes (no tab bar) */
export const ownerRootRoutes: RouteObject[] = []
