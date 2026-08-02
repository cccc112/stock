import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'chart' | 'table-row';
  className?: string;
}

export default function LoadingSkeleton({ variant = 'text', className }: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-[var(--bg-tertiary)] rounded-md";

  const variants = {
    text: "h-4 w-3/4",
    card: "h-32 w-full",
    chart: "h-[400px] w-full",
    'table-row': "h-12 w-full"
  };

  return (
    <div className={cn(baseClasses, variants[variant], className)} />
  );
}
