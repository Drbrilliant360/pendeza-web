// Mirrors lib/app/config/app_config.dart
export const AppConfig = {
  appName: 'Pendeza',
  deepLinkDomain: 'https://bpsa-8bde0.web.app',
  /** Payments are disabled in the mobile app (App Store submission); wallet/payment routes redirect away. */
  paymentsEnabled: false,
  salonDeepLink: (salonId: string) => `https://bpsa-8bde0.web.app/salon/${salonId}`,
}
