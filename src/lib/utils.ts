import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Class-name combiner (minified name in the mockup: `H`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Accent/case-insensitive search key (mockup: `Ta`). */
export function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const CAD_CENTS = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const CAD_WHOLE = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

/** Currency (mockup: `ye`). `cents=false` drops decimals. */
export function money(n: number, cents = true) {
  return (cents ? CAD_CENTS : CAD_WHOLE).format(n).replace('CA', '').trim()
}

/** Compact currency: 1,2 M$ / 18 k$ (mockup: `Eo`). */
export function moneyShort(n: number) {
  return Math.abs(n) >= 1e6
    ? (n / 1e6).toLocaleString('fr-CA', { maximumFractionDigits: 2 }) + ' M$'
    : Math.abs(n) >= 1e4
      ? Math.round(n / 1e3).toLocaleString('fr-CA') + ' k$'
      : money(n, false)
}

/** Percent (mockup: `as`). */
export function pct(n: number, digits = 0) {
  return n.toLocaleString('fr-CA', { maximumFractionDigits: digits, minimumFractionDigits: digits }) + ' %'
}

/** Localised number (mockup: `Oi`). */
export function num(n: number) {
  return n.toLocaleString('fr-CA')
}

/** Taxes (mockup: `Sd`, `kd`). */
export const GST = 0.05
export const QST = 0.09975

/** 13.5 → "13 h 30" (mockup: `px`). */
export const formatHour = (h: number) => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}`
