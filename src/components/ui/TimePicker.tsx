"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (val: string) => void;
  disabled?: boolean;
}

export default function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [h, m] = value.split(":");
  const hour24 = parseInt(h);
  const hour12 = hour24 % 12 || 12;
  const ampm = hour24 >= 12 ? "PM" : "AM";

  const handleUpdate = (newH12: string, newM: string, newAmpm: string) => {
    let h24 = parseInt(newH12);
    if (newAmpm === "PM" && h24 < 12) h24 += 12;
    if (newAmpm === "AM" && h24 === 12) h24 = 0;
    onChange(`${h24.toString().padStart(2, "0")}:${newM}`);
  };

  return (
    <div className={cn("flex items-center gap-1.5 p-1 rounded-md border bg-white dark:bg-zinc-900 dark:border-zinc-800 transition-colors", disabled && "opacity-50 pointer-events-none")}>
      <Clock className="h-3.5 w-3.5 ml-1 text-gray-400 dark:text-zinc-500" />
      <select 
        value={hour12.toString().padStart(2, "0")} 
        onChange={(e) => handleUpdate(e.target.value, m, ampm)}
        className="appearance-none bg-transparent outline-none text-xs font-medium text-gray-700 dark:text-zinc-200 cursor-pointer"
      >
        {Array.from({ length: 12 }, (_, i) => {
          const val = (i + 1).toString().padStart(2, "0");
          return <option key={val} value={val} className="dark:bg-zinc-800">{val}</option>;
        })}
      </select>
      <span className="text-gray-400 font-bold">:</span>
      <select 
        value={m} 
        onChange={(e) => handleUpdate(hour12.toString(), e.target.value, ampm)}
        className="appearance-none bg-transparent outline-none text-xs font-medium text-gray-700 dark:text-zinc-200 cursor-pointer"
      >
        {["00", "15", "30", "45"].map((val) => (
          <option key={val} value={val} className="dark:bg-zinc-800">{val}</option>
        ))}
      </select>
      <select 
        value={ampm} 
        onChange={(e) => handleUpdate(hour12.toString(), m, e.target.value)}
        className="appearance-none bg-transparent outline-none text-[10px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer ml-1"
      >
        <option value="AM" className="dark:bg-zinc-800">AM</option>
        <option value="PM" className="dark:bg-zinc-800">PM</option>
      </select>
    </div>
  );
}