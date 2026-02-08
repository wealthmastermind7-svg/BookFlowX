import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { t as translate, getLanguage, subscribe, setLanguage, initI18n, SUPPORTED_LANGUAGES, LanguageOption } from '@/lib/i18n';

interface I18nContextType {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: string;
  changeLanguage: (code: string) => Promise<void>;
  languages: LanguageOption[];
  isReady: boolean;
}

const I18nContext = createContext<I18nContextType>({
  t: translate,
  lang: 'en',
  changeLanguage: async () => {},
  languages: SUPPORTED_LANGUAGES,
  isReady: false,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState(getLanguage());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initI18n().then(l => {
      setLang(l);
      setIsReady(true);
    });
    const unsub = subscribe(() => setLang(getLanguage()));
    return unsub;
  }, []);

  const changeLanguage = useCallback(async (code: string) => {
    await setLanguage(code);
  }, []);

  return (
    <I18nContext.Provider value={{ t: translate, lang, changeLanguage, languages: SUPPORTED_LANGUAGES, isReady }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
