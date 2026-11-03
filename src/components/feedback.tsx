// Snackbars (custom_snackbar.dart), confirm dialogs (adaptive_dialog.dart) and the
// standard async-action wrapper every button should use:
//
//   const save = useAction(() => api.save(x), { success: 'Profile saved', error: 'Could not save profile' })
//   <PrimaryButton loading={save.pending} onClick={() => save.run()}>Save</PrimaryButton>
//
// useAction gives: pending state for spinners/disabled buttons, a success toast, and a
// friendly error toast (lib/errors.ts) with an optional Retry action. It never throws.
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { friendlyError } from '@/lib/errors'
import { cx, Sheet } from './ui'

type ToastKind = 'success' | 'error' | 'info' | 'warning'
interface ToastAction { label: string; onClick: () => void }
interface Toast { id: number; kind: ToastKind; message: string; hint?: string; action?: ToastAction }
interface ConfirmOpts { title: string; message?: ReactNode; confirmText?: string; cancelText?: string; destructive?: boolean }

interface FeedbackCtx {
  /** Generic snackbar. `action` adds a button (e.g. Undo). */
  toast: (message: string, kind?: ToastKind, action?: ToastAction) => void
  /** Green confirmation after save/submit/delete. */
  toastSuccess: (message: string, action?: ToastAction) => void
  /** Friendly error from any thrown value, with "how to fix" hint and optional Retry. */
  toastError: (e: unknown, fallback?: string, retry?: () => void) => void
  confirm: (opts: ConfirmOpts) => Promise<boolean>
}
const Ctx = createContext<FeedbackCtx | null>(null)

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle }
const COLORS = { success: 'bg-success', error: 'bg-danger', info: 'bg-primary', warning: 'bg-[#E0941A]' }

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++idRef.current
      setToasts((list) => [...list.filter((x) => !(x.message === t.message && x.kind === t.kind)).slice(-2), { ...t, id }])
      const ms = t.kind === 'error' ? 6000 : t.action ? 5000 : 3500
      setTimeout(() => dismiss(id), ms)
    },
    [dismiss],
  )

  const toast = useCallback<FeedbackCtx['toast']>((message, kind = 'info', action) => push({ kind, message, action }), [push])
  const toastSuccess = useCallback<FeedbackCtx['toastSuccess']>((message, action) => push({ kind: 'success', message, action }), [push])
  const toastError = useCallback<FeedbackCtx['toastError']>(
    (e, fallback, retry) => {
      if (e) console.error(e)
      const f = friendlyError(e, fallback)
      // If the caller gave a context-specific fallback, lead with it and use the cause as the hint.
      const generic = ['unknown', 'internal'].includes(f.code)
      push({
        kind: 'error',
        message: fallback && !generic && fallback !== f.message ? fallback : f.message,
        hint: fallback && !generic && fallback !== f.message ? `${f.message} ${f.hint ?? ''}`.trim() : f.hint,
        action: retry ? { label: 'Retry', onClick: retry } : undefined,
      })
    },
    [push],
  )

  // Last-resort net: any promise rejection nobody handled still produces a friendly message.
  useEffect(() => {
    const onRejection = (ev: PromiseRejectionEvent) => {
      const code = (ev.reason as { code?: string })?.code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
      toastError(ev.reason)
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [toastError])

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), [])
  const close = (v: boolean) => {
    dialog?.resolve(v)
    setDialog(null)
  }

  return (
    <Ctx.Provider value={{ toast, toastSuccess, toastError, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite" role="status">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind]
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : undefined}
              className={cx('pointer-events-auto flex w-full max-w-md animate-[toast-in_.22s_ease-out] items-start gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-lg1', COLORS[t.kind])}
            >
              <Icon size={20} className="mt-px shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{t.message}</p>
                {t.hint && <p className="mt-0.5 text-[12.5px] leading-snug text-white/85">{t.hint}</p>}
              </div>
              {t.action && (
                <button
                  className="shrink-0 rounded-lg px-2 py-1 text-[12.5px] font-bold uppercase tracking-wide hover:bg-white/15 active:bg-white/25"
                  onClick={() => {
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="-mr-1 shrink-0 rounded-full p-1 text-white/80 hover:bg-white/15 hover:text-white">
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
      <Sheet open={!!dialog} onClose={() => close(false)} title={dialog?.title}>
        {dialog?.message && <div className="t-caption text-sm">{dialog.message}</div>}
        <div className="mt-6 flex gap-3">
          <button onClick={() => close(false)} className="h-12 flex-1 rounded-2xl border border-line bg-card font-semibold text-ink hover:bg-inset">
            {dialog?.cancelText ?? 'Cancel'}
          </button>
          <button
            onClick={() => close(true)}
            className={cx('h-12 flex-1 rounded-2xl font-bold text-white', dialog?.destructive ? 'bg-danger hover:brightness-95' : 'bg-primary hover:bg-primary-dark')}
          >
            {dialog?.confirmText ?? 'Confirm'}
          </button>
        </div>
      </Sheet>
    </Ctx.Provider>
  )
}

export function useFeedback() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useFeedback outside FeedbackProvider')
  return c
}

export interface ActionOptions<T> {
  /** Success toast text (string or computed from the result). Omit for no toast. */
  success?: string | ((result: T) => string | null | undefined)
  /** Context for the error toast, e.g. "Could not save your profile". */
  error?: string
  /** Show a Retry button on the error toast (default true). */
  retry?: boolean
  onSuccess?: (result: T) => void
  onError?: (e: unknown) => void
}

/** Wrap an async action: pending state + success toast + friendly error toast. Never throws. */
export function useAction<A extends unknown[], T>(fn: (...args: A) => Promise<T>, opts: ActionOptions<T> = {}) {
  const { toastSuccess, toastError } = useFeedback()
  const [pending, setPending] = useState(false)
  const inFlight = useRef(false)
  const fnRef = useRef(fn)
  const optsRef = useRef(opts)
  fnRef.current = fn
  optsRef.current = opts

  const run = useCallback(
    async (...args: A): Promise<T | undefined> => {
      if (inFlight.current) return undefined // ignore double clicks
      inFlight.current = true
      setPending(true)
      try {
        const result = await fnRef.current(...args)
        const o = optsRef.current
        const msg = typeof o.success === 'function' ? o.success(result) : o.success
        if (msg) toastSuccess(msg)
        o.onSuccess?.(result)
        return result
      } catch (e) {
        const o = optsRef.current
        toastError(e, o.error, o.retry === false ? undefined : () => void run(...args))
        o.onError?.(e)
        return undefined
      } finally {
        inFlight.current = false
        setPending(false)
      }
    },
    [toastSuccess, toastError],
  )
  return { run, pending }
}
