# Pendeza Web

React + TypeScript + Tailwind port of the Pendeza Flutter app
(`afrinovacompany/pendeza-mobile-application`). It talks to the **same Firebase project**
(`bpsa-8bde0`): Auth, Firestore, Storage and Cloud Functions. Web and mobile users therefore share
accounts, salons, bookings, reviews and notifications.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
```

The Firebase web config is taken from the app's `lib/firebase_options.dart`. To point at another
project, copy `.env.example` to `.env` and fill in the values.

**Firebase console checklist for web**
- Authentication → Settings → Authorized domains: add your web domain (localhost is allowed by default).
- Authentication → Sign-in method: Email/Password and Google must be enabled (they already are for mobile).
- Phone login uses the `request_briq_otp` / `verify_briq_otp` callable functions (us-central1). If App Check
  enforcement is on for those functions, register a reCAPTCHA provider for the web app.
- Storage CORS must allow your web origin for uploads and downloads.

## How it maps to the Flutter app

| Flutter (`lib/`) | Web (`src/`) |
| --- | --- |
| `app/config/app_router.dart` (GoRouter + redirect) | `app/router.tsx`, `app/redirect.ts`, `app/RootGuard.tsx` |
| `features/0_auth` AuthBloc / AuthService | `auth/AuthContext.tsx` (same states: guest → role → setup → authenticated) |
| `app/services/firestore_service.dart` + models | `lib/firestore.ts`, `lib/models.ts` |
| `shared/widgets/client_ui.dart` | `components/ui.tsx` |
| `screens/main_screen.dart` (client/owner tabs) | `layouts/MainShell.tsx` (bottom tabs on mobile, sidebar on desktop) |
| easy_localization (`assets/language`) | `lib/i18n.tsx` + `public/language/{en,sw}.json` |
| ThemeCubit | `lib/theme.tsx` (system/light/dark) |
| `features/0_auth`, `1_onboarding` | `features/auth` |
| `2_client_dashboard`, `2_client_discovery`, `2_client_favorites`, `3_reviews`, `video_shorts` | `features/discovery` |
| `2_client_booking`, `2_client_appointments`, `2_client_notifications`, `2_client_profile`, help & support | `features/bookings` |
| `3_owner_management` (dashboard, calendar, services, clients), `3_owner_analytics` | `features/owner` |
| `3_owner_management` (salon profile, promotions), `3_owner_inspiration`, `3_owner_profile_screen` | `features/owner-salon` |
| `5_admin_panel` | `features/admin` |

Each feature folder owns its `routes.tsx`. Routes in `*ShellRoutes` render inside the tab shell, and
routes in `*RootRoutes` render full-screen, mirroring the app's shell vs root navigator.

## Not ported (intentionally)
- **Wallet & payments**: switched off in the app (`AppConfig.paymentsEnabled = false`). The `/payment*` and
  `/client/wallet*` routes redirect the same way the app does.
- **Native-only features**: push notifications (FCM), Apple Sign-In (iOS only in the app), haptics,
  in-app review, video compression and the app-update checker.
