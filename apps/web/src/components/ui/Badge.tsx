import { cn, formatPercent } from "@/lib/utils";

interface BadgeProps {
  value: number;
  market?: "TW" | "US";
  size?: "sm" | "md" | "lg";
  isPercent?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function Badge({
  value,
  market = "TW",
  size = "md",
  isPercent = true,
  className,
  children,
}: BadgeProps) {
  const isPositive = value > 0;
  const isZero = value === 0;

  const bgClasses = isZero
    ? "bg-[var(--bg-tertiary)] text-secondary border border-[var(--border)]"
    : market === "TW"
      ? isPositive
        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      : isPositive
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        : "bg-rose-500/10 text-rose-400 border border-rose-500/20";

  const sizes = {
    sm: "text-[11px] px-2 py-0.5 rounded",
    md: "text-xs px-2.5 py-0.5 rounded-md",
    lg: "text-sm px-3 py-1 rounded-md font-semibold",
  };

  const formattedValue = isPercent
    ? formatPercent(value)
    : isPositive
      ? `+${value}`
      : `${value}`;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono tabular-nums font-medium whitespace-nowrap",
        bgClasses,
        sizes[size],
        className
      )}
    >
      {children ?? formattedValue}
    </span>
  );
}
