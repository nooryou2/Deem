import { ar } from './ar';
export let dateLocale = 'ar-BH';
export function setDateLocale(language: 'ar' | 'en') {
  dateLocale = language === 'ar' ? 'ar-BH' : 'en-GB';
}
export function translateLabel(label: string): string {
  return dateLocale === 'ar-BH' ? (ar[label] ?? label) : label;
}
