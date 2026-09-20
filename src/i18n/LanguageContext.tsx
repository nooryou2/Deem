import AsyncStorage from '@react-native-async-storage/async-storage';
import React,{ createContext,useContext,useEffect,useState } from 'react';
import { Platform,View } from 'react-native';
import { ar } from './ar';
import { setDateLocale } from './locale';

export type Language = 'ar' | 'en';
const Context = createContext({
  language: 'ar' as Language,
  setLanguage: (_: Language) => {},
  t: (text: string) => text,
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
  const t = (text: string) => {
    const key = text.trim().replace(/\s+/g, ' ');
    if (language === 'ar') return ar[key] ?? text;
    const english = Object.keys(ar).find((k) => ar[k] === key);
    return english ?? text;
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
    <Context.Provider value={{ language, setLanguage, t, rtl: language === 'ar' }}>
      <View style={{ flex: 1, direction: language === 'ar' ? 'rtl' : 'ltr' }}>{children}</View>
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
