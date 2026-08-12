import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className, 
  disabled,
  ...props 
}: ButtonProps) {
  
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-accent text-white hover:brightness-110",
    secondary: "bg-[var(--bg-tertiary)] text-primary hover:bg-[var(--border)] border border-[var(--border)]",
    danger: "bg-danger text-white hover:bg-red-600",
    ghost: "bg-transparent text-secondary hover:text-primary hover:bg-[var(--bg-tertiary)]"
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3"
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
