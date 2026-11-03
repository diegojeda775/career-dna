"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
// Placeholders mark where ads go before AdSense is set up: always in dev, and in a deployed
// build when NEXT_PUBLIC_AD_PLACEHOLDERS=true
const PLACEHOLDERS = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_AD_PLACEHOLDERS === "true";

// A fixed-size AdSense unit. `minWidth`/`maxWidth` (screen px) keep it from loading where it
// doesn't fit, since AdSense errors on (and doesn't fill) hidden or zero-width slots.
export function AdBanner({
  slot,
  width,
  height,
  minWidth,
  maxWidth,
  className,
}: {
  slot: string | undefined;
  width: number;
  height: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    const conditions = [minWidth && `(min-width: ${minWidth}px)`, maxWidth && `(max-width: ${maxWidth - 0.02}px)`].filter(Boolean);
    if (!conditions.length) return setVisible(true);
    const query = window.matchMedia(conditions.join(" and "));
    const update = () => setVisible(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [minWidth, maxWidth]);

  useEffect(() => {
    if (!visible || !CLIENT || !slot || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers can make this throw; the page carries on without the ad
    }
  }, [visible, slot]);

  if (!visible || (!(CLIENT && slot) && !PLACEHOLDERS)) return null;

  return (
    <aside aria-label="Advertisement" className={cn("text-center", className)}>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Advertisement</p>
      {CLIENT && slot ? (
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width, height }}
          data-ad-client={CLIENT}
          data-ad-slot={slot}
          data-adtest={process.env.NODE_ENV === "production" ? undefined : "on"}
        />
      ) : (
        <div
          className="mx-auto grid max-w-full place-items-center rounded-lg border border-dashed text-xs text-muted-foreground"
          style={{ width, height }}
        >
          {width}×{height} ad
        </div>
      )}
    </aside>
  );
}
