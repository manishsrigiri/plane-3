"use client";

import { cn } from "@plane/utils";

type Props = {
  completed: number;
  total: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
};

export const ProgressBar = ({ completed, total, className, showLabel = true, size = "sm" }: Props) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const trackHeight = size === "sm" ? "h-1.5" : "h-2";
  const fillColor =
    pct === 100
      ? "bg-green-500"
      : pct >= 66
        ? "bg-blue-500"
        : pct >= 33
          ? "bg-orange-400"
          : "bg-custom-border-300";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 rounded-full bg-custom-background-80", trackHeight)}>
        <div
          className={cn("rounded-full transition-all duration-300", trackHeight, fillColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="flex-shrink-0 text-xs text-custom-text-300 tabular-nums w-8 text-right">
          {pct}%
        </span>
      )}
    </div>
  );
};
