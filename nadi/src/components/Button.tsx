import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90 disabled:bg-ink-faint",
  secondary: "bg-pulse text-white hover:brightness-95 disabled:bg-ink-faint",
  ghost: "bg-transparent text-ink border border-line hover:bg-paper disabled:text-ink-faint",
  danger: "bg-critical text-white hover:brightness-95 disabled:bg-ink-faint",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
