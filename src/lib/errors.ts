// Turns any thrown value (Firebase Auth/Firestore/Storage/Functions, network, our own Errors)
// into a short, user-friendly message plus a "how to fix it" hint. Never show raw error text.

export interface FriendlyError {
  /** One sentence: what went wrong */
  message: string
  /** What the user can do about it */
  hint?: string
  code: string
}

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false

const MAP: Record<string, Omit<FriendlyError, 'code'>> = {
  // network / availability
  'network': { message: "You're offline or the connection dropped.", hint: 'Check your internet connection and try again.' },
  'unavailable': { message: "We couldn't reach the server.", hint: 'Check your internet connection and try again.' },
  'deadline-exceeded': { message: 'The request took too long.', hint: 'Please try again in a moment.' },
  'cancelled': { message: 'The request was cancelled.' },
  // permissions / auth
  'permission-denied': { message: "You don't have permission to do that.", hint: 'Make sure you are signed in with the right account.' },
  'unauthenticated': { message: 'Your session has expired.', hint: 'Please sign in again.' },
  // data
  'not-found': { message: "We couldn't find what you were looking for.", hint: 'It may have been moved or deleted. Refresh and try again.' },
  'already-exists': { message: 'This item already exists.' },
  'failed-precondition': { message: "This action can't be completed right now.", hint: 'Refresh the page and try again.' },
  'invalid-argument': { message: 'Some of the information entered is invalid.', hint: 'Check the form and try again.' },
  'resource-exhausted': { message: 'Too many requests right now.', hint: 'Please wait a minute and try again.' },
  'aborted': { message: 'Someone else changed this at the same time.', hint: 'Refresh and try again.' },
  'internal': { message: 'Something went wrong on our side.', hint: 'Please try again. If it keeps happening, contact support.' },
  'unknown': { message: 'Something went wrong.', hint: 'Please try again.' },
  // storage
  'storage/unauthorized': { message: "You don't have permission to upload this file.", hint: 'Make sure you are signed in, then try again.' },
  'storage/canceled': { message: 'Upload cancelled.' },
  'storage/quota-exceeded': { message: 'Storage is full.', hint: 'Please contact support.' },
  'storage/retry-limit-exceeded': { message: 'The upload kept failing.', hint: 'Check your connection and try again.' },
  'storage/object-not-found': { message: "That file doesn't exist anymore." },
  'storage/invalid-format': { message: "That file format isn't supported.", hint: 'Choose a JPG or PNG image.' },
  'file-too-large': { message: 'That file is too large.', hint: 'Choose a smaller file.' },
}

/** Firestore/Functions codes come as 'permission-denied' or 'functions/permission-denied'. */
function normalize(code: string) {
  return code.replace(/^(firestore|functions)\//, '')
}

export function friendlyError(e: unknown, fallback = 'Something went wrong.'): FriendlyError {
  if (offline()) return { code: 'network', ...MAP.network }
  const err = e as { code?: unknown; message?: unknown; recoveryHint?: unknown; name?: unknown } | null
  // Our own AuthError already carries a friendly message + hint.
  if (err && err.name !== 'FirebaseError' && typeof err.recoveryHint === 'string' && typeof err.message === 'string') {
    return { code: String(err.code ?? 'auth'), message: err.message, hint: err.recoveryHint }
  }
  const code = typeof err?.code === 'string' ? normalize(err.code) : ''
  if (code && MAP[code]) return { code, ...MAP[code] }
  const msg = typeof err?.message === 'string' ? err.message : ''
  if (/network|failed to fetch|offline/i.test(msg)) return { code: 'network', ...MAP.network }
  if (/permission|insufficient/i.test(msg)) return { code: 'permission-denied', ...MAP['permission-denied'] }
  if (/index/i.test(msg) && /query/i.test(msg)) return { code: 'failed-precondition', ...MAP['failed-precondition'] }
  // Plain Errors thrown deliberately by our own code (e.g. "Salon not found") are already readable.
  if (msg && !/firebase|firestore|\bat\b.*\(|undefined|null|TypeError|[{}[\]]/i.test(msg) && msg.length < 140) {
    return { code: code || 'app', message: msg.endsWith('.') ? msg : `${msg}.`, hint: 'Please try again.' }
  }
  return { code: code || 'unknown', message: fallback, hint: MAP.unknown.hint }
}
