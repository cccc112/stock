"use client";

import { useEffect, useState } from "react";

export default function TopBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleString('zh-TW', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="top-bar">
      <div className="flex items-center gap-2">
        {/* Mobile menu trigger could go here */}
      </div>
      <div className="text-sm text-secondary font-mono">
        {time}
      </div>
    </div>
  );
}
