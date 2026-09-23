// src/i18n/plurals.ts
//
// Sentences that contain a count. These can't live in the plain dictionary:
// English needs singular/plural, and Arabic needs up to six forms, because the
// noun changes with the number (يوم واحد، يومان، ٣ أيام، ١١ يومًا، ١٠٠ يوم).
//
// {count} is replaced with the number, formatted for the current language.

export type ArabicPluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export interface PluralEntry {
  en: { one: string; other: string };
  ar: Partial<Record<ArabicPluralForm, string>> & { other: string };
}

/** Arabic plural category for a number, following the CLDR rules. */
export function arabicForm(n: number): ArabicPluralForm {
  const abs = Math.abs(n);
  if (abs === 0) return 'zero';
  if (abs === 1) return 'one';
  if (abs === 2) return 'two';
  const mod = abs % 100;
  if (mod >= 3 && mod <= 10) return 'few';
  if (mod >= 11 && mod <= 99) return 'many';
  return 'other';
}

export const plurals: Record<string, PluralEntry> = {
  days: {
    en: { one: '{count} day', other: '{count} days' },
    ar: {
      one: 'يوم واحد',
      two: 'يومان',
      few: '{count} أيام',
      many: '{count} يومًا',
      other: '{count} يوم',
    },
  },
  daysOverdue: {
    en: { one: '{count} day overdue', other: '{count} days overdue' },
    ar: {
      one: 'متأخرة يومًا واحدًا',
      two: 'متأخرة يومين',
      few: 'متأخرة {count} أيام',
      many: 'متأخرة {count} يومًا',
      other: 'متأخرة {count} يوم',
    },
  },
  dueInDays: {
    en: { one: 'Due in {count} day', other: 'Due in {count} days' },
    ar: {
      one: 'مستحقة بعد يوم واحد',
      two: 'مستحقة بعد يومين',
      few: 'مستحقة بعد {count} أيام',
      many: 'مستحقة بعد {count} يومًا',
      other: 'مستحقة بعد {count} يوم',
    },
  },
  daysAfterPrevious: {
    en: { one: '{count} day after previous', other: '{count} days after previous' },
    ar: {
      one: 'بعد السابقة بيوم واحد',
      two: 'بعد السابقة بيومين',
      few: 'بعد السابقة بـ{count} أيام',
      many: 'بعد السابقة بـ{count} يومًا',
      other: 'بعد السابقة بـ{count} يوم',
    },
  },
  areas: {
    en: { one: '{count} area', other: '{count} areas' },
    ar: {
      zero: 'لا توجد مناطق',
      one: 'منطقة واحدة',
      two: 'منطقتان',
      few: '{count} مناطق',
      many: '{count} منطقة',
      other: '{count} منطقة',
    },
  },
  areasSelected: {
    en: { one: '{count} area selected', other: '{count} areas selected' },
    ar: {
      zero: 'لم تُختر أي منطقة',
      one: 'تم اختيار منطقة واحدة',
      two: 'تم اختيار منطقتين',
      few: 'تم اختيار {count} مناطق',
      many: 'تم اختيار {count} منطقة',
      other: 'تم اختيار {count} منطقة',
    },
  },
  reviews: {
    en: { one: '{count} review', other: '{count} reviews' },
    ar: {
      zero: 'لا توجد تقييمات',
      one: 'تقييم واحد',
      two: 'تقييمان',
      few: '{count} تقييمات',
      many: '{count} تقييمًا',
      other: '{count} تقييم',
    },
  },
  providersFound: {
    en: { one: '{count} provider found', other: '{count} providers found' },
    ar: {
      zero: 'لم يُعثر على مزوّدين',
      one: 'تم العثور على مزوّد واحد',
      two: 'تم العثور على مزوّدَين',
      few: 'تم العثور على {count} مزوّدين',
      many: 'تم العثور على {count} مزوّدًا',
      other: 'تم العثور على {count} مزوّد',
    },
  },
  services: {
    en: { one: '{count} service', other: '{count} services' },
    ar: {
      one: 'خدمة واحدة',
      two: 'خدمتان',
      few: '{count} خدمات',
      many: '{count} خدمة',
      other: '{count} خدمة',
    },
  },
};
