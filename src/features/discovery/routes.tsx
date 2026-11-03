// Route table for this feature group. Owned by the group's port; composed in src/app/router.tsx.
import type { RouteObject } from 'react-router-dom'
import CategoryListScreen from './screens/CategoryListScreen'
import ClientDashboardScreen from './screens/ClientDashboardScreen'
import DiscoveryScreen from './screens/DiscoveryScreen'
import FavoritesScreen from './screens/FavoritesScreen'
import ReviewsRoute from './screens/ReviewsScreen'
import SalonDetailRoute from './screens/SalonDetailScreen'
import SalonGalleryRoute from './screens/SalonGalleryScreen'
import WriteReviewRoute from './screens/WriteReviewScreen'

/** Routes rendered inside the shell (tab bar / sidebar visible) */
export const discoveryShellRoutes: RouteObject[] = [
  { path: '/client/home', element: <ClientDashboardScreen /> },
  { path: '/client/discover', element: <DiscoveryScreen /> },
  { path: '/client/favorites', element: <FavoritesScreen /> },
  { path: '/client/categories', element: <CategoryListScreen /> },
]

/** Full-screen routes (no tab bar) */
export const discoveryRootRoutes: RouteObject[] = [
  { path: '/salon/:salonId', element: <SalonDetailRoute /> },
  { path: '/salon/:salonId/gallery', element: <SalonGalleryRoute /> },
  { path: '/salon/:salonId/reviews', element: <ReviewsRoute /> },
  { path: '/salon/:salonId/review', element: <WriteReviewRoute /> },
]
