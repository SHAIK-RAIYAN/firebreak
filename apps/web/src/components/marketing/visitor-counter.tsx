"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

interface AnalyticsViewsResponse {
  enabled: boolean;
  views: number | null;
  visitors?: number;
  reason?: string;
  message?: string;
}

export function VisitorCounter() {
  const [data, setData] = useState<AnalyticsViewsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchViews() {
      try {
        const res = await fetch("/api/v1/analytics/views", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          if (isMounted) {
            setData({ enabled: false, views: null, reason: "http_error" });
            setLoading(false);
          }
          return;
        }

        const json: AnalyticsViewsResponse = await res.json();
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setData({ enabled: false, views: null, reason: "fetch_failed" });
          setLoading(false);
        }
      }
    }

    fetchViews();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-(--fg-subtle) select-none"
        aria-label="Loading page view count"
      >
        <Eye className="w-3.5 h-3.5 text-(--fg-subtle) opacity-60 shrink-0" aria-hidden="true" />
        <span className="w-12 h-3 bg-(--line) rounded animate-pulse inline-block" />
      </span>
    );
  }

  if (!data || data.views === null) {
    // Graceful fallback when Web Analytics is awaiting activation in Vercel or syncing
    return (
      <span
        className="inline-flex items-center gap-1.5 text-(--fg-subtle) select-none"
        title={
          data?.reason === "web_analytics_not_enabled"
            ? "Vercel Web Analytics pending activation in project dashboard"
            : "Live page views syncing"
        }
        aria-label="Live page views syncing"
      >
        <Eye className="w-3.5 h-3.5 text-(--fg-subtle) opacity-70 shrink-0" aria-hidden="true" />
        <span className="text-[11px] font-mono text-(--fg-subtle)">Live views syncing</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-(--fg-muted)"
      aria-label={`${data.views.toLocaleString()} production page views`}
    >
      <Eye className="w-3.5 h-3.5 text-(--fg-subtle) shrink-0" aria-hidden="true" />
      <span className="tabular-nums font-mono text-(--fg) font-medium">
        {data.views.toLocaleString()}
      </span>
      <span className="text-(--fg-subtle)">views-30d</span>
    </span>
  );
}
