"use client";

import type { ReactNode } from "react";
import type { SessionType } from "@/lib/booking";
import { formatMoney } from "@/lib/booking";
import { siteConfig } from "@/lib/site-config";

type Props = {
  selected: SessionType | null;
  onSelect: (type: SessionType, label: string, payNow: number) => void;
  onNext: () => void;
};

const options: {
  type: SessionType;
  label: string;
  description: string;
  payNow: number;
  feeLabel: string;
  icon: ReactNode;
}[] = [
  {
    type: "in-person",
    label: "In-person Visit",
    description: siteConfig.clinic,
    payNow: siteConfig.inPersonReserveFee,
    feeLabel: `${formatMoney(siteConfig.inPersonReserveFee, siteConfig.currency)} to reserve, or ${formatMoney(siteConfig.consultationFee, siteConfig.currency)} in full`,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D5C48" strokeWidth="2">
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    type: "online",
    label: "Online Video Session",
    description: "From the comfort of your home",
    payNow: siteConfig.onlineFullFee,
    feeLabel: `Full payment ${formatMoney(siteConfig.onlineFullFee, siteConfig.currency)}`,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D5C48" strokeWidth="2">
        <path d="M23 7l-7 5 7 5V7Z" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    ),
  },
];

export function SessionTypeStep({ selected, onSelect, onNext }: Props) {
  return (
    <div className="animate-fade-up">
      <h2>How would you like to meet?</h2>
      <p className="sub">Choose whatever feels most comfortable for you.</p>
      <div className="type-grid">
        {options.map((opt) => (
          <button
            key={opt.type}
            type="button"
            className={`type-opt${selected === opt.type ? " selected" : ""}`}
            onClick={() => onSelect(opt.type, opt.label, opt.payNow)}
          >
            <div className="type-icon">{opt.icon}</div>
            <h3>{opt.label}</h3>
            <p>{opt.description}</p>
            <div className="type-fee">{opt.feeLabel}</div>
          </button>
        ))}
      </div>
      <div className="btn-row">
        <span />
        <button type="button" className="btn" disabled={!selected} onClick={onNext}>
          Continue →
        </button>
      </div>
    </div>
  );
}
