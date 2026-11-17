"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AutoRefresh({
  intervalMs = 10_000,
}: { intervalMs?: number } = {}) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
