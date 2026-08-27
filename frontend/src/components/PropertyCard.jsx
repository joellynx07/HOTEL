import { useState } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { formatDistance } from "../lib/geo";
import { formatCurrency } from "../lib/i18n";

export function PropertyCard({ listing, onSelect }) {
  const { t, locale } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <button
      onClick={() => onSelect(listing)}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-border bg-bg-elevated text-left transition-colors hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-inset">
        {!imageLoaded && <div className="absolute inset-0 skeleton-shimmer" />}
        {listing.coverImageUrl && (
          <img
            src={listing.coverImageUrl}
            alt={listing.name}
            className={`h-full w-full object-cover transition-opacity duration-300 group-hover:scale-[1.02] ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        )}

        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-sm bg-bg/90 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-fg backdrop-blur-sm">
            {listing.type === "hotel" ? t("discovery.filter_hotel").replace(/s$/, "") : t("discovery.filter_hostel").replace(/s$/, "")}
          </span>
          {listing.hasActiveOffer && (
            <span className="rounded-sm bg-accent px-2 py-1 text-[11px] font-medium text-accent-fg">
              {t("discovery.offer_badge")}
            </span>
          )}
        </div>

        {typeof listing.distanceKm === "number" && (
          <span className="absolute bottom-3 right-3 rounded-sm bg-bg/90 px-2 py-1 text-[11px] font-medium text-fg backdrop-blur-sm">
            {formatDistance(listing.distanceKm)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-medium leading-snug text-fg">{listing.name}</h3>
          {listing.starRating && <span className="shrink-0 text-[13px] text-fg-muted">{Number(listing.starRating).toFixed(1)}</span>}
        </div>

        {listing.tagline && <p className="line-clamp-2 text-[13px] text-fg-muted">{listing.tagline}</p>}
        <p className="mt-1 text-[13px] text-fg-subtle">{listing.city}</p>

        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-[14px] font-medium text-fg">
            {t("discovery.from_price", { price: formatCurrency(Number(listing.fromPrice), listing.currency, locale) })}
          </span>
        </div>
      </div>
    </button>
  );
}
