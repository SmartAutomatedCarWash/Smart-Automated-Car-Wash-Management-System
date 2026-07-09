import { create } from "zustand";

export type Language = "vi" | "en";
const LANGUAGE_STORAGE_KEY = "aura-lang";
export const DEFAULT_LANGUAGE: Language = "en";

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  hydrateLanguage: () => void;
}

function isLanguage(value: string | null): value is Language {
  return value === "vi" || value === "en";
}

function syncDocumentLanguage(lang: Language) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: DEFAULT_LANGUAGE,
  setLanguage: (lang: Language) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
    syncDocumentLanguage(lang);
    set({ language: lang });
  },
  hydrateLanguage: () => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const nextLanguage = isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
    if (!isLanguage(stored)) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    }
    syncDocumentLanguage(nextLanguage);
    set({ language: nextLanguage });
  },
}));

// Translation helper
export function translate(arg1: any, arg2: any, arg3?: any): string {
  if (arg1 === "vi") return arg2;
  if (arg1 === "en") return arg3;
  if (arg3 === "vi") return arg1;
  if (arg3 === "en") return arg2;
  
  // Default fallback
  return arg2;
}
