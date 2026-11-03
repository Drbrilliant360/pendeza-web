// Route table for this feature group. Owned by the group's port; composed in src/app/router.tsx.
import type { RouteObject } from 'react-router-dom'
import LoginPage from './LoginPage'
import SignupPage from './SignupPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import PhoneAuthPage from './PhoneAuthPage'
import OtpRoute from './OtpPage'
import RoleSelectionPage from './RoleSelectionPage'
import ClientSetupPage from './ClientSetupPage'
import OwnerSetupPage from './OwnerSetupPage'

/** Onboarding routes (role selection → client profile / owner business setup) */
export const onboardingRoutes: RouteObject[] = [
  { path: '/role-selection', element: <RoleSelectionPage /> },
  { path: '/client-setup', element: <ClientSetupPage /> },
  // Business type selection → business details (step 2 is a history entry on the same path)
  { path: '/owner-setup', element: <OwnerSetupPage /> },
]

/** Full-screen routes (no tab bar) */
export const authRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/phone-auth', element: <PhoneAuthPage /> },
  { path: '/otp', element: <OtpRoute /> },
]
