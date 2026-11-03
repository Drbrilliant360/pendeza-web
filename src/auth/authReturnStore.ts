// Port of features/0_auth/presentation/auth_return_store.dart – remembers the booking step a
// guest was on when asked to sign in, so they land back there afterwards.
let pendingRoute: string | null = null
let consumed = false
let consumedRoute: string | null = null

export const AuthReturnStore = {
  isSafeReturnRoute(route: string) {
    if (route.includes('://') || route.includes('..') || route.includes('?')) return false
    return /^\/salon\/[^/]+\/(services|schedule|confirm)$/.test(route)
  },
  setPending(route?: string | null) {
    if (route && AuthReturnStore.isSafeReturnRoute(route)) {
      pendingRoute = route
      consumed = false
      consumedRoute = null
    }
  },
  clear() {
    pendingRoute = null
    consumed = false
    consumedRoute = null
  },
  complete() {
    consumed = false
    consumedRoute = null
  },
  peek: () => pendingRoute ?? (consumed ? consumedRoute : null),
  consume() {
    if (consumed) return consumedRoute
    consumedRoute = pendingRoute
    pendingRoute = null
    consumed = true
    return consumedRoute
  },
}
