import { createContext, useContext, type ReactNode } from 'react'
import { getLang, inLang, t, type Lang } from './index'

/**
 * Language for client-facing content (portal, PDF preview, email/text drafts). Wrap such a subtree in
 * `<ClientLangProvider lang={clientLang(client)}>` and, inside it, use `const { tc, fmt } = useClientLang()`:
 *   tc('Soumission {no}', { no })        → text in the client's language
 *   fmt(() => money(total))              → any formatter (money, dates, formatHour) in that language
 * Outside a provider, both fall back to the UI language.
 */
const ClientLangContext = createContext<Lang | null>(null)

export function ClientLangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <ClientLangContext.Provider value={lang}>{children}</ClientLangContext.Provider>
}

export function useClientLang() {
  const lang = useContext(ClientLangContext) ?? getLang()
  return {
    lang,
    tc: (text: string, vars?: Record<string, string | number>) => inLang(lang, () => t(text, vars)),
    fmt: <T,>(fn: () => T) => inLang(lang, fn),
  }
}
