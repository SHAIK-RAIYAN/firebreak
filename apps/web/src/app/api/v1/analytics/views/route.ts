import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface VercelAnalyticsResponse {
  version?: number;
  query?: {
    since?: string;
    until?: string;
  };
  data?: {
    visitors?: number;
    pageviews?: number;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * GET /api/v1/analytics/views
 *
 * Secure server-side proxy to retrieve cumulative production page views
 * from Vercel's official Web Analytics API.
 * Keeps the Vercel API token private and caches responses with ISR/Cache-Control.
 */
export async function GET() {
  const token =
    process.env.VERCEL_ANALYTICS_TOKEN ||
    process.env.VERCEL_TOKEN;

  // Prefer Firebreak's production project ID, with fallback to environment variables
  const projectId =
    process.env.VERCEL_ANALYTICS_PROJECT_ID ||
    process.env.VERCEL_PROJECT_ID ||
    "prj_XazkCwVBErNOlErk1rHj3s8Guk7u";

  const teamId =
    process.env.VERCEL_ANALYTICS_TEAM_ID ||
    process.env.VERCEL_TEAM_ID;

  if (!token) {
    return NextResponse.json(
      {
        enabled: false,
        views: null,
        reason: "missing_token",
        message:
          "Vercel Analytics token is not configured. Set VERCEL_ANALYTICS_TOKEN or VERCEL_TOKEN.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  }

  try {
    const url = new URL("https://api.vercel.com/v1/query/web-analytics/visits/count");
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("environment", "production");
    if (teamId) {
      url.searchParams.set("teamId", teamId);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      next: {
        revalidate: 300, // Cache for 5 minutes via Next.js ISR
      },
    });

    const json: VercelAnalyticsResponse = await res.json().catch(() => ({}));

    if (res.ok && json.data) {
      const pageviews = typeof json.data.pageviews === "number" ? json.data.pageviews : 0;
      return NextResponse.json(
        {
          enabled: true,
          views: pageviews,
          visitors: typeof json.data.visitors === "number" ? json.data.visitors : undefined,
          period: json.query,
          updatedAt: new Date().toISOString(),
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    // Handle project with Web Analytics not yet enabled in the Vercel dashboard
    if (res.status === 400 && json.error?.code === "web_analytics_not_enabled") {
      return NextResponse.json(
        {
          enabled: false,
          views: null,
          reason: "web_analytics_not_enabled",
          message:
            "Web Analytics is not enabled for this project in the Vercel dashboard.",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        }
      );
    }

    return NextResponse.json(
      {
        enabled: false,
        views: null,
        reason: json.error?.code || "upstream_error",
        message: json.error?.message || "Failed to retrieve Vercel Analytics",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      {
        enabled: false,
        views: null,
        reason: "network_error",
        message: errMessage,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
