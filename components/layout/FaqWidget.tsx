"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { SiteIcon } from "@/components/ui/Icons";
import { formatMoney } from "@/lib/booking";
import {
  DOCTOR_ID,
  fetchAvailability,
  formatApiTime,
  formatDisplayDate,
} from "@/lib/booking-api";
import { addDays, formatDateInput } from "@/lib/schedule";
import { siteConfig } from "@/lib/site-config";

type ChatEntry = {
  id: string;
  question: string;
  answer: ReactNode;
  loading?: boolean;
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-0.5" aria-label="Typing">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sage-deep/50 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sage-deep/50 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sage-deep/50" />
    </div>
  );
}

type FaqItem = {
  id: string;
  question: string;
  keywords: string[];
  answer: () => ReactNode | Promise<ReactNode>;
};

async function loadNextSlots(): Promise<ReactNode> {
  const found: { label: string; times: string[] }[] = [];
  const today = new Date();

  for (let i = 0; i < 10 && found.length < 3; i++) {
    const iso = formatDateInput(addDays(today, i));
    try {
      const slots = await fetchAvailability(iso, { doctorId: DOCTOR_ID });
      if (slots.length > 0) {
        found.push({
          label: formatDisplayDate(iso),
          times: slots.slice(0, 4).map((slot) => formatApiTime(slot.time_slot)),
        });
      }
    } catch {
      // Skip a day we couldn't check and keep scanning.
    }
  }

  if (found.length === 0) {
    return (
      <>
        No open slots found in the next 10 days. Please check the{" "}
        <Link href="/booking" className="underline">
          booking page
        </Link>{" "}
        for more dates.
      </>
    );
  }

  return (
    <div>
      <p className="mb-2">Next open slots:</p>
      <ul className="space-y-1">
        {found.map((day) => (
          <li key={day.label}>
            <strong>{day.label}</strong> — {day.times.join(", ")}
          </li>
        ))}
      </ul>
      <Link href="/booking" className="mt-2 inline-block underline">
        Book now →
      </Link>
    </div>
  );
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "fees",
    question: "What are your fees?",
    keywords: ["fee", "cost", "charge", "price", "how much"],
    answer: () => (
      <>
        Consultation fee is {formatMoney(siteConfig.consultationFee, siteConfig.currency)}
        . For in-person visits you can reserve your slot with{" "}
        {formatMoney(siteConfig.inPersonReserveFee, siteConfig.currency)} by bank
        transfer (adjusted into the total), or pay the full amount at the clinic.
        Online sessions are paid in full at booking.
      </>
    ),
  },
  {
    id: "slots",
    question: "Do you have any slots open soon?",
    keywords: ["slot", "available", "availability", "next appointment", "book", "when can"],
    answer: () => loadNextSlots(),
  },
  {
    id: "timings",
    question: "What are your clinic timings?",
    keywords: ["timing", "hours", "what time", "clinic open"],
    answer: () => (
      <>
        We keep both daytime and evening slots. Exact available times are shown
        when you pick a date on the{" "}
        <Link href="/booking" className="underline">
          booking page
        </Link>
        .
      </>
    ),
  },
  {
    id: "location",
    question: "Where is the clinic located?",
    keywords: ["location", "address", "where is", "directions", "located"],
    answer: () => (
      <>
        {siteConfig.clinic}, {siteConfig.city}, {siteConfig.country}.{" "}
        <a
          href={siteConfig.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Get directions →
        </a>
      </>
    ),
  },
  {
    id: "payment",
    question: "How do I pay?",
    keywords: ["pay", "payment", "bank", "transfer", "account", "iban"],
    answer: () => (
      <>
        We currently accept bank transfer only. Full account details are shown
        securely during checkout when you book, along with WhatsApp instructions
        to confirm your payment.
      </>
    ),
  },
  {
    id: "privacy",
    question: "Is this confidential?",
    keywords: ["confidential", "private", "privacy", "anonymous", "secret"],
    answer: () => "Yes — every conversation and booking is 100% private and confidential.",
  },
];

