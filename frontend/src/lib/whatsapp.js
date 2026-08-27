/**
 * src/lib/whatsapp.js
 * Generates wa.me deep links and tel: links for the booking modal.
 */

export function normalizePhoneForLink(rawPhone) {
  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

const TEMPLATES = {
  en: (ctx, dateRange) => [
    `Hi! I'd like to book "${ctx.unitLabel}" at ${ctx.propertyName}.`,
    dateRange ? `Dates: ${dateRange}.` : null,
    ctx.guestCount ? `Guests: ${ctx.guestCount}.` : null,
    "Is it available? Thank you!",
  ],
  fr: (ctx, dateRange) => [
    `Bonjour ! Je souhaite réserver "${ctx.unitLabel}" à ${ctx.propertyName}.`,
    dateRange ? `Dates : ${dateRange}.` : null,
    ctx.guestCount ? `Voyageurs : ${ctx.guestCount}.` : null,
    "Est-ce disponible ? Merci !",
  ],
  es: (ctx, dateRange) => [
    `¡Hola! Quisiera reservar "${ctx.unitLabel}" en ${ctx.propertyName}.`,
    dateRange ? `Fechas: ${dateRange}.` : null,
    ctx.guestCount ? `Huéspedes: ${ctx.guestCount}.` : null,
    "¿Está disponible? ¡Gracias!",
  ],
};

function formatDateRange(checkIn, checkOut, locale) {
  const localeTag = { en: "en-US", fr: "fr-FR", es: "es-ES" }[locale] ?? "en-US";
  const fmt = new Intl.DateTimeFormat(localeTag, { month: "short", day: "numeric" });
  return `${fmt.format(new Date(checkIn))} – ${fmt.format(new Date(checkOut))}`;
}

export function buildWhatsAppMessage(ctx, locale = "en") {
  const dateRange = ctx.checkIn && ctx.checkOut ? formatDateRange(ctx.checkIn, ctx.checkOut, locale) : null;
  return (TEMPLATES[locale] ?? TEMPLATES.en)(ctx, dateRange).filter(Boolean).join(" ");
}

export function buildWhatsAppLink(phone, ctx, locale = "en") {
  const normalized = normalizePhoneForLink(phone).replace(/^\+/, "");
  const message = buildWhatsAppMessage(ctx, locale);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildTelLink(phone) {
  return `tel:${normalizePhoneForLink(phone)}`;
}
