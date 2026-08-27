/**
 * src/lib/i18n.js
 * Minimal dependency-free translation lookup for nested JSON dictionaries.
 */

export const SUPPORTED_LOCALES = ["en", "fr", "es"];
export const DEFAULT_LOCALE = "en";

export function translate(dict, key, vars) {
  const parts = key.split(".");
  let node = dict;

  for (const part of parts) {
    if (typeof node !== "object" || node === null || !(part in node)) {
      return key; // visible fallback — easier to spot missing keys in QA
    }
    node = node[part];
  }

  if (typeof node !== "string") return key;
  if (!vars) return node;

  return node.replace(/\{(\w+)\}/g, (match, varName) => (varName in vars ? String(vars[varName]) : match));
}

const LOADERS = {
  en: () => import("../locales/en.json"),
  fr: () => import("../locales/fr.json"),
  es: () => import("../locales/es.json"),
};

export async function loadDictionary(locale) {
  const loader = LOADERS[locale] ?? LOADERS.en;
  const mod = await loader();
  return mod.default;
}

export function resolveLocale(input) {
  if (!input) return DEFAULT_LOCALE;
  const normalized = input.slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : DEFAULT_LOCALE;
}

export function formatCurrency(amount, currency, locale) {
  const localeTag = { en: "en-US", fr: "fr-FR", es: "es-ES" }[locale] ?? "en-US";
  return new Intl.NumberFormat(localeTag, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
