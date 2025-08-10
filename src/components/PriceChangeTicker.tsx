import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceChangeTickerProps {
  initial: number; // starting changePercent value
  className?: string;
}

// A lightweight client-side visual ticker that simulates minor price changes
// and flashes color/icons accordingly. Purely visual; does not affect data.
export function PriceChangeTicker({ initial, className = "" }: PriceChangeTickerProps) {
  // Ensure initial is a valid number, default to 0 if undefined/null
  const safeInitial = typeof initial === 'number' && !isNaN(initial) ? initial : 0;
  const [value, setValue] = useState<number>(safeInitial);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const timerRef = useRef<number | null>(null);

  const isPositive = value >= 0;

  useEffect(() => {
    // Randomize interval a bit to avoid synchronized flashing
    const tick = () => {
      const delta = (Math.random() - 0.5) * 0.3; // -0.15% to +0.15%
      setValue((prev) => {
        const next = Math.max(-99.99, Math.min(99.99, prev + delta));
        setFlash(delta >= 0 ? "up" : "down");
        window.setTimeout(() => setFlash(null), 500);
        return next;
      });
      const nextTimeout = 1800 + Math.random() * 1500; // 1.8s - 3.3s
      timerRef.current = window.setTimeout(tick, nextTimeout);
    };

    const firstTimeout = 1200 + Math.random() * 800;
    timerRef.current = window.setTimeout(tick, firstTimeout);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const formatted = useMemo(() => {
    // Ensure value is a valid number before calling toFixed
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    const sign = safeValue > 0 ? "+" : safeValue < 0 ? "" : "";
    return `${sign}${safeValue.toFixed(2)}%`;
  }, [value]);

  return (
    <div
      className={[
        "flex items-center gap-1",
        isPositive ? "text-success" : "text-destructive",
        flash === "up" ? "animate-price-tick-up" : "",
        flash === "down" ? "animate-price-tick-down" : "",
        className,
      ].join(" ")}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span className="text-xs">{formatted}</span>
    </div>
  );
}

export default PriceChangeTicker;
