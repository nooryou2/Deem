import AsyncStorage from '@react-native-async-storage/async-storage';
import React,{ createContext,useContext,useEffect,useState } from 'react';
import { Platform,View } from 'react-native';
import { ar } from './ar';
import { setDateLocale } from './locale';
import { plurals, arabicForm } from './plurals';

export type Language = 'ar' | 'en';
type Params = Record<string, string | number>;

const Context = createContext({
  language: 'ar' as Language,
  setLanguage: (_: Language) => {},
  t: (text: string, _params?: Params) => text,
  tp: (_key: string, count: number) => String(count),
  rtl: true,
});
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, change] = useState<Language>('ar');
  useEffect(() => {
    AsyncStorage.getItem('deem.language')
      .then((value) => {
        if (value === 'en' || value === 'ar') change(value);
      })
      .catch(() => {});
  }, []);
  setDateLocale(language);
  // Numbers follow the language, matching how dates are already shown
  // (Arabic-Indic digits in Arabic).
  const formatNumber = (n: number) =>
    n.toLocaleString(language === 'ar' ? 'ar-BH' : 'en-GB', { maximumFractionDigits: 1 });

  /** Fills {name} placeholders. Numbers are formatted for the language. */
  const fill = (template: string, params?: Params) =>
    params
      ? template.replace(/\{(\w+)\}/g, (_, name) => {
          const v = params[name];
          if (v === undefined) return `{${name}}`;
          return typeof v === 'number' ? formatNumber(v) : v;
        })
      : template;

  const t = (text: string, params?: Params) => {
    const key = text.trim().replace(/\s+/g, ' ');
    let out: string;
    if (language === 'ar') out = ar[key] ?? text;
    else out = Object.keys(ar).find((k) => ar[k] === key) ?? text;
    return fill(out, params);
  };

  /** A sentence containing a count, using the right plural form. */
  const tp = (key: string, count: number) => {
    const entry = plurals[key];
    if (!entry) return String(count);
    const template =
      language === 'ar'
        ? entry.ar[arabicForm(count)] ?? entry.ar.other
        : Math.abs(count) === 1
          ? entry.en.one
          : entry.en.other;
    return fill(template, { count });
  };
  const setLanguage = (value: Language) => {
    change(value);
    AsyncStorage.setItem('deem.language', value).catch(() => {});
  };
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);
  return (
    <Context.Provider value={{ language, setLanguage, t, tp, rtl: language === 'ar' }}>
      <View style={{ flex: 1, direction: language === 'ar' ? 'rtl' : 'ltr' }}>{children}</View>
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
