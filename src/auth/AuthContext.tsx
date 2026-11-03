// Port of features/0_auth (AuthBloc + AuthRepositoryImpl + AuthService).
// The status machine and onboarding rules are identical to the mobile app:
//   no Firebase user            → 'guest' (browse as client)
//   admin                       → 'authenticated'
//   role == null                → 'roleSelection'
//   client w/o name/phone/gender→ 'clientSetup'
//   owner w/o salon             → 'ownerSetup'
//   otherwise                   → 'authenticated'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { friendlyError } from '@/lib/errors'
import { auth, functions } from '@/lib/firebase'
import * as fs from '@/lib/firestore'
import { guestUser, hasCompleteMandatoryFields, isAdmin, type Gender, type UserModel } from '@/lib/models'
import { AuthReturnStore } from './authReturnStore'

export type AuthStatus =
  | 'initial'
  | 'loading'
  | 'guest'
  | 'authRequired'
  | 'roleSelection'
  | 'clientSetup'
  | 'ownerSetup'
  | 'authenticated'

export interface AuthRequired {
  triggeredBy: string
  returnRoute?: string
}

export interface AuthContextValue {
  status: AuthStatus
  /** Firestore profile (or guest user) */
  user: UserModel | null
  firebaseUser: User | null
  authRequired: AuthRequired | null
  isGuest: boolean
  isAdmin: boolean
  // actions (throw AuthError with a friendly message on failure)
  signIn: (email: string, password: string) => Promise<void>
  signUp: (fullName: string, email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  requestPhoneOtp: (phoneNumber: string) => Promise<string>
  verifyPhoneOtp: (sessionId: string, code: string, phoneNumber?: string) => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  selectRole: (role: 'client' | 'owner') => Promise<void>
  completeClientProfile: (p: { fullName: string; phoneNumber: string; gender: Gender; profilePictureUrl?: string | null }) => Promise<void>
  completeOwnerProfile: (p: {
    salonName: string
    address: string
    serviceCategories: string[]
    businessTypeIds?: string[]
    businessTypeNames?: string[]
    region?: string | null
    district?: string | null
  }) => Promise<void>
  /** Guest hits a gated feature → redirect to login (RequestAuthentication event) */
  requestAuthentication: (triggeredBy: string, returnRoute?: string) => void
  /** Leave the login screen without signing in → back to guest mode */
  continueAsGuest: () => void
  /** Re-read the Firestore profile (after profile edits) */
  reloadUser: () => Promise<void>
  signOut: () => Promise<void>
}

export class AuthError extends Error {
  code: string
  recoveryHint?: string
  cooldownSeconds?: number
  constructor(message: string, code = 'unknown', recoveryHint?: string, cooldownSeconds?: number) {
    super(message)
    this.code = code
    this.recoveryHint = recoveryHint
    this.cooldownSeconds = cooldownSeconds
  }
}

/** _mapFirebaseError / auth_error_handler.dart */
export function mapFirebaseError(e: unknown): AuthError {
  if (e instanceof AuthError) return e
  const code = (e as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return new AuthError('Please enter a valid email address.', 'invalid-email')
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return new AuthError('Invalid email or password. Please check and try again.', 'invalid-credentials', 'Double-check your email and password')
    case 'auth/email-already-in-use':
      return new AuthError('This email is already registered. Try signing in instead.', 'email-already-in-use', 'Sign in with this email or use a different one')
    case 'auth/weak-password':
      return new AuthError('Password is too weak. Use at least 6 characters.', 'weak-password')
    case 'auth/user-disabled':
      return new AuthError('This account has been disabled. Please contact support.', 'user-disabled')
    case 'auth/too-many-requests':
      return new AuthError('Too many failed attempts. Please wait a few minutes.', 'too-many-requests', 'Wait 5 minutes before trying again')
    case 'auth/network-request-failed':
      return new AuthError('Network error. Please check your internet connection.', 'network', 'Check your connection and try again')
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new AuthError('Sign in was cancelled.', 'cancelled')
    case 'auth/account-exists-with-different-credential':
      return new AuthError('An account already exists with this email using a different sign-in method.', 'account-exists')
    case 'auth/operation-not-allowed':
      return new AuthError('This sign-in method is not enabled.', 'operation-not-allowed')
    case 'permission-denied':
      return new AuthError('You do not have permission to perform this action.', 'permission-denied')
    default: {
      const f = friendlyError(e, 'Something went wrong. Please try again.')
      return new AuthError(f.message, f.code, f.hint)
    }
  }
}

/** AuthService._normalizeErrorCode + _mapFunctionsError for Briq OTP callables */
function mapOtpError(e: unknown): AuthError {
  const err = e as { code?: string; message?: string; details?: Record<string, unknown> }
  const details = err.details ?? {}
  const httpsCode = (err.code ?? '').replace('functions/', '')
  const raw = String(details.code ?? details.errorCode ?? httpsCode ?? '')
  const cooldownRaw = details.cooldownSeconds ?? details.retryAfter
  const cooldown = typeof cooldownRaw === 'number' ? cooldownRaw : undefined
  const message = err.message ?? 'Something went wrong. Please try again.'
  const combined = `${raw.toLowerCase()} ${httpsCode} ${message.toLowerCase()}`
  if (combined.includes('invalid-phone') || combined.includes('invalid_phone') || (httpsCode === 'invalid-argument' && combined.includes('phone')))
    return new AuthError('Please enter a valid phone number with country code.', 'invalid-phone-number', 'Use a Tanzania number starting with 6 or 7')
  if (/invalid[-_]otp|wrong-otp|incorrect-otp|invalid-verification-code/.test(combined) || (combined.includes('otp') && /invalid|incorrect|wrong/.test(combined)))
    return new AuthError('The verification code is incorrect. Please check and try again.', 'invalid-otp', 'Double-check the 6-digit code from your SMS')
  if (combined.includes('expired') || combined.includes('invalid-session') || httpsCode === 'not-found')
    return new AuthError('Verification code has expired. Please request a new code.', 'session-expired', 'Tap "Resend" to get a new verification code')
  if (/cooldown|rate|too-many|too_many/.test(combined) || httpsCode === 'resource-exhausted')
    return new AuthError(
      cooldown != null ? `Please wait ${cooldown} seconds before requesting another code.` : 'Too many attempts. Please wait a moment and try again.',
      'cooldown',
      'Wait before requesting a new code',
      cooldown,
    )
  if (combined.includes('quota')) return new AuthError('SMS quota exceeded. Please try again later.', 'quota-exceeded')
  if (combined.includes('network') || httpsCode === 'unavailable' || httpsCode === 'deadline-exceeded')
    return new AuthError('Network error. Please check your internet connection.', 'network', 'Check your connection and try again')
  return new AuthError(message, raw || 'unknown', undefined, cooldown)
}

const Ctx = createContext<AuthContextValue | null>(null)

async function fetchProfileWithRetry(uid: string, attempts = 3): Promise<UserModel | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const p = await fs.getUserProfile(uid)
      if (p) return p
    } catch (e) {
      if (i === attempts - 1) throw e
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)))
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('initial')
  const [user, setUser] = useState<UserModel | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [authRequired, setAuthRequired] = useState<AuthRequired | null>(null)
  const guestRef = useRef<UserModel | null>(null)
  /** Name typed on the sign-up form; used when the auth listener creates the profile doc. */
  const pendingSignupName = useRef<string | null>(null)
  /** Phone verified via Briq OTP; stored on the profile by the auth listener. */
  const pendingPhone = useRef<string | null>(null)

  const enterGuest = useCallback(() => {
    if (!guestRef.current) guestRef.current = guestUser()
    setUser(guestRef.current)
    setStatus('guest')
  }, [])

  /** _emitAuthStateForUser */
  const applyUser = useCallback(async (u: UserModel) => {
    setUser(u)
    if (isAdmin(u)) return setStatus('authenticated')
    if (u.role == null) return setStatus('roleSelection')
    if (u.role === 'client') return setStatus(hasCompleteMandatoryFields(u) ? 'authenticated' : 'clientSetup')
    if (u.role === 'owner') {
      try {
        const salon = await fs.getSalonForOwner(u.uid)
        return setStatus(salon ? 'authenticated' : 'ownerSetup')
      } catch {
        return setStatus('ownerSetup')
      }
    }
    setStatus('roleSelection')
  }, [])

  /** _onAuthStateChanged */
  const handleFirebaseUser = useCallback(
    async (fu: User | null) => {
      setFirebaseUser(fu)
      if (!fu) return enterGuest()
      setStatus('loading')
      try {
        let profile = await fetchProfileWithRetry(fu.uid, 2)
        if (!profile) {
          await fs.createUser({
            uid: fu.uid,
            email: fu.email ?? '',
            fullName: pendingSignupName.current ?? fu.displayName ?? 'New User',
            phoneNumber: fu.phoneNumber ?? pendingPhone.current,
            profilePictureUrl: fu.photoURL,
          })
          pendingSignupName.current = null
          pendingPhone.current = null
          profile = await fetchProfileWithRetry(fu.uid)
        } else {
          // Google: fill name/photo if missing (AuthRepositoryImpl.signInWithGoogle)
          const patch: { fullName?: string; profilePictureUrl?: string; phoneNumber?: string } = {}
          if (pendingPhone.current && !profile.phoneNumber) patch.phoneNumber = pendingPhone.current
          pendingPhone.current = null
          if (fu.displayName && (!profile.fullName || profile.fullName === 'New User')) patch.fullName = fu.displayName
          if (fu.photoURL && !profile.profilePictureUrl) patch.profilePictureUrl = fu.photoURL
          if (patch.fullName || patch.profilePictureUrl || patch.phoneNumber) {
            await fs.updateUserProfile(fu.uid, patch).catch(() => {})
            profile = { ...profile, ...patch }
          }
        }
        if (!profile) throw new AuthError('Failed to set up your profile. Please check your connection and try again.')
        guestRef.current = null
        setAuthRequired(null)
        await applyUser(profile)
      } catch (e) {
        console.error('[auth] failed to resolve user', e)
        // Fall back to guest so the app stays usable; the login screen surfaces errors on retry.
        enterGuest()
      }
    },
    [applyUser, enterGuest],
  )

  useEffect(() => onAuthStateChanged(auth, (fu) => void handleFirebaseUser(fu)), [handleFirebaseUser])

  const wrap = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn()
    } catch (e) {
      throw mapFirebaseError(e)
    }
  }

  const value: AuthContextValue = {
    status,
    user,
    firebaseUser,
    authRequired,
    isGuest: status === 'guest' || status === 'authRequired',
    isAdmin: isAdmin(user),

    signIn: (email, password) => wrap(async () => void (await signInWithEmailAndPassword(auth, email.trim(), password))),

    signUp: (fullName, email, password) =>
      wrap(async () => {
        pendingSignupName.current = fullName.trim()
        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password)
        } catch (e) {
          pendingSignupName.current = null
          throw e
        }
      }),

    signInWithGoogle: () =>
      wrap(async () => {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        await signInWithPopup(auth, provider)
      }),

    requestPhoneOtp: async (phoneNumber) => {
      try {
        const res = await httpsCallable(functions, 'request_briq_otp', { timeout: 30000 })({ phoneNumber })
        const data = (res.data ?? {}) as Record<string, unknown>
        if (data.success === false) throw mapOtpError({ message: data.message, details: data })
        const sessionId = String(data.sessionId ?? data.session_id ?? '')
        if (!sessionId) throw new AuthError('Failed to send verification code. Please try again.', 'unknown', 'Check your connection and try again')
        return sessionId
      } catch (e) {
        throw e instanceof AuthError ? e : mapOtpError(e)
      }
    },

    verifyPhoneOtp: async (sessionId, code, phoneNumber) => {
      let token: string
      try {
        const payload: Record<string, unknown> = { sessionId, otp: code, code }
        if (phoneNumber) payload.phoneNumber = phoneNumber
        const res = await httpsCallable(functions, 'verify_briq_otp', { timeout: 30000 })(payload)
        const data = (res.data ?? {}) as Record<string, unknown>
        if (data.success === false) throw mapOtpError({ message: data.message ?? 'The verification code is incorrect. Please try again.', details: data })
        token = String(data.customToken ?? data.custom_token ?? '')
        if (!token) throw new AuthError('Verification succeeded but sign-in failed. Please try again.')
      } catch (e) {
        throw e instanceof AuthError ? e : mapOtpError(e)
      }
      pendingPhone.current = phoneNumber ?? null
      await wrap(() => signInWithCustomToken(auth, token))
    },

    sendPasswordReset: (email) => wrap(() => sendPasswordResetEmail(auth, email.trim())),

    selectRole: (role) =>
      wrap(async () => {
        if (!user || user.isGuest) return
        setStatus('loading')
        try {
          await fs.updateUserRole(user.uid, role)
          const updated = await fetchProfileWithRetry(user.uid)
          await applyUser(updated ?? { ...user, role })
        } catch (e) {
          setStatus('roleSelection')
          throw e
        }
      }),

    completeClientProfile: (p) =>
      wrap(async () => {
        if (!user) return
        await fs.completeClientProfile({ uid: user.uid, ...p })
        const updated = await fetchProfileWithRetry(user.uid)
        setUser(updated ?? { ...user, ...p, profilePictureUrl: p.profilePictureUrl ?? user.profilePictureUrl })
        setStatus('authenticated')
      }),

    completeOwnerProfile: (p) =>
      wrap(async () => {
        if (!user) return
        await fs.createSalon({ ownerId: user.uid, ...p })
        const updated = await fetchProfileWithRetry(user.uid)
        setUser(updated ?? user)
        setStatus('authenticated')
      }),

    requestAuthentication: (triggeredBy, returnRoute) => {
      if (returnRoute) AuthReturnStore.setPending(returnRoute)
      setAuthRequired({ triggeredBy, returnRoute })
      setStatus('authRequired')
    },

    continueAsGuest: () => {
      AuthReturnStore.clear()
      setAuthRequired(null)
      enterGuest()
    },

    reloadUser: async () => {
      if (!firebaseUser) return
      const updated = await fetchProfileWithRetry(firebaseUser.uid)
      if (updated) await applyUser(updated)
    },

    signOut: async () => {
      AuthReturnStore.clear()
      await fbSignOut(auth)
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}

/** AuthenticationRequired.userMessage */
export function authRequiredMessage(triggeredBy?: string) {
  switch ((triggeredBy ?? '').toLowerCase()) {
    case 'booking':
    case 'book':
      return 'Sign in to book and manage your appointments'
    case 'favorite':
    case 'save':
      return 'Sign in to save your favorite salons'
    case 'review':
      return 'Sign in to share your experience'
    case 'profile':
      return 'Sign in to access your profile'
    case 'wallet':
      return 'Sign in to use your wallet'
    default:
      return 'Sign in to access this feature'
  }
}

/**
 * Guard helper for gated actions (favorite, book, review…). Returns true if the
 * user is signed in; otherwise triggers the login redirect and returns false.
 */
export function useRequireAuth() {
  const { isGuest, requestAuthentication } = useAuth()
  return (triggeredBy: string, returnRoute?: string) => {
    if (!isGuest) return true
    requestAuthentication(triggeredBy, returnRoute)
    return false
  }
}
