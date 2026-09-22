import type { ReactNode } from "react";

type IconName =
  | "lock"
  | "shield"
  | "video"
  | "heart"
  | "calendar"
  | "comfort"
  | "doc"
  | "pin"
  | "chat"
  | "clock";

const stroke = "#3D5C48";

export function SiteIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  const icons: Record<IconName, ReactNode> = {
    lock: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    shield: <path d="M12 2 3 7v6c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7l-9-5Z" />,
    video: (
      <>
        <path d="M23 7l-7 5 7 5V7Z" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </>
    ),
    heart: (
      <path d="M12 21s-7-4.6-9.3-9A5.6 5.6 0 0 1 12 6.4 5.6 5.6 0 0 1 21.3 12C19 16.4 12 21 12 21Z" />
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </>
    ),
    comfort: (
      <>
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        <path d="M8 12h.01M12 12h.01M16 12h.01" />
      </>
    ),
    doc: (
      <>
        <path d="M8 12h8M8 8h8M8 16h5" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </>
    ),
    pin: (
      <>
        <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    chat: <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      aria-hidden
    >
      {icons[name]}
    </svg>
  );
}

export function LockIcon({ size = 15 }: { size?: number }) {
  return <SiteIcon name="lock" size={size} />;
}
