import { cn, formatPercent } from "@/lib/utils";

interface BadgeProps {
  value: number;
  market?: 'TW' | 'US';
  size?: 'sm' | 'md' | 'lg';
  isPercent?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function Badge({ 
  value, 
  market = 'TW', 
  size = 'md', 
  isPercent = true,
  className,
  children
}: BadgeProps) {
  const isPositive = value > 0;
  const isZero = value === 0;

  const bgClasses = isZero ? "bg-[var(--bg-tertiary)] text-secondary"
    : market === 'TW'
      ? isPositive ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
      : isPositive ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20";

  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5 rounded",
    md: "text-xs px-2 py-1 rounded-md",
    lg: "text-sm px-2.5 py-1 rounded-md font-semibold"
  };

  const formattedValue = isPercent ? formatPercent(value) : (isPositive ? `+${value}` : value);

  return (
    <span className={cn("inline-flex items-center justify-center font-medium", bgClasses, sizes[size], className)}>
      {children ?? (isZero ? value : formattedValue)}
    </span>
  );
}
