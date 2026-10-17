'use client';

import { useWidgetSDK, useTheme } from "@nitrostack/widgets";
import type { IncidentCard } from "../../lib/types";
import { getTheme } from "../../lib/theme";
import { timeAgo } from "../../lib/format";

export default function IncidentCardWidget() {
  const { getToolOutput, openExternal, callTool } = useWidgetSDK();
  const themeName = useTheme();
  const t = getTheme(themeName);
  const data = getToolOutput<IncidentCard>();

  if (!data) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          fontFamily: t.fontSans,
          color: t.muted,
          background: t.cardBg,
          borderRadius: "12px",
          border: `1px solid ${t.cardBorder}`,
        }}
      >
        Loading incident details…
      </div>
    );
  }

  const isLive = ["open", "triaged", "awaiting_approval", "approved", "mitigating", "verifying"].includes(
    data.status,
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return { color: t.green, bg: t.greenMuted };
      case "mitigation_failed":
      case "failed":
        return { color: t.red, bg: t.redMuted };
      case "awaiting_approval":
      case "verifying":
        return { color: t.amber, bg: t.amberMuted };
      default:
        return { color: t.blue, bg: t.blueMuted };
    }
  };

  const statusStyle = getStatusColor(data.status);

  return (
    <div
      style={{
        padding: "18px 20px",
        background: t.cardBg,
        borderRadius: "14px",
        border: `1px solid ${t.cardBorder}`,
        color: t.fg,
        fontFamily: t.fontSans,
        maxWidth: "460px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: t.fontMono,
              fontSize: "12px",
              fontWeight: 700,
              padding: "3px 8px",
              background: t.surfaceHover,
              borderRadius: "6px",
              border: `1px solid ${t.cardBorder}`,
              color: t.accent,
            }}
          >
            INC-{data.number}
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "6px",
              color: statusStyle.color,
              background: statusStyle.bg,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {isLive && (
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: statusStyle.color,
                }}
              />
            )}
            {data.status.replace("_", " ")}
          </span>
        </div>
        <span style={{ fontSize: "12px", color: t.muted }}>
          {timeAgo(data.openedAt)}
        </span>
      </div>

      {/* Incident Title */}
      <div>
        <h3
          style={{
            margin: "0 0 4px 0",
            fontSize: "16px",
            fontWeight: 600,
            lineHeight: "1.3",
            color: t.fg,
          }}
        >
          {data.title}
        </h3>
        <span style={{ fontSize: "12px", color: t.muted }}>
          Service:{" "}
          <strong style={{ color: t.fg, fontWeight: 500 }}>
            {data.service}
          </strong>
        </span>
      </div>

      {/* Deployments Comparison Row */}
      {(data.bad || data.good) && (
        <div
          style={{
            padding: "10px 14px",
            background: t.surfaceHover,
            borderRadius: "10px",
            border: `1px solid ${t.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: t.red, fontWeight: 600 }}>Bad:</span>
            <span
              style={{
                fontFamily: t.fontMono,
                padding: "2px 6px",
                background: t.redMuted,
                color: t.red,
                borderRadius: "4px",
              }}
            >
              {data.bad?.shortSha ?? "unknown"}
            </span>
          </div>

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={t.muted}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: t.green, fontWeight: 600 }}>Target:</span>
            <span
              style={{
                fontFamily: t.fontMono,
                padding: "2px 6px",
                background: t.greenMuted,
                color: t.green,
                borderRadius: "4px",
              }}
            >
              {data.good?.shortSha ?? "unknown"}
            </span>
          </div>
        </div>
      )}

      {/* Top Suspect Line */}
      {data.topSuspect && (
        <div
          style={{
            padding: "10px 12px",
            background: t.surfaceHover,
            borderRadius: "8px",
            fontSize: "12px",
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontFamily: t.fontMono,
              color: t.accent,
              fontWeight: 600,
            }}
          >
            {data.topSuspect.shortSha}
          </span>
          <span
            style={{
              color: t.fg,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {data.topSuspect.message}
          </span>
          <span style={{ color: t.muted, fontSize: "11px", whiteKey: "nowrap" } as any}>
            {data.topSuspect.points} pts
          </span>
        </div>
      )}

      {/* Action Status Line */}
      {data.action && (
        <div
          style={{
            fontSize: "11px",
            color: t.muted,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>Rollback action:</span>
          <strong
            style={{
              color:
                data.action.status === "verified"
                  ? t.green
                  : data.action.status === "awaiting_approval"
                  ? t.amber
                  : t.fg,
              textTransform: "capitalize",
            }}
          >
            {data.action.status.replace("_", " ")}
          </strong>
        </div>
      )}

      {/* Action Footer Buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "4px",
        }}
      >
        <button
          onClick={() => openExternal(data.appUrl)}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: t.accent,
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span>Open in Firebreak</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>

        <button
          onClick={() => callTool("get_suspects", { incident: data.id })}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: t.surfaceHover,
            color: t.fg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Show suspects
        </button>
      </div>
    </div>
  );
}
