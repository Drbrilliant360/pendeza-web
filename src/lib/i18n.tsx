// Mirror of easy_localization usage: nested keys ('auth.login.title'), positional {} args,
// translations loaded from /language/{en,sw}.json (copied from assets/language).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type Dict = Record<string, unknown>
export type Lang = 'en' | 'sw'
const STORAGE_KEY = 'locale'

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, args?: (string | number)[]) => string
  ready: boolean
}
const Ctx = createContext<I18nCtx | null>(null)

function lookup(dict: Dict | undefined, key: string): string | undefined {
  let cur: unknown = dict
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Dict)) cur = (cur as Dict)[part]
    else return undefined
  }
  return typeof cur === 'string' ? cur : undefined
}

function readSaved(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'sw' ? 'sw' : 'en'
  } catch {
    return 'en'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readSaved)
  const [dicts, setDicts] = useState<Partial<Record<Lang, Dict>>>({})

  useEffect(() => {
    let alive = true
    const load = async (l: Lang) => {
      if (dicts[l]) return
      const res = await fetch(`/language/${l}.json`)
      const json = (await res.json()) as Dict
      if (alive) setDicts((d) => ({ ...d, [l]: json }))
    }
    load('en').catch(() => {})
    if (lang !== 'en') load(lang).catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* ignore */ }
    document.documentElement.lang = l
  }, [])

  const t = useCallback(
    (key: string, args?: (string | number)[]) => {
      let s = lookup(dicts[lang], key) ?? lookup(dicts.en, key) ?? key
      if (args) for (const a of args) s = s.replace('{}', String(a))
      return s
    },
    [dicts, lang],
  )

  return <Ctx.Provider value={{ lang, setLang, t, ready: !!dicts.en }}>{children}</Ctx.Provider>
}

export function useI18n() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useI18n outside I18nProvider')
  return c
}
export const useT = () => useI18n().t
