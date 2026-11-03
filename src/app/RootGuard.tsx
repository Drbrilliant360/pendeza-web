// Applies computeRedirect on every navigation / auth change (GoRouter redirect + refreshListenable).
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { computeRedirect } from './redirect'
import SplashScreen from './SplashScreen'
import { titleFor } from './titles'

export default function RootGuard() {
  const { status, user } = useAuth()
  const { pathname } = useLocation()
  useEffect(() => {
    const t = titleFor(pathname)
    document.title = t ? `${t} · Pendeza` : 'Pendeza'
  }, [pathname])
  if (status === 'initial') return <SplashScreen />
  if (status === 'loading' && pathname === '/') return <SplashScreen />
  const to = computeRedirect(status, user, pathname)
  if (to && to !== pathname) return <Navigate to={to} replace />
  if (pathname === '/') return <SplashScreen />
  return <Outlet />
}
