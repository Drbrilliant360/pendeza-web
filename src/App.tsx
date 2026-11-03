import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { FeedbackProvider } from '@/components/feedback'
import OfflineBanner from '@/components/OfflineBanner'
import { BookingProvider } from '@/features/bookings/BookingContext'
import { I18nProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'
import { router } from './app/router'

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <FeedbackProvider>
          <OfflineBanner />
          <AuthProvider>
            <BookingProvider>
              <RouterProvider router={router} />
            </BookingProvider>
          </AuthProvider>
        </FeedbackProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
