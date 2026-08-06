import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "light" | "whatsapp";

const variants: Record<Variant, string> = {
  primary:
    "bg-sage-deep text-cream hover:bg-forest disabled:opacity-45 disabled:hover:bg-sage-deep disabled:cursor-default",
  ghost:
    "bg-transparent text-sage-deep border-[1.5px] border-sage-deep/30 hover:bg-sage-soft",
  light: "bg-cream text-forest hover:bg-white",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1eb857]",
};

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  onClick?: never;
  disabled?: never;
  type?: never;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-[22px] py-3 font-sans text-[14.5px] font-semibold tracking-[0.01em] transition-[background,transform] duration-250 hover:-translate-y-px disabled:hover:translate-y-0";

export function Button(props: ButtonProps) {
  const { children, variant = "primary", className = "" } = props;
  const classes = `${base} ${variants[variant]} ${className}`.trim();

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...rest } = props as ButtonAsButton;
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
