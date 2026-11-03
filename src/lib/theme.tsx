// Port of ThemeCubit: system → light → dark cycle, persisted under 'theme_mode'.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
const KEY = 'theme_mode'
interface ThemeCtx { mode: ThemeMode; isDark: boolean; setMode: (m: ThemeMode) => void; toggle: () => void }
const Ctx = createContext<ThemeCtx | null>(null)

const read = (): ThemeMode => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch { return 'system' }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(read)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const isDark = mode === 'dark' || (mode === 'system' && systemDark)
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark) }, [isDark])

  const setMode = (m: ThemeMode) => {
    setModeState(m)
    try { localStorage.setItem(KEY, m) } catch { /* ignore */ }
  }
  const toggle = () => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system')

  return <Ctx.Provider value={{ mode, isDark, setMode, toggle }}>{children}</Ctx.Provider>
}
export function useTheme() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTheme outside ThemeProvider')
  return c
}
