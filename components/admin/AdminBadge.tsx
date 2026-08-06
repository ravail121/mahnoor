import { formatTimeDisplay } from "@/lib/schedule";

const statusClasses = {
  tentative: "bg-[#FFF3D9] text-[#8A6412]",
  confirmed: "bg-sage-soft text-sage-deep",
  completed: "bg-[#DDEEE1] text-[#256042]",
  cancelled: "bg-[#F2E4E4] text-[#8C4646]",
} as const;

const paymentClasses = {
  unpaid: "bg-[#FFF3D9] text-[#8A6412]",
  paid: "bg-[#DDEEE1] text-[#256042]",
  refunded: "bg-[#E6ECF3] text-[#43566E]",
} as const;

export function BookingStatusBadge({
  status,
}: {
  status: keyof typeof statusClasses;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
}: {
  status: keyof typeof paymentClasses;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${paymentClasses[status]}`}
    >
      {status}
    </span>
  );
}

export function SessionTypeBadge({
  sessionType,
}: {
  sessionType: "in_person" | "online";
}) {
  const label = sessionType === "in_person" ? "In-person" : "Online";
  return (
    <span className="inline-flex rounded-full bg-cream-deep px-3 py-1 text-xs font-semibold text-forest">
      {label}
    </span>
  );
}

export function TimeText({ value }: { value: Date }) {
  return (
    <span className="font-medium text-forest">{formatTimeDisplay(value)}</span>
  );
}
