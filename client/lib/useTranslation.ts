import { useState, useEffect, useCallback } from 'react';
import { t, getLanguage, subscribe, setLanguage, initI18n, SUPPORTED_LANGUAGES } from './i18n';

export function useTranslation() {
  const [lang, setLang] = useState(getLanguage());

  useEffect(() => {
    initI18n().then(l => setLang(l));
    const unsub = subscribe(() => setLang(getLanguage()));
    return unsub;
  }, []);

  const changeLanguage = useCallback(async (code: string) => {
    await setLanguage(code);
  }, []);

  return { t, lang, changeLanguage, languages: SUPPORTED_LANGUAGES };
}
