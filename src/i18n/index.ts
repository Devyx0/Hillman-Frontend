import { en } from './en'

/**
 * Minimal i18n. French is the source language: every UI string is written in
 * French in the code and passed through `t()`. In English mode `t()` looks the
 * French string up in the dictionaries under `./en/`.
 *
 *   t('Soumissions')
 *   t('{n} soumissions ouvertes', { n: 12 })
 *
 * `t()` reads the current language at call time, so only call it while
 * rendering (or in event handlers) — never at module top level.
 */
export type Lang = 'en' | 'fr'

const STORAGE_KEY = 'hillman.lang'

function readLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'fr' || v === 'en') return v
  } catch {
    /* storage unavailable */
  }
  return 'en'
}

let lang: Lang = readLang()
if (typeof document !== 'undefined') document.documentElement.lang = lang === 'en' ? 'en-CA' : 'fr-CA'

export const getLang = () => lang

export function setLang(next: Lang) {
  lang = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* storage unavailable */
  }
  document.documentElement.lang = next === 'en' ? 'en-CA' : 'fr-CA'
}

/**
 * Run `fn` with the language temporarily set to `l`, then restore the UI language. Use it to render
 * client-facing text (portal, PDF, email/text drafts) in the CLIENT's language regardless of the
 * rep's UI language:  `inLang(clientLang(client), () => t('Soumission {no}', { no }))`.
 * `t`, `locale()`, `money`, `formatHour` … all follow the temporary language inside `fn`.
 */
export function inLang<T>(l: Lang, fn: () => T): T {
  const prev = lang
  lang = l
  try {
    return fn()
  } finally {
    lang = prev
  }
}

/** `t()` in a given language (shorthand for `inLang(l, () => t(text, vars))`). */
export const tIn = (l: Lang, text: string, vars?: Record<string, string | number>) => inLang(l, () => t(text, vars))

/** BCP 47 locale for number/date formatting in the current language. */
export const locale = () => (lang === 'en' ? 'en-CA' : 'fr-CA')

/** Strings seen in English mode with no translation (dev aid: `window.__i18nMissing`). */
const missing = new Set<string>()
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __i18nMissing: Set<string> }).__i18nMissing = missing

/**
 * Like `t()`, for a French string whose English depends on where it is shown
 * (e.g. "Soumissions ouvertes" = "Opened quotes" on Today but "Open quotes" on a
 * client record). Looks up `"<context>::<text>"` first, then falls back to `t()`.
 */
export function tx(context: string, text: string, vars?: Record<string, string | number>): string {
  if (lang === 'en') {
    const hit = en[`${context}::${text}`]
    if (hit !== undefined) return vars ? hit.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : hit
  }
  return t(text, vars)
}

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = text
  if (lang === 'en') {
    const hit = en[text]
    if (hit !== undefined) out = hit
    else if (/\p{L}/u.test(text)) missing.add(text)
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
  return out
}
