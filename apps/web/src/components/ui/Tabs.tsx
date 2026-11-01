"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, defaultTab, activeTab: controlledTab, onTabChange, className }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id);
  const activeTab = controlledTab ?? internalTab;

  const handleSelect = (id: string) => {
    setInternalTab(id);
    onTabChange?.(id);
  };

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <div className="flex border-b border-[var(--border)] gap-3 sm:gap-6 overflow-x-auto hide-scrollbar no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSelect(tab.id)}
            className={cn(
              "pb-2.5 sm:pb-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-all active:scale-95 relative cursor-pointer px-1",
              activeTab === tab.id
                ? "text-accent font-semibold"
                : "text-secondary hover:text-primary"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[var(--accent)] rounded-t-full" />
            )}
          </button>
        ))}
      </div>
      <div key={activeTab} className="pt-4 sm:pt-5 flex-1 min-w-0 animate-fade-in">{currentTab?.content}</div>
    </div>
  );
}
