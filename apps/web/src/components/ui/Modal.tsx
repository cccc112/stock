"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export default function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      <div className={cn(
        "relative z-10 glass-card w-full max-w-md mx-4 animate-slide-up bg-[var(--bg-secondary)] shadow-2xl",
        className
      )}>
        <div className="flex justify-between items-center mb-4 border-b border-[var(--border)] pb-4 p-4">
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          <button 
            onClick={onClose}
            className="text-secondary hover:text-white transition-colors p-1 rounded-md hover:bg-[var(--bg-tertiary)]"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
