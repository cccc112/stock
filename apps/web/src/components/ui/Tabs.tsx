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
      <div className="flex border-b border-[var(--border)] gap-6 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSelect(tab.id)}
            className={cn(
              "pb-3 text-sm font-medium whitespace-nowrap transition-colors relative cursor-pointer",
              activeTab === tab.id
                ? "text-primary font-semibold"
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
      <div className="pt-5 flex-1">{currentTab?.content}</div>
    </div>
  );
}
