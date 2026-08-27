import { useState } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { buildTelLink, buildWhatsAppLink } from "../lib/whatsapp";
import { formatCurrency } from "../lib/i18n";

export function BookingModal({ propertyName, contactPhone, whatsappPhone, units, onClose }) {
  const { t, locale } = useTranslation();
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id ?? "");

  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? units[0];

  const whatsappHref = selectedUnit
    ? buildWhatsAppLink(whatsappPhone, { propertyName, unitLabel: selectedUnit.label }, locale)
    : "#";
  const telHref = buildTelLink(contactPhone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-xl border border-border bg-bg-elevated p-6 shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-lg font-medium text-fg">{t("booking_modal.title", { property_name: propertyName })}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-sm p-1 text-fg-subtle transition-colors hover:bg-bg-inset hover:text-fg">
            ✕
          </button>
        </div>
        <p className="mb-5 text-[13px] text-fg-muted">{t("booking_modal.subtitle")}</p>

        {units.length > 1 && (
          <div className="mb-5">
            <p className="mb-2 text-[13px] font-medium text-fg">{t("booking_modal.select_unit")}</p>
            <div className="flex flex-col gap-2">
              {units.map((unit) => (
                <label
                  key={unit.id}
                  className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 text-[13px] transition-colors ${
                    selectedUnitId === unit.id ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="unit"
                      value={unit.id}
                      checked={selectedUnitId === unit.id}
                      onChange={() => setSelectedUnitId(unit.id)}
                      className="accent-accent"
                    />
                    {unit.label}
                  </span>
                  <span className="text-fg-muted">{formatCurrency(Number(unit.pricePerNight), unit.currency, locale)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("booking_modal.whatsapp_cta")}
          </a>
          <a
            href={telHref}
            className="flex items-center justify-center gap-2 rounded-md border border-border-strong px-4 py-3 text-[14px] font-medium text-fg transition-colors hover:bg-bg-inset"
          >
            {t("booking_modal.call_cta")}
          </a>
        </div>

        <p className="mt-4 text-center text-[12px] leading-relaxed text-fg-subtle">{t("booking_modal.disclaimer")}</p>
      </div>
    </div>
  );
}
