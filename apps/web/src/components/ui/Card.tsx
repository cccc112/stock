import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  variant?: "default" | "elevated" | "accent-border";
}

export default function Card({
  title,
  subtitle,
  children,
  className,
  headerAction,
  variant = "default",
}: CardProps) {
  return (
    <div
      className={cn(
        "glass-card overflow-hidden flex flex-col",
        variant === "elevated" && "bg-tertiary",
        variant === "accent-border" && "border-t-2 border-t-accent",
        className
      )}
    >
      {(title || headerAction) && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 px-3.5 py-3 sm:px-5 sm:py-4 border-b border-[var(--border)]">
          <div className="min-w-0">
            {title && (
              <h3 className="text-xs sm:text-sm font-semibold text-primary tracking-tight m-0 leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-secondary mt-1 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0 max-w-full overflow-x-auto no-scrollbar">
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className="p-3 sm:p-5 flex-1 min-w-0">{children}</div>
    </div>
  );
}