function matchFaq(text: string): FaqItem | null {
  const q = text.toLowerCase();
  return FAQ_ITEMS.find((item) => item.keywords.some((k) => q.includes(k))) ?? null;
}

const GREETING: ChatEntry = {
  id: "greeting",
  question: "",
  answer:
    "Hi! Ask about fees, open slots, timings, or tap a question below.",
};

export function FaqWidget() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChatEntry[]>([GREETING]);
  const [inputValue, setInputValue] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const nextUnmatchedId = useRef(0);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  function upsert(
    id: string,
    question: string,
    answer: ReactNode,
    loading = false,
  ) {
    setEntries((prev) => {
      const withoutExisting = prev.filter((entry) => entry.id !== id);
      return [...withoutExisting, { id, question, answer, loading }];
    });
  }

  /** Shows the typing indicator for at least `minDelay`ms before revealing the answer. */
  async function respond(
    id: string,
    question: string,
    compute: () => ReactNode | Promise<ReactNode>,
  ) {
    setLoadingId(id);
    upsert(id, question, null, true);
    try {
      // Run the real lookup and a minimum-visible-time timer together, so the
      // typing indicator always shows briefly even for instant answers.
      const [answer] = await Promise.all([
        compute(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      upsert(id, question, answer);
    } finally {
      setLoadingId(null);
    }
  }

  async function ask(item: FaqItem, displayQuestion?: string) {
    await respond(item.id, displayQuestion ?? item.question, item.answer);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");

    const match = matchFaq(text);
    if (match) {
      await ask(match, text);
      return;
    }

    nextUnmatchedId.current += 1;
    await respond(`unmatched-${nextUnmatchedId.current}`, text, () => (
      <>
        I don&apos;t have an answer for that yet — try one of the buttons
        below, or{" "}
        <Link href="/contact" className="underline">
          contact us directly
        </Link>
        .
      </>
    ));
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[640px] w-[360px] max-h-[85vh] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-sage-deep/10 bg-white shadow-[0_20px_60px_-20px_rgba(44,70,54,0.35)]">
          <div className="flex items-center gap-3 border-b border-sage-deep/10 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-soft">
              <SiteIcon name="chat" size={18} />
            </div>
            <div>
              <p className="font-serif text-lg leading-tight text-forest">
                Quick answers
              </p>
              <p className="text-[11px] text-muted">
                For appointments &amp; general info — not for emergencies.
              </p>
            </div>
          </div>

          <div
            ref={transcriptRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-2">
                {entry.question ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-sage-deep px-3.5 py-2 text-sm text-white">
                      {entry.question}
                    </div>
                  </div>
                ) : null}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-cream-deep px-3.5 py-2 text-sm text-forest">
                    {entry.loading ? <TypingIndicator /> : entry.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-sage-deep/10 px-4 py-3">
            {FAQ_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void ask(item)}
                disabled={loadingId !== null}
                className="rounded-full border border-sage-deep/20 px-3 py-1.5 text-xs font-semibold text-forest transition hover:bg-sage-soft disabled:opacity-50"
              >
                {item.question}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="flex items-center gap-2 border-t border-sage-deep/10 px-4 py-3"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Type a question…"
              className="flex-1 rounded-full border border-sage-deep/20 px-3.5 py-2 text-sm text-forest outline-none focus:border-sage-deep"
            />
            <button
              type="submit"
              className="rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest"
            >
              Send
            </button>
          </form>

          <div className="border-t border-sage-deep/10 px-5 py-2 text-center text-xs text-muted">
            Didn&apos;t find it?{" "}
            <Link href="/contact" className="text-sage-deep underline">
              Contact us →
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close quick answers" : "Open quick answers"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_12px_30px_-8px_rgba(44,70,54,0.4)] transition hover:scale-105"
      >
        {open ? (
          <span className="text-2xl text-forest">×</span>
        ) : (
          <SiteIcon name="chat" size={24} />
        )}
      </button>
    </div>
  );
}
