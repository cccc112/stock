import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  variant?: 'default' | 'elevated' | 'accent-border';
}

export default function Card({ 
  title, 
  subtitle, 
  children, 
  className, 
  headerAction,
  variant = 'default' 
}: CardProps) {
  return (
    <div className={cn(
      "glass-card overflow-hidden flex flex-col",
      variant === 'elevated' && "shadow-lg bg-tertiary",
      variant === 'accent-border' && "border-t-2 border-t-accent",
      className
    )}>
      {(title || headerAction) && (
        <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
          <div>
            {title && <h3 className="font-semibold text-primary m-0">{title}</h3>}
            {subtitle && <p className="text-xs text-secondary mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-4 flex-1">
        {children}
      </div>
    </div>
  );
}
