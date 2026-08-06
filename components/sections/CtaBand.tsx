import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  description?: string;
  buttonLabel: string;
  buttonHref?: string;
  children?: ReactNode;
};

export function CtaBand({
  title,
  description,
  buttonLabel,
  buttonHref = "/booking",
  children,
}: Props) {
  return (
    <div className="cta-band">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children ?? (
        <Link href={buttonHref} className="btn light">
          {buttonLabel}
        </Link>
      )}
    </div>
  );
}
