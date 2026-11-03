// Paths owned by the owner-salon group (in addition to Routes.ownerProfile / ownerSalonProfile / ownerInspiration).
export const OwnerSalonRoutes = {
  profile: '/owner/profile',
  salonProfile: '/owner/salon-profile',
  inspiration: '/owner/inspiration',
  article: (id: string) => `/owner/inspiration/${id}`,
  promotions: '/owner/promotions',
  createPromotion: '/owner/promotions/create',
  editProfile: '/owner/edit-profile',
  notificationSettings: '/owner/notification-settings',
} as const
