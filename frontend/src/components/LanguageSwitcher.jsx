import { useTranslation } from "../hooks/useTranslation";
import { SUPPORTED_LOCALES } from "../lib/i18n";

const LABELS = { en: "EN", fr: "FR", es: "ES" };

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5" role="group" aria-label={t("common.language")}>
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          className={`rounded-sm px-2.5 py-1 text-[12px] font-medium transition-colors ${
            locale === code ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg"
          }`}
          aria-pressed={locale === code}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
