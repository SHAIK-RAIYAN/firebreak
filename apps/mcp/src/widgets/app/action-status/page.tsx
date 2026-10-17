'use client';

import { useWidgetSDK, useTheme } from "@nitrostack/widgets";
import type { ActionStatusView } from "../../lib/types";
import { getTheme } from "../../lib/theme";
import { formatExpiry } from "../../lib/format";

export default function ActionStatusWidget() {
  const { getToolOutput, openExternal, callTool } = useWidgetSDK();
  const themeName = useTheme();
  const t = getTheme(themeName);
  const data = getToolOutput<ActionStatusView>();

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
        Loading action status…
      </div>
    );
  }

  const steps = ["proposed", "approved", "executing", "verifying", "verified"] as const;
  const isFailed = ["failed", "verification_failed", "cancelled", "expired"].includes(data.status);

  const getStepIndex = (st: string) => {
    switch (st) {
      case "proposed":
      case "awaiting_approval":
        return 0;
      case "approved":
        return 1;
      case "executing":
        return 2;
      case "verifying":
        return 3;
      case "verified":
        return 4;
      default:
        return 2;
    }
  };

  const currentStepIdx = getStepIndex(data.status);

  // Probes: ensure 18 slots
  const totalSlots = 18;
  const probeSlots = Array.from({ length: totalSlots }, (_, i) => {
    const p = data.probes.find((probe) => probe.seq === i + 1);
    return p ?? null;
  });

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
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: t.muted }}>Rollback to</span>
            <span
              style={{
                fontFamily: t.fontMono,
                fontSize: "12px",
                fontWeight: 600,
                color: t.accent,
              }}
            >
              {data.target.shortSha ?? data.target.id.slice(0, 7)}
            </span>
          </div>
          <h4
            style={{
              margin: "2px 0 0 0",
              fontSize: "14px",
              fontWeight: 600,
              color: t.fg,
            }}
          >
            {data.message}
          </h4>
        </div>

        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: "6px",
            background:
              data.status === "verified"
                ? t.greenMuted
                : isFailed
                ? t.redMuted
                : t.amberMuted,
            color:
              data.status === "verified"
                ? t.green
                : isFailed
                ? t.red
                : t.amber,
          }}
        >
          {data.status.replace("_", " ")}
        </span>
      </div>

      {/* Step Rail */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 0",
          position: "relative",
        }}
      >
        {steps.map((step, idx) => {
          const isPassed = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          const isLastStepFailed = idx === 4 && isFailed;

          const dotColor = isLastStepFailed
            ? t.red
            : isPassed || isCurrent
            ? data.status === "verified"
              ? t.green
              : t.accent
            : t.muted;

          return (
            <div
              key={step}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                flex: 1,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: isCurrent || isPassed ? dotColor : t.surfaceHover,
                  border: `2px solid ${dotColor}`,
                  boxShadow: isCurrent ? `0 0 8px ${dotColor}` : "none",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? t.fg : t.muted,
                  textTransform: "capitalize",
                }}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Preflight Checklist */}
      {data.preflight && data.preflight.length > 0 && (
        <div
          style={{
            padding: "8px 12px",
            background: t.surfaceHover,
            borderRadius: "8px",
            border: `1px solid ${t.cardBorder}`,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontSize: "11px",
          }}
        >
          <div style={{ fontWeight: 600, color: t.muted, fontSize: "10px", textTransform: "uppercase" }}>
            Preflight Safety Checks
          </div>
          {data.preflight.map((chk, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: chk.ok ? t.fg : chk.blocking ? t.red : t.amber,
              }}
            >
              <span>{chk.name}</span>
              <span style={{ fontWeight: 600 }}>
                {chk.ok ? "✓" : chk.blocking ? "✕" : "!"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Probe Strip (18 squares) */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "10px",
            color: t.muted,
            marginBottom: "4px",
          }}
        >
          <span>Recovery Probes ({data.probes.length}/18)</span>
          {data.status === "awaiting_approval" && (
            <span style={{ color: t.amber, fontWeight: 500 }}>
              Expires in {formatExpiry(data.expiresAt)}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "4px" }}>
          {probeSlots.map((p, idx) => (
            <div
              key={idx}
              title={
                p
                  ? `Probe #${p.seq}: ${p.ok ? "OK" : "Failed"} (${p.latencyMs ?? 0}ms)`
                  : `Probe #${idx + 1}: pending`
              }
              style={{
                flex: 1,
                height: "12px",
                borderRadius: "3px",
                background: !p
                  ? t.surfaceHover
                  : p.ok
                  ? t.green
                  : t.red,
                border: `1px solid ${t.cardBorder}`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        {data.status === "awaiting_approval" && (
          <button
            onClick={() => openExternal(data.approveUrl)}
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
            <span>Approve in Firebreak</span>
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
        )}

        <button
          onClick={() => callTool("get_action_status", { action: data.id })}
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
          Refresh status
        </button>
      </div>
    </div>
  );
}
