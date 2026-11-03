// Shared validators with clear "how to fix it" messages (port of app/validators/*).
// Each returns null when valid, or an instruction string.
export type Validator = (v: string) => string | null

export const v = {
  required: (label: string): Validator => (x) => (x.trim() ? null : `${label} is required.`),
  email: (): Validator => (x) =>
    !x.trim() ? 'Email is required.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x.trim()) ? null : 'Enter a valid email, e.g. name@example.com.',
  minLength: (label: string, n: number): Validator => (x) => (x.trim().length >= n ? null : `${label} must be at least ${n} characters.`),
  maxLength: (label: string, n: number): Validator => (x) => (x.trim().length <= n ? null : `${label} must be ${n} characters or fewer.`),
  /** Tanzania mobile: 9 digits starting with 6 or 7 (optionally with +255 / 0 prefix). */
  tzPhone: (): Validator => (x) => {
    const d = x.replace(/\D/g, '').replace(/^255/, '').replace(/^0/, '')
    if (!d) return 'Phone number is required.'
    return /^[67]\d{8}$/.test(d) ? null : 'Enter a 9-digit Tanzanian number starting with 6 or 7, e.g. 712 345 678.'
  },
  positiveNumber: (label: string): Validator => (x) => {
    if (!x.trim()) return `${label} is required.`
    const n = Number(x)
    return Number.isFinite(n) && n > 0 ? null : `${label} must be a number greater than 0.`
  },
  integerRange: (label: string, min: number, max: number): Validator => (x) => {
    const n = Number(x)
    return Number.isInteger(n) && n >= min && n <= max ? null : `${label} must be a whole number between ${min} and ${max}.`
  },
  url: (label = 'Link'): Validator => (x) => {
    if (!x.trim()) return null
    try {
      new URL(x.trim())
      return null
    } catch {
      return `${label} must be a full web address starting with https://.`
    }
  },
  match: (other: () => string, msg = 'Passwords do not match.'): Validator => (x) => (x === other() ? null : msg),
}

/** Run several validators; first failure wins. */
export const check = (value: string, ...rules: Validator[]) => {
  for (const r of rules) {
    const e = r(value)
    if (e) return e
  }
  return null
}

/** After a failed submit: scroll to and focus the first invalid field inside `root`. */
export function focusFirstInvalid(root: ParentNode = document) {
  const el = root.querySelector<HTMLElement>('[aria-invalid="true"], .field-invalid, [data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] select')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.focus({ preventScroll: true })
}
