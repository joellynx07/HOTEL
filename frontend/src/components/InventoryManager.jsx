import { useState } from "react";
import { api } from "../api/client";

const EMPTY_DRAFT = { label: "", capacity: 1, pricePerNight: "", currency: "USD", quantityTotal: 1 };

export function InventoryManager({ propertyId, propertyType, initialInventory }) {
  const [items, setItems] = useState(initialInventory);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const unitNoun = propertyType === "hotel" ? "Room type" : "Bed type";
  const unitType = propertyType === "hotel" ? "room" : "bed";

  async function handleAdd() {
    setError(null);
    const price = Number(draft.pricePerNight);
    if (!draft.label.trim()) {
      setError('Give this listing a name — e.g. "Deluxe Double" or "Dorm Bed, Bay 3".');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a price per night greater than zero.");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticItem = {
      id: tempId,
      unitType,
      label: draft.label.trim(),
      capacity: draft.capacity,
      pricePerNight: price.toFixed(2),
      currency: draft.currency,
      quantityTotal: draft.quantityTotal,
      quantityAvailable: draft.quantityTotal,
    };

    setItems((prev) => [...prev, optimisticItem]);
    setDraft(EMPTY_DRAFT);
    setIsSaving(true);

    try {
      const saved = await api.post("/api/manager/inventory", {
        propertyId,
        unitType,
        label: optimisticItem.label,
        capacity: optimisticItem.capacity,
        pricePerNight: price,
        currency: optimisticItem.currency,
        quantityTotal: optimisticItem.quantityTotal,
      });
      setItems((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
    } catch (err) {
      setItems((prev) => prev.filter((item) => item.id !== tempId));
      setError(err.message ?? "Couldn't save that — check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvailabilityChange(id, quantityAvailable) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantityAvailable } : item)));
    await api.patch(`/api/manager/inventory/${id}`, { quantityAvailable });
  }

  return (
    <section>
      <h2 className="mb-4 text-[15px] font-medium text-fg">Inventory</h2>

      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-border p-4">
        {items.length === 0 && <p className="text-[13px] text-fg-subtle">No {unitNoun.toLowerCase()}s yet — add your first one below.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
            <div>
              <p className="text-[14px] font-medium text-fg">{item.label}</p>
              <p className="text-[12px] text-fg-subtle">
                {item.currency} {item.pricePerNight} / night · sleeps {item.capacity}
              </p>
            </div>
            <label className="flex items-center gap-2 text-[12px] text-fg-muted">
              Available
              <input
                type="number"
                min={0}
                max={item.quantityTotal}
                value={item.quantityAvailable}
                onChange={(e) => handleAvailabilityChange(item.id, Number(e.target.value))}
                className="w-16 rounded-sm border border-border-strong bg-bg px-2 py-1 text-[13px] text-fg"
              />
              / {item.quantityTotal}
            </label>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border-strong p-4">
        <p className="mb-3 text-[13px] font-medium text-fg">Add {unitNoun.toLowerCase()}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            placeholder={propertyType === "hotel" ? "Deluxe Double" : "Dorm Bed, Bay 3"}
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            className="col-span-2 rounded-md border border-border-strong bg-bg px-3 py-2 text-[13px] text-fg sm:col-span-2"
          />
          <input
            type="number"
            min={1}
            placeholder="Sleeps"
            value={draft.capacity}
            onChange={(e) => setDraft((d) => ({ ...d, capacity: Number(e.target.value) }))}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-[13px] text-fg"
          />
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Price / night"
            value={draft.pricePerNight}
            onChange={(e) => setDraft((d) => ({ ...d, pricePerNight: e.target.value }))}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-[13px] text-fg"
          />
          <input
            type="number"
            min={1}
            placeholder="Quantity"
            value={draft.quantityTotal}
            onChange={(e) => setDraft((d) => ({ ...d, quantityTotal: Number(e.target.value) }))}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-[13px] text-fg"
          />
          <select
            value={draft.currency}
            onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-[13px] text-fg"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GHS">GHS</option>
            <option value="XOF">XOF</option>
          </select>
        </div>

        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}

        <button
          onClick={handleAdd}
          disabled={isSaving}
          className="mt-3 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : `Add ${unitNoun.toLowerCase()}`}
        </button>
      </div>
    </section>
  );
}
