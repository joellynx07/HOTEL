import { useState } from "react";
import { api } from "../api/client";

const STATUS_STYLES = { active: "text-green-700", trialing: "text-fg-muted", past_due: "text-amber-700", revoked: "text-red-700" };

export function SubscriptionRow({ subscription }) {
  const [status, setStatus] = useState(subscription.status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function toggleAccess() {
    const nextAction = status === "revoked" ? "grant" : "revoke";
    const reason = nextAction === "revoke" ? window.prompt("Reason for revoking access (shown in the audit log):") : null;
    if (nextAction === "revoke" && reason === null) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/api/admin/subscriptions/${subscription.id}`, { action: nextAction, reason });
      setStatus(nextAction === "revoke" ? "revoked" : "active");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border px-4 py-3 text-[13px] last:border-0">
      <div>
        <p className="font-medium text-fg">{subscription.propertyName}</p>
        <p className="text-[12px] capitalize text-fg-subtle">{subscription.propertyType}</p>
      </div>
      <span className="capitalize text-fg-muted">{subscription.plan}</span>
      <span className={`capitalize ${STATUS_STYLES[status]}`}>{status.replace("_", " ")}</span>
      <button
        onClick={toggleAccess}
        disabled={isSubmitting}
        className={`justify-self-end rounded-md border px-3 py-1.5 text-[12px] font-medium disabled:opacity-50 ${
          status === "revoked" ? "border-accent text-accent hover:bg-accent-soft" : "border-red-300 text-red-700 hover:bg-red-50"
        }`}
      >
        {status === "revoked" ? "Grant access" : "Revoke access"}
      </button>
    </div>
  );
}
