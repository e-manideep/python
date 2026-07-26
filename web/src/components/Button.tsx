import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-700 disabled:bg-ink-300",
  secondary: "bg-teal text-white hover:bg-teal-light disabled:bg-ink-300",
  ghost: "bg-transparent text-ink border border-line hover:bg-paper disabled:text-ink-300",
  danger: "bg-rose text-white hover:opacity-90 disabled:bg-ink-300",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", disabled, children, ...rest }: Props) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
