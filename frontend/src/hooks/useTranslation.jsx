/**
 * src/hooks/useTranslation.jsx
 * Client-side language provider. Switching locale updates state only —
 * no route change, no reload. Persists the choice to localStorage.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, loadDictionary, translate, resolveLocale } from "../lib/i18n";

const TranslationContext = createContext(null);
const STORAGE_KEY = "spynx_locale";

export function TranslationProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    return stored ?? resolveLocale(typeof navigator !== "undefined" ? navigator.language : null) ?? DEFAULT_LOCALE;
  });
  const [dict, setDict] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadDictionary(locale).then((loaded) => {
      if (!cancelled) {
        setDict(loaded);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((next) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback((key, vars) => translate(dict, key, vars), [dict]);

  const value = useMemo(() => ({ locale, dict, isLoading, setLocale, t }), [locale, dict, isLoading, setLocale, t]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error("useTranslation must be used within a TranslationProvider");
  return ctx;
}
