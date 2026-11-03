// Route table for this feature group. Owned by the group's port; composed in src/app/router.tsx.
import type { RouteObject } from 'react-router-dom'
import OwnerProfileScreen from './OwnerProfileScreen'
import EditOwnerProfileScreen from './EditOwnerProfileScreen'
import NotificationsSettingsScreen from './NotificationsSettingsScreen'
import SalonProfileScreen from './salon-profile/SalonProfileScreen'
import InspirationScreen from './inspiration/InspirationScreen'
import ArticleDetailsScreen from './inspiration/ArticleDetailsScreen'
import OwnerPromotionsListScreen from './promotions/OwnerPromotionsListScreen'
import CreatePromotionScreen from './promotions/CreatePromotionScreen'
import { OwnerSalonRoutes } from './paths'

/** Routes rendered inside the shell (tab bar / sidebar visible) */
export const ownerSalonShellRoutes: RouteObject[] = [
  { path: OwnerSalonRoutes.profile, element: <OwnerProfileScreen /> },
  { path: OwnerSalonRoutes.editProfile, element: <EditOwnerProfileScreen /> },
  { path: OwnerSalonRoutes.notificationSettings, element: <NotificationsSettingsScreen /> },
  { path: OwnerSalonRoutes.salonProfile, element: <SalonProfileScreen /> },
  { path: OwnerSalonRoutes.inspiration, element: <InspirationScreen /> },
  { path: '/owner/inspiration/:articleId', element: <ArticleDetailsScreen /> },
  { path: OwnerSalonRoutes.promotions, element: <OwnerPromotionsListScreen /> },
  { path: OwnerSalonRoutes.createPromotion, element: <CreatePromotionScreen /> },
]

/** Full-screen routes (no tab bar) */
export const ownerSalonRootRoutes: RouteObject[] = []
