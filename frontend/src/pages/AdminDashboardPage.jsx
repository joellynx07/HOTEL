import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ApprovalRow } from "../components/ApprovalRow";
import { SubscriptionRow } from "../components/SubscriptionRow";

export function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/admin/dashboard")
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-[13px] text-fg-subtle">Loading…</div>;
  }
  if (!data) return null;

  const { telemetry, pendingProperties, subscriptions } = data;
  const totalProperties = telemetry.hotels + telemetry.hostels;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-[24px] font-medium tracking-tight text-fg">Platform overview</h1>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total properties" value={totalProperties} />
        <StatCard label="Hotels" value={telemetry.hotels} />
        <StatCard label="Hostels" value={telemetry.hostels} />
        <StatCard label="Active subscriptions" value={telemetry.activeSubscriptions} />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-[15px] font-medium text-fg">
          Pending approvals {pendingProperties.length > 0 && `(${pendingProperties.length})`}
        </h2>
        {pendingProperties.length === 0 ? (
          <p className="text-[13px] text-fg-subtle">Nothing waiting on review.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {pendingProperties.map((property) => (
              <ApprovalRow key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-medium text-fg">Subscriptions &amp; access</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-border bg-bg-inset px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
            <span>Property</span>
            <span>Plan</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>
          {subscriptions.map((sub) => (
            <SubscriptionRow key={sub.id} subscription={sub} />
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-[24px] font-medium tabular-nums text-fg">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[12px] text-fg-muted">{label}</p>
    </div>
  );
}
