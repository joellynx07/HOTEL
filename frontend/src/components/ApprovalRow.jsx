import { useState } from "react";
import { api } from "../api/client";

export function ApprovalRow({ property }) {
  const [status, setStatus] = useState("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function decide(decision) {
    setIsSubmitting(true);
    try {
      await api.post(`/api/admin/properties/${property.id}/review`, { decision });
      setStatus(decision === "approve" ? "approved" : "rejected");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status !== "pending") {
    return (
      <div className="flex items-center justify-between border-b border-border px-4 py-3 text-[13px] last:border-0">
        <span className="text-fg-muted">{property.name}</span>
        <span className={status === "approved" ? "text-green-700" : "text-red-700"}>
          {status === "approved" ? "Approved" : "Rejected"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0">
      <div>
        <p className="text-[13px] font-medium text-fg">
          {property.name} <span className="font-normal text-fg-subtle">· {property.type} · {property.city}, {property.countryCode}</span>
        </p>
        <p className="text-[12px] text-fg-subtle">{property.ownerEmail}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => decide("reject")}
          disabled={isSubmitting}
          className="rounded-md border border-border-strong px-3 py-1.5 text-[12px] font-medium text-fg-muted hover:bg-bg-inset disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => decide("approve")}
          disabled={isSubmitting}
          className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
