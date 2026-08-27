import { useEffect, useMemo, useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { useTranslation } from "../hooks/useTranslation";
import { sortByDistance } from "../lib/geo";
import { api } from "../api/client";
import { PropertyCard } from "../components/PropertyCard";
import { BookingModal } from "../components/BookingModal";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function DiscoveryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state: geo, request: retryGeolocation } = useGeolocation();

  const [listings, setListings] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [offersOnly, setOffersOnly] = useState(false);
  const [sortMode, setSortMode] = useState("distance");
  const [activeListing, setActiveListing] = useState(null);
  const [activeUnits, setActiveUnits] = useState([]);

  useEffect(() => {
    if (geo.phase !== "granted") return;
    setIsLoadingListings(true);
    api
      .get(`/api/properties/nearby?lat=${geo.coords.lat}&lng=${geo.coords.lng}&radiusKm=25`)
      .then(setListings)
      .catch((err) => console.error("Failed to load nearby properties", err))
      .finally(() => setIsLoadingListings(false));
  }, [geo]);

  async function searchByCity(city) {
    if (!city.trim()) return;
    setIsLoadingListings(true);
    try {
      setListings(await api.get(`/api/properties/search?city=${encodeURIComponent(city)}`));
    } finally {
      setIsLoadingListings(false);
    }
  }

  const withDistance = useMemo(() => {
    if (geo.phase === "granted") {
      return sortByDistance(geo.coords, listings.map((l) => ({ ...l, lat: l.lat, lng: l.lng })));
    }
    return listings.map((l) => ({ ...l, distanceKm: undefined }));
  }, [listings, geo]);

  const filtered = useMemo(() => {
    let result = withDistance.filter((l) => {
      if (typeFilter !== "all" && l.type !== typeFilter) return false;
      if (offersOnly && !l.hasActiveOffer) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortMode === "price_asc") return a.fromPrice - b.fromPrice;
      if (sortMode === "price_desc") return b.fromPrice - a.fromPrice;
      return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    });

    return result.sort((a, b) => Number(b.hasPremiumOffer) - Number(a.hasPremiumOffer));
  }, [withDistance, typeFilter, offersOnly, sortMode]);

  async function handleSelectListing(listing) {
    setActiveListing(listing);
    setActiveUnits(await api.get(`/api/properties/${listing.id}/inventory`));
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-10 flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-tight text-fg">Spynx</span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <Link
              to={user.role === "admin" ? "/admin/dashboard" : "/manager/dashboard"}
              className="text-[13px] font-medium text-fg-muted hover:text-fg"
            >
              {t("nav.dashboard")}
            </Link>
          ) : (
            <Link to="/sign-in" className="text-[13px] font-medium text-fg-muted hover:text-fg">
              {t("nav.sign_in")}
            </Link>
          )}
        </div>
      </header>

      <section className="mb-10">
        <h1 className="max-w-xl text-[32px] font-medium leading-[1.15] tracking-tight text-fg sm:text-[40px]">
          {t("discovery.headline")}
        </h1>
        <p className="mt-3 max-w-md text-[15px] text-fg-muted">{t("discovery.subhead")}</p>
      </section>

      {geo.phase === "requesting" && (
        <div className="mb-6 rounded-md border border-border bg-bg-elevated px-4 py-3 text-[13px] text-fg-muted">
          {t("discovery.locate_loading")}
        </div>
      )}
      {(geo.phase === "denied" || geo.phase === "unsupported" || geo.phase === "failed") && (
        <div className="mb-6 flex flex-col gap-3 rounded-md border border-border bg-bg-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-fg-muted">{t("discovery.locate_denied")}</p>
          <div className="flex gap-2">
            <input
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchByCity(citySearch)}
              placeholder={t("discovery.city_search_placeholder")}
              className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-[13px] text-fg outline-none focus:border-accent sm:w-64"
            />
            {geo.phase !== "unsupported" && (
              <button
                onClick={retryGeolocation}
                className="shrink-0 rounded-md border border-border-strong px-3 py-2 text-[13px] font-medium text-fg hover:bg-bg-inset"
              >
                {t("discovery.locate_prompt")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <FilterPill active={typeFilter === "all"} onClick={() => setTypeFilter("all")} label="All" />
        <FilterPill active={typeFilter === "hotel"} onClick={() => setTypeFilter("hotel")} label={t("discovery.filter_hotel")} />
        <FilterPill active={typeFilter === "hostel"} onClick={() => setTypeFilter("hostel")} label={t("discovery.filter_hostel")} />
        <FilterPill active={offersOnly} onClick={() => setOffersOnly((v) => !v)} label={t("discovery.filter_offers")} />

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          className="ml-auto rounded-md border border-border-strong bg-bg px-3 py-1.5 text-[13px] text-fg outline-none"
        >
          <option value="distance">{t("discovery.filter_distance")}</option>
          <option value="price_asc">{t("discovery.filter_price")} ↑</option>
          <option value="price_desc">{t("discovery.filter_price")} ↓</option>
        </select>
      </div>

      {isLoadingListings ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-lg skeleton-shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-fg-subtle">{t("discovery.no_results")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing) => (
            <PropertyCard key={listing.id} listing={listing} onSelect={handleSelectListing} />
          ))}
        </div>
      )}

      {activeListing && (
        <BookingModal
          propertyName={activeListing.name}
          contactPhone={activeListing.contactPhone}
          whatsappPhone={activeListing.whatsappPhone}
          units={activeUnits}
          onClose={() => setActiveListing(null)}
        />
      )}
    </main>
  );
}

function FilterPill({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-fg-muted hover:border-fg-subtle hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}
