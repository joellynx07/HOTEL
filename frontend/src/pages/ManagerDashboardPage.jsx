import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { InventoryManager } from "../components/InventoryManager";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  active: "bg-green-100 text-green-800 border-green-300",
  suspended: "bg-red-100 text-red-800 border-red-300",
};

export function ManagerDashboardPage() {
  const [data, setData] = useState(null); // { property, subscription, inventory }
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/manager/dashboard")
      .then(setData)
      .catch((err) => {
        if (err.message.includes("No property")) setNeedsOnboarding(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-[13px] text-fg-subtle">Loading…</div>;
  }
  if (needsOnboarding) return <Navigate to="/manager/onboarding" replace />;
  if (!data) return null;

  const { property, subscription, inventory } = data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-medium tracking-tight text-fg">{property.name}</h1>
          <p className="text-[13px] text-fg-muted">
            {property.type === "hotel" ? "Hotel" : "Hostel"} · {subscription?.plan ?? "standard"} plan
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[12px] font-medium ${STATUS_STYLES[property.status] ?? "border-border text-fg-muted"}`}>
          {property.status === "pending" ? "Pending review" : property.status === "active" ? "Live" : "Access suspended"}
        </span>
      </div>

      {property.status === "pending" && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Your listing is under review. You can still set up inventory — it'll go live the moment our team approves it.
        </div>
      )}
      {subscription?.status === "revoked" && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          Platform access is currently suspended pending your commission payment. Your listing is hidden from guests.
        </div>
      )}

      <InventoryManager propertyId={property.id} propertyType={property.type} initialInventory={inventory} />
    </main>
  );
}
