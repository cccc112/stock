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
        <div className="flex justify-between items-center gap-4 px-5 py-4 border-b border-[var(--border)]">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-primary tracking-tight m-0">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-secondary mt-1 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}
