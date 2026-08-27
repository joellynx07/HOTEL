import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const TOS_VERSION = "2026-01";

export function ManagerOnboardingPage() {
  const navigate = useNavigate();
  const [propertyType, setPropertyType] = useState(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [acceptedRevenue, setAcceptedRevenue] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    propertyType && name.trim() && city.trim() && countryCode.trim() && contactPhone.trim() && acceptedTos && acceptedRevenue;

  async function handleSubmit() {
    if (!canSubmit) {
      setError("Fill in every field and accept both agreements to continue.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/api/manager/onboarding", {
        type: propertyType,
        name: name.trim(),
        city: city.trim(),
        countryCode: countryCode.trim().toUpperCase(),
        contactPhone: contactPhone.trim(),
        tosVersion: TOS_VERSION,
      });
      navigate("/manager/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-[24px] font-medium tracking-tight text-fg">List your property</h1>
      <p className="mb-8 text-[13px] text-fg-muted">
        Takes about five minutes. You can add rooms, photos, and pricing after this step.
      </p>

      <fieldset className="mb-6">
        <legend className="mb-2 text-[13px] font-medium text-fg">What are you listing?</legend>
        <div className="grid grid-cols-2 gap-3">
          {["hotel", "hostel"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPropertyType(type)}
              className={`rounded-md border px-4 py-3 text-left text-[13px] font-medium capitalize transition-colors ${
                propertyType === type ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-fg-muted hover:border-fg-subtle"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mb-6 flex flex-col gap-3">
        <Field label="Property name" value={name} onChange={setName} placeholder="e.g. Harborview Inn" />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="City" value={city} onChange={setCity} placeholder="Accra" />
          </div>
          <Field label="Country code" value={countryCode} onChange={setCountryCode} placeholder="GH" maxLength={2} />
        </div>
        <Field label="Contact phone (used for guest WhatsApp/calls)" value={contactPhone} onChange={setContactPhone} placeholder="+233 20 000 0000" />
      </div>

      <div className="mb-6 flex flex-col gap-2.5">
        <Checkbox checked={acceptedTos} onChange={setAcceptedTos} label="I accept the Terms of Service" />
        <Checkbox checked={acceptedRevenue} onChange={setAcceptedRevenue} label="I accept the Revenue Agreement" />
      </div>

      {error && <p className="mb-4 text-[13px] text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full rounded-md bg-accent px-4 py-3 text-[14px] font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isSubmitting ? "Setting up your dashboard…" : "Continue"}
      </button>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, maxLength }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-fg-muted">{label}</span>
      <input
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-[13px] text-fg outline-none focus:border-accent"
      />
    </label>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-fg">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-accent" />
      {label}
    </label>
  );
}
