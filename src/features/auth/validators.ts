// Port of lib/app/utils/validators.dart (AppValidators) – same rules and messages.
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

export type Validator = (value: string) => string | null

export const AppValidators = {
  notEmpty(value: string, message?: string): string | null {
    if (!value || value.trim() === '') return message ?? 'This field is required. Please fill it in.'
    return null
  },
  email(value: string): string | null {
    const empty = AppValidators.notEmpty(value, 'Please enter an email address')
    if (empty) return empty
    if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address, e.g. name@example.com'
    return null
  },
  password(value: string): string | null {
    const empty = AppValidators.notEmpty(value, 'Please enter a password')
    if (empty) return empty
    if (value.length < 8) return 'Password must be at least 8 characters long'
    if (!PASSWORD_RE.test(value)) return 'Add an uppercase letter, a lowercase letter, a number and a symbol (@$!%*?&)'
    return null
  },
  valuesMatch(a: string, b: string, message?: string): string | null {
    return a !== b ? (message ?? 'The values do not match') : null
  },
}

/** Email regex used by the login bottom sheet (_EmailLoginSheet). */
export const LOGIN_EMAIL_RE = /^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$/
