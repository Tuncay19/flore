import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { az, ru, en, type Key } from "./locales";
import { ApiError } from "./api";

export type Lang = "az" | "ru" | "en";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "az", label: "AZ" },
  { id: "ru", label: "RU" },
  { id: "en", label: "EN" },
];

const dicts: Record<Lang, Record<Key, string>> = { az, ru, en };
const LOCALES: Record<Lang, string> = { az: "az-AZ", ru: "ru-RU", en: "en-GB" };

export type TFn = (key: Key, vars?: Record<string, string | number>) => string;

type LangState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
  locale: string;
  flower: (f: { id: number; name: string }) => string;
  formatDate: (iso: string) => string;
};

const LangCtx = createContext<LangState | null>(null);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "az" || saved === "ru" || saved === "en") return saved;
  } catch {
    /* localStorage bağlıdırsa, standart dil */
  }
  return "az";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback<TFn>(
    (key, vars) => {
      let text: string = dicts[lang][key] ?? az[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value));
        }
      }
      return text;
    },
    [lang],
  );

  // Gülün adı: tərcümə varsa o, yoxsa data.ts-dəki ad
  const flower = useCallback(
    (f: { id: number; name: string }) => {
      const key = `flower.${f.id}` as Key;
      return dicts[lang][key] ?? f.name;
    },
    [lang],
  );

  const locale = LOCALES[lang];
  const formatDate = useCallback(
    (iso: string) => {
      // Backend UTC vaxtı "Z"-siz göndərə bilər, ona görə Z əlavə edirik
      const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z");
      return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
    },
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t("meta.title");
  }, [lang, t]);

  const value = useMemo(
    () => ({ lang, setLang, t, locale, flower, formatDate }),
    [lang, setLang, t, locale, flower, formatDate],
  );
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang(): LangState {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("LanguageProvider tapılmadı (main.tsx-ə bax)");
  return ctx;
}

// Backend yalnız Azərbaycan dilində xəta mətni qaytarır; bildiyimiz mətnləri seçilmiş dilə çeviririk.
const KNOWN: Record<string, Key> = {
  "E-poçt və ya parol yanlışdır": "err.badLogin",
  "Bu e-poçt artıq qeydiyyatdan keçib": "err.emailTaken",
  "Google tokeni yanlışdır": "err.googleToken",
  "Google e-poçtu təsdiqlənməyib": "err.googleUnverified",
  "Token yanlışdır və ya vaxtı bitib": "err.session",
  "Məhsul tapılmadı": "err.productNotFound",
};

export function errorMessage(err: unknown, t: TFn): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return t("err.network");
    if (err.status === 422) return t("err.validation");
    const key = KNOWN[err.message];
    if (key) return t(key);
    return err.message || t("err.generic");
  }
  return t("err.generic");
}
