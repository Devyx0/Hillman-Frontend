import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getLang, locale } from '../i18n'

/** Class-name combiner (minified name in the mockup: `H`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Accent/case-insensitive search key (mockup: `Ta`). */
export function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const formatters = new Map<string, Intl.NumberFormat>()
function currency(digits: number) {
  const key = `${locale()}:${digits}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale(), { style: 'currency', currency: 'CAD', minimumFractionDigits: digits, maximumFractionDigits: digits })
    formatters.set(key, f)
  }
  return f
}

/** Currency (mockup: `ye`). `cents=false` drops decimals. Follows the active language. */
export function money(n: number, cents = true) {
  return currency(cents ? 2 : 0).format(n).replace('CA', '').trim()
}

/** Compact currency: "1,2 M$" / "18 k$" in French, "$1.2M" / "$18k" in English (mockup: `Eo`). */
export function moneyShort(n: number) {
  const en = getLang() === 'en'
  if (Math.abs(n) >= 1e6) {
    const v = (n / 1e6).toLocaleString(locale(), { maximumFractionDigits: 2 })
    return en ? `$${v}M` : v + ' M$'
  }
  if (Math.abs(n) >= 1e4) {
    const v = Math.round(n / 1e3).toLocaleString(locale())
    return en ? `$${v}k` : v + ' k$'
  }
  return money(n, false)
}

/** Percent (mockup: `as`). */
export function pct(n: number, digits = 0) {
  return n.toLocaleString(locale(), { maximumFractionDigits: digits, minimumFractionDigits: digits }) + (getLang() === 'en' ? '%' : ' %')
}

/** Localised number (mockup: `Oi`). */
export function num(n: number) {
  return n.toLocaleString(locale())
}

/** Taxes (mockup: `Sd`, `kd`). */
export const GST = 0.05
export const QST = 0.09975

/** 13.5 → "13 h 30" in French, "1:30 PM" in English (mockup: `px`). */
export const formatHour = (h: number) => {
  const hours = Math.floor(h)
  const minutes = String(Math.round((h % 1) * 60)).padStart(2, '0')
  if (getLang() === 'en') return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`
  return `${hours} h ${minutes}`
}
