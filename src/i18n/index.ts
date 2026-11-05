import { en, type MessageKey } from "./en";
import { es } from "./es";

export type { MessageKey };
export type Language = "en" | "es";

const LANGUAGE_KEY = "sargeLanguage";
const dictionaries: Record<Language, Record<MessageKey, string>> = { en, es };

// A choice made with the switch wins; otherwise a Spanish browser starts in
// Spanish and everyone else in English.
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === "en" || saved === "es") return saved;
  } catch {
    // No storage: fall back to the browser's language.
  }

  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

let current: Language = initialLanguage();

export function getLanguage(): Language {
  return current;
}

// Texts are ours and may hold markup; anything the user typed must be
// escaped by the caller before it goes in.
export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  return dictionaries[current][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export function setLanguage(language: Language): void {
  current = language;

  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Not remembered, but the app still switches.
  }
}
