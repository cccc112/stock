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
  className?: string;
}

export default function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <div className="flex border-b border-[var(--border)] gap-6 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
