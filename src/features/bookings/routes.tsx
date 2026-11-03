// Route table for this feature group. Owned by the group's port; composed in src/app/router.tsx.
import type { RouteObject } from 'react-router-dom'
import AppointmentsScreen from './screens/AppointmentsScreen'
import BookingConfirmationScreen from './screens/BookingConfirmationScreen'
import ClientProfileScreen from './screens/ClientProfileScreen'
import EditProfileScreen from './screens/EditProfileScreen'
import HelpSupportScreen from './screens/HelpSupportScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import ServiceSelectionScreen from './screens/ServiceSelectionScreen'
import TimeslotSelectionScreen from './screens/TimeslotSelectionScreen'

/** Routes rendered inside the shell (tab bar / sidebar visible) */
export const bookingsShellRoutes: RouteObject[] = [
  { path: '/client/bookings', element: <AppointmentsScreen /> },
  { path: '/client/profile', element: <ClientProfileScreen /> },
  { path: '/client/notifications', element: <NotificationsScreen /> },
]

/** Full-screen routes (no tab bar) */
export const bookingsRootRoutes: RouteObject[] = [
  { path: '/salon/:salonId/services', element: <ServiceSelectionScreen /> },
  { path: '/salon/:salonId/schedule', element: <TimeslotSelectionScreen /> },
  { path: '/salon/:salonId/confirm', element: <BookingConfirmationScreen /> },
  { path: '/client/edit-profile', element: <EditProfileScreen /> },
  { path: '/help-support', element: <HelpSupportScreen /> },
]
