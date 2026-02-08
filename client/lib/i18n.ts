import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../i18n/en.json';
import es from '../i18n/es.json';
import fr from '../i18n/fr.json';
import de from '../i18n/de.json';
import it from '../i18n/it.json';
import pt from '../i18n/pt.json';
import nl from '../i18n/nl.json';
import pl from '../i18n/pl.json';
import sv from '../i18n/sv.json';
import no from '../i18n/no.json';
import da from '../i18n/da.json';
import fi from '../i18n/fi.json';
import tr from '../i18n/tr.json';
import ar from '../i18n/ar.json';
import hi from '../i18n/hi.json';
import ja from '../i18n/ja.json';
import ko from '../i18n/ko.json';
import zh from '../i18n/zh.json';
import ru from '../i18n/ru.json';
import cs from '../i18n/cs.json';
import el from '../i18n/el.json';
import ro from '../i18n/ro.json';
import hu from '../i18n/hu.json';
import id from '../i18n/id.json';
import ms from '../i18n/ms.json';
import th from '../i18n/th.json';
import vi from '../i18n/vi.json';
import fil from '../i18n/fil.json';
import uk from '../i18n/uk.json';

const LANGUAGE_STORAGE_KEY = '@bookflow_language';

type TranslationKeys = typeof en;

const translations: Record<string, TranslationKeys> = {
  en, es, fr, de, it, pt, nl, pl, sv, no, da, fi, tr, ar, hi, ja, ko, zh, ru, cs, el, ro, hu, id, ms, th, vi, fil, uk
};

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00f1ol' },
  { code: 'fr', name: 'French', nativeName: 'Fran\u00e7ais' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00eas' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'tr', name: 'Turkish', nativeName: 'T\u00fcrk\u00e7e' },
  { code: 'ar', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
  { code: 'hi', name: 'Hindi', nativeName: '\u0939\u093f\u0928\u094d\u0926\u0940' },
  { code: 'ja', name: 'Japanese', nativeName: '\u65e5\u672c\u8a9e' },
  { code: 'ko', name: 'Korean', nativeName: '\ud55c\uad6d\uc5b4' },
  { code: 'zh', name: 'Chinese', nativeName: '\u4e2d\u6587' },
  { code: 'ru', name: 'Russian', nativeName: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
  { code: 'cs', name: 'Czech', nativeName: '\u010ce\u0161tina' },
  { code: 'el', name: 'Greek', nativeName: '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac' },
  { code: 'ro', name: 'Romanian', nativeName: 'Rom\u00e2n\u0103' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'th', name: 'Thai', nativeName: '\u0e44\u0e17\u0e22' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Ti\u1ebfng Vi\u1ec7t' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'uk', name: 'Ukrainian', nativeName: '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430' },
];

let currentLanguage = 'en';
let listeners: Array<() => void> = [];

function getDeviceLanguage(): string {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const code = locales[0].languageCode || 'en';
    if (translations[code]) return code;
    if (code === 'nb' || code === 'nn') return 'no';
    if (code === 'tl') return 'fil';
  }
  return 'en';
}

export async function initI18n(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && translations[saved]) {
      currentLanguage = saved;
    } else {
      currentLanguage = getDeviceLanguage();
    }
  } catch {
    currentLanguage = getDeviceLanguage();
  }
  return currentLanguage;
}

export async function setLanguage(code: string): Promise<void> {
  if (translations[code]) {
    currentLanguage = code;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    listeners.forEach(fn => fn());
  }
}

export function getLanguage(): string {
  return currentLanguage;
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}`
        : K
      : never
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<TranslationKeys>;

function getNestedValue(obj: any, path: string): string {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return path;
    current = current[part];
  }
  return typeof current === 'string' ? current : path;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = translations[currentLanguage] || translations.en;
  let value = getNestedValue(dict, key);
  if (value === key) {
    value = getNestedValue(translations.en, key);
  }
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return value;
}
