import * as React from "react";
import { cn } from "../utils";

interface RecordingIndicatorProps {
  isRecording: boolean;
  volume: number;
  duration: number;
  className?: string;
}

export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({
  isRecording,
  volume,
  duration,
  className,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isRecording) return null;

  return (
    <div className={cn("flex items-center gap-3 px-3 py-2 bg-red-50 rounded-lg border border-red-200", className)}>
      <div className="flex items-end gap-0.5 h-6">
        {[...Array(5)].map((_, i) => {
          const threshold = (i + 1) * 20;
          const isActive = volume >= threshold;
          const height = 8 + i * 4;
          return (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-75",
                isActive ? "bg-red-500" : "bg-red-200"
              )}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
      <div className="relative">
        <div className="w-3 h-3 bg-red-500 rounded-full" />
        <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
      </div>
      <span className="text-sm font-mono text-red-700 min-w-[48px]">
        {formatTime(duration)}
      </span>
      <span className="text-xs text-red-500">
        {volume < 10 ? "Silence détecté..." : "Parlez..."}
      </span>
    </div>
  );
};

RecordingIndicator.displayName = "RecordingIndicator";
