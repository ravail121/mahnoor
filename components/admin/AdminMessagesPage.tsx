"use client";

import { useEffect, useState } from "react";

type MessageRow = {
  id: number;
  name: string;
  phone: string;
  message: string;
  status: "new" | "read" | "replied";
  created_at: string;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
] as const;

const STATUS_LABEL: Record<MessageRow["status"], string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
};

const STATUS_COLOR: Record<MessageRow["status"], string> = {
  new: "#8A6412",
  read: "#43566E",
  replied: "#256042",
};

function formatWhen(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export function AdminMessagesPage() {
  const [status, setStatus] = useState<string>("all");
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function loadMessages() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const response = await fetch(`/api/contact?${params.toString()}`);
      const payload = (await response.json()) as
        | ApiSuccess<MessageRow[]>
        | ApiFailure;
      setRows(parsePayload(payload));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load messages",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch-on-mount/filter-change, same pattern used by every other admin
    // list page in this app (AdminBookingsPage, AdminPatientsPage, ...).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function updateStatus(id: number, nextStatus: MessageRow["status"]) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<MessageRow>
        | ApiFailure;
      if (!payload.success) throw new Error(payload.error);
      setRows((prev) =>
        prev.map((row) => (row.id === id ? payload.data : row)),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update message",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Manage</div>
        <h1>Messages</h1>
      </div>

      <div className="filters">
        <div className="filter-tabs" role="tablist" aria-label="Message status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              className={`ftab ${status === tab.value ? "active" : ""}`}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <p className="table-empty">Loading messages...</p>
        ) : error ? (
          <p className="table-empty is-error">{error}</p>
        ) : rows.length === 0 ? (
          <p className="table-empty">No messages match the current filter.</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              padding: 20,
            }}
          >
            {rows.map((row) => (
              <div
                key={row.id}
                style={{
                  border: "1px solid rgba(61,92,72,0.12)",
                  borderRadius: 14,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--forest)" }}>
                      {row.name}
                    </strong>
                    <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                      {row.phone} · {formatWhen(row.created_at)}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: STATUS_COLOR[row.status],
                      flexShrink: 0,
                    }}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </div>

                <p
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: "var(--charcoal)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {row.message}
                </p>

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {row.status === "new" && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={updatingId !== null}
                      onClick={() => void updateStatus(row.id, "read")}
                    >
                      {updatingId === row.id ? "Saving..." : "Mark as read"}
                    </button>
                  )}
                  {row.status !== "replied" && (
                    <button
                      type="button"
                      className="btn sm"
                      disabled={updatingId !== null}
                      onClick={() => void updateStatus(row.id, "replied")}
                    >
                      {updatingId === row.id ? "Saving..." : "Mark as replied"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
