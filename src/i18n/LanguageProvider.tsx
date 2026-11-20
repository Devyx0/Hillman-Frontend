import { createContext, Fragment, useContext, useState, type ReactNode } from 'react'
import { cn } from '../lib/utils'
import { getLang, setLang as storeLang, type Lang } from './index'

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'fr', setLang: () => {} })

/**
 * Holds the active language. Children are re-mounted when it changes so every
 * `t()` call is re-evaluated in the new language.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(getLang())
  const setLang = (l: Lang) => {
    storeLang(l)
    setState(l)
  }
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <Fragment key={lang}>{children}</Fragment>
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)

/** Single EN / FR switch button. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage()
  const next: Lang = lang === 'en' ? 'fr' : 'en'
  const label = lang === 'en' ? 'Passer au français' : 'Switch to English'
  return (
    <button
      type="button"
      data-lang-switch
      onClick={() => setLang(next)}
      aria-label={label}
      title={label}
      className={cn('shrink-0 h-9 p-0.5 rounded-md bg-sand hover:bg-stone transition-colors inline-flex items-center text-xs font-semibold', className)}
    >
      {(['en', 'fr'] as const).map((l) => (
        <span key={l} className={cn('h-8 px-1.5 sm:px-2.5 rounded-[8px] inline-flex items-center uppercase', lang === l ? 'bg-white text-ink shadow-1' : 'text-ink-mute')}>
          {l}
        </span>
      ))}
    </button>
  )
}
