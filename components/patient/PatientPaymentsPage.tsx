"use client";

import { useEffect, useState, type FormEvent } from "react";

type PaymentMethod = "card" | "jazzcash" | "easypaisa" | "bank";

type SavedMethod = {
  id: number;
  method: PaymentMethod;
  label: string;
  account_hint: string | null;
  is_default: boolean;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

const METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "card", label: "Card" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "bank", label: "Bank transfer" },
];

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

function methodLabel(method: PaymentMethod) {
  return METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method;
}

export function PatientPaymentsPage() {
  const [methods, setMethods] = useState<SavedMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("jazzcash");
  const [accountHint, setAccountHint] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    void loadMethods();
  }, []);

  async function loadMethods() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/me/payment-methods");
      const payload = (await response.json()) as
        | ApiSuccess<SavedMethod[]>
        | ApiFailure;
      setMethods(parsePayload(payload));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load payment methods",
      );
    } finally {
      setLoading(false);
    }
  }

  async function addMethod(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/me/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          label,
          account_hint: accountHint,
          is_default: isDefault,
        }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<SavedMethod>
        | ApiFailure;
      parsePayload(payload);
      setLabel("");
      setAccountHint("");
      setIsDefault(false);
      setNotice("Payment method saved.");
      await loadMethods();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save payment method",
      );
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(id: number) {
    setError("");
    try {
      const response = await fetch(`/api/me/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<SavedMethod>
        | ApiFailure;
      parsePayload(payload);
      await loadMethods();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update payment method",
      );
    }
  }

  async function removeMethod(id: number) {
    if (!window.confirm("Remove this payment method?")) return;
    setError("");
    try {
      const response = await fetch(`/api/me/payment-methods/${id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as
        | ApiSuccess<{ deleted: boolean }>
        | ApiFailure;
      parsePayload(payload);
      setNotice("Payment method removed.");
      await loadMethods();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not remove payment method",
      );
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Account</div>
        <h1>Payment methods</h1>
        <p>Save JazzCash, EasyPaisa, card, or bank details for faster checkout.</p>
      </div>

      {notice ? <div className="pt-notice ok">{notice}</div> : null}
      {error ? <div className="pt-notice err">{error}</div> : null}

      <form className="pt-card pt-form" onSubmit={(event) => void addMethod(event)}>
        <h2>Add a method</h2>
        <label>
          Type
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          >
            {METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Label
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="My JazzCash"
            required
          />
        </label>
        <label>
          Number or last 4 digits
          <input
            value={accountHint}
            onChange={(event) => setAccountHint(event.target.value)}
            placeholder="03xx or 4242"
          />
        </label>
        <label className="pt-check">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
          />
          Set as default
        </label>
        <button type="submit" className="pt-btn" disabled={saving}>
          {saving ? "Saving..." : "Save method"}
        </button>
      </form>

      <h2 className="pt-section-title">Saved methods</h2>
      {loading ? (
        <div className="pt-loading">Loading payment methods...</div>
      ) : methods.length === 0 ? (
        <div className="pt-empty">
          <h2>No payment methods yet</h2>
          <p>Add one above so it is ready when you book.</p>
        </div>
      ) : (
        methods.map((item) => (
          <div key={item.id} className="pt-method-card">
            <div>
              <strong>{item.label}</strong>
              <div className="ph">
                {methodLabel(item.method)}
                {item.account_hint ? ` · ${item.account_hint}` : ""}
              </div>
            </div>
            <div className="pt-method-actions">
              {item.is_default ? (
                <span className="appt-status confirmed">Default</span>
              ) : (
                <button
                  type="button"
                  className="pt-btn ghost sm"
                  onClick={() => void makeDefault(item.id)}
                >
                  Make default
                </button>
              )}
              <button
                type="button"
                className="appt-cancel"
                onClick={() => void removeMethod(item.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}
