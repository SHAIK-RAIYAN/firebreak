'use client';

import { useWidgetSDK, useTheme } from "@nitrostack/widgets";
import type { SuspectListPayload } from "../../lib/types";
import { getTheme } from "../../lib/theme";

export default function SuspectListWidget() {
  const { getToolOutput, openExternal } = useWidgetSDK();
  const themeName = useTheme();
  const t = getTheme(themeName);
  const data = getToolOutput<SuspectListPayload>();

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
        Loading suspects…
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px 18px",
        background: t.cardBg,
        borderRadius: "14px",
        border: `1px solid ${t.cardBorder}`,
        color: t.fg,
        fontFamily: t.fontSans,
        maxWidth: "480px",
        maxHeight: "420px",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "8px",
          borderBottom: `1px solid ${t.cardBorder}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontFamily: t.fontMono,
              fontSize: "12px",
              fontWeight: 700,
              color: t.accent,
            }}
          >
            INC-{data.incident.number}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: t.fg }}>
            Ranked Suspects
          </span>
        </div>

        {data.confidence && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: "4px",
              background: data.confidence === "high" ? t.greenMuted : t.amberMuted,
              color: data.confidence === "high" ? t.green : t.amber,
              textTransform: "capitalize",
            }}
          >
            {data.confidence} confidence
          </span>
        )}
      </div>

      {/* Deployment compare line */}
      {(data.deployments.bad || data.deployments.good) && (
        <div
          style={{
            fontSize: "11px",
            color: t.muted,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>Between bad:</span>
          <span
            style={{
              fontFamily: t.fontMono,
              color: t.red,
              fontWeight: 600,
            }}
          >
            {data.deployments.bad?.shortSha ?? "unknown"}
          </span>
          <span>and good:</span>
          <span
            style={{
              fontFamily: t.fontMono,
              color: t.green,
              fontWeight: 600,
            }}
          >
            {data.deployments.good?.shortSha ?? "unknown"}
          </span>
        </div>
      )}

      {/* Suspects List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {data.suspects.length === 0 ? (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              fontSize: "12px",
              color: t.muted,
            }}
          >
            No suspects identified.
          </div>
        ) : (
          data.suspects.map((s) => (
            <div
              key={s.shortSha}
              onClick={() => openExternal(s.url)}
              style={{
                padding: "10px 12px",
                background: s.rank === 1 ? t.surfaceHover : "transparent",
                borderRadius: "8px",
                border: `1px solid ${s.rank === 1 ? t.accent : t.cardBorder}`,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                transition: "background 0.15s ease",
              }}
            >
              {/* Row 1: Rank, Sha, Message, Points */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: t.fontMono,
                      fontSize: "11px",
                      fontWeight: 700,
                      color: s.rank === 1 ? t.accent : t.muted,
                    }}
                  >
                    #{s.rank}
                  </span>
                  <span
                    style={{
                      fontFamily: t.fontMono,
                      fontSize: "12px",
                      fontWeight: 600,
                      color: t.accent,
                    }}
                  >
                    {s.shortSha}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: t.fg,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.message}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: s.rank === 1 ? t.accent : t.muted,
                    flexShrink: 0,
                  }}
                >
                  {s.points} pts
                </span>
              </div>

              {/* Row 2: Score bar */}
              <div
                style={{
                  width: "100%",
                  height: "3px",
                  background: t.surfaceHover,
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(10, Math.round(s.score * 100)))}%`,
                    height: "100%",
                    background: s.rank === 1 ? t.accent : t.blue,
                    borderRadius: "2px",
                  }}
                />
              </div>

              {/* Row 3: Author and Evidence chips */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: t.muted,
                }}
              >
                <span>by {s.author}</span>

                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {s.evidence.map((ev, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: t.surfaceHover,
                        fontSize: "10px",
                        color: t.muted,
                      }}
                    >
                      {ev.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Row 4: Matched files in mono */}
              {s.files.filter((f) => f.matched).length > 0 && (
                <div
                  style={{
                    fontFamily: t.fontMono,
                    fontSize: "10px",
                    color: t.muted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Matched:{" "}
                  {s.files
                    .filter((f) => f.matched)
                    .map((f) => f.path)
                    .join(", ")}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
