import { Loader2 } from "lucide-react";
import React from "react";

interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  className?: string;
}

export default function LoadingOverlay({ show, message = "Loading...", className = "" }: LoadingOverlayProps) {
  if (!show) return null;
  return (
    <div className={`absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm ${className}`} aria-live="polite" aria-busy>
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-foreground">{message}</span>
      </div>
    </div>
  );
}
