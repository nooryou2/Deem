import { ar } from './ar';
export let dateLocale = 'ar-BH';
export function setDateLocale(language: 'ar' | 'en') {
  dateLocale = language === 'ar' ? 'ar-BH' : 'en-GB';
}
/**
 * Formats a number for the current language — Arabic-Indic digits in Arabic,
 * Western digits in English. Counts and dates were showing Western digits in
 * Arabic because they bypassed this.
 */
export function fmtNumber(value: number, grouping = true): string {
  return value.toLocaleString(dateLocale, {
    maximumFractionDigits: 1,
    // Years must not be grouped: 2026 is a year, not "2,026".
    useGrouping: grouping,
  });
}

export function translateLabel(label: string): string {
  return dateLocale === 'ar-BH' ? (ar[label] ?? label) : label;
}
